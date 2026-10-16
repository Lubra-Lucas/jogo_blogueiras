"""Retarget de animacoes Mixamo (FBX) para o esqueleto da boneca -> public/assets/anims/doll_anims.glb (+ .json).

Uso:
  blender -b --factory-startup -noaudio --python tools/blender/retarget_mixamo.py -- [build|render|analyze] [--src "E:/Jogo Blog"]

Abordagem (offline, sem constraints):
  1. A boneca esta em A-pose (bracos ~42 graus), o Mixamo em T-pose. Primeiro calculamos a "T-pose da boneca": cada osso e
     rotacionado (no mundo, rotacao minima, de cima para baixo) ate apontar para o filho na mesma direcao que no repouso do Mixamo.
  2. Para cada frame: R_boneca(t) = R_mixamo(t) * R_mixamo_repouso^-1 * R_boneca_Tpose   (delta no mundo, independe do roll dos ossos).
  3. Hips: translacao vertical escalada pela razao de alturas (quadril da boneca / do Mixamo); XZ sem a deriva linear (clipe
     "no lugar"), mantendo o balanco. Velocidade de passo medida e gravada no .json (para casar o timeScale com a velocidade real).
  4. Loop: para clipes ciclicos, acha o frame final cuja pose melhor casa com a do frame 0 e corta ali.
  5. Reducao de chaves (Douglas-Peucker) por canal e escrita manual do GLB (apenas nos de ossos + animacoes), nomes de nos iguais
     aos de doll_base.glb (`mixamorig:Hips`...).
"""
import bpy, sys, os, math, json, struct, glob
import numpy as np
from mathutils import Vector, Quaternion, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
CACHE = os.path.join(HERE, ".cache")
OUT_DIR = os.path.join(REPO, "public", "assets", "anims")
SHOTS = r"C:\Users\user\AppData\Local\Temp\claude\shots\anim"
DOLL_GLB = os.path.join(REPO, "public", "assets", "characters", "doll_base.glb")
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
STAGE = argv[0] if argv else "build"
SRC_DIR = "E:/Jogo Blog"
if "--src" in argv: SRC_DIR = argv[argv.index("--src") + 1]
FPS = 30
Q_EPS = 0.0012   # tolerancia de reducao (componentes do quaternion; ~0.14 graus)
P_EPS = 0.0004   # m

# nome do clipe -> arquivo, loop (cicla), xy ("drift" = remove deriva linear do Hips; "start" = so subtrai o frame 0, mantem o movimento
# horizontal do quadril, usado em sentar/levantar), grupo do arquivo (core = sempre carregado; emotes = sob demanda), q_eps (reducao)
CLIPS = {
    # --- core: locomocao / idle / sentar ---
    "idle":        dict(file="Breathing Idle.fbx", loop=True, xy="drift", group="core"),
    "walk_normal": dict(file="Female Walk.fbx", loop=True, xy="drift", group="core"),
    "desfile":     dict(file="Catwalk Walk.fbx", loop=True, xy="drift", group="core", window=(40, 200, 26, 52)),  # ciclo de passos dentro do desfile de 15 s
    "stand_to_sit": dict(file="Stand To Sit.fbx", loop=False, xy="start", group="core"),
    "sit_to_stand": dict(file="Sit To Stand.fbx", loop=False, xy="start", group="core"),
    "run_turn":    dict(file="Running Turn 180.fbx", loop=False, xy="drift0", group="core"),
    # --- emotes (doll_anims_emotes.glb) ---
    "clap":        dict(file="Standing Clap.fbx", loop=True, xy="drift", group="emotes"),
    "dance_twerk": dict(file="Dancing Twerk.fbx", loop=True, xy="drift", group="emotes", q_eps=0.002),
    "jump":        dict(file="Jump.fbx", loop=False, xy="drift", group="emotes"),
    "wave":        dict(file="Waving.fbx", loop=False, xy="start", group="emotes"),
    "kiss":        dict(file="Blow A Kiss.fbx", loop=False, xy="start", group="emotes"),
    "bow":         dict(file="Quick Formal Bow.fbx", loop=False, xy="start", group="emotes"),
    "laugh":       dict(file="Laughing.fbx", loop=False, xy="start", group="emotes"),
    "cry":         dict(file="Crying.fbx", loop=False, xy="start", group="emotes"),
    "point":       dict(file="Pointing.fbx", loop=False, xy="start", group="emotes"),
    "thankful":    dict(file="Thankful.fbx", loop=False, xy="start", group="emotes"),
    "texting":     dict(file="Texting While Standing.fbx", loop=True, xy="drift", group="emotes", q_eps=0.002),
}
only = [a for a in argv if a in CLIPS]
if only: CLIPS = {k: v for k, v in CLIPS.items() if k in only}


def log(*a): print("[retarget]", *a, flush=True)


def clean(n): return n.replace(":", "")


# ---------------------------------------------------------------- doll
bpy.ops.wm.open_mainfile(filepath=os.path.join(CACHE, "meshyB_4.blend"))
doll = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
DOLL_NAMES = [b.name for b in doll.data.bones]  # ordem pai -> filho
dbone = {clean(b.name): b for b in doll.data.bones}
D = [clean(n) for n in DOLL_NAMES]
assert (doll.matrix_world - Matrix.Identity(4)).to_3x3().is_orthogonal or True
Rrest_d = {n: dbone[n].matrix_local.to_3x3().normalized().to_quaternion() for n in D}
head_d = {n: dbone[n].head_local.copy() for n in D}
parent_d = {n: (clean(dbone[n].parent.name) if dbone[n].parent else None) for n in D}
children_d = {n: [clean(c.name) for c in dbone[n].children] for n in D}
HIP_H = head_d["mixamorigHips"].z

def rot_dist(a, b): return 2 * math.acos(min(1.0, abs(a.dot(b))))


# glTF: frame do no = C * frame do osso (Z-up -> Y-up). Verificado contra o doll_base.glb mais abaixo.
C = Matrix(((1, 0, 0), (0, 0, 1), (0, -1, 0)))
Cq = C.to_quaternion()


def glb_json(path):
    with open(path, "rb") as f:
        f.read(12); ln, tp = struct.unpack("<II", f.read(8)); return json.loads(f.read(ln))


GJ = glb_json(DOLL_GLB)
gnodes = GJ["nodes"]
gname = {clean(n["name"]): i for i, n in enumerate(gnodes) if "name" in n}
gparent = {}
for i, n in enumerate(gnodes):
    for c in n.get("children", []): gparent[c] = i


def g_local_q(i):
    r = gnodes[i].get("rotation", [0, 0, 0, 1]); return Quaternion((r[3], r[0], r[1], r[2]))


def g_world_q(i):
    q = g_local_q(i)
    while i in gparent:
        i = gparent[i]; q = g_local_q(i) @ q
    return q


# no-pai do Hips no glTF (Armature): transformacao para converter posicao do mundo -> local do Hips
hips_i = gname["mixamorigHips"]
arm_i = gparent.get(hips_i)
log("glTF Hips parent", arm_i, gnodes[arm_i] if arm_i is not None else None)
ARM_Q = g_world_q(arm_i) if arm_i is not None else Quaternion()
ARM_T = Vector(gnodes[arm_i].get("translation", [0, 0, 0])) if arm_i is not None else Vector()
ARM_S = Vector(gnodes[arm_i].get("scale", [1, 1, 1])) if arm_i is not None else Vector((1, 1, 1))
log("armature node rot", tuple(ARM_Q), "t", tuple(ARM_T), "s", tuple(ARM_S))

# checagem: rotacao de repouso local do glTF == C*Rrest (osso) encadeado
maxerr = 0
for n in D:
    wq = Quaternion(C.to_quaternion()) @ Rrest_d[n]  # mundo glTF do osso
    gw = g_world_q(gname[n])
    d = rot_dist(wq, gw)
    maxerr = max(maxerr, d)
log("max erro de repouso blender->glTF (rad):", round(maxerr, 5))




# ---------------------------------------------------------------- source
def import_fbx(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    arm = next(o for o in new if o.type == 'ARMATURE')
    for o in new:
        if o.type == 'MESH': bpy.data.objects.remove(o, do_unlink=True)
    return arm


def world_rot(arm, pb):
    return (arm.matrix_world @ pb.matrix).to_3x3().normalized().to_quaternion()


def src_names(arm): return {clean(b.name): b.name for b in arm.data.bones}


def cleanup_src(arm):
    act = arm.animation_data.action if arm.animation_data else None
    bpy.data.objects.remove(arm, do_unlink=True)
    if act: bpy.data.actions.remove(act)


def T_pose(src_rest_head_dir):
    """Rotacao mundo (Blender) de cada osso da boneca na T-pose (alinhada ao repouso do Mixamo)."""
    Tw = {}
    for n in D:
        p = parent_d[n]
        Dp = Tw[p] @ Rrest_d[p].inverted() if p else Quaternion()
        W0 = Dp @ Rrest_d[n]
        cand = [c for c in children_d[n] if c in src_rest_head_dir]
        # filho de referencia: o mais "longo" na cadeia principal (primeiro da lista, exceto Hips -> Spine)
        pref = {"mixamorigHips": "mixamorigSpine", "mixamorigHand": None}
        tgt = None
        if n == "mixamorigHips": tgt = "mixamorigSpine"
        elif n.endswith("Hand"): tgt = n + "Middle1"
        elif n.endswith("Spine2"): tgt = "mixamorigNeck"
        elif cand: tgt = cand[0]
        if tgt and tgt in cand and n in src_rest_head_dir:
            dr = (head_d[tgt] - head_d[n]).normalized()
            cur = Dp @ dr
            des = (src_rest_head_dir[tgt] - src_rest_head_dir[n]).normalized()
            q = cur.rotation_difference(des)
            Tw[n] = q @ W0
        else:
            Tw[n] = W0
    return Tw


def process_clip(name, cfg):
    arm = import_fbx(os.path.join(SRC_DIR, cfg["file"]))
    names = src_names(arm)
    missing = [n for n in D if n not in names]
    assert not missing, missing
    act = arm.animation_data.action
    f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
    sc = bpy.context.scene
    # repouso do Mixamo (mundo)
    Rrest_s = {n: (arm.matrix_world @ arm.data.bones[names[n]].matrix_local).to_3x3().normalized().to_quaternion() for n in D}
    head_s = {n: (arm.matrix_world @ arm.data.bones[names[n]].head_local) for n in D}
    Tw = T_pose(head_s)
    hip_ratio = HIP_H / head_s["mixamorigHips"].z
    # amostra
    frames = list(range(f0, f1 + 1))
    if len(frames) < 2: frames = [f0, f0 + 0]  # pose unica: 2 chaves iguais (1/30 s)
    log(name, 'frames de origem', f0, f1)
    WQ = {n: [] for n in D}   # rotacao mundo (Blender) do osso da boneca
    HP = []                   # posicao (Blender, mundo) desejada do Hips
    hip_rest_s = head_s["mixamorigHips"]
    for f in frames:
        sc.frame_set(f)
        for n in D:
            pb = arm.pose.bones[names[n]]
            rs = world_rot(arm, pb)
            WQ[n].append(rs @ Rrest_s[n].inverted() @ Tw[n])
        pbh = arm.pose.bones[names["mixamorigHips"]]
        hp = (arm.matrix_world @ pbh.matrix).translation - hip_rest_s
        HP.append(hp)
    HP = np.array([[v.x, v.y, v.z] for v in HP])
    N = len(frames)

    # continuidade de sinal
    for n in D:
        q = WQ[n]
        for i in range(1, N):
            if q[i].dot(q[i - 1]) < 0: q[i] = Quaternion((-q[i].w, -q[i].x, -q[i].y, -q[i].z))

    # ---- recorte do loop ----
    if cfg.get("window"):
        w0, w1, cmin, cmax = cfg["window"]
        keys = [n for n in D if not any(s_ in n for s_ in ("Finger", "Thumb", "Index", "Middle", "Ring", "Pinky"))]
        best = (1e9, 0, 0)
        for a in range(w0, w1):
            for b in range(a + cmin, min(a + cmax, N)):
                dd = math.sqrt(sum(rot_dist(WQ[n][a], WQ[n][b]) ** 2 for n in keys) / len(keys)) + 3.0 * abs(HP[a, 2] - HP[b, 2]) * hip_ratio
                if dd < best[0]: best = (dd, a, b)
        log(name, "janela de ciclo", best)
        _, a, b = best
        for n in D: WQ[n] = WQ[n][a:b + 1]
        HP = HP[a:b + 1]; N = b - a + 1
    end = N - 1
    info = {}
    if cfg["loop"]:
        keys = [n for n in D if not any(s in n for s in ("Finger", "Thumb", "Index", "Middle", "Ring", "Pinky"))]
        def pdist(a, b):
            s = sum(rot_dist(WQ[n][a], WQ[n][b]) ** 2 for n in keys)
            return math.sqrt(s / len(keys)) + 3.0 * abs(HP[a, 2] - HP[b, 2]) * hip_ratio
        lo = min(N - 1, max(12, int(0.4 * FPS)))
        ds = [(pdist(0, e), e) for e in range(lo, N)]
        dmin = min(d for d, _ in ds)
        end = next(e for d, e in ds if d <= dmin * 1.25 + 1e-4)
        mins = [(round(d, 3), e) for k, (d, e) in enumerate(ds) if 0 < k < len(ds) - 1 and d < ds[k - 1][0] and d <= ds[k + 1][0]]
        log(name, "minimos locais (d, frame):", mins[:14])
        log(name, "hips xy a cada 30f:", [tuple(np.round(HP[i, :2], 2)) for i in range(0, N, 30)])
        info["loop_err"] = round(pdist(0, end), 4)
        # pose do frame 0 e do end: a ultima chave e forcada a igual a primeira (fecha o loop sem estalo)
    n_use = end + 1
    for n in D: WQ[n] = WQ[n][:n_use]
    HP = HP[:n_use]
    dur = end / FPS
    # ---- Hips: no lugar ----
    drift = HP[end, :2] - HP[0, :2]
    speed = float(np.linalg.norm(drift)) * hip_ratio / dur if dur > 0 else 0.0
    info["speed_mps"] = round(speed, 3)
    hp = HP.copy()
    if cfg["xy"] == "drift":
        t = np.arange(n_use) / max(end, 1)
        hp[:, :2] = HP[:, :2] - HP[0, :2] - np.outer(t, drift)
        hp[:, :2] -= hp[:, :2].mean(axis=0)
    elif cfg["xy"] == "drift0":  # sem deslocamento horizontal nenhum (a rotacao do Hips segue no clipe)
        hp[:, :2] = 0
    else:
        hp[:, :2] = HP[:, :2] - HP[0, :2]
    hip_pos = np.zeros((n_use, 3))
    hip_pos[:, :2] = hp[:, :2] * hip_ratio
    hip_pos[:, 2] = head_d["mixamorigHips"].z + hp[:, 2] * hip_ratio
    hip_pos[:, 0] += head_d["mixamorigHips"].x; hip_pos[:, 1] += head_d["mixamorigHips"].y
    if cfg["loop"] and end >= 3:  # fecha o loop: mistura suave dos ultimos frames em direcao a pose do frame 0
        K = min(8, end // 3)
        for j in range(K + 1):
            i = end - K + j; w = j / K; w = w * w * (3 - 2 * w)
            for n in D: WQ[n][i] = WQ[n][i].slerp(WQ[n][0], w) if j < K else WQ[n][0].copy()
            hip_pos[i] = hip_pos[i] * (1 - w) + hip_pos[0] * w
    cleanup_src(arm)
    info.update(frames=n_use, duration=round(dur, 3), hip_ratio=round(hip_ratio, 3), src_frames=N)
    info['fps'] = bpy.context.scene.render.fps
    log(name, info)
    return dict(WQ=WQ, hip_pos=hip_pos, info=info, n=n_use, q_eps=cfg.get('q_eps', Q_EPS))


# ---------------------------------------------------------------- pose helpers (Blender, para render) e glTF
def local_bone_quats(WQ_at):  # {n: Quaternion mundo} -> {n: rotation_quaternion do pose bone}
    L = {}
    for n in D:
        p = parent_d[n]
        if p is None: L[n] = Rrest_d[n].inverted() @ WQ_at[n]
        else: L[n] = Rrest_d[n].inverted() @ Rrest_d[p] @ WQ_at[p].inverted() @ WQ_at[n]
    return L


def gltf_local_quats(WQ_at):
    """rotacao local de cada no glTF a partir das rotacoes mundo (Blender) dos ossos."""
    res = {}
    for n in D:
        wn = Cq @ WQ_at[n]
        p = parent_d[n]
        wp = (Cq @ WQ_at[p]) if p else ARM_Q
        res[n] = wp.inverted() @ wn
    return res


def rdp(times, vals, eps):
    """Douglas-Peucker sobre vetores (interpolacao linear no tempo). Retorna indices mantidos."""
    n = len(times); keep = {0, n - 1}
    stack = [(0, n - 1)]
    while stack:
        a, b = stack.pop()
        if b - a < 2: continue
        t = (times[a + 1:b] - times[a]) / (times[b] - times[a])
        interp = vals[a] + np.outer(t, vals[b] - vals[a])
        err = np.abs(vals[a + 1:b] - interp).max(axis=1)
        k = int(err.argmax())
        if err[k] > eps:
            m = a + 1 + k; keep.add(m); stack.append((a, m)); stack.append((m, b))
    return sorted(keep)


def write_glb(clips, path):
    nodes = [dict(n) for n in gnodes]
    # so os nos de osso + armature (sem malha/skin)
    bin_chunks = []; accessors = []; views = []; anims = []
    off = 0

    def add(arr, ctype, atype, minmax=False):
        nonlocal off
        arr = np.ascontiguousarray(arr, dtype=np.float32)
        raw = arr.tobytes()
        views.append(dict(buffer=0, byteOffset=off, byteLength=len(raw)))
        bin_chunks.append(raw); off += len(raw)
        a = dict(bufferView=len(views) - 1, componentType=5126, count=int(arr.shape[0]), type=atype)
        if minmax: a["min"] = [float(arr.min())]; a["max"] = [float(arr.max())]
        accessors.append(a); return len(accessors) - 1

    for cname, cd in clips.items():
        n_use = cd["n"]; times = np.arange(n_use, dtype=np.float64) / FPS
        samplers = []; channels = []
        gl = [gltf_local_quats({n: cd["WQ"][n][i] for n in D}) for i in range(n_use)]
        for n in D:
            q = np.array([[gl[i][n].x, gl[i][n].y, gl[i][n].z, gl[i][n].w] for i in range(n_use)])
            for i in range(1, n_use):
                if np.dot(q[i], q[i - 1]) < 0: q[i] = -q[i]
            kept = rdp(times, q, cd['q_eps'])
            tk = times[kept].astype(np.float32)
            samplers.append(dict(input=add(tk, 5126, "SCALAR", True), output=add(q[kept], 5126, "VEC4"), interpolation="LINEAR"))
            channels.append(dict(sampler=len(samplers) - 1, target=dict(node=gname[n], path="rotation")))
        # Hips translacao (mundo Blender -> local do no Armature)
        hp = cd["hip_pos"]
        loc = np.zeros((n_use, 3))
        for i in range(n_use):
            g = Vector((hp[i, 0], hp[i, 2], -hp[i, 1]))  # C * p
            v = ARM_Q.inverted() @ (g - ARM_T)
            loc[i] = (v.x / ARM_S.x, v.y / ARM_S.y, v.z / ARM_S.z)
        kept = rdp(times, loc, P_EPS)
        samplers.append(dict(input=add(times[kept].astype(np.float32), 5126, "SCALAR", True), output=add(loc[kept], 5126, "VEC3"), interpolation="LINEAR"))
        channels.append(dict(sampler=len(samplers) - 1, target=dict(node=hips_i, path="translation")))
        anims.append(dict(name=cname, samplers=samplers, channels=channels))
        log(cname, "keys", sum(a["count"] for a in accessors[-(2 * len(samplers)):]) // 2)
    # remove malha/skin do arquivo de animacao
    for nd in nodes:
        nd.pop("mesh", None); nd.pop("skin", None)
    scene_nodes = [i for i in GJ["scenes"][0]["nodes"] if "mesh" not in gnodes[i]]
    pad = (-off) % 4
    blob = b"".join(bin_chunks) + b"\0" * pad
    gltf = dict(asset=dict(version="2.0", generator="retarget_mixamo.py"), scene=0, scenes=[dict(nodes=scene_nodes)],
                nodes=[nd for nd in nodes], accessors=accessors, bufferViews=views, buffers=[dict(byteLength=len(blob))], animations=anims)
    # nos de malha viram vazios (mantem indices)
    js = json.dumps(gltf, separators=(",", ":")).encode()
    js += b" " * ((-len(js)) % 4)
    total = 12 + 8 + len(js) + 8 + len(blob)
    with open(path, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total))
        f.write(struct.pack("<II", len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack("<II", len(blob), 0x004E4942)); f.write(blob)
    log("escrito", path, os.path.getsize(path), "bytes")


# ---------------------------------------------------------------- render
def setup_render(w=700, h=900):
    sc = bpy.context.scene
    for eid in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):
        try: sc.render.engine = eid; break
        except TypeError: continue
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.view_settings.view_transform = 'AgX'
    wd = bpy.data.worlds.new("W"); sc.world = wd; wd.use_nodes = True
    bg = wd.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.6, 0.6, 0.62, 1); bg.inputs[1].default_value = 1.0
    cam_d = bpy.data.cameras.new("cam"); cam = bpy.data.objects.new("cam", cam_d); sc.collection.objects.link(cam); sc.camera = cam
    ct = bpy.data.objects.new("ct", None); sc.collection.objects.link(ct)
    tc = cam.constraints.new('TRACK_TO'); tc.target = ct; tc.track_axis = 'TRACK_NEGATIVE_Z'; tc.up_axis = 'UP_Y'
    for name, off, e, s in (("key", (1.5, 1.0, 0.5), 500, 3), ("fill", (-2.0, 0.3, 0.0), 200, 4), ("rim", (0.0, 2.0, 2.0), 200, 3)):
        d = bpy.data.lights.new(name, 'AREA'); d.energy = e; d.size = s
        o = bpy.data.objects.new(name, d); sc.collection.objects.link(o); o.parent = cam; o.location = off
    fl = bpy.data.objects.new("floor", bpy.data.meshes.new("floor"))
    bpy.data.meshes["floor"].from_pydata([(-2, -2, 0), (2, -2, 0), (2, 2, 0), (-2, 2, 0)], [], [(0, 1, 2, 3)]); sc.collection.objects.link(fl)

    def shot(name, azim, focus, dist, lens=50):
        cam_d.lens = lens; ct.location = focus
        a = math.radians(azim)
        cam.location = (focus[0] + dist * math.sin(a), focus[1] - dist * math.cos(a), focus[2] + dist * 0.03)
        bpy.context.view_layer.update()
        sc.render.filepath = os.path.join(SHOTS, name); bpy.ops.render.render(write_still=True)
    return shot


def render_stage(clips):
    shot = setup_render()
    pose_all(doll, None)
    for cname, cd in clips.items():
        info = cd["info"]
        picks = {"walk_normal": [0.3], "desfile": [0.3], "stand_to_sit": [0.0, 0.8, 99], "sit_to_stand": [0.0, 99], "idle": [1.0], "dance_twerk": [1.0]}.get(cname, [0.5, 99])
        for t in picks:
            i = cd["n"] - 1 if t == 99 else min(cd["n"] - 1, int(round(t * FPS)))
            pose_all(doll, cd, i)
            for az, tag in ((0, "f"), (90, "s")):
                shot(f"retarget_{cname}_t{int(t*10)}_{tag}.png", az, (0, 0, 0.85), 4.2, 50)


def pose_all(arm, cd, i=None):
    for pb in arm.pose.bones: pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
    if cd is None: return
    L = local_bone_quats({n: cd["WQ"][n][i] for n in D})
    for n in D:
        arm.pose.bones[dbone[n].name].rotation_quaternion = L[n]
    pbh = arm.pose.bones["mixamorig:Hips"]
    d = Vector(cd["hip_pos"][i]) - head_d["mixamorigHips"]
    pbh.location = Rrest_d["mixamorigHips"].inverted() @ d
    bpy.context.view_layer.update()
    # altura minima do pe (verificacao)
    lowest = min((arm.matrix_world @ arm.pose.bones[b].matrix).translation.z for b in ("mixamorig:LeftFoot", "mixamorig:RightFoot", "mixamorig:LeftToeBase", "mixamorig:RightToeBase"))
    log("  frame", i, "pe mais baixo z=", round(lowest, 3))


def main():
    clips = {name: process_clip(name, cfg) for name, cfg in CLIPS.items()}
    if STAGE == "analyze": return
    if STAGE == "render":
        render_stage(clips); return
    os.makedirs(OUT_DIR, exist_ok=True)
    meta = {}
    for grp, fn in (("core", "doll_anims_core.glb"), ("emotes", "doll_anims_emotes.glb")):
        sub = {k: v for k, v in clips.items() if CLIPS[k]["group"] == grp}
        if sub: write_glb(sub, os.path.join(OUT_DIR, fn))
    meta = {k: dict(file=("doll_anims_core.glb" if CLIPS[k]["group"] == "core" else "doll_anims_emotes.glb"), duration=v["info"]["duration"], speed=v["info"]["speed_mps"], loop=CLIPS[k]["loop"]) for k, v in clips.items()}
    with open(os.path.join(OUT_DIR, "doll_anims.json"), "w") as f: json.dump(meta, f, indent=2)
    if "--render" in argv: render_stage(clips)


main()

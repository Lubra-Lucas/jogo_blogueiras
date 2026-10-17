"""Etapa 3 do avatar masculino: rig mixamorig (52 ossos, mesmos nomes/hierarquia da boneca), pesos, pose A 42 graus, morphs, export.
Usage: blender -b --factory-startup -noaudio --python rig_male.py -- <stage ...>
  rig     armature a partir da geometria + pesos (heat + limpeza)        .cache/male_1 -> male_2
  repose  bracos a 42 graus (como a boneca), bake da pose no mesh/rest   -> male_3
  orient  reorienta os ossos para a MESMA orientacao de repouso da boneca (animacoes compartilhadas) -> male_4
  morphs  shape keys                                                     -> male_5
  export  public/assets/characters/male/male_base.glb + .json + mascaras
Reaproveita a logica de rig_meshy.py (compute_joints/build_armature/clean_weights) com limiares relativos ao corpo masculino.
"""
import sys, os, struct
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mcommon import *
import shutil

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
P = "mixamorig:"

# alturas de projeto (m) do esqueleto masculino (corpo 1,75 m; cabeca ~1,12x)
Z_HIP, Z_SHOULDER = 0.895, 1.375
SPINE_Z = [0.925, 1.02, 1.13, 1.245, 1.36, 1.43]        # Hips, Spine, Spine1, Spine2, Neck, Head heads
HEAD_TAIL_Z = 1.70


def set_weights(ob, names, W, limit=4):
    for nm in names:
        if nm not in ob.vertex_groups: ob.vertex_groups.new(name=nm)
    allv = list(range(len(ob.data.vertices)))
    for vg in ob.vertex_groups: vg.remove(allv)
    order = np.argsort(-W, axis=1)
    for i in range(W.shape[0]):
        ks = order[i, :limit]; w = W[i, ks]; tot = w.sum()
        if tot < 1e-9: continue
        for k, wk in zip(ks, w / tot):
            if wk > 1e-3: ob.vertex_groups[names[k]].add([i], float(wk), 'REPLACE')


def weights_matrix(ob, names):
    n = len(ob.data.vertices)
    idx = {ob.vertex_groups[nm].index: k for k, nm in enumerate(names) if nm in ob.vertex_groups}
    W = np.zeros((n, len(names)))
    for v in ob.data.vertices:
        for g in v.groups:
            if g.group in idx: W[v.index, idx[g.group]] = g.weight
    return W


def fit_line(pts):
    c = pts.mean(0); u, s_, vt = np.linalg.svd(pts - c); return c, vt[0]


# ===================================================================== joints
def compute_joints(co):
    J = {}
    S0 = np.array([0.20, 0.0, 1.40])
    L = co[(co[:, 0] > 0.3) & (co[:, 2] > 0.6)]
    tip = L[np.argmax(np.linalg.norm(L - S0, axis=1))]
    d0 = (tip - S0) / np.linalg.norm(tip - S0)
    rel = co - S0; t0 = rel @ d0; r0 = np.linalg.norm(rel - np.outer(t0, d0), axis=1)
    armv = co[(r0 < 0.08) & (co[:, 0] > 0.17) & (t0 > 0)]
    cens = []
    for ti in np.arange(0.04, 0.27, 0.04):
        m = np.abs(((armv - S0) @ d0) - ti) < 0.014
        if m.sum(): cens.append(armv[m].mean(0))
    c0, dl = fit_line(np.array(cens))
    if dl[0] < 0: dl = -dl
    sh = c0 + dl * ((Z_SHOULDER - c0[2]) / dl[2])
    tl = (tip - sh) @ dl
    d_all = co - sh; tt = d_all @ dl
    rad = np.linalg.norm(d_all - np.outer(tt, dl), axis=1)
    near = (rad < 0.075) & (co[:, 0] > 0.2) & (co[:, 2] < 1.30)
    prof = []
    for ti in np.arange(0.28 * tl, 0.95 * tl, 0.012):
        m = near & (np.abs(tt - ti) < 0.008)
        if m.sum() >= 3: prof.append((ti, rad[m].mean()))
    prof = np.array(prof)
    sel = prof[(prof[:, 0] > 0.70 * tl) & (prof[:, 0] < 0.80 * tl)]
    tw = float(sel[np.argmin(sel[:, 1]), 0])
    wrist = sh + dl * tw; elbow = sh + dl * (tw * 0.5)
    ang = math.degrees(math.atan2(dl[0], -dl[2]))
    log("arm: shoulder", sh.round(3), "elbow", elbow.round(3), "wrist", wrist.round(3), "tip", tip.round(3), "len", round(tl, 3), "angle from vertical", round(ang, 1))
    J.update(shoulder=sh, elbow=elbow, wrist=wrist, tip=tip, arm_angle=ang)
    ha = tip - wrist; hl = np.linalg.norm(ha); ha /= hl
    H = co[(tt > tw - 0.01) & (rad < 0.09) & (co[:, 0] > 0.30)]
    Hc = H - wrist; ta = Hc @ ha; perp = Hc - np.outer(ta, ha)
    ev, evec = np.linalg.eigh(np.cov(perp.T))
    wdir = evec[:, 2]; ndir = evec[:, 1]; pw = perp @ wdir
    base = ta < 0.5 * hl
    thumb_sign = 1.0 if pw[base].max() > -pw[base].min() else -1.0
    wdir = wdir * thumb_sign; hw = (pw.max() - pw.min())
    log("hand len", round(hl, 3), "width", round(hw, 3), "thumb sign", thumb_sign, "palm normal", ndir.round(2))
    J.update(hand_axis=ha, hand_w=wdir, hand_n=ndir, hand_len=hl, hand_wid=hw)
    LL = co[(co[:, 0] > 0.0) & (co[:, 2] < 0.80) & (co[:, 0] < 0.40)]

    def slc(z, w=0.012): return LL[np.abs(LL[:, 2] - z) < w].mean(0)
    ankle = slc(0.095)
    th = np.array([slc(z) for z in (0.50, 0.56, 0.62, 0.68)])
    cl, dlg = fit_line(th)
    if dlg[2] < 0: dlg = -dlg
    hip = cl + dlg * ((Z_HIP - cl[2]) / dlg[2])
    knee = slc(0.49)
    foot = co[(co[:, 0] > 0.0) & (co[:, 2] < 0.10) & (co[:, 0] < 0.40)]
    toe_tip = np.array([foot[:, 0].mean(), foot[:, 1].min() + 0.01, 0.03])
    ball = ankle + (toe_tip - ankle) * 0.72
    J.update(hip=hip, knee=knee, ankle=ankle, ball=ball, toe=toe_tip)
    log("leg: hip", hip.round(3), "knee", knee.round(3), "ankle", ankle.round(3), "ball", ball.round(3), "toe", toe_tip.round(3))
    return J


def build_armature(J):
    arm = bpy.data.armatures.new("Armature"); rig = bpy.data.objects.new("Armature", arm)
    bpy.context.scene.collection.objects.link(rig); select_only(rig)
    bpy.ops.object.mode_set(mode='EDIT'); eb = arm.edit_bones

    def add(name, head, tail, parent=None, roll_vec=(0, -1, 0)):
        b = eb.new(P + name); b.head = Vector(head); b.tail = Vector(tail)
        if (b.tail - b.head).length < 1e-4: b.tail = b.head + Vector((0, 0, 0.01))
        if parent: b.parent = eb[P + parent]
        b.align_roll(Vector(roll_vec)); return b
    sh, el, wr = J["shoulder"], J["elbow"], J["wrist"]
    hip, kn, an, ba, to = J["hip"], J["knee"], J["ankle"], J["ball"], J["toe"]

    def Z(z, y=0.0): return np.array([0.0, y, z])
    sz = SPINE_Z
    add("Hips", Z(sz[0]), Z(sz[1]), None)
    add("Spine", Z(sz[1]), Z(sz[2]), "Hips")
    add("Spine1", Z(sz[2]), Z(sz[3]), "Spine")
    add("Spine2", Z(sz[3]), Z(sz[4]), "Spine1")
    add("Neck", Z(sz[4]), Z(sz[5], 0.01), "Spine2")
    add("Head", Z(sz[5], 0.01), Z(HEAD_TAIL_Z, -0.02), "Neck")

    def mir(v, sg): return np.array([v[0] * sg, v[1], v[2]])
    for side, sg in (("Left", 1.0), ("Right", -1.0)):
        add(f"{side}UpLeg", mir(hip, sg), mir(kn, sg), "Hips")
        add(f"{side}Leg", mir(kn, sg), mir(an, sg), f"{side}UpLeg")
        add(f"{side}Foot", mir(an, sg), mir(ba, sg), f"{side}Leg")
        add(f"{side}ToeBase", mir(ba, sg), mir(to, sg), f"{side}Foot")
        add(f"{side}Shoulder", np.array([0.03 * sg, -0.005, sz[3] + 0.09]), mir(sh, sg), "Spine2")
        add(f"{side}Arm", mir(sh, sg), mir(el, sg), f"{side}Shoulder")
        add(f"{side}ForeArm", mir(el, sg), mir(wr, sg), f"{side}Arm")
        ha, wd, nd, hl, hw = J["hand_axis"], J["hand_w"], J["hand_n"], J["hand_len"], J["hand_wid"]
        add(f"{side}Hand", mir(wr, sg), mir(wr + ha * hl * 0.36, sg), f"{side}ForeArm")
        root0 = wr + ha * hl * 0.36
        offs = {"Index": 0.33, "Middle": 0.11, "Ring": -0.11, "Pinky": -0.32}
        flen = {"Index": 0.95, "Middle": 1.0, "Ring": 0.93, "Pinky": 0.78}
        for fn in ("Index", "Middle", "Ring", "Pinky"):
            a = root0 + wd * hw * offs[fn]; tot = hl * 0.64 * flen[fn]
            for i, f in enumerate((0.42, 0.33, 0.25), 1):
                b_ = a + ha * tot * f
                add(f"{side}Hand{fn}{i}", mir(a, sg), mir(b_, sg), f"{side}Hand" if i == 1 else f"{side}Hand{fn}{i-1}", tuple(mir(nd, sg)))
                a = b_
        a = wr + ha * hl * 0.10 + wd * hw * 0.45
        td = (ha * 0.75 + wd * 0.55); td /= np.linalg.norm(td); tot = hl * 0.52
        for i, f in enumerate((0.38, 0.34, 0.28), 1):
            b_ = a + td * tot * f
            add(f"{side}HandThumb{i}", mir(a, sg), mir(b_, sg), f"{side}Hand" if i == 1 else f"{side}HandThumb{i-1}", tuple(mir(nd, sg)))
            a = b_
    bpy.ops.object.mode_set(mode='OBJECT')
    return rig


def clean_weights(body, rig, J):
    names = [b.name for b in rig.data.bones]
    W = weights_matrix(body, names); co = getco(body); n = len(co)
    ia = {nm: k for k, nm in enumerate(names)}
    for side in ("Left", "Right"):
        sg = 1.0 if side == "Left" else -1.0
        wr = np.array([J["wrist"][0] * sg, J["wrist"][1], J["wrist"][2]])
        axis = np.array([J["hand_axis"][0] * sg, J["hand_axis"][1], J["hand_axis"][2]])
        d_ = (co - wr) @ axis
        rad = np.linalg.norm((co - wr) - np.outer(d_, axis), axis=1)
        hv = (np.sign(co[:, 0]) == sg) & (d_ > -0.012) & (rad < 0.10) & (np.abs(co[:, 0]) > 0.30)
        bones = [nm for nm in names if nm.startswith(f"{P}{side}Hand")]
        pts = co[hv]; D = np.zeros((len(pts), len(bones)))
        for k, nm in enumerate(bones):
            b = rig.data.bones[nm]; a = np.array(b.head_local); bb = np.array(b.tail_local)
            ab = bb - a; tt = np.clip(((pts - a) @ ab) / (ab @ ab), 0, 1)
            D[:, k] = np.linalg.norm(pts - (a + np.outer(tt, ab)), axis=1)
        D[:, bones.index(f"{P}{side}Hand")] += 0.007
        Wh = np.exp(-(D / 0.009) ** 2); Wh = Wh / np.maximum(Wh.sum(1, keepdims=True), 1e-9)
        fade = np.clip((d_[hv] + 0.012) / 0.03, 0, 1)[:, None]
        Wn = np.zeros((len(pts), len(names))); Wn[:, [ia[b] for b in bones]] = Wh
        W[hv] = W[hv] * (1 - fade) + Wn * fade
    zh = SPINE_Z[5]
    f = np.clip((co[:, 2] - (zh - 0.035)) / 0.07, 0, 1); f = (f * f * (3 - 2 * f))[:, None]
    Wh = np.zeros_like(W); Wh[:, ia[P + "Head"]] = 1
    W = W * (1 - f) + Wh * f
    e = edges_of(body.data); deg = degree(e, n)
    keep = np.clip((co[:, 2] - (zh + 0.01)) / 0.05, 0, 1)[:, None]
    for _ in range(3):
        acc = np.zeros_like(W); np.add.at(acc, e[:, 0], W[e[:, 1]]); np.add.at(acc, e[:, 1], W[e[:, 0]])
        Ws = (W + 0.5 * acc / np.maximum(deg, 1)[:, None]) / 1.5
        W = W * keep + Ws * (1 - keep)
    W /= np.maximum(W.sum(1, keepdims=True), 1e-9)
    set_weights(body, names, W)
    log("pesos limpos (max 4 influencias)")


def stage_rig():
    t0 = time.time()
    bpy.ops.wm.open_mainfile(filepath=blend("male_1"))
    body = bpy.data.objects["body"]
    co = getco(body)
    J = compute_joints(co)
    rig = build_armature(J)
    log("ossos", len(rig.data.bones))
    for o in bpy.context.selected_objects: o.select_set(False)
    body.select_set(True); rig.select_set(True); bpy.context.view_layer.objects.active = rig
    try: bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    except Exception as e: log("heat falhou", e)
    names = [b.name for b in rig.data.bones]; present = {vg.name for vg in body.vertex_groups}
    log("grupos", len(present), "faltando", [n for n in names if n not in present])
    clean_weights(body, rig, J)
    json.dump({k: (v.tolist() if hasattr(v, "tolist") else float(v)) for k, v in J.items()}, open(os.path.join(CACHE, "male_joints.json"), "w"))
    bpy.ops.wm.save_as_mainfile(filepath=blend("male_2"))
    log(f"rig ok {time.time()-t0:.0f}s")


# ===================================================================== repose
def pose_rotate(rig, bone, axis, deg, pivot=None):
    pb = rig.pose.bones[P + bone]
    head = pb.head.copy() if pivot is None else Vector(pivot)
    R = Matrix.Rotation(math.radians(deg), 4, Vector(axis))
    T = Matrix.Translation(head) @ R @ Matrix.Translation(-head)
    pb.matrix = T @ pb.matrix; bpy.context.view_layer.update()


def clear_pose(rig):
    for pb in rig.pose.bones:
        pb.rotation_mode = 'QUATERNION'; pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0); pb.scale = (1, 1, 1)
    bpy.context.view_layer.update()


def arm_fix(rig, deg):
    for side in ("Left", "Right"):
        best = None
        for s in (1.0, -1.0):
            b = rig.pose.bones[f"{P}{side}Arm"]; m0 = b.matrix.copy()
            pose_rotate(rig, f"{side}Arm", (0, 1, 0), s * deg)
            x = abs(rig.pose.bones[f"{P}{side}ForeArm"].head.x)
            b.matrix = m0; bpy.context.view_layer.update()
            if best is None or x > best[0]: best = (x, s)
        pose_rotate(rig, f"{side}Arm", (0, 1, 0), best[1] * deg)


def stage_repose():
    t0 = time.time()
    bpy.ops.wm.open_mainfile(filepath=blend("male_2"))
    body, rig = bpy.data.objects["body"], bpy.data.objects["Armature"]
    J = json.load(open(os.path.join(CACHE, "male_joints.json")))
    cur = J["arm_angle"]; log("angulo do braco agora", cur, "-> 42")
    ank = abs(J["ankle"][0]); log("tornozelo x", ank, "(boneca 0.135)")
    select_only(rig); bpy.ops.object.mode_set(mode='POSE'); clear_pose(rig)
    arm_fix(rig, 42.0 - cur)
    bpy.ops.object.mode_set(mode='OBJECT')
    select_only(body)
    for m in list(body.modifiers):
        if m.type == 'ARMATURE': bpy.ops.object.modifier_apply(modifier=m.name)
    select_only(rig); bpy.ops.object.mode_set(mode='POSE')
    bpy.ops.pose.armature_apply(selected=False); clear_pose(rig)
    bpy.ops.object.mode_set(mode='OBJECT')
    m = body.modifiers.new("Armature", 'ARMATURE'); m.object = rig
    minz = getco(body)[:, 2].min(); log("min z apos repose", minz)
    if abs(minz) > 1e-4:
        c = getco(body); c[:, 2] -= minz; setco(body, c)
        select_only(rig); bpy.ops.object.mode_set(mode='EDIT')
        for b in rig.data.edit_bones: b.head.z -= minz; b.tail.z -= minz
        bpy.ops.object.mode_set(mode='OBJECT')
    # normais suaves (angulo)
    select_only(body); bpy.ops.object.shade_smooth_by_angle(angle=math.radians(40))
    bpy.ops.wm.save_as_mainfile(filepath=blend("male_3"))
    log(f"repose ok {time.time()-t0:.0f}s")


# ===================================================================== orient to doll
def glb_json(path):
    with open(path, "rb") as f:
        f.read(12); ln, tp = struct.unpack("<II", f.read(8)); return json.loads(f.read(ln))


def quat_to_mat(q):
    x, y, z, w = q
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                     [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                     [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])


def gltf_world_rotations(j):
    nodes = j["nodes"]; parent = {}
    for i, n in enumerate(nodes):
        for c in n.get("children", []): parent[c] = i
    R = {}

    def world(i):
        if i in R: return R[i]
        r = quat_to_mat(nodes[i].get("rotation", [0, 0, 0, 1]))
        R[i] = (world(parent[i]) @ r) if i in parent else r
        return R[i]
    return {n["name"]: world(i) for i, n in enumerate(nodes) if n["name"].startswith(P)}


def export_tmp(rig, body, path):
    for o in bpy.data.objects: o.select_set(False)
    body.select_set(True); rig.select_set(True); bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format='GLB', export_skins=True, export_animations=False,
                              export_morph=False, export_def_bones=False, export_image_format='NONE', export_materials='NONE')


def rot_angle(A, B):
    c = (np.trace(A.T @ B) - 1) / 2
    return math.degrees(math.acos(max(-1, min(1, c))))


def stage_orient():
    """O glTF exporter aplica uma correcao fixa de eixo dos ossos; em vez de teorizar, mede no GLB exportado e corrige:
    cada osso e girado (em torno da cabeca, a malha nao mexe) ate a rotacao MUNDIAL de repouso igualar a da boneca."""
    bpy.ops.wm.open_mainfile(filepath=blend("male_3"))
    rig, body = bpy.data.objects["Armature"], bpy.data.objects["body"]
    GD = gltf_world_rotations(glb_json(DOLL))
    C = np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]], float)
    tmp = os.path.join(CACHE, "tmp_exp.glb")
    for it in range(3):
        export_tmp(rig, body, tmp)
        GM = gltf_world_rotations(glb_json(tmp))
        errs = {nm: rot_angle(GM[nm], GD[nm]) for nm in GD}
        log(f"iter {it}: erro maximo de orientacao vs boneca {max(errs.values()):.2f} graus, medio {np.mean(list(errs.values())):.2f}")
        if max(errs.values()) < 0.2: break
        select_only(rig); bpy.ops.object.mode_set(mode='EDIT')
        for b in rig.data.edit_bones:
            Rc = C @ (GD[b.name] @ GM[b.name].T) @ C.T
            Bm = np.array(b.matrix.to_3x3()); L = b.length; head = b.head.copy()
            b.matrix = Matrix.Translation(head) @ Matrix(Rc @ Bm).to_4x4(); b.length = L
        bpy.ops.object.mode_set(mode='OBJECT')
    worst = sorted(errs.items(), key=lambda x: -x[1])[:4]
    log("piores:", [(n.replace(P, ''), round(a, 2)) for n, a in worst])
    bpy.ops.wm.save_as_mainfile(filepath=blend("male_4"))


# ===================================================================== morphs
def group_w(ob, rig, patterns):
    names = [b.name for b in rig.data.bones]; W = weights_matrix(ob, names)
    cols = [i for i, nm in enumerate(names) if any(p in nm for p in patterns)]
    return W[:, cols].sum(1)


def stage_morphs():
    t0 = time.time()
    bpy.ops.wm.open_mainfile(filepath=blend("male_4"))
    body, rig = bpy.data.objects["body"], bpy.data.objects["Armature"]
    co = getco(body); n = len(co); tv = tris(body.data); e = edges_of(body.data)
    nrm = vnormals(co, tv)
    Wn = lambda x: np.clip(x, 0, 1)
    W_torso = group_w(body, rig, ["Hips", "Spine", "Neck", "Shoulder"])
    W_leg = group_w(body, rig, ["UpLeg"]); W_calf = group_w(body, rig, ["mixamorig:LeftLeg", "mixamorig:RightLeg"])
    W_arm = group_w(body, rig, ["mixamorig:LeftArm", "mixamorig:RightArm", "ForeArm"]); W_hand = group_w(body, rig, ["Hand"])
    W_head = group_w(body, rig, ["Head"]); W_foot = group_w(body, rig, ["Foot", "Toe"])
    x, y, z = co[:, 0], co[:, 1], co[:, 2]
    zero = np.zeros(n)

    def sm(D, it=3): return laplace(D, e, np.ones(n), it, 0.5)
    fat = np.clip(W_torso * 1.0 + W_leg * 1.1 + W_calf * 0.6 + W_arm * 0.7 - W_hand * 0.7 - W_foot * 0.6, 0, 1.2) * (1 - Wn(W_head))
    out = {}
    out["weightUp"] = sm(nrm * (fat * 0.016)[:, None], 2)
    out["weightDown"] = sm(-nrm * (fat * 0.010)[:, None], 2)
    # musculo: ombro (deltoide), braco, antebraco, coxa/panturrilha, costas largas; peito so levemente (sem marcar)
    m_arm = Wn(W_arm * 1.0); m_leg = Wn(W_leg * 0.9 + W_calf * 0.9)
    dz = bell(np.abs(z - 1.36) / 0.09) * (np.abs(x) > 0.12)
    back = Wn(W_torso) * bell(np.abs(z - 1.2) / 0.2) * (y > 0)
    chest = Wn(W_torso) * bell(np.abs(z - 1.25) / 0.12) * (y < 0) * 0.25
    out["muscleUp"] = sm(nrm * ((m_arm * 0.014 + m_leg * 0.014 + dz * Wn(W_torso + W_arm) * 0.012 + back * 0.010 + chest * 0.010))[:, None], 3)
    # barriga (frente do abdomen), suave
    r = np.sqrt((x / 0.17) ** 2 + ((z - 1.02) / 0.15) ** 2 + ((y + 0.11) / 0.14) ** 2)
    Db = nrm * (bell(r) * 0.055)[:, None] * (y < 0.02)[:, None]
    out["bellyUp"] = sm(Db * Wn(W_torso + 0.0)[:, None], 3)
    # ombros largos/estreitos: torso escala em x na linha dos ombros, bracos acompanham
    f = bell(np.abs(z - 1.33) / 0.16)
    for nm, sg_ in (("shouldersBroad", 1.0), ("shouldersNarrow", -1.0)):
        Dt = np.stack([x * 0.11 * sg_ * f, zero, zero], 1) * Wn(W_torso)[:, None]
        Da = np.stack([np.sign(x) * 0.0125 * sg_ * 1.0 * np.ones(n), zero, zero], 1) * Wn(W_arm + W_hand)[:, None]
        out[nm] = sm(Dt + Da, 2)
    # peito largo: caixa toracica (costelas) mais larga/funda; sem volume de peitoral
    f = bell(np.abs(z - 1.22) / 0.14)
    Dc = np.stack([x * 0.12 * f, y * 0.10 * f, zero], 1) * (Wn(W_torso) * (np.abs(x) < 0.2))[:, None]
    out["chestBroad"] = sm(Dc, 3)
    f = bell(np.abs(z - 1.04) / 0.14)
    out["waistThin"] = sm(np.stack([-x * 0.10 * f, -y * 0.08 * f, zero], 1) * Wn(W_torso)[:, None], 3)
    f = bell(np.abs(z - 0.85) / 0.17)
    out["hipsWide"] = sm(np.stack([x * 0.07 * f, y * 0.02 * f, zero], 1) * Wn(W_torso + W_leg)[:, None], 3)
    D = np.zeros((n, 3))
    for sg in (1, -1):
        ax_x = sg * (0.08 + (0.82 - np.clip(z, 0.5, 0.82)) / 0.32 * 0.03)
        rad = np.stack([x - ax_x, y, zero], 1); rad /= np.maximum(np.linalg.norm(rad, axis=1), 1e-9)[:, None]
        D += rad * (bell(np.abs(z - 0.68) / 0.22) * 0.016 * (np.sign(x) == sg))[:, None]
    out["thighsThick"] = sm(D * Wn(W_leg)[:, None], 3)
    body.shape_key_add(name="Basis", from_mix=False)
    for nm, db in out.items():
        sk = body.shape_key_add(name=nm, from_mix=False)
        sk.data.foreach_set('co', (co + db).astype(np.float32).ravel())
        sk.slider_min = 0.0; sk.slider_max = 1.0; sk.value = 0.0
        log(f"{nm:16s} max |delta| {np.abs(db).max()*1000:.1f} mm")
    bpy.ops.wm.save_as_mainfile(filepath=blend("male_5"))
    log(f"morphs ok {time.time()-t0:.0f}s")


# ===================================================================== export
LABELS = {
    "weightUp": ("Mais peso", "Corpo"), "weightDown": ("Menos peso", "Corpo"), "muscleUp": ("Mais musculo", "Corpo"),
    "bellyUp": ("Barriga", "Corpo"), "shouldersBroad": ("Ombros largos", "Corpo"), "shouldersNarrow": ("Ombros estreitos", "Corpo"),
    "chestBroad": ("Peito largo", "Corpo"), "waistThin": ("Cintura fina", "Corpo"), "hipsWide": ("Quadril largo", "Corpo"),
    "thighsThick": ("Coxas grossas", "Corpo"),
}


def stage_export():
    bpy.ops.wm.open_mainfile(filepath=blend("male_5"))
    body, rig = bpy.data.objects["body"], bpy.data.objects["Armature"]
    body.name = "MaleBody"
    # material: base color (textura pintada) + roughness constante; mascaras ficam em PNG ao lado (como as da boneca)
    shutil.copy(os.path.join(CACHE, "male_basecolor.png"), os.path.join(PUB, "male_basecolor.png"))
    for k in ("", "2", "3", "4"):
        shutil.copy(os.path.join(CACHE, f"male_mask{k}.png"), os.path.join(PUB, f"male_mask{k}.png"))
    mat = bpy.data.materials.new("male"); mat.use_nodes = True
    nt = mat.node_tree; bsdf = nt.nodes["Principled BSDF"]
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(os.path.join(PUB, "male_basecolor.png"))
    tex.image.colorspace_settings.name = 'sRGB'
    nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.45; bsdf.inputs['Metallic'].default_value = 0.0
    body.data.materials.clear(); body.data.materials.append(mat)
    rig.hide_viewport = False; rig.hide_render = False
    for o in bpy.data.objects: o.select_set(False)
    body.select_set(True); rig.select_set(True); bpy.context.view_layer.objects.active = rig
    path = os.path.join(PUB, "male_base.glb")
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format='GLB', export_yup=True, export_apply=False,
                              export_image_format='AUTO', export_materials='EXPORT', export_normals=True, export_skins=True,
                              export_def_bones=False, export_animations=False, export_morph=True, export_morph_normal=False,
                              export_try_sparse_sk=True, export_cameras=False, export_lights=False)
    names = [b.name for b in rig.data.bones]; topb = float(getco(body)[:, 2].max())
    J = json.load(open(os.path.join(CACHE, "male_joints.json")))
    LMK = json.load(open(os.path.join(CACHE, "landmarks.json")))
    meta = {
        "version": 1, "source": "Meshy male (male_meshy.glb, malha sem textura) -> tools/blender/male/{prepare_male,paint_male,rig_male}.py",
        "files": {"body": "male_base.glb", "mask": "male_mask.png", "mask2": "male_mask2.png", "mask3": "male_mask3.png", "mask4": "male_mask4.png", "baseColor": "male_basecolor.png"},
        "heightMeters": round(topb, 3), "heightBodyMeters": round(topb, 3),
        "restPose": "A-pose ~42 deg arms (igual a boneca), pes retos ~0.27 m entre tornozelos, sola em z=0",
        "axes": "glTF Y-up, character faces +Z",
        "bones": names, "boneCount": len(names), "rootBone": "mixamorig:Hips",
        "boneNote": "Mesmos nomes/hierarquia e MESMA orientacao de repouso dos ossos da boneca (rotacoes locais iguais), posicoes pelas proporcoes masculinas; doll_anims_*.glb servem sem retarget de rotacao. A trilha de translacao do Hips (absoluta, em metros da boneca) precisa ser escalada por hipsHeight/0.8436.",
        "hipsHeight": round(float(rig.data.bones[P + "Hips"].head_local[2]), 4),
        "maskConvention": "R pele, G base/boxer, B feicoes (olhos, sobrancelhas, labios); mask2 R labios; mask3 R iris G sobrancelha B cilios; mask4 vazio. Textura base pintada com REF_SKIN/REF_SUIT do dollMaterial.ts (tingimento exato).",
        "face": {k: round(LMK[k], 4) for k in ("eye_x", "eye_z", "brow_z", "mouth_z", "nose_z", "chin_z")},
        "faceNote": "y do glTF = z do Blender: eyeY=eye_z etc. Camadas do rosto sao projetadas de frente no espaco de repouso (x,y) da malha.",
        "morphs": [{"name": k, "label": v[0], "group": v[1], "min": 0, "max": 1, "targets": ["body"]} for k, v in LABELS.items()],
        "morphGroups": ["Corpo"],
        "triangles": {"body": len(body.data.polygons)},
        "sizesBytes": {"male_base.glb": os.path.getsize(path)},
        "license": "Meshy-generated asset (check Meshy plan terms); rig/morph/paint tooling: project code",
    }
    json.dump(meta, open(os.path.join(PUB, "male_base.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    log("export", os.path.getsize(path) // 1024, "KB")


if __name__ == "__main__":
    stages = argv or ["rig", "repose", "orient", "morphs", "export"]
    for s_ in stages: globals()["stage_" + s_]()

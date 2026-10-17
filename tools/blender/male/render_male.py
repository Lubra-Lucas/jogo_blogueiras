"""Renders de verificacao do masculino (e da boneca na mesma luz/escala) + teste das animacoes da boneca.
Usage: blender -b --factory-startup -noaudio --python render_male.py -- <job ...>
  jobs: rest, faces, anim, morphs, orig
Cada personagem e renderizado sozinho com a MESMA camera/luz e depois compomos lado a lado (compose_male.py, PIL).
As animacoes (doll_anims_core.glb) sao aplicadas direto da trilha glTF: delta local = rest^-1 * anim, convertido para o frame do osso do Blender.
"""
import sys, os, struct
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mcommon import *
import render_util as R
import rig_male as RM

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.join(SHOTS, "parts")
os.makedirs(OUT, exist_ok=True)
MALE_GLB = os.path.join(PUB, "male_base.glb")
C = np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]], float)      # glTF -> Blender


def fresh():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def load(which):
    """returns (mesh_obj, rig_obj, glbjson)"""
    path = DOLL if which == "doll" else MALE_GLB
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    rig = next(o for o in new if o.type == 'ARMATURE'); mesh = max((o for o in new if o.type == 'MESH'), key=lambda o: len(o.data.polygons))
    if which == "male":
        mat = R.male_material(os.path.join(PUB, "male_basecolor.png"), os.path.join(PUB, "male_mask.png"))
        mesh.data.materials.clear(); mesh.data.materials.append(mat)
    rig.hide_render = True
    # shape keys: nome -> valor
    return mesh, rig, RM.glb_json(path)


# ----------------------------------------------------------------- animation from glb
def read_accessor(j, buf, idx):
    a = j["accessors"][idx]; bv = j["bufferViews"][a["bufferView"]]
    n = a["count"]; comp = {"SCALAR": 1, "VEC3": 3, "VEC4": 4}[a["type"]]
    off = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    return np.frombuffer(buf, dtype=np.float32, count=n * comp, offset=off).reshape(n, comp)


def load_anims(path):
    with open(path, "rb") as f:
        data = f.read()
    ln = struct.unpack("<I", data[12:16])[0]; j = json.loads(data[20:20 + ln])
    # calcula offset do BIN: refaz leitura
    pos = 12; binbuf = None
    while pos < len(data):
        cl, ct = struct.unpack("<II", data[pos:pos + 8])
        if ct == 0x004E4942: binbuf = data[pos + 8:pos + 8 + cl]
        pos += 8 + cl
    names = {i: n["name"] for i, n in enumerate(j["nodes"])}
    anims = {}
    for a in j["animations"]:
        tr = {}
        for ch in a["channels"]:
            s = a["samplers"][ch["sampler"]]
            t = read_accessor(j, binbuf, s["input"])[:, 0]; v = read_accessor(j, binbuf, s["output"])
            tr[(names[ch["target"]["node"]], ch["target"]["path"])] = (t, v)
        anims[a["name"]] = tr
    return anims


def quat_mul(a, b):
    x1, y1, z1, w1 = a; x2, y2, z2, w2 = b
    return np.array([w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2, w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
                     w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2, w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2])


def quat_inv(q): return np.array([-q[0], -q[1], -q[2], q[3]])


def sample(tr, t):
    ts, vs = tr; i = int(np.clip(np.searchsorted(ts, t) - 1, 0, len(ts) - 1)); return vs[i]


def mat_to_quat_wxyz(M):
    return Matrix(M).to_quaternion()


def pose_from_anim(rig, jrest, anims_tr, t, hips_ratio=1.0):
    """aplica a pose da animacao `anims_tr` no tempo t ao rig importado de jrest"""
    nodes = {n["name"]: n for n in jrest["nodes"]}
    GR = RM.gltf_world_rotations(jrest)
    select_only(rig); bpy.ops.object.mode_set(mode='POSE'); RM_clear = RM.clear_pose; RM_clear(rig)
    for pb in rig.pose.bones:
        nm = pb.name
        if (nm, "rotation") not in anims_tr: continue
        q_rest = np.array(nodes[nm].get("rotation", [0, 0, 0, 1]), float)
        q_anim = sample(anims_tr[(nm, "rotation")], t).astype(float)
        dq = quat_mul(quat_inv(q_rest), q_anim)
        dg = RM.quat_to_mat(dq)
        B = np.array(rig.data.bones[nm].matrix_local.to_3x3())
        K = B.T @ C @ GR[nm]                       # G = C^T B K  ->  K = B^T C G
        db = K @ dg @ K.T
        q = mat_to_quat_wxyz(db); pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = q
    hn = "mixamorig:Hips"
    if (hn, "translation") in anims_tr:
        ta = sample(anims_tr[(hn, "translation")], t).astype(float) * hips_ratio
        tr = np.array(nodes[hn]["translation"], float) if "translation" in nodes[hn] else np.zeros(3)
        Bh = np.array(rig.data.bones[hn].matrix_local.to_3x3())
        # rest do osso Hips no frame do GLB (pos mundial): translacao rest vem do proprio no
        d = C @ (ta - tr)
        rig.pose.bones[hn].location = Vector(Bh.T @ d)
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.context.view_layer.update()


def set_morphs(mesh, vals):
    if not mesh.data.shape_keys: return
    for k in mesh.data.shape_keys.key_blocks:
        if k.name != "Basis": k.value = vals.get(k.name, 0.0)
    bpy.context.view_layer.update()


def lighting():
    R.setup((800, 1000))


def shoot(name, center, ortho, azim, elev=4, res=None):
    R.cam(center, 8, azim, elev, ortho=ortho)
    R.shot(os.path.join(OUT, name + ".png"))


def job_rest():
    for which in ("doll", "male"):
        fresh(); mesh, rig, j = load(which); lighting()
        for az, nm in ((0, "front"), (90, "side"), (40, "q34")):
            shoot(f"{which}_rest_{nm}", (0, 0, 0.875), 2.05, az)


def job_faces():
    for which in ("doll", "male"):
        fresh(); mesh, rig, j = load(which); lighting()
        zc = 1.38 if which == "doll" else 1.56
        for az, nm in ((0, "front"), (35, "q34")):
            shoot(f"{which}_face_{nm}", (0, 0, zc), 0.50, az, 2)


def job_anim():
    anims = load_anims(ANIMS)
    for which in ("doll", "male"):
        for an, t, az in (("walk_normal", 0.30, 90), ("walk_normal", 0.30, 40), ("stand_to_sit", 2.2, 90), ("run", 0.15, 90),
                          ("desfile", 0.3, 40), ("idle", 1.0, 0)):
            fresh(); mesh, rig, j = load(which); lighting()
            hr = 1.0
            if which == "male":
                hr = json.load(open(os.path.join(PUB, "male_base.json")))["hipsHeight"] / 0.8436
            pose_from_anim(rig, j, anims[an], t, hr)
            shoot(f"{which}_{an}_{az}", (0, 0, 0.875), 2.05, az)
    # bracos levantados + sentado manual: usa clipes de emote
    em = load_anims(os.path.join(REPO, "public", "assets", "anims", "doll_anims_emotes.glb"))
    for which in ("doll", "male"):
        for an, t, az in (("wave", 1.0, 0), ("clap", 1.0, 0), ("point", 1.0, 40)):
            fresh(); mesh, rig, j = load(which); lighting()
            hr = 1.0
            if which == "male":
                hr = json.load(open(os.path.join(PUB, "male_base.json")))["hipsHeight"] / 0.8436
            pose_from_anim(rig, j, em[an], t, hr)
            shoot(f"{which}_{an}_{az}", (0, 0, 0.875), 2.05, az)


def job_morphs():
    fresh(); mesh, rig, j = load("male"); lighting()
    sets = {"magro": {"weightDown": 1.0, "shouldersNarrow": 0.5}, "gordo": {"weightUp": 1.0, "bellyUp": 0.6},
            "musculoso": {"muscleUp": 1.0, "shouldersBroad": 0.8, "chestBroad": 0.6}, "barriga": {"bellyUp": 1.0, "weightUp": 0.4},
            "base": {}}
    for nm, v in sets.items():
        set_morphs(mesh, v); shoot(f"male_morph_{nm}_front", (0, 0, 0.875), 2.05, 0); shoot(f"male_morph_{nm}_q34", (0, 0, 0.875), 2.05, 40)


def job_orig():
    # original do Meshy (cinza, sem textura) x preparado (com a mascara/pintura)
    fresh(); bpy.ops.import_scene.gltf(filepath=SRC)
    o = bpy.data.objects["mesh_node"]; m = bpy.data.materials.new('g'); m.diffuse_color = (0.8, 0.8, 0.8, 1)
    o.data.materials.append(m)
    for p in o.data.polygons: p.use_smooth = False
    lighting()
    zc = 0.0
    shoot("orig_meshy_front", (0, 0, 0), 1.1 * 1.0, 0)
    shoot("orig_meshy_pelvis", (0, 0, -0.07), 0.5, 20)
    shoot("orig_meshy_face", (0, 0, 0.395), 0.28, 0, 2)
    fresh(); mesh, rig, j = load("male"); lighting()
    shoot("prep_front", (0, 0, 0.875), 2.05 * 1.1 * 0.95 / 1.1, 0)
    shoot("prep_pelvis", (0, 0, 0.9), 0.9, 20)
    shoot("prep_face", (0, 0, 1.56), 0.50, 0, 2)


if __name__ == "__main__":
    for jb in argv: globals()["job_" + jb]()

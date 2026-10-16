"""Render jewelry on the doll, placed ONLY through jewelry.json (validates the bone offsets).
blender -b --factory-startup -noaudio --python render_jewelry.py -- --pieces a,b --cam neck --out name
        [--metal gold|rosegold|silver|chrome] [--bust 1] [--hair hair_chestnutWaves] [--gem #hex] [--sides both|L|R]
"""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from jlib import *
import argparse
ap = argparse.ArgumentParser()
ap.add_argument("--pieces", default=""); ap.add_argument("--cam", default="neck"); ap.add_argument("--out", default="shot")
ap.add_argument("--metal", default=""); ap.add_argument("--bust", type=float, default=0.0)
ap.add_argument("--hair", default=""); ap.add_argument("--gem", default=""); ap.add_argument("--ribbon", default="")
ap.add_argument("--pearl", default=""); ap.add_argument("--size", default="1000,1000"); ap.add_argument("--samples", type=int, default=40)
ap.add_argument("--metals", default=""); ap.add_argument("--morph", default="")   # per piece "id:metal,id:metal"
ap.add_argument("--pose", default="")       # "walk_normal:0.3" : pose doll (+hair) from doll_anims_core.glb at that time; pieces follow their bones
ap.add_argument("--cols", default="")       # per piece colours "id:slot=#hex;slot=#hex,id2:..."  (~ for #)
ap.add_argument("--noclip", action="store_true")
ap.add_argument("--garments", default="")   # "tee,skinny_jeans:base=~3b5a85" public/assets/garments/<id>.glb on the doll (default palette from garments.json)
a = ap.parse_args(sys.argv[sys.argv.index("--")+1:])

clear_scene()
_m = {"bustBig": a.bust} if a.bust else {}
_m.update({k: float(v) for k, v in (x.split("=") for x in a.morph.split("+") if x)})
body = load_doll(_m or None)
w, h = [int(x) for x in a.size.split(",")]
setup_render(w, h, a.samples); bpy.context.scene.view_settings.exposure = float(os.environ.get("EXPO", "-1.1"))
doc = json.load(open(os.path.join(OUT, "jewelry.json")))
byid = {p["id"]: p for p in doc["pieces"]}
per_metal = dict(x.split(":") for x in a.metals.split(",") if x)

if a.hair:
    pre = set(bpy.data.objects.keys())
    bpy.ops.import_scene.gltf(filepath=os.path.join(REPO, "public", "assets", "characters", a.hair + ".glb"))
    for n in set(bpy.data.objects.keys()) - pre:
        o = bpy.data.objects[n]
        if o.type == 'ARMATURE': o.hide_render = True

GARM = set()
if a.garments:
    gdoc = {g["id"]: g for g in json.load(open(os.path.join(REPO, "public", "assets", "garments", "garments.json"), encoding="utf-8"))["items"]}
    for spec in [x for x in a.garments.split(",") if x]:
        gid, _, ov = spec.partition(":")
        ovd = dict(kv.split("=") for kv in ov.split(";") if kv) if ov else {}
        pre = set(bpy.data.objects.keys())
        bpy.ops.import_scene.gltf(filepath=os.path.join(REPO, "public", "assets", "garments", gid + ".glb"))
        for n in set(bpy.data.objects.keys()) - pre:
            o = bpy.data.objects[n]
            if o.name.startswith("Icosphere"): bpy.data.objects.remove(o); continue
            GARM.add(n)
            if o.type == 'ARMATURE': o.hide_render = True
            if o.type == 'MESH':
                pal = dict(gdoc.get(gid, {}).get("palette", {})); pal.update({k: v.replace("~", "#") for k, v in ovd.items()})
                for ms in o.material_slots:
                    m = ms.material
                    if not m or not m.use_nodes: continue
                    key = m.name.split(".")[0].split("_")[-1]
                    b = m.node_tree.nodes.get("Principled BSDF")
                    for k, col in pal.items():
                        if key == k or m.name.split(".")[0].endswith(k):
                            for l in list(m.node_tree.links):
                                if l.to_socket == b.inputs["Base Color"]: m.node_tree.links.remove(l)
                            b.inputs["Base Color"].default_value = hexc(col)

C = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
Ci = C.inverted()
nodes = glb_nodes()
POSE = None
if a.pose:
    from anim_lib import world_at
    _c, _t = a.pose.split(":"); POSE = world_at(_c, float(_t))


def pose_armature(arm):
    """set every pose bone of `arm` from the sampled clip (node frames -> bone frames through the constant rest offset B)"""
    Aw = arm.matrix_world; bones = list(arm.data.bones)
    depth = lambda b: 0 if b.parent is None else 1 + depth(b.parent)
    for b in sorted(bones, key=depth):
        nm = b.name
        if nm not in POSE: continue
        Nrest = C @ bone_world_gltf(nm, nodes) @ Ci
        B = Nrest.inverted() @ (Aw @ b.matrix_local)
        target = C @ POSE[nm] @ Ci @ B
        pb = arm.pose.bones[nm]; pb.matrix = Aw.inverted() @ target
        bpy.context.view_layer.update()


if POSE:
    for o in list(bpy.data.objects):
        if o.type == 'ARMATURE': pose_armature(o)


def apply_hair_clip(clip):
    """squeeze the hair into the hat's inner ellipsoid (bind space, before skinning) - the same rule the game shader should use"""
    bd = clip["bind"]; cg = Vector(bd["center"]); c = Vector((cg.x, -cg.z, cg.y)); rx, ru, rf = bd["radii"]; mz = bd["minY"]; soft = clip.get("soft", 0.02)
    for o in bpy.data.objects:
        if o.type != 'MESH' or o.name == 'DollBody' or o.name.startswith('Piece_') or o.name in GARM: continue
        M = o.matrix_world; Mi = M.inverted()
        for v in o.data.vertices:
            w = M @ v.co; d = w - c
            rho = math.sqrt((d.x/rx)**2 + (d.y/rf)**2 + (d.z/ru)**2)
            if rho <= 1.0 or w.z < mz - soft: continue
            t = min(max((w.z - (mz - soft))/soft, 0.0), 1.0); t = t*t*(3 - 2*t)
            nv = Mi @ w.lerp(c + d/rho, t); v.co = nv
            if o.data.shape_keys: o.data.shape_keys.key_blocks[0].data[v.index].co = nv
        o.data.update()


if a.hair and not a.noclip:
    for pid in [x for x in a.pieces.split(",") if x]:
        if "hairClip" in byid.get(pid, {}): apply_hair_clip(byid[pid]["hairClip"])


def recolor(obj, metal):
    for sl in obj.material_slots:
        m = sl.material
        if not m or not m.use_nodes: continue
        b = m.node_tree.nodes.get("Principled BSDF")
        nm = m.name.split(".")[0]
        if nm == "metal": b.inputs["Base Color"].default_value = hexc(METALS[metal])
        elif nm == "gem" and a.gem: b.inputs["Base Color"].default_value = hexc(a.gem); b.inputs["Emission Color"].default_value = hexc(a.gem)
        elif nm == "ribbon" and a.ribbon: b.inputs["Base Color"].default_value = hexc(a.ribbon)
        elif nm == "pearl" and a.pearl: b.inputs["Base Color"].default_value = hexc(a.pearl)


for pid in [x for x in a.pieces.split(",") if x]:
    p = byid[pid]
    for k, att in enumerate(p["attachments"]):
        if p["slot"] in ("wrist", "finger") and "Right" in att["bone"] and False: continue
        pre = set(bpy.data.objects.keys())
        bpy.ops.import_scene.gltf(filepath=os.path.join(REPO, "public", "assets", p["file"]))
        new = [bpy.data.objects[n] for n in set(bpy.data.objects.keys()) - pre]
        for o in new:
            if o.type != 'MESH':
                continue
            t = Vector(att["position"]); q = att["quaternion"]
            from mathutils import Quaternion
            Q = Quaternion((q[3], q[0], q[1], q[2]))
            L = Matrix.Translation(t) @ Q.to_matrix().to_4x4() @ Matrix.Diagonal(list(att["scale"]) + [1])
            if a.hair and pid in (doc.get("hairFit", {}).get("mountDir", {})) and "hairClip" not in p:
                lift = doc["hairFit"]["lift"].get(a.hair, {}).get(pid, 0.0)
                md = Vector(doc["hairFit"]["mountDir"][pid])
                L.translation += bone_world_gltf(att["bone"], nodes).to_3x3().inverted() @ (md*lift)     # lift expressed in the bone frame (works posed too)
            Wb = POSE[att["bone"]] if POSE else bone_world_gltf(att["bone"], nodes)
            Wg = Wb @ L
            o.parent = None
            o.matrix_world = C @ Wg @ Ci
            o.name = "Piece_" + pid
            recolor(o, per_metal.get(pid, a.metal or p.get("defaultMetal", "gold")))
            for spec in [x for x in a.cols.split(",") if x.startswith(pid + ":")]:
                for kv in spec.split(":", 1)[1].split(";"):
                    sl, col = kv.split("="); col = col.replace("~", "#")
                    for ms in o.material_slots:
                        if ms.material and ms.material.name.split(".")[0] == sl:
                            bb = ms.material.node_tree.nodes.get("Principled BSDF"); bb.inputs["Base Color"].default_value = hexc(col)
                            if sl == "gem": bb.inputs["Emission Color"].default_value = hexc(col)
        for o in new:
            if o.type != 'MESH': bpy.data.objects.remove(o)

cams = {
    "neck": ((-0.30, -0.78, 1.30), (0, -0.02, 1.215), 85),
    "neckfront": ((0.0, -0.9, 1.26), (0, -0.02, 1.22), 85),
    "ear": ((0.70, -0.62, 1.44), (0.06, -0.01, 1.38), 85),
    "head": ((-0.55, -1.0, 1.55), (0, -0.01, 1.45), 85),
    "head_r": ((0.55, -1.0, 1.55), (0, -0.01, 1.45), 85),
    "headtop": ((-0.35, -0.8, 1.85), (0, -0.01, 1.48), 85),
    "bust": ((-0.2, -1.1, 1.25), (0, -0.02, 1.15), 85),
    "hand": ((0.75, -0.55, 1.05), (0.38, 0.0, 0.86), 100),
    "handtop": ((0.50, -0.30, 1.30), (0.42, 0.0, 0.82), 120),
    "handside": ((0.95, 0.35, 0.95), (0.41, 0.01, 0.82), 120),
    "upper": ((-0.2, -1.5, 1.45), (0, 0, 1.2), 85),
    "look": ((-0.55, -2.6, 1.22), (0.05, 0, 1.15), 85),
    "full": ((0, -3.8, 1.0), (0, 0, 0.8), 85),
    "neckclose": ((-0.10, -0.50, 1.29), (0, -0.02, 1.255), 85),
    "neckside": ((-0.45, -0.25, 1.28), (0, 0.0, 1.25), 85),
    "chestclose": ((-0.12, -0.80, 1.20), (0, -0.03, 1.16), 85),
    "earclose": ((0.45, -0.40, 1.40), (0.10, -0.01, 1.36), 85),
    "earfront": ((0.30, -0.65, 1.40), (0.08, -0.02, 1.37), 85),
    "headwide": ((0.0, -1.5, 1.66), (0, 0, 1.52), 85),
    "headwide3q": ((-0.75, -1.25, 1.66), (0, 0, 1.52), 85),
    "setshot": ((-0.30, -1.85, 1.62), (0.0, 0.0, 1.38), 85),
    "headfront": ((0.0, -0.9, 1.50), (0, -0.01, 1.45), 85),
    "headside": ((0.9, -0.2, 1.50), (0, 0, 1.45), 85),
    "headback": ((0.3, 0.9, 1.5), (0, 0, 1.43), 85),
    "wristclose": ((0.62, -0.38, 1.0), (0.37, 0.0, 0.88), 100),
    "wristtop": ((0.55, -0.12, 1.25), (0.37, 0.0, 0.87), 100),
    "handclose": ((0.60, -0.30, 1.05), (0.40, 0.0, 0.80), 85),
    "handfront": ((0.40, -0.65, 0.95), (0.40, 0.0, 0.82), 100),
    "face_ortho": ((0.0, -6.0, 1.40), (0, 0, 1.40), 400), "face_ortho3q": ((-3.0, -5.2, 1.40), (0, 0, 1.40), 400),
    "hatfront": ((0.0, -1.65, 1.60), (0, 0, 1.52), 85), "hat34": ((-0.95, -1.35, 1.64), (0, 0, 1.52), 85),
    "hatside": ((1.65, -0.15, 1.60), (0, 0, 1.52), 85), "hatback": ((0.55, 1.55, 1.62), (0, 0, 1.52), 85),
    "glassesfront": ((0.0, -0.72, 1.40), (0, -0.02, 1.395), 85), "glasses34": ((-0.42, -0.62, 1.425), (0, -0.05, 1.39), 85),
    "glassesside": ((0.75, -0.30, 1.40), (0.0, -0.05, 1.395), 85), "glassestop": ((0.15, -0.55, 1.60), (0, -0.07, 1.395), 85),
    "fullfront": ((0, -3.6, 0.95), (0, 0, 0.84), 70), "full34": ((-1.5, -3.2, 1.0), (0, 0, 0.84), 70), "fullside": ((-3.5, -0.2, 0.95), (0, 0, 0.84), 70),
    "fullback": ((0.9, 3.2, 1.0), (0, 0, 0.84), 70), "fullR": ((-1.6, -3.0, 0.95), (-0.1, 0, 0.85), 70),
    "torso": ((-0.55, -2.1, 1.12), (0, 0, 1.05), 70), "torsoback": ((0.6, 2.1, 1.12), (0, 0, 1.05), 70),
    "waist": ((0.0, -1.35, 1.0), (0, 0, 1.0), 70), "waist34": ((-0.7, -1.25, 1.0), (0, 0, 1.0), 70),
    "ankle": ((0.55, -0.75, 0.30), (0.135, 0.0, 0.14), 85), "ankleside": ((0.9, 0.1, 0.25), (0.135, 0.0, 0.13), 85),
    "chest": ((-0.45, -0.9, 1.30), (0.0, -0.03, 1.15), 85), "scarf": ((-0.40, -0.9, 1.33), (0.0, -0.02, 1.22), 85),
}
loc, tgt, lens = cams[a.cam]
camera(loc, tgt, lens)
render(os.path.join(SHOTS, a.out + ".png"))

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
a = ap.parse_args(sys.argv[sys.argv.index("--")+1:])

clear_scene()
_m = {"bustBig": a.bust} if a.bust else {}
_m.update({k: float(v) for k, v in (x.split("=") for x in a.morph.split("+") if x)})
body = load_doll(_m or None)
w, h = [int(x) for x in a.size.split(",")]
setup_render(w, h, a.samples)
doc = json.load(open(os.path.join(OUT, "jewelry.json")))
byid = {p["id"]: p for p in doc["pieces"]}
per_metal = dict(x.split(":") for x in a.metals.split(",") if x)

if a.hair:
    pre = set(bpy.data.objects.keys())
    bpy.ops.import_scene.gltf(filepath=os.path.join(REPO, "public", "assets", "characters", a.hair + ".glb"))
    for n in set(bpy.data.objects.keys()) - pre:
        o = bpy.data.objects[n]
        if o.type == 'ARMATURE': o.hide_render = True

C = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
Ci = C.inverted()
nodes = glb_nodes()


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
            Wg = bone_world_gltf(att["bone"], nodes) @ L
            o.parent = None
            o.matrix_world = C @ Wg @ Ci
            if a.hair and pid in (doc.get("hairFit", {}).get("mountDir", {})):
                lift = doc["hairFit"]["lift"].get(a.hair, {}).get(pid, 0.0)
                md = doc["hairFit"]["mountDir"][pid]
                o.location += Vector((md[0], -md[2], md[1])) * lift
            recolor(o, per_metal.get(pid, a.metal or p.get("defaultMetal", "gold")))
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
}
loc, tgt, lens = cams[a.cam]
camera(loc, tgt, lens)
render(os.path.join(SHOTS, a.out + ".png"))

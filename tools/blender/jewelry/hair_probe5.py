"""Hair-vs-body penetration with sliders at full value (MORPH_MAX influence), ray-parity inside test (head + torso region).
blender -b --factory-startup -noaudio --python hair_probe5.py -- [dir=<folder with hair_*.glb>] [hair_x ...]
Prints per hair / per slider config: verts inside the body (z 0.85..1.70) and max depth (mm)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from jlib import *
import numpy as np
from mathutils.bvhtree import BVHTree

MAXI = {"faceThin": 2.2, "jawNarrow": 2.5, "chinPointed": 1.8, "cheekbonesHigh": 1.2, "shouldersNarrow": 2.2, "weightUp": 1.9, "weightDown": 2.0, "bustBig": 2.2, "bustSmall": 2.0}
CONFIGS = [("none", {}), ("faceAll", {"faceThin": 2.2, "jawNarrow": 2.5, "chinPointed": 1.8, "cheekbonesHigh": 1.2}), ("weightUp", {"weightUp": 1.9}),
           ("bustBig", {"bustBig": 2.2}), ("shoulders", {"shouldersNarrow": 2.2}), ("everything", {"faceThin": 2.2, "jawNarrow": 2.5, "chinPointed": 1.8, "cheekbonesHigh": 1.2, "weightUp": 1.9, "bustBig": 2.2, "shouldersNarrow": 2.2})]
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
opt = dict(a.split("=", 1) for a in args if "=" in a)
folder = opt.get("dir", os.path.join(REPO, "public", "assets", "characters"))
hairs = [a for a in args if "=" not in a] or ["hair_meshy_updo", "hair_chestnutWaves", "hair_caramelCurls", "hair_platinumUndercut"]
clear_scene()
body = load_doll()
kb = body.data.shape_keys.key_blocks
imported = {}
for hair in hairs:
    pre = set(bpy.data.objects.keys())
    bpy.ops.import_scene.gltf(filepath=os.path.join(folder, hair + ".glb"))
    new = [bpy.data.objects[n] for n in set(bpy.data.objects.keys()) - pre]
    imported[hair] = [o for o in new if o.type == 'MESH' and o.data.shape_keys]
    for o in new:
        if o.type == 'MESH' and not o.data.shape_keys:
            bpy.data.objects.remove(o)


def evaluated(o):
    dg = bpy.context.evaluated_depsgraph_get()
    e = o.evaluated_get(dg)
    m = e.to_mesh()
    vs = [o.matrix_world @ v.co for v in m.vertices]
    ps = [tuple(p.vertices) for p in m.polygons]
    e.to_mesh_clear()
    return vs, ps


def inside(bvh, p):
    votes = 0
    for d in (Vector((0, 0, 1)), Vector((1, 0, 0)), Vector((0, 1, 0))):
        n = 0
        o = Vector(p)
        for _ in range(14):
            r = bvh.ray_cast(o, d)
            if r[0] is None:
                break
            n += 1
            o = r[0] + d * 1e-4
        votes += n % 2
    return votes >= 2


for label, vals in CONFIGS:
    for k in kb:
        if k.name != 'Basis':
            k.value = 0
    for objs in imported.values():
        for o in objs:
            for k in o.data.shape_keys.key_blocks:
                if k.name != 'Basis':
                    k.value = 0
    for n, v in vals.items():
        if n in kb:
            kb[n].value = v
        for objs in imported.values():
            for o in objs:
                if n in o.data.shape_keys.key_blocks:
                    o.data.shape_keys.key_blocks[n].value = v
    bpy.context.view_layer.update()
    bv, bp = evaluated(body)
    bvh = BVHTree.FromPolygons([tuple(v) for v in bv], bp)
    res = []
    for hair, objs in imported.items():
        cnt = 0
        deep = 0.0
        for o in objs:
            vs, _ = evaluated(o)
            for v in vs:
                if 0.85 < v[2] < 1.7 and abs(v[0]) < 0.3 and -0.25 < v[1] < 0.25 and inside(bvh, v):
                    cnt += 1
                    deep = max(deep, bvh.find_nearest(v)[3])
        res.append(f"{hair[5:12]}:{cnt}({deep*1000:.0f}mm)")
    print("PEN", f"{label:11s}", " ".join(res), flush=True)

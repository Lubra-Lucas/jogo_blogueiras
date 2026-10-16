"""Hair root gap: for skull vertices (cranium, away from the face) cast a ray along the skull normal and measure the
distance to the first hair surface hit. Per hair: percentiles of the gap by region (top / back / sides), % verts with a hit.
Used to calibrate src/game/character/hairFit.ts (scale/offset per hair).
blender -b --factory-startup -noaudio --python hair_probe4.py -- [hair_x ...]"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from jlib import *
import numpy as np
from mathutils.bvhtree import BVHTree

clear_scene()
body = load_doll()
bv = [tuple(body.matrix_world @ v.co) for v in body.data.vertices]
bm = body.data
bm.calc_loop_triangles()
skull = BVHTree.FromPolygons(bv, [tuple(p.vertices) for p in bm.polygons])
nrm = [body.matrix_world.to_3x3() @ v.normal for v in bm.vertices]
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
hairs = args or ["hair_meshy_updo", "hair_chestnutWaves", "hair_caramelCurls", "hair_platinumUndercut"]
for hair in hairs:
    pre = set(bpy.data.objects.keys())
    bpy.ops.import_scene.gltf(filepath=os.path.join(REPO, "public", "assets", "characters", hair + ".glb"))
    new = [bpy.data.objects[n] for n in set(bpy.data.objects.keys()) - pre]
    vs, ps = [], []
    for o in new:
        if o.type != 'MESH' or not o.data.shape_keys:
            continue
        off = len(vs)
        vs += [tuple(o.matrix_world @ v.co) for v in o.data.vertices]
        ps += [tuple(p.vertices[i] + off for i in range(3)) for p in o.data.polygons if len(p.vertices) == 3]
        ps += [tuple(p.vertices[i] + off for i in (0, 2, 3)) for p in o.data.polygons if len(p.vertices) == 4]
    ht = BVHTree.FromPolygons(vs, ps)
    reg = {"top": [], "back": [], "side": [], "front_hairline": []}
    nohit = {k: 0 for k in reg}
    for i, v in enumerate(bm.vertices):
        co = Vector(bv[i])
        if co[2] < 1.46 or co[2] > 1.62:
            continue
        n = nrm[i]
        if n[2] > 0.75 and co[2] > 1.52:
            k = "top"
        elif n[1] > 0.6 and abs(co[0]) < 0.12:
            k = "back"            # glTF -> Blender: +Y is back
        elif abs(n[0]) > 0.7:
            k = "side"
        elif n[1] < -0.3 and co[2] > 1.55:
            k = "front_hairline"
        else:
            continue
        r = ht.ray_cast(co + n * 0.001, n, 0.15)
        if r[0] is None:
            nohit[k] += 1
        else:
            reg[k].append(r[3])
    out = {}
    for k, a in reg.items():
        a = np.array(a) if a else np.array([np.nan])
        out[k] = (len(a), round(float(np.nanpercentile(a, 5)) * 1000, 1), round(float(np.nanpercentile(a, 50)) * 1000, 1), round(float(np.nanpercentile(a, 95)) * 1000, 1), nohit[k])
    print("GAP", hair, out)
    for o in new:
        bpy.data.objects.remove(o)

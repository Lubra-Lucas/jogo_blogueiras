"""Measure hair-volume thickness at each head piece's mount direction -> jewelry.json 'hairFit'
(run after build_jewelry.py).  lift = max(0, hair thickness - built offset 10 mm), applied along mountDir (glTF world dir)."""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from jlib import *
from mathutils.bvhtree import BVHTree
clear_scene(); body = load_doll()
skull = BVHTree.FromPolygons([tuple(c.co) for c in body.data.vertices], [tuple(p.vertices) for p in body.data.polygons])
HC = Vector((0, -0.012, 1.44))
MOUNT = {"tiara": (0, -0.62, 0.78), "hair_bow": (0.55, -0.35, 0.75), "star_pins": (-0.5, -0.55, 0.7)}
BUILT = 0.010
_j = json.load(open(os.path.join(OUT, "jewelry.json"), encoding="utf-8"))
for _p in _j["pieces"]:      # collection-2 head pieces declare hairMount (Blender-space dir)
    if _p.get("hairMount"): MOUNT[_p["id"]] = tuple(_p["hairMount"])
fit = {}
for hair in ("hair_chestnutWaves", "hair_caramelCurls", "hair_platinumUndercut", "hair_meshy_updo", "hair_bobAuburn"):
    pre = set(bpy.data.objects.keys())
    bpy.ops.import_scene.gltf(filepath=os.path.join(REPO, "public", "assets", "characters", hair + ".glb"))
    new = [bpy.data.objects[n] for n in set(bpy.data.objects.keys()) - pre]
    dg = bpy.context.evaluated_depsgraph_get(); vs = []; ps = []
    for o in new:
        if o.type != 'MESH': continue
        m = o.evaluated_get(dg).to_mesh(); off = len(vs)
        vs += [tuple(o.matrix_world @ v.co) for v in m.vertices]; ps += [tuple(i + off for i in p.vertices) for p in m.polygons]
    ht = BVHTree.FromPolygons(vs, ps)
    fit[hair] = {}
    for pid, d in MOUNT.items():
        d0 = Vector(d).normalized(); th = 0.0
        for jx in (-0.15, 0, 0.15):
            for jz in (-0.15, 0, 0.15):
                d = (d0 + Vector((jx, 0, jz))).normalized(); far = HC + d*0.6
                a = skull.ray_cast(far, -d, 0.6); b = ht.ray_cast(far, -d, 0.6)
                if a[0] is not None and b[0] is not None: th = max(th, (a[0]-b[0]).length)
        fit[hair][pid] = round(max(0.0, th - BUILT), 4)
    for o in new: bpy.data.objects.remove(o)
    print("[hairfit]", hair, fit[hair])
jp = os.path.join(OUT, "jewelry.json"); doc = json.load(open(jp, encoding="utf-8"))
doc["hairFit"] = {"note": "per hairstyle lift (m) to add to the piece position along mountDir (glTF world dir) so it sits on top of the hair volume instead of inside it",
                  "builtOffset": BUILT,
                  "mountDir": {k: [round(v[0], 3), round(v[2], 3), round(-v[1], 3)] for k, v in ((k, Vector(v).normalized()) for k, v in MOUNT.items())},
                  "lift": fit}
json.dump(doc, open(jp, "w", encoding="utf-8"), indent=1, ensure_ascii=False)

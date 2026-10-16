import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from jlib import *
from mathutils.bvhtree import BVHTree
clear_scene(); body = load_doll()
V0 = [tuple(c.co) for c in body.data.vertices]; P0 = [tuple(p.vertices) for p in body.data.polygons]
skull = BVHTree.FromPolygons(V0, P0)
HC = Vector((0, -0.012, 1.44))
dirs = {"crown": (0, -0.1, 1), "front-top": (0, -0.5, 0.85), "bow": (0.55, -0.35, 0.75), "pin": (-0.5, -0.55, 0.7), "side-hi": (1, 0, 0.6),
        "ear": (1, 0.0, -0.1), "back": (0, 1, 0.3), "hairline": (0, -0.9, 0.45)}
for hair in ("hair_chestnutWaves", "hair_caramelCurls", "hair_platinumUndercut", "hair_meshy_updo"):
    pre = set(bpy.data.objects.keys())
    bpy.ops.import_scene.gltf(filepath=os.path.join(REPO, "public", "assets", "characters", hair + ".glb"))
    new = [bpy.data.objects[n] for n in set(bpy.data.objects.keys()) - pre]
    dg = bpy.context.evaluated_depsgraph_get()
    vs = []; ps = []
    for o in new:
        if o.type != 'MESH': continue
        oe = o.evaluated_get(dg); m = oe.to_mesh()
        off = len(vs); vs += [tuple(o.matrix_world @ v.co) for v in m.vertices]
        ps += [tuple(i + off for i in p.vertices) for p in m.polygons]
    ht = BVHTree.FromPolygons(vs, ps)
    out = []
    for k, d in dirs.items():
        d = Vector(d).normalized(); far = HC + d*0.6
        a = skull.ray_cast(far, -d, 0.6); b = ht.ray_cast(far, -d, 0.6)
        out.append("%s skull@%.3f hair@%.3f -> +%.1fmm" % (k, (far-a[0]).length if a[0] else -1, (far-b[0]).length if b[0] else -1,
                   ((a[0]-b[0]).length*1000 if a[0] and b[0] else -1)))
    print("HAIR", hair, "; ".join(out))
    for o in new: bpy.data.objects.remove(o)

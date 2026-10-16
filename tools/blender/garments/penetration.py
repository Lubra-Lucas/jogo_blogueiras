"""Teste de penetracao em movimento: blender -b --factory-startup -noaudio --python penetration.py -- out.json id1 id2 ...  (sem ids = todos do garments.json)
Para cada roupa e cenario (pose + morphs) mede quantos vertices da roupa ficam DENTRO da pele do corpo (distancia assinada < 0.5 mm) e a profundidade maxima."""
import bpy, sys, os, math, json
import numpy as np
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
args = sys.argv[sys.argv.index("--") + 1:]
outp = args[0]; ids = args[1:]
gdir = os.path.join(REPO, "public", "assets", "garments")
db = json.load(open(os.path.join(gdir, "garments.json"), encoding="utf-8"))
if not ids: ids = [i["id"] for i in db["items"]]

bpy.ops.wm.open_mainfile(filepath=os.path.join(REPO, "tools", "blender", ".cache", "meshyB_4.blend"))
rig = bpy.data.objects["Armature"]; body = bpy.data.objects["body_lo"]
rig.hide_render = True

SC = [("walk", {}), ("walk", {"bustBig": 1, "buttBig": 1, "hipsWide": 1}), ("sit", {}), ("desfile", {}), ("desfile", {"bustBig": 1, "buttBig": 1, "hipsWide": 1, "weightUp": 1})]


def rot_world(pb, axis, deg):
    R = Quaternion(axis, math.radians(deg)).to_matrix(); B = pb.bone.matrix_local.to_3x3()
    pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (B.inverted() @ R @ B).to_quaternion()


def set_pose(name):
    for pb in rig.pose.bones:
        pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
    P = rig.pose.bones; X = (1, 0, 0); Z = (0, 0, 1)
    if name == "walk":
        rot_world(P["mixamorig:LeftUpLeg"], X, -30); rot_world(P["mixamorig:LeftLeg"], X, 12)
        rot_world(P["mixamorig:RightUpLeg"], X, 22); rot_world(P["mixamorig:RightLeg"], X, 38)
        rot_world(P["mixamorig:LeftArm"], X, 20); rot_world(P["mixamorig:RightArm"], X, -20)
    elif name == "sit":
        for s in ("Left", "Right"):
            rot_world(P[f"mixamorig:{s}UpLeg"], X, -80); rot_world(P[f"mixamorig:{s}Leg"], X, 80)
        rot_world(P["mixamorig:Spine"], X, 6)
    elif name == "desfile":   # passarela: pernas cruzando, quadril girando, tronco contra-girando
        rot_world(P["mixamorig:Hips"], Z, 10); rot_world(P["mixamorig:Spine1"], Z, -12)
        rot_world(P["mixamorig:LeftUpLeg"], X, -24); rot_world(P["mixamorig:LeftUpLeg"], Z, 8)
        rot_world(P["mixamorig:RightUpLeg"], X, 16); rot_world(P["mixamorig:RightLeg"], X, 20)
        rot_world(P["mixamorig:LeftArm"], X, 25); rot_world(P["mixamorig:RightArm"], X, -25); rot_world(P["mixamorig:RightForeArm"], X, -35)
    bpy.context.view_layer.update()


def set_morphs(objs, m):
    for ob in objs:
        sk = ob.data.shape_keys
        if not sk: continue
        for kb in sk.key_blocks:
            if kb.name != 'Basis': kb.value = m.get(kb.name, 0.0)


res = {}
for gid in ids:
    before = set(bpy.data.objects)
    try: bpy.ops.import_scene.gltf(filepath=os.path.join(gdir, gid + ".glb"))
    except Exception as e:
        print("[pen] import failed", gid, e); continue
    new = [o for o in bpy.data.objects if o not in before]
    meshes = []
    for o in new:
        if o.type == 'MESH':
            o.parent = rig; o.matrix_parent_inverse = Matrix.Identity(4); o.matrix_world = Matrix.Identity(4)
            for m in o.modifiers:
                if m.type == 'ARMATURE': m.object = rig
            meshes.append(o)
    for o in new:
        if o.type != 'MESH': bpy.data.objects.remove(o, do_unlink=True)
    g = max(meshes, key=lambda o: len(o.data.vertices)); r = {}
    restco = np.array([tuple(v.co) for v in g.data.vertices]); restz = restco[:, 2]; restx = restco[:, 0]; resty = restco[:, 1]
    for (pose, morphs) in SC:
        set_pose(pose); set_morphs([body, g], morphs)
        dg = bpy.context.evaluated_depsgraph_get()
        be = body.evaluated_get(dg); bm = be.to_mesh()
        bm.calc_loop_triangles()
        V = [v.co.copy() for v in bm.vertices]; T = [tuple(t.vertices) for t in bm.loop_triangles]
        bv = BVHTree.FromPolygons(V, T)
        be.to_mesh_clear()
        ge = g.evaluated_get(dg); gm = ge.to_mesh()
        n = 0; worst = 0.0; tot = len(gm.vertices); pens = []
        for vi, v in enumerate(gm.vertices):
            if restz[vi] > 1.10: continue
            if os.environ.get('PENFILTER', '1') == '1' and ((restz[vi] > 1.03 and abs(restx[vi]) < 0.10 and resty[vi] < 0.0) or (0.70 < restz[vi] < 0.90 and abs(restx[vi]) < 0.03)): continue   # decote/colo e fenda do gluteo/virilha: cobertos pelo corpo
            loc, nrm, fi, dist = bv.find_nearest(v.co)
            if loc is None: continue
            sd = (v.co - loc).dot(nrm)
            if sd < 0.0005 and dist < 0.03:
                n += 1; worst = max(worst, 0.0005 - sd); pens.append((0.0005 - sd, vi))
        if os.environ.get('PENDETAIL') == pose + ('+m' if morphs else ''):
            pens.sort(reverse=True)
            print('[pen] DETAIL', gid, [(round(d*1000,1), tuple(np.round(g.data.vertices[vi].co, 2))) for d, vi in pens[:10]], flush=True)
        ge.to_mesh_clear()
        r[pose + ("+m" if morphs else "")] = (n, round(worst * 1000, 1))
    res[gid] = dict(tris=None, verts=tot, **{k: v for k, v in r.items()})
    print("[pen]", gid, tot, r, flush=True)
    for o in meshes: bpy.data.objects.remove(o, do_unlink=True)
    json.dump(res, open(outp, "w"), indent=1)
set_pose("rest")

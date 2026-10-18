"""Re-fit the shipped hair GLBs to the doll head/body and add the missing morph keys.
  blender -b --factory-startup -noaudio --python tools/blender/hair_fitbake.py -- [hair_chestnutWaves ...] [margin=0.003] [dry=1]

For every hair GLB (public/assets/characters/hair_*.glb):
  1. rest pose: hair vertices that sit INSIDE the doll head/neck (ray-parity test) are pushed out to the skin + margin,
     with the displacement smoothed over the mesh so strands keep their shape (scalp / ears / forehead clipping);
  2. morphs: the body shape keys that move the head/neck/shoulders/chest (faceThin, jawNarrow, chinPointed, cheekbonesHigh,
     bust*, butt*, hips, waist, thighs, weight*, shoulders) are transferred to the hair as hair shape keys of the same name
     (displacement of the nearest body surface point, smooth falloff with distance), so the hair follows the sliders
     exactly like the skin (the game applies the same MORPH_MAX influence to both);
  3. long hair: strands lateral to the shoulders also follow the shoulder bones a little, and the skull zone is Head-only
     (no Neck bleed into the scalp, so a head turn doesn't shear it);
  4. exports with the same exporter settings as prepare_hair.py (sparse morph accessors).
Run tools/blender/jewelry/hair_fit.py afterwards (re-measures hairFit.lift for hats/tiaras on the new meshes).
"""
import bpy, sys, os, time, math
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from mathutils.interpolate import poly_3d_calc

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
PUB = os.path.join(REPO, "public", "assets", "characters")
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OPT = dict(a.split("=", 1) for a in argv if "=" in a)
HAIRS = [a for a in argv if "=" not in a] or ["hair_meshy_updo", "hair_chestnutWaves", "hair_caramelCurls", "hair_platinumUndercut"]
MARGIN = float(OPT.get("margin", 0.003))
OUT = OPT.get("out", PUB)
os.makedirs(OUT, exist_ok=True)
SRC = OPT.get("src", PUB)   # where to read the hair GLBs from (default: in place); output always goes to PUB
# slider -> influence multiplier, same as src/game/character/morphConfig.ts MORPH_MAX
MORPH_MAX = {"lipsFull": 1.9, "lipsWide": 3.2, "noseSmall": 4.5, "noseNarrow": 4.5, "cheekbonesHigh": 1.2, "jawNarrow": 2.5, "chinPointed": 1.8, "faceThin": 2.2,
             "eyesBig": 2, "browLift": 3.8, "bustBig": 2.2, "bustSmall": 2, "buttBig": 2.2, "buttSmall": 2, "hipsWide": 2.2, "thighsThick": 1.8, "waistThin": 2.2,
             "weightUp": 1.9, "weightDown": 2, "shouldersNarrow": 2.2}
DRY = OPT.get("dry") == "1"
MMIN = float(OPT.get("mmin", 0))   # m: zera deltas de morph menores que isso no slider maximo (morphs esparsos = GLB menor)
SKIP_FACE_DETAIL = ("eyesBig", "noseSmall", "noseNarrow", "lipsFull", "lipsWide", "browLift")
FACE = ("faceThin", "jawNarrow", "chinPointed", "cheekbonesHigh") + SKIP_FACE_DETAIL


def log(*a):
    print("[hairfit]", *a, flush=True)


def arr(coll, attr, dim):
    a = np.empty(len(coll) * dim, np.float64)
    coll.foreach_get(attr, a)
    return a.reshape(len(coll), dim)


def world_co(o, shape=None):
    M = np.array(o.matrix_world)
    co = arr(o.data.vertices if shape is None else shape.data, 'co', 3)
    return co @ M[:3, :3].T + M[:3, 3]


def tris(me):
    me.calc_loop_triangles()
    t = np.empty(len(me.loop_triangles) * 3, np.int64)
    me.loop_triangles.foreach_get('vertices', t)
    return t.reshape(-1, 3)


def sstep(t):
    t = np.clip(t, 0, 1)
    return t * t * (3 - 2 * t)


def smooth_field(D, e, n, it):
    deg = np.zeros(n)
    np.add.at(deg, e[:, 0], 1)
    np.add.at(deg, e[:, 1], 1)
    for _ in range(it):
        acc = np.zeros_like(D)
        np.add.at(acc, e[:, 0], D[e[:, 1]])
        np.add.at(acc, e[:, 1], D[e[:, 0]])
        D = (D + acc / np.maximum(deg, 1)[:, None]) / 2.0
    return D


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(PUB, "doll_base.glb"))
body = bpy.data.objects["DollBody"]
for o in list(bpy.data.objects):
    if o.name.startswith("Icosphere"):
        bpy.data.objects.remove(o)
def lower_arms(rig, arm_deg=12.0, fore_in_deg=4.0, fore_fwd=0.28):
    """same pose as src/game/character/pose.ts (arms lowered), as in prepare_hair.py"""
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='POSE')

    def aim(pb, child, tgt):
        bpy.context.view_layer.update()
        d = (child.head - pb.head).normalized()
        q = d.rotation_difference(tgt.normalized())
        head = pb.head.copy()
        pb.matrix = Matrix.Translation(head) @ q.to_matrix().to_4x4() @ Matrix.Translation(-head) @ pb.matrix
        bpy.context.view_layer.update()

    a = math.radians(arm_deg)
    fi = math.radians(fore_in_deg)
    for side, sg in (("Left", 1), ("Right", -1)):
        arm = rig.pose.bones[f"mixamorig:{side}Arm"]
        fore = rig.pose.bones[f"mixamorig:{side}ForeArm"]
        hand = rig.pose.bones[f"mixamorig:{side}Hand"]
        aim(arm, fore, Vector((sg * math.sin(a), 0.02, -math.cos(a))))
        aim(fore, hand, Vector((sg * math.sin(a - fi), -fore_fwd, -0.94)))
    bpy.ops.object.mode_set(mode='OBJECT')


def eval_body():
    dg = bpy.context.evaluated_depsgraph_get()
    e = body.evaluated_get(dg)
    m = e.to_mesh()
    co = np.array([e.matrix_world @ v.co for v in m.vertices], np.float64)
    e.to_mesh_clear()
    return co


rig0 = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
kb = body.data.shape_keys.key_blocks
bkeys = [k for k in kb if k.name != "Basis"]
lower_arms(rig0)            # the game pose: hair must fit THIS body (and its morphs), not the A-pose
Btri = tris(body.data)
for k in bkeys:
    k.value = 0
bpy.context.view_layer.update()
Bco = eval_body()


def make_bvh(co):
    return BVHTree.FromPolygons([tuple(v) for v in co], [tuple(t) for t in Btri], all_triangles=True)


bvh = make_bvh(Bco)
BVH_KEY = {}
Bdelta = {}
for k in bkeys:
    if k.name in SKIP_FACE_DETAIL:
        continue
    M = MORPH_MAX.get(k.name, 1.0)
    k.value = M
    bpy.context.view_layer.update()
    cm = eval_body()
    k.value = 0
    Bdelta[k.name] = (cm - Bco) / M             # per unit influence (linear), as in the game
    BVH_KEY[k.name] = make_bvh(cm)
bpy.context.view_layer.update()
log("body keys", list(Bdelta))


def inside_b(bv_, p):
    votes = 0
    for d in (Vector((0, 0, 1)), Vector((1, 0, 0)), Vector((0, 1, 0))):
        n = 0
        o = Vector(p)
        for _ in range(14):
            r = bv_.ray_cast(o, d)
            if r[0] is None:
                break
            n += 1
            o = r[0] + d * 1e-4
        votes += n % 2
    return votes >= 2


def inside(p):
    return inside_b(bvh, p)


def process(hid):
    t0 = time.time()
    pre = set(bpy.data.objects.keys())
    path = os.path.join(OUT, hid + ".glb")
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, hid + ".glb"))
    new = [bpy.data.objects[n] for n in set(bpy.data.objects.keys()) - pre]
    hair = [o for o in new if o.type == 'MESH' and o.data.shape_keys][0]
    rig = [o for o in new if o.type == 'ARMATURE'][0]
    for o in new:
        if o.type == 'MESH' and o is not hair:
            bpy.data.objects.remove(o)
    me = hair.data
    n = len(me.vertices)
    P0 = world_co(hair)
    edges = np.array([tuple(e.vertices) for e in me.edges], np.int64)

    # ---------- 1. push out of the head ----------
    cand = np.where((P0[:, 2] > 0.85) & (np.abs(P0[:, 0]) < 0.35) & (np.abs(P0[:, 1]) < 0.25))[0]
    Dv = np.zeros((n, 3))
    moved = 0
    maxd = 0.0
    for i in cand:
        p = Vector(P0[i])
        r = bvh.find_nearest(p)
        if r[0] is None:
            continue
        nrm = np.array(r[1])
        s = (p - r[0]).dot(r[1])
        if inside(p):
            Dv[i] = nrm * (r[3] + MARGIN)
        elif s < MARGIN:
            Dv[i] = nrm * (MARGIN - s)
        else:
            continue
        moved += 1
        maxd = max(maxd, float(np.linalg.norm(Dv[i])))
    Ds = smooth_field(Dv, edges, n, 6) * 1.5
    hard = np.linalg.norm(Dv, axis=1) > 1e-9
    D = np.where(hard[:, None], Dv, Ds)
    P1 = P0 + D
    for ps in range(2):
        left = 0
        for i in cand:
            p = Vector(P1[i])
            r = bvh.find_nearest(p)
            if r[0] is None:
                continue
            if inside(p):
                P1[i] = np.array(r[0]) + np.array(r[1]) * MARGIN
                left += 1
        log(hid, "push pass", ps, "still inside:", left)
        if not left:
            break
    log(hid, "rest push: candidates", len(cand), "moved", moved, "max mm", round(maxd * 1000, 1))

    # ---------- 3. skin weights ----------
    Z = P1[:, 2]
    vg = {g.name: g for g in me.vertex_groups} if False else {g.name: g for g in hair.vertex_groups}
    names = ["mixamorig:Head", "mixamorig:Neck", "mixamorig:Spine2", "mixamorig:Spine1"]
    W0 = np.zeros((n, len(names)))
    gidx = {vg[nm].index: k for k, nm in enumerate(names) if nm in vg}
    for i, v in enumerate(me.vertices):
        for ge in v.groups:
            k = gidx.get(ge.group)
            if k is not None:
                W0[i, k] = ge.weight
    longhair = float(Z.min()) < 1.1
    if longhair and OPT.get("skinfix", "1") == "1":
        lat = np.abs(P1[:, 0])
        sh = 0.45 * sstep((lat - 0.07) / 0.09) * sstep((1.30 - Z) / 0.08) * sstep((Z - 0.98) / 0.10)
        for nm, sg in (("mixamorig:LeftShoulder", 1), ("mixamorig:RightShoulder", -1)):
            g = vg.get(nm) or hair.vertex_groups.new(name=nm)
            vg[nm] = g
            for i in np.where((sh > 0.02) & (np.sign(P1[:, 0]) == sg))[0]:
                w = float(sh[i])
                for k, gn in enumerate(names):
                    if gn in vg and W0[i, k] > 0:
                        vg[gn].add([int(i)], float(W0[i, k] * (1 - w)), 'REPLACE')
                g.add([int(i)], w, 'REPLACE')
        log(hid, "shoulder-follow verts", int((sh > 0.02).sum()))
    skull = np.where((Z > 1.40) & (np.abs(P1[:, 1]) < 0.2) & (W0[:, 0] > 0.5))[0]
    for i in skull:
        for k, gn in enumerate(names):
            if gn in vg:
                vg[gn].add([int(i)], 1.0 if k == 0 else 0.0, 'REPLACE')

    # ---------- 2. shape keys ----------
    M = np.array(hair.matrix_world)
    Minv = np.linalg.inv(M[:3, :3])
    zone = np.where((P1[:, 2] > 0.80) & (np.abs(P1[:, 0]) < 0.5))[0]
    info = {}
    for i in zone:
        p = Vector(P1[i])
        r = bvh.find_nearest(p)
        if r[0] is None:
            continue
        t = Btri[r[2]]
        bc = poly_3d_calc([Vector(Bco[t[0]]), Vector(Bco[t[1]]), Vector(Bco[t[2]])], r[0])
        s = (p - r[0]).dot(r[1])
        info[i] = (t, np.array(bc), max(0.0, s))
    log(hid, "transfer zone", len(zone), "mapped", len(info))
    for k in list(me.shape_keys.key_blocks)[::-1]:
        hair.shape_key_remove(k)
    loc = (P1 - M[:3, 3]) @ Minv.T
    me.vertices.foreach_set('co', loc.astype(np.float32).ravel())
    me.update()
    hair.shape_key_add(name="Basis", from_mix=False)
    for kn, Db in Bdelta.items():
        Mx = MORPH_MAX.get(kn, 1.0)
        Rr = 0.07 if kn in FACE else 0.16
        Pl = 0.0 if kn in FACE else 0.03          # body keys: hair within 3 cm of the skin moves 100% with it
        Dh = np.zeros((n, 3))
        for i, (t, bc, s_) in info.items():
            Dh[i] = (Db[t[0]] * bc[0] + Db[t[1]] * bc[1] + Db[t[2]] * bc[2]) * (1.0 - sstep((s_ - Pl) / max(Rr - Pl, 1e-3)))
        if np.abs(Dh).max() * Mx < 2e-4:
            continue
        Dh = smooth_field(Dh, edges, n, 2)
        # at the slider's full influence the hair must not end up inside the morphed body: push out, then store per unit
        kbvh = BVH_KEY[kn]
        Tm = P1 + Dh * Mx
        pushed = 0
        for i in info:
            p = Vector(Tm[i])
            r = kbvh.find_nearest(p, 0.05)
            if r[0] is None:
                continue
            if inside_b(kbvh, p) or (p - r[0]).dot(r[1]) < MARGIN:
                Tm[i] = np.array(r[0]) + np.array(r[1]) * MARGIN
                pushed += 1
        Dh = (Tm - P1) / Mx
        Dh = smooth_field(Dh, edges, n, 1)
        if MMIN > 0:
            Dh[np.linalg.norm(Dh, axis=1) * Mx < MMIN] = 0.0
        sk = hair.shape_key_add(name=kn, from_mix=False)
        sk.data.foreach_set('co', (loc + Dh @ Minv.T).astype(np.float32).ravel())
        sk.slider_min, sk.slider_max, sk.value = 0.0, 1.0, 0.0
        log(hid, "key", kn, "max mm/unit", round(float(np.abs(Dh).max()) * 1000, 2), "verts", int((np.abs(Dh).max(1) > 1e-4).sum()), "pushed at max", pushed)
    if DRY:
        return
    # ---------- 4. export ----------
    for o in bpy.data.objects:
        o.select_set(False)
    hair.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format='GLB', export_yup=True, export_apply=False,
                              export_image_format='AUTO', export_jpeg_quality=90, export_materials='EXPORT',
                              export_normals=True, export_skins=True, export_def_bones=False, export_animations=False,
                              export_morph=True, export_morph_normal=False, export_try_sparse_sk=True,
                              export_cameras=False, export_lights=False)
    log(hid, "exported", os.path.getsize(path) // 1024, "KB", f"{time.time() - t0:.0f}s")
    for o in (hair, rig):
        bpy.data.objects.remove(o, do_unlink=True)


for h in HAIRS:
    process(h)

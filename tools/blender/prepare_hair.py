"""Meshy hair GLB -> game-ready hair for the doll (reusable).
Usage:
  blender -b --factory-startup -noaudio --python prepare_hair.py -- <input.glb> <id> [stage ...] [key=value ...]
Stages (each loads the previous .cache/hair_<id>_N.blend):
  classify   copy source, import, strip the mannequin head/face, landmarks            -> hair_<id>_1.blend
  fit        scale/rotate/translate onto the doll head, push out of head/body          -> hair_<id>_2.blend
  decimate   decimate to ~HAIR_TRIS + re-unwrap                                        -> hair_<id>_3.blend
  bake       normal (tangent) + base colour + roughness from the high-poly             -> hair_<id>_4.blend
  skin       Head/Neck/Spine weights down the length + faceThin/jawNarrow shape keys   -> hair_<id>_5.blend
  export     public/assets/characters/hair_<id>.glb
  render     Blender previews on the doll (side/front/back)
  all        every stage above
Optional key=value overrides: tris=28000 tex=2048 scale=0.34 pitch=-20 dy=0 dz=0 (fit tweaks), skipclean=1.

Source handling. Meshy "hair on mannequin" exports are untextured white meshes (no UVs, no colours, 1-3M tris) holding a
smooth, sparsely tessellated mannequin face/head surrounded by dense hair ribbons. The mannequin is found by (a) local
triangle density (hair is 5-20x denser than the mannequin), (b) a flood fill from the chin through the sparse tris inside
the face ellipse, then (c) a height-field fit of the face front to throw away hair ribbons that touch the face. Parameters
are fractions of the model height so other Meshy hair-on-mannequin exports with the same template work unchanged; a
source that carries real colours/materials is classified by colour (grey/skin = head) when `COLOUR_CLASSIFY` finds some.

Doll reference: public/assets/characters/doll_base.glb (+ hair_meshy_updo.glb for crown height); no .cache dependency.
Deterministic (no random numbers).
"""
import bpy, bmesh, sys, os, math, time, json, shutil
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
CACHE = os.path.join(HERE, ".cache")
SRCDIR = os.path.join(HERE, "sources")
PUB = os.path.join(REPO, "public", "assets", "characters")
SHOTS = r"C:\Users\user\AppData\Local\Temp\claude\shots\hair"
for d in (CACHE, SRCDIR, SHOTS): os.makedirs(d, exist_ok=True)

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
if len(argv) < 2:
    raise SystemExit(__doc__)
INPUT, HID = argv[0], argv[1]
rest = argv[2:]
OPT = dict(a.split("=", 1) for a in rest if "=" in a)
stages = [a for a in rest if "=" not in a] or ["all"]
if stages == ["all"]:
    stages = ["classify", "fit", "decimate", "bake", "skin", "export", "render"]
TRIS = int(OPT.get("tris", 28000))
TEX = int(OPT.get("tex", 2048))


def blend(i): return os.path.join(CACHE, f"hair_{HID}_{i}.blend")
def log(*a): print(f"[hair:{HID}]", *a, flush=True)


def arr(coll, attr, dim, dtype=np.float64):
    a = np.empty(len(coll) * dim, dtype); coll.foreach_get(attr, a)
    return a.reshape(len(coll), dim) if dim > 1 else a


def getco(o): return arr(o.data.vertices, 'co', 3)


def setco(o, P):
    o.data.vertices.foreach_set('co', np.asarray(P, np.float32).ravel()); o.data.update()


def select_only(o):
    for x in bpy.context.selected_objects: x.select_set(False)
    o.select_set(True); bpy.context.view_layer.objects.active = o


def tri_arrays(me):
    me.calc_loop_triangles()
    nt = len(me.loop_triangles)
    tv = np.empty(nt * 3, np.int64); me.loop_triangles.foreach_get('vertices', tv)
    return tv.reshape(-1, 3)


def mesh_from_arrays(name, co, tris, uvc=None):
    """fast mesh build from numpy (vertices compacted to the ones used)"""
    used = np.unique(tris)
    remap = np.full(len(co), -1, np.int64); remap[used] = np.arange(len(used))
    t = remap[tris]
    me = bpy.data.meshes.new(name)
    me.vertices.add(len(used)); me.vertices.foreach_set('co', co[used].astype(np.float32).ravel())
    nf = len(t)
    me.loops.add(nf * 3); me.loops.foreach_set('vertex_index', t.ravel().astype(np.int32))
    me.polygons.add(nf)
    me.polygons.foreach_set('loop_start', np.arange(nf, dtype=np.int32) * 3)
    me.polygons.foreach_set('loop_total', np.full(nf, 3, np.int32))
    if uvc is not None:
        uvl = me.uv_layers.new(name="UVMap"); uvl.data.foreach_set('uv', np.asarray(uvc, np.float32).reshape(-1))
    me.update(calc_edges=True); me.validate(clean_customdata=False)
    return me


def edges_of(ob):
    e = np.empty(len(ob.data.edges) * 2, np.int32); ob.data.edges.foreach_get('vertices', e)
    return e.reshape(-1, 2)


def smooth_field(D, e, n, it=6):
    deg = np.zeros(n); np.add.at(deg, e[:, 0], 1); np.add.at(deg, e[:, 1], 1)
    for _ in range(it):
        acc = np.zeros_like(D); np.add.at(acc, e[:, 0], D[e[:, 1]]); np.add.at(acc, e[:, 1], D[e[:, 0]])
        D = (D + acc / np.maximum(deg, 1)[:, None]) / 2.0
    return D


def smooth_normals(ob):
    me = ob.data
    co = getco(ob); tv = tri_arrays(me)
    fn = np.cross(co[tv[:, 1]] - co[tv[:, 0]], co[tv[:, 2]] - co[tv[:, 0]])
    acc = np.zeros((len(co), 3))
    for k in range(3): np.add.at(acc, tv[:, k], fn)
    nrm = acc / np.maximum(np.linalg.norm(acc, axis=1), 1e-12)[:, None]
    for p in me.polygons: p.use_smooth = True
    me.normals_split_custom_set_from_vertices(nrm.tolist())


# ====================================================================== doll reference
def import_doll():
    """doll body (rest A-pose) + armature, Blender Z-up, faces -Y; returns (body, rig)"""
    bpy.ops.import_scene.gltf(filepath=os.path.join(PUB, "doll_base.glb"))
    body = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith("Doll")][-1]
    rig = body.parent if body.parent and body.parent.type == 'ARMATURE' else [o for o in bpy.data.objects if o.type == 'ARMATURE'][-1]
    return body, rig


def eval_world_co(ob):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me = ev.to_mesh()
    co = np.array([ev.matrix_world @ v.co for v in me.vertices], np.float64)
    tv = tri_arrays(me)
    ev.to_mesh_clear()
    return co, tv


def lower_arms(rig, arm_deg=12.0, fore_in_deg=4.0, fore_fwd=0.28):
    """pose the arms like src/game/character/pose.ts: upper arm ~12 deg from the body, forearm slightly in/forward.
    glTF +Z (front) = Blender -Y; the character's left = +X."""
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='POSE')

    def aim(pb, child, tgt):
        bpy.context.view_layer.update()
        d = (child.head - pb.head).normalized()
        q = d.rotation_difference(tgt.normalized())
        head = pb.head.copy()
        R4 = Matrix.Translation(head) @ q.to_matrix().to_4x4() @ Matrix.Translation(-head)
        pb.matrix = R4 @ pb.matrix
        bpy.context.view_layer.update()

    a = math.radians(arm_deg); fi = math.radians(fore_in_deg)
    for side, sg in (("Left", 1), ("Right", -1)):
        arm = rig.pose.bones[f"mixamorig:{side}Arm"]; fore = rig.pose.bones[f"mixamorig:{side}ForeArm"]
        hand = rig.pose.bones[f"mixamorig:{side}Hand"]
        aim(arm, fore, Vector((sg * math.sin(a), 0.02, -math.cos(a))))
        aim(fore, hand, Vector((sg * math.sin(a - fi), -fore_fwd, -0.94)))
    bpy.ops.object.mode_set(mode='OBJECT')


def make_bvh(co, tv):
    return BVHTree.FromPolygons([tuple(v) for v in co], [tuple(t) for t in tv], all_triangles=True)


def signed_dist(bvh, P, maxd=0.08):
    """signed distance (+ outside) and outward direction to the nearest surface for each point (inf when farther than maxd)"""
    n = len(P)
    d = np.full(n, np.inf); nrm = np.zeros((n, 3)); hit = np.zeros((n, 3))
    for i in range(n):
        r = bvh.find_nearest(Vector(P[i]), maxd)
        if r[0] is None: continue
        loc, nm = r[0], r[1]
        v = P[i] - np.array(loc)
        dist = r[3]
        sgn = 1.0 if (v[0] * nm[0] + v[1] * nm[1] + v[2] * nm[2]) >= 0 else -1.0
        d[i] = sgn * dist; nrm[i] = nm; hit[i] = loc
    return d, nrm, hit


def doll_landmarks(co):
    """chin / hairline of the doll face from the front profile (same landmark rules as rig_meshy.py landmarks_face)"""
    m = (co[:, 2] > 1.22) & (co[:, 2] < 1.42) & (np.abs(co[:, 0]) < 0.03) & (co[:, 1] < -0.06)
    i = np.where(m)[0][np.argmin(co[m, 1])]
    nose = co[i]
    def front_y(z):
        s = co[(np.abs(co[:, 2] - z) < 0.008) & (np.abs(co[:, 0]) < 0.02) & (co[:, 1] < 0.0)]
        return float(s[:, 1].min())
    chin_z = nose[2] - 0.095 + 0.0
    brow_z = nose[2] + 0.117
    return {"nose": nose.tolist(), "chin": [0.0, front_y(chin_z), chin_z], "brow": [0.0, front_y(brow_z), brow_z]}


# ====================================================================== classify
def stage_classify():
    t0 = time.time()
    dst = os.path.join(SRCDIR, f"hair_{HID}_src.glb")
    if os.path.abspath(INPUT) != os.path.abspath(dst) and os.path.exists(INPUT):
        shutil.copyfile(INPUT, dst)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=dst)
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    log("meshes", [(o.name, len(o.data.polygons)) for o in meshes])
    for o in bpy.data.objects: o.select_set(False)
    for o in meshes: o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1: bpy.ops.object.join()
    o = meshes[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    me = o.data
    co = getco(o); tv = tri_arrays(me); nt = len(tv)
    if OPT.get("half") in ("neg", "pos"):   # "generate" sheets hold two copies side by side along X (hair-only + hair on mannequin): keep one
        cx = co[tv].mean(1)[:, 0]; kt = cx < 0 if OPT["half"] == "neg" else cx > 0
        me = mesh_from_arrays("hair_half", co, tv[kt]); o2h = bpy.data.objects.new("hair_half", me); bpy.context.scene.collection.objects.link(o2h)
        bpy.data.objects.remove(o, do_unlink=True); o = o2h
        co = getco(o); co[:, 0] -= (co[:, 0].min() + co[:, 0].max()) / 2; setco(o, co)
        co = getco(o); tv = tri_arrays(me); nt = len(tv); log("half", OPT["half"], "tris", nt)
    H = co[:, 2].max() - co[:, 2].min()
    # source texture (color=source): per-corner UVs + the source material, carried through the mannequin strip
    SRC_COL = OPT.get("color") == "source"
    uvc = src_mat = None
    if SRC_COL:
        me.calc_loop_triangles()
        lt = np.empty(nt * 3, np.int64); me.loop_triangles.foreach_get('loops', lt)
        uvall = arr(me.uv_layers.active.data, 'uv', 2, np.float32)
        uvc = uvall[lt].reshape(nt, 3, 2)
        src_mat = me.materials[0] if len(me.materials) else None
        log("source material", [m.name for m in me.materials], "uv layers", [u.name for u in me.uv_layers])
    log("verts", len(co), "tris", nt, "bbox", co.min(0).round(3), co.max(0).round(3), "H", round(H, 3))

    # ---- colour classification when the source carries colours (grey/skin head vs coloured hair); Meshy "white" exports do not
    has_colour = bool(me.color_attributes) or any(m.node_tree and any(n.type == 'TEX_IMAGE' for n in m.node_tree.nodes) for m in me.materials if m)
    if has_colour:
        log("source has colours: colour classification is not implemented for this template yet -> using geometry only")

    # ---- geometry classification
    cen = co[tv].mean(1)
    P0, P1, P2 = co[tv[:, 0]], co[tv[:, 1]], co[tv[:, 2]]
    fn = np.cross(P1 - P0, P2 - P0); fn /= np.maximum(np.linalg.norm(fn, axis=1), 1e-20)[:, None]
    # local density: tri centroids per cell
    cs = float(OPT.get("cell", 0.0105 * H))
    g = np.floor((cen - cen.min(0)) / cs).astype(np.int64)
    key = (g[:, 0] * 4096 + g[:, 1]) * 4096 + g[:, 2]
    u, inv, cnt = np.unique(key, return_inverse=True, return_counts=True)
    dens = cnt[inv]
    # adjacency
    E = np.concatenate([tv[:, [0, 1]], tv[:, [1, 2]], tv[:, [2, 0]]]); E.sort(1)
    fid = np.tile(np.arange(nt), 3)
    ek = E[:, 0] * len(co) + E[:, 1]; od = np.argsort(ek, kind='stable'); ek = ek[od]; fe = fid[od]
    same = ek[1:] == ek[:-1]; a = fe[:-1][same]; b = fe[1:][same]
    ind = np.concatenate([a, b]); oth = np.concatenate([b, a]); o_ = np.argsort(ind, kind='stable'); ind = ind[o_]; oth = oth[o_]
    start = np.searchsorted(ind, np.arange(nt + 1))

    def grow(allowed, seed):
        vis = np.zeros(nt, bool); front = seed; vis[front] = True
        while len(front):
            c_ = start[front + 1] - start[front]
            idx = np.repeat(start[front], c_) + np.arange(c_.sum()) - np.repeat(np.cumsum(c_) - c_, c_)
            nb = np.unique(oth[idx]); nb = nb[~vis[nb] & allowed[nb]]; vis[nb] = True; front = nb
        return vis

    zmin, zmax = co[:, 2].min(), co[:, 2].max()
    NOM = OPT.get("nom") == "1"      # wig with no mannequin head (hollow cap): nothing to strip; landmarks from chin=y,z hl=y,z
    D = int(OPT.get("dens", 80))
    if NOM:
        mannequin = np.zeros(nt, bool)
        cy, cz = [float(v) for v in OPT.get("chin", "-0.28,0.38").split(",")]; hy, hz = [float(v) for v in OPT.get("hl", "-0.33,0.80").split(",")]
        lm = {"chin": [0.0, cy, cz], "hairline": [0.0, hy, hz], "H": float(H), "zmin": float(zmin), "zmax": float(zmax), "face_halfwidth": 0.1}
        json.dump(lm, open(os.path.join(CACHE, f"hair_{HID}_lm.json"), "w"))
    else:
        # face ellipse in model fractions (Meshy template): centre 27% of H above the chin-line origin; widths measured on the template
        fx, fz0, rz = 0.215 / 1.9 * H, zmin + (0.27 + 0.9517) / 1.9 * H, 0.37 / 1.9 * H
        ell = ((cen[:, 0] / fx) ** 2 + ((cen[:, 2] - fz0) / rz) ** 2 < 1)
        fwd = -cen[:, 1]                                   # forward = -Y
        zone = ell & (fwd > -0.12 / 1.9 * H)
        D = int(OPT.get("dens", 80))
        # seed: the lowest sparse tris near x=0 inside the zone
        cand = np.where(zone & (dens < D * 1.0) & (np.abs(cen[:, 0]) < 0.02 * H))[0]
        seed = cand[np.argsort(cen[cand, 2])[:5]]
        log("chin seed", cen[seed[0]].round(3), "density", dens[seed])
        man = grow((dens < D) & zone, seed)
        log("sparse flood tris", int(man.sum()))
        # ---- height-field refinement: the face front is a clean surface fwd = f(x, z); drop flood tris that are off it (hair ribbons)
        fr = man & (fwd > 0.03 / 1.9 * H)
        c = np.stack([cen[fr, 0], cen[fr, 2], fwd[fr]], 1)
        nrm = lambda x, z: (x / fx, (z - fz0) / rz)
        def basis(x, z, deg=5):
            xx, zz = nrm(x, z)
            return np.stack([xx ** i * zz ** j for i in range(deg + 1) for j in range(deg + 1 - i)], 1)
        sel = np.ones(len(c), bool)
        for _ in range(10):
            w = np.linalg.lstsq(basis(c[sel, 0], c[sel, 1]), c[sel, 2], rcond=None)[0]
            res = basis(c[:, 0], c[:, 1]) @ w - c[:, 2]
            s = np.abs(res[sel]).mean(); sel = np.abs(res) < max(0.0016 * H, 2.5 * s)
        allres = basis(cen[:, 0], cen[:, 2]) @ w - fwd
        on_face = (np.abs(allres) < 0.0032 * H) & (fwd > 0.03 / 1.9 * H) & ell
        mannequin = man & ((~(fwd > 0.03 / 1.9 * H)) | on_face)          # front must lie on the face surface; back/underside as flooded
        log("height-field inliers", round(float(sel.mean()), 3), "mannequin tris", int(mannequin.sum()))
        # landmarks of the mannequin face (chin / hairline / front) BEFORE deleting
        mv = np.unique(tv[mannequin])
        mc = co[mv]
        mid = mc[(np.abs(mc[:, 0]) < 0.02 * H)]
        chin = mid[np.argmin(mid[:, 2])]
        hairline = mid[np.argmax(mid[:, 2])]
        lm = {"chin": chin.tolist(), "hairline": hairline.tolist(), "H": float(H), "zmin": float(zmin), "zmax": float(zmax),
              "face_halfwidth": float(np.percentile(np.abs(mc[:, 0]), 98))}
        log("landmarks", {k: (np.round(v, 3).tolist() if isinstance(v, list) else round(v, 3)) for k, v in lm.items()})
        json.dump(lm, open(os.path.join(CACHE, f"hair_{HID}_lm.json"), "w"))

    # delete mannequin (+2 rings of neighbours so no sliver edge is left), then tiny loose parts
    dele = grow(np.ones(nt, bool), np.where(mannequin)[0]) if False else mannequin.copy()
    for _ in range(int(OPT.get("grow", 2))):
        nb = np.zeros(nt, bool)
        idx = np.where(dele)[0]
        c_ = start[idx + 1] - start[idx]
        ii = np.repeat(start[idx], c_) + np.arange(c_.sum()) - np.repeat(np.cumsum(c_) - c_, c_)
        nb[oth[ii]] = True
        # only grow into sparse tris (hair ribbons next to the face stay)
        dele |= nb & (dens < D * 1.6) & ~dele
    keep = ~dele
    me2 = mesh_from_arrays("hair_hi", co, tv[keep], uvc[keep] if SRC_COL else None)
    # loose parts smaller than 1500 tris (mannequin crumbs, stray hair bits)
    o2 = bpy.data.objects.new("hair_hi", me2); bpy.context.scene.collection.objects.link(o2)
    bpy.data.objects.remove(o, do_unlink=True)
    co2 = getco(o2); tv2 = tri_arrays(me2); nt2 = len(tv2)
    par = np.arange(len(co2))
    def find(x):
        while par[x] != x:
            par[x] = par[par[x]]; x = par[x]
        return x
    # vectorised union-find by label propagation
    lab = np.arange(len(co2))
    e2 = np.concatenate([tv2[:, [0, 1]], tv2[:, [1, 2]]])
    while True:
        mn = np.minimum(lab[e2[:, 0]], lab[e2[:, 1]])
        new = lab.copy(); np.minimum.at(new, e2[:, 0], mn); np.minimum.at(new, e2[:, 1], mn); new = new[new]
        if (new == lab).all(): break
        lab = new
    tl = lab[tv2[:, 0]]
    ids, cn = np.unique(tl, return_counts=True)
    small = ids[cn < int(OPT.get("minc", 1500))]
    log("components", len(ids), "small removed", len(small), "tris kept", int((~np.isin(tl, small)).sum()))
    kk = ~np.isin(tl, small)
    uv2 = None
    if SRC_COL:
        me2.calc_loop_triangles(); lt2 = np.empty(nt2 * 3, np.int64); me2.loop_triangles.foreach_get('loops', lt2)
        uv2 = arr(me2.uv_layers.active.data, 'uv', 2, np.float32)[lt2].reshape(nt2, 3, 2)[kk]
    me3 = mesh_from_arrays("hair_hi", co2, tv2[kk], uv2)
    if SRC_COL and src_mat: me3.materials.append(src_mat)
    o3 = bpy.data.objects.new("hair_hi", me3); bpy.context.scene.collection.objects.link(o3)
    bpy.data.objects.remove(o2, do_unlink=True)
    o3.name = "hair_hi"; o3.data.name = "hair_hi"
    bpy.ops.wm.save_as_mainfile(filepath=blend(1))
    log(f"classify done {time.time()-t0:.0f}s")


# ====================================================================== fit
def clear_pose(rig):
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='POSE')
    for pb in rig.pose.bones:
        pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
    bpy.ops.object.mode_set(mode='OBJECT'); bpy.context.view_layer.update()


def Rx(t):
    c, s_ = math.cos(t), math.sin(t)
    return np.array([[1, 0, 0], [0, c, -s_], [0, s_, c]])


def stage_fit():
    t0 = time.time()
    bpy.ops.wm.open_mainfile(filepath=blend(1))
    hair = bpy.data.objects["hair_hi"]
    lm = json.load(open(os.path.join(CACHE, f"hair_{HID}_lm.json")))
    hco = getco(hair)
    body, rig = import_doll()
    rest_co, _ = eval_world_co(body)
    dl = doll_landmarks(rest_co)
    log("doll landmarks", {k: np.round(v, 3).tolist() for k, v in dl.items()})
    lower_arms(rig)
    pose_co, tvb = eval_world_co(body)
    bvh = make_bvh(pose_co, tvb)

    # ---- gravity: principal axis of the long locks (below the head) in the Y-Z plane
    low = hco[hco[:, 2] < lm["zmin"] + 0.45 * lm["H"]]
    yz = low[:, 1:3] - low[:, 1:3].mean(0)
    w_, v_ = np.linalg.eigh(np.cov(yz.T)); ax = v_[:, 1]
    if ax[1] < 0: ax = -ax                                  # pointing up
    theta_g = math.atan2(ax[0], ax[1])                      # rotation about X that makes the locks vertical
    log("lock axis tilt deg", round(math.degrees(theta_g), 1))
    # doll targets
    chin_d = np.array(dl["chin"]); tz_hair = dl["brow"][2] + 0.01
    hair_d = np.array([0.0, dl["brow"][1], tz_hair])
    chin_m, hl_m = np.array(lm["chin"]), np.array(lm["hairline"])
    # cap = hair verts above the face hole (the skull covering), sub-sampled
    cap_m = (hco[:, 2] > hl_m[2] - 0.05 * lm["H"] * 1.0) & (np.abs(hco[:, 0]) < 0.28 * lm["H"] / 1.9) & (hco[:, 1] > hl_m[1] - 0.45)
    capi = np.where(cap_m)[0]; capi = capi[:: max(1, len(capi) // 5000)]
    cap = hco[capi]; log("cap verts", len(capi))

    def xform(P, x):
        s_, ty, tz, th = x
        return (P @ Rx(th).T) * s_ + np.array([0.0, ty, tz])

    def cost(x, detail=False):
        s_, ty, tz, th = x
        c1 = xform(chin_m[None], x)[0]; c2 = xform(hl_m[None], x)[0]
        L = np.sum((c1[1:] - chin_d[1:]) ** 2) + np.sum((c2[1:] - hair_d[1:]) ** 2)
        sd, _, _ = signed_dist(bvh, xform(cap, x), 0.12)
        sd = np.where(np.isfinite(sd), sd, 0.12)
        pen = np.mean(np.clip(0.004 - sd, 0, None) ** 2)
        gap = (np.percentile(sd, 10) - 0.008) ** 2
        tot = 3000 * L + 1e5 * pen + 1e4 * gap + 4.0 * (th - theta_g) ** 2 * 0.0 + 0.5 * (th - theta_g) ** 2
        if detail: return tot, dict(L=3000 * L, pen=1e5 * pen, gap=1e4 * gap, p10=float(np.percentile(sd, 10)), p50=float(np.percentile(sd, 50)))
        return tot

    fitf = os.path.join(CACHE, f"hair_{HID}_fit.json")
    s0 = float(OPT.get("scale", 0.43)); th0 = math.radians(float(OPT["pitch"])) if "pitch" in OPT else theta_g
    # initial translation: map the mannequin chin onto the doll chin
    t_init = chin_d - (np.array([0, chin_m[1], chin_m[2]]) @ Rx(th0).T) * s0
    x = np.array([s0, t_init[1], t_init[2], th0])
    step = np.array([0.04, 0.02, 0.02, math.radians(6)])
    best = cost(x) if not (os.path.exists(fitf) and OPT.get("refit") == "0") else 0.0
    for rnd in range(14 if OPT.get("refit") != "0" or not os.path.exists(fitf) else 0):
        improved = False
        for k in range(4):
            for sg in (1, -1):
                y = x.copy(); y[k] += sg * step[k]
                c = cost(y)
                if c < best - 1e-9: x, best, improved = y, c, True; break
        if not improved: step *= 0.5
    if OPT.get("refit") == "0" and os.path.exists(fitf):
        f_ = json.load(open(fitf)); x = np.array([f_["scale"], f_["ty"], f_["tz"], f_["pitch_rad"]])
    tot, det = cost(x, True)
    log("fit s=%.3f ty=%.3f tz=%.3f pitch=%.1fdeg cost=%.2f" % (x[0], x[1], x[2], math.degrees(x[3]), tot), {k: round(v, 4) for k, v in det.items()})
    s_, ty, tz, th = x
    if "dy" in OPT: ty += float(OPT["dy"])
    if "dz" in OPT: tz += float(OPT["dz"])
    P = xform(hco, [s_, ty, tz, th])
    json.dump({"scale": s_, "ty": ty, "tz": tz, "pitch_rad": th}, open(os.path.join(CACHE, f"hair_{HID}_fit.json"), "w"))

    # ---- long locks: bulk-shift the part below the head backwards and in a little, so the mass hangs behind the shoulders/arms
    # instead of being squashed onto them by the push-out (a shell around the arms = 'sleeves')
    SHIFT, XS = float(OPT.get("shift", 0.045)), float(OPT.get("xs", 0.08))
    wz = (1.42 - P[:, 2]) / 0.17; wz = np.clip(wz, 0, 1); wz = wz * wz * (3 - 2 * wz)
    P[:, 1] += wz * SHIFT; P[:, 0] *= 1 - wz * XS
    # ---- strip=<m>: the source still carries its mannequin head -> drop every tri whose 3 verts lie inside / within <m> of the doll head
    if "strip" in OPT:
        SM = float(OPT["strip"]); tvh = tri_arrays(hair.data)
        sd0, _, _ = signed_dist(bvh, P, 0.15); sd0 = np.where(np.isfinite(sd0), sd0, 1.0)
        kp = ~(sd0[tvh] < SM).all(1)
        me_n = mesh_from_arrays("hair_hi", P, tvh[kp]); hair_n = bpy.data.objects.new("hair_hi", me_n); bpy.context.scene.collection.objects.link(hair_n)
        log("strip", SM, "tris", len(tvh), "->", int(kp.sum()))
        bpy.data.objects.remove(hair, do_unlink=True); hair = hair_n
        P = getco(hair)
    # ---- push out of the doll (arms lowered): margin + smooth falloff, 2 passes
    MARGIN = float(OPT.get("margin", 0.005))
    e = edges_of(hair)
    n = len(P)
    box = (P[:, 2] > 0.6) & (P[:, 2] < 1.75) & (np.abs(P[:, 0]) < 0.55)
    idx = np.where(box)[0]
    for ps in range(int(OPT.get('passes', 3))):
        sd, nrm, hit = signed_dist(bvh, P[idx], 0.06)
        bad = np.isfinite(sd) & (sd < MARGIN)
        log(f"push pass {ps}: candidates {len(idx)} inside/too close {int(bad.sum())} (inside {int((np.isfinite(sd) & (sd < 0)).sum())}) max pen {(-sd[np.isfinite(sd)]).max()*1000:.1f} mm")
        if not bad.any(): break
        Dv = np.zeros((n, 3))
        Dv[idx[bad]] = nrm[bad] * (MARGIN - sd[bad])[:, None]
        if ps < 2:
            Dv = smooth_field(Dv, e, n, 8) * 1.6                 # smooth falloff into the surrounding hair
            P = P + Dv
        else:
            P = P + Dv                                           # last pass: hard clamp what is left
    sd, _, _ = signed_dist(bvh, P[idx], 0.06)
    log("after push: inside", int((np.isfinite(sd) & (sd < 0)).sum()), "closer than margin", int((np.isfinite(sd) & (sd < MARGIN * 0.6)).sum()))
    setco(hair, P)
    clear_pose(rig)
    smooth_normals(hair)
    hair.name = "hair_hi"
    bpy.ops.wm.save_as_mainfile(filepath=blend(2))
    log(f"fit done {time.time()-t0:.0f}s; hair bbox", P.min(0).round(3), P.max(0).round(3))


# ====================================================================== decimate + unwrap
def stage_decimate():
    t0 = time.time()
    bpy.ops.wm.open_mainfile(filepath=blend(2))
    for o in list(bpy.data.objects):
        if o.name != "hair_hi": bpy.data.objects.remove(o, do_unlink=True)
    hi = bpy.data.objects["hair_hi"]
    lo = hi.copy(); lo.data = hi.data.copy(); lo.name = "hair_lo"; lo.data.name = "hair_lo"
    bpy.context.scene.collection.objects.link(lo)
    select_only(lo)
    bm = bmesh.new(); bm.from_mesh(lo.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bm.to_mesh(lo.data); bm.free()
    # The ribbon soup tears when collapse-decimated straight to 28k (holes, grey gaps). Voxel-remesh first: a watertight
    # solid with the wave silhouette (strand detail comes back through the normal map), then collapse that.
    vox = float(OPT.get("voxel", 0.0035))
    if vox > 0:
        sd = lo.modifiers.new("sol", 'SOLIDIFY'); sd.thickness = float(OPT.get("solid", 0.006)); sd.offset = 0.0; sd.use_even_offset = True
        bpy.ops.object.modifier_apply(modifier="sol")
        m = lo.modifiers.new("rm", 'REMESH'); m.mode = 'VOXEL'; m.voxel_size = vox; m.adaptivity = 0.0
        bpy.ops.object.modifier_apply(modifier="rm")
        log("voxel remesh", vox, "->", len(lo.data.polygons), "tris", f"{time.time()-t0:.0f}s")
    # collapse in steps, bisecting to the target on the small mesh
    for tgt, bis in ((350000, False), (TRIS * 3, False), (TRIS, True)):
        n_now = len(lo.data.polygons)
        m = lo.modifiers.new("dec", 'DECIMATE'); m.decimate_type = 'COLLAPSE'; m.use_collapse_triangulate = True
        m.ratio = min(1.0, tgt / n_now)
        if bis:
            lo_r, hi_r = 0.001, 1.0
            for _ in range(6):
                n_ev = len(lo.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh().polygons)
                if abs(n_ev - tgt) < 0.03 * tgt: break
                if n_ev > tgt: hi_r = m.ratio
                else: lo_r = m.ratio
                m.ratio = (lo_r + hi_r) / 2
        bpy.ops.object.modifier_apply(modifier="dec")
        log("decimate", n_now, "->", len(lo.data.polygons), f"{time.time()-t0:.0f}s")
    smooth_normals(lo)
    lo.data.uv_layers.new(name="UVMap")
    select_only(lo)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(float(OPT.get("uvangle", 89))), island_margin=float(OPT.get("uvmargin", 0.002)), area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.uv.select_all(action='SELECT')
    bpy.ops.uv.pack_islands(rotate=True, margin=0.003)
    bpy.ops.object.mode_set(mode='OBJECT')
    uv = arr(lo.data.uv_layers[0].uv, 'vector', 2, np.float32)
    log("uv bounds", uv.min(0), uv.max(0), "tris", len(lo.data.polygons))
    hi.hide_viewport = True
    bpy.ops.wm.save_as_mainfile(filepath=blend(3))
    log(f"decimate done {time.time()-t0:.0f}s")


# ====================================================================== lowpoly (replaces decimate+bake for small untextured sources)
def stage_lowpoly():
    t0 = time.time()
    bpy.ops.wm.open_mainfile(filepath=blend(2))
    for o in list(bpy.data.objects):
        if o.name != "hair_hi": bpy.data.objects.remove(o, do_unlink=True)
    lo = bpy.data.objects["hair_hi"]; lo.name = "hair_lo"; lo.data.name = "hair_lo"
    smooth_normals(lo)
    mat = bpy.data.materials.new(f"hair_{HID}"); mat.use_nodes = True
    bs = mat.node_tree.nodes['Principled BSDF']; bs.inputs['Roughness'].default_value = 0.4
    lo.data.materials.clear(); lo.data.materials.append(mat)
    json.dump({"meanColorHex": OPT.get("hex", "#c8c8c8"), "meanLuminanceLinear": 1.0, "coverage": 1.0}, open(os.path.join(CACHE, f"hair_{HID}_tex.json"), "w"))
    bpy.ops.wm.save_as_mainfile(filepath=blend(4))
    log(f"lowpoly done {time.time()-t0:.0f}s tris", len(lo.data.polygons))


# ====================================================================== bake
def stage_bake():
    t0 = time.time()
    bpy.ops.wm.open_mainfile(filepath=blend(3))
    sc = bpy.context.scene
    hi, lo = bpy.data.objects["hair_hi"], bpy.data.objects["hair_lo"]
    hi.hide_viewport = False
    # ---- procedural chestnut on the (untextured) high-poly: root->tip gradient, vertical strand streaks, ambient occlusion
    mh = bpy.data.materials.new("hi_chestnut"); mh.use_nodes = True
    nt = mh.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); bs = nt.nodes.new('ShaderNodeBsdfPrincipled'); nt.links.new(bs.outputs[0], out.inputs[0])
    tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (70, 70, 5)
    nt.links.new(tc.outputs['Object'], mp.inputs[0])
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 1.0; nz.inputs['Detail'].default_value = 4; nz.inputs['Roughness'].default_value = 0.6
    nt.links.new(mp.outputs[0], nz.inputs['Vector'])
    sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
    zmax = float(OPT.get("ztop", 1.62)); zmin = float(OPT.get("ztip", 0.80))
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = zmax; mr.inputs['From Max'].default_value = zmin
    nt.links.new(sep.outputs['Z'], mr.inputs['Value'])
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (0.06, 0.027, 0.014, 1); ramp.color_ramp.elements[1].color = (0.14, 0.068, 0.034, 1)
    e2 = ramp.color_ramp.elements.new(0.45); e2.color = (0.09, 0.043, 0.022, 1)
    nt.links.new(mr.outputs[0], ramp.inputs[0])
    streak = nt.nodes.new('ShaderNodeMapRange'); streak.inputs['From Min'].default_value = 0.25; streak.inputs['From Max'].default_value = 0.75
    streak.inputs['To Min'].default_value = 0.72; streak.inputs['To Max'].default_value = 1.18; streak.clamp = True
    nt.links.new(nz.outputs['Fac'], streak.inputs['Value'])
    ao = nt.nodes.new('ShaderNodeAmbientOcclusion'); ao.inputs['Distance'].default_value = 0.025; ao.samples = 12
    sc_ = nt.nodes.new('ShaderNodeMix'); sc_.data_type = 'RGBA'; sc_.blend_type = 'MULTIPLY'; sc_.inputs['Factor'].default_value = 1.0
    nt.links.new(ramp.outputs[0], sc_.inputs[6])
    sk_c = nt.nodes.new('ShaderNodeCombineColor')
    for k in range(3): nt.links.new(streak.outputs[0], sk_c.inputs[k])
    nt.links.new(sk_c.outputs[0], sc_.inputs[7])
    ao_c = nt.nodes.new('ShaderNodeCombineColor')
    for k in range(3): nt.links.new(ao.outputs['AO'], ao_c.inputs[k])
    mx1 = nt.nodes.new('ShaderNodeMix'); mx1.data_type = 'RGBA'; mx1.blend_type = 'MULTIPLY'; mx1.inputs['Factor'].default_value = 0.9
    nt.links.new(sc_.outputs[2], mx1.inputs[6]); nt.links.new(ao_c.outputs[0], mx1.inputs[7])
    nt.links.new(mx1.outputs[2], bs.inputs['Base Color'])
    bs.inputs['Roughness'].default_value = 0.5
    if OPT.get("color") != "source": hi.data.materials.clear(); hi.data.materials.append(mh)

    def bake_pass(kind, name, cs, samples, color_only=False, margin=16):
        img = bpy.data.images.new(name, TEX, TEX, alpha=False)
        img.colorspace_settings.name = cs
        m = bpy.data.materials.new("bk_" + name); m.use_nodes = True
        nd = m.node_tree.nodes.new('ShaderNodeTexImage'); nd.image = img; m.node_tree.nodes.active = nd
        lo.data.materials.clear(); lo.data.materials.append(m)
        sc.cycles.samples = samples
        b = sc.render.bake
        b.use_selected_to_active = True; b.cage_extrusion = float(OPT.get("cage", 0.004)); b.max_ray_distance = float(OPT.get("ray", 0.03))
        b.margin = margin; b.margin_type = 'EXTEND'; b.target = 'IMAGE_TEXTURES'; b.use_clear = True; b.normal_space = 'TANGENT'
        if color_only:
            b.use_pass_direct = False; b.use_pass_indirect = False; b.use_pass_color = True
        for o_ in bpy.context.selected_objects: o_.select_set(False)
        hi.select_set(True); lo.select_set(True); bpy.context.view_layer.objects.active = lo
        t = time.time(); bpy.ops.object.bake(type=kind)
        q = np.empty(TEX * TEX * 4, np.float32); img.pixels.foreach_get(q)
        log(f"bake {kind} {time.time()-t:.0f}s mean {q.reshape(-1,4)[:, :3].mean(0).round(3)}")
        return img

    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.use_denoising = False
    nimg = bake_pass('NORMAL', "hair_normal", 'Non-Color', 1)
    cimg = bake_pass('DIFFUSE', "hair_basecolor", 'sRGB', int(OPT.get("samples", 24)), True)
    # ---- stats of the colour map: mean colour (default hair colour) + linear mean luminance (recolour reference)
    px = np.empty(TEX * TEX * 4, np.float32); cimg.pixels.foreach_get(px); px = px.reshape(-1, 4)[:, :3]
    cov = px.sum(1) > 1e-4
    lin = px[cov]
    lum = lin @ np.array([0.2126, 0.7152, 0.0722])
    mean_lin = lin.mean(0)
    # uncovered texels (outside every UV island and its bake margin) -> mean colour / flat normal, so mip-mapping never bleeds black
    fill = np.empty((len(px), 4), np.float32); fill[:] = (*mean_lin, 1.0)
    cpx = np.empty(TEX * TEX * 4, np.float32); cimg.pixels.foreach_get(cpx); cpx = cpx.reshape(-1, 4)
    cpx[~cov] = fill[~cov]; cimg.pixels.foreach_set(cpx.ravel())
    npx = np.empty(TEX * TEX * 4, np.float32); nimg.pixels.foreach_get(npx); npx = npx.reshape(-1, 4)
    npx[~cov] = (0.5, 0.5, 1.0, 1.0); nimg.pixels.foreach_set(npx.ravel())
    def to_srgb(c):
        c = np.clip(c, 0, 1); return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)
    hexcol = "#%02x%02x%02x" % tuple(int(round(v * 255)) for v in to_srgb(mean_lin))
    stats = {"meanColorHex": hexcol, "meanLuminanceLinear": float(lum.mean()), "lumP5": float(np.percentile(lum, 5)), "lumP95": float(np.percentile(lum, 95)), "coverage": float(cov.mean())}
    log("colour map", stats)
    json.dump(stats, open(os.path.join(CACHE, f"hair_{HID}_tex.json"), "w"))
    for img, fn, ff in ((nimg, "normal", 'PNG'), (cimg, "basecolor", 'JPEG')):
        img.filepath_raw = os.path.join(CACHE, f"hair_{HID}_{fn}.{'png' if ff == 'PNG' else 'jpg'}"); img.file_format = ff
        if ff == 'JPEG': bpy.context.scene.render.image_settings.quality = 92
        img.save(); img.pack()
    # ---- final material on the low-poly
    mat = bpy.data.materials.new(f"hair_{HID}"); mat.use_nodes = True
    n2 = mat.node_tree; n2.nodes.clear()
    o2 = n2.nodes.new('ShaderNodeOutputMaterial'); b2 = n2.nodes.new('ShaderNodeBsdfPrincipled'); n2.links.new(b2.outputs[0], o2.inputs[0])
    tcn = n2.nodes.new('ShaderNodeTexImage'); tcn.image = cimg; n2.links.new(tcn.outputs[0], b2.inputs['Base Color'])
    tnn = n2.nodes.new('ShaderNodeTexImage'); tnn.image = nimg; nm = n2.nodes.new('ShaderNodeNormalMap')
    n2.links.new(tnn.outputs[0], nm.inputs['Color']); n2.links.new(nm.outputs[0], b2.inputs['Normal'])
    b2.inputs['Roughness'].default_value = 0.4; b2.inputs['Metallic'].default_value = 0.0
    lo.data.materials.clear(); lo.data.materials.append(mat)
    bpy.data.objects.remove(hi, do_unlink=True)
    bpy.ops.wm.save_as_mainfile(filepath=blend(4))
    log(f"bake done {time.time()-t0:.0f}s")


# ====================================================================== skin + shape keys
CHAIN = [(1.29, "mixamorig:Head"), (1.19, "mixamorig:Neck"), (1.12, "mixamorig:Spine2"), (1.02, "mixamorig:Spine1")]


def stage_skin():
    t0 = time.time()
    bpy.ops.wm.open_mainfile(filepath=blend(4))
    lo = bpy.data.objects["hair_lo"]
    body, rig = import_doll()
    rest_co, _ = eval_world_co(body)
    dl = doll_landmarks(rest_co)
    for c in list(rig.children):
        if c.type == 'MESH': bpy.data.objects.remove(c, do_unlink=True)
    co = getco(lo); n = len(co); z = co[:, 2]
    # weights: Head above 1.29, then blend down the length Neck -> Spine2 -> Spine1 (smoothstep between chain knots)
    names = [c[1] for c in CHAIN]
    zs = np.array([c[0] for c in CHAIN])
    W = np.zeros((n, len(names)))
    for i in range(n):
        zi = z[i]
        if zi >= zs[0]: W[i, 0] = 1
        elif zi <= zs[-1]: W[i, -1] = 1
        else:
            k = int(np.searchsorted(-zs, -zi, side='right')) - 1
            f = (zs[k] - zi) / (zs[k] - zs[k + 1]); f = f * f * (3 - 2 * f)
            W[i, k] = 1 - f; W[i, k + 1] = f
    for nm in names: lo.vertex_groups.new(name=nm)
    for k, nm in enumerate(names):
        vg = lo.vertex_groups[nm]
        for i in np.where(W[:, k] > 1e-3)[0]: vg.add([int(i)], float(W[i, k]), 'REPLACE')
    lo.parent = rig; lo.parent_type = 'OBJECT'
    m = lo.modifiers.new("Armature", 'ARMATURE'); m.object = rig
    log("weights: head", int((W[:, 0] > 0.99).sum()), "neck-blend", int(((W[:, 0] < 0.99) & (W[:, 1] > 0)).sum()), "spine2", int((W[:, 2] > 0).sum()), "spine1", int((W[:, 3] > 0).sum()))
    # shape keys: same positional functions as rig_meshy.py compute_morphs (faceThin / jawNarrow), head zone only
    nose = dl["nose"]; lz = nose[2] - 0.052; cz = nose[2] - 0.095
    def sstep(t):
        t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)
    X, Z = co[:, 0], co[:, 2]
    zero = np.zeros(n)
    jaw = np.stack([-X * 0.12 * sstep((lz + 0.045 - Z) / 0.07), zero, zero], 1)
    thin = np.stack([-X * 0.07 * sstep((Z - (cz - 0.01)) / 0.05), zero, zero], 1)
    zone = (Z > cz - 0.03)[:, None]
    lo.shape_key_add(name="Basis", from_mix=False)
    for nm, D in (("faceThin", thin * zone), ("jawNarrow", jaw * zone)):
        sk = lo.shape_key_add(name=nm, from_mix=False)
        sk.data.foreach_set('co', (co + D).astype(np.float32).ravel())
        sk.slider_min = 0.0; sk.slider_max = 1.0; sk.value = 0.0
        log(nm, "max |delta| mm", round(float(np.abs(D).max()) * 1000, 2))
    bpy.ops.wm.save_as_mainfile(filepath=blend(5))
    log(f"skin done {time.time()-t0:.0f}s")


# ====================================================================== export
def glb_json(path):
    import struct
    d = open(path, 'rb').read()
    l = struct.unpack('<I', d[12:16])[0]
    return json.loads(d[20:20 + l]), d, 20 + l + 8


def ibm_by_name(path):
    j, d, off = glb_json(path)
    sk = j["skins"][0]; acc = j["accessors"][sk["inverseBindMatrices"]]; bv = j["bufferViews"][acc["bufferView"]]
    start = off + bv.get("byteOffset", 0) + acc.get("byteOffset", 0)
    M = np.frombuffer(d, dtype=np.float32, count=acc["count"] * 16, offset=start).reshape(-1, 4, 4)
    return {j["nodes"][ni]["name"]: M[k] for k, ni in enumerate(sk["joints"])}


def stage_export():
    t0 = time.time()
    bpy.ops.wm.open_mainfile(filepath=blend(5))
    lo = bpy.data.objects["hair_lo"]
    rig = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
    lo.name = f"Hair_{HID}"
    for o in bpy.data.objects: o.select_set(False)
    lo.select_set(True); rig.select_set(True); bpy.context.view_layer.objects.active = rig
    path = os.path.join(PUB, f"hair_{HID}.glb")
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format='GLB', export_yup=True, export_apply=False,
                              export_image_format='AUTO', export_jpeg_quality=90, export_materials='EXPORT',
                              export_normals=True, export_skins=True, export_def_bones=False, export_animations=False,
                              export_morph=True, export_morph_normal=False, export_try_sparse_sk=True,
                              export_cameras=False, export_lights=False)
    size = os.path.getsize(path)
    log(os.path.basename(path), size // 1024, "KB", len(lo.data.polygons), "tris")
    # the hair's inverse-bind matrices must equal the doll body's (same skeleton), else it rotates wrongly when bones move
    try:
        a = ibm_by_name(os.path.join(PUB, "doll_base.glb")); b = ibm_by_name(path)
        worst = max(float(np.abs(a[k] - b[k]).max()) for k in b if k in a)
        log("inverse-bind-matrix max diff vs doll_base.glb:", worst, "bones compared:", len([k for k in b if k in a]))
    except Exception as e:
        log("IBM check failed", e)
    tex = json.load(open(os.path.join(CACHE, f"hair_{HID}_tex.json")))
    meta = {"id": HID, "file": os.path.basename(path), "triangles": len(lo.data.polygons), "sizeBytes": size, "texture": TEX, **tex}
    json.dump(meta, open(os.path.join(CACHE, f"hair_{HID}_export.json"), "w"), indent=2)
    log("export meta", meta)


# ====================================================================== render previews
def stage_render(src=None, tag="R"):
    """Blender previews of the hair on the doll (arms lowered like the game); `src` = which cached blend (default: latest)"""
    n = src
    if n is None:
        n = max(i for i in range(1, 6) if os.path.exists(blend(i)))
    bpy.ops.wm.open_mainfile(filepath=blend(n))
    rig = [o for o in bpy.data.objects if o.type == 'ARMATURE']
    rig = [r for r in rig if r.name.startswith("Armature") and any(c.type == 'MESH' and c.name.startswith("Doll") for c in r.children)]
    if rig and os.environ.get("NOPOSE") != "1": lower_arms(rig[0])
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE'
    sc.render.resolution_x, sc.render.resolution_y = 700, 900
    sc.view_settings.view_transform = 'AgX'
    w = bpy.data.worlds.new("W"); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs[0].default_value = (0.6, 0.6, 0.62, 1)
    cd = bpy.data.cameras.new("c"); cam = bpy.data.objects.new("c", cd); sc.collection.objects.link(cam); sc.camera = cam
    ct = bpy.data.objects.new("t", None); sc.collection.objects.link(ct)
    tc = cam.constraints.new('TRACK_TO'); tc.target = ct; tc.track_axis = 'TRACK_NEGATIVE_Z'; tc.up_axis = 'UP_Y'
    for nm, off, e in (('k', (1.5, 1, .5), 400), ('f', (-2, .3, 0), 150), ('r', (0, 2, 2), 200)):
        d = bpy.data.lights.new(nm, 'AREA'); d.energy = e; d.size = 3
        o = bpy.data.objects.new(nm, d); sc.collection.objects.link(o); o.parent = cam; o.location = off
    def shot(name, az, focus, dist, lens=50):
        cd.lens = lens; ct.location = focus; r = math.radians(az)
        cam.location = (focus[0] + dist * math.sin(r), focus[1] - dist * math.cos(r), focus[2] + dist * 0.02)
        bpy.context.view_layer.update(); sc.render.filepath = os.path.join(SHOTS, f"{HID}_{tag}_{name}.png"); bpy.ops.render.render(write_still=True)
    for nm, az, fz, dist in (("full_front", 0, 1.0, 3.4), ("full_side", 90, 1.0, 3.4), ("full_back", 180, 1.0, 3.4), ("bust_34", 40, 1.2, 1.7), ("bust_back34", 140, 1.2, 1.7), ("bust_side", 90, 1.2, 1.7), ("face", 0, 1.38, 0.9)):
        shot(nm, az, (0, 0, fz), dist)
    log("renders ->", SHOTS)


STAGE = {"classify": stage_classify, "fit": stage_fit, "decimate": stage_decimate, "bake": stage_bake, "lowpoly": stage_lowpoly, "skin": stage_skin, "export": stage_export, "render": stage_render}
for st in stages:
    STAGE[st]()

"""Milestone B: rig + morph sliders for the Meshy doll.
Usage: blender -b --factory-startup -noaudio --python rig_meshy.py -- <stage ...>
Stages (each loads the previous .cache/meshyB_N.blend):
  fixes   head clean-up, smooth skull, hair re-bake                (meshyA_3 -> meshyB_1)
  rig     armature from doll geometry + weights                     (-> meshyB_2)
  repose  neutral rest pose baked into the mesh                     (-> meshyB_3)
  morphs  shape keys                                                (-> meshyB_4)
  export  GLBs + json
  render  deformation tests
"""
import bpy, bmesh, sys, os, math, time, json
import numpy as np
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, ".cache")
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
PUB = os.path.join(REPO, "public", "assets", "characters")
SHOTS = r"C:\Users\user\AppData\Local\Temp\claude\shots\meshyB"
os.makedirs(SHOTS, exist_ok=True); os.makedirs(PUB, exist_ok=True)
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def blendB(i): return os.path.join(CACHE, f"meshyB_{i}.blend")
def log(*a): print("[meshyB]", *a, flush=True)


def arr(coll, attr, dim, dtype=np.float64):
    a = np.empty(len(coll) * dim, dtype); coll.foreach_get(attr, a)
    return a.reshape(len(coll), dim) if dim > 1 else a


def getco(o): return arr(o.data.vertices, 'co', 3)


def setco(o, P):
    o.data.vertices.foreach_set('co', np.asarray(P, np.float32).ravel()); o.data.update()


def select_only(o):
    for x in bpy.context.selected_objects: x.select_set(False)
    o.select_set(True); bpy.context.view_layer.objects.active = o


def smooth_normals(ob):
    me = ob.data
    me.calc_loop_triangles()
    co = arr(me.vertices, 'co', 3)
    nt = len(me.loop_triangles)
    tv = np.empty(nt * 3, np.int32); me.loop_triangles.foreach_get('vertices', tv); tv = tv.reshape(-1, 3)
    fn = np.cross(co[tv[:, 1]] - co[tv[:, 0]], co[tv[:, 2]] - co[tv[:, 0]])
    acc = np.zeros((len(co), 3))
    for k in range(3): np.add.at(acc, tv[:, k], fn)
    nrm = acc / np.maximum(np.linalg.norm(acc, axis=1), 1e-12)[:, None]
    for p in me.polygons: p.use_smooth = True
    me.normals_split_custom_set_from_vertices(nrm.tolist())


CREASE_DEG = 28
# ====================================================================== FIXES
def tri_colors(me, img):
    W, H = img.size
    px = np.empty(W * H * 4, np.float32); img.pixels.foreach_get(px); px = px.reshape(H, W, 4)
    me.calc_loop_triangles()
    nt = len(me.loop_triangles)
    tv = np.empty(nt * 3, np.int32); me.loop_triangles.foreach_get('vertices', tv); tv = tv.reshape(-1, 3)
    tl = np.empty(nt * 3, np.int32); me.loop_triangles.foreach_get('loops', tl); tl = tl.reshape(-1, 3)
    tp = np.empty(nt, np.int32); me.loop_triangles.foreach_get('polygon_index', tp)
    uv = arr(me.uv_layers[0].uv, 'vector', 2, np.float32)
    tuv = uv[tl].mean(1)
    ix = np.clip((tuv[:, 0] * W).astype(int), 0, W - 1); iy = np.clip((tuv[:, 1] * H).astype(int), 0, H - 1)
    return tv, tp, px[iy, ix, :3], tl, uv


def boundary_loops(bm):
    be = [e for e in bm.edges if e.is_boundary]
    adj = {}
    for e in be:
        a, b = e.verts; adj.setdefault(a.index, []).append(b.index); adj.setdefault(b.index, []).append(a.index)
    seen = set(); loops = []
    for s in list(adj):
        if s in seen: continue
        order = [s]; seen.add(s); cur = s
        while True:
            c = [n for n in adj[cur] if n not in seen]
            if not c: break
            cur = c[0]; seen.add(cur); order.append(cur)
        loops.append(order)
    return loops


def stage_fixes():
    t0 = time.time()
    bpy.ops.wm.open_mainfile(filepath=os.path.join(CACHE, "meshyA_3.blend"))
    body, hair, hi = bpy.data.objects["body_lo"], bpy.data.objects["hair_lo"], bpy.data.objects["hi"]
    me = body.data
    img = bpy.data.images["doll_basecolor"]
    tv, tp, col, tl, uv = tri_colors(me, img)
    co = getco(body)
    P = co[tv]; c = P.mean(1)
    cap_vg = body.vertex_groups["cap"].index
    capv = np.zeros(len(co), bool)
    for v in me.vertices:
        if any(g.group == cap_vg for g in v.groups): capv[v.index] = True
    tcap = capv[tv].all(1)
    # face outline = keep; everything above the eyes outside of it is scalp/hair -> removed (also kills the strand bits)
    face = ((c[:, 0] / 0.106) ** 2 + ((c[:, 2] - 1.35) / 0.100) ** 2 < 1) & (c[:, 1] < -0.06)
    below = c[:, 2] < 1.30
    dele = tcap | (~face & ~below & (np.abs(c[:, 0]) < 0.25))
    # crease filter: shard sheets are tris whose normal deviates strongly from their neighbourhood (forehead / temples only)
    fn = np.cross(P[:, 1] - P[:, 0], P[:, 2] - P[:, 0]); fn /= np.maximum(np.linalg.norm(fn, axis=1), 1e-12)[:, None]
    vn = np.zeros((len(co), 3))
    for k in range(3): np.add.at(vn, tv[:, k], fn)
    vn /= np.maximum(np.linalg.norm(vn, axis=1), 1e-12)[:, None]
    for _ in range(3):                       # smooth vertex normals over the mesh graph
        acc = vn.copy()
        for a_, b_ in ((0, 1), (1, 2), (2, 0)):
            np.add.at(acc, tv[:, a_], vn[tv[:, b_]]); np.add.at(acc, tv[:, b_], vn[tv[:, a_]])
        vn = acc / np.maximum(np.linalg.norm(acc, axis=1), 1e-12)[:, None]
    dev = (fn * vn[tv].mean(1)).sum(1) / np.maximum(np.linalg.norm(vn[tv].mean(1), axis=1), 1e-12)
    crease = (dev < math.cos(math.radians(CREASE_DEG))) & (c[:, 2] > 1.385) & face
    log("crease tris", int(crease.sum()))
    # the crease/sliver filters were tuned for the old coarse (1.4k tri) face; the dense face has no shard sheets and the
    # filters would punch holes above the brows. Kept behind an env flag.
    if os.environ.get("SHARD_FILTER") == "1": dele |= crease
    el = np.stack([np.linalg.norm(P[:, 1] - P[:, 0], axis=1), np.linalg.norm(P[:, 2] - P[:, 1], axis=1), np.linalg.norm(P[:, 0] - P[:, 2], axis=1)], 1)
    area = 0.5 * np.linalg.norm(np.cross(P[:, 1] - P[:, 0], P[:, 2] - P[:, 0]), axis=1)
    sliver = (el.max(1) ** 2 / np.maximum(area, 1e-12) > 9.0) & (c[:, 2] > 1.385) & face
    temple = (np.abs(c[:, 0]) > 0.083) & (c[:, 2] > 1.385)
    log("sliver", int(sliver.sum()), "temple", int((temple & face).sum()))
    dele |= (sliver if os.environ.get("SHARD_FILTER") == "1" else False) | temple
    zone = face & (c[:, 2] > 1.38) & (np.abs(c[:, 0]) < 0.05) & ~dele
    cols = col[zone]; med = np.median(cols, 0)
    k = np.where(zone)[0][np.argmin(np.abs(cols - med).sum(1))]
    skin_uv = np.array(uv[tl[k][0]])
    cand_uv = uv[tl[np.where(zone)[0]][:, 0]]; skin_med = med
    log("skin uv", skin_uv, "colour", col[k])
    pdel = np.zeros(len(me.polygons), bool); pdel[tp[dele]] = True
    bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if pdel[f.index]], context='FACES')
    bm.verts.ensure_lookup_table()
    comp = {}; ncomp = 0
    for v in bm.verts:
        if v.index in comp: continue
        st = [v]; comp[v.index] = ncomp
        while st:
            x = st.pop()
            for e in x.link_edges:
                y = e.other_vert(x)
                if y.index not in comp: comp[y.index] = ncomp; st.append(y)
        ncomp += 1
    cnt = np.bincount(list(comp.values()))
    main = int(np.argmax(cnt))
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if comp[v.index] != main], context='VERTS')
    bm.verts.ensure_lookup_table(); bm.edges.ensure_lookup_table()
    loops = boundary_loops(bm)
    loops = [l for l in loops if np.mean([bm.verts[i].co.z for i in l]) > 1.3]
    rimi = max(loops, key=len)
    log("rim loops", [len(l) for l in loops], "using", len(rimi))
    # the traced loop can zig-zag (shard leftovers): order the rim by angle around the head axis instead (star-shaped) and
    # laplacian-smooth the ragged hairline in place (the real body vertices move with it so the seam stays watertight)
    rimi = sorted(set(rimi), key=lambda i: math.atan2(bm.verts[i].co.z - 1.37, bm.verts[i].co.x))
    rim = np.array([bm.verts[i].co[:] for i in rimi], np.float64)
    for _ in range(4):
        rim = (np.roll(rim, 1, 0) + 2 * rim + np.roll(rim, -1, 0)) / 4
    for i, q in zip(rimi, rim): bm.verts[i].co = Vector(q)
    log("rim bbox", rim.min(0), rim.max(0))
    # ---- skull ellipsoid fitted to rim + anchors (top / back of head)
    top_hair = [v.co.z for v in hair.data.vertices if abs(v.co.y) < 0.05 and v.co.z > 1.45]
    zt = float(np.percentile(top_hair, 95)) - 0.035
    anchors = [(0.0, 0.0, zt), (0.0, 0.092, 1.40), (0.0, 0.07, 1.48), (0.0, 0.03, zt - 0.012), (0.0, 0.1, 1.36)]
    pts = np.vstack([rim] + [np.array(anchors)] * 12)
    pts = np.vstack([pts, pts * np.array([-1, 1, 1])])
    Mx = np.stack([pts[:, 0] ** 2, pts[:, 1] ** 2, pts[:, 2] ** 2, pts[:, 1], pts[:, 2]], 1)
    A, B, C_, D, E = np.linalg.lstsq(Mx, np.ones(len(pts)), rcond=None)[0]
    yc = -D / (2 * B); zc = -E / (2 * C_)
    k0 = 1 + D * D / (4 * B) + E * E / (4 * C_)
    R = np.array([math.sqrt(k0 / A), math.sqrt(k0 / B), math.sqrt(k0 / C_)])
    Ce = np.array([0.0, yc, zc])
    log("ellipsoid c", Ce, "r", R, "zt", zt)
    u0 = (rim - Ce) / R
    n0 = np.linalg.norm(u0, axis=1)
    surf0 = Ce + u0 / n0[:, None] * R
    delta = rim - surf0
    for _ in range(6):
        delta = (np.roll(delta, 1, 0) + 2 * delta + np.roll(delta, -1, 0)) / 4
    delta[:, :] = delta       # (kept per vertex; ring 0 below uses the true rim so the seam stays watertight)
    K = 12
    n = len(rim)
    cap = bmesh.new(); cap.loops.layers.uv.new("UVMap")
    rings = [[cap.verts.new(tuple(r)) for r in rim]]
    up = np.array([0, 0, 1.0])
    for k in range(1, K):
        te = (k / K) ** 2 * (3 - 2 * (k / K))
        u = u0 / n0[:, None] * (1 - te) + up * te
        u /= np.linalg.norm(u, axis=1)[:, None]
        q = Ce + u * R + delta * (1 - te) ** 2
        rings.append([cap.verts.new(tuple(x)) for x in q])
    apex = cap.verts.new(tuple(Ce + up * R))
    for k in range(K - 1):
        for i in range(n):
            j = (i + 1) % n
            cap.faces.new((rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i]))
    for i in range(n):
        cap.faces.new((rings[K - 1][i], rings[K - 1][(i + 1) % n], apex))
    cap.faces.ensure_lookup_table()
    bmesh.ops.recalc_face_normals(cap, faces=cap.faces)
    out = sum(f.normal.dot(f.calc_center_median() - Vector(Ce)) for f in cap.faces)
    if out < 0: bmesh.ops.reverse_faces(cap, faces=cap.faces)
    uvl = cap.loops.layers.uv[0]
    for f in cap.faces:
        for l in f.loops: l[uvl].uv = Vector(skin_uv)
    cm = bpy.data.meshes.new("cap"); cap.to_mesh(cm); cap.free()
    bm.to_mesh(me); bm.free()
    cm.uv_layers[0].name = me.uv_layers[0].name
    cobj = bpy.data.objects.new("cap", cm); bpy.context.scene.collection.objects.link(cobj)
    cobj.data.materials.append(me.materials[0])
    body.vertex_groups.remove(body.vertex_groups["cap"])
    select_only(body); cobj.select_set(True)
    bpy.ops.object.join()
    bm = bmesh.new(); bm.from_mesh(body.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=2e-5)
    bm.to_mesh(body.data)
    log("boundary edges left", sum(1 for e in bm.edges if e.is_boundary)); bm.free()
    smooth_normals(body)
    log("body tris", len(body.data.polygons))
    fix_hair_bake(body, hair, hi, img)
    # re-pick the dome texel from the *re-baked* atlas (the nearest-to-median skin texel)
    W_, H_ = img.size
    pxs = np.empty(W_ * H_ * 4, np.float32); img.pixels.foreach_get(pxs); pxs = pxs.reshape(H_, W_, 4)
    cc = pxs[np.clip((cand_uv[:, 1] * H_).astype(int), 0, H_ - 1), np.clip((cand_uv[:, 0] * W_).astype(int), 0, W_ - 1), :3]
    skin_uv2 = cand_uv[np.argmin(np.abs(cc - skin_med).sum(1))]
    log("dome texel", skin_uv2, "colour", cc[np.argmin(np.abs(cc - skin_med).sum(1))], "vs median", skin_med)
    uvd = body.data.uv_layers[0].uv
    capmask = np.zeros(len(body.data.loops), bool)
    vcap = arr(body.data.vertices, 'co', 3)
    # cap faces = those whose UVs equal the old skin_uv
    uvarr = arr(uvd, 'vector', 2, np.float32)
    capmask = (np.abs(uvarr - skin_uv.astype(np.float32)).max(1) < 1e-6)
    uvarr[capmask] = skin_uv2.astype(np.float32)
    uvd.foreach_set('vector', uvarr.ravel())
    bpy.ops.wm.save_as_mainfile(filepath=blendB(1))
    log(f"fixes done {time.time()-t0:.0f}s")


def fix_hair_bake(body, hair, hi, img):
    """re-bake base colour of the hair triangles only, larger ray distance / cage (gray patches on thin strands)"""
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 4; sc.cycles.use_denoising = False
    b = sc.render.bake
    b.use_selected_to_active = True; b.cage_extrusion = 0.012; b.max_ray_distance = 0.06
    b.margin = 12; b.margin_type = 'EXTEND'; b.target = 'IMAGE_TEXTURES'; b.use_clear = False
    b.use_pass_direct = False; b.use_pass_indirect = False; b.use_pass_color = True
    hi.hide_viewport = False; hi.hide_render = False; hi.hide_set(False)
    mt = bpy.data.materials.new("bake_hair"); mt.use_nodes = True
    node = mt.node_tree.nodes.new('ShaderNodeTexImage'); node.image = img
    mt.node_tree.nodes.active = node
    old = list(hair.data.materials)
    hair.data.materials.clear(); hair.data.materials.append(mt)
    select_only(hair); hi.select_set(True)
    bpy.context.view_layer.objects.active = hair
    t = time.time()
    bpy.ops.object.bake(type='DIFFUSE')
    log(f"hair re-bake {time.time()-t:.0f}s")
    hair.data.materials.clear()
    for m in old: hair.data.materials.append(m)
    hi.hide_render = True; hi.hide_viewport = True
    img.pack()


# ====================================================================== RIG
FINGERS = ["Index", "Middle", "Ring", "Pinky", "Thumb"]


def fit_line(pts):
    c = pts.mean(0)
    u, s_, vt = np.linalg.svd(pts - c)
    return c, vt[0]


def compute_joints(co):
    """Joint positions (left side = +x) measured from cross-sections of the doll body. Only anatomical proportions
    where the mesh has no feature (elbow = middle of the arm, finger lengths) are typed in."""
    J = {}
    S0 = np.array([0.17, 0.0, 1.08])
    L = co[(co[:, 0] > 0.19) & (co[:, 2] > 0.6)]
    tip = L[np.argmax(np.linalg.norm(L - S0, axis=1))]
    d0 = (tip - S0) / np.linalg.norm(tip - S0)
    armv = co[(co[:, 0] > 0.14) & (co[:, 2] > 0.6) & (co[:, 2] < 1.12)]
    cens = []
    for ti in np.arange(0.03, 0.22, 0.03):
        m = np.abs((armv - S0) @ d0 - ti) < 0.012
        cens.append(armv[m].mean(0))
    c0, dl = fit_line(np.array(cens))
    if dl[0] < 0: dl = -dl
    sh = c0 + dl * ((1.075 - c0[2]) / dl[2])
    tl = (tip - sh) @ dl
    d_all = co - sh
    tt = d_all @ dl
    rad = np.linalg.norm(d_all - np.outer(tt, dl), axis=1)
    near = (rad < 0.065) & (co[:, 0] > 0.2) & (co[:, 2] < 1.0)
    prof = []
    for ti in np.arange(0.28 * tl, 0.95 * tl, 0.012):
        m = near & (np.abs(tt - ti) < 0.008)
        if m.sum() >= 3: prof.append((ti, rad[m].mean()))
    prof = np.array(prof)
    sel = prof[(prof[:, 0] > 0.70 * tl) & (prof[:, 0] < 0.80 * tl)]
    tw = float(sel[np.argmin(sel[:, 1]), 0])
    wrist = sh + dl * tw
    elbow = sh + dl * (tw * 0.5)
    log("arm: shoulder", sh, "elbow", elbow, "wrist", wrist, "tip", tip, "len", tl, "wrist t", tw)
    J["shoulder"] = sh; J["elbow"] = elbow; J["wrist"] = wrist; J["tip"] = tip
    ha = (tip - wrist); hl = np.linalg.norm(ha); ha /= hl
    H = co[(tt > tw - 0.01) & (rad < 0.08) & (co[:, 0] > 0.28)]
    Hc = H - wrist
    ta = Hc @ ha
    perp = Hc - np.outer(ta, ha)
    ev, evec = np.linalg.eigh(np.cov(perp.T))
    wdir = evec[:, 2]; ndir = evec[:, 1]
    pw = perp @ wdir
    base = ta < 0.5 * hl
    thumb_sign = 1.0 if pw[base].max() > -pw[base].min() else -1.0
    wdir = wdir * thumb_sign
    hw = (pw.max() - pw.min())
    log("hand len", hl, "width", hw, "thumb side sign", thumb_sign, "palm normal", ndir)
    J["hand_axis"] = ha; J["hand_w"] = wdir; J["hand_n"] = ndir; J["hand_len"] = hl; J["hand_wid"] = hw
    LL = co[(co[:, 0] > 0.0) & (co[:, 2] < 0.70) & (co[:, 0] < 0.45)]

    def slc(z, w=0.012):
        return LL[np.abs(LL[:, 2] - z) < w].mean(0)
    ankle = slc(0.21)
    th = np.array([slc(z) for z in (0.52, 0.56, 0.60, 0.64)])
    cl, dlg = fit_line(th)
    if dlg[2] < 0: dlg = -dlg
    hip = cl + dlg * ((0.775 - cl[2]) / dlg[2])
    mid = (hip + ankle) / 2
    knee = np.array([slc(0.47)[0], mid[1] - 0.012, 0.47])
    foot = co[(co[:, 0] > 0.2) & (co[:, 2] < 0.12)]
    toe_tip = np.array([foot[:, 0].mean(), foot[:, 1].min() + 0.01, max(foot[:, 2].min(), 0.0) + 0.005])
    ball = ankle + (toe_tip - ankle) * 0.72
    J["hip"] = hip; J["knee"] = knee; J["ankle"] = ankle; J["ball"] = ball; J["toe"] = toe_tip
    log("leg: hip", hip, "knee", knee, "ankle", ankle, "ball", ball, "toe", toe_tip)
    return J


def build_armature(J):
    arm = bpy.data.armatures.new("Armature"); rig = bpy.data.objects.new("Armature", arm)
    bpy.context.scene.collection.objects.link(rig)
    select_only(rig)
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.edit_bones
    P = "mixamorig:"

    def add(name, head, tail, parent=None, roll_vec=(0, -1, 0)):
        b = eb.new(P + name); b.head = Vector(head); b.tail = Vector(tail)
        if (b.tail - b.head).length < 1e-4: b.tail = b.head + Vector((0, 0, 0.01))
        if parent: b.parent = eb[P + parent]
        b.align_roll(Vector(roll_vec))
        return b
    sh, el, wr = J["shoulder"], J["elbow"], J["wrist"]
    hip, kn, an, ba, to = J["hip"], J["knee"], J["ankle"], J["ball"], J["toe"]

    def Z(z, y=0.0): return np.array([0.0, y, z])
    add("Hips", Z(0.80), Z(0.885), None)
    add("Spine", Z(0.885), Z(0.97), "Hips")
    add("Spine1", Z(0.97), Z(1.05), "Spine")
    add("Spine2", Z(1.05), Z(1.14), "Spine1")
    add("Neck", Z(1.14), Z(1.21, 0.005), "Spine2")
    add("Head", Z(1.21, 0.005), Z(1.555, -0.02), "Neck")

    def mir(v, sg): return np.array([v[0] * sg, v[1], v[2]])
    for side, sg in (("Left", 1.0), ("Right", -1.0)):
        add(f"{side}UpLeg", mir(hip, sg), mir(kn, sg), "Hips")
        add(f"{side}Leg", mir(kn, sg), mir(an, sg), f"{side}UpLeg")
        add(f"{side}Foot", mir(an, sg), mir(ba, sg), f"{side}Leg")
        add(f"{side}ToeBase", mir(ba, sg), mir(to, sg), f"{side}Foot")
        add(f"{side}Shoulder", np.array([0.02 * sg, -0.005, 1.115]), mir(sh, sg), "Spine2")
        add(f"{side}Arm", mir(sh, sg), mir(el, sg), f"{side}Shoulder")
        add(f"{side}ForeArm", mir(el, sg), mir(wr, sg), f"{side}Arm")
        ha, wd, nd, hl, hw = J["hand_axis"], J["hand_w"], J["hand_n"], J["hand_len"], J["hand_wid"]
        add(f"{side}Hand", mir(wr, sg), mir(wr + ha * hl * 0.36, sg), f"{side}ForeArm")
        root0 = wr + ha * hl * 0.36
        offs = {"Index": 0.33, "Middle": 0.11, "Ring": -0.11, "Pinky": -0.32}
        flen = {"Index": 0.95, "Middle": 1.0, "Ring": 0.93, "Pinky": 0.78}
        for fn in ("Index", "Middle", "Ring", "Pinky"):
            a = root0 + wd * hw * offs[fn]
            tot = hl * 0.64 * flen[fn]
            for i, f in enumerate((0.42, 0.33, 0.25), 1):
                b_ = a + ha * tot * f
                add(f"{side}Hand{fn}{i}", mir(a, sg), mir(b_, sg), f"{side}Hand" if i == 1 else f"{side}Hand{fn}{i-1}", tuple(mir(nd, sg)))
                a = b_
        # parent name needs the side prefix
        a = wr + ha * hl * 0.10 + wd * hw * 0.45
        td = (ha * 0.75 + wd * 0.55); td /= np.linalg.norm(td)
        tot = hl * 0.52
        for i, f in enumerate((0.38, 0.34, 0.28), 1):
            b_ = a + td * tot * f
            add(f"{side}HandThumb{i}", mir(a, sg), mir(b_, sg), f"{side}Hand" if i == 1 else f"{side}HandThumb{i-1}", tuple(mir(nd, sg)))
            a = b_
    bpy.ops.object.mode_set(mode='OBJECT')
    return rig


def stage_rig():
    t0 = time.time()
    bpy.ops.wm.open_mainfile(filepath=blendB(1))
    body, hair = bpy.data.objects["body_lo"], bpy.data.objects["hair_lo"]
    bpy.data.objects.remove(bpy.data.objects["hi"], do_unlink=True)
    for img in list(bpy.data.images):
        if img.name.startswith("Image_"): bpy.data.images.remove(img)
    co = getco(body)
    J = compute_joints(co)
    rig = build_armature(J)
    rig.show_in_front = True
    log("bones", len(rig.data.bones))
    for o in bpy.context.selected_objects: o.select_set(False)
    body.select_set(True); rig.select_set(True); bpy.context.view_layer.objects.active = rig
    t = time.time()
    try:
        bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    except Exception as e:
        log("heat failed", e)
    names = [b.name for b in rig.data.bones]
    present = {vg.name for vg in body.vertex_groups}
    log(f"heat weights {time.time()-t:.0f}s: groups", len(present), "missing", [n for n in names if n not in present])
    clean_weights(body, rig, J)
    # hair: 100% Head (blend to Neck/Spine2 below the nape for long curls)
    hair.parent = rig; hair.parent_type = 'OBJECT'
    hco = getco(hair)
    f = np.clip((hco[:, 2] - 1.19) / (1.29 - 1.19), 0, 1); f = f * f * (3 - 2 * f)
    nm3 = ["mixamorig:Head", "mixamorig:Neck", "mixamorig:Spine2"]
    W = np.stack([f, (1 - f) * 0.6, (1 - f) * 0.4], 1)
    set_weights(hair, nm3, W)
    m = hair.modifiers.new("Armature", 'ARMATURE'); m.object = rig
    json.dump({k: (v.tolist() if hasattr(v, "tolist") else float(v)) for k, v in J.items()}, open(os.path.join(CACHE, "joints.json"), "w"))
    bpy.ops.wm.save_as_mainfile(filepath=blendB(2))
    log(f"rig done {time.time()-t0:.0f}s")


def weights_matrix(ob, names):
    n = len(ob.data.vertices)
    idx = {ob.vertex_groups[nm].index: k for k, nm in enumerate(names) if nm in ob.vertex_groups}
    W = np.zeros((n, len(names)))
    for v in ob.data.vertices:
        for g in v.groups:
            if g.group in idx: W[v.index, idx[g.group]] = g.weight
    return W


def set_weights(ob, names, W, limit=4):
    for nm in names:
        if nm not in ob.vertex_groups: ob.vertex_groups.new(name=nm)
    allv = list(range(len(ob.data.vertices)))
    for vg in ob.vertex_groups: vg.remove(allv)
    order = np.argsort(-W, axis=1)
    for i in range(W.shape[0]):
        ks = order[i, :limit]; w = W[i, ks]; tot = w.sum()
        if tot < 1e-9: continue
        for k, wk in zip(ks, w / tot):
            if wk > 1e-3: ob.vertex_groups[names[k]].add([i], float(wk), 'REPLACE')


def mesh_edges(ob):
    e = np.empty(len(ob.data.edges) * 2, np.int32); ob.data.edges.foreach_get('vertices', e)
    return e.reshape(-1, 2)


def clean_weights(body, rig, J):
    names = [b.name for b in rig.data.bones]
    W = weights_matrix(body, names)
    co = getco(body)
    n = len(co)
    ia = {nm: k for k, nm in enumerate(names)}
    for side in ("Left", "Right"):
        sg = 1.0 if side == "Left" else -1.0
        wr = np.array([J["wrist"][0] * sg, J["wrist"][1], J["wrist"][2]])
        axis = np.array([J["hand_axis"][0] * sg, J["hand_axis"][1], J["hand_axis"][2]])
        d_ = (co - wr) @ axis
        rad = np.linalg.norm((co - wr) - np.outer(d_, axis), axis=1)
        hv = (np.sign(co[:, 0]) == sg) & (d_ > -0.012) & (rad < 0.09) & (np.abs(co[:, 0]) > 0.28)
        bones = [nm for nm in names if nm.startswith(f"mixamorig:{side}Hand")]
        pts = co[hv]
        D = np.zeros((len(pts), len(bones)))
        for k, nm in enumerate(bones):
            b = rig.data.bones[nm]; a = np.array(b.head_local); bb = np.array(b.tail_local)
            ab = bb - a; tt = np.clip(((pts - a) @ ab) / (ab @ ab), 0, 1)
            D[:, k] = np.linalg.norm(pts - (a + np.outer(tt, ab)), axis=1)
        D[:, bones.index(f"mixamorig:{side}Hand")] += 0.006
        Wh = np.exp(-(D / 0.008) ** 2)
        Wh = Wh / np.maximum(Wh.sum(1, keepdims=True), 1e-9)
        fade = np.clip((d_[hv] + 0.012) / 0.03, 0, 1)[:, None]
        Wn = np.zeros((len(pts), len(names)))
        Wn[:, [ia[b] for b in bones]] = Wh
        W[hv] = W[hv] * (1 - fade) + Wn * fade
    f = np.clip((co[:, 2] - 1.215) / (1.285 - 1.215), 0, 1); f = (f * f * (3 - 2 * f))[:, None]
    Wh = np.zeros_like(W); Wh[:, ia["mixamorig:Head"]] = 1
    W = W * (1 - f) + Wh * f
    e = mesh_edges(body)
    deg = np.zeros(n); np.add.at(deg, e[:, 0], 1); np.add.at(deg, e[:, 1], 1)
    keep = np.clip((co[:, 2] - 1.27) / 0.05, 0, 1)[:, None]
    for _ in range(3):
        acc = np.zeros_like(W); np.add.at(acc, e[:, 0], W[e[:, 1]]); np.add.at(acc, e[:, 1], W[e[:, 0]])
        Ws = (W + 0.5 * acc / np.maximum(deg, 1)[:, None]) / 1.5
        W = W * keep + Ws * (1 - keep)
    W /= np.maximum(W.sum(1, keepdims=True), 1e-9)
    set_weights(body, names, W)
    log("weights set (max 4 influences)")


# ====================================================================== REPOSE
def pose_rotate(rig, bone, axis, deg, pivot=None):
    """rotate a pose bone about a world axis through its head (armature object at identity)"""
    pb = rig.pose.bones["mixamorig:" + bone]
    head = pb.head.copy() if pivot is None else Vector(pivot)
    R = Matrix.Rotation(math.radians(deg), 4, Vector(axis))
    T = Matrix.Translation(head) @ R @ Matrix.Translation(-head)
    pb.matrix = T @ pb.matrix
    bpy.context.view_layer.update()


def clear_pose(rig):
    for pb in rig.pose.bones:
        pb.rotation_mode = 'QUATERNION'
        pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0); pb.scale = (1, 1, 1)
    bpy.context.view_layer.update()


def stage_repose():
    t0 = time.time()
    bpy.ops.wm.open_mainfile(filepath=blendB(2))
    body, hair, rig = bpy.data.objects["body_lo"], bpy.data.objects["hair_lo"], bpy.data.objects["Armature"]
    J = json.load(open(os.path.join(CACHE, "joints.json")))
    hip = np.array(J["hip"]); ankle = np.array(J["ankle"])
    # leg angle that brings the ankle centres to +-FOOT_X (rotation about Y through the hip, in the XZ plane)
    FOOT_X = 0.135
    v = ankle - hip
    def ax(th): return hip[0] + v[0] * math.cos(th) + v[2] * math.sin(th)
    th = min(np.linspace(0, 0.6, 600), key=lambda t: abs(ax(t) - FOOT_X))
    log("leg rotation (deg)", math.degrees(th), "-> ankle x", ax(th))
    # arm to ~42 deg from vertical
    sh = np.array(J["shoulder"]); wr = np.array(J["wrist"])
    cur = math.degrees(math.atan2(wr[0] - sh[0], sh[2] - wr[2]))
    log("arm angle now", cur)
    select_only(rig); bpy.ops.object.mode_set(mode='POSE')
    clear_pose(rig)
    for side in ("Left", "Right"):
        best = None
        for sgn in (1.0, -1.0):
            b = rig.pose.bones[f"mixamorig:{side}UpLeg"]; m0 = b.matrix.copy()
            pose_rotate(rig, f"{side}UpLeg", (0, 1, 0), sgn * math.degrees(th))
            err = abs(abs(rig.pose.bones[f"mixamorig:{side}Foot"].head.x) - FOOT_X)
            b.matrix = m0; bpy.context.view_layer.update()
            if best is None or err < best[0]: best = (err, sgn)
        pose_rotate(rig, f"{side}UpLeg", (0, 1, 0), best[1] * math.degrees(th))
        log(side, "ankle x", rig.pose.bones[f"mixamorig:{side}Foot"].head.x)
    arm_fix(rig, 42.0 - cur)
    bpy.ops.object.mode_set(mode='OBJECT')
    # bake: apply the armature modifier to body + hair, then make the pose the new rest pose
    for ob in (body, hair):
        select_only(ob)
        for m in list(ob.modifiers):
            if m.type == 'ARMATURE':
                bpy.ops.object.modifier_apply(modifier=m.name)
    select_only(rig); bpy.ops.object.mode_set(mode='POSE')
    bpy.ops.pose.armature_apply(selected=False)
    clear_pose(rig)
    bpy.ops.object.mode_set(mode='OBJECT')
    for ob in (body, hair):
        m = ob.modifiers.new("Armature", 'ARMATURE'); m.object = rig
    # lowest point -> z = 0
    minz = min(getco(body)[:, 2].min(), getco(hair)[:, 2].min())
    log("min z after repose", minz)
    json.dump({"dz": -float(minz)}, open(os.path.join(CACHE, "repose.json"), "w"))
    for ob in (body, hair):
        c = getco(ob); c[:, 2] -= minz; setco(ob, c)
    select_only(rig); bpy.ops.object.mode_set(mode='EDIT')
    for b in rig.data.edit_bones:
        b.head.z -= minz; b.tail.z -= minz
    bpy.ops.object.mode_set(mode='OBJECT')
    for ob in (body, hair): smooth_normals(ob)
    bpy.ops.wm.save_as_mainfile(filepath=blendB(3))
    log(f"repose done {time.time()-t0:.0f}s")


def arm_fix(rig, deg):
    for side in ("Left", "Right"):
        best = None
        for s in (1.0, -1.0):
            b = rig.pose.bones[f"mixamorig:{side}Arm"]
            m0 = b.matrix.copy()
            pose_rotate(rig, f"{side}Arm", (0, 1, 0), s * deg)
            x = abs(rig.pose.bones[f"mixamorig:{side}ForeArm"].head.x)
            b.matrix = m0; bpy.context.view_layer.update()
            if best is None or x > best[0]: best = (x, s)
        pose_rotate(rig, f"{side}Arm", (0, 1, 0), best[1] * deg)


def apply_pose(rig, spec):
    """spec: list of (bone, axis, deg) applied parent-first"""
    for bone, axis, deg in spec:
        pose_rotate(rig, bone, axis, deg)


def stage_pose_tests(src=3, prefix="B3"):
    bpy.ops.wm.open_mainfile(filepath=blendB(src))
    shot = setup_render()
    body, hair, rig = bpy.data.objects["body_lo"], bpy.data.objects["hair_lo"], bpy.data.objects["Armature"]
    rig.hide_render = True
    H = 1.65; bodyc = (0, 0, 0.82); dist = (H * 1.12) * 60 / 36.0
    select_only(rig); bpy.ops.object.mode_set(mode='POSE')
    clear_pose(rig)
    shot(f"{prefix}_rest_front.png", 0, bodyc, dist, 60)
    shot(f"{prefix}_rest_side.png", 90, bodyc, dist, 60)
    shot(f"{prefix}_rest_back.png", 180, bodyc, dist, 60)
    tests = {
        "arms_up": [("LeftArm", (0, 1, 0), -110), ("RightArm", (0, 1, 0), 110)],
        "arms_fwd": [("LeftArm", (1, 0, 0), -80), ("RightArm", (1, 0, 0), -80), ("LeftForeArm", (1, 0, 0), -60), ("RightForeArm", (1, 0, 0), -60)],
        "walk": [("LeftUpLeg", (1, 0, 0), -30), ("LeftLeg", (1, 0, 0), 25), ("RightUpLeg", (1, 0, 0), 25), ("RightArm", (1, 0, 0), 25), ("LeftArm", (1, 0, 0), -25)],
        "sit": [("LeftUpLeg", (1, 0, 0), -85), ("RightUpLeg", (1, 0, 0), -85), ("LeftLeg", (1, 0, 0), 90), ("RightLeg", (1, 0, 0), 90), ("Spine", (1, 0, 0), -6)],
        "headturn": [("Head", (0, 0, 1), 40), ("Neck", (0, 0, 1), 15), ("Spine1", (0, 0, 1), -12)],
    }
    for name, spec in tests.items():
        clear_pose(rig)
        apply_pose(rig, spec)
        shot(f"{prefix}_pose_{name}_front.png", 0 if name != "walk" and name != "sit" else 90, bodyc, dist, 60)
        if name in ("arms_up", "headturn"):
            shot(f"{prefix}_pose_{name}_34.png", 40, bodyc if name == "arms_up" else (0, 0, 1.38), dist if name == "arms_up" else 0.9, 60 if name == "arms_up" else 85)
    clear_pose(rig)


# ====================================================================== MORPHS
SLIDER_LABELS = {
    "bustBig": ("Busto maior", "Corpo"), "bustSmall": ("Busto menor", "Corpo"),
    "buttBig": ("Bumbum maior", "Corpo"), "buttSmall": ("Bumbum menor", "Corpo"),
    "hipsWide": ("Quadril largo", "Corpo"), "waistThin": ("Cintura fina", "Corpo"),
    "thighsThick": ("Coxas grossas", "Corpo"), "weightUp": ("Mais peso", "Corpo"),
    "weightDown": ("Menos peso", "Corpo"), "shouldersNarrow": ("Ombros estreitos", "Corpo"),
    "lipsFull": ("Labios cheios", "Rosto"), "lipsWide": ("Boca larga", "Rosto"),
    "noseSmall": ("Nariz pequeno", "Rosto"), "noseNarrow": ("Nariz fino", "Rosto"),
    "cheekbonesHigh": ("Macas do rosto altas", "Rosto"), "jawNarrow": ("Mandibula fina", "Rosto"),
    "chinPointed": ("Queixo pontudo", "Rosto"), "faceThin": ("Rosto fino", "Rosto"),
    "eyesBig": ("Olhos grandes", "Rosto"), "browLift": ("Sobrancelhas altas", "Rosto"),
}
# maximum displacement per slider at value 1 (metres) -- tasteful, none of them extreme
STR = dict(bust=0.022, bustS=0.012, butt=0.020, buttS=0.011, hips=0.085, waist=0.11, thigh=0.013, wUp=0.013, wDn=0.008,
           shoulders=0.085)


def sstep(t):
    t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)


def bell(r):
    """1 at r=0, 0 at r>=1, smooth"""
    return 1 - sstep(r)


def vertex_normals(ob):
    me = ob.data
    me.calc_loop_triangles()
    co = getco(ob)
    nt = len(me.loop_triangles)
    tv = np.empty(nt * 3, np.int32); me.loop_triangles.foreach_get('vertices', tv); tv = tv.reshape(-1, 3)
    fn = np.cross(co[tv[:, 1]] - co[tv[:, 0]], co[tv[:, 2]] - co[tv[:, 0]])
    acc = np.zeros((len(co), 3))
    for k in range(3): np.add.at(acc, tv[:, k], fn)
    return acc / np.maximum(np.linalg.norm(acc, axis=1), 1e-12)[:, None]


def laplace_smooth(D, e, n, it=6):
    deg = np.zeros(n); np.add.at(deg, e[:, 0], 1); np.add.at(deg, e[:, 1], 1)
    for _ in range(it):
        acc = np.zeros_like(D); np.add.at(acc, e[:, 0], D[e[:, 1]]); np.add.at(acc, e[:, 1], D[e[:, 0]])
        D = (D + acc / np.maximum(deg, 1)[:, None] * 1.0) / 2.0
    return D


def group_w(ob, rig, patterns):
    names = [b.name for b in rig.data.bones]
    W = weights_matrix(ob, names)
    cols = [i for i, nm in enumerate(names) if any(p in nm for p in patterns)]
    return W[:, cols].sum(1)


def landmarks_face(co):
    m = (co[:, 2] > 1.22) & (co[:, 2] < 1.42) & (np.abs(co[:, 0]) < 0.03) & (co[:, 1] < -0.06)
    i = np.where(m)[0][np.argmin(co[m, 1])]
    nose = co[i]
    LM = {"nose": nose, "z_nose": nose[2]}
    LM["eye_z"] = nose[2] + 0.052; LM["eye_x"] = 0.0757
    LM["lip_z"] = nose[2] - 0.052; LM["brow_z"] = nose[2] + 0.117; LM["chin_z"] = nose[2] - 0.095
    # face surface depth at a given (x, z): nearest front vertex
    head = co[(co[:, 2] > 1.15) & (co[:, 1] < 0.0)]
    def y_at(x, z):
        d = np.hypot(head[:, 0] - x, head[:, 2] - z)
        k = np.argsort(d)[:12]; return float(head[k, 1].min())
    LM["y_at"] = y_at
    return LM


def compute_morphs(body, hair, rig):
    """returns {name: (body_delta, hair_delta or None)} -- custom, smooth regional deformations around measured landmarks"""
    co = getco(body); n = len(co)
    hco = getco(hair)
    nrm = vertex_normals(body)
    e = mesh_edges(body)
    W_torso = group_w(body, rig, ["Hips", "Spine", "Neck", "Shoulder"])
    W_leg = group_w(body, rig, ["UpLeg"]); W_calf = group_w(body, rig, ["mixamorig:LeftLeg", "mixamorig:RightLeg"])
    W_arm = group_w(body, rig, ["Arm", "Hand"]) ; W_head = group_w(body, rig, ["Head"])
    W_foot = group_w(body, rig, ["Foot", "Toe"]); W_hand = group_w(body, rig, ["Hand"])
    Wn = lambda x: np.clip(x, 0, 1)
    DZ = json.load(open(os.path.join(CACHE, "repose.json")))["dz"]
    x, y, z = co[:, 0], co[:, 1], co[:, 2] - DZ          # body landmarks below were measured before the feet were put on z = 0
    ax = np.abs(x)
    out = {}
    zeros = lambda: np.zeros((n, 3))

    def sm(D, it=4): return laplace_smooth(D, e, n, it)
    # ---------------- body
    D = zeros()
    for sg in (1, -1):
        r = np.sqrt(((x - sg * 0.052) / 0.075) ** 2 + ((z - 1.02) / 0.075) ** 2 + ((y + 0.085) / 0.09) ** 2)
        D += nrm * (bell(r) * STR["bust"])[:, None] + np.stack([np.zeros(n), -np.ones(n) * 0.004, np.ones(n) * 0.004], 1) * bell(r)[:, None]
    out["bustBig"] = sm(D * Wn(W_torso * 1.5)[:, None] * (y < 0.0)[:, None], 3)
    D = zeros()
    for sg in (1, -1):
        r = np.sqrt(((x - sg * 0.052) / 0.075) ** 2 + ((z - 1.02) / 0.075) ** 2 + ((y + 0.085) / 0.09) ** 2)
        D -= nrm * (bell(r) * STR["bustS"])[:, None]
    out["bustSmall"] = sm(D * Wn(W_torso * 1.5)[:, None] * (y < 0.0)[:, None], 3)
    for nm, k in (("buttBig", STR["butt"]), ("buttSmall", -STR["buttS"])):
        D = zeros()
        for sg in (1, -1):
            r = np.sqrt(((x - sg * 0.065) / 0.10) ** 2 + ((z - 0.75) / 0.10) ** 2 + ((y - 0.07) / 0.10) ** 2)
            D += nrm * (bell(r) * k)[:, None]
        out[nm] = sm(D * Wn(W_torso + W_leg)[:, None] * (y > 0.0)[:, None], 3)
    f = bell(np.abs(z - 0.76) / 0.15)
    D = np.stack([x * STR["hips"] * f, y * 0.02 * f, np.zeros(n)], 1)
    out["hipsWide"] = sm(D * Wn(W_torso + W_leg)[:, None], 3)
    f = bell(np.abs(z - 0.95) / 0.11)
    D = np.stack([-x * STR["waist"] * f, -(y - 0.0) * STR["waist"] * 0.7 * f, np.zeros(n)], 1)
    out["waistThin"] = sm(D * Wn(W_torso)[:, None], 3)
    # thighs: radial from the leg axis
    D = zeros()
    for sg in (1, -1):
        ax_x = sg * (0.07 + (0.78 - np.clip(z, 0.3, 0.78)) / 0.31 * 0.116)
        rad = np.stack([x - ax_x, y - 0.0, np.zeros(n)], 1)
        rad /= np.maximum(np.linalg.norm(rad, axis=1), 1e-9)[:, None]
        prof = bell(np.abs(z - 0.62) / 0.22)
        m = (np.sign(x) == sg)
        D += rad * (prof * STR["thigh"] * m)[:, None]
    out["thighsThick"] = sm(D * Wn(W_leg)[:, None], 3)
    # weight up / down: soft inflate along normals, scaled per body region
    fat = Wn(W_torso * 1.0 + W_leg * 1.1 + W_calf * 0.6 + W_arm * 0.7 - W_hand * 0.7 - W_foot * 0.6) * (1 - Wn(W_head))
    fat = np.clip(fat, 0, 1.2)
    out["weightUp"] = sm(nrm * (fat * STR["wUp"])[:, None], 2)
    out["weightDown"] = sm(-nrm * (fat * STR["wDn"])[:, None], 2)
    # shoulders: torso scaled in x around the shoulder line, arms translate with it
    f = bell(np.abs(z - 1.09) / 0.12)
    Dt = np.stack([-x * STR["shoulders"] * f, np.zeros(n), np.zeros(n)], 1) * Wn(W_torso)[:, None]
    shift = -np.sign(x) * 0.085 * 0.14
    Da = np.stack([shift * np.ones(n), np.zeros(n), np.zeros(n)], 1) * Wn(W_arm)[:, None]
    out["shouldersNarrow"] = sm(Dt + Da, 2)
    # ---------------- face (head vertices only; positional, so the hair can follow where it touches)
    LM = landmarks_face(co)
    log("face landmarks nose", LM["nose"], "eye z", LM["eye_z"], "lip z", LM["lip_z"], "chin z", LM["chin_z"])
    ez, lz, bz, cz = LM["eye_z"], LM["lip_z"], LM["brow_z"], LM["chin_z"]
    yh = co[:, 1]
    front = (y < -0.04)
    head_m = Wn(W_head * 2.0) * front

    def face_delta(P, nrmP, name):
        X, Y, Z = P[:, 0], P[:, 1], P[:, 2]
        m = len(P); zero = np.zeros(m)
        if name == "lipsFull":
            r = np.sqrt((X / 0.045) ** 2 + ((Z - lz) / 0.03) ** 2 + ((Y - LM["y_at"](0, lz)) / 0.05) ** 2)
            return nrmP * (bell(r) * 0.0075)[:, None]
        if name == "lipsWide":
            r = np.sqrt((X / 0.06) ** 2 + ((Z - lz) / 0.035) ** 2)
            return np.stack([X * 0.14 * bell(r), zero, zero], 1)
        if name == "noseSmall":
            c = np.array([0.0, LM["nose"][1] + 0.035, LM["nose"][2] + 0.004])
            r = np.sqrt((X / 0.045) ** 2 + ((Z - c[2]) / 0.05) ** 2 + ((Y - c[1]) / 0.06) ** 2)
            return -(P - c) * (bell(r) * 0.16)[:, None]
        if name == "noseNarrow":
            r = np.sqrt((X / 0.04) ** 2 + ((Z - (LM["nose"][2] + 0.01)) / 0.05) ** 2)
            return np.stack([-X * 0.2 * bell(r), zero, zero], 1)
        if name == "cheekbonesHigh":
            D = np.zeros((m, 3))
            for sg in (1, -1):
                r = np.sqrt(((X - sg * 0.085) / 0.05) ** 2 + ((Z - (ez - 0.035)) / 0.045) ** 2 + ((Y + 0.09) / 0.07) ** 2)
                D += (nrmP * 0.006 + np.array([0, 0, 0.008])) * bell(r)[:, None]
            return D
        if name == "jawNarrow":
            g = sstep((lz + 0.045 - Z) / 0.07)
            return np.stack([-X * 0.12 * g, zero, zero], 1)
        if name == "chinPointed":
            r = np.sqrt((X / 0.05) ** 2 + ((Z - (cz + 0.015)) / 0.04) ** 2 + ((Y + 0.07) / 0.08) ** 2)
            f = bell(r)
            return np.stack([-X * 0.25 * f, -0.006 * f, -0.010 * f], 1)
        if name == "faceThin":
            g = sstep((Z - (cz - 0.01)) / 0.05)
            return np.stack([-X * 0.07 * g, zero, zero], 1)
        if name == "eyesBig":
            D = np.zeros((m, 3))
            for sg in (1, -1):
                c = np.array([sg * LM["eye_x"], 0, ez])
                r = np.sqrt(((X - c[0]) / 0.058) ** 2 + ((Z - ez) / 0.04) ** 2)
                f = bell(r) * 0.13
                D += np.stack([(X - c[0]) * f, zero, (Z - ez) * f], 1)
            return D
        if name == "browLift":
            r = np.sqrt((X / 0.105) ** 2 + ((Z - bz) / 0.04) ** 2)
            return np.stack([zero, zero, np.ones(m) * 0.007 * bell(r)], 1)
    hair_follow = ("faceThin", "jawNarrow")
    names_face = list(SLIDER_LABELS)[10:]
    for nm in names_face:
        D = face_delta(co, nrm, nm) * head_m[:, None]
        if nm in ("faceThin", "jawNarrow"):
            D = face_delta(co, nrm, nm) * Wn(W_head * 2.0)[:, None]
        out[nm] = sm(D, 2) if nm not in ("faceThin", "jawNarrow", "noseSmall", "eyesBig", "lipsWide", "noseNarrow", "browLift") else D
    # hair deltas for the head-shape sliders: same positional function, restricted to the head zone (z > chin level)
    hout = {}
    for nm in hair_follow:
        Dh = face_delta(hco, np.zeros_like(hco), nm)
        hout[nm] = Dh * (hco[:, 2] > cz - 0.03)[:, None]
    result = {}
    for nm in SLIDER_LABELS:
        result[nm] = (out[nm], hout.get(nm))
    return result


def stage_morphs():
    t0 = time.time()
    bpy.ops.wm.open_mainfile(filepath=blendB(3))
    body, hair, rig = bpy.data.objects["body_lo"], bpy.data.objects["hair_lo"], bpy.data.objects["Armature"]
    res = compute_morphs(body, hair, rig)
    for ob in (body, hair):
        ob.shape_key_add(name="Basis", from_mix=False)
    for nm, (db, dh) in res.items():
        sk = body.shape_key_add(name=nm, from_mix=False)
        co = getco(body)
        sk.data.foreach_set('co', (co + db).astype(np.float32).ravel())
        sk.slider_min = 0.0; sk.slider_max = 1.0; sk.value = 0.0
        mx = np.abs(db).max()
        log(f"{nm:16s} max |delta| {mx*1000:.1f} mm  verts>0.5mm {(np.linalg.norm(db,axis=1)>5e-4).sum()}")
    hco = getco(hair)
    for nm, (db, dh) in res.items():
        if dh is None: continue
        sk = hair.shape_key_add(name=nm, from_mix=False)
        sk.data.foreach_set('co', (hco + dh).astype(np.float32).ravel())
        sk.slider_min = 0.0; sk.slider_max = 1.0; sk.value = 0.0
    bpy.ops.wm.save_as_mainfile(filepath=blendB(4))
    log(f"morphs done {time.time()-t0:.0f}s")


def stage_morph_tests():
    bpy.ops.wm.open_mainfile(filepath=blendB(4))
    shot = setup_render()
    body, hair, rig = bpy.data.objects["body_lo"], bpy.data.objects["hair_lo"], bpy.data.objects["Armature"]
    rig.hide_render = True
    H = 1.65; bodyc = (0, 0, 0.82); dist = (H * 1.12) * 60 / 36.0

    def setk(vals):
        for ob in (body, hair):
            for k in ob.data.shape_keys.key_blocks:
                if k.name != "Basis": k.value = vals.get(k.name, 0.0)
        bpy.context.view_layer.update()
    for name, vals, cam in (
        ("base", {}, "body"),
        ("body4", {"bustBig": 1, "buttBig": 1, "hipsWide": 1, "waistThin": 1}, "body"),
        ("weightUp", {"weightUp": 1, "thighsThick": 1}, "body"),
        ("slim", {"weightDown": 1, "shouldersNarrow": 1, "bustSmall": 1, "buttSmall": 1}, "body"),
        ("face_base", {}, "face"),
        ("face4", {"lipsFull": 1, "noseSmall": 1, "cheekbonesHigh": 1, "eyesBig": 1}, "face"),
        ("face_shape", {"faceThin": 1, "jawNarrow": 1, "chinPointed": 1, "browLift": 1, "lipsWide": 1, "noseNarrow": 1}, "face"),
    ):
        setk(vals)
        if cam == "body":
            shot(f"B4_{name}_front.png", 0, bodyc, dist, 60); shot(f"B4_{name}_side.png", 90, bodyc, dist, 60)
        else:
            fc = (0, -0.02, 1.38); d = 0.30 * 85 / 36.0
            shot(f"B4_{name}_front.png", 0, fc, d, 85); shot(f"B4_{name}_34.png", 35, fc, d, 85)
    setk({})


# ====================================================================== EXPORT
def stage_export():
    bpy.ops.wm.open_mainfile(filepath=blendB(4))
    body, hair, rig = bpy.data.objects["body_lo"], bpy.data.objects["hair_lo"], bpy.data.objects["Armature"]
    body.name = "DollBody"; hair.name = "HairUpdo"
    rig.hide_viewport = False; rig.hide_render = False
    outs = {}
    for ob, fn in ((body, "doll_base.glb"), (hair, "hair_meshy_updo.glb")):
        for o in bpy.data.objects: o.select_set(False)
        ob.select_set(True); rig.select_set(True); bpy.context.view_layer.objects.active = rig
        path = os.path.join(PUB, fn)
        bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format='GLB', export_yup=True, export_apply=False,
                                  export_image_format='JPEG', export_jpeg_quality=90, export_materials='EXPORT',
                                  export_normals=True, export_skins=True, export_def_bones=False, export_animations=False,
                                  export_morph=True, export_morph_normal=False, export_try_sparse_sk=True,
                                  export_cameras=False, export_lights=False)
        outs[fn] = os.path.getsize(path)
        log(fn, outs[fn] // 1024, "KB", len(ob.data.polygons), "tris")
    names = [b.name for b in rig.data.bones]
    top = float(getco(hair)[:, 2].max()); topb = float(getco(body)[:, 2].max())
    meta = {
        "version": 1, "source": "Meshy glam doll (prepare_meshy.py -> rig_meshy.py)",
        "files": {"body": "doll_base.glb", "hair": "hair_meshy_updo.glb"},
        "heightMeters": round(max(top, topb), 3), "heightBodyMeters": round(topb, 3),
        "restPose": "A-pose ~42 deg arms, feet ~0.27 m apart, feet en pointe (lowest point z=0)",
        "axes": "glTF Y-up, character faces +Z",
        "bones": [n for n in names], "boneCount": len(names), "rootBone": "mixamorig:Hips",
        "boneNote": "Mixamo names; three.js GLTFLoader strips ':' -> mixamorigHips ...",
        "morphs": [{"name": k, "label": v[0], "group": v[1], "min": 0, "max": 1, "targets": ["body"] + (["hair"] if k in ("faceThin", "jawNarrow") else [])}
                   for k, v in SLIDER_LABELS.items()],
        "morphGroups": ["Corpo", "Rosto"],
        "triangles": {"body": len(body.data.polygons), "hair": len(hair.data.polygons)},
        "sizesBytes": outs,
        "license": "Meshy-generated asset (check Meshy plan terms); rig/morph tooling: project code",
    }
    json.dump(meta, open(os.path.join(PUB, "doll_base.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)


def glb_json(path):
    import struct
    with open(path, "rb") as f:
        f.read(12); ln, tp = struct.unpack("<II", f.read(8)); return json.loads(f.read(ln))


def stage_verify():
    """re-import the exported GLBs into a clean scene and render them (round-trip check)"""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for fn in ("doll_base.glb", "hair_meshy_updo.glb"):
        j = glb_json(os.path.join(PUB, fn))
        log(fn, "meshes", len(j["meshes"]), "skins", len(j.get("skins", [])), "joints", len(j["skins"][0]["joints"]),
            "targets", [len(p.get("targets", [])) for m in j["meshes"] for p in m["primitives"]],
            "sparse accessors", sum(1 for a in j["accessors"] if "sparse" in a), "images", len(j.get("images", [])))
        bpy.ops.import_scene.gltf(filepath=os.path.join(PUB, fn))
    shot = setup_render()
    for o in bpy.data.objects:
        if o.type == 'ARMATURE': o.hide_render = True
    log("objects", [o.name for o in bpy.data.objects if o.type in ('MESH', 'ARMATURE')])
    shot("B5_export_front.png", 0, (0, 0, 0.82), (1.65 * 1.12) * 60 / 36.0, 60)


# ====================================================================== render helper
def setup_render(w=900, h=1100):
    sc = bpy.context.scene
    for eid in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):
        try: sc.render.engine = eid; break
        except TypeError: continue
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.view_settings.view_transform = 'AgX'
    wd = bpy.data.worlds.new("W"); sc.world = wd; wd.use_nodes = True
    bg = wd.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.6, 0.6, 0.62, 1); bg.inputs[1].default_value = 1.0
    cam_d = bpy.data.cameras.new("cam"); cam = bpy.data.objects.new("cam", cam_d); sc.collection.objects.link(cam); sc.camera = cam
    ct = bpy.data.objects.new("ct", None); sc.collection.objects.link(ct)
    tc = cam.constraints.new('TRACK_TO'); tc.target = ct; tc.track_axis = 'TRACK_NEGATIVE_Z'; tc.up_axis = 'UP_Y'
    for name, off, e, s in (("key", (1.5, 1.0, 0.5), 400, 3), ("fill", (-2.0, 0.3, 0.0), 150, 4), ("rim", (0.0, 2.0, 2.0), 200, 3)):
        d = bpy.data.lights.new(name, 'AREA'); d.energy = e; d.size = s
        o = bpy.data.objects.new(name, d); sc.collection.objects.link(o); o.parent = cam; o.location = off

    def shot(name, azim, focus, dist, lens):
        cam_d.lens = lens; ct.location = focus
        a = math.radians(azim)
        cam.location = (focus[0] + dist * math.sin(a), focus[1] - dist * math.cos(a), focus[2] + dist * 0.03)
        bpy.context.view_layer.update()
        sc.render.filepath = os.path.join(SHOTS, name)
        bpy.ops.render.render(write_still=True)
    return shot


def stage_render_fix():
    bpy.ops.wm.open_mainfile(filepath=blendB(1))
    shot = setup_render()
    body, hair = bpy.data.objects["body_lo"], bpy.data.objects["hair_lo"]
    hair.hide_viewport = hair.hide_render = True
    fz = (0, 0.0, 1.38); d = 0.30 * 85 / 36.0 * 1.3
    shot("B1_bald_front.png", 0, fz, d, 85); shot("B1_bald_34.png", 45, fz, d, 85)
    shot("B1_bald_side.png", 90, fz, d, 85); shot("B1_bald_back.png", 180, fz, d, 85)
    hair.hide_viewport = hair.hide_render = False
    shot("B1_hair_front.png", 0, (0, -0.02, 1.38), 0.30 * 85 / 36.0, 85)
    shot("B1_hair_34.png", 35, (0, -0.02, 1.38), 0.30 * 85 / 36.0, 85)
    shot("B1_hair_back.png", 180, fz, d, 85)


STAGES = {"fixes": stage_fixes, "render_fix": stage_render_fix, "rig": stage_rig, "repose": stage_repose, "pose_tests": stage_pose_tests, "morphs": stage_morphs, "morph_tests": stage_morph_tests, "export": stage_export, "verify": stage_verify}
if __name__ == "__main__":
    for st in argv:
        STAGES[st]()

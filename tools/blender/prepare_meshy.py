"""Milestone A: Meshy doll -> game-ready body + hair LOD0 (unrigged).
Usage: blender -b --factory-startup -noaudio --python prepare_meshy.py -- <stage ...>
Stages (each loads the previous stage's .blend from .cache/):
  classify   import, normalise (1.65 m, feet z=0, facing -Y), split hair/body, cap scalp -> meshyA_1.blend
  decimate   decimate body (face weighted) + hair                                       -> meshyA_2.blend
  bake       bake normal map hi->lo, downsample textures, fix metal/rough               -> meshyA_3.blend
  export     write sources/out/*.glb
  render     comparison previews
  all        classify decimate bake export render
Deterministic: no random numbers, fixed thresholds.
"""
import bpy, bmesh, sys, os, math, time
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "sources", "meshy_glam_doll_v1.glb")
OUT = os.path.join(HERE, "sources", "out")
CACHE = os.path.join(HERE, ".cache")
SHOTS = r"C:\Users\user\AppData\Local\Temp\claude\shots\meshyA"
TARGET_H = 1.65
BODY_TRIS, HAIR_TRIS = 45000, 25000
TEX = 2048
HAIR_BR = 0.72          # blue/red ratio under which a texel is hair-coloured
os.makedirs(OUT, exist_ok=True); os.makedirs(CACHE, exist_ok=True)

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
stages = argv or ["all"]
if stages == ["all"]:
    stages = ["classify", "decimate", "bake", "export", "render"]


def blend(i): return os.path.join(CACHE, f"meshyA_{i}.blend")
def log(*a): print("[meshyA]", *a, flush=True)


def arr(coll, attr, dim, dtype):
    n = len(coll)
    a = np.empty(n * dim, dtype); coll.foreach_get(attr, a)
    return a.reshape(n, dim) if dim > 1 else a


# ------------------------------------------------------------------ classify
def stage_classify():
    t0 = time.time()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=SRC)
    o = [x for x in bpy.data.objects if x.type == 'MESH'][0]
    o.name = "hi"
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    me = o.data
    co = arr(me.vertices, 'co', 3, np.float32)
    s = TARGET_H / (co[:, 2].max() - co[:, 2].min())
    co *= s
    co[:, 2] -= co[:, 2].min()
    slab = co[(co[:, 2] > 0.8) & (co[:, 2] < 1.0)]
    co[:, 0] -= (co[:, 0].min() + co[:, 0].max()) / 2
    co[:, 1] -= (slab[:, 1].min() + slab[:, 1].max()) / 2
    me.vertices.foreach_set('co', co.ravel()); me.update()
    log("scale", s, "bbox", co.min(0), co.max(0))

    # --- per-triangle texture colour
    mat = me.materials[0]
    bc = [n for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE' and n.outputs[0].links
          and n.outputs[0].links[0].to_socket.name == 'Base Color'][0].image
    W, H = bc.size
    px = np.empty(W * H * 4, np.float32); bc.pixels.foreach_get(px); px = px.reshape(H, W, 4)
    me.calc_loop_triangles()
    nt = len(me.loop_triangles)
    tv = np.empty(nt * 3, np.int32); me.loop_triangles.foreach_get('vertices', tv); tv = tv.reshape(-1, 3)
    tl = np.empty(nt * 3, np.int32); me.loop_triangles.foreach_get('loops', tl); tl = tl.reshape(-1, 3)
    tpoly = np.empty(nt, np.int32); me.loop_triangles.foreach_get('polygon_index', tpoly)
    uv = np.empty(len(me.loops) * 2, np.float32); me.uv_layers[0].uv.foreach_get('vector', uv); uv = uv.reshape(-1, 2)
    tuv = uv[tl].mean(1)
    ix = np.clip((tuv[:, 0] * W).astype(int), 0, W - 1); iy = np.clip((tuv[:, 1] * H).astype(int), 0, H - 1)
    tcol = px[iy, ix, :3]
    br = tcol[:, 2] / np.maximum(tcol[:, 0], 1e-3)
    gr = tcol[:, 1] / np.maximum(tcol[:, 0], 1e-3)
    P = co[tv]; tz = P[:, :, 2].mean(1); ty = P[:, :, 1].mean(1); tx = P[:, :, 0].mean(1)
    pink = (tcol[:, 0] > 0.86) & (gr < 0.75)
    zone = ((tx / 0.098) ** 2 + ((tz - 1.35) / 0.115) ** 2 < 1) & (ty < -0.09)   # face ellipse: forced to skin
    cream = (gr > 0.86) & (br < 0.90)                      # pale blonde strokes
    hair = ((br < HAIR_BR) | cream) & (tz > 1.2) & (tcol.mean(1) > 0.3) & ~pink & ~zone

    # --- welded triangle adjacency
    key = np.round(co / 1e-5).astype(np.int64)
    _, wid = np.unique(key, axis=0, return_inverse=True); wid = wid.ravel()
    w = wid[tv]
    E = np.concatenate([w[:, [0, 1]], w[:, [1, 2]], w[:, [2, 0]]]); E.sort(1)
    fid = np.tile(np.arange(nt), 3)
    ek = E[:, 0].astype(np.int64) * (wid.max() + 1) + E[:, 1]
    od = np.argsort(ek, kind='stable'); ek = ek[od]; fe = fid[od]
    same = ek[1:] == ek[:-1]
    A, B = fe[:-1][same], fe[1:][same]

    def components(mask):
        m = mask[A] & mask[B]
        a, b = A[m], B[m]
        lab = np.arange(nt)
        while True:
            mn = np.minimum(lab[a], lab[b])
            new = lab.copy(); np.minimum.at(new, a, mn); np.minimum.at(new, b, mn)
            new = new[new]
            if (new == lab).all(): break
            lab = new
        return lab

    h = hair.astype(np.float32)
    for _ in range(2):
        sm = np.zeros(nt); c = np.zeros(nt)
        np.add.at(sm, A, h[B]); np.add.at(sm, B, h[A]); np.add.at(c, A, 1); np.add.at(c, B, 1)
        h = np.where(c > 0, ((sm + h) / (c + 1) > 0.5).astype(np.float32), h)
    temple = (tz > 1.39) & (br < 0.78) & (gr > 0.84)   # pale lock strands over the temples
    hair = (h > 0.5) & (~zone | temple)
    # anything above the eyes / beside the ears that lies outside the face-mask outline is hair, whatever its colour
    outside = ((tx / 0.125) ** 2 + ((tz - 1.34) / 0.125) ** 2 > 1) & (tz > 1.3)
    hair |= outside & (~zone | temple)
    # skin islands floating off the main skin body above the shoulders = loose curls -> hair
    lab = components(~hair)
    ids, cnt = np.unique(lab[~hair], return_counts=True)
    main = ids[np.argmax(cnt)]
    for i, cn in zip(ids, cnt):
        if i == main: continue
        m = lab == i
        if not zone[m].any() and tz[m].mean() > 1.2 and tcol[m].mean() >= 0.3 and cn < 40000:
            hair[m] = True
    # tiny hair islands = speckle -> skin
    lab = components(hair)
    ids, cnt = np.unique(lab[hair], return_counts=True)
    for i, cn in zip(ids, cnt):
        if cn < 300 and not outside[lab == i].any(): hair[lab == i] = False
    log("hair tris", int(hair.sum()), "of", nt, f"{time.time()-t0:.0f}s")
    np.save(os.path.join(CACHE, "hair_tri_mask.npy"), hair)
    left = ~hair & (tz > 1.3) & (((br < HAIR_BR) | cream) & ~pink)
    log("DBG leftover hairy-coloured body tris", int(left.sum()), "zone", int((left & zone).sum()), "outside", int((left & outside).sum()))
    reg = ~hair & (tz > 1.42) & (np.abs(tx) > 0.05) & (np.abs(tx) < 0.11)
    log("DBG region tris", int(reg.sum()), "zone", int((reg & zone).sum()), "outside", int((reg & outside).sum()), "br med", np.median(br[reg]), "gr med", np.median(gr[reg]), "rgb", tcol[reg].mean(0), "ty", ty[reg].min(), ty[reg].max(), "tz", tz[reg].min(), tz[reg].max())
    if left.any():
        L = np.where(left)[0]
        log("DBG leftover bbox x", tx[L].min(), tx[L].max(), "y", ty[L].min(), ty[L].max(), "z", tz[L].min(), tz[L].max())

    # --- split into two objects
    poly_hair = np.zeros(len(me.polygons), bool)
    poly_hair[tpoly[hair]] = True
    ob = o.copy(); ob.data = me.copy(); ob.name = "body"; ob.data.name = "body"
    oh = o.copy(); oh.data = me.copy(); oh.name = "hair"; oh.data.name = "hair"
    for obj in (ob, oh): bpy.context.scene.collection.objects.link(obj)

    def keep(obj, mask):
        bm = bmesh.new(); bm.from_mesh(obj.data)
        bm.faces.ensure_lookup_table()
        dele = [f for f in bm.faces if not mask[f.index]]
        bmesh.ops.delete(bm, geom=dele, context='FACES')
        loose = [v for v in bm.verts if not v.link_faces]
        bmesh.ops.delete(bm, geom=loose, context='VERTS')
        bm.to_mesh(obj.data); bm.free()
    keep(ob, ~poly_hair); keep(oh, poly_hair)
    log("body tris", len(ob.data.polygons), "hair tris", len(oh.data.polygons))
    o.hide_set(True)
    cap_scalp(ob)
    bpy.ops.wm.save_as_mainfile(filepath=blend(1))
    log(f"classify done {time.time()-t0:.0f}s")


def cap_scalp(ob):
    """The Meshy head is only a face mask (open at the back/top, the skull was fused into the hair).
    Find the big open rim, loft it into a smooth skull dome, colour it with a forehead skin texel."""
    me = ob.data
    bm = bmesh.new(); bm.from_mesh(me)
    uvl = bm.loops.layers.uv[0]
    # forehead skin UV: the rim vertex nearest the forehead centre
    cand = [l for f in bm.faces for l in f.loops if abs(l.vert.co.x) < 0.03 and l.vert.co.y < -0.09 and 1.40 < l.vert.co.z < 1.46]
    fuv = Vector((0.5, 0.5))
    if cand:
        img = [n.image for n in me.materials[0].node_tree.nodes if n.type == 'TEX_IMAGE' and n.outputs[0].links
               and n.outputs[0].links[0].to_socket.name == 'Base Color'][0]
        W_, H_ = img.size
        pxs = np.empty(W_ * H_ * 4, np.float32); img.pixels.foreach_get(pxs); pxs = pxs.reshape(H_, W_, 4)
        uvs = np.array([l[uvl].uv[:] for l in cand])
        cols = pxs[np.clip((uvs[:, 1] * H_).astype(int), 0, H_ - 1), np.clip((uvs[:, 0] * W_).astype(int), 0, W_ - 1), :3]
        med = np.median(cols, axis=0)
        k = int(np.argmin(np.abs(cols - med).sum(1)))
        fuv = Vector(uvs[k]); log("scalp UV", fuv, "colour", cols[k], "from", len(cand))
    # weld a copy to find the open rim
    wb = bm.copy()
    bmesh.ops.remove_doubles(wb, verts=wb.verts, dist=1e-5)
    be = [e for e in wb.edges if e.is_boundary]
    adj = {}
    for e in be:
        for v in e.verts: adj.setdefault(v.index, []).append(e)
    seen = set(); best = None
    for e0 in be:
        if e0.index in seen: continue
        comp = []; st = [e0]; seen.add(e0.index)
        while st:
            c = st.pop(); comp.append(c)
            for v in c.verts:
                for f in adj[v.index]:
                    if f.index not in seen: seen.add(f.index); st.append(f)
        if best is None or len(comp) > len(best): best = comp
    # order the loop
    nxt = {}
    for e in best:
        a, b = e.verts
        nxt.setdefault(a.index, []).append(b.index); nxt.setdefault(b.index, []).append(a.index)
    wb.verts.ensure_lookup_table()
    start = min(nxt, key=lambda i: (wb.verts[i].co.z, wb.verts[i].co.x))
    order = [start]; prev = None; cur = start; used = {start}
    while True:
        cands = [n for n in nxt[cur] if n not in used]
        if not cands: break
        prev, cur = cur, cands[0]; order.append(cur); used.add(cur)
    rim = np.array([wb.verts[i].co[:] for i in order], np.float64)
    log("scalp rim loop verts", len(rim), "of", len(nxt), "bbox", rim.min(0), rim.max(0))
    wb.free()
    # smooth the ragged rim a little for the loft (ring 0 keeps the true positions)
    C = np.array([0.0, 0.0, 1.36])
    top_hair = [v.co.z for v in bpy.data.objects["hair"].data.vertices if v.co.y < 0.04 and v.co.z > 1.45]
    zt = float(np.percentile(top_hair, 97)) if top_hair else 1.57
    P = np.array([0.0, 0.03, zt - 0.035])
    K = 14
    n = len(rim)
    cap = bmesh.new(); cuv = cap.loops.layers.uv.new("UVMap")
    rings = []
    d0 = rim - C; r0 = np.linalg.norm(d0, axis=1)
    dP = P - C; rP = np.linalg.norm(dP)
    back = np.clip((rim[:, 1] + 0.10) / 0.12, 0, 1)             # 0 at the face, 1 behind the ears
    for k in range(K):
        t = k / K
        te = t * t * (3 - 2 * t) if k else 0.0
        d = d0 * (1 - te) + dP * te
        d /= np.linalg.norm(d, axis=1)[:, None]
        rad = r0 * (1 - te) + rP * te
        q = C + d * rad[:, None]
        q[:, 1] -= back * 0.03 * math.sin(math.pi * te)       # back-of-skull bulge
        if k: q[:, 0] *= 1.0 + 0.04 * math.sin(math.pi * te)
        rings.append([cap.verts.new(tuple(x)) for x in q])
    apex = cap.verts.new(tuple(P))
    for k in range(K - 1):
        for i in range(n):
            j = (i + 1) % n
            cap.faces.new((rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i]))
    for i in range(n):
        j = (i + 1) % n
        cap.faces.new((rings[K - 1][i], rings[K - 1][j], apex))
    bmesh.ops.recalc_face_normals(cap, faces=cap.faces)
    cap.faces.ensure_lookup_table()
    if cap.faces[len(cap.faces) // 2].normal.dot(Vector(P - C)) < 0:
        bmesh.ops.reverse_faces(cap, faces=cap.faces)
    for f in cap.faces:
        for l in f.loops: l[cuv].uv = fuv
    cm = bpy.data.meshes.new("cap"); cap.to_mesh(cm); cap.free()
    co_ = bpy.data.objects.new("cap", cm); bpy.context.scene.collection.objects.link(co_)
    # join into body
    n_body = len(ob.data.vertices)
    for o_ in bpy.context.selected_objects: o_.select_set(False)
    co_.select_set(True); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    co_.data.materials.append(ob.data.materials[0])
    bm.free()
    bpy.ops.object.join()
    vgc = ob.vertex_groups.new(name="cap")
    vgc.add(list(range(n_body, len(ob.data.vertices))), 1.0, 'REPLACE')
    log("cap joined; body tris now", len(ob.data.polygons))


# ------------------------------------------------------------------ decimate + re-UV
# NOTE: the Meshy atlas is a patchwork of ~500 tiny islands; collapsing across/along those seams smeared UVs into
# shards on the face. So: weld (drop the old UVs), decimate on clean topology, re-unwrap, then re-bake everything
# (colour, normal, roughness) from the original high-poly. The old atlas is only used as bake *source*.
def smooth_welded_normals(ob):
    me = ob.data
    me.calc_loop_triangles()
    co = arr(me.vertices, 'co', 3, np.float64)
    nt = len(me.loop_triangles)
    tv = np.empty(nt * 3, np.int32); me.loop_triangles.foreach_get('vertices', tv); tv = tv.reshape(-1, 3)
    fn = np.cross(co[tv[:, 1]] - co[tv[:, 0]], co[tv[:, 2]] - co[tv[:, 0]])      # area-weighted
    acc = np.zeros((len(co), 3))
    for k in range(3): np.add.at(acc, tv[:, k], fn)
    nrm = acc / np.maximum(np.linalg.norm(acc, axis=1), 1e-12)[:, None]
    for p in me.polygons: p.use_smooth = True
    me.normals_split_custom_set_from_vertices(nrm.tolist())


def weld(ob):
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    while bm.loops.layers.uv:
        bm.loops.layers.uv.remove(bm.loops.layers.uv[0])
    bm.to_mesh(ob.data); bm.free()
    while ob.data.uv_layers: ob.data.uv_layers.remove(ob.data.uv_layers[0])


def stage_decimate():
    t0 = time.time()
    bpy.ops.wm.open_mainfile(filepath=blend(1))
    ob, oh = bpy.data.objects["body"], bpy.data.objects["hair"]
    weld(ob); weld(oh)
    # NOTE Blender's collapse-decimate vertex group means "how much to decimate here" (1 = full, 0 = untouched), i.e. the
    # opposite of a protect mask. Head/neck get a low weight so the face keeps ~8-10k tris; the rest absorbs the budget.
    HEADW = float(os.environ.get("HEADW", "1.0")); OTHERW = float(os.environ.get("OTHERW", "0.999"))
    vg = ob.vertex_groups.new(name="keep")
    for v in ob.data.vertices:
        c = v.co
        w = OTHERW
        if c.z > 1.22 and abs(c.x) < 0.16: w = HEADW                                    # head + neck top
        elif 0.6 < c.z < 1.05 and abs(c.x) > 0.5: w = OTHERW                             # hands
        elif c.z < 0.12: w = OTHERW                                                    # feet
        vg.add([v.index], w, "REPLACE")
    for obj, tgt, use_vg in ((ob, BODY_TRIS, True), (oh, HAIR_TRIS, False)):
        bpy.context.view_layer.objects.active = obj
        for o_ in bpy.context.selected_objects: o_.select_set(False)
        obj.select_set(True)
        n0 = len(obj.data.polygons)
        m = obj.modifiers.new("dec", 'DECIMATE'); m.decimate_type = 'COLLAPSE'
        m.use_collapse_triangulate = True
        if use_vg:
            m.vertex_group = "keep"; m.vertex_group_factor = 1.0
        lo_r, hi_r = 0.005, 1.0
        m.ratio = tgt / n0
        for _ in range(8):                       # bisect the ratio so the result lands within ~4% of the target
            n_ev = len(obj.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh().polygons)
            if abs(n_ev - tgt) < 0.04 * tgt: break
            if n_ev > tgt: hi_r = m.ratio
            else: lo_r = m.ratio
            m.ratio = (lo_r + hi_r) / 2
        bpy.ops.object.modifier_apply(modifier="dec")
        log(obj.name, n0, "->", len(obj.data.polygons))
        if use_vg:
            hz = sum(1 for p_ in obj.data.polygons if obj.data.vertices[p_.vertices[0]].co.z > 1.22 and abs(obj.data.vertices[p_.vertices[0]].co.x) < 0.16)
            log("head tris (z>1.22)", hz)
        smooth_welded_normals(obj)
    ob.vertex_groups.remove(ob.vertex_groups['keep'])
    ob.name, oh.name = "body_lo", "hair_lo"
    ob.data.name, oh.data.name = "body_lo", "hair_lo"
    reunwrap(ob, oh)
    bpy.ops.wm.save_as_mainfile(filepath=blend(2))
    log(f"decimate+unwrap done {time.time()-t0:.0f}s; body {len(bpy.data.objects['body_lo'].data.polygons)} hair {len(bpy.data.objects['hair_lo'].data.polygons)} tris")


def reunwrap(ob, oh):
    """Smart-UV both meshes into ONE shared atlas, head islands get ~2.5x the texel area, then split again."""
    sc = bpy.context.scene
    ob.data.materials.clear(); oh.data.materials.clear()
    m0 = bpy.data.materials.new("m0"); m1 = bpy.data.materials.new("m1")
    ob.data.materials.append(m0); ob.data.materials.append(m1); oh.data.materials.append(m0); oh.data.materials.append(m1)
    for p in oh.data.polygons: p.material_index = 1
    for o_ in bpy.context.selected_objects: o_.select_set(False)
    ob.select_set(True); oh.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.join()                      # oh is consumed; body object now holds both
    j = ob
    j.data.uv_layers.new(name="UVMap")
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(85), island_margin=0.003, area_weight=0.0, correct_aspect=True,
                             scale_to_bounds=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    # boost head islands (face carries the detail): scale each head island about its own centre
    me = j.data
    uvd = me.uv_layers[0].data
    bm = bmesh.new(); bm.from_mesh(me); uvl = bm.loops.layers.uv[0]
    bm.faces.ensure_lookup_table()
    # islands = faces connected through shared *uv* coordinates
    parent = {}
    def find(a):
        while parent.setdefault(a, a) != a:
            parent[a] = parent[parent[a]]; a = parent[a]
        return a
    for f in bm.faces:
        for l in f.loops:
            k = (l.vert.index, round(l[uvl].uv.x, 5), round(l[uvl].uv.y, 5))
            parent.setdefault(k, k)
        ks = [(l.vert.index, round(l[uvl].uv.x, 5), round(l[uvl].uv.y, 5)) for l in f.loops]
        for k in ks[1:]: parent[find(k)] = find(ks[0])
    isl = {}
    for f in bm.faces:
        l = f.loops[0]
        isl.setdefault(find((l.vert.index, round(l[uvl].uv.x, 5), round(l[uvl].uv.y, 5))), []).append(f)
    nhead = 0
    for faces in isl.values():
        cz = sum(f.calc_center_median().z for f in faces) / len(faces)
        if faces[0].material_index == 0 and cz > 1.22:
            pts = [l[uvl].uv for f in faces for l in f.loops]
            cx = sum(p.x for p in pts) / len(pts); cy = sum(p.y for p in pts) / len(pts)
            for p in pts:
                p.x = cx + (p.x - cx) * 1.6; p.y = cy + (p.y - cy) * 1.6
            nhead += 1
    log("uv islands", len(isl), "head islands boosted", nhead)
    bm.to_mesh(me); bm.free()
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.select_all(action='SELECT')
    bpy.ops.uv.pack_islands(rotate=True, margin=0.003)
    bpy.ops.mesh.select_all(action='DESELECT')
    bpy.ops.object.mode_set(mode='OBJECT')
    # split back by material index
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='DESELECT')
    bpy.ops.object.mode_set(mode='OBJECT')
    for p in j.data.polygons: p.select = (p.material_index == 1)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.separate(type='SELECTED')
    bpy.ops.object.mode_set(mode='OBJECT')
    parts = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith("body_lo")]
    hair_new = [o for o in parts if o != j][0]
    hair_new.name = "hair_lo"; hair_new.data.name = "hair_lo"
    j.name = "body_lo"
    for o_ in (j, hair_new):
        o_.data.materials.clear()
        for p in o_.data.polygons: p.material_index = 0
    cap_set_uv(j)


def cap_set_uv(ob):
    """Scalp-cap faces have no surface in the high-poly: collapse their UVs onto one forehead skin texel."""
    me = ob.data
    bm = bmesh.new(); bm.from_mesh(me); uvl = bm.loops.layers.uv[0]
    dv = bm.verts.layers.deform.verify()
    gi = ob.vertex_groups["cap"].index
    target = Vector((0.0, -0.11, 1.44))
    best = None
    for f in bm.faces:
        for l in f.loops:
            d = (l.vert.co - target).length
            if (best is None or d < best[0]) and gi not in l.vert[dv]:
                best = (d, l[uvl].uv.copy())
    n = 0
    for f in bm.faces:
        if all(gi in l.vert[dv] for l in f.loops):
            for l in f.loops: l[uvl].uv = best[1]
            n += 1
    log("cap faces collapsed onto forehead texel", n, "uv", best[1])
    bm.to_mesh(me); bm.free()


# ------------------------------------------------------------------ bake
def bake_pass(sc, hi, lo, kind, name, colorspace, samples, extra=None):
    img = bpy.data.images.new(name, TEX, TEX, alpha=False, float_buffer=False)
    img.colorspace_settings.name = colorspace
    mt = bpy.data.materials.new("bake_" + name); mt.use_nodes = True
    node = mt.node_tree.nodes.new('ShaderNodeTexImage'); node.image = img
    mt.node_tree.nodes.active = node
    lo.data.materials.clear(); lo.data.materials.append(mt)
    sc.cycles.samples = samples
    for o_ in bpy.context.selected_objects: o_.select_set(False)
    hi.select_set(True); lo.select_set(True); bpy.context.view_layer.objects.active = lo
    t = time.time()
    if extra: extra()
    bpy.ops.object.bake(type=kind)
    q = np.empty(TEX * TEX * 4, np.float32); img.pixels.foreach_get(q)
    log(f"bake {kind} {time.time()-t:.0f}s  mean rgb {q.reshape(-1,4)[:, :3].mean(0)}  nonzero px {int((q.reshape(-1,4)[:, :3].sum(1) > 0).sum())}")
    return img


def stage_bake():
    t0 = time.time()
    bpy.ops.wm.open_mainfile(filepath=blend(2))
    sc = bpy.context.scene
    hi = bpy.data.objects["hi"]; hi.hide_set(False); hi.hide_viewport = False; hi.hide_render = False
    body, hair = bpy.data.objects["body_lo"], bpy.data.objects["hair_lo"]

    for o_ in bpy.context.selected_objects: o_.select_set(False)
    tmp_b = body.copy(); tmp_b.data = body.data.copy(); tmp_h = hair.copy(); tmp_h.data = hair.data.copy()
    for o_ in (tmp_b, tmp_h): sc.collection.objects.link(o_)
    tmp_b.select_set(True); tmp_h.select_set(True); bpy.context.view_layer.objects.active = tmp_b
    bpy.ops.object.join()
    lo = tmp_b; lo.name = "lo_all"

    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'; sc.cycles.use_denoising = False
    b = sc.render.bake
    b.use_selected_to_active = True
    b.cage_extrusion = 0.004; b.max_ray_distance = 0.03
    b.margin = 12; b.margin_type = 'EXTEND'; b.target = 'IMAGE_TEXTURES'; b.use_clear = True
    b.normal_space = 'TANGENT'

    def colour_only():
        b.use_pass_direct = False; b.use_pass_indirect = False; b.use_pass_color = True
    nimg = bake_pass(sc, hi, lo, 'NORMAL', "doll_normal", 'Non-Color', 2)
    cimg = bake_pass(sc, hi, lo, 'DIFFUSE', "doll_basecolor", 'sRGB', 4, colour_only)
    rimg = bake_pass(sc, hi, lo, 'ROUGHNESS', "doll_rough_raw", 'Non-Color', 2)

    # ---- roughness floor + metal 0 (source metal channel is ~1 everywhere; chrome blobs = low rough + metal)
    px = np.empty(TEX * TEX * 4, np.float32); rimg.pixels.foreach_get(px); px = px.reshape(TEX, TEX, 4)
    log("baked roughness min/mean/max", px[..., 1].min(), px[..., 1].mean(), px[..., 1].max())
    rough = np.maximum(px[..., 1], 0.3)
    orm = np.stack([np.ones_like(rough), rough, np.zeros_like(rough), np.ones_like(rough)], -1)
    ormimg = bpy.data.images.new("doll_orm", TEX, TEX, alpha=False); ormimg.colorspace_settings.name = 'Non-Color'
    ormimg.pixels.foreach_set(orm.ravel())
    bpy.data.images.remove(rimg)

    # ---- final material (shared by body + hair)
    mat = bpy.data.materials.new("doll")
    mat.use_nodes = True
    nt = mat.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(bsdf.outputs[0], out.inputs[0])

    def tex(img, cs):
        n = nt.nodes.new('ShaderNodeTexImage'); n.image = img; return n   # colour space was set at creation (re-setting wipes generated images)
    tc = tex(cimg, 'sRGB'); nt.links.new(tc.outputs[0], bsdf.inputs['Base Color'])
    tr = tex(ormimg, 'Non-Color'); sp = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(tr.outputs[0], sp.inputs[0])
    nt.links.new(sp.outputs[1], bsdf.inputs['Roughness']); nt.links.new(sp.outputs[2], bsdf.inputs['Metallic'])
    tn = tex(nimg, 'Non-Color'); nm = nt.nodes.new('ShaderNodeNormalMap')
    nt.links.new(tn.outputs[0], nm.inputs['Color']); nt.links.new(nm.outputs[0], bsdf.inputs['Normal'])
    for o_ in (body, hair):
        o_.data.materials.clear(); o_.data.materials.append(mat)
    bpy.data.objects.remove(lo, do_unlink=True)
    for img, fn in ((nimg, "normal"), (cimg, "basecolor"), (ormimg, "rough_metal")):
        q = np.empty(TEX * TEX * 4, np.float32); img.pixels.foreach_get(q)
        log("saving", fn, "mean", q.reshape(-1, 4)[:, :3].mean(0), "size", tuple(img.size), "gen", img.source)
        img.filepath_raw = os.path.join(CACHE, f"meshyA_{fn}_2k.png"); img.file_format = 'PNG'; img.save(); img.pack()
    hi.hide_render = True; hi.hide_viewport = True
    bpy.ops.wm.save_as_mainfile(filepath=blend(3))
    log(f"bake done {time.time()-t0:.0f}s")


# ------------------------------------------------------------------ export
def stage_export():
    bpy.ops.wm.open_mainfile(filepath=blend(3))
    for nm, fn in (("body_lo", "meshy_doll_body_lod0.glb"), ("hair_lo", "meshy_doll_hair_lod0.glb")):
        for o_ in bpy.data.objects: o_.select_set(False)
        o = bpy.data.objects[nm]; o.hide_viewport = False; o.select_set(True)
        bpy.context.view_layer.objects.active = o
        path = os.path.join(OUT, fn)
        bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format='GLB', export_yup=True,
                                  export_apply=False, export_image_format='JPEG', export_jpeg_quality=90, export_materials='EXPORT',
                                  export_normals=True, export_cameras=False, export_lights=False)
        log(fn, os.path.getsize(path) // 1024, "KB", len(o.data.polygons), "tris")


# ------------------------------------------------------------------ render previews
def stage_render():
    bpy.ops.wm.open_mainfile(filepath=blend(3))
    os.makedirs(SHOTS, exist_ok=True)
    sc = bpy.context.scene
    for eid in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):
        try:
            sc.render.engine = eid; break
        except TypeError:
            continue
    sc.render.resolution_x, sc.render.resolution_y = 900, 1100
    sc.view_settings.view_transform = 'AgX'
    w = bpy.data.worlds.new("W"); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.6, 0.6, 0.62, 1); bg.inputs[1].default_value = 1.0
    cam_d = bpy.data.cameras.new("cam"); cam = bpy.data.objects.new("cam", cam_d); sc.collection.objects.link(cam); sc.camera = cam
    ct = bpy.data.objects.new("ct", None); sc.collection.objects.link(ct)
    tc = cam.constraints.new('TRACK_TO'); tc.target = ct; tc.track_axis = 'TRACK_NEGATIVE_Z'; tc.up_axis = 'UP_Y'

    def mk(name, off, e, s):
        d = bpy.data.lights.new(name, 'AREA'); d.energy = e; d.size = s
        o = bpy.data.objects.new(name, d); sc.collection.objects.link(o); o.parent = cam; o.location = off
    mk("key", (1.5, 1.0, 0.5), 400, 3); mk("fill", (-2.0, 0.3, 0.0), 150, 4); mk("rim", (0.0, 2.0, 2.0), 200, 3)
    hi = bpy.data.objects["hi"]; body = bpy.data.objects["body_lo"]; hair = bpy.data.objects["hair_lo"]

    def show(**kw):
        for nm, o in (("hi", hi), ("body", body), ("hair", hair)):
            o.hide_viewport = not kw.get(nm, False); o.hide_render = not kw.get(nm, False)

    def shot(name, azim, focus, dist, lens):
        cam_d.lens = lens; ct.location = focus
        a = math.radians(azim)
        cam.location = (focus.x + dist * math.sin(a), focus.y - dist * math.cos(a), focus.z + dist * 0.03)
        bpy.context.view_layer.update()
        sc.render.filepath = os.path.join(SHOTS, name)
        bpy.ops.render.render(write_still=True)
        return sc.render.filepath

    H = TARGET_H
    bodyc = Vector((0, 0, H * 0.5)); lens_b = 60; dist_full = (H * 1.12) * lens_b / 36.0
    facec = Vector((0, -0.02, 1.38)); lens_f = 85; dist_face = (0.30) * lens_f / 36.0
    show(body=True, hair=True)
    shot("A_full_front.png", 0, bodyc, dist_full, lens_b)
    shot("A_full_back.png", 180, bodyc, dist_full, lens_b)
    shot("A_face_front.png", 0, facec, dist_face, lens_f)
    shot("A_face_34.png", 35, facec, dist_face, lens_f)
    show(body=True)
    shot("A_bald_front.png", 0, Vector((0, 0.0, 1.38)), dist_face * 1.3, lens_f)
    shot("A_bald_34.png", 50, Vector((0, 0.0, 1.38)), dist_face * 1.3, lens_f)
    shot("A_bald_back.png", 180, Vector((0, 0.0, 1.38)), dist_face * 1.3, lens_f)
    shot("A_bald_top.png", 90, Vector((0, 0.0, 1.38)), dist_face * 1.3, lens_f)
    # original vs decimated face (identical camera) -> side by side
    show(hi=True)
    pa = shot("_tmp_face_hi.png", 0, facec, dist_face, lens_f)
    pa2 = shot("_tmp_face34_hi.png", 35, facec, dist_face, lens_f)
    show(body=True, hair=True)
    pb = shot("_tmp_face_lo.png", 0, facec, dist_face, lens_f)
    pb2 = shot("_tmp_face34_lo.png", 35, facec, dist_face, lens_f)
    for (x, y, out) in ((pa, pb, "A_cmp_face_front_orig_vs_lod0.png"), (pa2, pb2, "A_cmp_face_34_orig_vs_lod0.png")):
        ia, ib = bpy.data.images.load(x), bpy.data.images.load(y)
        w_, h_ = ia.size
        A = np.empty(w_ * h_ * 4, np.float32); ia.pixels.foreach_get(A)
        B = np.empty(w_ * h_ * 4, np.float32); ib.pixels.foreach_get(B)
        A = A.reshape(h_, w_, 4); B = B.reshape(h_, w_, 4)
        both = bpy.data.images.new(out, w_ * 2, h_)
        both.pixels.foreach_set(np.concatenate([A, B], axis=1).ravel())
        both.filepath_raw = os.path.join(SHOTS, out); both.file_format = 'PNG'; both.save()
        os.remove(x); os.remove(y)
    # wireframe-ish face for decimation density (workbench)
    log("renders ->", SHOTS)


STAGE = {"classify": stage_classify, "decimate": stage_decimate, "bake": stage_bake, "export": stage_export,
         "render": stage_render}
for st in stages:
    STAGE[st]()

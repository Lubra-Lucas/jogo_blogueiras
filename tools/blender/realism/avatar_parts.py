"""Cabelo (coque + mechas, curves) e roupas (camiseta + saia evase) do avatar realista."""
import bpy, bmesh, math, random
from math import pi, sin, cos
from mathutils import Vector, Matrix
from avatar_build import *


# ---------------------------------------------------------------- utilitarios de malha
def group_vertices(obj, name, thr=.5):
    gi = obj.vertex_groups.get(name)
    if gi is None:
        return set()
    idx = gi.index
    return {v.index for v in obj.data.vertices if any(g.group == idx and g.weight > thr for g in v.groups)}


def region_tris(obj, name):
    sel = group_vertices(obj, name)
    me = obj.data
    me.calc_loop_triangles()
    return [tuple(me.vertices[i].co.copy() for i in t.vertices) for t in me.loop_triangles if all(i in sel for i in t.vertices)]


# ---------------------------------------------------------------- cabelo: coque + mechas
def build_hair(body, mat_main, n_strands=5200):
    from mathutils.bvhtree import BVHTree
    tris = region_tris(body, "scalp")
    verts, faces = [], []
    for t in tris:
        b0 = len(verts)
        verts += [tuple(v) for v in t]
        faces.append((b0, b0 + 1, b0 + 2))
    bvh = BVHTree.FromPolygons([Vector(v) for v in verts], faces)
    allp = [Vector(v) for v in verts]
    top = max(p.z for p in allp)
    ymin = min(p.y for p in allp)
    ymax = max(p.y for p in allp)
    Cc = Vector((0.0, (ymin + ymax) / 2, top - 0.085))   # centro do cranio
    areas = [((t[1] - t[0]).cross(t[2] - t[0])).length / 2 for t in tris]
    tot = sum(areas)

    def sample():
        r_ = random.uniform(0, tot)
        acc = 0
        for t, a in zip(tris, areas):
            acc += a
            if acc >= r_:
                break
        u, v = random.random(), random.random()
        if u + v > 1:
            u, v = 1 - u, 1 - v
        return t[0] + (t[1] - t[0]) * u + (t[2] - t[0]) * v

    def surf(p, lift):
        d = p - Cc
        if d.length < 1e-6:
            d = Vector((0, 0, 1))
        d.normalize()
        hit = bvh.ray_cast(Cc + d * 0.4, -d, 0.6)
        if hit[0] is None:
            return p + d * lift
        n = hit[1]
        if n.dot(d) < 0:
            n = -n
        return hit[0] + n * lift

    Bd = Vector((0.0, 0.42, 0.91)).normalized()
    T = surf(Cc + Bd * 0.2, 0.0)
    nT = (T - Cc).normalized()
    u_ax = Vector((1, 0, 0))
    v_ax = nT.cross(u_ax).normalized()
    u_ax = v_ax.cross(nT).normalized()
    Rb = 0.056
    Cb = T + nT * (Rb * 0.75)

    strands = []
    for _ in range(n_strands):
        R0 = sample()
        dR = (R0 - Cc).normalized()
        dT = (T - Cc).normalized()
        pts = []
        clump = (hash((round(R0.x, 2), round(R0.y, 2))) % 97) / 97.0 * 6.28
        amp = 0.0022 * random.uniform(0.6, 1.2)
        steps = 14
        for i in range(steps + 1):
            ts = (i / steps) ** 0.9
            d = (dR * (1 - ts) + dT * ts)
            d.normalize()
            Pp = surf(Cc + d * 0.15, 0.0020 + 0.0075 * sin(pi * min(1.0, ts * 1.15)) ** 0.8 + 0.0025 * random.random())
            side = Vector((1, 0, 0)).cross((Pp - Cc).normalized()) if abs((Pp - Cc).normalized().x) < 0.95 else Vector((0, 1, 0))
            Pp = Pp + side.normalized() * amp * sin(ts * 9.0 + clump) * sin(pi * ts)
            pts.append(Pp)
        phi0 = random.uniform(0, 2 * pi)
        turns = random.uniform(1.1, 2.3) * (1 if random.random() < .9 else -1)
        th0 = random.uniform(-1.15, -0.85)
        coil = []
        ncoil = 22
        for k in range(ncoil + 1):
            s = k / ncoil
            th = th0 + (pi / 2 - 0.05 - th0) * s ** 0.85
            ph = phi0 + turns * 2 * pi * s
            dirb = u_ax * cos(th) * cos(ph) + v_ax * cos(th) * sin(ph) + nT * sin(th)
            rr = Rb * (1.0 + random.uniform(-.04, .04) + 0.05 * sin(ph * 3 + phi0))
            coil.append(Cb + dirb * rr)
        strands.append(smooth_poly(pts + coil, sub=2))
    hair_main = make_curves("hair_updo", strands, 0.00055, mat_main, tip_taper=0.45)

    loose = []
    cand = [p for p in allp if p.y < ymin + 0.05 and 0.035 < abs(p.x) < 0.075 and p.z < top - 0.04]
    for sgn in (-1, 1):
        side = [p for p in cand if p.x * sgn > 0]
        if not side:
            continue
        for lock in range(2):
            base = random.choice(side)
            Lz = random.uniform(0.15, 0.2) if lock == 0 else random.uniform(0.09, 0.13)
            for j in range(60):
                r0 = base + Vector((random.gauss(0, .005), random.gauss(0, .004), random.gauss(0, .004)))
                pl = []
                for i in range(15):
                    s = i / 14
                    x = r0.x + sgn * (0.012 * sin(pi * min(1, s * 1.1)) + 0.012 * s + (0.01 * s * s if lock else 0))
                    y = r0.y + 0.02 * s - 0.016 * sin(pi * s) + random.gauss(0, .0004)
                    z = r0.z - Lz * s
                    ang = s * 5.5
                    x += sgn * 0.008 * s ** 2 * cos(ang) * (1 if lock == 0 else 0.5)
                    y += 0.008 * s ** 2 * sin(ang)
                    pl.append(Vector((x, y, z)) + Vector((random.gauss(0, 0.0003), 0, 0)))
                loose.append(smooth_poly(pl, 2))
    for _ in range(40):
        R0 = sample()
        n0 = (R0 - Cc).normalized()
        pl = [R0 + n0 * .002]
        d = (n0 + Vector((random.gauss(0, .5), random.gauss(0, .5), random.gauss(0, .5)))).normalized()
        for i in range(8):
            pl.append(pl[-1] + d * 0.009)
            d = (d + Vector((random.gauss(0, .25), random.gauss(0, .25), random.gauss(-0.1, .25)))).normalized()
        loose.append(smooth_poly(pl, 2))
    hair_loose = make_curves("hair_loose", loose, 0.00042, mat_main, tip_taper=0.3)
    return [hair_main, hair_loose], dict(T=T, nT=nT, Cb=Cb, Rb=Rb, Cc=Cc, top=top)


# ---------------------------------------------------------------- roupas
def _apply_mods(o):
    bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers):
        try:
            bpy.ops.object.modifier_apply(modifier=m.name)
        except Exception as e:
            print("mod fail", m.name, e)


def sphere_mesh(r, loc, seg=48):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=r)
    me = bpy.data.meshes.new("sph")
    bm.to_mesh(me)
    bm.free()
    me.transform(Matrix.Translation(Vector(loc)))
    return me


def make_tee(body, mat):
    me = body.data.copy()
    o = bpy.data.objects.new("tee", me)
    link(o)
    bm = bmesh.new()
    bm.from_mesh(me)
    zh = 1.0

    def cut(plane_co, plane_no, clear_inner=False, clear_outer=False):
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=plane_co, plane_no=plane_no,
                               clear_inner=clear_inner, clear_outer=clear_outer, dist=1e-6)

    cut(Vector((0, 0, zh)), Vector((0, 0, 1)), clear_inner=True)
    cut(Vector((0, 0, 1.425)), Vector((0, 0, 1)), clear_outer=True)
    for sgn in (-1, 1):
        S = Vector((sgn * 0.17, 0.0, 1.32))
        a = (Vector((sgn * 0.4935, -0.2424, 0.8685)) - S).normalized()
        P0 = S + a * 0.125
        cut(P0, a)
        dele = [v for v in bm.verts if abs(v.co.x) > 0.16 and (v.co - P0).dot(a) > 1e-5]
        bmesh.ops.delete(bm, geom=dele, context="VERTS")
    bm.verts.ensure_lookup_table()
    seen = set()
    comps = []
    for v in bm.verts:
        if v.index in seen:
            continue
        stack = [v]
        comp = []
        seen.add(v.index)
        while stack:
            x = stack.pop()
            comp.append(x)
            for e in x.link_edges:
                w = e.other_vert(x)
                if w.index not in seen:
                    seen.add(w.index)
                    stack.append(w)
        comps.append(comp)
    comps.sort(key=len, reverse=True)
    for c in comps[1:]:
        bmesh.ops.delete(bm, geom=[v for v in c if v.is_valid], context="VERTS")
    # malha mais fina e suave (apaga mamilos/relevos do corpo) antes do decote
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=2, use_grid_fill=True)
    bmesh.ops.smooth_vert(bm, verts=bm.verts[:], factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    for _ in range(22):
        bmesh.ops.smooth_vert(bm, verts=[v for v in bm.verts if not v.is_boundary and v.co.z > 0.93 and v.co.z < 1.37 and abs(v.co.x) < 0.17], factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    def inside_neck(v):
        yy = v.co.y + 0.02
        bb = 0.098 if yy < 0 else 0.074
        return v.co.z > 1.318 and (v.co.x / 0.080) ** 2 + (yy / bb) ** 2 < 1.0
    dele = [v for v in bm.verts if inside_neck(v) or v.co.z > 1.43]
    bmesh.ops.delete(bm, geom=dele, context="VERTS")
    # remove ilhas outra vez
    bm.verts.ensure_lookup_table()
    seen = set(); comps = []
    for v in bm.verts:
        if v.index in seen:
            continue
        st = [v]; comp = []; seen.add(v.index)
        while st:
            x = st.pop(); comp.append(x)
            for e in x.link_edges:
                w = e.other_vert(x)
                if w.index not in seen:
                    seen.add(w.index); st.append(w)
        comps.append(comp)
    comps.sort(key=len, reverse=True)
    for c in comps[1:]:
        bmesh.ops.delete(bm, geom=[v for v in c if v.is_valid], context="VERTS")
    # suaviza a borda do decote (fica redondo, sem serrilhado)
    for _ in range(14):
        bv = [v for v in bm.verts if v.is_boundary and abs(v.co.x) < 0.12 and v.co.z > 1.28]
        bmesh.ops.smooth_vert(bm, verts=bv, factor=0.6, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bm.to_mesh(me)
    bm.free()
    for g in list(o.vertex_groups):
        o.vertex_groups.remove(g)
    for p in o.data.polygons:
        p.use_smooth = True
    di = o.modifiers.new("ease", "DISPLACE")
    di.strength = 0.010
    di.mid_level = 0.0
    di.direction = "NORMAL"
    sd = o.modifiers.new("sub", "SUBSURF")
    sd.levels = 1
    sd.render_levels = 1
    so = o.modifiers.new("thick", "SOLIDIFY")
    so.thickness = 0.0028
    so.offset = 1.0
    _apply_mods(o)
    o.data.materials.clear()
    o.data.materials.append(mat)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def body_slice(body, z, dz=0.012):
    pts = [v.co for v in body.data.vertices if abs(v.co.z - z) < dz and abs(v.co.x) < 0.26 and v.co.y > -0.2]
    if not pts:
        return 0.15, 0.1, -0.03
    xs = [p.x for p in pts]
    ys = [p.y for p in pts]
    return (max(xs) - min(xs)) / 2, (max(ys) - min(ys)) / 2, (max(ys) + min(ys)) / 2


def make_skirt(body, mat, mat_bow=None):
    z_top, z_hem = 1.07, 0.60
    NROW, NANG, N_FOLD = 40, 220, 12
    bm = bmesh.new()
    rows = []
    for i in range(NROW + 1):
        t = i / NROW
        z = z_top - (z_top - z_hem) * t
        a_b, b_b, cy_b = body_slice(body, z)
        a_w, b_w, cy_w = 0.118, 0.085, -0.058
        a_h, b_h, cy_h = 0.40, 0.375, -0.035
        f = t ** 0.82
        a = a_w + (a_h - a_w) * f
        b = b_w + (b_h - b_w) * f
        cy = cy_w + (cy_h - cy_w) * f
        a = max(a, a_b + 0.034 + 0.02 * t)
        b = max(b, b_b + 0.034 + 0.02 * t)
        amp = 0.12 * (t ** 1.3)
        ring = []
        for j in range(NANG):
            th = 2 * pi * j / NANG
            fold = 1.0 + amp * 0.3 * cos(N_FOLD * th + 0.4 * sin(2 * th))
            hz = 0.014 * cos(N_FOLD * th + 0.4 * sin(2 * th) + pi) * t ** 2.2
            ring.append(bm.verts.new((a * cos(th) * fold, cy + b * sin(th) * fold, z + hz)))
        rows.append(ring)
    for r0, r1 in zip(rows[:-1], rows[1:]):
        for j in range(NANG):
            k = (j + 1) % NANG
            bm.faces.new((r0[j], r1[j], r1[k], r0[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new("skirt")
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new("skirt", me)
    link(o)
    for p in me.polygons:
        p.use_smooth = True
    so = o.modifiers.new("thick", "SOLIDIFY")
    so.thickness = 0.0022
    so.offset = -1.0
    sd = o.modifiers.new("sub", "SUBSURF")
    sd.levels = 1
    sd.render_levels = 1
    me.materials.append(mat)
    # cos (faixa)
    wb = bpy.data.meshes.new("waistband")
    bmw = bmesh.new()
    wr = []
    a_b, b_b, cy_b = body_slice(body, z_top - 0.02)
    for zz_ in (z_top, z_top - 0.035):
        wr.append([bmw.verts.new(((a_b + 0.030) * cos(2 * pi * j / 160), cy_b + (b_b + 0.030) * sin(2 * pi * j / 160), zz_)) for j in range(160)])
    for j in range(160):
        k = (j + 1) % 160
        bmw.faces.new((wr[0][j], wr[1][j], wr[1][k], wr[0][k]))
    bmw.to_mesh(wb)
    bmw.free()
    ow = bpy.data.objects.new("waistband", wb)
    link(ow)
    for p in wb.polygons:
        p.use_smooth = True
    s2 = ow.modifiers.new("thick", "SOLIDIFY")
    s2.thickness = 0.004
    s2.offset = 1.0
    wb.materials.append(mat)
    return [o, ow]

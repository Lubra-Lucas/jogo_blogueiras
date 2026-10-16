"""Shared helpers for the vehicle models (loft bodies, wheels, materials, export, preview).

Car frame used everywhere in the spec code:  x = left (+) / right (-),  f = forward (+),  z = up.
Blender coords are (x, -f, z); the glTF exporter (Y-up) turns that into (x, z, f) -> front = glTF +Z.
"""
import bpy, bmesh, math, os, json, struct
from math import sin, cos, pi, sqrt
from mathutils import Vector, Matrix, Quaternion

OUT_DIR = r"C:\Users\user\Documents\GitHub\jogo_blogueiras\public\assets\vehicles"
SHOT_DIR = r"C:\Users\user\AppData\Local\Temp\claude\shots\cars\models"

MAT_ORDER = ['body', 'trim', 'glass', 'tire', 'rim', 'headlight', 'taillight', 'interior', 'accent']
MI = {n: i for i, n in enumerate(MAT_ORDER)}


def cv(x, f, z):
    return Vector((x, -f, z))


def lin(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    c = [(v / 12.92) if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c]
    return (c[0], c[1], c[2], 1.0)


# ------------------------------------------------------------------ materials
def make_materials(body, accent, rim='#c9ccd2', interior='#7a5a45'):
    mats = {}

    def new(name, col, metal=0.0, rough=0.5, alpha=1.0, coat=0.0, emit=None, estr=0.0):
        m = bpy.data.materials.new(name)
        m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = col
        b.inputs['Metallic'].default_value = metal
        b.inputs['Roughness'].default_value = rough
        b.inputs['Alpha'].default_value = alpha
        if coat:
            b.inputs['Coat Weight'].default_value = coat
            b.inputs['Coat Roughness'].default_value = 0.04
        if emit:
            b.inputs['Emission Color'].default_value = emit
            b.inputs['Emission Strength'].default_value = estr
        if alpha < 1.0:
            try: m.surface_render_method = 'BLENDED'
            except Exception: pass
            try: m.blend_method = 'BLEND'
            except Exception: pass
        mats[name] = m
        return m
    new('body', lin(body), 0.0, 0.25, coat=1.0)
    new('trim', (0.82, 0.83, 0.86, 1), 1.0, 0.16)
    new('glass', (0.02, 0.03, 0.045, 1), 0.0, 0.05, alpha=0.55)
    new('tire', (0.025, 0.025, 0.028, 1), 0.0, 0.85)
    new('rim', lin(rim), 1.0, 0.22)
    new('headlight', (1.0, 0.95, 0.80, 1), 0.0, 0.2, emit=(1.0, 0.93, 0.75, 1), estr=2.0)
    new('taillight', (0.6, 0.02, 0.02, 1), 0.0, 0.25, emit=(1.0, 0.04, 0.03, 1), estr=1.5)
    new('interior', lin(interior), 0.0, 0.6)
    new('accent', lin(accent), 0.0, 0.3, coat=0.6)
    return mats


# ------------------------------------------------------------------ splines
def cr(keys, x):
    """Cardinal (Catmull-Rom style) interpolation through sorted (x, y) keys; flat extrapolation."""
    n = len(keys)
    if x <= keys[0][0]: return keys[0][1]
    if x >= keys[-1][0]: return keys[-1][1]
    i = 0
    while keys[i + 1][0] < x: i += 1
    x0, y0 = keys[i]; x1, y1 = keys[i + 1]
    def tang(k):
        if k == 0: return (keys[1][1] - keys[0][1]) / (keys[1][0] - keys[0][0])
        if k == n - 1: return (keys[-1][1] - keys[-2][1]) / (keys[-1][0] - keys[-2][0])
        return (keys[k + 1][1] - keys[k - 1][1]) / (keys[k + 1][0] - keys[k - 1][0])
    h = x1 - x0; t = (x - x0) / h
    m0 = tang(i) * h; m1 = tang(i + 1) * h
    # clamp tangents to avoid overshoot (monotone-ish)
    d = (y1 - y0)
    if d == 0: return y0
    m0 = max(min(m0, 3 * d), -3 * abs(d)) if d > 0 else min(max(m0, 3 * d), 3 * abs(d))
    m1 = max(min(m1, 3 * d), -3 * abs(d)) if d > 0 else min(max(m1, 3 * d), 3 * abs(d))
    t2 = t * t; t3 = t2 * t
    return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * m1


def sgn(v): return 1.0 if v >= 0 else -1.0


# ------------------------------------------------------------------ Shape (superellipse loft)
class Shape:
    def __init__(s, keys, f0, f1, e0, e1, tumble=0.0, zshrink=0.45, N=32, step=0.25, zoff=None):
        s.keys = keys; s.f0 = f0; s.f1 = f1; s.e0 = e0; s.e1 = e1
        s.tumble = tumble; s.zshrink = zshrink; s.N = N; s.step = step

    def fac(s, f):
        fa = 1.0
        d0 = f - s.f0; d1 = s.f1 - f
        if s.e0 > 0 and d0 < s.e0:
            t = (s.e0 - d0) / s.e0; fa = min(fa, sqrt(max(0.0, 1 - t * t)))
        if s.e1 > 0 and d1 < s.e1:
            t = (s.e1 - d1) / s.e1; fa = min(fa, sqrt(max(0.0, 1 - t * t)))
        return fa

    def params(s, f):
        k = s.keys
        hw = cr(k['hw'], f); zb = cr(k['zb'], f); zt = cr(k['zt'], f)
        nu = cr(k['nu'], f); nl = cr(k['nl'], f)
        fa = s.fac(f)
        hw *= fa
        zc = (zb + zt) / 2; hh = (zt - zb) / 2 * (1 - s.zshrink + s.zshrink * fa)
        return hw, zc, hh, nu, nl

    def fs(s, extra=()):
        K = 5; out = []
        ph = [0.16 + (pi / 2 - 0.16) * k / (K - 1) for k in range(K)]
        if s.e0 > 0: out += [s.f0 + s.e0 * (1 - cos(p)) for p in ph]
        else: out += [s.f0]
        a = s.f0 + s.e0; b = s.f1 - s.e1
        n = max(1, int(round((b - a) / s.step)))
        out += [a + (b - a) * i / n for i in range(1, n)]
        if s.e1 > 0: out += [s.f1 - s.e1 * (1 - cos(p)) for p in reversed(ph)]
        else: out += [s.f1]
        out += list(extra)
        out = sorted(out)
        res = []
        for v in out:
            if not res or v - res[-1] > 0.012: res.append(v)
        return res

    def ring(s, f):
        hw, zc, hh, nu, nl = s.params(f)
        zb = zc - hh; zt = zc + hh
        pts = []
        for j in range(s.N):
            a = 2 * pi * j / s.N; c = cos(a); sn = sin(a)
            n = nu if sn >= 0 else nl
            e = 2.0 / n
            x = hw * sgn(c) * abs(c) ** e
            z = zc + hh * sgn(sn) * abs(sn) ** e
            if s.tumble:
                t = min(1.0, max(0.0, (z - zb) / max(1e-6, zt - zb)))
                x *= 1 - s.tumble * t
            pts.append((x, z))
        return pts

    def metric(s, x, f, z):
        hw, zc, hh, nu, nl = s.params(f)
        if hw <= 1e-6 or hh <= 1e-6: return 9.0
        n = nu if z >= zc else nl
        return (abs(x) / hw) ** n + (abs(z - zc) / hh) ** n

    def surf_x(s, f, z):
        hw, zc, hh, nu, nl = s.params(f)
        n = nu if z >= zc else nl
        v = abs(z - zc) / hh
        if v >= 1: return 0.0
        return hw * (1 - v ** n) ** (1.0 / n)

    def find_f(s, x, z, front=True):
        """f on the surface at (x,z) coming from the front/rear end."""
        lo, hi = (s.f0, s.f1)
        step = 0.004
        f = hi if front else lo
        while lo <= f <= hi:
            if s.metric(x, f, z) < 1.0: break
            f += -step if front else step
        else:
            return None
        a, b = f, f + (step if front else -step)   # a inside, b outside
        for _ in range(20):
            m = (a + b) / 2
            if s.metric(x, m, z) < 1.0: a = m
            else: b = m
        return a

    def normal_at(s, x, f, z):
        e = 0.004
        g = Vector((s.metric(x + e, f, z) - s.metric(x - e, f, z),
                    s.metric(x, f + e, z) - s.metric(x, f - e, z),
                    s.metric(x, f, z + e) - s.metric(x, f, z - e)))
        if g.length < 1e-9: return Vector((0, 1, 0))
        return g.normalized()   # (x, f, z) frame, outward

    def loft(s, bm, extra=(), matfn=None):
        fl = s.fs(extra)
        rings = []
        for f in fl:
            vs = [bm.verts.new(cv(x, f, z)) for (x, z) in s.ring(f)]
            rings.append(vs)
        N = s.N
        fs_ = []; ij = {}
        for i in range(len(rings) - 1):
            for j in range(N):
                a, b = rings[i][j], rings[i][(j + 1) % N]
                c, d = rings[i + 1][(j + 1) % N], rings[i + 1][j]
                try:
                    fq = bm.faces.new((a, b, c, d)); fs_.append(fq); ij[fq.index if False else len(fs_) - 1] = (i, j)
                except ValueError: pass
        fs_.append(bm.faces.new(rings[0])); fs_.append(bm.faces.new(rings[-1]))
        bmesh.ops.recalc_face_normals(bm, faces=fs_)
        for k, fc in enumerate(fs_):
            fc.material_index = MI['body']
            if matfn and k in ij:
                cen = fc.calc_center_median(); n = fc.normal
                fc.material_index = MI[matfn(Vector((cen.x, -cen.y, cen.z)), Vector((n.x, -n.y, n.z)), ij[k][0], ij[k][1])]
        return fs_


# ------------------------------------------------------------------ geometry accumulator
class Acc:
    def __init__(s):
        s.bm = bmesh.new()

    def merge(s, t, mat):
        mi = MI[mat] if isinstance(mat, str) else mat
        for fc in t.faces: fc.material_index = mi
        me = bpy.data.meshes.new('_t'); t.to_mesh(me)
        s.bm.from_mesh(me); bpy.data.meshes.remove(me); t.free()

    def sphere(s, c, r, mat, q=None, u=12, v=8):
        """c car frame, r=(rx, rf, rz) radii in car frame; q optional Quaternion (blender frame)."""
        t = bmesh.new()
        M = Matrix.Translation(cv(*c)) @ (q.to_matrix().to_4x4() if q else Matrix.Identity(4))
        M = M @ Matrix.Diagonal((r[0], r[1], r[2], 1))
        bmesh.ops.create_uvsphere(t, u_segments=u, v_segments=v, radius=1.0, matrix=M)
        s.merge(t, mat)

    def box(s, c, size, mat, q=None, bevel=0.0, seg=2):
        t = bmesh.new()
        M = Matrix.Translation(cv(*c)) @ (q.to_matrix().to_4x4() if q else Matrix.Identity(4))
        M = M @ Matrix.Diagonal((size[0], size[1], size[2], 1))
        bmesh.ops.create_cube(t, size=1.0, matrix=M)
        if bevel > 0:
            bmesh.ops.bevel(t, geom=list(t.edges), offset=bevel, offset_type='OFFSET', segments=seg, profile=0.5, affect='EDGES')
        bmesh.ops.recalc_face_normals(t, faces=t.faces)
        s.merge(t, mat)

    def cyl(s, c, rad, depth, mat, axis='f', seg=12, rad2=None, q=None):
        """cylinder/cone along car axis ('x','f','z')."""
        t = bmesh.new()
        if q is None:
            if axis == 'x': q = Quaternion((0, 1, 0), pi / 2)
            elif axis == 'f': q = Quaternion((1, 0, 0), pi / 2)
            else: q = Quaternion()
        M = Matrix.Translation(cv(*c)) @ q.to_matrix().to_4x4()
        bmesh.ops.create_cone(t, cap_ends=True, cap_tris=False, segments=seg, radius1=rad,
                              radius2=rad if rad2 is None else rad2, depth=depth, matrix=M)
        bmesh.ops.recalc_face_normals(t, faces=t.faces)
        s.merge(t, mat)

    def tube(s, pts, rad, mat, seg=8, closed=False, caps=True):
        """sweep an elliptical ring along a polyline (car-frame points). rad = r or (r_horizontal, r_vertical)."""
        t = bmesh.new()
        P = [cv(*p) for p in pts]
        n = len(P)
        if isinstance(rad, (int, float)): rad = (rad, rad)
        rings = []
        for i in range(n):
            if closed: T = (P[(i + 1) % n] - P[i - 1])
            else: T = (P[min(i + 1, n - 1)] - P[max(i - 1, 0)])
            T.normalize()
            U = Vector((0, 0, 1))
            if abs(T.dot(U)) > 0.95: U = Vector((1, 0, 0))
            Nn = U.cross(T).normalized(); B = T.cross(Nn).normalized()
            vs = []
            for k in range(seg):
                a = 2 * pi * k / seg
                vs.append(t.verts.new(P[i] + Nn * (rad[0] * cos(a)) + B * (rad[1] * sin(a))))
            rings.append(vs)
        rng = n if closed else n - 1
        for i in range(rng):
            A = rings[i]; Bq = rings[(i + 1) % n]
            for k in range(seg):
                t.faces.new((A[k], A[(k + 1) % seg], Bq[(k + 1) % seg], Bq[k]))
        if not closed and caps:
            t.faces.new(rings[0]); t.faces.new(rings[-1])
        bmesh.ops.recalc_face_normals(t, faces=t.faces)
        s.merge(t, mat)


def orient_z(nrm_cf):
    """Quaternion (blender frame) rotating local +Z onto a car-frame direction."""
    d = Vector((nrm_cf[0], -nrm_cf[1], nrm_cf[2])).normalized()
    return d.to_track_quat('Z', 'Y')


def orient_axis(axis, nrm_cf):
    d = Vector((nrm_cf[0], -nrm_cf[1], nrm_cf[2])).normalized()
    return d.to_track_quat(axis, 'Z')


# ------------------------------------------------------------------ wheels
def build_wheel(side, R, w, nspoke=5, spoke_w=0.07, white=False, seg=18, wire=False, hubcap='dome',
                dish=0.28, lug=False):
    """returns a bmesh in hub-local blender coords. side=+1 left (outward +X), -1 right."""
    bm = bmesh.new(); s = side; h = w / 2
    def rev(prof, mat, closed_loop):
        # profile pts (rho, xo) with xo along outward sign already applied separately
        rows = []
        for (rho, xo) in prof:
            rows.append([bm.verts.new(Vector((s * xo, rho * cos(2 * pi * i / seg), rho * sin(2 * pi * i / seg)))) for i in range(seg)])
        fcs = []
        m = len(prof)
        rngp = m if closed_loop else m - 1
        for k in range(rngp):
            A = rows[k]; B = rows[(k + 1) % m]
            for i in range(seg):
                fcs.append((k, bm.faces.new((A[i], A[(i + 1) % seg], B[(i + 1) % seg], B[i]))))
        return fcs
    # tire
    prof = [(0.60 * R, -0.85 * h), (0.86 * R, -h), (0.97 * R, -0.64 * h), (R, -0.22 * h),
            (R, 0.22 * h), (0.97 * R, 0.64 * h), (0.86 * R, h), (0.60 * R, 0.85 * h)]
    fcs = rev(prof, 'tire', False)
    for k, fc in fcs:
        fc.material_index = MI['tire']
        if white and k in (0, 6):  # band between profile pt0-1 and 6-7
            fc.material_index = MI['accent']
    tf = [fc for k, fc in fcs]
    bmesh.ops.recalc_face_normals(bm, faces=tf)
    # rim dish (outer side only), open profile
    xo = 0.80 * h
    dprof = [(0.62 * R, 0.78 * h), (0.57 * R, 0.62 * h), (0.20 * R, (0.50 - dish * 0.3) * h)]
    fr = rev(dprof, 'rim', False)
    for k, fc in fr:
        fc.material_index = MI['rim']
        if fc.normal.x * s < 0 and False: pass
    bm.normal_update()
    for k, fc in fr:
        n = fc.normal
        cen = fc.calc_center_median()
        # outward = +axial and +radial for the lip; just require axial dot > 0
        if n.x * s < 0: fc.normal_flip()
    # lip ring (trim-like rim colour): thin torus-ish band at tire/rim boundary
    lip = [(0.64 * R, 0.80 * h), (0.60 * R, 0.86 * h)]
    # spokes
    spoke_faces = []
    n_sp = nspoke
    for i in range(n_sp):
        phi = 2 * pi * i / n_sp + pi / 2
        L = 0.40 * R
        rm = 0.20 * R + L / 2 + 0.01 * R
        thick = 0.14 * h if not wire else 0.08 * h
        sw = spoke_w if not wire else spoke_w * 0.45
        xc = (0.50 - dish * 0.3) * h * 0.9 + 0.1 * h + thick / 2 + 0.06 * h
        xc = 0.66 * h
        M = Matrix.Rotation(phi, 4, 'X') @ Matrix.Translation((s * xc, rm, 0)) @ Matrix.Diagonal((thick, L, sw, 1))
        t = bmesh.new()
        bmesh.ops.create_cube(t, size=1.0, matrix=M)
        bmesh.ops.recalc_face_normals(t, faces=t.faces)
        for fc in t.faces: fc.material_index = MI['rim']
        me = bpy.data.meshes.new('_t'); t.to_mesh(me); bm.from_mesh(me); bpy.data.meshes.remove(me); t.free()
    # hub cap
    t = bmesh.new()
    cap_r = 0.17 * R
    M = Matrix.Translation((s * 0.62 * h, 0, 0)) @ Matrix.Diagonal((0.55 * h * 0.5 / max(1e-6, cap_r) * cap_r * 1.0, cap_r, cap_r, 1))
    M = Matrix.Translation((s * 0.60 * h, 0, 0)) @ Matrix.Diagonal((0.30 * h, cap_r, cap_r, 1))
    bmesh.ops.create_uvsphere(t, u_segments=8, v_segments=4, radius=1.0, matrix=M)
    bmesh.ops.recalc_face_normals(t, faces=t.faces)
    for fc in t.faces: fc.material_index = MI['trim']
    me = bpy.data.meshes.new('_t'); t.to_mesh(me); bm.from_mesh(me); bpy.data.meshes.remove(me); t.free()
    return bm


def smooth_by_angle(bm, deg=50.0):
    lim = math.radians(deg)
    for fc in bm.faces: fc.smooth = True
    for e in bm.edges:
        if len(e.link_faces) == 2:
            try: ang = e.calc_face_angle()
            except Exception: ang = 0
            e.smooth = ang < lim
        else:
            e.smooth = True


def tri_count(ob):
    me = ob.data; me.calc_loop_triangles(); return len(me.loop_triangles)

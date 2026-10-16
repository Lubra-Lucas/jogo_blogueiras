"""Detalhes colados na superficie da roupa (fitas, tachas, laços) + utilidades"""
import numpy as np, math
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from garment_lib import vnormals


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)


class Attach:
    """points glued to a surface (closest triangle, barycentric, normal offset); evaluated on any state"""
    def __init__(self, V0, tris, pts):
        bv = BVHTree.FromPolygons([tuple(map(float, v)) for v in V0], [tuple(map(int, t)) for t in tris])
        self.tris = tris; self.fi = np.zeros(len(pts), np.int32); self.bc = np.zeros((len(pts), 3)); self.d = np.zeros(len(pts))
        for i, p in enumerate(pts):
            loc, nrm, f, dist = bv.find_nearest(Vector(p))
            a, b, c = V0[tris[f]]; l = np.array(loc)
            v0, v1, v2 = b - a, c - a, l - a
            d00, d01, d11 = v0 @ v0, v0 @ v1, v1 @ v1; d20, d21 = v2 @ v0, v2 @ v1
            den = d00 * d11 - d01 * d01 + 1e-18
            v = (d11 * d20 - d01 * d21) / den; w = (d00 * d21 - d01 * d20) / den
            self.fi[i] = f; self.bc[i] = (1 - v - w, v, w)
            self.d[i] = float(np.dot(np.array(p) - l, np.array(nrm)))

    def eval(self, Vs):
        N = vnormals(Vs, self.tris); tv = self.tris[self.fi]
        P = (Vs[tv] * self.bc[:, :, None]).sum(1); n = (N[tv] * self.bc[:, :, None]).sum(1)
        n /= np.maximum(np.linalg.norm(n, axis=1), 1e-12)[:, None]
        return P + n * self.d[:, None], n

    def weights_src(self):
        return self.tris[self.fi][:, 0]


def cast_surface(V0, tris, origins, dirs):
    bv = BVHTree.FromPolygons([tuple(map(float, v)) for v in V0], [tuple(map(int, t)) for t in tris])
    out = np.full((len(origins), 3), np.nan)
    for i, (o, d) in enumerate(zip(origins, dirs)):
        loc, n, f, dist = bv.ray_cast(Vector(o), Vector(d))
        if loc is not None: out[i] = loc
    return out


def ribbon_polys(m, k):
    return [(i * k + j, i * k + j + 1, (i + 1) * k + j + 1, (i + 1) * k + j) for i in range(m - 1) for j in range(k - 1)]


def ribbon_verts(P, N, profile):
    T = np.gradient(P, axis=0)
    T /= np.maximum(np.linalg.norm(T, axis=1), 1e-12)[:, None]
    S = np.cross(T, N); S /= np.maximum(np.linalg.norm(S, axis=1), 1e-12)[:, None]
    out = np.zeros((len(P), len(profile), 3))
    for j, (s, l) in enumerate(profile): out[:, j] = P + S * s + N * l
    return out.reshape(-1, 3)


def stud_verts(P, N, r, h, nseg=6):
    up = np.array([0, 0, 1.0]); T = np.cross(N, up)
    bad = np.linalg.norm(T, axis=1) < 1e-4; T[bad] = np.cross(N[bad], np.array([1.0, 0, 0]))
    T /= np.linalg.norm(T, axis=1)[:, None]; B = np.cross(N, T)
    out = np.zeros((len(P), nseg + 1, 3))
    for k in range(nseg):
        a = 2 * math.pi * k / nseg
        out[:, k] = P + r * (math.cos(a) * T + math.sin(a) * B) + N * h * 0.25
    out[:, nseg] = P + N * h
    return out.reshape(-1, 3)


def stud_polys(m, nseg=6):
    q = []
    for i in range(m):
        o = i * (nseg + 1)
        for k in range(nseg): q.append((o + k, o + (k + 1) % nseg, o + nseg))
    return q


def orient_polys(polys, Vb, Nref):
    out = []
    for p in polys:
        a, b, c = Vb[p[0]], Vb[p[1]], Vb[p[2]]
        fn = np.cross(b - a, c - a)
        ref = Nref[list(p)].mean(0)
        out.append(tuple(p) if fn @ ref >= 0 else tuple(reversed(p)))
    return out


class AttachF:
    """like Attach but keeps the full offset vector in the triangle frame (points may be far from the surface)"""
    def __init__(self, V0, tris, pts):
        bv = BVHTree.FromPolygons([tuple(map(float, v)) for v in V0], [tuple(map(int, t)) for t in tris])
        self.tris = tris; n = len(pts)
        self.fi = np.zeros(n, np.int32); self.bc = np.zeros((n, 3)); self.o = np.zeros((n, 3))
        for i, p in enumerate(pts):
            loc, nrm, f, dist = bv.find_nearest(Vector(p))
            a, b, c = V0[tris[f]]; l = np.array(loc)
            v0, v1, v2 = b - a, c - a, l - a
            d00, d01, d11 = v0 @ v0, v0 @ v1, v1 @ v1; d20, d21 = v2 @ v0, v2 @ v1
            den = d00 * d11 - d01 * d01 + 1e-18
            v = (d11 * d20 - d01 * d21) / den; w = (d00 * d21 - d01 * d20) / den
            self.fi[i] = f; self.bc[i] = (1 - v - w, v, w)
        E1, N, E2 = self._frames(V0)
        P = (V0[tris[self.fi]] * self.bc[:, :, None]).sum(1)
        d = np.asarray(pts) - P
        self.o = np.stack([(d * E1).sum(1), (d * N).sum(1), (d * E2).sum(1)], 1)

    def _frames(self, Vs):
        tv = self.tris[self.fi]; a, b, c = Vs[tv[:, 0]], Vs[tv[:, 1]], Vs[tv[:, 2]]
        e1 = b - a; e1 /= np.maximum(np.linalg.norm(e1, axis=1), 1e-12)[:, None]
        N = vnormals(Vs, self.tris)[tv]; N = (N * self.bc[:, :, None]).sum(1)
        N /= np.maximum(np.linalg.norm(N, axis=1), 1e-12)[:, None]
        e1 = e1 - N * (e1 * N).sum(1)[:, None]; e1 /= np.maximum(np.linalg.norm(e1, axis=1), 1e-12)[:, None]
        return e1, N, np.cross(N, e1)

    def eval(self, Vs):
        E1, N, E2 = self._frames(Vs); tv = self.tris[self.fi]
        P = (Vs[tv] * self.bc[:, :, None]).sum(1)
        return P + E1 * self.o[:, :1] + N * self.o[:, 1:2] + E2 * self.o[:, 2:3]

    def weights_src(self):
        return self.tris[self.fi][:, 0]


def tube_grid(profile_fn, n_a=9, n_s=8):
    """closed-ended tube along local x in [0,1]: profile_fn(a)->(centre(3), ry, rz). returns verts (local) and polys"""
    V = []
    for i in range(n_a):
        a = i / (n_a - 1); c, ry, rz = profile_fn(a)
        for k in range(n_s):
            ph = 2 * math.pi * k / n_s
            V.append((c[0], c[1] + ry * math.cos(ph), c[2] + rz * math.sin(ph)))
    polys = []
    for i in range(n_a - 1):
        for k in range(n_s):
            polys.append((i * n_s + k, i * n_s + (k + 1) % n_s, (i + 1) * n_s + (k + 1) % n_s, (i + 1) * n_s + k))
    return np.array(V), polys


def bow_local(size=1.0, tails=True):
    """bow in a local frame: x lateral, y outward (normal), z up; returns (verts, polys, per-poly slot name)"""
    allV = []; allP = []; slot = []; off = 0
    def add(V, P, s):
        nonlocal off
        allV.append(V); allP.extend([tuple(i + off for i in p) for p in P]); slot.extend([s] * len(P)); off += len(V)
    for sgn in (1, -1):
        def prof(a, sgn=sgn):
            ang = math.radians(18) * sgn
            x = sgn * (0.008 + 0.062 * a); z = 0.0 + 0.012 * a * 0 + 0.004 * a * sgn * 0
            rz = 0.026 * (0.22 + 0.78 * a) * math.sqrt(max(0, 1 - a ** 6)) + 0.002
            ry = 0.007 * (0.5 + 0.5 * a) + 0.0015
            return (x, 0.0, z + 0.012 * a * (1 if True else 0)), ry, rz
        V, P = tube_grid(prof)
        add(V * size, P, "accent")
    # knot
    def knot(a):
        s = math.sin(math.pi * a)
        return ((-0.011 + 0.022 * a, 0.004, 0.0), 0.011 * s + 0.002, 0.014 * s + 0.002)
    V, P = tube_grid(knot, 7, 8); add(V * size, P, "trim")
    if tails:
        for sgn in (1, -1):
            def tail(a, sgn=sgn):
                return ((sgn * (0.006 + 0.03 * a), 0.003 + 0.004 * a, -0.012 - 0.10 * a), 0.0025, 0.0095 * (1 - 0.15 * a) + 0.0005)
            # tails as flattened tubes along local -z: rotate profile (rz is vertical radius) -> use ry as width instead
            n_a, n_s = 7, 6; V = []
            for i in range(n_a):
                a = i / (n_a - 1); cx = sgn * (0.006 + 0.03 * a); cz = -0.012 - 0.10 * a; cy = 0.003 + 0.004 * a
                w = 0.0095 * (1 + 0.25 * a)
                for k in range(n_s):
                    ph = 2 * math.pi * k / n_s
                    V.append((cx + w * math.cos(ph), cy + 0.0025 * math.sin(ph), cz))
            P = [(i * n_s + k, i * n_s + (k + 1) % n_s, (i + 1) * n_s + (k + 1) % n_s, (i + 1) * n_s + k) for i in range(n_a - 1) for k in range(n_s)]
            add(np.array(V) * size, P, "accent")
    return np.concatenate(allV), allP, slot

"""1. Espartilho (corset): decote coracao, barbatanas em relevo, busk dourado na frente, cadarco atras. Cortado do corpo."""
import numpy as np, math
from collections import defaultdict
from garment_lib import *
from garment_extras import *

YC = -0.02


def zt_fn(x, y):
    f = smoothstep(0.0, 0.05, -(y - YC))
    return 1.132 + f * (0.034 * np.exp(-((np.abs(x) - 0.045) / 0.03) ** 2) - 0.016 * np.exp(-(x / 0.014) ** 2))


def zb_fn(x, y):
    f = smoothstep(0.0, 0.05, -(y - YC))
    return 0.862 - f * 0.022 * np.exp(-(x / 0.07) ** 2) - (1 - f) * 0.006


def largest_component(tris, ids):
    vt = defaultdict(list)
    for t in ids:
        for v in tris[t]: vt[v].append(t)
    seen = set(); best = []
    for t0 in ids:
        if t0 in seen: continue
        st = [t0]; seen.add(t0); cur = []
        while st:
            t = st.pop(); cur.append(t)
            for v in tris[t]:
                for u in vt[v]:
                    if u not in seen: seen.add(u); st.append(u)
        if len(cur) > len(best): best = cur
    return best


def build(body):
    P0 = body.P0; tris = body.tris
    c = P0[tris].mean(1)
    arm = body.group_mask("Arm", "Hand", "Shoulder", thr=0.5)
    sel = (c[:, 2] >= zb_fn(c[:, 0], c[:, 1]) - 0.006) & (c[:, 2] <= zt_fn(c[:, 0], c[:, 1]) + 0.006) & (np.abs(c[:, 0]) < 0.15) & ~arm[tris].any(1)
    ft = tris[largest_component(tris, np.where(sel)[0])]
    V = np.unique(ft); remap = -np.ones(body.n, np.int32); remap[V] = np.arange(len(V))
    polys = [tuple(int(remap[i]) for i in t) for t in ft]
    n = len(V); g = Graph(n, polys)
    log("corset base verts", n, "tris", len(polys))
    ring = np.round(P0[V, 2] / 0.005).astype(int)
    z0 = P0[V, 2]
    wfade = smoothstep(0.85, 0.95, z0) * (1 - smoothstep(-0.02, 0.0, (z0 - zt_fn(P0[V, 0], P0[V, 1])) + 0.012))
    states = {}
    for s in body.states:
        G = body.P[s][V] + body.nrm[s][V] * 0.008
        def snap(G):
            zt = zt_fn(G[:, 0], G[:, 1]); zb = zb_fn(G[:, 0], G[:, 1])
            top = g.bnd & (np.abs(G[:, 2] - zt) < np.abs(G[:, 2] - zb)); bot = g.bnd & ~top
            G[top, 2] = zt[top]; G[bot, 2] = zb[bot]
            return G
        G = snap(G)
        G = g.taubin(G, 12, fixed=g.bnd)
        G = hull_push(G, ring, wfade)
        G = g.taubin(G, 6, fixed=g.bnd)
        G = clearance(G, body, s, 0.006, 2)
        G = g.taubin(G, 2, fixed=g.bnd)
        G = clearance(G, body, s, 0.006, 1)
        states[s] = G
    base = states["Basis"]
    W = weights_smooth(g, body.W[V].copy(), 3)
    pa = np.array(polys)
    cen = base[pa].mean(1)
    pv = base[pa]
    zt_v = zt_fn(pv[..., 0], pv[..., 1]); zb_v = zb_fn(pv[..., 0], pv[..., 1])
    near = ((zt_v - pv[..., 2]).max(1) < 0.010) | ((pv[..., 2] - zb_v).max(1) < 0.009)
    G = Garment("corset", body)
    G.add(states, polys, ["trim" if q else "base" for q in near], cyl_uv(base, polys, (0, YC)), W)

    def line_pts(theta_deg, zs):
        th = math.radians(theta_deg); d = np.array([math.sin(th), -math.cos(th), 0.0])
        og = np.array([[0, YC, z] for z in zs])
        return cast_surface(base, pa, og, [d] * len(zs))

    def attach_part(pts, builder, k, mat, Nrep):
        at = Attach(base, pa, pts); Vs = {}
        for s in body.states:
            Pp, N = at.eval(states[s]); Vs[s] = builder(Pp, N)
        return at, Vs

    def seam(theta, zlo, zhi, step, prof, mat):
        pts = line_pts(theta, np.arange(zlo, zhi, step)); pts = pts[~np.isnan(pts[:, 0])]
        if len(pts) < 4: return
        at = Attach(base, pa, pts); Vs = {s: ribbon_verts(*at.eval(states[s]), prof) for s in body.states}
        k = len(prof); pl = orient_polys(ribbon_polys(len(pts), k), Vs["Basis"], np.repeat(at.eval(base)[1], k, axis=0))
        G.add(Vs, pl, mat, planar_uv(Vs["Basis"], pl), np.repeat(W[at.weights_src()], k, axis=0))

    def studs(thetas, zs, r, h, mat):
        pts = []
        for th in thetas:
            q = line_pts(th, zs); pts += [p for p in q if not np.isnan(p[0])]
        if not pts: return
        at = Attach(base, pa, np.array(pts)); Vs = {s: stud_verts(*at.eval(states[s]), r, h) for s in body.states}
        pl = orient_polys(stud_polys(len(pts)), Vs["Basis"], np.repeat(at.eval(base)[1], 7, axis=0))
        G.add(Vs, pl, mat, planar_uv(Vs["Basis"], pl), np.repeat(W[at.weights_src()], 7, axis=0))

    bone = [(-0.0028, 0.0), (0.0, 0.0022), (0.0028, 0.0)]
    for th in (-24, 24, -52, 52, -80, 80, -108, 108, -148, 148):
        seam(th, 0.872, 1.14, 0.0125, bone, "trim")
    seam(0, 0.868, 1.125, 0.0125, [(-0.007, 0.0), (-0.006, 0.0022), (0.006, 0.0022), (0.007, 0.0)], "accent")
    studs([0], np.arange(0.88, 1.12, 0.026), 0.0034, 0.0045, "accent")
    zs_eye = np.arange(0.88, 1.13, 0.025)
    studs([172, 188], zs_eye, 0.0026, 0.003, "accent")
    for i in range(len(zs_eye) - 1):
        for a, b in ((172, 188), (188, 172)):
            m = 5; pts = []
            for k in range(m):
                t = k / (m - 1)
                pts.append(line_pts(a + (b - a) * t, [zs_eye[i] + (zs_eye[i + 1] - zs_eye[i]) * t])[0])
            pts = np.array(pts)
            if np.isnan(pts).any(): continue
            at = Attach(base, pa, pts); prof = [(-0.0016, 0.0), (0.0, 0.0016), (0.0016, 0.0)]
            Vs = {s: ribbon_verts(*at.eval(states[s]), prof) for s in body.states}
            pl = orient_polys(ribbon_polys(m, 3), Vs["Basis"], np.repeat(at.eval(base)[1], 3, axis=0))
            G.add(Vs, pl, "trim", planar_uv(Vs["Basis"], pl), np.repeat(W[at.weights_src()], 3, axis=0))
    mats = {"base": ("#ff3f8e", "latex"), "trim": ("#fff1f6", "satin"), "accent": ("#e8b84a", "gold")}
    meta = dict(id="corset", label="Espartilho coração", slot="top", slots=["base", "trim", "accent"],
                palette={"base": "#ff3f8e", "trim": "#fff1f6", "accent": "#e8b84a"}, finish={"base": "latex", "trim": "satin", "accent": "gold"},
                finishesSupported={"base": ["latex", "satin", "glitter", "matte"], "trim": ["satin", "latex", "pearl", "matte"], "accent": ["gold", "pearl"]},
                covers=["torso"], hides=[])
    return G, mats, meta

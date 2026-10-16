"""Sapatos: peu de pe' en pointe da boneca. Cabedal = casca do pe' (shell), sola/cunha = loft por cortes (raios de baixo para cima na casca),
salto = coluna conica, tiras = fitas coladas na casca. Pe' esquerdo/direito calculados separados (espelho natural da malha).
Convencao dos pes: calcanhar em +y (z ~0.09-0.10), dedos em -y (z ~0), tornozelo (0.135, 0.007, 0.216)."""
import numpy as np, math
from gx3 import *

A_ANK = np.array([0.135, 0.007, 0.216]); T_TIP = np.array([0.128, -0.096, 0.0])
_AX = (T_TIP - A_ANK); FLEN = float(np.linalg.norm(_AX)); _AX = _AX / FLEN
_ND = np.array([0.0, _AX[2], -_AX[1]]); _ND /= np.linalg.norm(_ND)   # dorsal (pe' pra frente/cima)


def foot_uv(P):
    """u: 0 tornozelo .. 1 ponta; dd: >0 lado do peito do pe'"""
    Q = np.array(P, float).copy(); Q[:, 0] = np.abs(Q[:, 0])
    d = Q - A_ANK
    return d @ _AX / FLEN, d @ _ND


def foot_sel(I, ztop):
    return (I.z <= ztop) & (np.abs(I.x) > 0.05) & ~I.arm & ~I.head


def ground_pts(sub):
    return sub


def make_bvh(V, pa):
    return BVHTree.FromPolygons([tuple(map(float, v)) for v in V], [tuple(map(int, t)) for t in pa])


def rigid_part(G, body, V, polys, mat, uvscale=8.0):
    """geometria rigida (so segue ossos): pesos = pontos mais proximos do corpo"""
    V = np.asarray(V, float)
    fi, bc, ds = nearest_info(body, V); tv = body.tris[fi]
    W = (body.W[tv] * bc[:, :, None]).sum(1)
    idx = np.argsort(-W, axis=1)[:, 4:]; np.put_along_axis(W, idx, 0, axis=1)
    W = W / np.maximum(W.sum(1, keepdims=True), 1e-9)
    S = {s: V for s in body.states}
    G.add(S, polys, mat, planar_uv(V, polys, (0, 1), uvscale), W)


def loft_closed(rings, caps=True):
    """rings: lista de (m,3) mesmo m; devolve (V, polys) fechando as pontas com leque"""
    R = len(rings); m = len(rings[0])
    V = np.concatenate(rings); polys = []
    for i in range(R - 1):
        for j in range(m):
            polys.append((i * m + j, i * m + (j + 1) % m, (i + 1) * m + (j + 1) % m, (i + 1) * m + j))
    if caps:
        for end, rev in ((0, True), (R - 1, False)):
            c = V[end * m:(end + 1) * m].mean(0); ci = len(V); V = np.vstack([V, c])
            for j in range(m):
                a, b = end * m + j, end * m + (j + 1) % m
                polys.append((b, a, ci) if rev else (a, b, ci))
    return V, polys


def orient_out(V, polys, ref_pts_fn):
    """orienta cada poly para fora usando um ponto de referencia (centro) por vertice"""
    ref = ref_pts_fn(V)
    return orient_polys(polys, V, ref)


def sole_loft(G, body, r, *, th=0.0045, floor=None, margin=0.0045, K=9, mat="trim", y0=-0.115, y1=0.075, dy=0.005,
              toe_round=0.006, heel_round=0.005, ytoe=None, front_th=None, tip_up=0.0, edge_clamp=0.007, zlim=0.14):
    """sola por cortes. floor(y)-> z do chao (p/ cunha/plataforma) ou None. Retorna dict por pe' com o perfil z_bot(y)"""
    bv = make_bvh(r.base, r.pa); prof = {}
    allV = []; allP = []; off = 0
    for sgn in (1, -1):
        xc = sgn * 0.134
        xs = xc + np.arange(-0.07, 0.0701, 0.003)
        rows = []; ys = []
        for y in np.arange(y0, y1, dy):
            zz = np.full(len(xs), np.nan)
            for k, x in enumerate(xs):
                loc, n, f, d = bv.ray_cast(Vector((x, y, -0.2)), Vector((0, 0, 1)))
                if loc is not None and loc[2] < zlim: zz[k] = loc[2]
            ok = ~np.isnan(zz)
            if ok.sum() < 3: continue
            rows.append((xs[ok], zz[ok])); ys.append(y)
        # fase 1: extensoes e z do topo por corte, suavizados ao longo de y
        R_ = len(rows); XK = np.zeros((R_, K)); ZT = np.zeros((R_, K)); e5 = np.abs(np.linspace(-1, 1, K)) ** 5
        for ri, (xv, zv) in enumerate(rows):
            x0, x1 = xv.min(), xv.max(); cx = (x0 + x1) / 2; hw = (x1 - x0) / 2 + margin
            XK[ri] = cx + np.linspace(-1, 1, K) * hw
            zi = np.interp(XK[ri], xv, zv); ZT[ri] = np.minimum(zi, zi.min() + edge_clamp)
        def sm(A, it=3):
            for _ in range(it):
                P = np.concatenate([A[:1], A, A[-1:]]); A = (P[:-2] + 2 * P[1:-1] + P[2:]) / 4
            return A
        XK = sm(XK, 4); ZT = sm(ZT, 3)
        def ring_from(xk, zt, wf, y):
            cx = xk.mean(); xk = cx + (xk - cx) * wf
            zt = zt - 0.0025 * e5
            fl = floor(y) if floor is not None else None
            zb = zt - th * (1 - 0.35 * e5)
            if front_th is not None and y < front_th[0]: zb = zt - front_th[1] * (1 - 0.35 * e5)
            if fl is not None: zb = np.minimum(zb, fl + 0.004 * e5)
            mid_r = np.array([xk[-1] + 0.0012, y, (zt[-1] + zb[-1]) / 2]); mid_l = np.array([xk[0] - 0.0012, y, (zt[0] + zb[0]) / 2])
            R = [np.array([xk[k], y, zt[k]]) for k in range(K)] + [mid_r] + [np.array([xk[k], y, zb[k]]) for k in range(K - 1, -1, -1)] + [mid_l]
            return np.array(R), zb
        rings = []; yy = []
        for j in range(4, 0, -1):
            s_ = j / 4.0; w = math.sqrt(max(0.0, 1 - s_ * s_)) * 0.9 + 0.1
            R, _ = ring_from(XK[0], ZT[0], w, ys[0] - toe_round * s_); rings.append(R)
        zbs = []
        for ri, y in enumerate(ys):
            R, zb = ring_from(XK[ri], ZT[ri], 1.0, y); rings.append(R); zbs.append((y, zb[K // 2], XK[ri].min(), XK[ri].max()))
        for j in range(1, 5):
            s_ = j / 4.0; w = math.sqrt(max(0.0, 1 - s_ * s_)) * 0.9 + 0.1
            R, _ = ring_from(XK[-1], ZT[-1], w, ys[-1] + heel_round * s_); rings.append(R)
        V, polys = loft_closed(rings)
        cen = np.array([[V[i * (2 * K + 2): (i + 1) * (2 * K + 2)].mean(0)] for i in range(len(rings))]).reshape(-1, 3)
        refs = np.concatenate([V[i * (2 * K + 2): (i + 1) * (2 * K + 2)] - cen[i] for i in range(len(rings))])
        refs = np.vstack([refs, np.zeros((len(V) - len(refs), 3))])
        # tampas: normal = direcao y
        nv = len(rings) * (2 * K + 2)
        refs[nv] = (0, -1, 0); refs[nv + 1] = (0, 1, 0)
        polys = orient_polys(polys, V, refs)
        allV.append(V); allP += [tuple(i + off for i in p) for p in polys]; off += len(V)
        prof[sgn] = dict(zb=zbs, xc=xc)
    rigid_part(G, body, np.concatenate(allV), allP, mat)
    return prof


def sole_at(prof_s, y):
    """z do fundo da sola e x central no corte mais proximo de y"""
    zb = prof_s["zb"]; ya = np.array([a[0] for a in zb])
    i = int(np.argmin(np.abs(ya - y)))
    return zb[i][1], (zb[i][2] + zb[i][3]) / 2, zb[i][2], zb[i][3]


def column(G, body, cx, cy, z_top, z_bot, r_top, r_bot, mat="trim", n=14, dy_bot=0.0, cap_round=True, sq=0.0, rows=6):
    """coluna conica de salto: r_top/r_bot = (rx, ry). sq>0 deixa a secao mais quadrada (salto bloco)"""
    rings = []
    for i in range(rows):
        t = i / (rows - 1)
        z = z_top + (z_bot - z_top) * t
        rx = r_top[0] + (r_bot[0] - r_top[0]) * t; ry = r_top[1] + (r_bot[1] - r_top[1]) * t
        rr = 1.0
        if cap_round and t > 0.93: rr = 0.88
        th = np.arange(n) * 2 * math.pi / n
        if sq > 0:
            c, s = np.cos(th), np.sin(th); e = 2 / (2 + 6 * sq) * 1.0
            xx = np.sign(c) * np.abs(c) ** e; yy = np.sign(s) * np.abs(s) ** e
        else: xx, yy = np.cos(th), np.sin(th)
        ring = np.stack([cx + rx * rr * xx, cy + dy_bot * t + ry * rr * yy, np.full(n, z)], 1)
        rings.append(ring)
    V, polys = loft_closed(rings)
    ctr = np.array([cx, cy, (z_top + z_bot) / 2])
    refs = V - ctr; refs[:, 2] = 0
    nv = rows * n; refs[nv] = (0, 0, 1); refs[nv + 1] = (0, 0, -1)
    # a primeira tampa (topo) fica dentro da sola
    polys = orient_polys(polys, V, refs)
    rigid_part(G, body, V, polys, mat)


def foot_center(r, sgn, z):
    m = (np.sign(r.base[:, 0]) == sgn) & (np.abs(r.base[:, 2] - z) < 0.006)
    P = r.base[m]
    if len(P) == 0: return None
    return (P.min(0) + P.max(0)) / 2


def ring_strap(G, body, r, sgn, z, width=0.008, thick=0.0022, mat="base", n=44, tilt=0.0, lift=0.0):
    """tira fechada em volta do pe'/tornozelo a altura z (raios a partir do centro da secao)"""
    c = foot_center(r, sgn, z)
    if c is None: return
    pts = []
    for k in range(n):
        th = 2 * math.pi * k / n; d = np.array([math.sin(th), -math.cos(th), 0.0])
        o = c.copy(); o[2] = z + tilt * math.cos(th) * 0.0
        loc = cast_surface(r.base, r.pa, [o], [d])[0]
        if not np.isnan(loc[0]): loc = loc.copy(); loc[2] += tilt * (-math.cos(th)); pts.append(loc)
    pts = np.array(pts)
    if len(pts) < 8: return
    pts = np.concatenate([pts, pts[:1]])
    add_ribbon(G, body, r, pts, [(-width / 2, 0.0), (-width / 2, thick * 0.8), (width / 2, thick * 0.8), (width / 2, 0.0)], mat)


def cross_strap(G, body, r, sgn, z, hw=0.03, width=0.007, thick=0.002, mat="base", n=11, dz=0.0):
    """tira que atravessa o peito do pe' em x (raios de frente, direcao +y)"""
    xc = sgn * 0.134
    O = [np.array([xc + hw * (2 * i / (n - 1) - 1), -0.3, z + dz * (1 - (2 * i / (n - 1) - 1) ** 2)]) for i in range(n)]
    pts = cast_surface(r.base, r.pa, O, [np.array([0, 1.0, 0])] * n)
    pts = pts[~np.isnan(pts[:, 0])]
    if len(pts) < 5: return
    add_ribbon(G, body, r, pts, [(-width / 2, 0.0), (-width / 2, thick * 0.8), (width / 2, thick * 0.8), (width / 2, 0.0)], mat)


def vert_strap(G, body, r, sgn, z0, z1, dx=0.0, width=0.007, thick=0.002, mat="base", step=0.008):
    xc = sgn * 0.134 + dx
    zs = np.arange(z0, z1, step)
    O = [np.array([xc, -0.3, z]) for z in zs]
    pts = cast_surface(r.base, r.pa, O, [np.array([0, 1.0, 0])] * len(zs))
    pts = pts[~np.isnan(pts[:, 0])]
    if len(pts) < 4: return
    add_ribbon(G, body, r, pts, [(-width / 2, 0.0), (-width / 2, thick * 0.8), (width / 2, thick * 0.8), (width / 2, 0.0)], mat)


def front_stud(r, sgn, z, dx=0.0):
    p = cast_surface(r.base, r.pa, [np.array([sgn * 0.134 + dx, -0.3, z])], [np.array([0, 1.0, 0])])
    return p[~np.isnan(p[:, 0])]


def shoe_shell(body, G, ztop=0.20, off=0.0045, holes=None, mat="base", target=3000, hem_fn=None, hem_pin=True, smooth=(24, 10, 4), clear=0.0035, minsize=60, keep=True, hem_tol=0.012):
    I = info(body)
    sel = foot_sel(I, ztop)
    hem = (hem_fn or (lambda x, y: ztop + 0 * x)) if hem_pin else None
    offv = off if np.isscalar(off) else off
    r = shell(body, G, sel, off=offv, hem=hem, hem_tol=0.012, hull=False, clear=clear, smooth=smooth, mat=mat, minsize=minsize, target=target, holes=holes, bsm=14)
    if not keep:
        G.parts.pop(); r.hidden = True
    return r


def shoe_meta(gid, label, slot_mats, finishes_unused, supported, covers, hides, tags, lift=0.0, notes=None, height_cm=None):
    base = {k: v[0] for k, v in slot_mats.items()}
    d = meta_of(gid, label, "shoes", list(slot_mats.keys()), base, {k: v[1] for k, v in slot_mats.items()}, supported, covers, hides=hides, tags=tags, notes=notes)
    d["lift"] = lift
    if height_cm is not None: d["heelCm"] = height_cm
    return d


def boundary_loops(r):
    cnt = {}
    for p in r.polys:
        for i in range(len(p)):
            a, b = p[i], p[(i + 1) % len(p)]; k = (a, b) if a < b else (b, a); cnt[k] = cnt.get(k, 0) + 1
    adj = {}
    for (a, b), c in cnt.items():
        if c == 1: adj.setdefault(a, []).append(b); adj.setdefault(b, []).append(a)
    seen = set(); loops = []
    for s0 in adj:
        if s0 in seen: continue
        loop = [s0]; seen.add(s0); prev = None; cur = s0
        while True:
            nx = [n for n in adj[cur] if n != prev and n not in seen]
            if not nx: break
            prev = cur; cur = nx[0]; loop.append(cur); seen.add(cur)
        if len(loop) > 12: loops.append(loop)
    return loops


def edge_trim(G, body, r, mat="trim", width=0.0028, thick=0.0022, it=6, zmax=None, closed=True):
    """vivo/debrum acompanhando a borda aberta do cabedal (suavizada, tampa irregularidades do corte)"""
    for loop in boundary_loops(r):
        P = r.base[loop].copy()
        if len(P) < 16: continue
        for _ in range(it):
            P = (np.roll(P, 1, 0) + 2 * P + np.roll(P, -1, 0)) / 4
        if closed: P = np.concatenate([P, P[:1]])
        add_ribbon(G, body, r, P, [(-width, -0.0005), (-width * 0.8, thick), (width * 0.8, thick), (width, -0.0005)], mat)


def open_top(u0=0.05, u1=0.74, dd0=-0.019, toe_open=None):
    """mascara de recorte (abertura no peito do pe); toe_open=(u,dd): bico aberto"""
    def holes(cen):
        u, dd = foot_uv(cen)
        m = (dd > dd0) & (u > u0) & (u < u1)
        if toe_open is not None: m |= (u > toe_open[0]) & (dd > toe_open[1])
        return m
    return holes

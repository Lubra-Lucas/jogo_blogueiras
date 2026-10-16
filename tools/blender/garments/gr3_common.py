"""Utilidades da rodada 3: meta + helpers comuns."""
from gx3 import *

PAT_ALL = ["xadrez", "floral", "poa", "listras", "leopardo", "jeans", "trico"]
SUP_DEFAULT = {"base": ["matte", "satin", "latex", "glitter"], "trim": ["matte", "satin", "latex"], "accent": ["gold", "pearl", "matte", "satin"],
               "lining": ["satin", "matte"]}


def mk(gid, label, slot, mats, covers, hides, tags, sup=None, notes=None, patterns_ok=True):
    pal = {k: v[0] for k, v in mats.items()}; fin = {k: v[1] for k, v in mats.items()}
    s = {}
    for k, v in mats.items():
        base = list(SUP_DEFAULT.get(k, ["matte", "satin"]))
        if v[1] not in base: base = [v[1]] + base
        s[k] = base
    if sup: s.update(sup)
    d = meta_of(gid, label, slot, list(mats.keys()), pal, fin, s, covers, hides=hides, tags=tags, notes=notes)
    ps = [(k, v[2]) for k, v in mats.items() if len(v) > 2]
    d["patterns"] = dict(slot=ps[0][0] if ps else "base", supported=PAT_ALL if patterns_ok else [], default=ps[0][1] if ps else None)
    return d


def arm_trim(smin):
    return lambda c, r: ["trim" if (r.arm_poly[i] and r.I.s[r.V][r.pa[i]].mean() > smin) else "base" for i in range(len(c))]


def neck_sel(body, I, zmax=1.23):
    return body.group_mask("Neck", thr=0.5) & (I.z < zmax) & ~body.group_mask("Head", thr=0.5)


def leg_x_at(body, z):
    zs, xs, ys = leg_axis(body)
    return float(np.interp(z, zs, xs)), float(np.interp(z, zs, ys))


def leg_crease(G, body, r, z0, z1, mat="trim", w=0.0016, step=0.012):
    """vinco frontal em cada perna (raios de frente para tras na linha do eixo da perna)"""
    for sg in (1, -1):
        O = []; zs = np.arange(z0, z1, step)
        for z in zs:
            x, y = leg_x_at(body, z); O.append(np.array([sg * x, -0.4, z]))
        pts = cast_surface(r.base, r.pa, O, [np.array([0, 1.0, 0])] * len(O))
        pts = pts[~np.isnan(pts[:, 0])]
        if len(pts) > 4: add_ribbon(G, body, r, pts, [(-w, 0.0), (0.0, w * 1.0), (w, 0.0)], mat)


def side_stripe(G, body, r, z0, z1, width=0.007, mat="accent", step=0.014):
    for sg in (1, -1):
        pts = []
        for z in np.arange(z0, z1, step):
            x, y = leg_x_at(body, z)
            o = np.array([sg * 0.40, y, z]); loc = cast_surface(r.base, r.pa, [o], [np.array([-sg, 0.0, 0.0])])[0]
            if not np.isnan(loc[0]): pts.append(loc)
        if len(pts) > 4: add_ribbon(G, body, r, np.array(pts), [(-width, 0.0), (-width * 0.9, 0.0015), (width * 0.9, 0.0015), (width, 0.0)], mat)


def free_ribbon(G, body, r, pts, prof, mat, nref=None):
    """fita livre (pontos longe da casca) colada por AttachF; nref = normais de referencia (n,3) ou None (usa +y/-y)"""
    pts = np.asarray(pts, float)
    at = AttachF(r.base, r.pa, pts)
    k = len(prof); Vs = {}
    if nref is None: nref = np.tile(np.array([0, -1.0, 0]), (len(pts), 1))
    for s in body.states:
        P = at.eval(r.states[s]); Vs[s] = ribbon_verts(P, nref, prof)
    pl = ribbon_polys(len(pts), k)
    pl = orient_polys(pl, Vs["Basis"], np.repeat(nref, k, axis=0))
    G.add(Vs, pl, mat, planar_uv(Vs["Basis"], pl), r.W[np.repeat(at.weights_src(), k)])


def ring_tube(G, body, r, z0, rb=None, h=0.030, bulge=0.016, nth=56, rows=6, mat="base", wob=0.0, ph=0.0, gap=0.006):
    """anel grosso rigido em volta do pescoco (cachecol/gola alta): raio medido no corpo + gap; pesos = pontos mais proximos do corpo"""
    P0 = body.P0; neck = body.group_mask("Neck", "Head", thr=0.5) & (np.abs(P0[:, 2] - z0) < 0.012)
    c = P0[neck][:, :2].mean(0); rr = np.hypot(P0[neck][:, 0] - c[0], P0[neck][:, 1] - c[1]).max()
    rb = rr + gap if rb is None else rb
    rings = []
    for i in range(rows):
        t = i / (rows - 1); th = np.arange(nth) * 2 * math.pi / nth
        rad = rb + bulge * math.sin(math.pi * t) + wob * np.sin(5 * th + ph) * math.sin(math.pi * t)
        rings.append(np.stack([c[0] + rad * np.sin(th), c[1] - rad * np.cos(th), np.full(nth, z0 - h * t)], 1))
    V = np.concatenate(rings); polys = []
    for i in range(rows - 1):
        for j in range(nth):
            polys.append((i * nth + j, i * nth + (j + 1) % nth, (i + 1) * nth + (j + 1) % nth, (i + 1) * nth + j))
    ref = np.stack([np.sin(np.tile(np.arange(nth) * 2 * math.pi / nth, rows)), -np.cos(np.tile(np.arange(nth) * 2 * math.pi / nth, rows)), np.zeros(len(V))], 1)
    polys = orient_polys(polys, V, ref)
    fi, bc, ds = nearest_info(body, V); tv = body.tris[fi]
    W = (body.W[tv] * bc[:, :, None]).sum(1)
    idx = np.argsort(-W, axis=1)[:, 4:]; np.put_along_axis(W, idx, 0, axis=1); W = W / np.maximum(W.sum(1, keepdims=True), 1e-9)
    G.add({s_: V for s_ in body.states}, polys, mat, planar_uv(V, polys, (0, 1), 8.0), W)


def cast_line(r, pts):
    """projeta pontos (x,y,z) na superficie frontal da casca (raio de frente para tras): fitas de lapela/ziper que NAO ficam dentro do peito"""
    out = []
    for p in np.asarray(pts, float):
        loc = cast_surface(r.base, r.pa, [np.array([p[0], -0.4, p[2]])], [np.array([0, 1.0, 0])])[0]
        out.append(loc if not np.isnan(loc[0]) else p)
    return np.array(out)

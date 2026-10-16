"""5. Luvas de opera de cetim (ate o meio do braco) com babado no punho de cima. Cortadas do corpo (maos + bracos)."""
import numpy as np, math
from garment_lib import *
from garment_extras import *
from g_corset import largest_component

S_CUT = 0.70


def build(body):
    P0 = body.P0; tris = body.tris; rig = body.rig
    sel_v = np.zeros(body.n, bool); side = np.zeros(body.n, int); axes = {}
    for sgn, nm in ((1, "Left"), (-1, "Right")):
        b = rig.data.bones[f"mixamorig:{nm}Arm"]; h = np.array(b.head_local); t = np.array(b.tail_local)
        ax = (t - h) / np.linalg.norm(t - h); ln = np.linalg.norm(t - h); axes[sgn] = (h, ax, ln)
        m = body.group_mask(f"{nm}Arm", f"{nm}ForeArm", f"{nm}Hand", thr=0.5)
        s = ((P0 - h) @ ax) / ln
        m &= (s >= S_CUT) & (np.sign(P0[:, 0]) == sgn)
        sel_v |= m; side[m] = sgn
    ft = tris[np.all(sel_v[tris], axis=1)]
    comps = []
    ids = np.arange(len(ft))
    V = np.unique(ft); remap = -np.ones(body.n, np.int32); remap[V] = np.arange(len(V))
    polys = [tuple(int(remap[i]) for i in t) for t in ft]
    n = len(V); g = Graph(n, polys)
    sd = side[V]
    # drop tiny islands: keep the two largest components
    pa = np.array(polys)
    keep_t = largest_component(pa, np.arange(len(pa)))
    log("gloves verts", n, "tris", len(polys))
    # per-vertex cut parameter
    sp = np.zeros(n)
    for sgn in (1, -1):
        h, ax, ln = axes[sgn]; m = sd == sgn
        sp[m] = ((P0[V[m]] - h) @ ax) / ln
    isHand = body.group_mask("Hand", thr=0.5)[V]
    off = np.where(isHand, 0.0032, 0.0045)
    states = {}
    for s in body.states:
        G = body.P[s][V] + body.nrm[s][V] * off[:, None]
        # snap the open edge to the cut plane
        for sgn in (1, -1):
            h, ax, ln = axes[sgn]; m = g.bnd & (sd == sgn) & (np.abs(sp - S_CUT) < 0.08)
            hs = body.P[s][V[m]] * 0 + h  # rest-pose axis (shoulder moves little)
            cur = ((G[m] - h) @ ax) / ln
            G[m] += np.outer(S_CUT - cur, ax) * ln
        G = g.taubin(G, 3, fixed=g.bnd)
        G = clearance(G, body, s, 0.0028, 2)
        states[s] = G
    base = states["Basis"]
    W = weights_smooth(g, body.W[V].copy(), 2)
    G = Garment("gloves", body)
    G.add(states, polys, "base", planar_uv(base, polys, (1, 2), 1.0), W)
    # ruffle cuff: rings built from the boundary loop of each glove
    bidx = np.where(g.bnd & (np.abs(sp - S_CUT) < 0.05))[0]
    for sgn in (1, -1):
        h, ax, ln = axes[sgn]
        loop = [i for i in bidx if sd[i] == sgn]
        c0 = base[loop].mean(0)
        u = base[loop] - c0; u -= np.outer(u @ ax, ax)
        e1 = u[0] / np.linalg.norm(u[0]); e2 = np.cross(ax, e1)
        ang = np.arctan2(u @ e2, u @ e1); loop = [loop[i] for i in np.argsort(ang)]
        m = len(loop); rows = 5
        down = -ax * sgn * 0 + ax  # toward the elbow/wrist = +ax
        Vs = {}
        for s in body.states:
            B = states[s][loop]; c = B.mean(0)
            o = B - c; o -= np.outer(o @ ax, ax); o /= np.linalg.norm(o, axis=1)[:, None]
            rowsP = []
            for r in range(rows):
                t = r / (rows - 1)
                wave = 0.008 * np.sin(np.arange(m) * 2 * math.pi * 5.0 / m) * t * t
                rowsP.append(B + o * (0.002 + 0.030 * np.sin(t * math.pi * 0.55) + 0.004 * t * np.sin(np.arange(m) * 2 * math.pi * 5.0 / m + 1.5))[:, None] + np.outer(0.030 * t * t + 0.0, ax) + np.outer(wave, ax) - np.outer(0.004 * (1 - t), ax))
            Vs[s] = np.concatenate(rowsP)
        pl = []
        for r in range(rows - 1):
            for j in range(m):
                pl.append((r * m + j, r * m + (j + 1) % m, (r + 1) * m + (j + 1) % m, (r + 1) * m + j))
        cen = Vs["Basis"].mean(0)
        refn = np.concatenate([(Vs["Basis"][r * m:(r + 1) * m] - Vs["Basis"][r * m:(r + 1) * m].mean(0)) for r in range(rows)])
        pl = orient_polys(pl, Vs["Basis"], refn)
        Wr = np.tile(W[loop], (rows, 1))
        G.add(Vs, pl, "trim", planar_uv(Vs["Basis"], pl, (1, 2)), Wr)
    mats = {"base": ("#f6c6dc", "satin"), "trim": ("#ffffff", "satin")}
    meta = dict(id="gloves", label="Luvas de ópera", slot="gloves", slots=["base", "trim"],
                palette={"base": "#f6c6dc", "trim": "#ffffff"}, finish={"base": "satin", "trim": "satin"},
                finishesSupported={"base": ["satin", "latex", "lace", "glitter", "matte"], "trim": ["satin", "lace", "pearl", "tulle"]},
                covers=["hands", "forearms", "upperArmsLower"], hides=[], notes="both arms in one mesh; offset 3.2 mm hands / 4.5 mm arms")
    return G, mats, meta

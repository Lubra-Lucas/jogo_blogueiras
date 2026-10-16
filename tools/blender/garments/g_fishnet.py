"""Meias 7/8 arrastao estilizadas: malha de fios losangulares (geometria) com barra de cetim."""
import numpy as np, math
from garment_lib import *
from garment_extras import orient_polys
from gx import meta_of
import g_stockings as ST

NN = 14
W_STRAND = 0.0024


def build(body):
    zs = np.linspace(0.70, 0.13, 27); nr = len(zs)
    th0 = np.arange(NN) * 2 * math.pi / NN; half = math.pi / NN
    bins = np.arange(ST.NB) * 2 * math.pi / ST.NB

    def nodes(state):
        out = []; cen = []
        for sgn in (1, -1):
            C, R = ST.leg_rings(body, state, sgn, zs)
            R = R + 0.0042
            for i in range(nr):
                th = th0 + (half if i % 2 else 0.0)
                r = np.interp(th % (2 * math.pi), np.append(bins, 2 * math.pi), np.append(R[i], R[i][0]))
                P = np.stack([C[i, 0] + r * np.sin(th), C[i, 1] - r * np.cos(th), np.full(NN, zs[i])], 1)
                out.append(P); cen.append(np.tile([C[i, 0], C[i, 1]], (NN, 1)))
        return np.concatenate(out), np.concatenate(cen)

    N = {}; CEN = {}
    for s in body.states:
        P, C = nodes(s)
        P = clearance(P, body, s, 0.003, 2 if s == "Basis" else 1)
        N[s] = P; CEN[s] = C
    idx = lambda leg, i, j: (leg * nr + i) * NN + (j % NN)
    E = []
    for leg in (0, 1):
        for i in range(nr - 1):
            for j in range(NN):
                if i % 2 == 0:
                    E.append((idx(leg, i, j), idx(leg, i + 1, j))); E.append((idx(leg, i, j), idx(leg, i + 1, j - 1)))
                else:
                    E.append((idx(leg, i, j), idx(leg, i + 1, j + 1))); E.append((idx(leg, i, j), idx(leg, i + 1, j)))
    E = np.array(E)
    def strands(P, C):
        a = P[E[:, 0]]; b = P[E[:, 1]]; d = b - a
        n = np.zeros_like(a); n[:, :2] = a[:, :2] - C[E[:, 0]]
        n /= np.maximum(np.linalg.norm(n, axis=1), 1e-9)[:, None]
        sd = np.cross(n, d); sd /= np.maximum(np.linalg.norm(sd, axis=1), 1e-9)[:, None]
        w = sd * W_STRAND
        V = np.stack([a - w, a + w, b + w, b - w], 1).reshape(-1, 3)
        return V
    Vs = {s: strands(N[s], CEN[s]) for s in body.states}
    m = len(E); polys = [(4 * k, 4 * k + 1, 4 * k + 2, 4 * k + 3) for k in range(m)]
    # satin band: ring on the top row of each leg
    bandV = {s: [] for s in body.states}; bpoly = []
    off = 4 * m
    for s in body.states:
        for leg in (0, 1):
            A = N[s][[idx(leg, 0, j) for j in range(NN)]]
            A2 = N[s][[idx(leg, 1, j) for j in range(NN)]]
            ctr = CEN[s][[idx(leg, 0, j) for j in range(NN)]]
            out = np.zeros_like(A); out[:, :2] = A[:, :2] - ctr; out /= np.maximum(np.linalg.norm(out, axis=1), 1e-9)[:, None]
            top = A + out * 0.0012 + np.array([0, 0, 0.014]); bot = A2 * 0.5 + A * 0.5 - np.array([0, 0, 0.003]) + out * 0.0012
            bandV[s].append(np.concatenate([top, bot]))
    for leg in (0, 1):
        o = off + leg * 2 * NN
        for j in range(NN): bpoly.append((o + j, o + (j + 1) % NN, o + NN + (j + 1) % NN, o + NN + j))
    mat_list = ["base"] * len(polys) + ["trim"] * len(bpoly)
    allV = {s: np.concatenate([Vs[s]] + bandV[s]) for s in body.states}
    allP = polys + bpoly
    # weights from the nearest body surface
    fi, bc, ds = nearest_info(body, allV["Basis"])
    tv = body.tris[fi]; Wt = (body.W[tv] * bc[:, :, None]).sum(1)
    Wt = Wt / np.maximum(Wt.sum(1, keepdims=True), 1e-9)
    idxs = np.argsort(-Wt, axis=1)[:, 4:]; np.put_along_axis(Wt, idxs, 0, axis=1); Wt = Wt / np.maximum(Wt.sum(1, keepdims=True), 1e-9)
    uv = []
    for p in allP:
        for v in p: uv.append((allV["Basis"][v, 0] * 8, allV["Basis"][v, 2] * 8))
    G = Garment("fishnet", body)
    G.add(allV, allP, mat_list, np.array(uv), Wt)
    mats = {"base": ("#1c1b22", "satin"), "trim": ("#1c1b22", "satin")}
    meta = meta_of("fishnet", "Meias arrastão", "legwear", ["base", "trim"], {"base": "#1c1b22", "trim": "#1c1b22"}, {"base": "satin", "trim": "satin"},
                   {"base": ["satin", "matte", "latex", "glitter"], "trim": ["satin", "lace", "latex", "matte"]}, ["thighs", "knees", "calves", "ankles"],
                   tags=dict(styles=["goth", "y2k"], colors=["preto"], formality=0.4, rarity="raro"),
                   notes="malha em geometria real (fios), sem alpha; termina no tornozelo")
    return G, mats, meta

"""Meias soquete de canela com babado de renda no punho."""
import numpy as np, math
from garment_lib import *
from garment_extras import orient_polys
from gx import meta_of
import g_stockings as ST

NB = ST.NB


def build(body):
    ztop = 0.255; zbot = 0.118
    nr = int(round((ztop - zbot) / 0.0165)) + 1
    zs = np.linspace(ztop, zbot, nr)
    th = np.arange(NB) * 2 * math.pi / NB
    fr = 4  # frill rows
    states = {s: [] for s in body.states}
    for sgn in (1, -1):
        for s in body.states:
            C, R = ST.leg_rings(body, s, sgn, zs); R = R + 0.0055
            P = np.zeros((nr, NB, 3))
            for i in range(nr):
                P[i, :, 0] = C[i, 0] + R[i] * np.sin(th); P[i, :, 1] = C[i, 1] - R[i] * np.cos(th); P[i, :, 2] = zs[i]
            F = np.zeros((fr, NB, 3))
            for k in range(fr):
                u = (k + 1) / fr
                rr = R[0] + 0.004 + 0.017 * math.sin(u * math.pi * 0.6)
                wave = 0.004 * np.sin(th * 14 + 1.0) * u
                F[k, :, 0] = C[0, 0] + rr * np.sin(th); F[k, :, 1] = C[0, 1] - rr * np.cos(th); F[k, :, 2] = ztop + 0.002 - 0.016 * u * u + wave
            states[s].append(np.concatenate([F[::-1].reshape(-1, 3), P.reshape(-1, 3)]))
    n1 = (nr + fr) * NB
    S = {s: clearance(np.concatenate(states[s]), body, s, 0.003, 2 if s == "Basis" else 1) for s in body.states}
    polys = []
    for leg in (0, 1):
        o = leg * n1
        for i in range(nr + fr - 1):
            for j in range(NB):
                polys.append((o + i * NB + j, o + i * NB + (j + 1) % NB, o + (i + 1) * NB + (j + 1) % NB, o + (i + 1) * NB + j))
    mats_l = []
    for leg in (0, 1):
        for i in range(nr + fr - 1):
            mats_l += ["trim" if i < fr else "base"] * NB
    base = S["Basis"]
    fi, bc, ds = nearest_info(body, base); tv = body.tris[fi]
    W = (body.W[tv] * bc[:, :, None]).sum(1)
    idxs = np.argsort(-W, axis=1)[:, 4:]; np.put_along_axis(W, idxs, 0, axis=1); W = W / np.maximum(W.sum(1, keepdims=True), 1e-9)
    uv = np.array([(base[v, 0] * 8, base[v, 2] * 8) for p in polys for v in p])
    G = Garment("ankle_socks", body)
    G.add(S, polys, mats_l, uv, W)
    mats = {"base": ("#f4f1ea", "matte"), "trim": ("#ffffff", "lace")}
    meta = meta_of("ankle_socks", "Meias soquete com babado", "legwear", ["base", "trim"], {"base": "#f4f1ea", "trim": "#ffffff"}, {"base": "matte", "trim": "lace"},
                   {"base": ["matte", "satin", "glitter", "latex"], "trim": ["lace", "satin", "tulle", "matte"]}, ["calves", "ankles"],
                   tags=dict(styles=["romantico", "casual", "y2k"], colors=["branco"], formality=0.25, rarity="comum"))
    return G, mats, meta

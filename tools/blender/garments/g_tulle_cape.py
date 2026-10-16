"""Capa de tule dramatica: sai dos ombros, aberta na frente, arrasta atras (3 camadas de tule)."""
import numpy as np, math
from gx3 import *


def cape_layer(body, z0, z1, slope, back_extra, rows=11, nth=96, open_deg=34, ph=0.0, wave=0.038, off=0.02, nf=11):
    th = np.linspace(math.radians(open_deg), 2 * math.pi - math.radians(open_deg), nth)
    P = []; T = []
    for i in range(rows):
        t = i / (rows - 1)
        z = z0 + (z1 - z0) * t
        r0 = 0.195 + (z0 - z) * slope * (0.62 + 0.38 * t) + off + 0.05 * math.sin(t * math.pi * 0.5) * 0.0
        r = r0 + back_extra * np.clip(-np.cos(th), 0, 1) ** 1.5 * t ** 1.4 + wave * np.sin(nf * th + ph) * t ** 1.2 * (0.4 + 0.6 * np.abs(np.sin(0.5 * th)))
        P.append(np.stack([AX[0] + r * np.sin(th), AX[1] - r * np.cos(th) * 0.92, z + 0.030 * np.sin(nf * th + ph + 1.4) * t ** 1.5 - 0.02 * np.clip(-np.cos(th), 0, 1) * t ** 2], 1)); T.append(np.full(nth, t))
    P = np.concatenate(P); T = np.concatenate(T); polys = []
    for i in range(rows - 1):
        for j in range(nth - 1):
            a = i * nth + j; polys.append((a, a + 1, a + nth + 1, a + nth))
    ref = np.stack([P[:, 0] - AX[0], P[:, 1] - AX[1], np.zeros(len(P))], 1)
    return P, T, orient_polys(polys, P, ref)


def cape_weights(body, P, T):
    W = np.zeros((len(P), len(body.bones)))
    s2 = body.bidx["mixamorig:Spine2"]; sp = body.bidx["mixamorig:Spine"]; hp = body.bidx["mixamorig:Hips"]
    a = smoothstep(0.3, 1.0, T) * 0.6
    W[:, s2] = 1 - a; W[:, sp] = a * 0.5; W[:, hp] = a * 0.5
    return W


def build(body):
    G = Garment("tulle_cape", body)
    for z0, z1, sl, be, ph, mat, off, nf in ((1.19, 0.10, 0.72, 0.26, 0.0, "base", 0.026, 11), (1.185, 0.20, 0.66, 0.18, 1.3, "accent", 0.02, 9),
                                             (1.18, 0.34, 0.60, 0.10, 2.6, "lining", 0.012, 7)):
        P, T, pl = cape_layer(body, z0, z1, sl, be, ph=ph, off=off, nf=nf)
        S = {s: P.copy() for s in body.states}
        g = Graph(len(P), pl)
        W = weights_smooth(g, cape_weights(body, P, T), 1)
        G.add(S, pl, mat, cyl_uv(P, pl, AX), W)
    # shoulder clasp ribbon (gold collar band around the neck)
    th = np.linspace(math.radians(30), 2 * math.pi - math.radians(30), 36)
    r = 0.068
    Pb = []
    for t in (0, 1):
        Pb.append(np.stack([AX[0] + (r + 0.0) * np.sin(th), AX[1] - (r - 0.012) * np.cos(th), np.full(len(th), 1.19 - 0.02 * t)], 1))
    Pb = np.concatenate(Pb); n = len(th)
    plb = [(j, j + 1, n + j + 1, n + j) for j in range(n - 1)]
    G.add({s: Pb.copy() for s in body.states}, plb, "trim", cyl_uv(Pb, plb, AX), weights_smooth(Graph(len(Pb), plb), cape_weights(body, Pb, np.zeros(len(Pb))), 0))
    mats = {"base": ("#e6e1f0", "tulle"), "accent": ("#cbbfe6", "tulle"), "trim": ("#d6b25a", "gold"), "lining": ("#cfc6e0", "satin")}
    meta = meta_of("tulle_cape", "Capa de tule dramática", "top", ["base", "accent", "trim", "lining"], {"base": "#e6e1f0", "accent": "#cbbfe6", "trim": "#d6b25a", "lining": "#cfc6e0"},
                   {"base": "tulle", "accent": "tulle", "trim": "gold", "lining": "satin"},
                   {"base": ["tulle", "satin", "lace", "glitter"], "accent": ["tulle", "satin", "lace", "glitter"], "trim": ["gold", "pearl", "satin"], "lining": ["satin", "matte"]},
                   ["shoulders", "back", "arms"], tags=dict(styles=["gala", "rococo", "romantico"], colors=["lilas"], formality=0.95, rarity="lendario"),
                   notes="rigida (nao reage a morphs do corpo, so ao esqueleto); aberta na frente; slot top: pode ficar por cima de dress? nao - substitui o top")
    return G, mats, meta

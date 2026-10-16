"""Saia arquitetonica de petalas: aneis sobrepostos de petalas rigidas que se abrem como uma flor."""
import numpy as np, math
from gx3 import *


def petal_ring(body, z_top, z_tip, flare, n, wfrac, phase, rows=6, cols=5, curl=0.04):
    """returns P, t, polys for n petals"""
    P = []; T = []; polys = []; off = 0
    for k in range(n):
        phi = phase + 2 * math.pi * k / n
        w0 = wfrac * math.pi / n
        for i in range(rows):
            u = i / (rows - 1)
            for j in range(cols):
                c = -1 + 2 * j / (cols - 1)
                w = w0 * (1 - u ** 2.2)
                th = phi + c * w
                z = z_top + (z_tip - z_top) * u
                ev = float(env_at(envelope(body, max(z, 0.55), half=0.02), np.array([th % (2 * math.pi)]))[0])
                r = ev + 0.016 + flare * u ** 0.85 + curl * math.sin(math.pi * min(u * 1.1, 1)) * 0.5 - 0.012 * c * c * (1 - u)
                P.append((AX[0] + r * math.sin(th), AX[1] - r * math.cos(th), z + 0.006 * c * c)); T.append(u)
        for i in range(rows - 1):
            for j in range(cols - 1):
                a = off + i * cols + j
                polys.append((a, a + 1, a + cols + 1, a + cols))
        off += rows * cols
    P = np.array(P); T = np.array(T)
    ref = np.stack([P[:, 0] - AX[0], P[:, 1] - AX[1], np.zeros(len(P))], 1)
    return P, T, orient_polys(polys, P, ref)


def build(body):
    G = Garment("petal_skirt", body)
    waistband(G, body, 0.894, 0.842, "trim", bulge=0.003)
    L0 = env_layer(body, 0.878, 0.74, nth=72, rows=4, off=lambda t, th: 0.0125)
    add_layer(G, body, L0, "lining", dict(lw=0.45, spine_top=0.2, spine_fade=0.2), falloff=0.22, clear=0.008)
    rings = [(0.874, 0.46, 0.16, 12, 1.12, 0.0, "base"), (0.868, 0.36, 0.22, 12, 1.12, math.pi / 12, "accent"), (0.862, 0.24, 0.30, 10, 1.1, 0.0, "base")]
    for zt, zp, fl, n, wf, ph, mat in rings:
        P, T, pl = petal_ring(body, zt, zp, fl, n, wf, ph)
        add_raw(G, body, P, T, pl, mat, lw=0.3, falloff=0.25, clear=0.01)
    mats = {"base": ("#6d2fa0", "latex"), "accent": ("#2d9aa8", "latex"), "trim": ("#d6b25a", "gold"), "lining": ("#1b1330", "matte")}
    meta = meta_of("petal_skirt", "Saia de pétalas arquitetônica", "bottom", ["base", "accent", "trim", "lining"],
                   {"base": "#6d2fa0", "accent": "#2d9aa8", "trim": "#d6b25a", "lining": "#1b1330"},
                   {"base": "latex", "accent": "latex", "trim": "gold", "lining": "matte"},
                   {"base": ["latex", "satin", "glitter", "matte"], "accent": ["latex", "satin", "glitter", "matte"], "trim": ["gold", "satin"], "lining": ["matte", "satin"]},
                   ["hips", "thighs", "knees"], tags=dict(styles=["y2k", "gala", "goth"], colors=["roxo", "turquesa"], formality=0.85, rarity="lendario"))
    return G, mats, meta

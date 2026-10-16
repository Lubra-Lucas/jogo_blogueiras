"""Sueter oversized de trico (volume), gola, punhos e barra canelados."""
from gx2 import *


def build(body):
    I = info(body); G = Garment("sweater", body)
    zb = lambda x, y: 0.775 + 0 * x
    sel = torso_sel(I, zb, neck=(0.058, 0.064, 0.056, 0.0, 1.10), sleeve=1.9)
    def off(P0, I_, V):
        s = I_.s[V]; arm = I_.arm[V]
        o = 0.030 + 0.012 * np.sin(np.clip(P0[:, 2] - 0.75, 0, 0.5) * 3)
        return np.where(arm, 0.026 - 0.016 * smoothstep(1.4, 1.88, s), o)
    def mt(c, r):
        s = r.I.s[r.V][r.pa].mean(1); nz = np.hypot(c[:, 0], c[:, 1] + 0.005)
        return ["trim" if ((c[i, 2] < 0.79) or (r.arm_poly[i] and s[i] > 1.7) or (c[i, 2] > 1.13 and nz[i] < 0.085)) else "base" for i in range(len(c))]
    r = shell(body, G, sel, off=off, hem=zb, sleeve_end=1.9, clear=0.007, smooth=(18, 8, 4), mat=mt)
    mats = {"base": ("#e8dcc6", "matte"), "trim": ("#d4c6aa", "matte")}
    meta = meta_of("sweater", "Suéter oversized", "top", ["base", "trim"], {"base": "#e8dcc6", "trim": "#d4c6aa"}, {"base": "matte", "trim": "matte"},
                   {"base": ["matte", "satin", "glitter"], "trim": ["matte", "satin"]}, ["torso", "arms", "hips"],
                   tags=dict(styles=["casual", "romantico"], colors=["bege"], formality=0.2, rarity="comum"))
    return G, mats, meta

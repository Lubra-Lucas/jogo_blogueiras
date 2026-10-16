"""Calca cargo folgada com bolsos laterais e punho de elastico."""
from gx3 import *


def build(body):
    I = info(body); G = Garment("cargo", body)
    zt = lambda x, y: 0.885 + 0 * x
    zb = lambda x, y: 0.125 + 0 * x
    sel = leg_sel(I, zb, zt)
    flare = leg_flare(body, [0.9, 0.7, 0.5, 0.35, 0.2, 0.12], [0.0, 0.010, 0.022, 0.020, 0.012, 0.0])
    mt = lambda c, r: ["trim" if (c[i, 2] > 0.86 or c[i, 2] < 0.17) else "base" for i in range(len(c))]
    r = shell(body, G, sel, off=0.011, disp=flare, hem=[zt, zb], hem_tol=0.035, clear=0.006, hull=False, mat=mt, smooth=(14, 6, 3))
    for sg in (1, -1):
        pocket_side(G, body, r, sg, 0.50, 0.0, 0.085, 0.115, 0.008, "base")
        pocket_side(G, body, r, sg, 0.555, 0.0, 0.088, 0.03, 0.011, "trim")
    mats = {"base": ("#6b6a4b", "matte"), "trim": ("#57563c", "matte")}
    meta = meta_of("cargo", "Calça cargo", "bottom", ["base", "trim"], {"base": "#6b6a4b", "trim": "#57563c"}, {"base": "matte", "trim": "matte"},
                   {"base": ["matte", "satin", "latex", "glitter"], "trim": ["matte", "satin"]}, ["hips", "legs"],
                   tags=dict(styles=["casual", "esportivo", "y2k"], colors=["verde-oliva"], formality=0.15, rarity="comum"))
    return G, mats, meta

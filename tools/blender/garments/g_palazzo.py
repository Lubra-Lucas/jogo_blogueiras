"""Calca pantalona fluida de cintura alta."""
from gx3 import *


def build(body):
    I = info(body); G = Garment("palazzo", body)
    zt = lambda x, y: 0.90 + 0 * x
    zb = lambda x, y: 0.11 + 0 * x
    sel = leg_sel(I, zb, zt)
    flare = leg_flare(body, [0.9, 0.75, 0.6, 0.45, 0.3, 0.2, 0.11], [0.0, 0.008, 0.024, 0.05, 0.075, 0.092, 0.105], inner=0.018)
    mt = lambda c, r: ["trim" if c[i, 2] > 0.862 else "base" for i in range(len(c))]
    r = shell(body, G, sel, off=0.012, disp=flare, hem=[zt, zb], hem_tol=0.04, clear=0.007, hull=False, mat=mt, smooth=(18, 8, 4))
    mats = {"base": ("#e9dfcc", "satin"), "trim": ("#cfc3a8", "satin")}
    meta = meta_of("palazzo", "Calça pantalona", "bottom", ["base", "trim"], {"base": "#e9dfcc", "trim": "#cfc3a8"}, {"base": "satin", "trim": "satin"},
                   {"base": ["satin", "matte", "glitter", "latex"], "trim": ["satin", "matte"]}, ["hips", "legs"],
                   tags=dict(styles=["romantico", "casual", "gala", "praia"], colors=["bege"], formality=0.5, rarity="comum"))
    return G, mats, meta

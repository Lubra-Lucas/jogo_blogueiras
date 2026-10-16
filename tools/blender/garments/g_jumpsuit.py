"""Macacao pantalona: decote V, alcas, cinto, pernas largas fluidas."""
from gx3 import *


def build(body):
    I = info(body); G = Garment("jumpsuit", body)
    zb = lambda x, y: 0.11 + 0 * x
    sel = torso_sel(I, zb, neck=(0.045, 0.14, 0.05, 0.0, 1.13), sleeve=None, xs=0.100, wide=0.17)
    flare = leg_flare(body, [0.9, 0.75, 0.6, 0.45, 0.3, 0.2, 0.11], [0.0, 0.006, 0.02, 0.045, 0.07, 0.088, 0.10], inner=0.018)
    mt = lambda c, r: ["trim" if (0.845 < c[i, 2] < 0.90) else "base" for i in range(len(c))]
    r = shell(body, G, sel, off=0.0095, disp=flare, hem=zb, hem_tol=0.04, clear=0.006, mat=mt, target=5200, smooth=(16, 6, 3))
    add_studs(G, body, r, surface_pts(r, 0, [0.872]), 0.006, 0.006, "accent")
    mats = {"base": ("#b5473a", "matte"), "trim": ("#8f3328", "matte"), "accent": ("#d6b25a", "gold")}
    meta = meta_of("jumpsuit", "Macacão pantalona", "dress", ["base", "trim", "accent"], {"base": "#b5473a", "trim": "#8f3328", "accent": "#d6b25a"},
                   {"base": "matte", "trim": "matte", "accent": "gold"},
                   {"base": ["matte", "satin", "latex", "glitter"], "trim": ["matte", "satin"], "accent": ["gold", "pearl"]},
                   ["torso", "hips", "legs"], hides=["top", "bottom"],
                   tags=dict(styles=["casual", "gala", "praia"], colors=["terracota"], formality=0.55, rarity="raro"))
    return G, mats, meta

"""Calca jeans skinny, cintura alta com botao e pesponto."""
from gx3 import *


def build(body):
    I = info(body); G = Garment("skinny_jeans", body)
    zt = lambda x, y: 0.885 + 0 * x
    zb = lambda x, y: 0.135 + 0 * x
    sel = leg_sel(I, zb, zt)
    mt = lambda c, r: ["trim" if c[i, 2] > 0.855 else "base" for i in range(len(c))]
    r = shell(body, G, sel, off=0.0058, hem=[zt, zb], hem_tol=0.035, clear=0.0055, hull=False, mat=mt, smooth=(10, 4, 2))
    pts = surface_pts(r, 0, np.arange(0.74, 0.86, 0.01))
    add_ribbon(G, body, r, pts, [(-0.0022, 0.0), (0.0, 0.0017), (0.0022, 0.0)], "accent")
    add_studs(G, body, r, surface_pts(r, 0, [0.862]), 0.0042, 0.0045, "accent")
    mats = {"base": ("#3b5a85", "matte"), "trim": ("#34527a", "matte"), "accent": ("#c98a3c", "matte"), "gold": ("#d6b25a", "gold")}
    mats.pop("gold")
    meta = meta_of("skinny_jeans", "Calça jeans skinny", "bottom", ["base", "trim", "accent"], {"base": "#3b5a85", "trim": "#34527a", "accent": "#c98a3c"},
                   {"base": "matte", "trim": "matte", "accent": "matte"},
                   {"base": ["matte", "satin", "latex", "glitter"], "trim": ["matte", "satin"], "accent": ["matte", "gold"]}, ["hips", "legs"],
                   tags=dict(styles=["casual", "y2k"], colors=["azul"], formality=0.2, rarity="comum"))
    # the button reuses the accent slot
    return G, mats, meta

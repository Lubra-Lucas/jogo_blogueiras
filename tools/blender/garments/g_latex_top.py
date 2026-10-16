"""Top de latex cropped, gola alta tipo halter com zíper dourado."""
from gx3 import *


def build(body):
    I = info(body); G = Garment("latex_top", body)
    zb = lambda x, y: 0.915 + 0 * x
    sel = torso_sel(I, zb, neck=(0.044, 0.056, 0.05, 0.0, 1.12), sleeve=None, xs=0.070)
    r = shell(body, G, sel, hem_flare=0.012, off=0.0052, hem=zb, clear=0.005, target=2600)
    add_ribbon(G, body, r, surface_pts(r, 0, np.arange(0.93, 1.10, 0.011)), [(-0.004, 0.0), (-0.0035, 0.002), (0.0035, 0.002), (0.004, 0.0)], "trim")
    add_studs(G, body, r, surface_pts(r, 0, [1.105]), 0.0045, 0.006, "trim")
    mats = {"base": ("#17171c", "latex"), "trim": ("#d6b25a", "gold")}
    meta = meta_of("latex_top", "Top de látex", "top", ["base", "trim"], {"base": "#17171c", "trim": "#d6b25a"}, {"base": "latex", "trim": "gold"},
                   {"base": ["latex", "satin", "matte", "glitter"], "trim": ["gold", "pearl", "satin"]}, ["torso"],
                   tags=dict(styles=["y2k", "goth", "gala"], colors=["preto"], formality=0.6, rarity="raro"))
    return G, mats, meta

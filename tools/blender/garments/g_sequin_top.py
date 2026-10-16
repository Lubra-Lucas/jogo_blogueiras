"""Top de paete (glitter): cropped de alcas finas, decote reto."""
from gx2 import *


def build(body):
    I = info(body); G = Garment("sequin_top", body)
    zb = lambda x, y: 0.925 + 0 * x
    sel = torso_sel(I, zb, neck=(0.058, 0.090, 0.058, 0.0, 1.125), sleeve=None, xs=0.086)
    r = shell(body, G, sel, off=0.0055, hem=zb, clear=0.005)
    mats = {"base": ("#c9a14a", "glitter")}
    meta = meta_of("sequin_top", "Top de paetê", "top", ["base"], {"base": "#c9a14a"}, {"base": "glitter"},
                   {"base": ["glitter", "satin", "latex", "matte"]}, ["torso"],
                   tags=dict(styles=["y2k", "gala"], colors=["dourado"], formality=0.6, rarity="raro"))
    return G, mats, meta

"""Vestido slip midi de cetim com alcinhas finas e saia fluida cortada em vies."""
from gx3 import *


def build(body):
    I = info(body); G = Garment("slip_dress", body)
    zb = lambda x, y: 0.835 + 0 * x
    sel = torso_sel(I, zb, neck=(0.056, 0.13, 0.06, 0.0, 1.10), sleeve=None, xs=0.080)
    r = shell(body, G, sel, off=0.0055, hem=zb, clear=0.005, target=2400, hem_tol=0.03)
    L = env_layer(body, 0.872, 0.27, nth=120, rows=14, mono=True, off=lambda t, th: 0.0105 + 0.075 * t ** 1.3 + 0.006 * t * np.sin(5 * th), zwave=(0.014, 10, 0.5))
    add_layer_w(G, body, L, "base", lw=0.7, knee=0.5, falloff=0.22, clear=0.008, spine_fade=0.15)
    mats = {"base": ("#d9c4a0", "satin")}
    meta = meta_of("slip_dress", "Vestido slip de cetim", "dress", ["base"], {"base": "#d9c4a0"}, {"base": "satin"},
                   {"base": ["satin", "latex", "matte", "glitter", "lace"]}, ["torso", "hips", "thighs", "knees", "calves"], hides=["top", "bottom"],
                   tags=dict(styles=["romantico", "gala", "y2k"], colors=["champanhe"], formality=0.7, rarity="raro"))
    return G, mats, meta

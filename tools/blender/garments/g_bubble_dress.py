"""Vestido de bolhas Y2K: corpete tomara que caia e tres andares de saia balao."""
from gx3 import *


def build(body):
    I = info(body); G = Garment("bubble_dress", body)
    zb = lambda x, y: 0.84 + 0 * x
    x = I.x
    zt = 1.118 + 0.022 * np.exp(-((np.abs(x) - 0.045) / 0.03) ** 2)
    sel = torso_sel(I, zb, zt=zt, sleeve=None, xs=None, wide=0.115)
    r = shell(body, G, sel, off=0.0058, hem=zb, clear=0.005, target=2600)
    tiers = [(0.874, 0.700, 0.105, "base"), (0.752, 0.575, 0.125, "accent"), (0.640, 0.455, 0.145, "base")]
    for zt_, zh, bulge, mat in tiers:
        L = env_layer(body, zt_, zh, nth=96, row_t=[0, 0.12, 0.28, 0.46, 0.64, 0.82, 0.94, 1.0],
                      off=lambda t, th, bulge=bulge: 0.013 + bulge * np.sin(math.pi * min(t / 0.96, 1.0)) ** 0.85 + 0.0 * th)
        add_layer(G, body, L, mat, dict(lw=0.4, spine_top=0.2, spine_fade=0.2), falloff=0.25, clear=0.01)
    waistband(G, body, 0.890, 0.856, "trim", bulge=0.002)
    mats = {"base": ("#6fb7a5", "latex"), "accent": ("#b9a6e8", "latex"), "trim": ("#f4f4f8", "satin")}
    meta = meta_of("bubble_dress", "Vestido de bolhas Y2K", "dress", ["base", "accent", "trim"], {"base": "#6fb7a5", "accent": "#b9a6e8", "trim": "#f4f4f8"},
                   {"base": "latex", "accent": "latex", "trim": "satin"},
                   {"base": ["latex", "satin", "glitter", "matte"], "accent": ["latex", "satin", "glitter", "matte"], "trim": ["satin", "latex", "pearl"]},
                   ["torso", "hips", "thighs", "knees"], hides=["top", "bottom"],
                   tags=dict(styles=["y2k", "gala", "romantico"], colors=["verde-agua", "lilas"], formality=0.7, rarity="epico"))
    return G, mats, meta

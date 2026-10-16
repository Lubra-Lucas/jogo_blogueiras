"""Saia balone: volume arredondado preso numa barra justa acima do joelho."""
from gx3 import *


def build(body):
    G = Garment("balloon_skirt", body)
    waistband(G, body, 0.892, 0.842, "trim", bulge=0.003)
    rows_t = [0, 0.1, 0.22, 0.36, 0.5, 0.64, 0.78, 0.9, 1.0]
    L = env_layer(body, 0.878, 0.55, nth=96, row_t=rows_t, drop=1.0,
                  off=lambda t, th: 0.014 + 0.115 * np.sin(math.pi * min(t / 0.93, 1.0)) ** 0.9 * (1 - 0.0 * t) + 0.012 * t ** 3 + 0.0 * th)
    add_layer(G, body, L, "base", dict(lw=0.45, spine_top=0.2, spine_fade=0.2), falloff=0.25, clear=0.01)
    # tight hem band
    L2 = env_layer(body, 0.575, 0.52, nth=96, rows=4, off=lambda t, th: 0.016 + 0.0 * th)
    add_layer(G, body, L2, "trim", dict(lw=0.6, spine_top=0.0, spine_fade=0.1), falloff=0.22, clear=0.008)
    mats = {"base": ("#7a1f4a", "satin"), "trim": ("#e8dcc6", "satin")}
    meta = meta_of("balloon_skirt", "Saia balonê", "bottom", ["base", "trim"], {"base": "#7a1f4a", "trim": "#e8dcc6"}, {"base": "satin", "trim": "satin"},
                   {"base": ["satin", "matte", "latex", "glitter"], "trim": ["satin", "matte"]}, ["hips", "thighs"],
                   tags=dict(styles=["y2k", "romantico", "gala"], colors=["vinho"], formality=0.6, rarity="raro"))
    return G, mats, meta

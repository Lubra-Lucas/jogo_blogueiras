"""Saia longa fluida de cetim com barra ondulada."""
from gx3 import *


def build(body):
    G = Garment("long_flow", body)
    waistband(G, body, 0.890, 0.842, "trim", bulge=0.003)
    L = env_layer(body, 0.878, 0.075, nth=112, rows=12, drop=1.0, mono=True,
                  off=lambda t, th: 0.014 + 0.36 * t ** 1.2 + 0.012 * t ** 2 * np.sin(7 * th),
                  zwave=(0.016, 14, 0.0))
    add_layer_w(G, body, L, "base", lw=1.0, knee=0.6, falloff=0.25, clear=0.01, spine_fade=0.15, wt=(0.0, 0.14), split=0.07)
    mats = {"base": ("#1f6b57", "satin"), "trim": ("#14463a", "satin")}
    meta = meta_of("long_flow", "Saia longa fluida", "bottom", ["base", "trim"], {"base": "#1f6b57", "trim": "#14463a"}, {"base": "satin", "trim": "satin"},
                   {"base": ["satin", "matte", "glitter", "lace", "latex"], "trim": ["satin", "matte"]}, ["hips", "legs"], hides=["legs"],
                   tags=dict(styles=["romantico", "praia", "casual"], colors=["verde"], formality=0.55, rarity="comum"))
    return G, mats, meta

"""Saia lapis de latex ate o joelho, cintura alta com zíper dourado atras."""
from gx3 import *


def build(body):
    G = Garment("latex_skirt", body)
    b = waistband(G, body, 0.908, 0.846, "trim", bulge=0.002)
    L = env_layer(body, 0.886, 0.52, nth=120, rows=16, off=lambda t, th: 0.0095 + 0.002 * t)
    add_layer_w(G, body, L, "base", lw=1.0, knee=0.3, falloff=0.2, clear=0.007, spine_fade=0.15)
    mats = {"base": ("#17171c", "latex"), "trim": ("#d6b25a", "gold")}
    meta = meta_of("latex_skirt", "Saia lápis de látex", "bottom", ["base", "trim"], {"base": "#17171c", "trim": "#d6b25a"}, {"base": "latex", "trim": "gold"},
                   {"base": ["latex", "satin", "matte", "glitter"], "trim": ["gold", "latex", "satin"]}, ["hips", "thighs", "knees"],
                   tags=dict(styles=["y2k", "goth", "gala"], colors=["preto"], formality=0.65, rarity="raro"))
    return G, mats, meta

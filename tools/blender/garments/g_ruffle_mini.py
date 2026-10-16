"""Minissaia de babados em camadas (3 andares)."""
from gx3 import *


def build(body):
    G = Garment("ruffle_mini", body)
    waistband(G, body, 0.888, 0.842, "trim")
    cfg = [(0.876, 0.745, 0.255, "base", 0.0), (0.800, 0.675, 0.300, "accent", 0.9), (0.725, 0.605, 0.345, "base", 1.8)]
    for zt, zh, R, mat, ph in cfg:
        L = layer(body, zt, zh, R, R * 0.9, nth=100, rows=5, flare=0.7, drop=1.2, top_off=0.014, ruffle=(0.03, 18), zwave=(0.008, 18, ph), scallop=(0.008, 18))
        add_layer(G, body, L, mat, dict(lw=0.9, spine_top=0.2, spine_fade=0.25, wt=(0.0, 0.25), split=0.07), falloff=0.25, clear=0.008)
    mats = {"base": ("#f1ece0", "satin"), "accent": ("#d8cdb4", "satin"), "trim": ("#2a2f4a", "satin")}
    meta = meta_of("ruffle_mini", "Minissaia de babados", "bottom", ["base", "accent", "trim"], {"base": "#f1ece0", "accent": "#d8cdb4", "trim": "#2a2f4a"},
                   {"base": "satin", "accent": "satin", "trim": "satin"},
                   {"base": ["satin", "matte", "glitter", "lace", "tulle"], "accent": ["satin", "matte", "lace", "tulle"], "trim": ["satin", "matte", "latex"]},
                   ["hips", "upperThighs"], tags=dict(styles=["romantico", "casual", "praia"], colors=["branco"], formality=0.35, rarity="comum"))
    return G, mats, meta

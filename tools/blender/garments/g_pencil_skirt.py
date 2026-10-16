"""Saia lapis justa ate o joelho, cintura alta."""
from gx3 import *


def build(body):
    G = Garment("pencil_skirt", body)
    waistband(G, body, 0.905, 0.842, "trim", bulge=0.002)
    L = env_layer(body, 0.884, 0.505, nth=120, rows=16, off=lambda t, th: 0.0105 + 0.004 * t)
    add_layer_w(G, body, L, "base", lw=1.0, knee=0.3, falloff=0.2, clear=0.007, spine_fade=0.15)
    mats = {"base": ("#2b2b33", "matte"), "trim": ("#1d1d24", "matte")}
    meta = meta_of("pencil_skirt", "Saia lápis", "bottom", ["base", "trim"], {"base": "#2b2b33", "trim": "#1d1d24"}, {"base": "matte", "trim": "matte"},
                   {"base": ["matte", "satin", "latex", "glitter"], "trim": ["matte", "satin", "latex"]}, ["hips", "thighs", "knees"],
                   tags=dict(styles=["gala", "casual", "goth"], colors=["cinza"], formality=0.7, rarity="comum"))
    return G, mats, meta

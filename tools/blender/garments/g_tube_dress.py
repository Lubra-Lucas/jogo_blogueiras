"""Vestido tubinho justo ate o joelho, decote canoa e cintura marcada."""
from gx3 import *


def build(body):
    I = info(body); G = Garment("tube_dress", body)
    zb = lambda x, y: 0.84 + 0 * x
    sel = torso_sel(I, zb, neck=(0.070, 0.100, 0.06, 0.0, 1.115), sleeve=None, xs=0.100)
    r = shell(body, G, sel, off=0.0055, hem=zb, clear=0.005, target=3000)
    L = env_layer(body, 0.872, 0.50, nth=120, rows=16, off=lambda t, th: 0.0105 + 0.002 * t)
    add_layer_w(G, body, L, "base", lw=1.0, knee=0.3, falloff=0.2, clear=0.007, spine_fade=0.15)
    waistband(G, body, 0.890, 0.858, "trim", bulge=0.002)
    mats = {"base": ("#7b1e2e", "satin"), "trim": ("#3a0f17", "satin")}
    meta = meta_of("tube_dress", "Vestido tubinho", "dress", ["base", "trim"], {"base": "#7b1e2e", "trim": "#3a0f17"}, {"base": "satin", "trim": "satin"},
                   {"base": ["satin", "matte", "latex", "glitter", "lace"], "trim": ["satin", "matte", "latex"]}, ["torso", "hips", "thighs", "knees"], hides=["top", "bottom"],
                   tags=dict(styles=["gala", "y2k"], colors=["vinho"], formality=0.75, rarity="comum"))
    return G, mats, meta

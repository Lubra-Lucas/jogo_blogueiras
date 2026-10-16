"""Vestido evase com cinto fino e saia rodada ate o joelho, manga curta."""
from gx3 import *


def build(body):
    I = info(body); G = Garment("evase_dress", body)
    zb = lambda x, y: 0.85 + 0 * x
    sel = torso_sel(I, zb, neck=(0.070, 0.085, 0.056, 0.0, 1.08), sleeve=0.45)
    r = shell(body, G, sel, off=0.0075, hem=zb, sleeve_end=0.45, clear=0.006, target=3600)
    L = layer(body, 0.872, 0.55, 0.37, 0.335, nth=96, rows=8, flare=0.75, drop=1.1, top_off=0.014, ruffle=(0.012, 12), zwave=(0.005, 12, 0.0))
    add_layer(G, body, L, "base", dict(lw=0.9, spine_top=0.2, spine_fade=0.2, wt=(0.0, 0.25), split=0.07), falloff=0.25, clear=0.009)
    b = waistband(G, body, 0.894, 0.848, "trim", bulge=0.003)
    add_bow_on(G, body, b, 0.0, 0.872, 1.4, rr=0.018)
    mats = {"base": ("#2f6fa8", "matte"), "trim": ("#f1ede2", "satin"), "accent": ("#d6b25a", "gold")}
    meta = meta_of("evase_dress", "Vestido evasê com cinto", "dress", ["base", "trim", "accent"], {"base": "#2f6fa8", "trim": "#f1ede2", "accent": "#d6b25a"},
                   {"base": "matte", "trim": "satin", "accent": "gold"},
                   {"base": ["matte", "satin", "glitter", "lace", "latex"], "trim": ["satin", "matte", "latex"], "accent": ["gold", "pearl", "satin"]},
                   ["torso", "upperArms", "hips", "thighs"], hides=["top", "bottom"],
                   tags=dict(styles=["romantico", "casual", "gala"], colors=["azul"], formality=0.55, rarity="comum"))
    return G, mats, meta

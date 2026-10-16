"""Saia plissada de tenista/escolar (mini), cos com barra."""
from gx3 import *


def build(body):
    G = Garment("pleated_skirt", body)
    waistband(G, body, 0.888, 0.842, "trim")
    pleat_skirt(G, body, 0.876, 0.665, 0.115, nth=144, pleats=36, amp=0.011, rows=6, off0=0.016)
    mats = {"base": ("#2f4a3a", "matte"), "trim": ("#d9d2c0", "matte")}
    meta = meta_of("pleated_skirt", "Saia plissada", "bottom", ["base", "trim"], {"base": "#2f4a3a", "trim": "#d9d2c0"}, {"base": "matte", "trim": "matte"},
                   {"base": ["matte", "satin", "glitter", "latex"], "trim": ["matte", "satin"]}, ["hips", "upperThighs"],
                   tags=dict(styles=["casual", "esportivo", "y2k"], colors=["verde"], formality=0.25, rarity="comum"))
    return G, mats, meta

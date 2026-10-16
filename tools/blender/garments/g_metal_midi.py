"""Saia midi plissada metalizada."""
from gx3 import *


def build(body):
    G = Garment("metal_midi", body)
    waistband(G, body, 0.890, 0.842, "trim", bulge=0.003)
    pleat_skirt(G, body, 0.878, 0.30, 0.20, nth=144, pleats=36, amp=0.014, rows=10, off0=0.016, drop=1.0, lw=0.6, zwave=(0.010, 36, 0.0))
    mats = {"base": ("#c9b27a", "gold"), "trim": ("#8a7340", "gold")}
    meta = meta_of("metal_midi", "Saia midi plissada metalizada", "bottom", ["base", "trim"], {"base": "#c9b27a", "trim": "#8a7340"}, {"base": "gold", "trim": "gold"},
                   {"base": ["gold", "satin", "glitter", "latex", "matte"], "trim": ["gold", "satin", "matte"]}, ["hips", "thighs", "knees", "calves"],
                   tags=dict(styles=["y2k", "gala"], colors=["dourado"], formality=0.7, rarity="epico"))
    return G, mats, meta

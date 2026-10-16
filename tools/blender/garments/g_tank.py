"""Regata canelada de alca larga, barra cropped."""
from gx import *


def build(body):
    I = info(body); G = Garment("tank", body)
    zb = lambda x, y: 0.885 + 0 * x
    sel = torso_sel(I, zb, neck=(0.060, 0.105, 0.06, 0.0, 1.12), sleeve=None, xs=0.085)
    shell(body, G, sel, off=0.0055, hem=zb, clear=0.005)
    mats = {"base": ("#1f1f26", "matte")}
    meta = meta_of("tank", "Regata canelada", "top", ["base"], {"base": "#1f1f26"}, {"base": "matte"},
                   {"base": ["matte", "satin", "latex", "glitter"]}, ["torso"],
                   tags=dict(styles=["casual", "esportivo", "praia"], colors=["preto"], formality=0.1, rarity="comum"))
    return G, mats, meta

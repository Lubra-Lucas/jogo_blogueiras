"""Regata canelada de alca larga, barra cropped."""
from gx import *


def build(body):
    I = info(body); G = Garment("tank", body)
    zb = lambda x, y: 0.885 + 0 * x
    sel = torso_sel(I, zb, neck=(0.058, 0.085, 0.058, 0.0, 1.125), sleeve=None, xs=0.092)
    shell(body, G, sel, hem_flare=0.012, off=0.0055, hem=zb, clear=0.005)
    mats = {"base": ("#1f1f26", "matte")}
    meta = meta_of("tank", "Regata canelada", "top", ["base"], {"base": "#1f1f26"}, {"base": "matte"},
                   {"base": ["matte", "satin", "latex", "glitter"]}, ["torso"],
                   tags=dict(styles=["casual", "esportivo", "praia"], colors=["preto"], formality=0.1, rarity="comum"))
    return G, mats, meta

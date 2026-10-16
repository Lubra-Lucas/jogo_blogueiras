"""Camiseta basica: gola careca, manga curta, barra com folga leve."""
from gx import *


def build(body):
    I = info(body); G = Garment("tee", body)
    zb = lambda x, y: 0.835 + 0 * x
    sel = torso_sel(I, zb, neck=(0.058, 0.07, 0.05, 0.0, 1.10), sleeve=0.52)
    shell(body, G, sel, hem_flare=0.012, off=0.0075, hem=zb, sleeve_end=0.52, clear=0.006)
    mats = {"base": ("#f4f1ea", "matte")}
    meta = meta_of("tee", "Camiseta básica", "top", ["base"], {"base": "#f4f1ea"}, {"base": "matte"},
                   {"base": ["matte", "satin", "glitter", "latex"]}, ["torso", "upperArms"],
                   tags=dict(styles=["casual"], colors=["branco"], formality=0.15, rarity="comum"))
    return G, mats, meta

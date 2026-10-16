"""Cropped com gola marinheiro (peter pan) e manga curta."""
from gx2 import *


def build(body):
    I = info(body); G = Garment("crop_collar", body)
    zb = lambda x, y: 0.955 + 0 * x
    sel = torso_sel(I, zb, neck=(0.058, 0.066, 0.05, 0.0, 1.10), sleeve=0.5)
    r = shell(body, G, sel, off=0.0075, hem=zb, sleeve_end=0.5)
    collar_flat(G, body, r, r0=(0.056, 0.058), r1=(0.105, 0.092), mat="trim")
    mats = {"base": ("#23395d", "matte"), "trim": ("#f4f1ea", "matte")}
    meta = meta_of("crop_collar", "Cropped com gola", "top", ["base", "trim"], {"base": "#23395d", "trim": "#f4f1ea"}, {"base": "matte", "trim": "matte"},
                   {"base": ["matte", "satin", "glitter", "latex"], "trim": ["matte", "satin", "lace"]}, ["torso", "upperArms"],
                   tags=dict(styles=["casual", "esportivo", "y2k"], colors=["azul", "branco"], formality=0.2, rarity="comum"))
    return G, mats, meta

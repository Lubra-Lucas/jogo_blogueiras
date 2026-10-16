"""Camisa social de manga longa com colarinho, botoes e laco no pescoco."""
from gx2 import *


def build(body):
    I = info(body); G = Garment("shirt_bow", body)
    zb = lambda x, y: 0.80 + 0 * x
    sel = torso_sel(I, zb, neck=(0.052, 0.056, 0.05, 0.0, 1.10), sleeve=1.92)
    cuff = lambda c, r: ["trim" if (r.arm_poly[i] and abs(r.I.s[r.V][r.pa[i]].mean() - 1.92) < 0.16) else "base" for i in range(len(c))]
    def off(P0, I_, V):
        s = I_.s[V]; return 0.011 - 0.005 * smoothstep(1.55, 1.9, s) * I_.arm[V]
    r = shell(body, G, sel, off=off, hem=zb, sleeve_end=1.92, clear=0.006, mat=cuff)
    collar_flat(G, body, r, r0=(0.052, 0.056), r1=(0.082, 0.078), lift=0.004, mat="base")
    front_placket(G, body, r, 0.84, 1.14, 0.010, "trim")
    buttons(G, body, r, np.arange(0.86, 1.12, 0.045), 0.0030, 0.0035, "accent")
    tie_bow(G, body, r, 1.155, 1.5)
    mats = {"base": ("#f6f4ee", "satin"), "trim": ("#e9e6dd", "satin"), "accent": ("#d9d4c6", "pearl")}
    meta = meta_of("shirt_bow", "Camisa social com laço", "top", ["base", "trim", "accent"], {"base": "#f6f4ee", "trim": "#e9e6dd", "accent": "#d9d4c6"},
                   {"base": "satin", "trim": "satin", "accent": "pearl"},
                   {"base": ["satin", "matte", "latex", "glitter", "lace"], "trim": ["satin", "matte", "lace"], "accent": ["pearl", "gold"]}, ["torso", "arms"],
                   tags=dict(styles=["casual", "gala", "romantico"], colors=["branco"], formality=0.65, rarity="comum"))
    return G, mats, meta

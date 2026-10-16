"""Cardigan curto de trico com botoes de perola, decote em V."""
from gx2 import *


def build(body):
    I = info(body); G = Garment("cardigan", body)
    zb = lambda x, y: 0.90 + 0 * x
    sel = torso_sel(I, zb, neck=(0.062, 0.13, 0.056, 0.0, 1.08), sleeve=1.9)
    def off(P0, I_, V):
        s = I_.s[V]; arm = I_.arm[V]
        return np.where(arm, 0.016 - 0.008 * smoothstep(1.55, 1.88, s), 0.014)
    mt = lambda c, r: ["trim" if (c[i, 2] < 0.925 or (r.arm_poly[i] and r.I.s[r.V][r.pa[i]].mean() > 1.76)) else "base" for i in range(len(c))]
    r = shell(body, G, sel, hem_flare=0.012, off=off, hem=zb, sleeve_end=1.9, clear=0.006, smooth=(14, 6, 3), mat=mt)
    front_placket(G, body, r, 0.92, 1.10, 0.011, "trim")
    buttons(G, body, r, np.arange(0.93, 1.10, 0.04), 0.0034, 0.004, "accent")
    mats = {"base": ("#7b8f6a", "matte"), "trim": ("#6a7d5a", "matte"), "accent": ("#f3eee2", "pearl")}
    meta = meta_of("cardigan", "Cardigan com botões de pérola", "top", ["base", "trim", "accent"], {"base": "#7b8f6a", "trim": "#6a7d5a", "accent": "#f3eee2"},
                   {"base": "matte", "trim": "matte", "accent": "pearl"},
                   {"base": ["matte", "satin", "glitter"], "trim": ["matte", "satin"], "accent": ["pearl", "gold"]}, ["torso", "arms"],
                   tags=dict(styles=["romantico", "casual"], colors=["verde"], formality=0.4, rarity="comum"))
    return G, mats, meta

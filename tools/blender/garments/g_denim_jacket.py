"""Jaqueta jeans estruturada: gola, pesponto, botoes dourados, punhos."""
from gx2 import *


def build(body):
    I = info(body); G = Garment("denim_jacket", body)
    zb = lambda x, y: 0.865 + 0 * x
    sel = torso_sel(I, zb, neck=(0.060, 0.07, 0.056, 0.0, 1.10), sleeve=1.9)
    def off(P0, I_, V):
        s = I_.s[V]; arm = I_.arm[V]
        return np.where(arm, 0.014 - 0.006 * smoothstep(1.6, 1.88, s), 0.0135)
    mt = lambda c, r: ["trim" if ((r.arm_poly[i] and r.I.s[r.V][r.pa[i]].mean() > 1.74) or c[i, 2] < 0.885) else "base" for i in range(len(c))]
    r = shell(body, G, sel, hem_flare=0.012, off=off, hem=zb, sleeve_end=1.9, clear=0.007, smooth=(14, 6, 3), mat=mt)
    collar_flat(G, body, r, r0=(0.060, 0.064), r1=(0.098, 0.092), lift=0.005, mat="base")
    front_placket(G, body, r, 0.88, 1.15, 0.012, "trim")
    for th in (-26, 26): seam_line(G, body, r, th, 0.89, 1.08, 0.012, mat="trim")
    buttons(G, body, r, np.arange(0.90, 1.14, 0.05), 0.0036, 0.0045, "accent")
    mats = {"base": ("#35567f", "matte"), "trim": ("#c98a3c", "matte"), "accent": ("#d6b25a", "gold")}
    meta = meta_of("denim_jacket", "Jaqueta jeans", "top", ["base", "trim", "accent"], {"base": "#35567f", "trim": "#c98a3c", "accent": "#d6b25a"},
                   {"base": "matte", "trim": "matte", "accent": "gold"},
                   {"base": ["matte", "satin", "latex", "glitter"], "trim": ["matte", "satin"], "accent": ["gold", "pearl"]}, ["torso", "arms"],
                   tags=dict(styles=["casual", "y2k", "esportivo"], colors=["azul"], formality=0.2, rarity="comum"))
    return G, mats, meta

"""Bolero curto de manga bufante (punho ajustado), frente aberta."""
from gx2 import *


def build(body):
    I = info(body); G = Garment("bolero", body)
    zb = lambda x, y: 0.985 + 0 * x
    sel = torso_sel(I, zb, neck=(0.060, 0.07, 0.056, 0.0, 1.10), sleeve=1.35)
    sel &= ~((np.abs(I.x) < 0.012) & (I.y < 0.0) & (I.z < 1.15) & ~I.arm)
    def off(P0, I_, V):
        s = I_.s[V]; arm = I_.arm[V]
        puff = 0.034 * np.sin(np.pi * np.clip(s / 1.15, 0, 1)) ** 1.1
        return np.where(arm, 0.009 + puff, 0.0085)
    mt = lambda c, r: ["trim" if (r.arm_poly[i] and r.I.s[r.V][r.pa[i]].mean() > 1.22) else "base" for i in range(len(c))]
    r = shell(body, G, sel, off=off, hem=zb, sleeve_end=1.35, clear=0.006, smooth=(14, 6, 3), mat=mt)
    mats = {"base": ("#8a1f3a", "satin"), "trim": ("#d9c9a0", "satin")}
    meta = meta_of("bolero", "Bolero manga bufante", "top", ["base", "trim"], {"base": "#8a1f3a", "trim": "#d9c9a0"}, {"base": "satin", "trim": "satin"},
                   {"base": ["satin", "matte", "latex", "glitter", "lace"], "trim": ["satin", "matte", "pearl"]}, ["upperTorso", "arms"],
                   tags=dict(styles=["gala", "rococo", "romantico"], colors=["vinho"], formality=0.8, rarity="raro"))
    return G, mats, meta

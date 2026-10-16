"""Sobretudo trench: transpassado com dois botoes, lapelas, ombreiras, cinto e saia ate o joelho."""
from gx3 import *


def build(body):
    I = info(body); G = Garment("trench", body)
    zb = lambda x, y: 0.84 + 0 * x
    sel = torso_sel(I, zb, neck=(0.066, 0.12, 0.058, 0.0, 1.06), sleeve=1.94)
    def off(P0, I_, V):
        s = I_.s[V]; arm = I_.arm[V]
        return np.where(arm, 0.0145 - 0.006 * smoothstep(1.6, 1.92, s), 0.0125)
    mt = lambda c, r: ["trim" if (r.arm_poly[i] and r.I.s[r.V][r.pa[i]].mean() > 1.78) else "base" for i in range(len(c))]
    r = shell(body, G, sel, off=off, hem=zb, sleeve_end=1.94, clear=0.007, smooth=(14, 6, 3), mat=mt, target=4600)
    L = env_layer(body, 0.866, 0.44, nth=104, rows=9, off=lambda t, th: 0.0155 + 0.062 * t ** 1.2 + 0.004 * t * np.sin(6 * th), zwave=(0.008, 8, 0.0))
    add_layer(G, body, L, "base", dict(lw=0.35, spine_top=0.25, spine_fade=0.3), falloff=0.25, clear=0.01)
    for sg in (1, -1):
        pts = np.array([[sg * (0.052 - 0.040 * t), -0.075 - 0.04 * t, 1.17 - 0.22 * t] for t in np.linspace(0, 1, 18)])
        add_ribbon(G, body, r, pts, [(-0.011, 0.0), (-0.010, 0.003), (0.010, 0.003), (0.011, 0.0)], "trim")
    for sg in (1, -1):
        add_studs(G, body, r, [p for z in (0.97, 0.90) for p in surface_pts(r, sg * 20, [z])], 0.0042, 0.005, "accent")
    belt_idx = waistband(G, body, 0.905, 0.868, "trim", bulge=0.006)
    add_studs(G, body, r, [], 0.001, 0.001, "accent")
    mats = {"base": ("#b8956a", "matte"), "trim": ("#8a6a44", "matte"), "accent": ("#d6b25a", "gold")}
    meta = meta_of("trench", "Sobretudo trench", "top", ["base", "trim", "accent"], {"base": "#b8956a", "trim": "#8a6a44", "accent": "#d6b25a"},
                   {"base": "matte", "trim": "matte", "accent": "gold"},
                   {"base": ["matte", "satin", "latex", "glitter"], "trim": ["matte", "satin", "latex"], "accent": ["gold", "pearl"]},
                   ["torso", "arms", "hips", "thighs", "knees"], hides=["bottom"],
                   tags=dict(styles=["casual", "gala", "goth"], colors=["bege"], formality=0.7, rarity="raro"),
                   notes="longo ate o joelho; hides bottom (saias curtas apareceriam por baixo da aba)")
    return G, mats, meta

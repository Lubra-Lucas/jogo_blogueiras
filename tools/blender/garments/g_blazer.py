"""Blazer cintado: lapelas em V, botoes, manga longa, cintura marcada."""
from gx2 import *


def build(body):
    I = info(body); G = Garment("blazer", body)
    zb = lambda x, y: 0.835 + 0 * x
    sel = torso_sel(I, zb, neck=(0.066, 0.115, 0.056, 0.0, 1.06), sleeve=1.92)
    def off(P0, I_, V):
        s = I_.s[V]; arm = I_.arm[V]; z = P0[:, 2]
        body_o = 0.0095 + 0.006 * smoothstep(0.88, 0.84, z)
        return np.where(arm, 0.0115 - 0.004 * smoothstep(1.6, 1.9, s), body_o)
    r = shell(body, G, sel, off=off, hem=zb, sleeve_end=1.92, clear=0.006)
    for sg in (1, -1):
        pts = np.array([[sg * (0.05 - 0.044 * t), -0.075 - 0.04 * t, 1.16 - 0.215 * t] for t in np.linspace(0, 1, 18)])
        add_ribbon(G, body, r, pts, [(-0.010, 0.0), (-0.009, 0.0025), (0.009, 0.0025), (0.010, 0.0)], "trim")
    buttons(G, body, r, [0.93, 0.89], 0.0045, 0.005, "accent")
    mats = {"base": ("#1d2230", "matte"), "trim": ("#2b3347", "satin"), "accent": ("#d6b25a", "gold")}
    meta = meta_of("blazer", "Blazer cintado", "top", ["base", "trim", "accent"], {"base": "#1d2230", "trim": "#2b3347", "accent": "#d6b25a"},
                   {"base": "matte", "trim": "satin", "accent": "gold"},
                   {"base": ["matte", "satin", "latex", "glitter"], "trim": ["satin", "matte", "latex"], "accent": ["gold", "pearl"]}, ["torso", "arms"],
                   tags=dict(styles=["gala", "casual"], colors=["azul-marinho"], formality=0.75, rarity="raro"))
    return G, mats, meta

"""Body/collant de manga longa, gola alta, recorte moderado na perna."""
from gx2 import *


def build(body):
    I = info(body); G = Garment("bodysuit", body)
    zb = lambda x, y: 0.645 + 0.075 * smoothstep(0.02, 0.11, np.abs(x))
    sel = torso_sel(I, zb, neck=(0.052, 0.058, 0.048, 0.0, 1.12), sleeve=1.92)
    sel &= ~I.hand
    def off(P0, I_, V):
        return np.where(I_.arm[V], 0.004, 0.0055)
    r = shell(body, G, sel, off=off, hem=zb, hem_tol=0.04, sleeve_end=1.92, clear=0.005, hull_z=(0.80, 0.9, 1.10, 1.15))
    mats = {"base": ("#2a2f4a", "satin")}
    meta = meta_of("bodysuit", "Body de manga longa", "top", ["base"], {"base": "#2a2f4a"}, {"base": "satin"},
                   {"base": ["satin", "latex", "matte", "glitter"]}, ["torso", "arms", "hips"],
                   tags=dict(styles=["y2k", "casual", "goth"], colors=["azul-marinho"], formality=0.35, rarity="comum"),
                   notes="cobre o quadril ate a virilha: usar com saia/calca")
    return G, mats, meta

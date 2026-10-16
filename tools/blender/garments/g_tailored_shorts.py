"""Short de alfaiataria de cintura alta, vinco frontal e cinto fino."""
from gx3 import *


def build(body):
    I = info(body); G = Garment("tailored_shorts", body)
    zt = lambda x, y: 0.90 + 0 * x
    zb = lambda x, y: 0.585 + 0 * x
    sel = leg_sel(I, zb, zt)
    flare = leg_flare(body, [0.9, 0.7, 0.55], [0.0, 0.006, 0.014])
    mt = lambda c, r: ["trim" if c[i, 2] > 0.865 else "base" for i in range(len(c))]
    r = shell(body, G, sel, off=0.0095, disp=flare, hem=[zt, zb], hem_tol=0.035, clear=0.006, hull=False, mat=mt, smooth=(12, 5, 2))
    for sg in (1, -1):
        add_ribbon(G, body, r, surface_pts(r, sg * 14, np.arange(0.60, 0.85, 0.012)), [(-0.0015, 0.0), (0.0, 0.0014), (0.0015, 0.0)], "trim")
    add_studs(G, body, r, surface_pts(r, 0, [0.868]), 0.0048, 0.005, "accent")
    mats = {"base": ("#d8c8a8", "matte"), "trim": ("#bfae8a", "matte"), "accent": ("#d6b25a", "gold")}
    meta = meta_of("tailored_shorts", "Short de alfaiataria", "bottom", ["base", "trim", "accent"], {"base": "#d8c8a8", "trim": "#bfae8a", "accent": "#d6b25a"},
                   {"base": "matte", "trim": "matte", "accent": "gold"},
                   {"base": ["matte", "satin", "latex", "glitter"], "trim": ["matte", "satin"], "accent": ["gold", "pearl"]}, ["hips", "upperThighs"],
                   tags=dict(styles=["casual", "praia", "gala"], colors=["bege"], formality=0.45, rarity="comum"))
    return G, mats, meta

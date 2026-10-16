"""Short jeans curtinho, barra dobrada e bolsos."""
from gx3 import *


def build(body):
    I = info(body); G = Garment("denim_shorts", body)
    zt = lambda x, y: 0.875 + 0 * x
    zb = lambda x, y: 0.66 + 0 * x
    sel = leg_sel(I, zb, zt)
    mt = lambda c, r: ["trim" if (c[i, 2] > 0.85 or c[i, 2] < 0.69) else "base" for i in range(len(c))]
    r = shell(body, G, sel, off=0.0075, hem=[zt, zb], hem_tol=0.035, clear=0.0055, hull=False, mat=mt, smooth=(10, 4, 2))
    for sg in (1, -1):
        pts = np.array([[sg * (0.032 + 0.07 * t), -0.075 + 0.0 * t, 0.865 - 0.07 * math.sin(t * math.pi * 0.5)] for t in np.linspace(0, 1, 10)])
    add_studs(G, body, r, surface_pts(r, 0, [0.855]), 0.0045, 0.0045, "accent")
    mats = {"base": ("#4a6fa0", "matte"), "trim": ("#8fb0d8", "matte"), "accent": ("#d6b25a", "gold")}
    meta = meta_of("denim_shorts", "Short jeans", "bottom", ["base", "trim", "accent"], {"base": "#4a6fa0", "trim": "#8fb0d8", "accent": "#d6b25a"},
                   {"base": "matte", "trim": "matte", "accent": "gold"},
                   {"base": ["matte", "satin", "latex", "glitter"], "trim": ["matte", "satin"], "accent": ["gold", "pearl"]}, ["hips", "upperThighs"],
                   tags=dict(styles=["casual", "praia", "y2k"], colors=["azul"], formality=0.1, rarity="comum"))
    return G, mats, meta

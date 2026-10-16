"""Legging esportiva de cintura alta com faixa lateral."""
from gx3 import *


def build(body):
    I = info(body); G = Garment("leggings", body)
    zt = lambda x, y: 0.895 + 0 * x
    zb = lambda x, y: 0.125 + 0 * x
    sel = leg_sel(I, zb, zt)
    mt = lambda c, r: ["trim" if (c[i, 2] > 0.86 or abs(c[i, 0]) > 0 and False) else "base" for i in range(len(c))]
    r = shell(body, G, sel, off=0.0048, hem=[zt, zb], hem_tol=0.035, clear=0.0045, hull=False, mat=mt, smooth=(10, 4, 2))
    for sg in (1, -1):
        pts = []
        for z in np.arange(0.16, 0.82, 0.014):
            o = np.array([sg * 0.40, 0.0, z]); loc = cast_surface(r.base, r.pa, [o], [np.array([-sg, 0.0, 0.0])])[0]
            if not np.isnan(loc[0]): pts.append(loc)
        add_ribbon(G, body, r, np.array(pts), [(-0.007, 0.0), (-0.0065, 0.0015), (0.0065, 0.0015), (0.007, 0.0)], "accent")
    mats = {"base": ("#22252e", "latex"), "trim": ("#17181d", "matte"), "accent": ("#8c93a3", "satin")}
    meta = meta_of("leggings", "Legging esportiva", "bottom", ["base", "trim", "accent"], {"base": "#22252e", "trim": "#17181d", "accent": "#8c93a3"},
                   {"base": "latex", "trim": "matte", "accent": "satin"},
                   {"base": ["latex", "matte", "satin", "glitter"], "trim": ["matte", "satin"], "accent": ["satin", "matte", "gold"]}, ["hips", "legs"],
                   tags=dict(styles=["esportivo", "casual", "y2k"], colors=["preto"], formality=0.1, rarity="comum"))
    return G, mats, meta

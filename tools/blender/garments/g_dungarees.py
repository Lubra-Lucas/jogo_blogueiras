"""Jardineira jeans: peitilho com alcas, calca folgada com barra dobrada."""
from gx3 import *


def build(body):
    I = info(body); G = Garment("dungarees", body)
    x, y, z = I.x, I.y, I.z
    ok = ~I.arm & ~I.head & ~I.foot
    legs = (z >= 0.30) & (z <= 0.935)
    bib = (z > 0.935) & (z <= 1.07) & (np.abs(x) < 0.074) & (y < 0.0)
    strap = (z > 1.07) & (z <= 1.20) & (np.abs(x) > 0.036) & (np.abs(x) < 0.064)
    back = (z > 0.935) & (z <= 1.07) & (np.abs(x) > 0.036) & (np.abs(x) < 0.064) & (y >= 0.0)
    sel = ok & (legs | bib | strap | back)
    hem = lambda x_, y_: 0.30 + 0 * x_
    top = lambda x_, y_: 0.935 + 0 * x_
    flare = leg_flare(body, [0.9, 0.7, 0.5, 0.3], [0.0, 0.008, 0.016, 0.012])
    mt = lambda c, r: ["trim" if (c[i, 2] < 0.345 or (c[i, 2] > 0.935 and abs(c[i, 0]) > 0.036 and (c[i, 2] > 1.07 or c[i, 1] >= 0))) else "base" for i in range(len(c))]
    r = shell(body, G, sel, off=lambda P0, I_, V: np.where(P0[:, 2] > 0.885, 0.0150, 0.0105), disp=flare, hem=[hem], hem_tol=0.03, clear=0.006, mat=mt, hull=True, target=5000, smooth=(14, 6, 3), hull_z=(0.92, 0.96, 1.06, 1.10))
    for sg in (1, -1):
        pts = np.array([[sg * 0.058, -0.10, 1.045]]); add_studs(G, body, r, pts, 0.0065, 0.006, "accent")
    mats = {"base": ("#3e6190", "matte"), "trim": ("#2f4f7a", "matte"), "accent": ("#d6b25a", "gold")}
    meta = meta_of("dungarees", "Jardineira jeans", "bottom", ["base", "trim", "accent"], {"base": "#3e6190", "trim": "#2f4f7a", "accent": "#d6b25a"},
                   {"base": "matte", "trim": "matte", "accent": "gold"},
                   {"base": ["matte", "satin", "latex", "glitter"], "trim": ["matte", "satin"], "accent": ["gold", "pearl"]},
                   ["torso", "hips", "legs"], hides=[],
                   tags=dict(styles=["casual", "y2k", "esportivo"], colors=["azul"], formality=0.1, rarity="comum"),
                   notes="slot bottom: peitilho e alcas por cima de uma camiseta (folga 15 mm no peitilho)")
    return G, mats, meta

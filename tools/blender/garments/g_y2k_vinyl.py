"""Vestido Y2K de vinil: mini justo, frente halter, recortes geometricos discretos na cintura."""
from gx3 import *


def build(body):
    I = info(body); G = Garment("y2k_vinyl", body)
    zb = lambda x, y: 0.84 + 0 * x
    sel = torso_sel(I, zb, neck=(0.040, 0.075, 0.05, 0.0, 1.14), sleeve=None, xs=0.085)
    def holes(c):
        d = np.abs(np.abs(c[:, 0]) - 0.062) / 0.020 + np.abs(c[:, 2] - 0.945) / 0.034
        return (d < 1.0) & (np.abs(c[:, 1]) < 0.07)
    mt = lambda c, r: ["trim" if holes(c[i:i+1])[0] else "base" for i in range(len(c))]
    r = shell(body, G, sel, off=0.0055, hem=zb, clear=0.005, target=3200, mat=mt)
    L = env_layer(body, 0.872, 0.62, nth=120, rows=12, off=lambda t, th: 0.0105 + 0.012 * t, scallop=(0.02, 12))
    pan = [("trim" if (abs(math.sin(3 * (i % 120) * 2 * math.pi / 120)) > 0.93 and (i // 120) > 2) else "base") for i in range(len(L["polys"]))]
    add_layer_w(G, body, L, pan, lw=1.0, falloff=0.2, clear=0.007, spine_fade=0.15)
    waistband(G, body, 0.874, 0.848, "trim", bulge=0.002)
    mats = {"base": ("#5d6fa8", "latex"), "trim": ("#c9ced8", "gold")}
    meta = meta_of("y2k_vinyl", "Vestido Y2K de vinil", "dress", ["base", "trim"], {"base": "#5d6fa8", "trim": "#c9ced8"}, {"base": "latex", "trim": "gold"},
                   {"base": ["latex", "satin", "glitter", "matte"], "trim": ["gold", "latex", "satin"]}, ["torso", "hips", "upperThighs"], hides=["top", "bottom"],
                   tags=dict(styles=["y2k", "goth", "gala"], colors=["prata", "azul"], formality=0.6, rarity="epico"))
    return G, mats, meta

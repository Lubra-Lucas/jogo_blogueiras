"""Vestido tomara que caia de festa, saia sereia ate o chao com cauda."""
from gx3 import *


def build(body):
    I = info(body); G = Garment("strapless_train", body)
    zb = lambda x, y: 0.84 + 0 * x
    x = I.x
    zt = 1.118 + 0.022 * np.exp(-((np.abs(x) - 0.045) / 0.03) ** 2) - 0.014 * np.exp(-(x / 0.014) ** 2)
    sel = torso_sel(I, zb, zt=zt, sleeve=None, xs=None, wide=0.115)
    r = shell(body, G, sel, off=0.0058, hem=zb, clear=0.005, target=3000)
    th = np.arange(112) * 2 * math.pi / 112
    back = np.clip(-np.cos(th), 0, 1)
    rows_t = [0, 0.05, 0.12, 0.2, 0.3, 0.42, 0.55, 0.68, 0.8, 0.9, 1.0]
    L = env_layer(body, 0.872, 0.07, nth=112, row_t=rows_t, drop=1.0, mono=True,
                  off=lambda t, th_: 0.011 + 0.17 * np.clip((t - 0.45) / 0.55, 0, 1) ** 1.5 * (0.65 + 0.35 * np.sin(th_ / 2) ** 2),
                  hem_extra=lambda t, th_: 0.26 * np.clip((t - 0.4) / 0.6, 0, 1) ** 1.6 * np.clip(-np.cos(th_), 0, 1) ** 2.0,
                  zwave=(0.012, 9, 0.4))
    add_layer_w(G, body, L, "base", lw=0.5, knee=0.5, falloff=0.25, clear=0.01, spine_fade=0.15)
    waistband(G, body, 0.896, 0.846, "trim", bulge=0.003)
    mats = {"base": ("#16315e", "satin"), "trim": ("#d6b25a", "gold")}
    meta = meta_of("strapless_train", "Vestido tomara que caia com cauda", "dress", ["base", "trim"], {"base": "#16315e", "trim": "#d6b25a"}, {"base": "satin", "trim": "gold"},
                   {"base": ["satin", "latex", "matte", "glitter", "lace"], "trim": ["gold", "satin", "pearl"]}, ["torso", "hips", "legs"], hides=["top", "bottom", "legs"],
                   tags=dict(styles=["gala", "romantico"], colors=["azul-marinho"], formality=0.95, rarity="epico"))
    return G, mats, meta

"""Vestido de gala/noiva com camadas de tule: corpete de cetim, cinto de perolas, 5 saias de tule em degrade."""
from gx3 import *


def build(body):
    I = info(body); G = Garment("gala_tulle", body)
    zb = lambda x, y: 0.84 + 0 * x
    x = I.x
    zt = 1.118 + 0.022 * np.exp(-((np.abs(x) - 0.045) / 0.03) ** 2) - 0.014 * np.exp(-(x / 0.014) ** 2)
    sel = torso_sel(I, zb, zt=zt, sleeve=None, xs=None, wide=0.115)
    r = shell(body, G, sel, off=0.0062, hem=zb, clear=0.005, target=2600, mat="trim")
    b = waistband(G, body, 0.896, 0.848, "trim", bulge=0.003)
    Ls = layer(body, 0.872, 0.16, 0.34, 0.30, nth=96, rows=7, flare=0.8, drop=1.0, top_off=0.014)
    add_layer(G, body, Ls, "lining", dict(lw=0.6, spine_top=0.2, spine_fade=0.2, wt=(0.0, 0.4)), falloff=0.25, clear=0.009)
    cfg = [(0.876, 0.10, 0.52, "accent", 0.0, 0.0), (0.872, 0.10, 0.46, "accent", 0.7, 0.0), (0.868, 0.18, 0.41, "base", 1.4, 0.0),
           (0.864, 0.30, 0.36, "accent", 2.1, 0.0), (0.860, 0.42, 0.30, "base", 2.8, 0.0)]
    for zt_, zh, R, mat, ph, _ in cfg:
        L = layer(body, zt_, zh, R, R * 0.92, nth=96, rows=6, flare=0.8, drop=1.0, top_off=0.016, ruffle=(0.025, 14), zwave=(0.012, 14, ph), scallop=(0.012, 14))
        add_layer(G, body, L, mat, dict(lw=0.6, spine_top=0.2, spine_fade=0.2, wt=(0.0, 0.4)), falloff=0.25, clear=0.009)
    mats = {"base": ("#fbf7ee", "tulle"), "accent": ("#efe6d2", "tulle"), "trim": ("#f3ede0", "satin"), "lining": ("#efe8d8", "satin")}
    meta = meta_of("gala_tulle", "Vestido de gala em tule", "dress", ["base", "accent", "trim", "lining"], {"base": "#fbf7ee", "accent": "#efe6d2", "trim": "#f3ede0", "lining": "#efe8d8"},
                   {"base": "tulle", "accent": "tulle", "trim": "satin", "lining": "satin"},
                   {"base": ["tulle", "satin", "lace", "glitter"], "accent": ["tulle", "satin", "lace", "glitter"], "trim": ["satin", "pearl", "lace", "gold"], "lining": ["satin", "matte"]},
                   ["torso", "hips", "legs"], hides=["top", "bottom", "legs"],
                   tags=dict(styles=["gala", "romantico", "rococo"], colors=["branco"], formality=1.0, rarity="epico"),
                   notes="corpete+cinto = slot trim (cetim); camadas de saia = base/accent (tule, alpha blend)")
    return G, mats, meta

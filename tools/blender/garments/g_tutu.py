"""2. Mini saia tutu de tule: 4 camadas com barra escalopada, cos de cetim. Parametrica, presa no quadril."""
import numpy as np, math
from garment_lib import *
from skirts import *


def build(body):
    G = Garment("tutu", body)
    # waistband (satin) - cylinder with a little bulge
    band = layer(body, 0.882, 0.836, None, None, nth=80, rows=4, flare=1.0, drop=1.0, top_off=0.013, row_t=[0, 0.3, 0.7, 1.0],
                 extra_r=lambda t, th: 0.004 * np.sin(math.pi * t) + 0.0 * th)
    add_layer(G, body, band, "trim", dict(lw=0.0, spine_top=0.45, spine_fade=0.9), falloff=0.3, clear=0.007)
    cfg = [(0.668, 0.372, 0.866, "base", 0.0), (0.690, 0.346, 0.870, "accent", 0.6), (0.712, 0.320, 0.874, "base", 1.3), (0.734, 0.294, 0.878, "accent", 2.0)]
    for zh, R, zt, mat, ph in cfg:
        L = layer(body, zt, zh, R, R * 0.88, nth=100, rows=5, flare=0.75, drop=1.35, top_off=0.016, ruffle=(0.035, 15), zwave=(0.010, 20, ph), scallop=(0.016, 20))
        add_layer(G, body, L, mat, dict(lw=0.55, spine_top=0.2, spine_fade=0.25), falloff=0.25, clear=0.008)
    mats = {"base": ("#ffb3d1", "tulle"), "accent": ("#ffe0ef", "tulle"), "trim": ("#ff4f9a", "satin")}
    meta = dict(id="tutu", label="Saia tutu", slot="bottom", slots=["base", "accent", "trim"],
                palette={"base": "#ffb3d1", "accent": "#ffe0ef", "trim": "#ff4f9a"}, finish={"base": "tulle", "accent": "tulle", "trim": "satin"},
                finishesSupported={"base": ["tulle", "glitter", "satin", "lace"], "accent": ["tulle", "glitter", "satin", "lace"], "trim": ["satin", "latex", "pearl"]},
                covers=["hips", "upperThighs"], hides=[], notes="tulle = alpha blend; double sided")
    return G, mats, meta

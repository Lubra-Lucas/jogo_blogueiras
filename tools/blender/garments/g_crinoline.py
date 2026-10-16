"""Saia crinolina rococo: cupula redonda com aros de fita, fileira de lacos e babado de renda."""
from gx3 import *


def build(body):
    G = Garment("crinoline", body)
    b = waistband(G, body, 0.890, 0.838, "trim", bulge=0.004)
    nth = 112
    rows_t = [0, 0.04, 0.10, 0.18, 0.28, 0.40, 0.54, 0.68, 0.82, 0.93, 1.0]
    bell = layer(body, 0.882, 0.12, 0.54, 0.50, nth=nth, rows=len(rows_t), flare=0.5, drop=1.0, top_off=0.014, row_t=rows_t)
    add_layer(G, body, bell, "base", dict(lw=0.1, spine_top=0.2, spine_fade=0.1), falloff=0.25, clear=0.01)
    bi = len(G.parts) - 1
    # ribbon hoops around the dome
    for zr in (0.66, 0.46, 0.28):
        rr = float(np.mean(layer_radius_at(bell, zr))) + 0.008
        band = layer(body, zr + 0.016, zr - 0.016, None, None, nth=nth, rows=3, flare=1.0, drop=1.0, top_off=0.0,
                     r_top_arr=layer_radius_at(bell, zr + 0.016) + 0.006, hem_arr=layer_radius_at(bell, zr - 0.016) + 0.006, env_clear=0.0, row_t=[0, 0.5, 1.0])
        add_layer(G, body, band, "accent", dict(lw=0.1, spine_top=0.0, spine_fade=0.1), falloff=0.25, clear=0.008)
    rt = layer_radius_at(bell, 0.20) - 0.01; rh = layer_radius_at(bell, 0.075) + 0.045
    L = layer(body, 0.20, 0.085, None, None, nth=nth, rows=5, flare=0.8, drop=1.0, top_off=0.0, r_top_arr=rt, hem_arr=rh,
              ruffle=(0.03, 22), zwave=(0.012, 22, 0.3), scallop=(0.016, 28), env_clear=0.0)
    add_layer(G, body, L, "lining", dict(lw=0.1, spine_top=0.0, spine_fade=0.1), falloff=0.25, clear=0.008)
    for zz in (0.74, 0.55, 0.37):
        rr = float(layer_radius_at(bell, zz)[0]) + 0.02
        bow_on_part(G, body, bi, 0.0, zz, rr, 1.5)
    mats = {"base": ("#e7d7a8", "satin"), "accent": ("#7a1f3a", "satin"), "trim": ("#d6b25a", "gold"), "lining": ("#ffffff", "lace")}
    meta = meta_of("crinoline", "Saia crinolina rococó com laços", "bottom", ["base", "accent", "trim", "lining"],
                   {"base": "#e7d7a8", "accent": "#7a1f3a", "trim": "#d6b25a", "lining": "#ffffff"},
                   {"base": "satin", "accent": "satin", "trim": "gold", "lining": "lace"},
                   {"base": ["satin", "latex", "glitter", "lace", "matte"], "accent": ["satin", "latex", "matte", "glitter"], "trim": ["gold", "pearl", "satin"], "lining": ["lace", "tulle", "satin"]},
                   ["hips", "legs"], hides=["legs"], tags=dict(styles=["rococo", "gala", "romantico"], colors=["champanhe", "vinho"], formality=1.0, rarity="lendario"))
    return G, mats, meta

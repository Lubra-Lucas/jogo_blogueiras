"""Vestido de baile princesa completo: corpete coracao + saia de baile rococo integrados (um so item)."""
import numpy as np, math
from garment_lib import *
from garment_extras import *
from skirts import *
import g_corset
from g_ballgown import add_bow
from gx import meta_of


def build(body):
    Gc, _, _ = g_corset.build(body)
    G = Garment("princess_ball", body)
    remap = {"base": "base", "trim": "accent", "accent": "trim"}
    for p in Gc.parts:
        p['mat'] = [G.mat_index(remap[Gc.mats[i]]) for i in p['mat']]
        G.parts.append(p)
    nb = len(G.parts)
    nth = 96
    band = layer(body, 0.886, 0.834, None, None, nth=80, rows=4, flare=1.0, drop=1.0, top_off=0.013, row_t=[0, 0.3, 0.7, 1.0],
                 extra_r=lambda t, th: 0.004 * np.sin(math.pi * t) + 0.0 * th)
    add_layer(G, body, band, "trim", dict(lw=0.0, spine_top=0.45, spine_fade=0.9), falloff=0.3, clear=0.007)
    bidx = len(G.parts) - 1
    pan = lambda t, th: 0.10 * np.sin(math.pi * np.clip(t / 0.8, 0, 1)) * np.abs(np.sin(th)) ** 2.2
    rows_t = [0, 0.05, 0.12, 0.22, 0.34, 0.48, 0.64, 0.82, 1.0]
    bell = layer(body, 0.880, 0.085, 0.47, 0.40, nth=nth, rows=len(rows_t), flare=0.55, drop=1.0, top_off=0.014, extra_r=pan, row_t=rows_t)
    add_layer(G, body, bell, "base", dict(lw=0.12, spine_top=0.2, spine_fade=0.1), falloff=0.25, clear=0.01)
    for ztop, zhem, extra, ph, mat in ((0.60, 0.20, 0.07, 0.0, "accent"), (0.38, 0.095, 0.085, 1.4, "accent")):
        rt = layer_radius_at(bell, ztop) + 0.014; rh = layer_radius_at(bell, zhem) + extra
        L = layer(body, ztop, zhem, None, None, nth=nth, rows=5, flare=0.7, drop=1.0, top_off=0.0, r_top_arr=rt, hem_arr=rh,
                  ruffle=(0.03, 18), zwave=(0.014, 18, ph), scallop=(0.018, 24), env_clear=0.0)
        add_layer(G, body, L, mat, dict(lw=0.12, spine_top=0.0, spine_fade=0.1), falloff=0.25, clear=0.008)
    rt = layer_radius_at(bell, 0.135) - 0.02; rh = layer_radius_at(bell, 0.04) + 0.07
    L = layer(body, 0.135, 0.045, None, None, nth=nth, rows=4, flare=0.8, drop=1.0, top_off=0.0, r_top_arr=rt, hem_arr=rh, ruffle=(0.03, 20), zwave=(0.008, 20, 0.7), scallop=(0.012, 30), env_clear=0.0)
    add_layer(G, body, L, "lining", dict(lw=0.1, spine_top=0.0, spine_fade=0.1), falloff=0.25, clear=0.008)
    add_bow(G, body, bidx, math.pi / 2, 0.862, 1.4)
    add_bow(G, body, bidx, -math.pi / 2, 0.862, 1.4)
    mats = {"base": ("#6a3fa8", "satin"), "accent": ("#d9c8ff", "satin"), "trim": ("#e8b84a", "gold"), "lining": ("#ffffff", "tulle")}
    meta = meta_of("princess_ball", "Vestido de baile princesa", "dress", ["base", "accent", "trim", "lining"],
                   {"base": "#6a3fa8", "accent": "#d9c8ff", "trim": "#e8b84a", "lining": "#ffffff"},
                   {"base": "satin", "accent": "satin", "trim": "gold", "lining": "tulle"},
                   {"base": ["satin", "latex", "glitter", "lace", "matte"], "accent": ["satin", "tulle", "lace", "glitter"], "trim": ["gold", "pearl", "satin"], "lining": ["tulle", "lace"]},
                   ["torso", "hips", "legs"], hides=["top", "bottom", "legs"],
                   tags=dict(styles=["gala", "rococo", "romantico"], colors=["roxo", "dourado"], formality=1.0, rarity="lendario"),
                   notes="corpete (corset) + saia de baile (ballgown) fundidos")
    return G, mats, meta

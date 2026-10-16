"""4. Saia de baile (overskirt de vestido): sino rococo com paniers, babados na barra, anaguas de tule, lacos nos quadris."""
import numpy as np, math
from garment_lib import *
from garment_extras import *
from skirts import *


def add_bow(G, body, band_idx, theta, z, size, rot=0.0):
    bv, bp, bs = bow_local(size)
    th = theta
    r_band = float(env_at(envelope(body, z), np.array([th % (2 * math.pi)]))[0]) + 0.02
    ax_, ay_ = AX[0] + r_band * math.sin(th), AX[1] - r_band * math.cos(th)
    out = np.array([math.sin(th), -math.cos(th)]); lat = np.array([math.cos(th), math.sin(th)])
    pts = np.stack([ax_ + bv[:, 0] * lat[0] + bv[:, 1] * out[0], ay_ + bv[:, 0] * lat[1] + bv[:, 1] * out[1], z + bv[:, 2]], 1)
    part = G.parts[band_idx]
    bandS = part['V']; pa = tri_split(part['polys'])
    at = AttachF(bandS["Basis"], pa, pts)
    Vs = {s: at.eval(bandS[s]) for s in body.states}
    cen = Vs["Basis"].mean(0)
    pl = orient_polys(bp, Vs["Basis"], Vs["Basis"] - cen)
    G.add(Vs, pl, bs, planar_uv(Vs["Basis"], pl), part['W'][at.weights_src()])


def build(body):
    G = Garment("ballgown", body)
    band = layer(body, 0.886, 0.834, None, None, nth=80, rows=4, flare=1.0, drop=1.0, top_off=0.013, row_t=[0, 0.3, 0.7, 1.0],
                 extra_r=lambda t, th: 0.004 * np.sin(math.pi * t) + 0.0 * th)
    add_layer(G, body, band, "trim", dict(lw=0.0, spine_top=0.45, spine_fade=0.9), falloff=0.3, clear=0.007)
    nth = 120
    pan = lambda t, th: 0.13 * np.sin(math.pi * np.clip(t / 0.8, 0, 1)) * np.abs(np.sin(th)) ** 2.2
    rows_t = [0, 0.04, 0.09, 0.16, 0.25, 0.36, 0.5, 0.66, 0.83, 1.0]
    bell = layer(body, 0.880, 0.085, 0.50, 0.40, nth=nth, rows=len(rows_t), flare=0.55, drop=1.0, top_off=0.014, extra_r=pan, row_t=rows_t,
                 ruffle=(0.0, 9), zwave=(0.0, 9, 0.0))
    add_layer(G, body, bell, "base", dict(lw=0.12, spine_top=0.2, spine_fade=0.1), falloff=0.25, clear=0.01)
    th = np.arange(nth) * 2 * math.pi / nth
    # flounces (ruffled tiers) following the bell radius
    for ztop, zhem, extra, ph, mat in ((0.62, 0.22, 0.075, 0.0, "accent"), (0.40, 0.095, 0.09, 1.4, "accent")):
        rt = layer_radius_at(bell, ztop) + 0.014
        rh = layer_radius_at(bell, zhem) + extra
        L = layer(body, ztop, zhem, None, None, nth=nth, rows=5, flare=0.7, drop=1.0, top_off=0.0, r_top_arr=rt, hem_arr=rh,
                  ruffle=(0.03, 18), zwave=(0.014, 18, ph), scallop=(0.018, 24), env_clear=0.0)
        add_layer(G, body, L, mat, dict(lw=0.12, spine_top=0.0, spine_fade=0.1), falloff=0.25, clear=0.008)
    # petticoat frill peeking under the hem
    rt = layer_radius_at(bell, 0.135) - 0.02
    rh = layer_radius_at(bell, 0.04) + 0.07
    L = layer(body, 0.135, 0.045, None, None, nth=nth, rows=4, flare=0.8, drop=1.0, top_off=0.0, r_top_arr=rt, hem_arr=rh, ruffle=(0.03, 20), zwave=(0.008, 20, 0.7), scallop=(0.012, 30), env_clear=0.0)
    add_layer(G, body, L, "lining", dict(lw=0.1, spine_top=0.0, spine_fade=0.1), falloff=0.25, clear=0.008)
    # side bows on the panniers (use the waistband as anchor)
    add_bow(G, body, 0, math.pi / 2, 0.862, 1.5)
    add_bow(G, body, 0, -math.pi / 2, 0.862, 1.5)
    mats = {"base": ("#fff0f6", "satin"), "accent": ("#ffc4dd", "satin"), "trim": ("#e8b84a", "satin"), "lining": ("#ffffff", "tulle")}
    meta = dict(id="ballgown", label="Saia de baile rococó", slot="bottom", slots=["base", "accent", "trim", "lining"],
                palette={"base": "#fff0f6", "accent": "#ffc4dd", "trim": "#e8b84a", "lining": "#ffffff"},
                finish={"base": "satin", "accent": "satin", "trim": "satin", "lining": "tulle"},
                finishesSupported={"base": ["satin", "latex", "glitter", "lace", "matte"], "accent": ["satin", "tulle", "lace", "glitter"], "trim": ["satin", "pearl", "gold"], "lining": ["tulle", "lace"]},
                covers=["hips", "legs"], hides=["legs"], notes="combine with corset to form a dress; floor length")
    return G, mats, meta

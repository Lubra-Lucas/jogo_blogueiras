"""3. Saia midi evase (A-line) de cetim com laco na cintura. Parametrica, presa no quadril."""
import numpy as np, math
from garment_lib import *
from garment_extras import *
from skirts import *


def build(body):
    G = Garment("aline", body)
    band = layer(body, 0.886, 0.838, None, None, nth=80, rows=4, flare=1.0, drop=1.0, top_off=0.013, row_t=[0, 0.3, 0.7, 1.0],
                 extra_r=lambda t, th: 0.004 * np.sin(math.pi * t) + 0.0 * th)
    add_layer(G, body, band, "trim", dict(lw=0.0, spine_top=0.45, spine_fade=0.9), falloff=0.3, clear=0.007)
    rows_t = [0, 0.12, 0.3, 0.5, 0.7, 0.86, 0.945, 1.0]
    L = layer(body, 0.878, 0.395, 0.36, 0.315, nth=96, rows=8, flare=0.62, drop=1.0, top_off=0.014, ruffle=(0.012, 12), zwave=(0.006, 12, 0.0), row_t=rows_t)
    nth = 96
    mats = ["trim" if (i // nth) >= 6 else "base" for i in range(len(L['polys']))]
    S, g = states_for(body, L['P'], L['polys'], falloff=0.25, clear=0.009)
    W = weights_smooth(g, skirt_weights(body, L['P'], L['t'], lw=0.9, spine_top=0.2, spine_fade=0.25, wt=(0.0, 0.25), split=0.07), 1)
    G.add(S, L['polys'], mats, cyl_uv(L['P'], L['polys'], AX), W)
    # bow on the front-left of the waistband
    bv, bp, bs = bow_local(1.7)
    ang = math.radians(0)
    q = np.array([AX[0] + 0.0, AX[1] - 0.0, 0.0])
    # anchor on the band surface at the front (theta=0): outermost point of the band row z=0.872
    th = 0.0
    r_band = float(env_at(envelope(body, 0.872), np.array([th]))[0]) + 0.018
    anchor = np.array([AX[0] + r_band * math.sin(th), AX[1] - r_band * math.cos(th), 0.868])
    # local -> world: x lateral(+X), y outward(-Y), z up
    pts = np.stack([anchor[0] + bv[:, 0], anchor[1] - bv[:, 1], anchor[2] + bv[:, 2]], 1)
    bandS = {s: G.parts[0]['V'][s] for s in body.states}
    pa = tri_split(G.parts[0]['polys'])
    at = AttachF(bandS["Basis"], pa, pts)
    Vs = {s: at.eval(bandS[s]) for s in body.states}
    pl = orient_polys(bp, Vs["Basis"], np.stack([np.zeros(len(pts)), -np.ones(len(pts)), np.zeros(len(pts))], 1) + (Vs["Basis"] - Vs["Basis"].mean(0)) * 3)
    Wb = G.parts[0]['W'][at.weights_src()]
    G.add(Vs, pl, bs, planar_uv(Vs["Basis"], pl), Wb)
    mats_ = {"base": ("#c8a4ff", "satin"), "trim": ("#ffffff", "satin"), "accent": ("#ff7ab8", "satin")}
    meta = dict(id="aline", label="Saia midi evasê com laço", slot="bottom", slots=["base", "trim", "accent"],
                palette={"base": "#c8a4ff", "trim": "#ffffff", "accent": "#ff7ab8"}, finish={"base": "satin", "trim": "satin", "accent": "satin"},
                finishesSupported={"base": ["satin", "latex", "matte", "glitter", "lace"], "trim": ["satin", "pearl", "lace"], "accent": ["satin", "latex", "pearl"]},
                covers=["hips", "thighs", "knees"], hides=[], notes="bow slot accent = knot, bow loops/tails = base")
    return G, mats_, meta

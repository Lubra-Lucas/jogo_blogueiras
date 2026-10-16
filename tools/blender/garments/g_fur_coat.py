"""Casaco de pele fake: volume fofo ate o meio da coxa, gola e punhos felpudos."""
from gx3 import *


def build(body):
    I = info(body); G = Garment("fur_coat", body)
    zb = lambda x, y: 0.84 + 0 * x
    sel = torso_sel(I, zb, neck=(0.070, 0.08, 0.060, 0.0, 1.08), sleeve=1.88)
    def off(P0, I_, V):
        s = I_.s[V]; arm = I_.arm[V]
        fluff = 0.004 * np.sin(P0[:, 2] * 170 + P0[:, 0] * 90) + 0.004 * np.sin(P0[:, 2] * 90 - P0[:, 1] * 130)
        return np.where(arm, 0.034 - 0.012 * smoothstep(1.55, 1.88, s) + fluff, 0.036 + fluff)
    r = shell(body, G, sel, off=off, hem=zb, sleeve_end=1.88, clear=0.008, smooth=(10, 4, 3), target=5000, mat="base")
    L = env_layer(body, 0.866, 0.585, nth=104, rows=8, off=lambda t, th: 0.040 + 0.06 * t ** 1.2 + 0.010 * np.sin(23 * th) * t + 0.006 * np.sin(41 * th + 1),
                  zwave=(0.014, 26, 0.0), scallop=(0.02, 26))
    add_layer(G, body, L, "base", dict(lw=0.4, spine_top=0.25, spine_fade=0.3), falloff=0.25, clear=0.011)
    ruff_neck(G, body, r, cx=0.0, cy=0.0, base_r=(0.068, 0.066), layers=2, z0=1.20, spread=0.06, nth=88, waves=30, mat="trim")
    mats = {"base": ("#f1ece4", "matte"), "trim": ("#e2dacd", "matte")}
    meta = meta_of("fur_coat", "Casaco de pele fake", "top", ["base", "trim"], {"base": "#f1ece4", "trim": "#e2dacd"}, {"base": "matte", "trim": "matte"},
                   {"base": ["matte", "satin", "glitter", "latex"], "trim": ["matte", "satin"]}, ["torso", "arms", "hips", "upperThighs"],
                   tags=dict(styles=["gala", "rococo", "y2k"], colors=["branco"], formality=0.8, rarity="epico"),
                   notes="casaco longo ate a coxa: slot top (cobre a saia curta); use com calca/saia longa")
    return G, mats, meta

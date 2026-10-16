"""Top com gola rufo elisabetana de tres camadas e mangas bufantes curtas."""
from gx3 import *


def build(body):
    I = info(body); G = Garment("ruff_top", body)
    zb = lambda x, y: 0.85 + 0 * x
    sel = torso_sel(I, zb, neck=(0.052, 0.058, 0.05, 0.0, 1.12), sleeve=0.85)
    def off(P0, I_, V):
        s = I_.s[V]; arm = I_.arm[V]
        return np.where(arm, 0.010 + 0.026 * np.sin(np.pi * np.clip(s / 0.85, 0, 1)), 0.0085)
    mt = lambda c, r: ["accent" if r.arm_poly[i] and r.I.s[r.V][r.pa[i]].mean() > 0.55 else "base" for i in range(len(c))]
    r = shell(body, G, sel, off=off, hem=zb, sleeve_end=0.85, clear=0.006, smooth=(14, 6, 3), mat=mt, target=4200)
    ruff_neck(G, body, r, cx=0.0, cy=0.002, base_r=(0.058, 0.056), layers=3, z0=1.185, spread=0.055, mat="trim")
    front_placket(G, body, r, 0.88, 1.12, 0.008, "accent")
    mats = {"base": ("#1c1a24", "satin"), "accent": ("#b8923c", "gold"), "trim": ("#f4f0e6", "satin")}
    meta = meta_of("ruff_top", "Top com gola rufo", "top", ["base", "accent", "trim"], {"base": "#1c1a24", "accent": "#b8923c", "trim": "#f4f0e6"},
                   {"base": "satin", "accent": "gold", "trim": "satin"},
                   {"base": ["satin", "matte", "latex", "glitter"], "accent": ["gold", "satin", "pearl"], "trim": ["satin", "tulle", "lace", "matte"]}, ["torso", "upperArms", "neck"],
                   tags=dict(styles=["rococo", "gala", "goth"], colors=["preto", "dourado"], formality=0.9, rarity="epico"))
    return G, mats, meta

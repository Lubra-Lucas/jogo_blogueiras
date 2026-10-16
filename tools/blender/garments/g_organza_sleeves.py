"""Top justo com mangas gigantes de organza (balao ate o punho)."""
from gx3 import *


def build(body):
    I = info(body); G = Garment("organza_sleeves", body)
    zb = lambda x, y: 0.88 + 0 * x
    sel = torso_sel(I, zb, neck=(0.075, 0.075, 0.056, 0.0, 1.10), sleeve=1.9)
    def off(P0, I_, V):
        s = I_.s[V]; arm = I_.arm[V]
        giant = 0.012 + 0.062 * np.sin(np.pi * np.clip((s + 0.05) / 1.95, 0, 1)) ** 0.9 * (1 - smoothstep(1.6, 1.9, s) * 0.85)
        return np.where(arm, giant, 0.0065)
    mt = lambda c, r: ["accent" if r.arm_poly[i] else "base" for i in range(len(c))]
    r = shell(body, G, sel, off=off, hem=zb, sleeve_end=1.9, clear=0.006, smooth=(22, 8, 4), mat=mt, target=5200)
    mats = {"base": ("#2a1f3d", "satin"), "accent": ("#e8dff5", "tulle")}
    meta = meta_of("organza_sleeves", "Top com mangas gigantes de organza", "top", ["base", "accent"], {"base": "#2a1f3d", "accent": "#e8dff5"}, {"base": "satin", "accent": "tulle"},
                   {"base": ["satin", "matte", "latex", "glitter"], "accent": ["tulle", "lace", "satin", "glitter"]}, ["torso", "arms"],
                   tags=dict(styles=["gala", "rococo", "romantico"], colors=["roxo", "branco"], formality=0.85, rarity="epico"))
    return G, mats, meta

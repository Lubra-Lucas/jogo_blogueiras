"""Blusa ombro a ombro com babado e mangas soltas."""
from gx2 import *


def build(body):
    I = info(body); G = Garment("off_shoulder", body)
    zb = lambda x, y: 0.90 + 0 * x
    x, y, z = I.x, I.y, I.z
    sel = (z >= 0.90) & (z <= 1.108) & ~I.head & ~I.foot & ~(I.arm & ((I.s > 0.75) | I.hand)) & (np.abs(x) < 0.30)
    def off(P0, I_, V):
        return 0.0075 + 0.012 * smoothstep(0.1, 0.5, I_.s[V]) * I_.arm[V]
    r = shell(body, G, sel, hem_flare=0.012, off=off, hem=zb, sleeve_end=0.75, clear=0.006)
    frill_ring(G, body, r, 1.105, 0.095, 0.058, cx=0.0, cy=-0.004, width=0.045, drop=0.03, waves=22, amp=0.003, mat="trim", up=0.006)
    mats = {"base": ("#f2efe6", "satin"), "trim": ("#f2efe6", "satin")}
    meta = meta_of("off_shoulder", "Blusa ombro a ombro", "top", ["base", "trim"], {"base": "#f2efe6", "trim": "#f2efe6"}, {"base": "satin", "trim": "satin"},
                   {"base": ["satin", "matte", "lace", "glitter"], "trim": ["satin", "tulle", "lace", "matte"]}, ["torso", "upperArms"],
                   tags=dict(styles=["romantico", "casual", "praia"], colors=["branco"], formality=0.45, rarity="comum"))
    return G, mats, meta

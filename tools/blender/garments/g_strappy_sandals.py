"""Sandalia de salto fino com tiras: sola fina, tira de tornozelo, tira no peito do pe' e tira central."""
from shoes_lib import *


def build(body):
    G = Garment("strappy_sandals", body)
    r = shoe_shell(body, G, ztop=0.215, off=0.0035, clear=0.003, smooth=(8, 3, 2), keep=False, target=3800)
    prof = sole_loft(G, body, r, th=0.0042, margin=0.0035)
    for sgn in (1, -1):
        yh = prof[sgn]["zb"][-1][0] - 0.012
        zb, xcen, _, _ = sole_at(prof[sgn], yh)
        column(G, body, xcen, yh, zb + 0.006, -0.0042, (0.0088, 0.0088), (0.0036, 0.0036), "trim")
        ring_strap(G, body, r, sgn, 0.195, width=0.009, mat="base")
        ring_strap(G, body, r, sgn, 0.105, width=0.0065, mat="base")
        ring_strap(G, body, r, sgn, 0.035, width=0.0075, mat="base")
        vert_strap(G, body, r, sgn, 0.04, 0.20, width=0.0062, mat="base")
        add_studs(G, body, r, front_stud(r, sgn, 0.195, 0.0), 0.0042, 0.004, "accent")
    mats = {"base": ("#c8a165", "satin"), "trim": ("#5a3b2a", "matte"), "accent": ("#d6b25a", "gold")}
    meta = shoe_meta("strappy_sandals", "Sandália de tiras", {k: v for k, v in mats.items()}, None,
                     {"base": ["satin", "matte", "latex", "glitter", "gold"], "trim": ["matte", "satin", "latex"], "accent": ["gold", "pearl"]}, ["feet"], [],
                     dict(styles=["gala", "praia", "romantico", "casual"], colors=["caramelo"], formality=0.65, rarity="comum"), lift=0.0042, height_cm=9)
    return G, mats, meta

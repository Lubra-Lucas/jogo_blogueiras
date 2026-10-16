"""Salto plataforma com bico aberto, tira de tornozelo e salto bloco."""
from shoes_lib import *


def build(body):
    G = Garment("platform_heels", body)
    def holes(cen):
        u, dd = foot_uv(cen)
        return (dd > -0.012) & (u > 0.06) & (u < 0.60) | ((u > 0.86) & (dd > 0.0))
    r = shoe_shell(body, G, ztop=0.205, off=0.0055, clear=0.004, smooth=(20, 8, 3), holes=holes)
    edge_trim(G, body, r, "accent", width=0.0022)
    prof = sole_loft(G, body, r, th=0.006, margin=0.005, front_th=(-0.03, 0.020), edge_clamp=0.009)
    for sgn in (1, -1):
        yh = prof[sgn]["zb"][-1][0] - 0.020
        zb, xcen, _, _ = sole_at(prof[sgn], yh)
        column(G, body, xcen, yh, zb + 0.006, -0.020, (0.018, 0.017), (0.0145, 0.0145), "trim", sq=0.5, n=16)
        ring_strap(G, body, r, sgn, 0.185, width=0.010, mat="base")
        add_studs(G, body, r, front_stud(r, sgn, 0.185, 0.0), 0.0045, 0.004, "accent")
    mats = {"base": ("#1c1c22", "latex"), "trim": ("#2b2b33", "matte"), "accent": ("#d6b25a", "gold")}
    meta = shoe_meta("platform_heels", "Salto plataforma", mats, None,
                     {"base": ["latex", "satin", "matte", "glitter"], "trim": ["matte", "latex", "satin"], "accent": ["gold", "pearl"]}, ["feet"], [],
                     dict(styles=["y2k", "goth", "gala"], colors=["preto"], formality=0.6, rarity="raro"), lift=0.020, height_cm=10)
    return G, mats, meta

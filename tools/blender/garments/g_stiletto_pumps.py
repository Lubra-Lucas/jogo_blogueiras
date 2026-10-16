"""Scarpin de salto agulha (pump classico): cabedal fechado na biqueira e no calcanhar, aberto no peito do pe'."""
from shoes_lib import *


def build(body):
    G = Garment("stiletto_pumps", body)
    def holes(cen):
        u, dd = foot_uv(cen)
        return (dd > -0.019) & (u > 0.05) & (u < 0.74)
    r = shoe_shell(body, G, ztop=0.178, off=0.0065, smooth=(30, 12, 3), clear=0.0045, holes=holes)
    edge_trim(G, body, r, "trim")
    prof = sole_loft(G, body, r, th=0.0045)
    for sgn in (1, -1):
        yh = prof[sgn]["zb"][-1][0] - 0.013
        zb, xcen, _, _ = sole_at(prof[sgn], yh)
        column(G, body, xcen, yh, zb + 0.006, -0.0045, (0.0105, 0.0105), (0.0042, 0.0042), "trim")
    mats = {"base": ("#7a1f2b", "matte"), "trim": ("#2a1a1a", "matte")}
    meta = shoe_meta("stiletto_pumps", "Scarpin salto agulha", {"base": ("#7a1f2b", "matte"), "trim": ("#2a1a1a", "matte")}, None,
                     {"base": ["satin", "latex", "matte", "glitter"], "trim": ["matte", "latex", "satin", "gold"]}, ["feet"], [],
                     dict(styles=["gala", "casual", "romantico"], colors=["vinho"], formality=0.85, rarity="comum"), lift=0.0045, height_cm=10)
    return G, mats, meta

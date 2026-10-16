"""Receitas dos sapatos (cada g_<id>.py chama a funcao homonima). Pe en pointe: ver shoes_lib.py."""
from shoes_lib import *

SOFT = ["matte", "satin", "latex", "glitter"]


def _meta(gid, label, mats, sup, covers, hides, tags, lift, h=None, notes=None):
    return shoe_meta(gid, label, mats, None, sup, covers, hides, tags, lift=lift, notes=notes, height_cm=h)


def mary_janes(body):
    G = Garment("mary_janes", body)
    r = shoe_shell(body, G, ztop=0.175, off=0.0058, clear=0.004, smooth=(26, 10, 3), holes=open_top(0.05, 0.60, -0.016))
    edge_trim(G, body, r, "trim", width=0.0024)
    prof = sole_loft(G, body, r, th=0.006, margin=0.005, front_th=(-0.03, 0.016), edge_clamp=0.009)
    for sgn in (1, -1):
        yh = prof[sgn]["zb"][-1][0] - 0.018
        zb, xcen, _, _ = sole_at(prof[sgn], yh)
        column(G, body, xcen, yh, zb + 0.006, -0.016, (0.016, 0.015), (0.0135, 0.0135), "trim", sq=0.5, n=16)
        cross_strap(G, body, r, sgn, 0.135, hw=0.032, width=0.011, mat="base")
        cross_strap(G, body, r, sgn, 0.135, hw=0.032, width=0.011, mat="base", dz=0.003)
        add_studs(G, body, r, front_stud(r, sgn, 0.135, 0.0), 0.0050, 0.0055, "accent")
    mats = {"base": ("#1d1d24", "latex"), "trim": ("#2a2024", "matte"), "accent": ("#c7c9d1", "gold")}
    return G, mats, _meta("mary_janes", "Mary Jane plataforma", mats,
                          {"base": SOFT, "trim": ["matte", "latex", "satin"], "accent": ["gold", "pearl"]}, ["feet"], [],
                          dict(styles=["casual", "romantico", "goth", "y2k"], colors=["preto"], formality=0.5, rarity="comum"), 0.016, 9)


def ankle_boots(body):
    G = Garment("ankle_boots", body)
    off = lambda P0, I, V: np.where(P0[:, 2] > 0.20, 0.0085, 0.0062)
    mt = lambda c, r: ["trim" if c[i, 2] > 0.305 else "base" for i in range(len(c))]
    r = shoe_shell(body, G, ztop=0.315, hem_tol=0.04, off=off, clear=0.004, smooth=(30, 12, 3), mat=mt, target=3600)
    edge_trim(G, body, r, "accent", width=0.0035)
    prof = sole_loft(G, body, r, th=0.0058, margin=0.005, edge_clamp=0.009)
    for sgn in (1, -1):
        yh = prof[sgn]["zb"][-1][0] - 0.017
        zb, xcen, _, _ = sole_at(prof[sgn], yh)
        column(G, body, xcen, yh, zb + 0.006, -0.0058, (0.016, 0.0155), (0.0135, 0.013), "trim", sq=0.5, n=16)
    mats = {"base": ("#4a3224", "matte"), "trim": ("#2c1e16", "matte"), "accent": ("#b8924f", "gold")}
    return G, mats, _meta("ankle_boots", "Botinha de couro", mats,
                          {"base": SOFT, "trim": ["matte", "latex", "satin"], "accent": ["gold", "pearl", "matte"]}, ["feet", "ankles"], ["legwear"],
                          dict(styles=["casual", "goth", "country"], colors=["marrom"], formality=0.4, rarity="comum"), 0.0058, 8,
                          "cano ate 0.31 m; meias e meias-calca sao escondidas (hides legwear); calca justa fica por dentro do cano")


def knee_boots(body):
    G = Garment("knee_boots", body)
    off = lambda P0, I, V: np.where(P0[:, 2] > 0.20, 0.0078 + 0.0016 * smoothstep(0.22, 0.38, P0[:, 2]), 0.0062)
    mt = lambda c, r: ["trim" if c[i, 2] > 0.42 else "base" for i in range(len(c))]
    r = shoe_shell(body, G, ztop=0.445, hem_tol=0.04, off=off, clear=0.0045, smooth=(30, 12, 3), mat=mt, target=4600)
    edge_trim(G, body, r, "accent", width=0.0035)
    prof = sole_loft(G, body, r, th=0.0058, margin=0.005, edge_clamp=0.009)
    for sgn in (1, -1):
        yh = prof[sgn]["zb"][-1][0] - 0.017
        zb, xcen, _, _ = sole_at(prof[sgn], yh)
        column(G, body, xcen, yh, zb + 0.006, -0.0058, (0.0115, 0.0115), (0.0075, 0.0075), "trim", n=14)
    mats = {"base": ("#241c1a", "matte"), "trim": ("#17110f", "matte"), "accent": ("#8a7a5c", "gold")}
    return G, mats, _meta("knee_boots", "Bota cano alto", mats,
                          {"base": SOFT, "trim": ["matte", "latex", "satin"], "accent": ["gold", "pearl", "matte"]}, ["feet", "ankles", "calves"], ["legwear"],
                          dict(styles=["casual", "goth", "gala"], colors=["preto"], formality=0.6, rarity="raro"), 0.0058, 7,
                          "cano ate 0.445 m (joelho em 0.49): usar com saias e vestidos")


def cowboy_boots(body):
    G = Garment("cowboy_boots", body)
    off = lambda P0, I, V: np.where(P0[:, 2] > 0.20, 0.0085, 0.0062)
    mt = lambda c, r: ["trim" if c[i, 2] < 0.02 else "base" for i in range(len(c))]
    r = shoe_shell(body, G, ztop=0.345, hem_tol=0.04, off=off, clear=0.0042, smooth=(30, 12, 3), mat=mt, target=3600)
    edge_trim(G, body, r, "accent", width=0.0035)
    for sgn in (1, -1):
        for dx in (-0.012, 0.0, 0.012):
            vert_strap(G, body, r, sgn, 0.15, 0.335, dx=dx, width=0.0016, thick=0.0012, mat="accent", step=0.01)
    prof = sole_loft(G, body, r, th=0.0058, margin=0.005, edge_clamp=0.009)
    for sgn in (1, -1):
        yh = prof[sgn]["zb"][-1][0] - 0.015
        zb, xcen, _, _ = sole_at(prof[sgn], yh)
        column(G, body, xcen, yh, zb + 0.006, -0.0058, (0.0155, 0.014), (0.0125, 0.0105), "trim", n=16, dy_bot=-0.008, sq=0.3)
    mats = {"base": ("#7a4a2b", "matte"), "trim": ("#4b3220", "matte"), "accent": ("#d9c7a0", "matte")}
    return G, mats, _meta("cowboy_boots", "Bota cowboy", mats,
                          {"base": SOFT, "trim": ["matte", "latex"], "accent": ["matte", "gold", "pearl"]}, ["feet", "ankles", "calves"], ["legwear"],
                          dict(styles=["country", "casual", "boho"], colors=["marrom"], formality=0.35, rarity="raro"), 0.0058, 6)


def ballet_flats(body):
    G = Garment("ballet_flats", body)
    r = shoe_shell(body, G, ztop=0.17, off=0.005, clear=0.0035, smooth=(26, 10, 3), holes=open_top(0.06, 0.72, -0.010), target=2800)
    edge_trim(G, body, r, "trim", width=0.0020, thick=0.0018)
    sole_loft(G, body, r, th=0.0030, margin=0.0035, edge_clamp=0.006)
    for sgn in (1, -1):
        ring_strap(G, body, r, sgn, 0.158, width=0.007, thick=0.0016, mat="accent", tilt=0.014)
        ring_strap(G, body, r, sgn, 0.158, width=0.007, thick=0.0016, mat="accent", tilt=-0.014)
        ring_strap(G, body, r, sgn, 0.167, width=0.007, thick=0.0016, mat="accent")
        add_studs(G, body, r, front_stud(r, sgn, 0.045, 0.0), 0.0040, 0.0035, "accent")
    mats = {"base": ("#e9e2d6", "satin"), "trim": ("#d6cdbb", "satin"), "accent": ("#e9e2d6", "satin")}
    return G, mats, _meta("ballet_flats", "Sapatilha de balé", mats,
                          {"base": ["satin", "matte", "latex", "glitter"], "trim": ["satin", "matte", "latex"], "accent": ["satin", "matte", "latex"]}, ["feet"], [],
                          dict(styles=["romantico", "casual"], colors=["bege"], formality=0.45, rarity="comum"), 0.003, None,
                          "o pe da boneca e en pointe: a sapatilha le-se como sapatilha de ponta")


def chunky_sneakers(body):
    G = Garment("chunky_sneakers", body)
    off = lambda P0, I, V: np.where(P0[:, 2] > 0.20, 0.0100, 0.0082)
    mt = lambda c, r: ["trim" if (foot_uv(c[i:i + 1])[0][0] > 0.90) else "base" for i in range(len(c))]
    r = shoe_shell(body, G, ztop=0.255, hem_tol=0.04, off=off, clear=0.005, smooth=(34, 14, 4), mat=mt, target=3400)
    edge_trim(G, body, r, "trim", width=0.0055, thick=0.0035)
    for sgn in (1, -1):
        for z in (0.07, 0.10, 0.13, 0.16, 0.19):
            cross_strap(G, body, r, sgn, z, hw=0.026, width=0.0075, thick=0.0028, mat="accent", n=9)
    sole_loft(G, body, r, th=0.012, margin=0.007, floor=lambda y: -0.014, edge_clamp=0.012)
    mats = {"base": ("#f1efe9", "matte"), "trim": ("#d8d3c6", "matte"), "accent": ("#3d5a80", "matte")}
    return G, mats, _meta("chunky_sneakers", "Tênis chunky", mats,
                          {"base": SOFT, "trim": ["matte", "latex", "satin"], "accent": ["matte", "satin", "gold"]}, ["feet", "ankles"], ["legwear"],
                          dict(styles=["casual", "esportivo", "y2k"], colors=["branco"], formality=0.1, rarity="comum"), 0.014, None,
                          "solado cunha ate o chao (en pointe), estilo plataforma inclinado")


def loafers(body):
    G = Garment("loafers", body)
    r = shoe_shell(body, G, ztop=0.17, off=0.0062, clear=0.004, smooth=(30, 12, 3), holes=open_top(0.04, 0.50, -0.010), target=3000)
    edge_trim(G, body, r, "trim", width=0.0028, thick=0.0025)
    for sgn in (1, -1):
        cross_strap(G, body, r, sgn, 0.14, hw=0.034, width=0.014, thick=0.003, mat="base", dz=0.003)
        add_studs(G, body, r, front_stud(r, sgn, 0.14, 0.0), 0.0050, 0.0036, "accent")
    sole_loft(G, body, r, th=0.010, margin=0.006, floor=lambda y: -0.012, edge_clamp=0.010)
    mats = {"base": ("#5a1f2a", "matte"), "trim": ("#2c1a1a", "matte"), "accent": ("#d6b25a", "gold")}
    return G, mats, _meta("loafers", "Mocassim plataforma", mats,
                          {"base": SOFT, "trim": ["matte", "latex"], "accent": ["gold", "pearl"]}, ["feet"], [],
                          dict(styles=["casual", "classico", "preppy"], colors=["bordo"], formality=0.55, rarity="comum"), 0.012)


def beach_wedges(body):
    G = Garment("beach_wedges", body)
    r = shoe_shell(body, G, ztop=0.215, off=0.0035, clear=0.003, smooth=(8, 3, 2), keep=False, target=3000)
    sole_loft(G, body, r, th=0.008, margin=0.005, floor=lambda y: -0.010, edge_clamp=0.010)
    for sgn in (1, -1):
        ring_strap(G, body, r, sgn, 0.05, width=0.014, thick=0.0028, mat="base")
        ring_strap(G, body, r, sgn, 0.12, width=0.012, thick=0.0025, mat="base")
        ring_strap(G, body, r, sgn, 0.19, width=0.008, thick=0.002, mat="accent", tilt=0.012)
        ring_strap(G, body, r, sgn, 0.19, width=0.008, thick=0.002, mat="accent", tilt=-0.012)
        vert_strap(G, body, r, sgn, 0.05, 0.19, width=0.009, mat="base")
    mats = {"base": ("#f0e7d6", "matte"), "trim": ("#b99a6b", "matte"), "accent": ("#2f6f73", "satin")}
    return G, mats, _meta("beach_wedges", "Anabela de praia", mats,
                          {"base": SOFT, "trim": ["matte", "satin"], "accent": ["satin", "matte", "gold"]}, ["feet"], [],
                          dict(styles=["praia", "casual", "boho"], colors=["bege"], formality=0.2, rarity="comum"), 0.010)


def rain_boots(body):
    G = Garment("rain_boots", body)
    off = lambda P0, I, V: np.where(P0[:, 2] > 0.20, 0.0100, 0.0080)
    r = shoe_shell(body, G, ztop=0.375, hem_tol=0.04, off=off, clear=0.0048, smooth=(34, 14, 4), mat="base", target=3800)
    edge_trim(G, body, r, "trim", width=0.0075, thick=0.0035)
    sole_loft(G, body, r, th=0.010, margin=0.0065, floor=lambda y: -0.010, edge_clamp=0.011)
    mats = {"base": ("#d9a521", "latex"), "trim": ("#2a2a2e", "matte")}
    return G, mats, _meta("rain_boots", "Galocha", mats,
                          {"base": ["latex", "satin", "matte", "glitter"], "trim": ["matte", "latex"]}, ["feet", "ankles", "calves"], ["legwear"],
                          dict(styles=["casual", "kawaii", "esportivo"], colors=["amarelo"], formality=0.1, rarity="comum"), 0.010)


def glitter_heels(body):
    G = Garment("glitter_heels", body)
    r = shoe_shell(body, G, ztop=0.185, off=0.0058, clear=0.004, smooth=(26, 10, 3), holes=open_top(0.04, 0.80, -0.021), target=3000)
    edge_trim(G, body, r, "trim", width=0.0022, thick=0.0020)
    prof = sole_loft(G, body, r, th=0.0048, margin=0.0042)
    for sgn in (1, -1):
        yh = prof[sgn]["zb"][-1][0] - 0.013
        zb, xcen, _, _ = sole_at(prof[sgn], yh)
        column(G, body, xcen, yh, zb + 0.006, -0.0048, (0.0095, 0.0095), (0.0038, 0.0038), "base")
        ring_strap(G, body, r, sgn, 0.172, width=0.008, mat="base")
        add_studs(G, body, r, front_stud(r, sgn, 0.172, 0.0), 0.0040, 0.0038, "accent")
    mats = {"base": ("#b9bcc7", "glitter"), "trim": ("#8f93a1", "satin"), "accent": ("#d6d9e2", "pearl")}
    return G, mats, _meta("glitter_heels", "Salto glitter", mats,
                          {"base": ["glitter", "satin", "latex", "matte", "gold"], "trim": ["satin", "gold", "matte"], "accent": ["pearl", "gold"]}, ["feet"], [],
                          dict(styles=["gala", "y2k", "festa"], colors=["prata"], formality=0.9, rarity="epico"), 0.0048, 11)

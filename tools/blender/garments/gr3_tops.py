"""Rodada 3: tops do dia a dia."""
from gr3_common import *


def hoodie(body):
    I = info(body); G = Garment("hoodie", body)
    zb = lambda x, y: 0.80 + 0 * x
    sel = torso_sel(I, zb, neck=(0.062, 0.070, 0.060, 0.0, 1.10), sleeve=1.9)
    def off(P0, I_, V):
        s = I_.s[V]; arm = I_.arm[V]
        return np.where(arm, 0.024 - 0.012 * smoothstep(1.5, 1.88, s), 0.028)
    mt = lambda c, r: ["trim" if (c[i, 2] < 0.82 or (r.arm_poly[i] and r.I.s[r.V][r.pa[i]].mean() > 1.74)) else "base" for i in range(len(c))]
    r = shell(body, G, sel, off=off, hem=zb, sleeve_end=1.9, clear=0.007, smooth=(18, 8, 4), mat=mt)
    # capuz caido nas costas
    xy = lambda th, t: ((0.062 + 0.062 * t) * np.sin(th), 0.004 - (0.062 + 0.062 * t) * np.cos(th))
    zf = lambda th, t: 1.225 - 0.090 * t ** 1.2 * (0.5 + 0.5 * np.clip(-np.cos(th), 0, 1)) + 0.012 * np.sin(t * math.pi)
    polar_strip(G, body, r.part, xy, zf, "base", nth=44, rows=6, closed=False, nref=(0.7, 0.5), th0=0.42 * math.pi, th1=1.58 * math.pi)
    xy2 = lambda th, t: ((0.064 + 0.058 + 0.0015) * np.sin(th) * 1.0, -0.004 - (0.064 + 0.058 + 0.0015) * np.cos(th))
    pocket_front(G, body, r, 0.0, 0.862, 0.13, 0.055, lift=0.0045, mat="base")
    for sg in (1, -1): seam_line(G, body, r, sg * 11, 1.0, 1.095, 0.01, ((-0.0022, 0.0), (0.0, 0.0028), (0.0022, 0.0)), "accent")
    mats = {"base": ("#8d9096", "matte"), "trim": ("#7b7e84", "matte"), "accent": ("#e9e6df", "matte")}
    return G, mats, mk("hoodie", "Moletom com capuz", "top", mats, ["torso", "arms", "hips"], [],
                       dict(styles=["casual", "esportivo", "streetwear"], colors=["cinza"], formality=0.05, rarity="comum"),
                       notes="capuz caido nas costas; bolso canguru; cordoes em accent")


def cropped_sweatshirt(body):
    I = info(body); G = Garment("cropped_sweatshirt", body)
    zb = lambda x, y: 0.935 + 0 * x
    sel = torso_sel(I, zb, neck=(0.060, 0.066, 0.056, 0.0, 1.10), sleeve=1.9)
    def off(P0, I_, V):
        s = I_.s[V]; arm = I_.arm[V]
        return np.where(arm, 0.020 - 0.010 * smoothstep(1.5, 1.88, s), 0.022)
    mt = lambda c, r: ["trim" if (c[i, 2] < 0.955 or (r.arm_poly[i] and r.I.s[r.V][r.pa[i]].mean() > 1.76) or (c[i, 2] > 1.13 and np.hypot(c[i, 0], c[i, 1]) < 0.08)) else "base" for i in range(len(c))]
    r = shell(body, G, sel, off=off, hem=zb, sleeve_end=1.9, clear=0.006, smooth=(16, 7, 3), mat=mt)
    mats = {"base": ("#a8b4a0", "matte"), "trim": ("#94a08c", "matte")}
    return G, mats, mk("cropped_sweatshirt", "Moletom cropped", "top", mats, ["torso", "arms"], [],
                       dict(styles=["casual", "esportivo", "streetwear"], colors=["verde"], formality=0.05, rarity="comum"))


def plaid_shirt(body):
    I = info(body); G = Garment("plaid_shirt", body)
    zb = lambda x, y: 0.78 + 0 * x
    sel = torso_sel(I, zb, neck=(0.054, 0.058, 0.052, 0.0, 1.10), sleeve=1.92)
    def off(P0, I_, V):
        s = I_.s[V]; arm = I_.arm[V]
        return np.where(arm, 0.015 - 0.006 * smoothstep(1.5, 1.9, s), 0.016)
    mt = lambda c, r: ["trim" if (r.arm_poly[i] and abs(r.I.s[r.V][r.pa[i]].mean() - 1.92) < 0.14) else "base" for i in range(len(c))]
    r = shell(body, G, sel, hem_flare=0.012, off=off, hem=zb, sleeve_end=1.92, clear=0.006, smooth=(14, 6, 3), mat=mt)
    collar_flat(G, body, r, r0=(0.054, 0.058), r1=(0.082, 0.078), lift=0.004, mat="base")
    front_placket(G, body, r, 0.80, 1.14, 0.010, "base")
    buttons(G, body, r, np.arange(0.82, 1.12, 0.05), 0.0030, 0.0035, "accent")
    mats = {"base": ("#ffffff", "matte", "xadrez"), "trim": ("#8a2a2a", "matte"), "accent": ("#e9e2d0", "pearl")}
    return G, mats, mk("plaid_shirt", "Camisa xadrez", "top", mats, ["torso", "arms", "hips"], [],
                       dict(styles=["casual", "country", "grunge"], colors=["vermelho"], formality=0.2, rarity="comum"),
                       notes="estampa xadrez embutida no slot base (cor branca = estampa original; qualquer cor tinge)")


def denim_shirt(body):
    I = info(body); G = Garment("denim_shirt", body)
    zb = lambda x, y: 0.79 + 0 * x
    sel = torso_sel(I, zb, neck=(0.054, 0.058, 0.052, 0.0, 1.10), sleeve=1.92)
    def off(P0, I_, V):
        s = I_.s[V]; arm = I_.arm[V]
        return np.where(arm, 0.014 - 0.005 * smoothstep(1.5, 1.9, s), 0.0145)
    r = shell(body, G, sel, hem_flare=0.012, off=off, hem=zb, sleeve_end=1.92, clear=0.006, smooth=(14, 6, 3), mat=arm_trim(1.76))
    collar_flat(G, body, r, r0=(0.054, 0.058), r1=(0.084, 0.080), lift=0.004, mat="base")
    front_placket(G, body, r, 0.80, 1.14, 0.010, "trim")
    buttons(G, body, r, np.arange(0.82, 1.12, 0.05), 0.0032, 0.0038, "accent")
    for sg in (1, -1): add_ribbon(G, body, r, surface_pts(r, sg * 30, np.arange(1.0, 1.04, 0.01)), [(-0.003, 0.0), (0.0, 0.002), (0.003, 0.0)], "trim")
    mats = {"base": ("#7ea0c8", "matte", "jeans"), "trim": ("#5f82ad", "matte"), "accent": ("#d6b25a", "gold")}
    return G, mats, mk("denim_shirt", "Camisa jeans", "top", mats, ["torso", "arms", "hips"], [],
                       dict(styles=["casual", "country", "y2k"], colors=["azul"], formality=0.2, rarity="comum"))


def cami_top(body):
    I = info(body); G = Garment("cami_top", body)
    zb = lambda x, y: 0.865 + 0 * x
    sel = torso_sel(I, zb, neck=(0.075, 0.150, 0.075, 0.0, 1.070), sleeve=None, xs=0.080)
    hi = I.z > 1.07
    sel &= ~hi | ((np.abs(I.x) > 0.034) & (np.abs(I.x) < 0.050))
    r = shell(body, G, sel, hem_flare=0.012, off=0.0050, hem=zb, clear=0.0045, target=2500, smooth=(10, 4, 2))
    bust_trim(G, body, r, 0.866, "trim", n=60)
    mats = {"base": ("#e8e1d4", "satin"), "trim": ("#d6cdbb", "satin")}
    return G, mats, mk("cami_top", "Regata de alcinha", "top", mats, ["torso"], [],
                       dict(styles=["casual", "romantico", "praia"], colors=["bege"], formality=0.15, rarity="comum"),
                       notes="alcas finas (nao cobrem o ombro): o jogo pode tingir a regiao do bodysuit para pele")


def turtleneck_knit(body):
    I = info(body); G = Garment("turtleneck_knit", body)
    zb = lambda x, y: 0.82 + 0 * x
    sel = torso_sel(I, zb, neck=None, sleeve=1.9) | neck_sel(body, I, 1.258)
    def off(P0, I_, V):
        s = I_.s[V]; arm = I_.arm[V]; z = P0[:, 2]
        return np.where(arm, 0.011 - 0.003 * smoothstep(1.5, 1.88, s), np.where(z > 1.12, 0.0085, 0.0105))
    mt = lambda c, r: ["trim" if (c[i, 2] < 0.84 or c[i, 2] > 1.14 or (r.arm_poly[i] and r.I.s[r.V][r.pa[i]].mean() > 1.78)) else "base" for i in range(len(c))]
    r = shell(body, G, sel, hem_flare=0.012, off=off, hem=[zb, lambda x, y: 1.255 + 0 * x], hem_tol=0.03, sleeve_end=1.9, clear=0.005, smooth=(14, 6, 3), mat=mt, target=5200)
    mats = {"base": ("#c9b79c", "matte", "trico"), "trim": ("#b8a587", "matte", "trico")}
    return G, mats, mk("turtleneck_knit", "Blusa de tricô gola alta", "top", mats, ["torso", "arms", "neck"], [],
                       dict(styles=["casual", "classico", "romantico"], colors=["bege"], formality=0.35, rarity="comum"),
                       notes="gola alta cobre o pescoco (base do pescoco ate 1.22 m); estampa trico embutida")


def vest(body):
    I = info(body); G = Garment("vest", body)
    zb = lambda x, y: 0.835 + 0 * x
    sel = torso_sel(I, zb, neck=(0.058, 0.120, 0.058, 0.0, 1.075), sleeve=None, xs=0.088)
    r = shell(body, G, sel, hem_flare=0.012, off=0.0085, hem=zb, clear=0.0055, target=3400, smooth=(12, 5, 2),
              mat=lambda c, r: ["trim" if c[i, 2] < 0.85 else "base" for i in range(len(c))])
    buttons(G, body, r, [0.90, 0.95, 1.00], 0.0036, 0.0045, "accent")
    for sg in (1, -1):
        pts = cast_line(r, [[sg * (0.050 - 0.040 * t), -0.08, 1.12 - 0.17 * t] for t in np.linspace(0, 1, 14)])
        add_ribbon(G, body, r, pts, [(-0.0045, 0.0), (-0.004, 0.0018), (0.004, 0.0018), (0.0045, 0.0)], "trim")
    mats = {"base": ("#3a3f4b", "matte", None), "trim": ("#2a2e38", "satin"), "accent": ("#b9bcc6", "gold")}
    mats["base"] = ("#3a3f4b", "matte")
    return G, mats, mk("vest", "Colete de alfaiataria", "top", mats, ["torso"], [],
                       dict(styles=["classico", "casual", "gala"], colors=["cinza"], formality=0.65, rarity="comum"))


def biker_jacket(body):
    I = info(body); G = Garment("biker_jacket", body)
    zb = lambda x, y: 0.865 + 0 * x
    sel = torso_sel(I, zb, neck=(0.060, 0.080, 0.058, 0.0, 1.09), sleeve=1.9)
    def off(P0, I_, V):
        s = I_.s[V]; arm = I_.arm[V]
        return np.where(arm, 0.0145 - 0.006 * smoothstep(1.6, 1.88, s), 0.0135)
    mt = lambda c, r: ["trim" if ((r.arm_poly[i] and r.I.s[r.V][r.pa[i]].mean() > 1.76) or c[i, 2] < 0.885) else "base" for i in range(len(c))]
    r = shell(body, G, sel, hem_flare=0.012, off=off, hem=zb, sleeve_end=1.9, clear=0.007, smooth=(14, 6, 3), mat=mt)
    collar_flat(G, body, r, r0=(0.060, 0.066), r1=(0.108, 0.100), lift=0.006, mat="base", zdrop=-0.004)
    # ziper diagonal
    pts = cast_line(r, [[0.004 - 0.050 * t, -0.08, 0.89 + 0.255 * t] for t in np.linspace(0, 1, 18)])
    add_ribbon(G, body, r, pts, [(-0.0035, 0.0), (-0.003, 0.0025), (0.003, 0.0025), (0.0035, 0.0)], "accent")
    for sg in (1, -1):
        add_ribbon(G, body, r, surface_pts(r, sg * 55, np.arange(0.93, 1.10, 0.012)), [(-0.004, 0.0), (0.0, 0.002), (0.004, 0.0)], "accent")
        add_studs(G, body, r, surface_pts(r, sg * 22, [0.94, 1.08]), 0.0030, 0.0035, "accent")
    mats = {"base": ("#1d1d21", "latex"), "trim": ("#141417", "latex"), "accent": ("#b3b6bd", "gold")}
    return G, mats, mk("biker_jacket", "Jaqueta de couro biker", "top", mats, ["torso", "arms"], [],
                       dict(styles=["goth", "casual", "rock", "y2k"], colors=["preto"], formality=0.3, rarity="raro"))


def puffer_jacket(body):
    I = info(body); G = Garment("puffer_jacket", body)
    zb = lambda x, y: 0.86 + 0 * x
    sel = torso_sel(I, zb, neck=None, sleeve=1.9) | neck_sel(body, I, 1.25)
    def off(P0, I_, V):
        s = I_.s[V]; arm = I_.arm[V]; z = P0[:, 2]
        quilt = 0.006 * (0.5 + 0.5 * np.cos((z - 0.86) / 0.045 * 2 * math.pi))
        return np.where(arm, 0.030 + quilt - 0.010 * smoothstep(1.6, 1.88, s), np.where(z > 1.13, 0.016, 0.034 + quilt))
    mt = lambda c, r: ["trim" if ((r.arm_poly[i] and r.I.s[r.V][r.pa[i]].mean() > 1.80) or c[i, 2] < 0.88 or c[i, 2] > 1.17) else "base" for i in range(len(c))]
    r = shell(body, G, sel, off=off, hem=[zb, lambda x, y: 1.247 + 0 * x], hem_tol=0.03, sleeve_end=1.9, clear=0.01, smooth=(16, 7, 3), mat=mt, target=5200)
    buttons(G, body, r, [], 0.003, 0.003, "accent")
    pts = np.array([[0.0, -0.1, z] for z in np.arange(0.88, 1.18, 0.012)])
    add_ribbon(G, body, r, surface_pts(r, 0, np.arange(0.88, 1.19, 0.012)), [(-0.004, 0.0), (-0.0035, 0.002), (0.0035, 0.002), (0.004, 0.0)], "accent")
    mats = {"base": ("#e6dccb", "satin"), "trim": ("#cfc3ae", "satin"), "accent": ("#8e8a82", "gold")}
    return G, mats, mk("puffer_jacket", "Jaqueta puffer", "top", mats, ["torso", "arms", "neck"], [],
                       dict(styles=["casual", "esportivo", "inverno"], colors=["bege"], formality=0.15, rarity="comum"),
                       notes="acolchoada (gomos em z); gola alta ate 1.20 m")

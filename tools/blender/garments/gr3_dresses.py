"""Rodada 3: vestidos do dia a dia e de festa."""
from gr3_common import *


def _bodice(body, G, zb_z, neck, sleeve=None, xs=0.085, off=0.0058, target=3200, mat="base", wide=0.16, clear=0.005, hem_extra=None):
    I = info(body)
    zb = lambda x, y: zb_z + 0 * x
    sel = torso_sel(I, zb, neck=neck, sleeve=sleeve, xs=xs, wide=wide)
    return shell(body, G, sel, off=off, hem=zb, sleeve_end=sleeve, clear=clear, target=target, mat=mat)


def tshirt_dress(body):
    G = Garment("tshirt_dress", body)
    r = _bodice(body, G, 0.845, (0.058, 0.07, 0.05, 0.0, 1.10), sleeve=0.52, off=0.0085, target=3400)
    L = env_layer(body, 0.872, 0.60, nth=112, rows=10, off=lambda t, th: 0.0125 + 0.030 * t ** 1.2)
    add_layer_w(G, body, L, "base", lw=0.8, knee=0.3, falloff=0.22, clear=0.008, spine_fade=0.15, wt=(0.0, 0.5))
    mats = {"base": ("#6f7f90", "matte")}
    return G, mats, mk("tshirt_dress", "Vestido camiseta", "dress", mats, ["torso", "hips", "thighs"], ["top", "bottom"],
                       dict(styles=["casual", "esportivo"], colors=["azul"], formality=0.1, rarity="comum"))


def shirtdress(body):
    G = Garment("shirtdress", body)
    I = info(body)
    zb = lambda x, y: 0.84 + 0 * x
    sel = torso_sel(I, zb, neck=(0.054, 0.058, 0.052, 0.0, 1.10), sleeve=1.45)
    mt = lambda c, r: ["trim" if (r.arm_poly[i] and abs(r.I.s[r.V][r.pa[i]].mean() - 1.45) < 0.13) else "base" for i in range(len(c))]
    r = shell(body, G, sel, off=0.0125, hem=zb, sleeve_end=1.45, clear=0.006, smooth=(14, 6, 3), mat=mt, target=3600)
    collar_flat(G, body, r, r0=(0.054, 0.058), r1=(0.084, 0.080), lift=0.004, mat="base")
    front_placket(G, body, r, 0.86, 1.14, 0.010, "trim")
    buttons(G, body, r, np.arange(0.88, 1.12, 0.05), 0.0030, 0.0035, "accent")
    L = env_layer(body, 0.872, 0.50, nth=112, rows=11, off=lambda t, th: 0.0135 + 0.040 * t ** 1.2)
    add_layer_w(G, body, L, "base", lw=0.8, knee=0.3, falloff=0.22, clear=0.008, spine_fade=0.15, wt=(0.0, 0.5))
    waistband(G, body, 0.890, 0.856, "trim", bulge=0.004)
    mats = {"base": ("#b9a77f", "matte"), "trim": ("#8f7e58", "matte"), "accent": ("#e9e2d0", "pearl")}
    return G, mats, mk("shirtdress", "Vestido chemise", "dress", mats, ["torso", "arms", "hips", "thighs", "knees"], ["top", "bottom"],
                       dict(styles=["classico", "casual", "country"], colors=["bege"], formality=0.45, rarity="comum"))


def floral_midi(body):
    G = Garment("floral_midi", body)
    r = _bodice(body, G, 0.845, (0.056, 0.13, 0.058, 0.0, 1.06), sleeve=None, xs=0.082, off=0.0062, target=3000)
    for sg in (1, -1): add_ribbon(G, body, r, cast_line(r, [[sg * (0.050 - 0.040 * t), -0.08, 1.115 - 0.065 * t] for t in np.linspace(0, 1, 8)]), [(-0.003, 0.0), (0.0, 0.0018), (0.003, 0.0)], "trim")
    L = env_layer(body, 0.872, 0.36, nth=120, rows=14, off=lambda t, th: 0.0115 + 0.075 * t ** 1.25 + 0.005 * t * np.sin(7 * th), zwave=(0.012, 9, 0.3))
    add_layer_w(G, body, L, "base", lw=0.8, knee=0.5, falloff=0.22, clear=0.008, spine_fade=0.15, wt=(0.0, 0.5))
    waistband(G, body, 0.894, 0.850, "trim", bulge=0.003)
    mats = {"base": ("#ffffff", "satin", "floral"), "trim": ("#3b5b46", "satin")}
    return G, mats, mk("floral_midi", "Vestido floral midi", "dress", mats, ["torso", "hips", "thighs", "knees", "calves"], ["top", "bottom"],
                       dict(styles=["romantico", "boho", "casual"], colors=["floral"], formality=0.5, rarity="comum"),
                       notes="estampa floral embutida no slot base (branco = estampa original)")


def knit_dress(body):
    G = Garment("knit_dress", body)
    I = info(body)
    zb = lambda x, y: 0.84 + 0 * x
    sel = torso_sel(I, zb, neck=(0.060, 0.066, 0.056, 0.0, 1.10), sleeve=1.9)
    mt = lambda c, r: ["trim" if ((r.arm_poly[i] and r.I.s[r.V][r.pa[i]].mean() > 1.78) or (c[i, 2] > 1.13 and np.hypot(c[i, 0], c[i, 1]) < 0.085)) else "base" for i in range(len(c))]
    r = shell(body, G, sel, off=0.0095, hem=zb, sleeve_end=1.9, clear=0.006, smooth=(14, 6, 3), mat=mt, target=3600)
    L = env_layer(body, 0.872, 0.46, nth=120, rows=14, off=lambda t, th: 0.0115 + 0.012 * t ** 1.3)
    add_layer_w(G, body, L, ["trim" if (i // 120) >= 12 else "base" for i in range(len(L["polys"]))], lw=1.0, knee=0.3, falloff=0.2, clear=0.007, spine_fade=0.15,
                slit=(math.pi, 0.26, 0.5), wt=(0.0, 0.5))
    mats = {"base": ("#c9b79c", "matte", "trico"), "trim": ("#b8a587", "matte", "trico")}
    return G, mats, mk("knit_dress", "Vestido de tricô", "dress", mats, ["torso", "arms", "hips", "thighs", "knees"], ["top", "bottom"],
                       dict(styles=["casual", "classico", "inverno"], colors=["bege"], formality=0.4, rarity="comum"))


def romper(body):
    I = info(body); G = Garment("romper", body)
    zb = lambda x, y: 0.62 + 0 * x
    sel = torso_sel(I, zb, neck=(0.056, 0.078, 0.056, 0.0, 1.115), sleeve=None, xs=0.082, wide=0.17)
    flare = leg_flare(body, [0.9, 0.75, 0.62], [0.0, 0.010, 0.020], inner=0.016)
    mt = lambda c, r: ["trim" if (c[i, 2] < 0.65) else "base" for i in range(len(c))]
    r = shell(body, G, sel, off=lambda P0, I_, V: np.where(P0[:, 2] > 0.80, 0.0075, 0.0085), disp=flare, hem=zb, hem_tol=0.04, clear=0.0055, mat=mt, target=4800, smooth=(14, 6, 3))
    waistband(G, body, 0.890, 0.856, "accent", bulge=0.004)
    mats = {"base": ("#b5654a", "matte"), "trim": ("#9a523a", "matte"), "accent": ("#e3d9c4", "satin")}
    return G, mats, mk("romper", "Macaquinho", "dress", mats, ["torso", "hips", "thighs"], ["top", "bottom"],
                       dict(styles=["casual", "praia", "boho"], colors=["terracota"], formality=0.2, rarity="comum"))


def sequin_mini(body):
    G = Garment("sequin_mini", body)
    I = info(body)
    zb = lambda x, y: 0.84 + 0 * x
    sel = torso_sel(I, zb, neck=(0.056, 0.078, 0.056, 0.0, 1.115), sleeve=None, xs=0.082)
    r = shell(body, G, sel, off=0.0058, hem=zb, clear=0.005, target=2600)
    L = env_layer(body, 0.872, 0.60, nth=120, rows=11, off=lambda t, th: 0.0105 + 0.012 * t ** 1.5)
    add_layer_w(G, body, L, "base", lw=1.0, falloff=0.2, clear=0.007, spine_fade=0.15, wt=(0.0, 0.5))
    mats = {"base": ("#c2a14f", "glitter")}
    return G, mats, mk("sequin_mini", "Vestido de paetê curto", "dress", mats, ["torso", "hips", "thighs"], ["top", "bottom"],
                       dict(styles=["gala", "y2k", "festa"], colors=["dourado"], formality=0.8, rarity="epico"))


def mermaid_gown(body):
    G = Garment("mermaid_gown", body)
    r = _bodice(body, G, 0.84, (0.076, 0.075, 0.066, 0.0, 1.11), sleeve=None, xs=0.080, off=0.0058, target=3000)
    rows_t = [0, 0.05, 0.12, 0.2, 0.3, 0.4, 0.5, 0.58, 0.66, 0.74, 0.82, 0.9, 1.0]
    flare = lambda t: 0.19 * np.clip((t - 0.52) / 0.48, 0, 1) ** 1.7
    L = env_layer(body, 0.872, 0.05, nth=120, row_t=rows_t, mono=True, off=lambda t, th: 0.0105 + flare(t) * (0.7 + 0.3 * np.sin(th / 2) ** 2),
                  hem_extra=lambda t, th: 0.10 * np.clip((t - 0.6) / 0.4, 0, 1) ** 1.6 * np.clip(-np.cos(th), 0, 1) ** 2, zwave=(0.016, 12, 0.4))
    add_layer_w(G, body, L, "base", lw=1.0, knee=0.6, falloff=0.24, clear=0.009, spine_fade=0.15, wt=(0.0, 0.14), train=0.8, split=0.07)
    waistband(G, body, 0.886, 0.846, "trim", bulge=0.003)
    mats = {"base": ("#5a1f3a", "satin"), "trim": ("#d6b25a", "gold")}
    return G, mats, mk("mermaid_gown", "Vestido longo sereia", "dress", mats, ["torso", "hips", "thighs", "knees", "legs"], ["top", "bottom", "legs"],
                       dict(styles=["gala", "romantico"], colors=["vinho"], formality=0.95, rarity="epico"),
                       notes="decote canoa com alcas largas; ajustado ate o joelho e abre em cauda")


def bow_gown(body):
    G = Garment("bow_gown", body)
    I = info(body)
    r = _bodice(body, G, 0.84, (0.058, 0.080, 0.058, 0.0, 1.115), sleeve=None, xs=0.082, off=0.0058, target=3000)
    b = waistband(G, body, 0.894, 0.846, "trim", bulge=0.003)
    L = env_layer(body, 0.872, 0.30, nth=120, rows=14, off=lambda t, th: 0.0115 + 0.10 * t ** 1.3 + 0.006 * t * np.sin(8 * th), zwave=(0.012, 10, 0.2))
    add_layer_w(G, body, L, "base", lw=1.0, knee=0.6, falloff=0.24, clear=0.009, spine_fade=0.15, wt=(0.0, 0.14), split=0.07)
    add_bow_on(G, body, b, math.pi, 0.925, 2.3, rr=0.024)
    mats = {"base": ("#1f5d4e", "satin"), "trim": ("#17493c", "satin"), "accent": ("#2c7a66", "satin")}
    return G, mats, mk("bow_gown", "Vestido de festa com laço nas costas", "dress", mats, ["torso", "hips", "thighs", "knees", "calves"], ["top", "bottom"],
                       dict(styles=["gala", "romantico", "festa"], colors=["verde"], formality=0.9, rarity="epico"),
                       notes="laco gigante nas costas (slot accent = alcas/lacos, base = pontas)")


def ruffle_gown(body):
    G = Garment("ruffle_gown", body)
    r = _bodice(body, G, 0.84, (0.060, 0.080, 0.058, 0.0, 1.115), sleeve=None, xs=0.082, off=0.0058, target=2800)
    waistband(G, body, 0.894, 0.846, "trim", bulge=0.003)
    base = layer(body, 0.880, 0.100, 0.44, 0.38, nth=96, rows=9, flare=0.55, drop=1.0, top_off=0.014, row_t=[0, 0.05, 0.12, 0.22, 0.34, 0.5, 0.68, 0.84, 1.0])
    add_layer(G, body, base, "base", dict(lw=0.12, spine_top=0.2, spine_fade=0.1), falloff=0.25, clear=0.01)
    for i, (zt, zh, ex, ph, mat) in enumerate(((0.700, 0.560, 0.045, 0.0, "accent"), (0.540, 0.390, 0.060, 1.4, "base"), (0.370, 0.220, 0.075, 2.8, "accent"), (0.205, 0.060, 0.090, 4.2, "base"))):
        rt = layer_radius_at(base, zt) + 0.012; rh = layer_radius_at(base, zh) + ex
        L = layer(body, zt, zh, None, None, nth=96, rows=5, flare=0.7, drop=1.0, top_off=0.0, r_top_arr=rt, hem_arr=rh, ruffle=(0.025, 18), zwave=(0.014, 18, ph), scallop=(0.016, 24), env_clear=0.0)
        add_layer(G, body, L, mat, dict(lw=0.12, spine_top=0.0, spine_fade=0.1), falloff=0.25, clear=0.008)
    mats = {"base": ("#ece4d6", "satin"), "trim": ("#cfc4b0", "satin"), "accent": ("#d9cfbd", "satin")}
    return G, mats, mk("ruffle_gown", "Vestido de baile de babados", "dress", mats, ["torso", "hips", "legs"], ["top", "bottom", "legs"],
                       dict(styles=["gala", "romantico", "festa"], colors=["marfim"], formality=0.95, rarity="lendario"),
                       notes="4 camadas de babado opacas sobre saia de baile")


def gala_train_gown(body):
    G = Garment("gala_train_gown", body)
    I = info(body)
    zb = lambda x, y: 0.84 + 0 * x
    sel = torso_sel(I, zb, neck=(0.070, 0.082, 0.062, 0.0, 1.105), sleeve=0.30, wide=0.16)
    r = shell(body, G, sel, off=0.0060, hem=zb, sleeve_end=0.30, clear=0.005, target=3400, mat=lambda c, r_: ["trim" if r_.arm_poly[i] else "base" for i in range(len(c))])
    rows_t = [0, 0.05, 0.12, 0.2, 0.3, 0.42, 0.55, 0.68, 0.8, 0.9, 1.0]
    L = env_layer(body, 0.872, 0.05, nth=112, row_t=rows_t, drop=1.0, mono=True,
                  off=lambda t, th_: 0.011 + 0.15 * np.clip((t - 0.4) / 0.6, 0, 1) ** 1.5 * (0.6 + 0.4 * np.sin(th_ / 2) ** 2),
                  hem_extra=lambda t, th_: 0.36 * np.clip((t - 0.35) / 0.65, 0, 1) ** 1.5 * np.clip(-np.cos(th_), 0, 1) ** 2.0, zwave=(0.012, 9, 0.4))
    add_layer_w(G, body, L, "base", lw=1.0, knee=0.6, falloff=0.25, clear=0.01, spine_fade=0.15, wt=(0.0, 0.14), train=0.9, split=0.07)
    waistband(G, body, 0.894, 0.846, "accent", bulge=0.003)
    mats = {"base": ("#0f3b4a", "satin"), "trim": ("#0b2b36", "satin"), "accent": ("#d6b25a", "gold")}
    return G, mats, mk("gala_train_gown", "Vestido de gala com cauda", "dress", mats, ["torso", "hips", "legs"], ["top", "bottom", "legs"],
                       dict(styles=["gala", "classico"], colors=["azul-petroleo"], formality=1.0, rarity="lendario"),
                       notes="cauda longa nas costas; combina com opera_gloves (slot gloves)")


def satin_suit(body):
    I = info(body); G = Garment("satin_suit", body)
    # calca
    zt = lambda x, y: 0.885 + 0 * x
    zbp = lambda x, y: 0.105 + 0 * x
    selp = leg_sel(I, zbp, zt)
    flare = leg_flare(body, [0.9, 0.7, 0.5, 0.3, 0.2, 0.105], [0.0, 0.008, 0.016, 0.022, 0.026, 0.030], inner=0.016)
    shell(body, G, selp, off=0.0105, disp=flare, hem=[zt, zbp], hem_tol=0.04, clear=0.006, hull=False, mat="base", smooth=(14, 6, 3), target=4400)
    # jaqueta
    zb = lambda x, y: 0.80 + 0 * x
    sel = torso_sel(I, zb, neck=(0.066, 0.115, 0.056, 0.0, 1.06), sleeve=1.92)
    def off(P0, I_, V):
        s = I_.s[V]; arm = I_.arm[V]; z = P0[:, 2]
        return np.where(arm, 0.0125 - 0.004 * smoothstep(1.6, 1.9, s), 0.0155 + 0.004 * smoothstep(0.88, 0.80, z))
    r = shell(body, G, sel, off=off, hem=zb, sleeve_end=1.92, clear=0.006, mat="base", target=4400)
    for sg in (1, -1):
        pts = cast_line(r, [[sg * (0.05 - 0.044 * t), -0.08, 1.16 - 0.215 * t] for t in np.linspace(0, 1, 18)])
        add_ribbon(G, body, r, pts, [(-0.011, 0.0), (-0.010, 0.0028), (0.010, 0.0028), (0.011, 0.0)], "trim")
    buttons(G, body, r, [0.93, 0.89], 0.0045, 0.005, "accent")
    mats = {"base": ("#6e1f2e", "satin"), "trim": ("#541724", "satin"), "accent": ("#d6b25a", "gold")}
    return G, mats, mk("satin_suit", "Terninho de cetim", "dress", mats, ["torso", "arms", "hips", "legs"], ["top", "bottom"],
                       dict(styles=["gala", "classico", "festa"], colors=["vinho"], formality=0.85, rarity="epico"),
                       notes="blazer + calca em um item (slot dress)")


def lurex_jumpsuit(body):
    I = info(body); G = Garment("lurex_jumpsuit", body)
    zb = lambda x, y: 0.11 + 0 * x
    sel = torso_sel(I, zb, neck=(0.040, 0.085, 0.05, 0.0, 1.12), sleeve=None, xs=0.082, wide=0.17)
    flare = leg_flare(body, [0.9, 0.7, 0.5, 0.3, 0.2, 0.11], [0.0, 0.006, 0.014, 0.028, 0.040, 0.048], inner=0.016)
    mt = lambda c, r: ["trim" if (0.850 < c[i, 2] < 0.895) else "base" for i in range(len(c))]
    r = shell(body, G, sel, off=lambda P0, I_, V: np.where(P0[:, 2] > 0.82, 0.0062, 0.0085), disp=flare, hem=zb, hem_tol=0.04, clear=0.0055, mat=mt, target=5200, smooth=(14, 6, 3))
    add_studs(G, body, r, surface_pts(r, 0, [0.872]), 0.0055, 0.0055, "accent")
    mats = {"base": ("#b08a3c", "glitter"), "trim": ("#8a6a28", "gold"), "accent": ("#e3c878", "gold")}
    return G, mats, mk("lurex_jumpsuit", "Macacão de lurex", "dress", mats, ["torso", "hips", "legs"], ["top", "bottom"],
                       dict(styles=["gala", "y2k", "festa"], colors=["dourado"], formality=0.8, rarity="epico"),
                       notes="frente-unica (halter); ajustado no tronco e reto nas pernas")


def y2k_vinyl_set(body):
    I = info(body); G = Garment("y2k_vinyl_set", body)
    zb = lambda x, y: 0.905 + 0 * x
    sel = torso_sel(I, zb, neck=(0.040, 0.085, 0.05, 0.0, 1.14), sleeve=None, xs=0.082)
    r1 = shell(body, G, sel, off=0.0058, hem=zb, clear=0.005, target=2400, mat="base")
    zt = lambda x, y: 0.880 + 0 * x
    zbp = lambda x, y: 0.095 + 0 * x
    selp = leg_sel(I, zbp, zt)
    flare = leg_flare(body, [0.85, 0.6, 0.4, 0.3, 0.2, 0.095], [0.0, 0.0, 0.008, 0.030, 0.056, 0.080], inner=0.016)
    mt = lambda c, r: ["trim" if c[i, 2] > 0.85 else "base" for i in range(len(c))]
    r2 = shell(body, G, selp, off=0.0058, disp=flare, hem=[zt, zbp], hem_tol=0.04, clear=0.005, hull=False, mat=mt, smooth=(10, 4, 2), target=4400)
    add_studs(G, body, r2, surface_pts(r2, 0, [0.866]), 0.0050, 0.005, "accent")
    mats = {"base": ("#b7bcc7", "latex"), "trim": ("#8e94a1", "latex"), "accent": ("#d9dce3", "gold")}
    return G, mats, mk("y2k_vinyl_set", "Conjunto Y2K de vinil", "dress", mats, ["torso", "hips", "legs"], ["top", "bottom"],
                       dict(styles=["y2k", "festa"], colors=["prata"], formality=0.5, rarity="raro"),
                       notes="top halter cropped + calca flare de cintura baixa (cintura de altura media: pouca pele a mostra)")

"""Rodada 3: roupas tematicas, casacos e profissoes."""
from gr3_common import *
import g_gloves


def opera_gloves(body):
    g_gloves.S_CUT = 0.30
    G, _, _ = g_gloves.build(body)
    g_gloves.S_CUT = 0.70
    G.id = "opera_gloves"
    mats = {"base": ("#efe6d6", "satin"), "trim": ("#ffffff", "satin")}
    return G, mats, mk("opera_gloves", "Luvas longas de gala", "gloves", mats, ["hands", "forearms", "upperArms"], [],
                       dict(styles=["gala", "classico", "romantico"], colors=["marfim"], formality=1.0, rarity="epico"),
                       sup={"base": ["satin", "lace", "latex", "matte", "glitter"], "trim": ["satin", "lace", "pearl", "tulle"]}, patterns_ok=False,
                       notes="vao ate acima do cotovelo (s>=0.30 do braco); par do vestido de gala")


def satin_pajamas(body):
    I = info(body); G = Garment("satin_pajamas", body)
    zbp = lambda x, y: 0.12 + 0 * x
    zt = lambda x, y: 0.885 + 0 * x
    selp = leg_sel(I, zbp, zt)
    flare = leg_flare(body, [0.9, 0.7, 0.5, 0.3, 0.2, 0.12], [0.0, 0.010, 0.022, 0.034, 0.040, 0.044], inner=0.016)
    shell(body, G, selp, off=lambda P0, I_, V: np.where(P0[:, 2] > 0.80, 0.0100, 0.0115), disp=flare, hem=[zt, zbp], hem_tol=0.04, clear=0.006, hull=False,
          mat=lambda c, r: ["trim" if (c[i, 2] < 0.15) else "base" for i in range(len(c))], smooth=(16, 7, 3), target=4400)
    zb = lambda x, y: 0.80 + 0 * x
    sel = torso_sel(I, zb, neck=(0.054, 0.10, 0.052, 0.0, 1.10), sleeve=1.92)
    def off(P0, I_, V):
        s = I_.s[V]; arm = I_.arm[V]
        return np.where(arm, 0.015 - 0.005 * smoothstep(1.5, 1.9, s), 0.0155)
    mt = lambda c, r: ["trim" if ((r.arm_poly[i] and abs(r.I.s[r.V][r.pa[i]].mean() - 1.92) < 0.12) or c[i, 2] < 0.815) else "base" for i in range(len(c))]
    r = shell(body, G, sel, off=off, hem=zb, sleeve_end=1.92, clear=0.006, mat=mt, target=4600)
    collar_flat(G, body, r, r0=(0.054, 0.058), r1=(0.078, 0.074), lift=0.004, mat="trim")
    front_placket(G, body, r, 0.82, 1.13, 0.008, "trim")
    buttons(G, body, r, np.arange(0.85, 1.12, 0.055), 0.003, 0.0035, "accent")
    mats = {"base": ("#2a3555", "satin"), "trim": ("#d9d1c0", "satin"), "accent": ("#e8e2d3", "pearl")}
    return G, mats, mk("satin_pajamas", "Pijama de cetim", "dress", mats, ["torso", "arms", "hips", "legs"], ["top", "bottom"],
                       dict(styles=["casual", "romantico", "pijama"], colors=["azul-marinho"], formality=0.05, rarity="comum"))


def tennis_set(body):
    I = info(body); G = Garment("tennis_set", body)
    zb = lambda x, y: 0.84 + 0 * x
    sel = torso_sel(I, zb, neck=(0.056, 0.060, 0.050, 0.0, 1.10), sleeve=0.46)
    mt = lambda c, r: ["trim" if (r.arm_poly[i] and abs(r.I.s[r.V][r.pa[i]].mean() - 0.46) < 0.10) else "base" for i in range(len(c))]
    r = shell(body, G, sel, off=0.0085, hem=zb, sleeve_end=0.46, clear=0.006, mat=mt, target=3200)
    collar_flat(G, body, r, r0=(0.056, 0.060), r1=(0.080, 0.076), lift=0.004, mat="trim")
    front_placket(G, body, r, 0.95, 1.12, 0.008, "base")
    buttons(G, body, r, [1.03, 1.08], 0.0030, 0.0035, "accent")
    waistband(G, body, 0.890, 0.846, "trim", bulge=0.002)
    pleat_skirt(G, body, 0.876, 0.665, 0.105, nth=144, pleats=36, amp=0.011, rows=6, off0=0.016, mat="base", lw=0.7)
    mats = {"base": ("#f2f0ea", "matte"), "trim": ("#1f2f55", "matte"), "accent": ("#c9ccd4", "pearl")}
    return G, mats, mk("tennis_set", "Conjunto de tênis", "dress", mats, ["torso", "arms", "hips", "thighs"], ["top", "bottom"],
                       dict(styles=["esportivo", "preppy", "casual"], colors=["branco"], formality=0.2, rarity="comum"))


def sweat_set(body):
    I = info(body); G = Garment("sweat_set", body)
    zt = lambda x, y: 0.885 + 0 * x
    zbp = lambda x, y: 0.13 + 0 * x
    selp = leg_sel(I, zbp, zt)
    flare = leg_flare(body, [0.9, 0.7, 0.5, 0.35, 0.22, 0.13], [0.0, 0.012, 0.020, 0.016, 0.004, -0.002], inner=0.016)
    shell(body, G, selp, off=lambda P0, I_, V: np.where(P0[:, 2] > 0.80, 0.0115, 0.0105), disp=flare, hem=[zt, zbp], hem_tol=0.035, clear=0.006, hull=False,
          mat=lambda c, r: ["trim" if (c[i, 2] < 0.175 or c[i, 2] > 0.86) else "base" for i in range(len(c))], smooth=(14, 6, 3), target=4400)
    zb = lambda x, y: 0.90 + 0 * x
    sel = torso_sel(I, zb, neck=(0.060, 0.066, 0.056, 0.0, 1.10), sleeve=1.9)
    def off(P0, I_, V):
        s = I_.s[V]; arm = I_.arm[V]
        return np.where(arm, 0.020 - 0.010 * smoothstep(1.5, 1.88, s), 0.023)
    mt = lambda c, r: ["trim" if (c[i, 2] < 0.92 or (r.arm_poly[i] and r.I.s[r.V][r.pa[i]].mean() > 1.76) or (c[i, 2] > 1.13 and np.hypot(c[i, 0], c[i, 1]) < 0.08)) else "base" for i in range(len(c))]
    r = shell(body, G, sel, off=off, hem=zb, sleeve_end=1.9, clear=0.007, mat=mt, smooth=(16, 7, 3), target=4200)
    mats = {"base": ("#9aa0ac", "matte"), "trim": ("#868c98", "matte")}
    return G, mats, mk("sweat_set", "Conjunto de moletom", "dress", mats, ["torso", "arms", "hips", "legs"], ["top", "bottom"],
                       dict(styles=["casual", "esportivo", "streetwear"], colors=["cinza"], formality=0.05, rarity="comum"),
                       notes="top cropped + calca jogger com punho no tornozelo")


def school_uniform(body):
    I = info(body); G = Garment("school_uniform", body)
    zb = lambda x, y: 0.835 + 0 * x
    sel = torso_sel(I, zb, neck=(0.058, 0.066, 0.052, 0.0, 1.10), sleeve=0.50)
    r = shell(body, G, sel, off=0.0080, hem=zb, sleeve_end=0.50, clear=0.006, target=3200, mat="trim")
    collar_flat(G, body, r, r0=(0.056, 0.058), r1=(0.108, 0.094), mat="accent")
    tie_bow(G, body, r, 1.075, 1.3, mat_loop="accent", mat_knot="accent")
    waistband(G, body, 0.890, 0.846, "accent", bulge=0.002)
    pleat_skirt(G, body, 0.876, 0.655, 0.112, nth=144, pleats=36, amp=0.011, rows=6, off0=0.016, mat="base", lw=0.7)
    mats = {"base": ("#ffffff", "matte", "xadrez"), "trim": ("#f4f2ec", "matte"), "accent": ("#23395d", "matte")}
    return G, mats, mk("school_uniform", "Uniforme escolar", "dress", mats, ["torso", "upperArms", "hips", "thighs"], ["top", "bottom"],
                       dict(styles=["preppy", "kawaii", "casual"], colors=["branco", "azul-marinho"], formality=0.35, rarity="comum"),
                       notes="slots: base = saia plissada xadrez, trim = blusa, accent = gola marinheira/gravata/cós")


def gym_set(body):
    I = info(body); G = Garment("gym_set", body)
    zt = lambda x, y: 0.895 + 0 * x
    zbp = lambda x, y: 0.125 + 0 * x
    selp = leg_sel(I, zbp, zt)
    shell(body, G, selp, off=0.0050, hem=[zt, zbp], hem_tol=0.035, clear=0.0045, hull=False, smooth=(10, 4, 2), target=4400,
          mat=lambda c, r: ["trim" if c[i, 2] > 0.86 else "base" for i in range(len(c))])
    zb = lambda x, y: 0.93 + 0 * x
    sel = torso_sel(I, zb, neck=(0.056, 0.080, 0.056, 0.0, 1.115), sleeve=None, xs=0.088)
    r = shell(body, G, sel, off=0.0056, hem=zb, clear=0.0048, target=2400, smooth=(10, 4, 2), mat=lambda c, r_: ["trim" if c[i, 2] < 0.95 else "base" for i in range(len(c))])
    bust_trim(G, body, r, 1.0, "accent", n=60)
    mats = {"base": ("#3b2f4a", "matte"), "trim": ("#2c2338", "matte"), "accent": ("#8fd3c1", "satin")}
    return G, mats, mk("gym_set", "Roupa de academia", "dress", mats, ["torso", "hips", "legs"], ["top", "bottom"],
                       dict(styles=["esportivo", "casual"], colors=["roxo"], formality=0.05, rarity="comum"),
                       notes="top esportivo de cobertura alta + legging; faixa mint (accent)")


def swimsuit(body):
    I = info(body); G = Garment("swimsuit", body)
    zb = lambda x, y: 0.745 + 0 * x
    sel = torso_sel(I, zb, neck=(0.060, 0.085, 0.056, 0.0, 1.115), sleeve=None, xs=0.088, wide=0.17)
    mt = lambda c, r: ["trim" if (c[i, 2] < 0.775) else "base" for i in range(len(c))]
    r = shell(body, G, sel, off=0.0050, hem=zb, hem_tol=0.04, clear=0.0045, target=4600, smooth=(10, 4, 2), mat=mt)
    bust_trim(G, body, r, 0.866, "trim", n=60)
    mats = {"base": ("#1f3a5f", "satin"), "trim": ("#f0ece2", "satin")}
    return G, mats, mk("swimsuit", "Maiô", "dress", mats, ["torso", "hips", "thighs"], ["top", "bottom"],
                       dict(styles=["praia", "esportivo"], colors=["azul-marinho"], formality=0.0, rarity="comum"),
                       notes="maio inteiro de corte conservador (shorts ate o alto da coxa); combina com kaftan (top)")


def kaftan(body):
    I = info(body); G = Garment("kaftan", body)
    zb = lambda x, y: 0.82 + 0 * x
    sel = torso_sel(I, zb, neck=(0.062, 0.085, 0.056, 0.0, 1.10), sleeve=1.05)
    def off(P0, I_, V):
        s = I_.s[V]; arm = I_.arm[V]
        return np.where(arm, 0.020 + 0.022 * np.sin(np.pi * np.clip(s / 1.05, 0, 1)), 0.026)
    mt = lambda c, r: ["trim" if (c[i, 2] > 1.12 and np.hypot(c[i, 0], c[i, 1]) < 0.09) else "base" for i in range(len(c))]
    r = shell(body, G, sel, off=off, hem=zb, sleeve_end=1.05, clear=0.008, smooth=(16, 7, 3), mat=mt, target=3400)
    L = env_layer(body, 0.870, 0.34, nth=112, rows=12, off=lambda t, th: 0.026 + 0.075 * t ** 1.2 + 0.006 * t * np.sin(6 * th), zwave=(0.012, 8, 0.4))
    add_layer_w(G, body, L, "base", lw=0.95, knee=0.5, falloff=0.22, clear=0.01, spine_fade=0.15, wt=(0.0, 0.3), split=0.08)
    mats = {"base": ("#2f6f73", "matte", "poa"), "trim": ("#f0e4cc", "matte")}
    mats["base"] = ("#2f6f73", "matte")
    return G, mats, mk("kaftan", "Saída de praia kaftan", "top", mats, ["torso", "arms", "hips", "thighs", "knees"], ["bottom"],
                       dict(styles=["praia", "boho", "casual"], colors=["verde"], formality=0.2, rarity="comum"),
                       notes="tunica longa ate o joelho; hides bottom")


def velvet_coat(body):
    I = info(body); G = Garment("velvet_coat", body)
    zb = lambda x, y: 0.84 + 0 * x
    sel = torso_sel(I, zb, neck=(0.062, 0.085, 0.056, 0.0, 1.095), sleeve=1.94)
    def off(P0, I_, V):
        s = I_.s[V]; arm = I_.arm[V]
        return np.where(arm, 0.0145 - 0.006 * smoothstep(1.6, 1.92, s), 0.0125)
    r = shell(body, G, sel, off=off, hem=zb, sleeve_end=1.94, clear=0.007, smooth=(14, 6, 3), mat=arm_trim(1.80), target=4600)
    L = env_layer(body, 0.866, 0.36, nth=112, rows=11, off=lambda t, th: 0.0155 + 0.085 * t ** 1.2 + 0.005 * t * np.sin(6 * th), zwave=(0.012, 8, 0.0))
    add_layer_w(G, body, L, "base", lw=0.9, knee=0.5, falloff=0.25, clear=0.01, spine_fade=0.3, wt=(0.0, 0.35))
    collar_flat(G, body, r, r0=(0.066, 0.070), r1=(0.118, 0.108), lift=0.006, mat="trim", zdrop=-0.004)
    for sg in (1, -1):
        pts = cast_line(r, [[sg * (0.052 - 0.040 * t), -0.08, 1.17 - 0.22 * t] for t in np.linspace(0, 1, 18)])
        add_ribbon(G, body, r, pts, [(-0.011, 0.0), (-0.010, 0.003), (0.010, 0.003), (0.011, 0.0)], "trim")
        add_studs(G, body, r, [p for z in (0.97, 0.90) for p in surface_pts(r, sg * 20, [z])], 0.0045, 0.005, "accent")
    waistband(G, body, 0.905, 0.868, "trim", bulge=0.006)
    mats = {"base": ("#1d4a3a", "satin"), "trim": ("#143629", "satin"), "accent": ("#d6b25a", "gold")}
    return G, mats, mk("velvet_coat", "Sobretudo de veludo", "top", mats, ["torso", "arms", "hips", "thighs", "knees"], ["bottom"],
                       dict(styles=["gala", "classico", "romantico"], colors=["verde"], formality=0.85, rarity="epico"),
                       notes="veludo = satin de brilho baixo; gola xale larga; hides bottom")


def winter_coat(body):
    I = info(body); G = Garment("winter_coat", body)
    zb = lambda x, y: 0.84 + 0 * x
    sel = torso_sel(I, zb, neck=(0.062, 0.075, 0.056, 0.0, 1.10), sleeve=1.94)
    def off(P0, I_, V):
        s = I_.s[V]; arm = I_.arm[V]
        return np.where(arm, 0.019 - 0.007 * smoothstep(1.6, 1.92, s), 0.017)
    r = shell(body, G, sel, off=off, hem=zb, sleeve_end=1.94, clear=0.008, smooth=(14, 6, 3), mat=arm_trim(1.80), target=4800)
    L = env_layer(body, 0.866, 0.30, nth=112, rows=12, off=lambda t, th: 0.0195 + 0.060 * t ** 1.2 + 0.004 * t * np.sin(6 * th), zwave=(0.008, 8, 0.0))
    add_layer_w(G, body, L, "base", lw=0.9, knee=0.5, falloff=0.25, clear=0.011, spine_fade=0.3, wt=(0.0, 0.35))
    for sg in (1, -1):
        add_studs(G, body, r, [p for z in (1.00, 0.93, 0.86) for p in surface_pts(r, sg * 14, [z])], 0.0050, 0.0055, "accent")
    waistband(G, body, 0.905, 0.868, "trim", bulge=0.006)
    # cachecol: voltas no pescoco + ponta caida
    ring_tube(G, body, r, 1.240, h=0.030, bulge=0.012, mat="accent", wob=0.002)
    ring_tube(G, body, r, 1.208, rb=0.074, h=0.034, bulge=0.016, mat="accent", wob=0.003, ph=1.0)
    pts = np.array([[0.030 - 0.010 * t, -0.092 - 0.024 * t, 1.175 - 0.240 * t] for t in np.linspace(0, 1, 12)])
    free_ribbon(G, body, r, pts, [(-0.026, 0.0), (-0.024, 0.006), (0.024, 0.006), (0.026, 0.0)], "accent")
    mats = {"base": ("#8a7258", "matte"), "trim": ("#6f5b45", "matte"), "accent": ("#b84a3a", "matte")}
    return G, mats, mk("winter_coat", "Casaco longo com cachecol", "top", mats, ["torso", "arms", "hips", "thighs", "knees", "neck"], ["bottom"],
                       dict(styles=["inverno", "classico", "casual"], colors=["marrom"], formality=0.6, rarity="raro"),
                       notes="cachecol no slot accent (voltas no pescoco + ponta); hides bottom")


def barista_apron(body):
    I = info(body); G = Garment("barista_apron", body)
    x, y, z = I.x, I.y, I.z
    halfw = 0.080 - 0.014 * smoothstep(0.95, 1.07, z)
    sel = (z >= 0.870) & (z <= 1.115) & (np.abs(x) < halfw) & (y < 0.012) & ~I.arm & ~I.head & ~I.foot
    zb = lambda x_, y_: 0.870 + 0 * x_
    r = shell(body, G, sel, off=0.0340, hem=zb, hem_tol=0.03, clear=0.016, hull=False, mat="base", target=1800, smooth=(18, 8, 4), minsize=40)
    L = env_layer(body, 0.884, 0.56, nth=120, rows=9, off=lambda t, th: 0.0275 + 0.012 * t)
    add_layer_w(G, body, L, "base", lw=0.9, knee=0.2, falloff=0.22, clear=0.014, spine_fade=0.15, wt=(0.0, 0.3), only=(0.0, 1.05))
    pocket_front(G, body, r, 0.0, 0.93, 0.07, 0.04, lift=0.004, mat="trim")
    nk = np.array([[-0.046, -0.068, 1.108], [-0.058, -0.045, 1.17], [-0.046, 0.020, 1.215], [0.0, 0.048, 1.224], [0.046, 0.020, 1.215], [0.058, -0.045, 1.17], [0.046, -0.068, 1.108]])
    free_ribbon(G, body, r, nk, [(-0.007, 0.0), (-0.0065, 0.002), (0.0065, 0.002), (0.007, 0.0)], "trim", nref=np.tile(np.array([0, 0, 1.0]), (len(nk), 1)))
    for sg in (1, -1):
        wp = np.array([[sg * (0.100 + 0.006 * t), -0.040 + 0.062 * t, 0.884] for t in np.linspace(0, 1, 6)])
        free_ribbon(G, body, r, wp, [(-0.009, 0.0), (-0.008, 0.002), (0.008, 0.002), (0.009, 0.0)], "trim", nref=np.tile(np.array([0, 0, 1.0]), (len(wp), 1)))
    mats = {"base": ("#4a3b2e", "matte"), "trim": ("#2d2420", "matte")}
    return G, mats, mk("barista_apron", "Avental de barista", "top", mats, ["torso", "hips", "thighs"], [],
                       dict(styles=["profissao", "casual", "cafe"], colors=["marrom"], formality=0.3, rarity="comum"),
                       notes="sobreposicao (offset 20 mm): usar sobre camiseta/camisa; babador + painel so na frente; ideal profissao barista/chef")


def hairdresser_smock(body):
    I = info(body); G = Garment("hairdresser_smock", body)
    zb = lambda x, y: 0.80 + 0 * x
    sel = torso_sel(I, zb, neck=(0.052, 0.058, 0.048, 0.0, 1.11), sleeve=0.48)
    def off(P0, I_, V):
        s = I_.s[V]; arm = I_.arm[V]
        return np.where(arm, 0.014, 0.0165)
    mt = lambda c, r: ["trim" if (r.arm_poly[i] and abs(r.I.s[r.V][r.pa[i]].mean() - 0.48) < 0.09) or (c[i, 2] > 1.13 and np.hypot(c[i, 0], c[i, 1]) < 0.075) else "base" for i in range(len(c))]
    r = shell(body, G, sel, off=off, hem=zb, sleeve_end=0.48, clear=0.007, mat=mt, target=3600)
    L = env_layer(body, 0.835, 0.62, nth=112, rows=8, off=lambda t, th: 0.0185 + 0.030 * t ** 1.2)
    add_layer_w(G, body, L, "base", lw=0.95, knee=0.4, falloff=0.22, clear=0.009, spine_fade=0.15, wt=(0.0, 0.4))
    front_placket(G, body, r, 0.84, 1.13, 0.008, "trim", theta=-12)
    buttons(G, body, r, np.arange(0.88, 1.12, 0.05), 0.0032, 0.0038, "accent", theta=-12)
    pocket_front(G, body, r, 0.062, 0.90, 0.045, 0.045, lift=0.004, mat="trim")
    pocket_front(G, body, r, -0.062, 0.90, 0.045, 0.045, lift=0.004, mat="trim")
    mats = {"base": ("#f3f1ec", "matte"), "trim": ("#c4d0de", "matte"), "accent": ("#8a9bb0", "matte")}
    return G, mats, mk("hairdresser_smock", "Jaleco de cabeleireira", "top", mats, ["torso", "upperArms", "hips", "thighs"], ["bottom"],
                       dict(styles=["profissao", "casual", "classico"], colors=["branco"], formality=0.35, rarity="comum"),
                       notes="jaleco curto com botoes de lado e bolsos; profissao cabeleireira; hides bottom (saia curta)")


def dj_vest(body):
    I = info(body); G = Garment("dj_vest", body)
    zb = lambda x, y: 0.90 + 0 * x
    sel = torso_sel(I, zb, neck=(0.060, 0.070, 0.056, 0.0, 1.11), sleeve=None, xs=0.090)
    r = shell(body, G, sel, off=0.0120, hem=zb, clear=0.006, smooth=(12, 5, 2), target=3200,
              mat=lambda c, r_: ["trim" if (c[i, 2] < 0.925) else "base" for i in range(len(c))])
    for sg in (1, -1):
        add_ribbon(G, body, r, surface_pts(r, sg * 28, np.arange(0.92, 1.10, 0.012)), [(-0.003, 0.0), (0.0, 0.0022), (0.003, 0.0)], "accent")
        pocket_front(G, body, r, sg * 0.050, 0.96, 0.045, 0.040, lift=0.004, mat="trim")
    add_ribbon(G, body, r, surface_pts(r, 0, np.arange(0.92, 1.12, 0.012)), [(-0.004, 0.0), (-0.0035, 0.0025), (0.0035, 0.0025), (0.004, 0.0)], "accent")
    collar_flat(G, body, r, r0=(0.060, 0.064), r1=(0.092, 0.086), lift=0.005, mat="trim")
    mats = {"base": ("#16161c", "glitter"), "trim": ("#0f0f14", "latex"), "accent": ("#7ef0d2", "satin")}
    return G, mats, mk("dj_vest", "Colete de DJ", "top", mats, ["torso"], [],
                       dict(styles=["y2k", "festa", "streetwear"], colors=["preto"], formality=0.3, rarity="raro"),
                       notes="colete cropped com zíper neon (accent); profissao DJ")

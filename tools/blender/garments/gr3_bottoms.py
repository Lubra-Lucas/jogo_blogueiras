"""Rodada 3: calcas, shorts e saias."""
from gr3_common import *


def flare_pants(body):
    I = info(body); G = Garment("flare_pants", body)
    zt = lambda x, y: 0.895 + 0 * x
    zb = lambda x, y: 0.085 + 0 * x
    sel = leg_sel(I, zb, zt)
    flare = leg_flare(body, [0.9, 0.55, 0.40, 0.30, 0.20, 0.12, 0.085], [0.0, 0.0, 0.010, 0.030, 0.056, 0.078, 0.088], inner=0.016)
    mt = lambda c, r: ["trim" if c[i, 2] > 0.862 else "base" for i in range(len(c))]
    r = shell(body, G, sel, off=lambda P0, I_, V: np.where(P0[:, 2] > 0.80, 0.0105, 0.0062), disp=flare, hem=[zt, zb], hem_tol=0.04, clear=0.0055, hull=False, mat=mt, smooth=(16, 7, 3))
    add_studs(G, body, r, surface_pts(r, 0, [0.872]), 0.0044, 0.0045, "accent")
    mats = {"base": ("#4d6e9b", "matte", "jeans"), "trim": ("#3e5c85", "matte"), "accent": ("#d6b25a", "gold")}
    return G, mats, mk("flare_pants", "Calça flare", "bottom", mats, ["hips", "legs"], [],
                       dict(styles=["casual", "boho", "y2k"], colors=["azul"], formality=0.2, rarity="comum"),
                       notes="boca larga cobre o pe ate 0.085 m (sapatos ficam por dentro da barra)")


def tailored_trousers(body):
    I = info(body); G = Garment("tailored_trousers", body)
    zt = lambda x, y: 0.90 + 0 * x
    zb = lambda x, y: 0.105 + 0 * x
    sel = leg_sel(I, zb, zt)
    flare = leg_flare(body, [0.9, 0.7, 0.5, 0.3, 0.2, 0.105], [0.0, 0.006, 0.012, 0.016, 0.018, 0.020], inner=0.016)
    mt = lambda c, r: ["trim" if c[i, 2] > 0.86 else "base" for i in range(len(c))]
    r = shell(body, G, sel, off=lambda P0, I_, V: np.where(P0[:, 2] > 0.80, 0.0112, 0.0078), disp=flare, hem=[zt, zb], hem_tol=0.04, clear=0.006, hull=False, mat=mt, smooth=(14, 6, 3))
    leg_crease(G, body, r, 0.13, 0.80, "trim")
    for sg in (1, -1):
        add_ribbon(G, body, r, np.array([[sg * (0.030 + 0.050 * t), -0.075 + 0.0 * t, 0.866 + 0.012 * math.sin(t * math.pi)] for t in np.linspace(0, 1, 6)]), [(-0.002, 0.0), (0.0, 0.0016), (0.002, 0.0)], "trim")
    add_studs(G, body, r, surface_pts(r, 0, [0.872]), 0.0046, 0.0048, "accent")
    mats = {"base": ("#5b5f68", "matte"), "trim": ("#464a52", "matte"), "accent": ("#c9ccd3", "gold")}
    return G, mats, mk("tailored_trousers", "Calça de alfaiataria", "bottom", mats, ["hips", "legs"], [],
                       dict(styles=["classico", "gala", "casual"], colors=["cinza"], formality=0.7, rarity="comum"))


def cycling_shorts(body):
    I = info(body); G = Garment("cycling_shorts", body)
    zt = lambda x, y: 0.895 + 0 * x
    zb = lambda x, y: 0.50 + 0 * x
    sel = leg_sel(I, zb, zt)
    mt = lambda c, r: ["trim" if (c[i, 2] > 0.862 or c[i, 2] < 0.525) else "base" for i in range(len(c))]
    r = shell(body, G, sel, off=lambda P0, I_, V: np.where(P0[:, 2] > 0.80, 0.0095, 0.0050), hem=[zt, zb], hem_tol=0.035, clear=0.0045, hull=False, mat=mt, smooth=(10, 4, 2))
    side_stripe(G, body, r, 0.54, 0.83, 0.006, "accent")
    mats = {"base": ("#1f2430", "matte"), "trim": ("#161a24", "matte"), "accent": ("#c9d3dd", "satin")}
    return G, mats, mk("cycling_shorts", "Bermuda ciclista", "bottom", mats, ["hips", "thighs"], [],
                       dict(styles=["esportivo", "casual", "y2k"], colors=["preto"], formality=0.05, rarity="comum"))


def denim_skirt(body):
    G = Garment("denim_skirt", body)
    b = waistband(G, body, 0.902, 0.846, "trim", bulge=0.0025)
    L = env_layer(body, 0.884, 0.60, nth=120, rows=11, off=lambda t, th: 0.0115 + 0.020 * t ** 1.4)
    add_layer_w(G, body, L, "base", lw=1.0, knee=0.2, falloff=0.2, clear=0.007, spine_fade=0.15, wt=(0.0, 0.5))
    mats = {"base": ("#5b83b5", "matte", "jeans"), "trim": ("#4a6f9e", "matte"), "accent": ("#d9a14a", "matte")}
    return G, mats, mk("denim_skirt", "Saia jeans", "bottom", mats, ["hips", "thighs"], [],
                       dict(styles=["casual", "y2k", "country"], colors=["azul"], formality=0.15, rarity="comum"))


def wrap_skirt(body):
    G = Garment("wrap_skirt", body)
    b = waistband(G, body, 0.902, 0.850, "trim", bulge=0.0025)
    L = env_layer(body, 0.884, 0.40, nth=120, rows=14, off=lambda t, th: 0.0115 + 0.040 * t ** 1.2 + 0.006 * t * np.sin(3 * th), zwave=(0.010, 6, 0.0))
    add_layer_w(G, body, L, "base", lw=0.95, knee=0.6, falloff=0.22, clear=0.008, spine_fade=0.15, slit=(0.55, 0.30, 0.35), wt=(0.0, 0.45))
    # aba da frente (sobreposicao) em accent, mais curta no lado do corte
    add_bow_on(G, body, b, 0.55, 0.876, 1.5, rr=0.020)
    mats = {"base": ("#8a3b3b", "satin"), "trim": ("#6c2b2b", "satin"), "accent": ("#6c2b2b", "satin")}
    return G, mats, mk("wrap_skirt", "Saia envelope", "bottom", mats, ["hips", "thighs", "knees"], [],
                       dict(styles=["romantico", "casual", "boho"], colors=["vinho"], formality=0.5, rarity="comum"),
                       notes="fenda diagonal na frente-esquerda (largura crescente) e laco lateral na cintura")


def silk_midi_skirt(body):
    G = Garment("silk_midi_skirt", body)
    waistband(G, body, 0.898, 0.852, "trim", bulge=0.002)
    L = env_layer(body, 0.884, 0.26, nth=120, rows=16, mono=True, off=lambda t, th: 0.0115 + 0.085 * t ** 1.3 + 0.007 * t * np.sin(5 * th), zwave=(0.014, 10, 0.5))
    add_layer_w(G, body, L, "base", lw=1.0, knee=0.6, falloff=0.22, clear=0.008, spine_fade=0.15, wt=(0.0, 0.14), split=0.07)
    mats = {"base": ("#8a9a7b", "satin"), "trim": ("#76856a", "satin")}
    return G, mats, mk("silk_midi_skirt", "Saia midi de seda", "bottom", mats, ["hips", "thighs", "knees", "calves"], [],
                       dict(styles=["romantico", "classico", "boho"], colors=["verde"], formality=0.6, rarity="comum"))


def feather_skirt(body):
    G = Garment("feather_skirt", body)
    waistband(G, body, 0.890, 0.842, "trim", bulge=0.003)
    cfg = [(0.876, 0.700, 0.215, "base", 0.0), (0.800, 0.620, 0.265, "accent", 0.9), (0.725, 0.540, 0.315, "base", 1.8), (0.650, 0.465, 0.360, "accent", 2.7)]
    for zt, zh, R, mat, ph in cfg:
        L = layer(body, zt, zh, R, R * 0.92, nth=108, rows=5, flare=0.8, drop=1.2, top_off=0.014, ruffle=(0.012, 27), zwave=(0.010, 27, ph), scallop=(0.034, 27))
        add_layer(G, body, L, mat, dict(lw=1.0, spine_top=0.2, spine_fade=0.25, wt=(0.0, 0.2), split=0.06), falloff=0.25, clear=0.008)
    mats = {"base": ("#22263a", "matte"), "trim": ("#17192a", "matte"), "accent": ("#5a3d6e", "matte")}
    return G, mats, mk("feather_skirt", "Saia de penas", "bottom", mats, ["hips", "thighs", "knees"], [],
                       dict(styles=["gala", "goth", "festa"], colors=["azul-marinho"], formality=0.8, rarity="epico"),
                       notes="penas estilizadas = camadas opacas com borda em lobulos (27 por volta)")

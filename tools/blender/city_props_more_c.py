"""Pecas (parte C): Centro (Y2K), Avenida da Moda, Palco Neon e o Cassino (Lounge de Jogos)."""
from city_props_more_lib import *  # noqa

ck.PALETTES.update({"casino": P_("Cassino", "#1c1d22", "#0f4a36", "#c9a15a", "#4a4c56", "#0b0b0d", "#7a1f2a", "brass",
                                 glass="#6f8798", glow="#ffcf6a", gs=7.0)})
PALS["casino"] = ck.PALETTES["casino"]


# ====================================================================================================
# CENTRO (Y2K: vidro, branco, aco, acentos coloridos)
# ====================================================================================================
@piece("holo_totem", "y2k", "centro", collider=("cylinder", [.5, 3.0], [0, 1.5, 0]),
       note="totem holografico Y2K: coluna de aco com tela curva e anel de luz")
def piece_holo_totem():
    P = []
    P.append(cyl(.55, .16, (0, 0, .08), "base", n=24, bevel=.05))
    P.append(tube(circ(0, 0, .17, .5, 28, "xy"), .02, "glow", minor=5, closed=True))
    P.append(lathe([(0, .16), (.3, .16), (.24, .5), (.2, 2.3), (.26, 2.5), (0, 2.6)], "base", n=20, smooth=1))
    P.append(box((.8, .12, 1.5), (0, -.22, 1.55), "deep", bevel=.06, seg=3))
    P.append(box((.7, .02, 1.38), (0, -.285, 1.55), "glow", bevel=.01, seg=1))
    for i in range(4):
        P.append(box((.5 - i * .06, .02, .05), (-.03, -.3, 2.05 - i * .24), "white", bevel=.005, seg=1))
    P.append(sph((.12, .02, .12), (.22, -.3, 1.15), "accent2", n=8, rings=5))
    P.append(tube(circ(0, 0, 2.62, .36, 28, "xy"), .02, "glow", minor=5, closed=True))
    P.append(sph((.16, .16, .16), (0, 0, 2.78), "glass", n=12, rings=8))
    return P


@piece("capsule_bench", "y2k", "centro", collider=("box", [2.3, 1.1, 1.0], [0, .55, 0]),
       note="banco-capsula Y2K: casco de aco/vidro com assento estofado")
def piece_capsule_bench():
    P = []
    P.append(box((2.1, .8, .12), (0, 0, .06), "deep", bevel=.04))
    P.append(sph((1.1, .5, .8), (0, 0, .62), "base", n=18, rings=10))
    P.append(box((2.2, .9, .5), (0, .1, .25), "base", bevel=.1, seg=3))
    P.append(box((1.8, .52, .14), (0, -.02, .52), "seat", bevel=.06, seg=2))
    P.append(box((1.8, .12, .5), (0, .24, .78), "seat", bevel=.06, seg=2, rot=(-.15, 0, 0)))
    P.append(sph((1.15, .1, .45), (0, .32, .88), "glass", n=14, rings=7))
    P.append(tube(circ(0, 0, .2, .02, 6, "xy"), .001, "glow", minor=3) if False else box((2.0, .02, .03), (0, -.37, .3), "glow", seg=1))
    for x in (-.85, .85):
        P.append(box((.1, .5, .06), (x, -.02, .66), "trim", bevel=.02, seg=1))
    return P


@piece("selfie_totem", "y2k", "centro", collider=("cylinder", [.45, 2.0], [0, 1.0, 0]),
       note="totem de selfie: anel de luz (ring light) em pe, suporte de celular e tapete marcado")
def piece_selfie_totem():
    P = []
    P.append(cyl(.8, .04, (0, 0, .02), "accent", n=28, bevel=.01))
    P.append(tube(circ(0, 0, .045, .76, 28, "xy"), .02, "accent2", minor=4, closed=True))
    P.append(cyl(.36, .08, (0, 0, .08), "deep", n=18, bevel=.03))
    P.append(cyl(.035, 1.6, (0, 0, .85), "trim", n=8))
    P.append(tube(circ(0, -.03, 1.95, .38, 30, "xz"), .06, "glow", minor=8, closed=True))
    P.append(tube(circ(0, 0.0, 1.95, .46, 30, "xz"), .028, "base", minor=6, closed=True))
    P.append(box((.1, .14, .2), (0, -.02, 1.95), "deep", bevel=.03, seg=1))
    P.append(box((.1, .02, .18), (0, -.1, 1.95), "glass", seg=1))
    P.append(box((.34, .06, .18), (0, -.12, 1.5), "accent2", bevel=.03))
    P.append(text3d("SELFIE", .1, .02, (0, -.16, 1.5), "white"))
    return P


@piece("ferris_wheel_mini", "y2k", "centro", collider=("cylinder", [3.2, 1.6], [0, .8, 0]),
       note="roda-gigante pequena de decoracao (7 m): 10 cabines, base de aco, luzes")
def piece_ferris_wheel_mini():
    P = []
    R = 3.0
    zc = 3.9
    P.append(cyl(3.0, .3, (0, 0, .15), "soft", n=28, bevel=.06))
    for sx in (-1, 1):
        P.append(tube([Vector((sx * .5, 0, .3)), Vector((sx * .5, sx * .0 + .0, zc))], .0001, "base", minor=3) if False else tube([Vector((sx * .6, -.5, .3)), Vector((0, 0, zc - .1))], .09, "base", minor=8))
        P.append(tube([Vector((sx * .6, .5, .3)), Vector((0, 0, zc - .1))], .09, "base", minor=8))
    P.append(cylY(.2, .8, (0, 0, zc), "trim", n=14, b=.03))
    for off in (-.25, .25):
        P.append(tube(circ(0, off, zc, R, 36, "xz"), .06, "base", minor=6, closed=True))
        P.append(tube(circ(0, off, zc, R * .6, 24, "xz"), .035, "accent", minor=5, closed=True))
    n = 10
    for k in range(n):
        a = 2 * pi * k / n
        for off in (-.25, .25):
            P.append(tube([Vector((0, off, zc)), Vector((R * cos(a), off, zc + R * sin(a)))], .025, "trim", minor=4))
        P.append(cylY(.02, .5, (R * cos(a), 0, zc + R * sin(a)), "trim", n=5))
        # cabine pendurada
        cx, cz = R * cos(a), zc + R * sin(a) - .55
        P.append(box((.55, .45, .5), (cx, 0, cz), ["accent2", "base", "accent", "soft", "accent2"][k % 5], bevel=.1, seg=2))
        P.append(box((.58, .4, .22), (cx, 0, cz + .1), "glass", bevel=.02, seg=1))
        P.append(box((.62, .5, .06), (cx, 0, cz + .27), "deep", bevel=.02, seg=1))
        P.append(sph(.045, (R * cos(a), 0, zc + R * sin(a)), "glow", n=6, rings=4))
    P.append(sph(.3, (0, 0, zc), "accent2", n=10, rings=7))
    return P


@piece("ground_fountain_jets", "y2k", "centro", collider=None, walkable=False,
       note="fonte de piso: disco de pedra com 25 bicos e luzes; agua (slot water) e animavel; atravessavel (sem colisor)")
def piece_ground_fountain_jets():
    P = []
    P.append(cyl(3.3, .06, (0, 0, .03), "soft", n=36, bevel=.015))
    P.append(tube(circ(0, 0, .065, 3.25, 36, "xy"), .045, "trim", minor=4, closed=True))
    P.append(cyl(3.0, .02, (0, 0, .07), "water", n=36))
    for ring, cnt in ((0, 1), (.9, 6), (1.8, 10), (2.6, 8)):
        for k in range(cnt):
            a = 2 * pi * k / max(cnt, 1)
            x, y = ring * cos(a), ring * sin(a)
            P.append(cyl(.06, .03, (x, y, .08), "trim", n=8, bevel=.008))
            P.append(sph(.025, (x, y, .1), "glow", n=6, rings=4))
            h = .5 + .12 * (k % 3) + (.35 if ring == 0 else 0)
            P.append(cyl(.018, h, (x, y, .1 + h / 2), "water", n=5))
            P.append(sph(.04, (x, y, .1 + h), "water", n=6, rings=4))
    return P


@piece("pop_sculpture", "y2k", "centro", collider=("cylinder", [1.6, 4.4], [0, 2.2, 0]),
       note="escultura pop: estrela de aco espelhado em plinto (acento Y2K); 4 m")
def piece_pop_sculpture():
    P = []
    P.append(cyl(1.5, .3, (0, 0, .15), "soft", n=28, bevel=.06))
    P.append(cyl(.8, .8, (0, 0, .7), "base", n=20, bevel=.05))
    P.append(cyl(.95, .1, (0, 0, 1.15), "trim", n=20, bevel=.02))
    pts = []
    for i in range(10):
        r = 1.35 if i % 2 == 0 else .62
        a = pi / 2 + 2 * pi * i / 10
        pts.append((r * cos(a), r * sin(a)))
    P.append(prism(pts, .55, "xz", "accent2", loc=(0, 0, 2.55), bevel=.17, seg=4))
    P.append(prism([(p[0] * .6, p[1] * .6) for p in pts], .7, "xz", "trim", loc=(0, 0, 2.55), bevel=.1, seg=3))
    P.append(sph(.2, (0, -.4, 2.55), "glow", n=10, rings=7))
    return P


# ====================================================================================================
# AVENIDA DA MODA (calcario, preto, latao, vidro)
# ====================================================================================================
@piece("stanchion", "luxo", "moda", collider=None, note="coluninha de latao (stanchion) com base; 1 m. Combine em fila com cordao via red_carpet_set")
def piece_stanchion():
    P = []
    P.append(cyl(.2, .05, (0, 0, .025), "trim", n=18, bevel=.015))
    P.append(lathe([(0, .05), (.1, .05), (.07, .1), (.04, .2), (.035, .9), (0, .92)], "trim", n=12, smooth=1))
    P.append(sph(.065, (0, 0, .95), "trim", n=10, rings=7))
    P.append(cylX(.012, .1, (.0, 0, .83), "trim", n=6))
    return P


def carpet(L, n):
    P = []
    P.append(box((2.2, L, .035), (0, 0, .018), "seat", bevel=.008, seg=1))
    P.append(box((2.3, L + .1, .015), (0, 0, .008), "trim", seg=1))
    P.append(box((.06, L, .005), (-.85, 0, .04), "trim", seg=1))
    P.append(box((.06, L, .005), (.85, 0, .04), "trim", seg=1))
    for sx in (-1.45, 1.45):
        ys = [-L / 2 + .5 + i * (L - 1.0) / (n - 1) for i in range(n)]
        for y in ys:
            P.append(cyl(.17, .045, (sx, y, .022), "trim", n=12, bevel=.012))
            P.append(lathe([(0, .04), (.08, .04), (.05, .1), (.03, .2), (.028, .9), (0, .91)], "trim", loc=(sx, y, 0), n=8, smooth=0))
            P.append(sph(.055, (sx, y, .93), "trim", n=8, rings=5))
        for i in range(n - 1):
            y0, y1 = ys[i], ys[i + 1]
            pts = [Vector((sx, y0 + (y1 - y0) * t / 6, .84 - .12 * 4 * (t / 6) * (1 - t / 6))) for t in range(7)]
            P.append(tube(pts, .022, "seat", minor=5))
    return P


@piece("red_carpet_set", "luxo", "moda", collider=None, walkable=True,
       note="tapete vermelho 2x10 m com 6 stanchions de cada lado ligados por cordao de veludo; atravessavel; eixo Y = comprimento")
def piece_red_carpet_set():
    return carpet(10.0, 6)


@piece("red_carpet_short", "luxo", "moda", collider=None, walkable=True,
       note="tapete vermelho curto 2x5.2 m com 3 stanchions por lado (porta de loja ate a calcada); eixo Y = comprimento")
def piece_red_carpet_short():
    return carpet(5.2, 3)


@piece("brand_totem", "luxo", "moda", collider=("box", [1.2, 4.2, .6], [0, 2.1, 0]),
       note="totem de marca: pilar de marfim com letreiro de latao e monograma luminoso")
def piece_brand_totem():
    P = []
    P.append(box((1.2, .6, .16), (0, 0, .08), "trim", bevel=.04))
    P.append(box((.95, .4, 3.9), (0, 0, 2.1), "base", bevel=.1, seg=3))
    P.append(box((.8, .05, 1.2), (0, -.22, 2.9), "deep", bevel=.03, seg=2))
    P.append(box((.88, .03, .05), (0, -.24, 3.55), "trim", seg=1))
    P.append(box((.88, .03, .05), (0, -.24, 2.25), "trim", seg=1))
    P.append(text3d("M", .8, .05, (0, -.27, 2.9), "glow", bevel=.004))
    P.append(box((.9, .05, .5), (0, -.22, 1.4), "accent", bevel=.02, seg=1))
    P.append(text3d("MAISON", .17, .02, (0, -.26, 1.4), "deep"))
    P.append(box((1.05, .5, .12), (0, 0, 4.1), "trim", bevel=.04))
    P.append(sph((.5, .25, .25), (0, 0, 4.2), "base", n=12, rings=7))
    return P


@piece("valet_stand", "luxo", "moda", collider=("box", [1.3, 1.5, .9], [0, .75, 0]),
       note="stand de valet: balcao de madeira escura, toldo de latao e quadro de chaves")
def piece_valet_stand():
    P = []
    P.append(box((1.3, .8, .14), (0, 0, .07), "soft", bevel=.04))
    P.append(box((1.2, .6, .95), (0, 0, .62), "deep", bevel=.06, seg=2))
    P.append(box((1.3, .7, .06), (0, 0, 1.14), "seat", bevel=.025, seg=1))
    P.append(box((1.0, .04, .5), (0, .36, 1.7), "seat", bevel=.02, seg=1))
    for i in range(8):
        P.append(cyl(.016, .06, (-.42 + i * .12, .33, 1.85), "trim", rot=(pi / 2, 0, 0), n=6))
        P.append(box((.04, .02, .08), (-.42 + i * .12, .31, 1.76), "accent2", seg=1))
    for x in (-.56, .56):
        P.append(cyl(.025, 2.0, (x, .3, 1.0), "trim", n=8))
    P.append(box((1.4, .9, .06), (0, .0, 2.05), "trim", bevel=.025, seg=1))
    P.append(sph((.72, .5, .16), (0, 0, 2.1), "deep", n=12, rings=6))
    P.append(text3d("VALET", .17, .02, (0, -.36, .62), "trim"))
    return P


@piece("spotlight_tower", "char", "moda", collider=("cylinder", [.4, 3.4], [0, 1.7, 0]),
       note="holofote de evento: torre baixa com refletor giratorio e feixe (slot glow, cone translucido)")
def piece_spotlight_tower():
    P = []
    P.append(cyl(.42, .12, (0, 0, .06), "deep", n=16, bevel=.03))
    P.append(lathe([(0, .1), (.28, .1), (.2, .3), (.14, 1.4), (.2, 1.6), (0, 1.65)], "base", n=14, smooth=1))
    P.append(tube([Vector((-.2, 0, 1.6)), Vector((-.25, 0, 2.0)), Vector((0, 0, 1.8)), Vector((.25, 0, 2.0)), Vector((.2, 0, 1.6))], .035, "trim", minor=6) if False else box((.7, .1, .1), (0, 0, 1.7), "trim", bevel=.03))
    P.append(cylY(.3, .6, (0, 0, 2.05), "deep", n=16, b=.04))
    P.append(cylY(.22, .05, (0, -.31, 2.05), "glow", n=16))
    for sx in (-.36, .36):
        P.append(box((.06, .1, .5), (sx, 0, 1.85), "trim", bevel=.02))
    # feixe
    P.append(lathe([(0, 0), (.14, 0), (.6, 5.0), (0, 5.0)], "glass", loc=(0, -.4, 2.05), rot=(.45, 0, 0), n=14))
    return P


# ====================================================================================================
# PALCO NEON (carvao/tijolo escuro + neon)
# ====================================================================================================
@piece("neon_street_sign", "neon", "neon", collider=("cylinder", [.25, 4.0], [0, 2.0, 0]),
       note="placa de neon de rua (poste + painel com letras BAR e seta); neon = slot glow/accent2/soft")
def piece_neon_street_sign():
    P = []
    P += foot(0, 0, .22, "trim", .1)
    P.append(box((.14, .14, 3.2), (0, 0, 1.7), "deep", bevel=.03, seg=2))
    P.append(box((1.7, .18, 1.0), (0, -.12, 3.1), "base", bevel=.06, seg=2))
    P.append(box((1.58, .03, .88), (0, -.22, 3.1), "deep", bevel=.02, seg=1))
    P.append(tube([Vector((x, -.25, 3.1 + z)) for (x, z) in ((-.7, -.38), (.7, -.38), (.7, .38), (-.7, .38), (-.7, -.38))], .018, "accent2", minor=5))
    P.append(text3d("BAR", .52, .04, (-.2, -.26, 3.1), "glow", bevel=.01))
    P.append(box((.34, .03, .06), (.58, -.26, 3.1), "soft", seg=1))
    P.append(prism([(0, .1), (.14, 0), (0, -.1)], .03, "xz", "soft", loc=(.72, -.27, 3.1)))
    P.append(box((.7, .05, .06), (0, -.1, 2.35), "deep", seg=1))
    return P


@piece("queue_rope_line", "neon", "neon", collider=None,
       note="fila com cordao: 4 stanchions pretos com cordao de veludo; 4.5 m ao longo de X; atravessavel")
def piece_queue_rope_line():
    P = []
    xs = [-2.25 + i * 1.5 for i in range(4)]
    for x in xs:
        P.append(cyl(.17, .045, (x, 0, .022), "trim", n=12, bevel=.012))
        P.append(lathe([(0, .04), (.08, .04), (.05, .1), (.03, .2), (.028, .9), (0, .91)], "base", loc=(x, 0, 0), n=8))
        P.append(sph(.06, (x, 0, .94), "trim", n=8, rings=5))
    for i in range(3):
        pts = [Vector((xs[i] + 1.5 * t / 6, 0, .82 - .12 * 4 * (t / 6) * (1 - t / 6))) for t in range(7)]
        P.append(tube(pts, .022, "accent2", minor=5))
    return P


@piece("light_totem", "neon", "neon", collider=("cylinder", [.35, 3.2], [0, 1.6, 0]),
       note="totem de luz: coluna escura com 3 aneis de neon (rosa/ciano/roxo = glow/accent2/soft)")
def piece_light_totem():
    P = []
    P.append(cyl(.4, .14, (0, 0, .07), "deep", n=16, bevel=.04))
    P.append(cyl(.2, 3.0, (0, 0, 1.6), "base", n=14, bevel=.03))
    for i, (z, m) in enumerate(((.9, "glow"), (1.7, "accent2"), (2.5, "soft"))):
        P.append(tube(circ(0, 0, z, .27, 24, "xy"), .035, m, minor=6, closed=True))
    P.append(sph(.2, (0, 0, 3.2), "glow", n=12, rings=8))
    return P


@piece("neon_puddle", "neon", "neon", collider=None,
       note="poca/piso refletivo (disco achatado do slot water) para o Palco Neon; usar y=0.04")
def piece_neon_puddle():
    P = []
    pts = sup(1.0, .7, 2.6, 36, mod=pp.wavy(3, .12))
    P.append(prism(pts, .012, "xy", "water", loc=(0, 0, .006)))
    return P


@piece("bar_stool_table", "neon", "neon", collider=("cylinder", [.9, 1.2], [0, .6, 0]),
       note="mesa alta de bar com 2 bancos altos (preto + latao)")
def piece_bar_stool_table():
    P = []
    P.append(cyl(.3, .04, (0, 0, .02), "deep", n=14, bevel=.01))
    P.append(cyl(.04, 1.0, (0, 0, .52), "trim", n=8))
    P.append(cyl(.4, .05, (0, 0, 1.05), "base", n=22, bevel=.015))
    P.append(tube(circ(0, 0, 1.05, .405, 22, "xy"), .014, "trim", minor=4, closed=True))
    P.append(cyl(.06, .08, (.1, .05, 1.12), "glow", n=8, bevel=.01))
    for sy in (-1, 1):
        y = sy * .7
        P.append(cyl(.2, .06, (0, y, .72), "seat", n=14, bevel=.02))
        P.append(cyl(.025, .7, (0, y, .35), "trim", n=6))
        P.append(tube(circ(0, y, .26, .17, 14, "xy"), .012, "trim", minor=4, closed=True))
        P.append(cyl(.2, .03, (0, y, .015), "deep", n=14))
    return P


# ====================================================================================================
# CASSINO - Lounge de Jogos (fachada Las Vegas glam: preto, latao, verde profundo)
# ====================================================================================================
@piece("casino_building", "casino", "neon", collider=("box", [20.0, 12.0, 13.6], [0, 6.0, 0]), tri_target=9000, cull="buildings",
       note="Lounge de Jogos 20x14x12 m: fachada preta com paineis verde-profundo, frisos de latao, marquise com lampadas (glow), porta giratoria, tapete vermelho, letreiro LOUNGE no topo. Origem = centro do bloco; porta em +Z jogo (frente -Y blender) a y=-7")
def piece_casino_building():
    P = []
    W, D, H = 20.0, 14.0, 11.0
    fy = -D / 2
    P.append(box((W, D, H), (0, 0, H / 2), "base", bevel=.25, seg=2))
    P.append(box((W + .8, D + .8, .35), (0, 0, .17), "soft", bevel=.08))
    # cornija e coroamento de latao
    P.append(box((W + .5, D + .5, .35), (0, 0, H - .15), "trim", bevel=.09, seg=2))
    P.append(box((W + .8, D + .8, .22), (0, 0, H + .1), "base", bevel=.06))
    P.append(box((W * .8, D * .7, 1.6), (0, .3, H + 1.0), "base", bevel=.15, seg=2))
    P.append(box((W * .8 + .4, D * .7 + .4, .2), (0, .3, H + 1.9), "trim", bevel=.06))
    # paineis verdes + pilastras de latao na fachada (lados da porta)
    for sx in (-1, 1):
        P.append(box((6.4, .22, 7.6), (sx * 6.4, fy - .08, 5.0), "accent", bevel=.08, seg=2))
        for k in range(7):
            P.append(box((.1, .08, 7.2), (sx * 6.4 + (k - 3) * .9, fy - .24, 5.0), "trim", bevel=.025, seg=1))
        # janelas escuras com moldura de latao
        for k in (-1, 1):
            P.append(box((1.7, .12, 2.6), (sx * 6.4 + k * 1.6, fy - .3, 6.3), "deep", bevel=.05, seg=1))
            P.append(box((1.5, .05, 2.4), (sx * 6.4 + k * 1.6, fy - .38, 6.3), "glass", seg=1))
            P.append(box((1.8, .08, .1), (sx * 6.4 + k * 1.6, fy - .4, 7.6), "trim", bevel=.02, seg=1))
            P.append(box((1.8, .08, .1), (sx * 6.4 + k * 1.6, fy - .4, 5.0), "trim", bevel=.02, seg=1))
        P.append(box((6.6, .3, .18), (sx * 6.4, fy - .3, 1.35), "trim", bevel=.05, seg=1))
    # friso de latao e fileira de lampadas no alto da fachada
    P.append(box((W - .6, .2, .16), (0, fy - .25, 9.7), "trim", bevel=.04, seg=1))
    for i in range(26):
        P.append(sph(.1, (-9.4 + i * .752, fy - .4, 9.7), "glow", n=6, rings=4))
    # portal central: recorte escuro e moldura
    P.append(box((5.4, .4, 5.2), (0, fy - .1, 2.9), "deep", bevel=.12, seg=2))
    P.append(box((4.6, .2, 4.6), (0, fy - .3, 2.8), "accent", bevel=.06, seg=1))
    P.append(box((5.6, .3, .22), (0, fy - .3, 5.55), "trim", bevel=.06))
    for sx in (-1, 1):
        P.append(box((.22, .3, 5.4), (sx * 2.8, fy - .3, 2.85), "trim", bevel=.06))
    # porta giratoria (tambor de vidro com 4 paletas de latao)
    cx, cy = 0, fy - 1.15
    P.append(cyl(1.32, .12, (cx, cy, 3.0), "trim", n=28, bevel=.03))
    P.append(cyl(1.32, .12, (cx, cy, .1), "deep", n=28, bevel=.03))
    for sgn in (1, -1):
        for k in range(10):
            a0 = pi + sgn * (.2 + k * .26)
            pass
    for k in range(14):
        a = 2 * pi * k / 14
        if abs(((a - 3 * pi / 2 + pi) % (2 * pi)) - pi) < .6:
            continue
        P.append(box((.62, .04, 2.7), (cx + 1.25 * cos(a), cy + 1.25 * sin(a), 1.55), "glass", rot=(0, 0, a + pi / 2), seg=1))
    for k in range(4):
        a = pi / 4 + k * pi / 2
        P.append(box((1.2, .07, 2.6), (cx + .6 * cos(a), cy + .6 * sin(a), 1.55), "trim", rot=(0, 0, a + pi / 2), bevel=.02, seg=1) if False else box((1.2, .06, 2.6), (cx + .6 * cos(a), cy + .6 * sin(a), 1.55), "glass", rot=(0, 0, a + pi / 2), seg=1))
        P.append(box((1.24, .09, .1), (cx + .62 * cos(a), cy + .62 * sin(a), 2.8), "trim", rot=(0, 0, a + pi / 2), bevel=.02, seg=1))
    P.append(cyl(.1, 2.9, (cx, cy, 1.55), "trim", n=10))
    for z in (.2, 2.9):
        P.append(tube(circ(cx, cy, z, 1.3, 24, "xy"), .035, "trim", minor=5, closed=True))
    # marquise (cobertura) sobre a entrada
    P.append(box((8.4, 3.4, .45), (0, fy - 1.7, 4.3), "base", bevel=.12, seg=2))
    P.append(box((8.6, 3.6, .14), (0, fy - 1.7, 4.58), "trim", bevel=.04))
    P.append(box((8.6, .12, 1.0), (0, fy - 3.4, 4.7), "accent", bevel=.04, seg=1))
    P.append(text3d("LOUNGE", .55, .06, (0, fy - 3.47, 4.7), "trim", bevel=.004))
    for sx in (-1, 1):
        P.append(cyl(.14, 4.2, (sx * 4.0, fy - 3.2, 2.1), "trim", n=12, bevel=.02))
        P.append(cyl(.26, .16, (sx * 4.0, fy - 3.2, .08), "trim", n=14, bevel=.03))
    # lampadas da marquise (contorno)
    for i in range(18):
        x = -4.2 + i * 8.4 / 17
        P.append(sph(.09, (x, fy - 3.52, 4.12), "glow", n=6, rings=4))
        P.append(sph(.09, (x, fy - 3.52, 4.45), "glow", n=6, rings=4))
    for j in range(1, 7):
        y = fy - 3.52 + j * (3.4 / 7)
        for sx in (-1, 1):
            P.append(sph(.08, (sx * 4.22, y, 4.1), "glow", n=6, rings=4))
    # tapete vermelho + latao
    P.append(box((3.0, 3.8, .04), (0, fy - 2.0, .02), "seat", bevel=.008, seg=1))
    for sx in (-1, 1):
        P.append(box((.06, 3.8, .006), (sx * 1.2, fy - 2.0, .045), "trim", seg=1))
    # letreiro do telhado
    P.append(box((13.6, .5, 2.7), (0, fy + 1.5, H + 3.5), "deep", bevel=.12, seg=2))
    P.append(box((13.2, .1, 2.3), (0, fy + 1.2, H + 3.5), "accent", bevel=.05, seg=1))
    P.append(tube([Vector((x, fy + 1.12, H + 3.5 + z)) for (x, z) in ((-6.4, -1.06), (6.4, -1.06), (6.4, 1.06), (-6.4, 1.06), (-6.4, -1.06))], .045, "trim", minor=6))
    P.append(text3d("LOUNGE", 1.55, .12, (0, fy + 1.1, H + 3.5), "glow", bevel=.01, spacing=1.15))
    # naipes nas pontas
    for sx, kind in ((-1, "diamond"), (1, "heart")):
        x = sx * 5.5
        z = H + 3.5
        if kind == "diamond":
            P.append(prism([(0, .75), (.5, 0), (0, -.75), (-.5, 0)], .1, "xz", "trim", loc=(x, fy + 1.15, z), bevel=.03, seg=2))
        else:
            P.append(heart(1.0, .1, (x, fy + 1.15, z + .05), "trim", bevel=.03))
    # postes de luz no topo
    for sx in (-7.8, 7.8):
        P.append(cyl(.06, 1.3, (sx, fy + 1.0, H + 2.2), "trim", n=8))
        P.append(sph(.2, (sx, fy + 1.0, H + 2.95), "glow", n=10, rings=7))
    # vasos de buxo (verde) na entrada
    for sx in (-1, 1):
        P.append(cyl(.45, .6, (sx * 2.6, fy - 3.4, .3), "soft", n=14, bevel=.04))
        P.append(sph(.5, (sx * 2.6, fy - 3.4, 1.0), "leaf", n=12, rings=8))
        P.append(cyl(.45, .6, (sx * 2.6, fy - 3.4, .3), "trim", n=14, bevel=.04) if False else tube(circ(sx * 2.6, fy - 3.4, .6, .46, 14, "xy"), .02, "trim", minor=4, closed=True))
    return P

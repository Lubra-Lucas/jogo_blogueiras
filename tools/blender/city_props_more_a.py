"""Pecas de rua (parte A): semaforo, placas, postes, hidrante, bancos, lixeiras, bus stop, relogio, cones..."""
from city_props_more_lib import *  # noqa


# ====================================================================================================
# RUA - mobiliario
# ====================================================================================================
@piece("traffic_light", "traffic", "rua", collider=("cylinder", [.28, 3.8], [0, 1.9, 0]),
       note="semaforo de carros (cabeca vermelha/ambar/verde) + botoeira pedestre; frente (-Y blender) aponta para a via")
def piece_traffic_light():
    P = []
    P += foot(0, 0, .26, "trim", .12)
    P.append(lathe([(0, .2), (.11, .2), (.085, 1.2), (.075, 3.5), (0, 3.55)], "deep", n=14))
    P.append(tube([Vector((0, 0, 3.3)), Vector((0, -.45, 3.62)), Vector((0, -.9, 3.62))], .05, "deep", minor=6))
    # cabeca (3 lentes) pendurada no braco
    hx, hy, hz = 0, -.95, 3.35
    P.append(box((.4, .3, 1.05), (hx, hy, hz), "base", bevel=.06, seg=2))
    for i, (m, dz) in enumerate((("accent2", .33), ("soft", 0), ("glow", -.33))):
        P.append(sph((.17, .08, .17), (hx, hy - .15, hz + dz), m, n=10, rings=6))
        P.append(box((.3, .14, .05), (hx, hy - .17, hz + dz + .15), "deep", bevel=.015, seg=1))
    P.append(box((.46, .06, 1.12), (hx, hy + .14, hz), "deep", bevel=.02, seg=1))
    # pedestre
    P.append(box((.34, .22, .46), (0, -.18, 2.45), "base", bevel=.05, seg=2))
    P.append(sph((.12, .05, .12), (0, -.3, 2.55), "accent2", n=8, rings=5))
    P.append(sph((.12, .05, .12), (0, -.3, 2.36), "glow", n=8, rings=5))
    # botoeira
    P.append(box((.14, .1, .2), (0, -.13, 1.25), "trim", bevel=.03))
    P.append(sph(.04, (0, -.19, 1.28), "accent2", n=8, rings=5))
    P.append(sph(.11, (0, 0, 3.6), "deep", n=10, rings=6))
    return P


@piece("street_sign_post", "stone", "rua", collider=("cylinder", [.2, 3.0], [0, 1.5, 0]),
       note="poste com duas placas de nome de rua (cruzadas) e placa de pare opcional")
def piece_street_sign_post():
    P = []
    P += foot(0, 0, .17, "trim", .08)
    P.append(lathe([(0, .12), (.06, .12), (.05, 2.9), (0, 2.94)], "deep", n=10))
    for z, rot, m in ((2.78, 0, "deep"), (2.5, pi / 2, "deep")):
        # placa: caixa escura com borda trim + miolo "accent2" com listras brancas (texto)
        P.append(box((.95, .05, .2), (0, 0, z), m, rot=(0, 0, rot), bevel=.03, seg=2))
        c = Vector((0, 0))
        ca, sa = cos(rot), sin(rot)
        off = .027
        def at(x, y, zz):
            return (x * ca - y * sa, x * sa + y * ca, zz)
        for sg in (-1, 1):
            P.append(box((.86, .02, .13), at(0, sg * off, z), "accent2", rot=(0, 0, rot), bevel=.008, seg=1))
            P.append(box((.62, .02, .035), at(-.08, sg * (off + .012), z + .015), "white", rot=(0, 0, rot), bevel=.004, seg=1))
            P.append(box((.3, .02, .025), at(-.22, sg * (off + .012), z - .035), "white", rot=(0, 0, rot), bevel=.004, seg=1))
            P.append(box((.1, .02, .1), at(.34, sg * (off + .012), z), "white", rot=(0, 0, rot), bevel=.004, seg=1))
    P.append(sph(.075, (0, 0, 2.95), "trim", n=10, rings=6))
    return P


@piece("street_lamp_tall", "char", "rua", collider=("cylinder", [.3, 5.4], [0, 2.7, 0]),
       note="poste alto de rua, braco curvo e lanterna de vidro com luz quente (slot glow)")
def piece_street_lamp_tall():
    P = []
    P.append(lathe([(0, 0), (.3, 0), (.3, .12), (.2, .3), (.15, .5), (.11, .9), (.1, 1.1), (.075, 1.2), (.07, 5.0), (0, 5.05)], "base", n=14, smooth=1))
    P.append(tube(circ(0, 0, .55, .22, 12, "xy"), .02, "trim", minor=5, closed=True))
    P.append(tube(circ(0, 0, 1.1, .12, 12, "xy"), .02, "trim", minor=5, closed=True))
    arm = [Vector(p) for p in smooth3([(0, 0, 4.7), (0, -.15, 5.15), (0, -.6, 5.3), (0, -1.0, 5.1)], 2)]
    P.append(tube(arm, .035, "base", minor=6))
    P.append(tube(smooth3([(0, 0, 4.2), (0, -.3, 4.4), (0, -.6, 4.95)], 1), .02, "trim", minor=5))
    # lanterna
    lx, ly, lz = 0, -1.0, 4.9
    P.append(lathe([(0, 0), (.1, 0), (.19, .12), (.2, .2), (.17, .24)], "deep", loc=(lx, ly, lz), n=12))
    P.append(lathe([(0, .02), (.15, .05), (.2, .22), (.15, .4), (0, .44)], "glow", loc=(lx, ly, lz), n=12, smooth=1))
    P.append(lathe([(0, .46), (.24, .38), (.25, .36), (.2, .5), (0, .6)], "base", loc=(lx, ly, lz), n=12))
    P.append(sph(.05, (lx, ly, lz + .64), "trim", n=8, rings=5))
    return P


@piece("garden_lamp_low", "char", "rua", collider=("cylinder", [.18, 1.2], [0, .6, 0]), note="poste baixo de jardim com lanterna")
def piece_garden_lamp_low():
    P = []
    P.append(lathe([(0, 0), (.17, 0), (.17, .08), (.09, .2), (.055, .5), (.05, .95), (0, .97)], "base", n=12, smooth=1))
    P.append(tube(circ(0, 0, .55, .08, 10, "xy"), .015, "trim", minor=5, closed=True))
    P.append(cyl(.12, .04, (0, 0, .98), "trim", n=12, bevel=.01))
    P.append(lathe([(0, 0), (.13, .02), (.15, .16), (.11, .3), (0, .33)], "glow", loc=(0, 0, 1.0), n=12, smooth=1))
    for a in range(4):
        t = a * pi / 2 + pi / 4
        P.append(tube([Vector((.14 * cos(t), .14 * sin(t), 1.02)), Vector((.1 * cos(t), .1 * sin(t), 1.3))], .01, "base", minor=4))
    P.append(lathe([(0, 1.3), (.15, 1.26), (.17, 1.24), (.1, 1.4), (0, 1.46)], "base", n=12))
    P.append(sph(.03, (0, 0, 1.48), "trim", n=6, rings=4))
    return P


@piece("fire_hydrant", "hydrant", "rua", collider=("cylinder", [.28, .85], [0, .42, 0]), note="hidrante classico")
def piece_fire_hydrant():
    P = []
    P.append(cyl(.2, .06, (0, 0, .03), "deep", n=16, bevel=.015))
    P.append(lathe([(0, .05), (.15, .05), (.16, .12), (.12, .18), (.115, .55), (.14, .6), (.14, .66), (.1, .72), (.05, .8), (0, .82)], "base", n=18, smooth=1))
    P.append(cyl(.15, .04, (0, 0, .6), "accent2", n=14, bevel=.01))
    for sx in (-1, 1):
        P.append(cylX(.07, .18, (sx * .17, 0, .45), "base", n=12, b=.015))
        P.append(cylX(.052, .05, (sx * .27, 0, .45), "trim", n=10))
    P.append(cylY(.09, .12, (0, -.14, .38), "base", n=12, b=.015))
    P.append(cylY(.065, .04, (0, -.21, .38), "trim", n=10))
    P.append(sph(.04, (0, 0, .84), "trim", n=8, rings=5))
    P.append(cyl(.03, .05, (0, 0, .85), "accent2", n=6))
    return P


@piece("bench_simple", "wood", "rua", collider=("box", [1.9, .9, .6], [0, .45, 0]),
       note="banco de rua: ripas de madeira + ferro fundido; 1.8 m")
def piece_bench_simple():
    P = []
    for sx in (-.78, .78):
        P.append(box((.07, .5, .06), (sx, 0, .46), "deep", bevel=.02))
        P.append(tube(smooth3([(sx, -.26, 0.04), (sx, -.22, .24), (sx, -.2, .44)], 1), .028, "deep", minor=5))
        P.append(tube(smooth3([(sx, .22, .04), (sx, .2, .3), (sx, .24, .44), (sx, .27, .78)], 1), .028, "deep", minor=5))
        P.append(box((.07, .06, .06), (sx, 0, .66), "deep", bevel=.02))
        P.append(box((.07, .5, .04), (sx, -.02, .64), "deep", bevel=.015, rot=(.2, 0, 0)))
        P.append(box((.1, .12, .035), (sx, -.26, .02), "trim", bevel=.01))
        P.append(box((.1, .12, .035), (sx, .24, .02), "trim", bevel=.01))
    for k in range(3):
        P.append(box((1.7, .12, .045), (0, -.19 + k * .14, .47), "seat", bevel=.015))
    for k in range(3):
        P.append(box((1.7, .035, .11), (0, .27 - k * .015, .58 + k * .13), "seat", bevel=.012, rot=(-.15, 0, 0)))
    return P


@piece("recycling_bins_triple", "recycle", "rua", collider=("box", [2.5, 1.2, .8], [0, .6, 0]),
       note="coleta seletiva: 3 lixeiras (azul/verde/amarela)")
def piece_recycling_bins_triple():
    P = []
    mats = ("base", "accent", "accent2")
    for i, m in enumerate(mats):
        x = (i - 1) * .8
        P.append(box((.7, .62, .98), (x, 0, .52), m, bevel=.08, seg=3))
        P.append(box((.74, .66, .1), (x, 0, 1.03), "deep", bevel=.04, seg=2))
        P.append(box((.4, .1, .12), (x, -.33, 1.0), "soft", bevel=.04, seg=2))
        P.append(box((.34, .04, .08), (x, -.376, 1.0), "deep", bevel=.015, seg=1))
        P.append(cyl(.12, .018, (x, -.32, .64), "white", rot=(pi / 2, 0, 0), n=16, bevel=.004))
        P.append(heart(.14, .012, (x, -.33, .64), m, rot=(0, 0, 0), bevel=.003) if False else cyl(.07, .01, (x, -.33, .64), m, rot=(pi / 2, 0, 0), n=12))
        P.append(box((.6, .03, .05), (x, -.32, .28), "deep", bevel=.01, seg=1))
        P.append(cyl(.025, .5, (x - .36, -.32, .4), "deep", n=6))
    P.append(box((2.5, .05, .05), (0, .32, 1.0), "trim", bevel=.012, seg=1))
    return P


@piece("drinking_fountain", "stone", "rua", collider=("cylinder", [.3, 1.1], [0, .55, 0]), note="bebedouro de pedestal com bacia e tigela pet")
def piece_drinking_fountain():
    P = []
    P.append(cyl(.28, .1, (0, 0, .05), "base", n=18, bevel=.03, seg=2))
    P.append(lathe([(0, .08), (.17, .08), (.13, .3), (.12, .85), (.2, .92), (0, .94)], "base", n=18, smooth=1))
    P.append(lathe([(0, .93), (.3, .95), (.36, 1.0), (.34, 1.06), (.2, 1.0), (0, .99)], "trim", n=20, smooth=1))
    P.append(lathe([(0, .995), (.2, .995), (.2, 1.0), (0, 1.0)], "water", n=14))
    P.append(tube(smooth3([(0, .1, .95), (0, .13, 1.25), (0, .0, 1.3), (0, -.08, 1.24)], 2), .025, "trim", minor=6))
    P.append(cyl(.045, .05, (0, -.1, 1.2), "trim", n=8))
    P.append(sph(.05, (0, .12, .92), "accent2", n=8, rings=5))
    P.append(lathe([(0, 0), (.16, 0), (.2, .1), (.17, .13), (0, .1)], "trim", loc=(0, -.42, .02), n=16, smooth=1))
    P.append(lathe([(0, .11), (.16, .11), (.16, .12), (0, .12)], "water", loc=(0, -.42, .0), n=12))
    return P


@piece("bike_hoop", "char", "rua", collider=("box", [1.6, .9, .2], [0, .45, 0]), note="paraciclo: 2 argolas de aco")
def piece_bike_hoop():
    P = []
    for x in (-.4, .4):
        pts = [Vector((x, 0, 0)), Vector((x, 0, .45))] + [Vector((x, a[1], a[2])) for a in [(0, .0, 0)]][:0]
        arc = [Vector((x, 0.0 + .34 * cos(t), .52 + .34 * sin(t))) for t in [pi * i / 10 for i in range(0, 11)]]
        pts = [Vector((x, .34, 0)), Vector((x, .34, .52))] + [Vector((x, .34 * cos(t), .52 + .34 * sin(t))) for t in [(pi * i / 10) for i in range(1, 10)]] + [Vector((x, -.34, .52)), Vector((x, -.34, 0))]
        P.append(tube(pts, .028, "base", minor=8))
        for y in (-.34, .34):
            P.append(cyl(.06, .02, (x, y, .01), "trim", n=10))
    P.append(box((.9, .05, .06), (0, 0, .02), "deep", bevel=.015, seg=1))
    return P


@piece("bus_stop", "bus", "rua", collider=("boxes", [[3.4, 2.6, .12, 0, 1.3, .6], [.1, 2.6, 1.3, -1.7, 1.3, 0], [3.4, 2.6, .1, 0, 1.3, -.6]], None),
       note="ponto de onibus com abrigo (teto, 3 vidros, banco, placa redonda de linha, painel de rotas); abertura voltada para -Y blender (via)")
def piece_bus_stop():
    P = []
    W, D = 3.4, 1.3
    P.append(box((W + .3, D + .3, .1), (0, 0, .05), "soft", bevel=.025))
    # estrutura
    for x in (-W / 2, W / 2):
        for y in (-D / 2 + .05, D / 2 - .05):
            P.append(box((.09, .09, 2.5), (x, y, 1.3), "base", bevel=.02))
    P.append(box((W + .4, D + .5, .12), (0, -.05, 2.6), "base", bevel=.05, seg=3))
    P.append(box((W + .1, .1, .22), (0, -D / 2 - .3, 2.6), "accent2", bevel=.04, seg=2))
    P.append(box((W + .46, D + .56, .03), (0, -.05, 2.68), "accent", bevel=.012, seg=1))
    # vidros (fundo e laterais)
    P.append(box((W - .1, .04, 2.1), (0, D / 2 - .05, 1.3), "glass"))
    P.append(box((.04, D - .1, 2.1), (-W / 2 + .02, 0, 1.3), "glass"))
    P.append(box((.04, D - .1, 2.1), (W / 2 - .02, 0, 1.3), "glass"))
    P.append(box((W - .3, .06, .1), (0, D / 2 - .05, .3), "base", bevel=.02))
    # banco + apoio
    P.append(box((2.4, .4, .06), (0, .35, .5), "seat", bevel=.02))
    for x in (-1.0, 1.0):
        P.append(box((.06, .06, .5), (x, .35, .27), "deep"))
    # painel luminoso + mapa de rotas
    P.append(box((.9, .08, 1.5), (1.2, D / 2 - .1, 1.25), "deep", bevel=.03, seg=2))
    P.append(box((.78, .03, 1.38), (1.2, D / 2 - .15, 1.25), "glow", bevel=.01, seg=1))
    for i in range(5):
        P.append(box((.52, .02, .04), (1.15, D / 2 - .17, 1.7 - i * .22), "deep", bevel=.005, seg=1))
    # totem com placa redonda
    xs = W / 2 + .6
    P.append(cyl(.06, 2.7, (xs, -.2, 1.35), "deep", n=10))
    P.append(cyl(.28, .04, (xs, -.24, 2.55), "accent2", rot=(pi / 2, 0, 0), n=24, bevel=.012))
    P.append(cyl(.2, .02, (xs, -.265, 2.55), "white", rot=(pi / 2, 0, 0), n=20))
    P.append(box((.22, .02, .14), (xs, -.29, 2.56), "deep", bevel=.01, seg=1))
    P.append(box((.34, .03, .24), (xs, -.24, 2.0), "accent", bevel=.02))
    P.append(box((.24, .02, .04), (xs, -.265, 2.02), "deep"))
    P.append(cyl(.14, .03, (xs, -.2, .05), "trim", n=14))
    # lixeirinha
    P.append(cyl(.18, .6, (-W / 2 - .45, .1, .3), "deep", n=14, bevel=.02))
    P.append(cyl(.2, .06, (-W / 2 - .45, .1, .62), "trim", n=14, bevel=.015))
    return P


@piece("city_map_totem", "stone", "rua", collider=("box", [1.1, 2.6, .4], [0, 1.3, 0]),
       note="totem de mapa da cidade (tela com mapa estilizado, 'voce esta aqui')")
def piece_city_map_totem():
    P = []
    P.append(box((1.0, .34, .12), (0, 0, .06), "trim", bevel=.025))
    P.append(box((.88, .26, 2.45), (0, 0, 1.33), "base", bevel=.09, seg=3))
    P.append(box((.74, .03, 1.5), (0, -.14, 1.55), "deep", bevel=.015, seg=1))
    P.append(box((.7, .02, 1.46), (0, -.155, 1.55), "white", bevel=.01, seg=1))
    # mapa: parque, lago, ruas, quadras
    P.append(box((.26, .01, .36), (-.2, -.17, 1.95), "leaf", bevel=.004, seg=1))
    P.append(sph((.22, .008, .15), (.17, -.17, 1.9), "accent2", n=10, rings=5))
    P.append(box((.62, .01, .04), (0, -.17, 1.55), "soft", bevel=.003, seg=1))
    P.append(box((.04, .01, 1.3), (-.05, -.17, 1.55), "soft", bevel=.003, seg=1))
    P.append(box((.04, .01, 1.3), (.22, -.17, 1.5), "soft", bevel=.003, seg=1))
    for (x, z, w, h) in ((-.22, 1.33, .22, .2), (.1, 1.33, .22, .22), (.1, 1.75, .22, .18), (-.25, 1.15, .14, .16), (.28, 1.18, .1, .2)):
        P.append(box((w, .012, h), (x, -.17, z), "accent", bevel=.004, seg=1))
    P.append(cyl(.04, .015, (-.05, -.18, 1.55), "accent2", rot=(pi / 2, 0, 0), n=10))
    # cabecalho + base
    P.append(box((.74, .035, .24), (0, -.14, 2.5), "accent2", bevel=.02))
    P.append(box((.48, .02, .05), (0, -.16, 2.5), "white", bevel=.008, seg=1))
    P.append(box((.74, .035, .28), (0, -.14, .72), "accent", bevel=.02))
    P.append(box((.4, .02, .04), (0, -.16, .74), "deep", bevel=.005, seg=1))
    P.append(box((.4, .02, .04), (0, -.16, .66), "deep", bevel=.005, seg=1))
    P.append(cyl(.07, .1, (0, 0, 2.62), "trim", n=12, bevel=.02))
    return P


@piece("clock_post", "char", "rua", collider=("cylinder", [.3, 4.4], [0, 2.2, 0]),
       note="relogio de rua em coluna ornamentada (mostrador duplo)")
def piece_clock_post():
    P = []
    P.append(lathe([(0, 0), (.32, 0), (.32, .14), (.22, .3), (.16, .5), (.12, .7), (.1, 1.0)], "base", n=14, smooth=1))
    P.append(lathe([(.1, .9), (.095, 3.3), (.12, 3.4)], "base", n=12))
    for z in (1.4, 2.4):
        P.append(tube(circ(0, 0, z, .12, 12, "xy"), .02, "trim", minor=5, closed=True))
    P.append(cyl(.2, .1, (0, 0, 3.4), "trim", n=14, bevel=.02))
    P.append(box((.78, .5, .78), (0, 0, 3.8), "base", bevel=.08, seg=3))
    for sy in (-1, 1):
        P.append(cyl(.32, .08, (0, sy * .27, 3.8), "trim", rot=(pi / 2, 0, 0), n=24, bevel=.02))
        P.append(cyl(.27, .06, (0, sy * .3, 3.8), "white", rot=(pi / 2, 0, 0), n=24))
        for k in range(12):
            a = 2 * pi * k / 12
            L = .06 if k % 3 == 0 else .03
            P.append(box((.025 if k % 3 == 0 else .015, .02, L), (.22 * sin(a), sy * .335, 3.8 + .22 * cos(a)), "deep", rot=(0, a, 0), seg=1))
        P.append(box((.025, .02, .2), (.06 * sin(radians(40)), sy * .345, 3.8 + .09), "deep", rot=(0, radians(-40), 0), seg=1))
        P.append(box((.02, .02, .13), (-.05, sy * .35, 3.8 + .02), "deep", rot=(0, radians(120), 0), seg=1))
        P.append(sph(.025, (0, sy * .355, 3.8), "trim", n=6, rings=4))
    P.append(box((.88, .6, .1), (0, 0, 4.24), "trim", bevel=.03))
    P.append(lathe([(0, 4.28), (.3, 4.28), (.22, 4.42), (.1, 4.55), (0, 4.62)], "base", n=14, smooth=1))
    P.append(sph(.05, (0, 0, 4.66), "trim", n=8, rings=5))
    return P


@piece("street_mailbox", "post_blue", "rua", collider=("box", [.7, 1.3, .55], [0, .65, 0]), note="caixa de correio de rua (arco, aba, bandeirola)")
def piece_street_mailbox():
    P = []
    P.append(box((.6, .45, .12), (0, 0, .06), "deep", bevel=.03))
    P.append(box((.1, .08, .3), (-.22, 0, .25), "deep", bevel=.02))
    P.append(box((.1, .08, .3), (.22, 0, .25), "deep", bevel=.02))
    P.append(box((.54, .4, .62), (0, 0, .67), "base", bevel=.06, seg=3))
    P.append(cylY(.27, .4, (0, 0, .98), "base", n=18, b=.03))
    P.append(box((.4, .04, .08), (0, -.2, .86), "deep", bevel=.012, seg=1))
    P.append(box((.4, .03, .2), (0, -.205, .66), "accent", bevel=.02))
    P.append(box((.3, .035, .03), (0, -.22, .7), "deep", bevel=.005, seg=1))
    P.append(box((.3, .035, .03), (0, -.22, .62), "deep", bevel=.005, seg=1))
    P.append(cyl(.07, .02, (0, -.2, 1.1), "accent2", rot=(pi / 2, 0, 0), n=10))
    P.append(box((.4, .04, .05), (0, -.205, .45), "trim", bevel=.01, seg=1))
    return P


@piece("traffic_cone", "cone", "obra", collider=("cylinder", [.25, .7], [0, .35, 0]), note="cone de obra (listras brancas)")
def piece_traffic_cone():
    P = []
    P.append(box((.45, .45, .04), (0, 0, .02), "deep", bevel=.015))
    P.append(lathe([(0, .04), (.17, .04), (.14, .22), (.1, .46), (.065, .64), (.04, .68), (0, .69)], "base", n=14, smooth=0))
    P.append(lathe([(.134, .3), (.115, .4), (.098, .47), (.078, .56), (.078, .54), (.102, .45), (.12, .38), (.139, .29)], "white", n=14))
    return P


@piece("road_barrier", "cone", "obra", collider=("box", [1.9, .9, .3], [0, .45, 0]), note="barreira de obra listrada (laranja/branco) com pes")
def piece_road_barrier():
    P = []
    for x in (-.8, .8):
        P.append(box((.08, .08, .9), (x, 0, .45), "deep", bevel=.02))
        P.append(box((.08, .55, .06), (x, 0, .03), "deep", bevel=.02))
    for z in (.62, .85)[:2]:
        pass
    for z0 in (.52, .74):
        n = 8
        for i in range(n):
            P.append(box((1.7 / n, .05, .17), (-.85 + 1.7 / n * (i + .5), -.01, z0 + .1), "base" if i % 2 == 0 else "white", bevel=.01, seg=1))
    P.append(sph(.05, (-.8, 0, .93), "soft", n=8, rings=5))
    P.append(sph(.05, (.8, 0, .93), "soft", n=8, rings=5))
    return P


@piece("manhole_cover", "char", "rua", collider=None, note="bueiro/tampa redonda; deitada em y=0 (use y=0.045 sobre o asfalto)")
def piece_manhole_cover():
    P = []
    P.append(cyl(.46, .02, (0, 0, .01), "trim", n=24, bevel=.004))
    P.append(cyl(.4, .03, (0, 0, .02), "base", n=24, bevel=.008))
    for k in range(5):
        P.append(box((.7, .03, .018), (0, (k - 2) * .1, .04), "deep", bevel=.004, seg=1))
    return P



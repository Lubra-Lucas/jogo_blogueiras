"""Pecas (parte D): Jardim/Parque (pergolado, balanco, cerca, piquenique, playground...), calcada (arvore em grade, canteiro) e Bairro Futuro (obra)."""
from city_props_more_lib import *  # noqa


# ====================================================================================================
# JARDIM / PARQUE
# ====================================================================================================
def blooms(P, cx, cy, cz, spread, n, cols, r=.05, seed=0):
    for i in range(n):
        a = i * 2.399 + seed
        d = spread * sqrt((i + .5) / n)
        P.append(sph(r, (cx + d * cos(a), cy + d * sin(a), cz + (i % 3) * .03), cols[i % len(cols)], n=6, rings=4))


@piece("pergola_flowers", "white", "jardim", collider=("boxes", [[.25, 2.8, .25, -1.8, 1.4, -1.2], [.25, 2.8, .25, 1.8, 1.4, -1.2], [.25, 2.8, .25, -1.8, 1.4, 1.2], [.25, 2.8, .25, 1.8, 1.4, 1.2]], None),
       note="pergolado branco 4x2.8 m com trepadeira e flores; banco interno; atravessavel entre os postes")
def piece_pergola_flowers():
    P = []
    for sx in (-1.8, 1.8):
        for sy in (-1.2, 1.2):
            P.append(box((.22, .22, 2.8), (sx, sy, 1.4), "base", bevel=.04, seg=2))
            P.append(box((.34, .34, .16), (sx, sy, .08), "accent", bevel=.03))
    for sy in (-1.2, 1.2):
        P.append(box((4.3, .18, .2), (0, sy, 2.8), "base", bevel=.04, seg=2))
    for k in range(9):
        P.append(box((.1, 2.9, .12), (-1.95 + k * .49, 0, 2.95), "base", bevel=.02, seg=1))
    for sx in (-1.8, 1.8):
        for sy in (-1.2, 1.2):
            for j in range(4):
                P.append(sph((.2, .2, .22), (sx + (j % 2) * .06, sy, .5 + j * .6), "leaf", n=7, rings=5))
    for k in range(7):
        P.append(sph((.4, .36, .16), (-1.6 + k * .55, ((k * 7) % 5 - 2) * .35, 3.05 + (k % 2) * .05), "leaf", n=7, rings=5))
    blooms(P, 0, 0, 3.12, 1.7, 16, ["accent2", "white", "soft"], .07)
    P.append(box((1.8, .5, .08), (0, -.9 + 1.9, .5), "seat", bevel=.02, seg=1))
    P.append(box((1.8, .08, .45), (0, 1.15, .8), "seat", bevel=.02, seg=1) if False else box((1.8, .08, .4), (0, 1.12, .75), "seat", bevel=.02, seg=1))
    return P


@piece("swing_bench", "white", "jardim", collider=("boxes", [[.2, 2.5, .2, -1.1, 1.25, -.7], [.2, 2.5, .2, 1.1, 1.25, -.7], [.2, 2.5, .2, -1.1, 1.25, .7], [.2, 2.5, .2, 1.1, 1.25, .7]], None),
       note="banco de balanco com cobertura listrada (armacao branca + assento de madeira)")
def piece_swing_bench():
    P = []
    for sx in (-1.1, 1.1):
        P.append(tube([Vector((sx, -.75, 0)), Vector((sx, 0, 2.45)), Vector((sx, .75, 0))], .06, "base", minor=8))
        P.append(sph(.09, (sx, 0, 2.47), "trim", n=8, rings=5))
    P.append(cylX(.05, 2.4, (0, 0, 2.45), "base", n=10))
    for sx in (-.75, .75):
        P.append(cyl(.012, 1.6, (sx, -.0, 1.65), "trim", n=5))
    P.append(box((1.7, .55, .08), (0, .0, .82), "seat", bevel=.025, seg=1))
    P.append(box((1.7, .08, .55), (0, .27, 1.12), "seat", bevel=.025, seg=1, rot=(-.12, 0, 0)))
    for sx in (-.9, .9):
        P.append(box((.07, .5, .3), (sx, 0, .96), "base", bevel=.02, seg=1))
    n = 8
    for i in range(n):
        P.append(box((2.6 / n * .98, 1.2, .04), (-1.3 + 2.6 / n * (i + .5), 0, 2.55), "accent" if i % 2 == 0 else "white", rot=(0, 0, 0), bevel=.01, seg=1))
        P.append(sph((2.6 / n * .5, .05, .09), (-1.3 + 2.6 / n * (i + .5), -.62, 2.5), "accent" if i % 2 == 0 else "white", n=6, rings=4))
        P.append(sph((2.6 / n * .5, .05, .09), (-1.3 + 2.6 / n * (i + .5), .62, 2.5), "accent" if i % 2 == 0 else "white", n=6, rings=4))
    return P


@piece("birdhouse_post", "wood", "jardim", collider=("cylinder", [.15, 2.2], [0, 1.1, 0]), note="casinha de passaros em poste de madeira")
def piece_birdhouse_post():
    P = []
    P.append(cyl(.06, 2.0, (0, 0, 1.0), "accent", n=8))
    P.append(box((.4, .36, .4), (0, 0, 2.05), "base", bevel=.03, seg=2))
    for sx in (-1, 1):
        P.append(box((.34, .46, .05), (sx * .15, 0, 2.38), "accent2", rot=(0, -sx * .7, 0), bevel=.01, seg=1))
    P.append(cyl(.075, .02, (0, -.19, 2.07), "deep", rot=(pi / 2, 0, 0), n=12))
    P.append(cyl(.012, .14, (0, -.25, 1.93), "trim", rot=(pi / 2, 0, 0), n=5))
    P.append(sph(.045, (0, 0, 2.5), "trim", n=6, rings=4))
    P.append(sph((.12, .1, .1), (.0, -.2, 1.98), "soft", n=8, rings=5) if False else cyl(.0, 0, (0, 0, 0), "soft") if False else sph((.1, .06, .06), (0, 0, .15), "leaf", n=6, rings=4))
    return P


@piece("garden_pots_can", "garden", "jardim", collider=("cylinder", [.7, .8], [0, .4, 0]),
       note="vasos de terracota com flores + regador de metal")
def piece_garden_pots_can():
    P = []
    for (x, y, r, h, m) in ((0, 0, .26, .42, "accent2"), (.5, .15, .2, .32, "accent2"), (-.45, .2, .18, .28, "accent2")):
        P.append(lathe([(0, 0), (r * .75, 0), (r, h * .9), (r * 1.05, h), (r * 1.05, h + .04), (r * .9, h + .04), (0, h - .02)], m, loc=(x, y, 0), n=14))
        P.append(sph((r * 1.5, r * 1.5, r * 1.1), (x, y, h + r * .35), "leaf", n=10, rings=6))
        blooms(P, x, y, h + r * .85, r * .8, 5, ["white", "soft", "accent"], .045, seed=x)
    # regador
    P.append(lathe([(0, 0), (.13, 0), (.14, .22), (.11, .26), (0, .26)], "trim", loc=(.1, -.5, .0), n=12))
    P.append(tube([Vector((.18, -.5, .1)), Vector((.4, -.5, .32)), Vector((.5, -.5, .38))], .02, "trim", minor=5))
    P.append(sph((.05, .03, .03), (.52, -.5, .39), "trim", n=6, rings=4))
    P.append(tube(smooth3([(.0, -.5, .24), (.0, -.5, .42), (.17, -.5, .34)], 1), .015, "trim", minor=4))
    return P


@piece("picket_fence", "white", "jardim", collider=("box", [2.0, .9, .12], [0, .45, 0]), note="cerca branca de jardim (2 m); encaixa lado a lado ao longo de X")
def piece_picket_fence():
    P = []
    P.append(box((2.05, .06, .08), (0, 0, .28), "base", bevel=.015, seg=1))
    P.append(box((2.05, .06, .08), (0, 0, .68), "base", bevel=.015, seg=1))
    n = 11
    for i in range(n):
        x = -.95 + 1.9 / (n - 1) * i
        P.append(box((.11, .035, .85), (x, -.04, .46), "base", bevel=.015, seg=1))
        P.append(prism([(-.055, 0), (.055, 0), (0, .07)], .035, "xz", "base", loc=(x, -.04, .88)))
    for x in (-1.0, 1.0):
        P.append(box((.1, .1, .95), (x, 0, .48), "accent", bevel=.02, seg=1))
        P.append(sph(.06, (x, 0, .98), "accent", n=6, rings=4))
    return P


@piece("house_mailbox", "wood", "jardim", collider=("cylinder", [.2, 1.3], [0, .65, 0]), note="caixa de correio de casa em poste de madeira, bandeirola")
def piece_house_mailbox():
    P = []
    P.append(box((.1, .1, 1.1), (0, 0, .55), "accent", bevel=.02, seg=1))
    P.append(box((.4, .12, .06), (0, 0, 1.12), "accent", bevel=.015, seg=1))
    P.append(box((.3, .5, .22), (0, 0, 1.25), "deep", bevel=.05, seg=2))
    P.append(cylY(.15, .5, (0, 0, 1.28), "deep", n=14, b=.02))
    P.append(box((.26, .02, .18), (0, -.255, 1.24), "deep", seg=1))
    P.append(box((.03, .02, .22), (.18, .1, 1.35), "accent2", seg=1))
    P.append(box((.1, .02, .07), (.2, .1, 1.45), "accent2", seg=1))
    P.append(sph(.025, (0, -.27, 1.22), "trim", n=6, rings=4))
    return P


@piece("stepping_stones", "stone", "jardim", collider=None, note="caminho de pedras (7 lajes) ao longo de Y; atravessavel; y=0.03")
def piece_stepping_stones():
    P = []
    for i in range(7):
        y = -3.0 + i * 1.0
        x = .1 * sin(i * 2.1)
        P.append(prism(sup(.36 + .05 * (i % 2), .3, 2.5, 18, mod=pp.wavy(3, .08)), .04, "xy", "base" if i % 2 == 0 else "accent", loc=(x, y, .02), bevel=.01, seg=1))
    return P


@piece("picnic_set", "garden", "jardim", collider=None, note="piquenique: toalha xadrez, cesta com baguete, tigelas e copos; atravessavel (decor baixo)")
def piece_picnic_set():
    P = []
    n = 6
    for i in range(n):
        for j in range(n):
            P.append(box((1.8 / n, 1.8 / n, .012), (-.9 + 1.8 / n * (i + .5), -.9 + 1.8 / n * (j + .5), .008), "accent2" if (i + j) % 2 == 0 else "white", seg=1))
    P.append(box((.5, .35, .26), (-.3, -.25, .15), "seat", bevel=.03, seg=2))
    P.append(tube(smooth3([(-.55, -.25, .27), (-.3, -.25, .6), (-.05, -.25, .27)], 1), .02, "seat", minor=5))
    P.append(box((.4, .28, .02), (-.3, -.25, .29), "white", bevel=.005, seg=1))
    P.append(cylY(.04, .5, (-.26, -.22, .36), "seat", n=8, b=.01) if False else cylX(.04, .5, (-.26, -.22, .36), "seat", n=8, b=.01))
    P.append(lathe([(0, 0), (.1, .02), (.13, .08), (0, .08)], "white", loc=(.35, .1, .015), n=12))
    P.append(sph(.045, (.33, .08, .1), "accent2", n=6, rings=4))
    P.append(sph(.04, (.4, .13, .1), "leaf", n=6, rings=4))
    for k in range(2):
        P.append(cyl(.035, .09, (.25 + k * .15, -.35, .06), "accent", n=8, bevel=.005))
    return P


@piece("playground_swings", "play", "jardim", collider=("boxes", [[.16, 2.4, .16, -1.4, 1.2, 0], [.16, 2.4, .16, 1.4, 1.2, 0]], None),
       note="balanco duplo: portico de aco azul com 2 assentos de borracha")
def piece_playground_swings():
    P = []
    for sx in (-1.4, 1.4):
        for sy in (-.7, .7):
            pass
        P.append(tube([Vector((sx, -.8, 0)), Vector((sx, 0, 2.4))], .055, "base", minor=8))
        P.append(tube([Vector((sx, .8, 0)), Vector((sx, 0, 2.4))], .055, "base", minor=8))
        for y in (-.8, .8):
            P.append(cyl(.1, .03, (sx, y, .015), "deep", n=8))
    P.append(cylX(.06, 3.0, (0, 0, 2.42), "accent", n=10, b=.01))
    for x in (-.55, .55):
        for sx in (-.2, .2):
            P.append(cyl(.01, 1.7, (x + sx, 0, 1.55), "trim", n=5))
        P.append(box((.5, .22, .05), (x, 0, .62), "accent2", bevel=.02, seg=2))
    return P


@piece("playground_slide", "play", "jardim", collider=("boxes", [[1.0, 2.0, 1.0, 0, 1.0, .8], [.7, .4, 2.2, 0, .2, -.9]], None),
       note="escorregador: torre com plataforma, escada e rampa ondulada amarela")
def piece_playground_slide():
    P = []
    for sx in (-.45, .45):
        for sy in (.4, 1.2):
            P.append(box((.1, .1, 2.0), (sx, sy, 1.0), "base", bevel=.02, seg=1))
    P.append(box((1.1, .9, .08), (0, .8, 1.35), "seat", bevel=.02, seg=1))
    P.append(box((1.1, .06, .35), (0, 1.2, 1.55), "accent", bevel=.02, seg=1))
    for sx in (-.45, .45):
        P.append(box((.06, .06, .35), (sx, .4, 1.55), "accent", seg=1))
    P.append(box((1.1, .06, .08), (0, .4, 1.7), "accent", seg=1))
    # telhado
    for sx in (-1, 1):
        P.append(box((.65, 1.0, .05), (sx * .27, .8, 2.15), "accent2", rot=(0, -sx * .35, 0), bevel=.01, seg=1))
    # escada
    for k in range(5):
        P.append(box((.6, .08, .05), (0, 1.35 + 0 * k - .0, .3 + k * .2), "seat", seg=1) if False else box((.6, .06, .05), (0, 1.4 + k * .05 * 0, .3 + k * .22), "trim", seg=1))
    for sx in (-.3, .3):
        P.append(tube([Vector((sx, 1.45, 0)), Vector((sx, 1.45, 1.4))], .02, "trim", minor=5))
    # rampa
    pts = []
    for t in range(0, 11):
        u = t / 10
        pts.append((0, .35 - u * 2.4, 1.3 * (1 - u) ** 1.6 + .12))
    for (a, b) in zip(pts[:-1], pts[1:]):
        P.append(box((.55, .3, .04), ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), "soft", rot=(atan2(b[2] - a[2], a[1] - b[1]) * -1 * -1, 0, 0), bevel=.005, seg=1))
    for sx in (-.3, .3):
        P.append(tube([Vector((sx, p[1], p[2] + .06)) for p in pts], .025, "accent2", minor=5))
    return P


@piece("playground_seesaw", "play", "jardim", collider=("box", [3.0, .5, .5], [0, .25, 0]), note="gangorra: tabua amarela, pivo central e alcas")
def piece_playground_seesaw():
    P = []
    P.append(cyl(.2, .1, (0, 0, .05), "deep", n=12, bevel=.02))
    P.append(box((.22, .5, .3), (0, 0, .25), "base", bevel=.05, seg=2))
    P.append(box((3.0, .28, .1), (0, 0, .46), "accent", rot=(0, .1, 0), bevel=.03, seg=2))
    for sx in (-1.2, 1.2):
        P.append(tube([Vector((sx, -.2, .6)), Vector((sx, -.2, .85)), Vector((sx, .2, .85)), Vector((sx, .2, .6))], .018, "trim", minor=4))
        P.append(box((.4, .3, .06), (sx * 1.07, 0, .42 + (-.1 if sx < 0 else .1) * 0), "accent2", bevel=.02, seg=1) if False else box((.3, .3, .05), (sx, 0, .46 + sx * .1 * .0), "accent2", bevel=.015, seg=1))
    for sx in (-1.5, 1.5):
        P.append(cyl(.06, .08, (sx, 0, .1), "deep", n=8))
    return P


@piece("garden_lantern_hook", "char", "jardim", collider=("cylinder", [.15, 2.0], [0, 1.0, 0]), note="lampiao pendurado em gancho de jardim (poste fino + lanterna com vela)")
def piece_garden_lantern_hook():
    P = []
    P.append(cyl(.2, .04, (0, 0, .02), "deep", n=10))
    P.append(tube(smooth3([(0, 0, 0), (0, 0, 1.9), (0, -.1, 2.15), (0, -.35, 2.1), (0, -.4, 1.95)], 2), .02, "base", minor=5))
    P.append(box((.2, .2, .04), (0, -.4, 1.9), "trim", bevel=.01, seg=1) if False else lathe([(0, 0), (.1, .0), (.12, .08), (.09, .5), (0, .55)], "glow", loc=(0, -.4, 1.45), n=8))
    for a in range(4):
        t = a * pi / 2 + pi / 4
        P.append(cyl(.012, .5, (.1 * cos(t), -.4 + .1 * sin(t), 1.72), "base", n=5))
    P.append(lathe([(0, 1.96), (.13, 1.96), (.1, 2.04), (0, 2.1)], "base", loc=(0, -.4, 0), n=8))
    P.append(cyl(.12, .04, (0, -.4, 1.45), "base", n=8))
    return P


# ====================================================================================================
# CALCADA
# ====================================================================================================
@piece("sidewalk_tree_grate", "forest", "calcada", collider=("cylinder", [.35, 3.0], [0, 1.5, 0]),
       note="arvore de calcada em grade de ferro (copa verde real, 4.2 m); copa nao colide")
def piece_sidewalk_tree_grate():
    P = []
    P.append(box((1.1, 1.1, .05), (0, 0, .025), "deep", bevel=.01, seg=1))
    P.append(box((1.0, 1.0, .03), (0, 0, .06), "soft", bevel=.01, seg=1))
    for k in range(5):
        P.append(box((.9, .035, .03), (0, -.4 + k * .2, .09), "deep", seg=1))
        P.append(box((.035, .9, .03), (-.4 + k * .2, 0, .09), "deep", seg=1))
    P.append(box((1.1, .05, .1), (0, -.55, .07), "trim", bevel=.01, seg=1) if False else tube(circ(0, 0, .09, .3, 12, "xy"), .02, "deep", minor=4, closed=True))
    P.append(lathe([(0, .05), (.16, .05), (.12, .6), (.09, 2.1), (0, 2.15)], "seat", n=10, smooth=1))
    P.append(tube([Vector((0, 0, 1.5)), Vector((.5, .1, 2.2))], .045, "seat", minor=5))
    P.append(tube([Vector((0, 0, 1.7)), Vector((-.5, -.1, 2.4))], .04, "seat", minor=5))
    for (x, y, z, r) in ((0, 0, 3.0, 1.0), (.7, .2, 2.5, .75), (-.7, -.1, 2.7, .8), (.1, -.6, 2.7, .7), (-.1, .6, 2.6, .7), (0, 0, 3.7, .7)):
        P.append(sph(r, (x, y, z), "leaf", n=10, rings=7))
    return P


@piece("street_planter", "stone", "calcada", collider=("box", [1.7, .9, .7], [0, .45, 0]),
       note="canteiro de rua: jardineira de pedra com arbustos e flores; 1.6 m; palette controla a pedra (stone/wood/concrete/forest)")
def piece_street_planter():
    P = []
    P.append(box((1.6, .6, .6), (0, 0, .3), "base", bevel=.06, seg=2))
    P.append(box((1.7, .7, .1), (0, 0, .62), "trim", bevel=.03, seg=1) if False else box((1.7, .7, .1), (0, 0, .62), "accent", bevel=.03, seg=2))
    P.append(box((1.4, .4, .06), (0, 0, .68), "deep", bevel=.01, seg=1))
    for i in range(4):
        P.append(sph((.4, .34, .36), (-.55 + i * .37, 0, .85 + (i % 2) * .05), "leaf", n=9, rings=6))
    blooms(P, 0, 0, 1.08, .6, 10, ["accent2", "white", "soft"], .05)
    P.append(box((1.5, .02, .08), (0, -.31, .45), "accent", seg=1))
    return P


# ====================================================================================================
# BAIRRO FUTURO (obra)
# ====================================================================================================
@piece("tapume_panel", "plywood", "obra", collider=("box", [2.4, 2.2, .2], [0, 1.1, 0]),
       note="tapume de obra de 2.4 m (compensado com desenhos infantis: sol, casinha, guindaste e arvore); encaixa em fila ao longo de X")
def piece_tapume_panel():
    P = []
    P.append(box((2.4, .1, 2.2), (0, 0, 1.1), "base", bevel=.025, seg=2))
    P.append(box((2.4, .12, .12), (0, 0, 2.2), "accent", bevel=.02, seg=1))
    P.append(box((2.4, .12, .1), (0, 0, .05), "deep", bevel=.02, seg=1))
    for x in (-1.15, 1.15):
        P.append(box((.1, .14, 2.2), (x, .0, 1.1), "deep", bevel=.02, seg=1))
    # desenhos pintados (lado frente = -Y)
    P.append(box((2.1, .02, 1.7), (0, -.06, 1.15), "accent", bevel=.01, seg=1))
    P.append(cyl(.2, .02, (-.7, -.08, 1.8), "accent2", rot=(pi / 2, 0, 0), n=14))
    for k in range(8):
        a = k * pi / 4
        P.append(box((.05, .02, .14), (-.7 + .32 * cos(a), -.08, 1.8 + .32 * sin(a)), "accent2", rot=(0, a + pi / 2, 0), seg=1))
    P.append(box((.55, .02, .4), (.3, -.08, .75), "soft", seg=1))
    P.append(prism([(-.34, 0), (.34, 0), (0, .3)], .02, "xz", "deep", loc=(.3, -.08, 1.15)))
    P.append(box((.14, .02, .22), (.3, -.09, .62), "base", seg=1))
    P.append(box((.1, .02, .1), (.14, -.09, .8), "white", seg=1))
    P.append(box((.1, .02, .1), (.46, -.09, .8), "white", seg=1))
    # guindaste desenhado
    P.append(box((.06, .02, 1.0), (.95, -.08, 1.2), "accent2", seg=1))
    P.append(box((.6, .02, .06), (.75, -.08, 1.7), "accent2", seg=1))
    P.append(box((.01, .02, .3), (.55, -.08, 1.55), "deep", seg=1))
    # arvorezinha
    P.append(box((.06, .02, .3), (-.75, -.08, .7), "deep", seg=1))
    P.append(sph((.28, .02, .28), (-.75, -.08, 1.0), "leaf", n=8, rings=5))
    P.append(box((.4, .02, .08), (-.55, -.08, .35), "white", seg=1))
    return P


@piece("crane_toy", "cone", "obra", collider=("boxes", [[1.6, 3.0, 1.6, 0, 1.5, 0]], None),
       note="guindaste de obra estilo brinquedo (torre treliçada 8 m, lanca, contrapeso, cabine, gancho); amarelo/laranja de obra")
def piece_crane_toy():
    P = []
    P.append(box((2.0, 2.0, .3), (0, 0, .15), "deep", bevel=.06, seg=2))
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(box((.18, .18, 1.2), (sx * .45, sy * .45, .75), "accent", bevel=.04, seg=1) if False else box((.12, .12, 7.0), (sx * .4, sy * .4, 3.8), "base", bevel=.03, seg=1))
    for k in range(7):
        z = .6 + k * 1.0
        for (a, b) in (((-.4, -.4), (.4, -.4)), ((-.4, .4), (.4, .4)), ((-.4, -.4), (-.4, .4)), ((.4, -.4), (.4, .4))):
            P.append(tube([Vector((a[0], a[1], z)), Vector((b[0], b[1], z + 1.0))], .018, "base", minor=4))
            P.append(tube([Vector((b[0], b[1], z)), Vector((a[0], a[1], z + 1.0))], .018, "base", minor=4) if False else None)
        P.append(box((.9, .9, .03), (0, 0, z), "accent", seg=1) if False else None)
    zt = 7.5
    P.append(box((1.1, 1.1, .3), (0, 0, zt - .05), "deep", bevel=.05, seg=1))
    P.append(cyl(.5, .2, (0, 0, zt + .15), "trim", n=14, bevel=.03))
    # cabine
    P.append(box((.8, .8, .8), (0, -.6, zt + .45), "accent", bevel=.1, seg=3))
    P.append(box((.6, .04, .4), (0, -1.0, zt + .55), "glass", seg=1))
    # lanca (jib) e contrapeso
    P.append(box((.22, 7.0, .35), (0, 2.2, zt + .8) if False else (0, 0, zt + .8), "base", bevel=.05, seg=1) if False else box((.22, 6.6, .3), (0, -1.9, zt + .7) if False else (0, 0, zt + .7), "base", bevel=.04, seg=1))
    for k in range(12):
        y0 = -5.5 + k * .8
        P.append(tube([Vector((0, y0, zt + .6)), Vector((0, y0 + .4, zt + 1.0)), Vector((0, y0 + .8, zt + .6))], .015, "base", minor=4))
    P.append(box((.14, 6.6, .08), (0, 0, zt + 1.0), "base", seg=1) if False else box((.14, 7.2, .08), (0, -1.5, zt + 1.05), "base", seg=1))
    P.append(box((.14, 7.2, .24), (0, -2.0 if False else -2.0, zt + .72), "base", bevel=.03, seg=1) if False else None)
    P.append(box((.24, 7.4, .3), (0, -3.1, zt + .72), "base", bevel=.04, seg=1))
    P.append(box((.3, 2.6, .3), (0, 1.6, zt + .72), "base", bevel=.04, seg=1))
    P.append(box((.9, .8, .8), (0, 2.3, zt + .6), "deep", bevel=.06, seg=1))
    P.append(tube([Vector((0, 0, zt + 2.0)), Vector((0, -6.4, zt + .8))], .012, "trim", minor=4))
    P.append(tube([Vector((0, 0, zt + 2.0)), Vector((0, 2.1, zt + .9))], .012, "trim", minor=4))
    P.append(box((.12, .12, 1.1), (0, 0, zt + 1.55), "base", bevel=.02, seg=1))
    # carro e cabo do gancho
    P.append(box((.35, .5, .2), (0, -4.5, zt + .5), "deep", bevel=.04, seg=1))
    P.append(cyl(.012, 3.6, (0, -4.5, zt - 1.3), "trim", n=5))
    P.append(box((.34, .3, .18), (0, -4.5, zt - 3.2), "accent2", bevel=.04, seg=1))
    P.append(tube(arc3(0, zt - 3.45, .12, .12, 0, pi * 1.3, 8, y=-4.5) if False else [Vector((0, -4.5, zt - 3.3)), Vector((.1, -4.5, zt - 3.6)), Vector((0, -4.5, zt - 3.75)), Vector((-.1, -4.5, zt - 3.55))], .02, "trim", minor=4))
    P.append(box((.8, .5, .5), (0, -4.5, zt - 4.3), "accent", bevel=.05, seg=1))
    P.append(text3d("", .1, .01, (0, 0, 0), "white") if False else None)
    return [p for p in P if p is not None]


@piece("soon_sign", "plywood", "obra", collider=("boxes", [[.2, 2.6, .2, -1.4, 1.3, 0], [.2, 2.6, .2, 1.4, 1.3, 0]], None),
       note="placa 'EM BREVE' do Bairro Futuro em dois postes, com faixa listrada de obra")
def piece_soon_sign():
    P = []
    for sx in (-1.4, 1.4):
        P.append(box((.16, .16, 2.4), (sx, 0, 1.2), "deep", bevel=.03, seg=1))
    P.append(box((3.4, .14, 1.5), (0, 0, 2.0), "accent2", bevel=.06, seg=2))
    P.append(box((3.2, .03, 1.3), (0, -.085, 2.0), "base", bevel=.02, seg=1))
    n = 14
    for i in range(n):
        P.append(box((3.2 / n, .035, .22), (-1.6 + 3.2 / n * (i + .5), -.09, 1.47), "base" if i % 2 == 0 else "deep", seg=1))
    P.append(text3d("EM BREVE", .46, .04, (0, -.12, 2.15), "deep", bevel=.003))
    P.append(text3d("BAIRRO FUTURO", .2, .03, (0, -.12, 1.78), "deep"))
    P.append(sph(.07, (-1.4, 0, 2.45), "trim", n=6, rings=4))
    P.append(sph(.07, (1.4, 0, 2.45), "trim", n=6, rings=4))
    return P


@piece("skip_dumpster", "cone", "obra", collider=("box", [2.7, 1.2, 1.4], [0, .6, 0]),
       note="cacamba de entulho (amarela) com entulho e sacos")
def piece_skip_dumpster():
    P = []
    P.append(box((2.6, 1.3, .12), (0, 0, .1), "deep", bevel=.03, seg=1))
    P.append(box((2.6, 1.3, 1.0), (0, 0, .6), "accent", bevel=.05, seg=2) if False else box((2.6, 1.3, 1.0), (0, 0, .65), "accent", bevel=.06, seg=2))
    P.append(box((2.4, 1.1, .5), (0, 0, .95), "deep", bevel=.03, seg=1))
    P.append(box((2.64, 1.34, .1), (0, 0, 1.15), "trim", bevel=.03, seg=1))
    for k in range(4):
        P.append(box((.5, .5, .5), (-.8 + k * .5, ((k * 3) % 3 - 1) * .2, 1.25 + (k % 2) * .08), "soft" if k % 2 else "base", rot=(.2 * k, .3, .5 * k), bevel=.04, seg=1))
    for sy in (-.66, .66):
        for k in range(5):
            P.append(box((.4, .02, .08), (-1.0 + k * .5, sy, .8), "base" if k % 2 == 0 else "deep", seg=1))
    return P


@piece("sand_pile_wheelbarrow", "cone", "obra", collider=("cylinder", [1.4, 1.1], [0, .55, 0]),
       note="monte de areia, sacos de cimento e carrinho de mao")
def piece_sand_pile_wheelbarrow():
    P = []
    P.append(sph((1.4, 1.2, .55), (0, 0, .35), "seat", n=14, rings=8))
    for k in range(4):
        P.append(box((.6, .38, .14), (1.1 + (k % 2) * .05, -.5 + (k % 2) * .1, .08 + (k // 2) * .14), "white", rot=(0, 0, .15 * k), bevel=.04, seg=2))
    # carrinho
    P.append(box((.7, .6, .26), (-1.3, .5, .56), "accent2", bevel=.07, seg=2, rot=(.0, 0, 0)))
    P.append(cylX(.17, .06, (-1.3, .0, .17), "deep", n=14, b=.02))
    for sx in (-1, 1):
        P.append(tube([Vector((-1.3 + sx * .22, .85, .35)), Vector((-1.3 + sx * .22, .2, .4)), Vector((-1.3 + sx * .1, -.1, .17))], .018, "trim", minor=4))
    P.append(sph((.45, .35, .12), (-1.3, .5, .72), "seat", n=8, rings=5))
    return P

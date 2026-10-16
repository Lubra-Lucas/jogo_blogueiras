"""Pecas (parte G, rodada 2): Palco Neon (fliperama, seta neon), Avenida da Moda (jardineira dourada, limusine), parques (cerca/agility de
cachorro, academia ao ar livre, manta de piquenique, pier, barco, amarelinha, banho de passaros) e Bairro Futuro (andaime, container, betoneira)."""
from city_props_more_lib import *  # noqa
from city_props_more_e import blooms2  # noqa


@piece("arcade_machine", "arcade", "neon", collider=("box", [.9, 1.9, .9], [0, .95, 0]),
       note="fliperama vertical: gabinete escuro, letreiro e tela em brilho, joystick e botoes (frente -Y)")
def piece_arcade_machine():
    P = []
    P.append(box((.8, .85, .12), (0, .0, .06), "deep", bevel=.02, seg=1))
    P.append(box((.74, .7, 1.1), (0, .1, .65), "base", bevel=.04, seg=2))
    P.append(box((.74, .5, 1.0), (0, .22, 1.5), "base", rot=(-.12, 0, 0), bevel=.04, seg=2) if False else box((.74, .5, .9), (0, .25, 1.45), "base", bevel=.04, seg=2))
    P.append(box((.62, .06, .5), (0, -.14, 1.3), "deep", rot=(-.1, 0, 0), bevel=.01, seg=1))
    P.append(box((.54, .02, .42), (0, -.18, 1.3), "glow", rot=(-.1, 0, 0), bevel=.005, seg=1))
    P.append(box((.62, .12, .22), (0, -.04, 1.78), "accent2", bevel=.02, seg=1))
    P.append(box((.52, .02, .12), (0, -.105, 1.78), "soft", seg=1))
    P.append(box((.74, .42, .08), (0, -.28, .98), "accent", rot=(.22, 0, 0), bevel=.02, seg=1))
    P.append(cyl(.018, .1, (-.18, -.3, 1.04), "deep", n=6))
    P.append(sph(.04, (-.18, -.3, 1.1), "accent2", n=8, rings=5))
    for k, m in enumerate(("accent2", "soft", "accent2", "white")):
        P.append(cyl(.03, .015, (.02 + k * .09, -.31 + (k % 2) * .03, 1.03), m, rot=(.22 + 0, 0, 0), n=8))
    P.append(box((.5, .02, .2), (0, -.2, .45), "deep", bevel=.01, seg=1))
    P.append(box((.4, .012, .04), (0, -.215, .5), "glow", seg=1))
    for sx in (-.37, .37):
        P.append(box((.02, .72, 1.1), (sx, .1, .65), "accent", seg=1))
    return P


@piece("neon_arrow_sign", "neon", "neon", collider=("cylinder", [.4, 2.8], [0, 1.4, 0]),
       note="seta de neon em poste (indica a entrada do Lounge/Palco), contorno em brilho")
def piece_neon_arrow_sign():
    P = []
    P.append(cyl(.28, .1, (0, 0, .05), "deep", n=14, bevel=.02))
    P.append(cyl(.06, 1.2, (0, 0, .7), "deep", n=10))
    P.append(box((.3, .1, .3), (0, 0, 1.4), "deep", bevel=.02))
    pts = [(-.8, -.22), (.1, -.22), (.1, -.55), (.9, 0), (.1, .55), (.1, .22), (-.8, .22)]
    P.append(prism(pts, .08, "xz", "deep", loc=(0, 0, 1.95), bevel=.01))
    inner = [(-.7, -.14), (.0, -.14), (.0, -.4), (.7, 0), (.0, .4), (.0, .14), (-.7, .14)]
    P.append(prism(inner, .06, "xz", "glow", loc=(0, -.04, 1.95)))
    for k in range(5):
        P.append(sph(.035, (-.7 + k * .35 if k < 3 else .2 + (k - 3) * .4, -.06, 2.28 if k % 2 else 1.62), "glow", n=6, rings=4))
    return P


@piece("gold_planter", "gold", "moda", collider=("box", [1.5, 1.3, .7], [0, .65, 0]),
       note="jardineira dourada longa com cerca-viva aparada e duas esferas (Avenida da Moda)")
def piece_gold_planter():
    P = []
    P.append(box((1.5, .6, .7), (0, 0, .35), "base", bevel=.05, seg=2))
    P.append(box((1.56, .66, .06), (0, 0, .72), "trim", bevel=.02, seg=1))
    P.append(box((1.56, .66, .05), (0, 0, .03), "deep", bevel=.015, seg=1))
    for k in range(4):
        P.append(box((.02, .62, .45), (-.55 + k * .37, 0, .35), "accent", seg=1))
    P.append(box((1.3, .45, .46), (0, 0, 1.0), "leaf", bevel=.12, seg=3))
    for sx in (-.6, .6):
        P.append(sph((.4, .4, .4), (sx, 0, 1.4), "leaf", n=10, rings=6))
    return P


@piece("limo_black", "car_black", "veiculo", collider=("box", [2.1, 1.5, 6.2], [0, .75, 0]),
       note="limusine preta com friso dourado estacionada (chauffeur car), 6.2 m")
def piece_limo_black():
    P = []
    L, W = 6.2, 2.0
    P.append(box((W, L, .75), (0, 0, .75), "base", bevel=.2, seg=3))
    P.append(box((W * .92, L * .58, .62), (0, .1, 1.35), "base", bevel=.22, seg=3))
    for sx in (-1, 1):
        P.append(box((.03, L * .5, .42), (sx * (W * .92 / 2 + .005), .1, 1.36), "glass", bevel=.01, seg=1))
    P.append(box((W * .8, .03, .42), (0, -L * .29 - .02, 1.36), "glass", rot=(.3, 0, 0), seg=1))
    P.append(box((W * .8, .03, .4), (0, L * .29 + .12, 1.36), "glass", rot=(-.3, 0, 0), seg=1))
    P.append(box((W + .02, L * .98, .04), (0, 0, .9), "accent2", bevel=.01, seg=1))
    P.append(box((W * .7, .06, .26), (0, -L / 2 - .01, .72), "trim", bevel=.04, seg=2))
    for sx in (-.65, .65):
        P.append(sph((.24, .08, .14), (sx, -L / 2 + .02, .98), "glow", n=8, rings=5))
        P.append(sph((.24, .08, .12), (sx, L / 2 - .02, .98), "accent", n=8, rings=5))
    for sx in (-1, 1):
        for y in (-2.1, 2.0):
            P.append(cylX(.36, .26, (sx * (W / 2 - .08), y, .36), "deep", n=16, b=.05))
            P.append(cylX(.2, .275, (sx * (W / 2 - .07), y, .36), "trim", n=10))
    for sx in (-1, 1):
        for k in range(3):
            P.append(box((.02, .02, .08), (sx * (W / 2 + .005), -.6 + k * 1.4, 1.2), "trim", seg=1))
    P.append(box((.3, .02, .08), (0, -L / 2 - .012, .98), "accent2", seg=1))
    return P


@piece("dog_park_fence", "forest", "parque", collider=("box", [3.0, 1.2, .1], [0, .6, 0]),
       note="trecho de cerca de cachorródromo (3 m, verde-floresta, malha de tubos)")
def piece_dog_park_fence():
    P = []
    for sx in (-1.5, 1.5):
        P.append(box((.08, .08, 1.3), (sx, 0, .65), "base", bevel=.015, seg=1))
    for z in (.12, 1.28):
        P.append(box((3.0, .05, .05), (0, 0, z), "base", bevel=.01, seg=1))
    for k in range(15):
        P.append(cyl(.012, 1.12, (-1.4 + k * .2, 0, .7), "deep", n=5))
    P.append(box((3.0, .035, .03), (0, 0, .7), "base", seg=1))
    return P


@piece("dog_agility", "play", "parque", collider=("box", [4.5, 1.3, 2.8], [0, .65, 0]),
       note="percurso de agilidade para cachorros: arco-aro, rampa A, tunel e 4 estacas de slalom")
def piece_dog_agility():
    P = []
    # rampa A
    for sg in (-1, 1):
        P.append(box((.8, .9, .04), (-1.4, sg * .42, .45), "accent2", rot=(sg * .75, 0, 0), bevel=.01, seg=1) if False else box((.8, 1.0, .04), (-1.4, sg * .38, .42), "accent2", rot=(sg * .8, 0, 0), bevel=.01, seg=1))
    # aro
    P.append(tube(circ(0, 0, .68, .42, 18, "xz"), .035, "accent", minor=5, closed=True))
    for sx in (-.28, .28):
        P.append(box((.06, .06, .3), (sx, 0, .15), "deep", seg=1))
    P.append(box((.8, .06, .05), (0, 0, .04), "deep", seg=1))
    # tunel
    P.append(lathe([(.4, 0), (.4, .8), (.35, 1.3)], "soft", loc=(1.4, 0, .4), rot=(0, pi / 2, 0), n=16) if False else cyl(.4, 1.5, (1.5, 0, .4), "soft", rot=(0, pi / 2, 0), n=16, bevel=.02))
    P.append(cyl(.34, 1.52, (1.5, 0, .4), "deep", rot=(0, pi / 2, 0), n=16))
    for k in range(4):
        P.append(cyl(.015, .8, (-.8 + k * .45, 1.1, .4), "white", n=6))
        P.append(cyl(.03, .05, (-.8 + k * .45, 1.1, .02), "deep", n=6))
    return P


@piece("outdoor_gym", "concrete", "parque", collider=("box", [3.0, 2.4, 1.6], [0, 1.2, 0]),
       note="academia ao ar livre: barra fixa alta, paralelas, banco de abdominal e piso de borracha (3 x 2 m)")
def piece_outdoor_gym():
    P = []
    P.append(box((3.2, 2.2, .04), (0, 0, .02), "accent", bevel=.01, seg=1))
    for sx in (-1.3, -.5):
        P.append(cyl(.06, 2.4, (sx, -.6, 1.2), "accent2", n=10))
    P.append(cyl(.035, .8, (-.9, -.6, 2.35), "trim", rot=(0, pi / 2, 0), n=8))
    P.append(cyl(.03, .8, (-.9, -.6, 1.7), "trim", rot=(0, pi / 2, 0), n=8))
    for sx in (-.2, .2):
        P.append(cyl(.05, 1.0, (.4 + sx, .6, .5), "accent2", n=8))
        P.append(cyl(.03, 1.6, (.4 + sx, .6, 1.0), "trim", rot=(pi / 2, 0, 0), n=8))
    P.append(box((.4, 1.5, .1), (1.2, -.2, .5), "deep", rot=(.4, 0, 0), bevel=.03, seg=1))
    P.append(box((.12, .12, .5), (1.2, .5, .25), "accent2", seg=1))
    P.append(box((.12, .12, .3), (1.2, -.9, .15), "accent2", seg=1))
    P.append(cyl(.05, .5, (1.2, .2, .62), "deep", rot=(0, pi / 2, 0), n=8))
    P.append(box((.8, .02, .6), (-.1, -1.05, .9), "white", seg=1))
    P.append(box((.6, .01, .1), (-.1, -1.065, 1.05), "accent2", seg=1))
    return P


@piece("picnic_blanket", "blanket", "parque", walkable=True, note="manta xadrez de piquenique com cesta e copos; rasteira 2.2 x 2.2")
def piece_picnic_blanket():
    P = []
    n = 6
    s = 2.1 / n
    for i in range(n):
        for j in range(n):
            P.append(box((s * .99, s * .99, .014), (-1.05 + s * (i + .5), -1.05 + s * (j + .5), .007 + (.004 if (i + j) % 2 else 0)), "accent" if (i + j) % 2 else "base", seg=1))
    for sx in (-1.07, 1.07):
        P.append(box((.03, 2.14, .012), (sx, 0, .008), "deep", seg=1))
    P.append(cyl(.2, .1, (.3, .2, .08), "seat", n=12, bevel=.015))
    P.append(tube(smooth3([(.1, .2, .13), (.3, .2, .38), (.5, .2, .13)], 1), .015, "seat", minor=4))
    P.append(box((.36, .26, .02), (.3, .2, .14), "accent2", seg=1))
    for k in range(2):
        P.append(cyl(.04, .1, (-.5 + k * .2, -.4, .06), "white", n=8))
        P.append(cyl(.035, .02, (-.5 + k * .2, -.4, .11), "accent2", n=8))
    P.append(sph((.2, .2, .1), (-.2, .5, .06), "accent2", n=8, rings=4))
    return P


@piece("lake_pier", "pier", "parque", collider=("box", [2.4, .6, 8.0], [0, .3, 0]),
       note="pier de madeira (2.4 x 8 m) com postes, guarda-corpo, lanterna e escada; o inicio fica na margem, o resto avanca sobre a agua")
def piece_lake_pier():
    P = []
    L, W = 8.0, 2.2
    for k in range(int(L / .22)):
        y = -L / 2 + .11 + k * .22
        P.append(box((W, .2, .06), (0, y, .52), "base" if k % 2 else "accent", bevel=.008, seg=1))
    for sx in (-W / 2, W / 2):
        P.append(box((.1, L, .1), (sx, 0, .44), "deep", seg=1))
    for k in range(5):
        y = -L / 2 + .4 + k * 1.8
        for sx in (-W / 2, W / 2):
            P.append(cyl(.09, .9, (sx, y, .15), "deep", n=8))
            P.append(box((.07, .07, .6), (sx * 1.02, y, .86), "deep", seg=1))
    for sx in (-W / 2, W / 2):
        P.append(box((.05, L - .5, .05), (sx * 1.02, 0, 1.12), "deep", seg=1))
        P.append(box((.04, L - .5, .04), (sx * 1.02, 0, .8), "deep", seg=1))
    # lanterna na ponta
    y = L / 2 - .3
    P.append(cyl(.04, 1.3, (0, y, 1.2), "deep", n=8))
    P.append(lathe([(0, 0), (.1, .02), (.12, .14), (.08, .26), (0, .3)], "glow", loc=(0, y, 1.8), n=10))
    P.append(lathe([(0, .3), (.14, .28), (.05, .44), (0, .46)], "deep", loc=(0, y, 1.8), n=10))
    P.append(box((.8, .35, .04), (0, -L / 2 + .5, .08), "base", seg=1))
    return P


@piece("rowboat", "boat", "parque", collider=("box", [1.2, .6, 3.0], [0, .3, 0]),
       note="barco a remo creme com friso azul, bancos e remos (para amarrar ao pier)")
def piece_rowboat():
    P = []
    P.append(sph((1.15, 3.0, .6), (0, 0, .35), "base", n=14, rings=7))
    P.append(sph((1.0, 2.84, .3), (0, 0, .5), "seat", n=14, rings=5))
    P.append(tube(smooth3([(-.54, -1.0, .6), (-.58, 0, .62), (-.54, 1.0, .6)], 1), .03, "accent", minor=5))
    P.append(tube(smooth3([(.54, -1.0, .6), (.58, 0, .62), (.54, 1.0, .6)], 1), .03, "accent", minor=5))
    for y in (-.6, .1, .7):
        P.append(box((1.0, .22, .05), (0, y, .52), "soft", bevel=.01, seg=1))
    for sx in (-1, 1):
        P.append(tube([Vector((sx * .62, -.1, .65)), Vector((sx * 1.5, .4, .35))], .02, "seat", minor=4))
        P.append(box((.14, .5, .015), (sx * 1.58, .45, .33), "seat", rot=(0, 0, .3 * sx), seg=1))
    return P


@piece("scaffold_tower", "scaffold", "obra", collider=("box", [2.7, 6.5, 1.7], [0, 3.25, 0]),
       note="torre de andaime galvanizado (2.6 x 1.6 x 6.4 m, 3 niveis com pranchas, escada e travessas em X)")
def piece_scaffold_tower():
    P = []
    W, D = 2.6, 1.6
    H = 6.4
    for sx in (-W / 2, W / 2):
        for sy in (-D / 2, D / 2):
            P.append(cyl(.035, H, (sx, sy, H / 2), "base", n=8))
            for z in (0, 2.1, 4.2):
                P.append(cyl(.05, .05, (sx, sy, z + .03), "accent", n=8))
    for lv in (0, 1, 2, 3):
        z = .4 + lv * 2.0
        for sy in (-D / 2, D / 2):
            P.append(cyl(.025, W, (0, sy, z), "base", rot=(0, pi / 2, 0), n=6))
        for sx in (-W / 2, W / 2):
            P.append(cyl(.025, D, (sx, 0, z), "base", rot=(pi / 2, 0, 0), n=6))
        if lv:
            P.append(box((W, D, .05), (0, 0, z + .03), "soft", bevel=.005, seg=1))
        if lv in (1, 2):
            for sy in (-D / 2, D / 2):
                P.append(cyl(.02, W, (0, sy, z + .5), "base", rot=(0, pi / 2, 0), n=6))
                P.append(cyl(.02, W, (0, sy, z + 1.0), "base", rot=(0, pi / 2, 0), n=6))
    for lv in range(3):
        z0 = .4 + lv * 2.0
        for sy in (-D / 2, D / 2):
            P.append(tube([Vector((-W / 2, sy, z0)), Vector((W / 2, sy, z0 + 2.0))], .02, "accent", minor=4))
            P.append(tube([Vector((W / 2, sy, z0)), Vector((-W / 2, sy, z0 + 2.0))], .02, "accent", minor=4))
    for k in range(18):
        P.append(cyl(.015, .5, (W / 2 + .12, 0, .3 + k * .33), "base", rot=(pi / 2, 0, 0), n=5))
    for sy in (-.25, .25):
        P.append(cyl(.025, 6.0, (W / 2 + .12, sy, 3.1), "base", n=6))
    P.append(box((W + .2, .03, .3), (0, D / 2 + .01, 6.2), "accent2", seg=1))
    return P


@piece("site_hut", "cone", "obra", collider=("box", [2.6, 2.5, 6.0], [0, 1.25, 0]),
       note="container-barraca de obra laranja (6 x 2.5 m) com porta, janela, tendinha e ar-condicionado")
def piece_site_hut():
    P = []
    L, W, H = 6.0, 2.5, 2.4
    P.append(box((W, L, H), (0, 0, H / 2 + .2), "base", bevel=.05, seg=2))
    for k in range(10):
        P.append(box((.03, .03, H), (-W / 2 - .01 + 0, -L / 2 + .3 + k * .6, H / 2 + .2), "accent", seg=1) if False else box((.03, .05, H - .1), (W / 2 + .015, -L / 2 + .3 + k * .6, H / 2 + .2), "accent", seg=1))
        P.append(box((.03, .05, H - .1), (-W / 2 - .015, -L / 2 + .3 + k * .6, H / 2 + .2), "accent", seg=1))
    P.append(box((W + .06, L + .06, .08), (0, 0, H + .24), "deep", bevel=.02, seg=1))
    for sx in (-1, 1):
        P.append(box((.14, .14, .2), (sx * (W / 2 - .1), -L / 2 + .1, .1), "deep", seg=1))
        P.append(box((.14, .14, .2), (sx * (W / 2 - .1), L / 2 - .1, .1), "deep", seg=1))
    # porta (frente -Y) e janela
    P.append(box((.9, .05, 1.95), (-.5, -L / 2 - .02, 1.2), "deep", bevel=.02, seg=1))
    P.append(box((.84, .02, 1.85), (-.5, -L / 2 - .05, 1.2), "soft", seg=1))
    P.append(box((.08, .03, .04), (-.14, -L / 2 - .07, 1.15), "trim", seg=1))
    P.append(box((.9, .05, .62), (.7, -L / 2 - .02, 1.45), "deep", bevel=.02, seg=1))
    P.append(box((.82, .02, .54), (.7, -L / 2 - .05, 1.45), "glass", seg=1))
    # tendinha
    P += stripes(2.2, .9, (-.5, -L / 2 - .5, 2.15), 6, "accent2", "white", .35, t=.03)
    # ar-condicionado e luminaria
    P.append(box((.8, .3, .5), (W / 2 + .2, 1.2, 1.9), "white", bevel=.03, seg=1))
    P.append(box((.6, .1, .15), (-.5, -L / 2 - .1, 2.8 - .35 + 0), "glow", seg=1) if False else box((.5, .08, .08), (-.5, -L / 2 - .08, 2.75), "glow", seg=1))
    return P


@piece("cement_mixer", "cone", "obra", collider=("box", [1.3, 1.5, 1.6], [0, .75, 0]),
       note="betoneira fofa laranja com tambor listrado, cuba inclinada, 2 rodas e manivela")
def piece_cement_mixer():
    P = []
    for sx in (-.45, .45):
        P += wheel(sx, .0, .25, .25, "deep", "trim", "trim", 6, plane="yz", tire=.04)
    P.append(cyl(.03, 1.0, (0, 0, .25), "trim", rot=(0, pi / 2, 0), n=8))
    P.append(box((.8, .12, .1), (0, .0, .55), "deep", bevel=.02, seg=1))
    P.append(tube([Vector((0, -.5, .06)), Vector((0, -.35, .55))], .035, "deep", minor=5))
    P.append(tube([Vector((-.35, .0, .5)), Vector((0, .0, .95)), Vector((.35, .0, .5))], .045, "base", minor=6))
    P.append(lathe([(0, -.55), (.26, -.5), (.5, -.1), (.52, .2), (.5, .45), (.35, .65), (.22, .75), (.28, .75), (.4, .6), (.58, .3)] if False else [(0, -.6), (.3, -.5), (.55, -.1), (.55, .25), (.4, .55), (.28, .66), (.26, .76)], "base", loc=(0, 0, .95), rot=(-.55, 0, 0), n=18, smooth=1))
    P.append(tube(circ(0, 0, 0, .55, 18, "xy"), .035, "deep", minor=5, closed=True, loc=(0, -.03, .9), rot=(-.55, 0, 0)))
    for k in range(3):
        P.append(tube(circ(0, 0, 0, .52 - k * .0, 18, "xy"), .02, "accent", minor=4, closed=True, loc=(0, -.04 + k * .3, .95 + k * .17), rot=(-.55, 0, 0)))
    P.append(cyl(.025, .4, (.6, .1, .75), "trim", rot=(0, pi / 2, 0), n=6))
    P.append(box((.25, .1, .1), (-.3, .05, .35), "accent", seg=1))
    return P


@piece("hopscotch", "chalk", "parque", walkable=True, note="amarelinha riscada a giz (rasteira): quadrados em 1-2-1-2-1-2-semi-circulo")
def piece_hopscotch():
    P = []
    s = .5
    cells = [(0, 0), (0, 1), (-.5, 2), (.5, 2), (0, 3), (-.5, 4), (.5, 4), (0, 5)]
    for k, (x, y) in enumerate(cells):
        P.append(box((s * .94, s * .94, .006), (x, y * s - 1.1, .004), ["accent2", "soft", "white"][k % 3], seg=1))
        P.append(box((s * .98, s * .98, .003), (x, y * s - 1.1, .002), "base", seg=1))
    P.append(cyl(.5, .006, (0, 5.0 * s - 1.1 + .1, .004), "accent2", n=18))
    P.append(cyl(.5, .003, (0, 5.0 * s - 1.1 + .1, .002), "base", n=18))
    return P


@piece("bird_bath", "stone", "parque", collider=("cylinder", [.4, 1.0], [0, .5, 0]),
       note="banho de passaros em pedra com agua e um pardal")
def piece_bird_bath():
    P = []
    P.append(cyl(.28, .1, (0, 0, .05), "accent", n=14, bevel=.02))
    P.append(lathe([(0, .08), (.12, .1), (.09, .3), (.07, .55), (.18, .65), (0, .65)], "base", n=14, smooth=1))
    P.append(lathe([(0, .62), (.3, .7), (.42, .86), (.4, .88), (.28, .78), (0, .75)], "base", n=18, smooth=1))
    P.append(cyl(.34, .01, (0, 0, .84), "water", n=16))
    P.append(sph((.1, .06, .07), (.12, .04, .91), "deep", n=7, rings=4))
    P.append(sph((.06, .06, .06), (.17, .04, .96), "deep", n=6, rings=4))
    P.append(prism([(0, 0), (.06, .02), (0, .03)], .01, "xz", "accent2", loc=(.2, .04, .96)))
    return P

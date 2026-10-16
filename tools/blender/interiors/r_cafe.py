"""Cafe Rose: menta + creme + morango, rose gold."""
from lib import *
from lib2 import *
R = "cafe"


@piece(R, "floor_checker_small", tags=["floor", "tile"], col="box", walk=True, mount="floor", note="piso xadrez 8x8 menta/creme, ladrilho 2x2 m")
def floor_small():
    P = [rb((2, 2, .03), (0, 0, .015), "accent", .006, seg=2)]
    for i in range(8):
        for j in range(8):
            if (i + j) % 2 == 0:
                P.append(box((.25, .25, .006), (-.875 + i * .25, -.875 + j * .25, .03), "base"))
    P.append(box((2, .014, .008), (0, -.993, .032), "trim"))
    P.append(box((.014, 2, .008), (-.993, 0, .032), "trim"))
    return P


@piece(R, "counter_service", tags=["counter", "hero"], col="box", hero=True, mount="floor",
       use=[dict(id="order", pos=(0, -.9, 0), face=(0, 1), label="Fazer pedido")],
       note="balcao de atendimento 2.4 m, frente canelada com festao de morango e tampo creme (h 0.96). Atendente fica em +Y")
def counter():
    P = [rb((2.4, .7, .86), (0, .0, .47), "base", .05), rb((2.52, .8, .06), (0, -.01, .93), "white", .025)]
    P.append(ck.tube(rect_pts(2.5, .78, .965, 0, -.01, .05), .012, "trim", minor=6, closed=True))
    P.append(rb((2.46, .74, .06), (0, 0, .08), "trim", .02))
    for i in range(23):
        P.append(ck.cyl(.04, .72, (-1.1 + i * .1, -.35, .46), "accent", n=8))
    P.append(rb((2.44, .025, .09), (0, -.39, .78), "accent2", .01))
    P.append(cloud([(-1.15 + i * .1, -.4, .75, (.1, .07, .1)) for i in range(24)], "accent2", 8, 5))
    P.append(ck.tube([Vector((-1.2, -.43, .62)), Vector((1.2, -.43, .62))], .012, "trim", minor=5))
    for sx in (-1, 1):
        P.append(ck.heart(.14, .02, (sx * .9, -.4, .47), "accent2", bevel=.007, seg=2))
    return P


@piece(R, "display_case_pastry", tags=["counter", "display", "hero"], col="box", hero=True, mount="floor",
       use=[dict(id="pastries", pos=(0, -.8, 0), face=(0, 1), label="Ver doces")],
       lights=[dict(pos=(0, -.2, 1.2), color="#fff0d8", range=2.5, intensity=0.6)],
       note="vitrine de confeitaria 1.6 m com bolos, macarons e cupcakes, vidro e LED (h 1.45)")
def display_case():
    w, d = 1.6, .72
    P = [rb((w, d, .82), (0, 0, .43), "base", .05)]
    for i in range(14):
        P.append(ck.cyl(.04, .74, (-.72 + i * .111, -d / 2, .43), "accent", n=8))
    P.append(rb((w + .06, d + .04, .05), (0, 0, .87), "white", .02))
    P.append(rb((w + .06, d + .04, .05), (0, 0, .06), "trim", .02))
    for sx in (-1, 1):
        P.append(rb((.03, d - .05, .5), (sx * (w / 2 - .02), 0, 1.13), "trim", .01))
    P.append(rb((w - .04, .02, .5), (0, d / 2 - .06, 1.13), "accent", .008))
    P.append(rb((w - .06, .02, .5), (0, -d / 2 + .03, 1.13), "glass", .006))
    P.append(rb((w - .06, d - .1, .02), (0, 0, 1.4), "glass", .006))
    P.append(rb((w + .02, d, .04), (0, 0, 1.43), "trim", .015))
    for z in (.9, 1.14):
        P.append(rb((w - .1, d - .12, .02), (0, 0, z), "white", .006))
        P.append(ck.tube([Vector((-w / 2 + .08, -d / 2 + .07, z + .012)), Vector((w / 2 - .08, -d / 2 + .07, z + .012))], .01, "glow", minor=4))
    P += cupcakes([(-.6 + i * .11, -.15, .91) for i in range(5)], "accent2", "white", "accent2")
    P += cupcakes([(-.6 + i * .11, .05, .91) for i in range(5)], "white", "accent", "accent2")
    P += macarons([(.15 + i * .12, -.18, .91) for i in range(4)], "accent2", "white")
    P += macarons([(.15 + i * .12, .0, .91) for i in range(4)], "soft", "white")
    P += macarons([(.2 + i * .12, .17, .91) for i in range(3)], "base", "white")
    P.append(ck.cyl(.2, .015, (-.35, 0, 1.15), "trim", n=24))
    P.append(ck.cyl(.16, .1, (-.35, 0, 1.2), "soft", n=22, bevel=.02))
    P.append(ck.cyl(.12, .09, (-.35, 0, 1.3), "white", n=22, bevel=.02))
    P.append(cloud([(-.35 + .12 * cos(a), .12 * sin(a), 1.355, .028) for a in [k * pi / 3 for k in range(6)]], "accent2", 6, 4))
    P.append(ck.cyl(.18, .015, (.35, 0, 1.15), "trim", n=24))
    P.append(ck.cyl(.14, .12, (.35, 0, 1.22), "accent2", n=22, bevel=.02))
    P.append(ck.cyl(.12, .02, (.35, 0, 1.3), "white", n=22))
    P.append(cloud([(.35 + .06 * cos(a), .06 * sin(a), 1.34, .025) for a in [k * pi / 2 for k in range(4)]], "accent2", 6, 4))
    return P


@piece(R, "espresso_machine", tags=["appliance", "tabletop"], col=None, mount="tabletop", use=[dict(id="coffee", pos=(0, -.6, 0), face=(0, 1), label="Fazer cafe")],
       note="maquina de espresso retro creme/rose gold (0.6 m)")
def espresso():
    P = [rb((.62, .36, .34), (0, 0, .24), "accent", .06)]
    P.append(rb((.66, .4, .06), (0, 0, .07), "trim", .02))
    P.append(rb((.62, .38, .05), (0, 0, .43), "accent2", .02))
    P.append(rb((.5, .2, .06), (0, .0, .49), "trim", .02))
    for sx in (-1, 1):
        P.append(ck.cyl(.045, .06, (sx * .18, -.14, .36), "trim", n=12))
        P.append(ck.cyl(.035, .05, (sx * .18, -.17, .31), "white", n=10))
        P.append(rb((.05, .14, .03), (sx * .18, -.25, .33), "deep", .01))
        P.append(ck.cyl(.04, .015, (sx * .1, -.185, .45), "glow", rot=(pi / 2, 0, 0), n=14))
    P.append(ck.lathe([(0, 0), (.04, 0), (.04, .045), (0, .045)], "white", (.0, -.16, .13), n=10))
    P.append(ck.tube([Vector((.27, -.1, .35)), Vector((.31, -.13, .27)), Vector((.31, -.14, .17))], .01, "trim", minor=5))
    P.append(ck.heart(.12, .02, (0, -.19, .3), "accent2", bevel=.006, seg=2))
    P.append(rb((.4, .28, .02), (0, -.02, .04), "deep", .006))
    return P


@piece(R, "register_retro", tags=["appliance", "tabletop", "register"], col=None, mount="tabletop", use=[dict(id="pay", pos=(0, -.6, 0), face=(0, 1), label="Pagar")],
       note="caixa registradora retro rosa com teclas e gaveta (0.4 m)")
def register():
    P = [rb((.4, .36, .16), (0, 0, .1), "accent2", .04), rb((.44, .4, .03), (0, 0, .02), "trim", .01)]
    P.append(rb((.36, .24, .06), (0, -.04, .21), "accent2", .03, rot=(.28, 0, 0)))
    for i in range(4):
        for j in range(3):
            P.append(ck.cyl(.018, .01, (-.11 + i * .075, -.1 + j * .07, .24 - j * .005), "white", rot=(.28, 0, 0), n=8))
    P.append(rb((.24, .03, .13), (0, .1, .35), "deep", .01, rot=(-.1, 0, 0)))
    P.append(rb((.21, .01, .1), (0, .082, .35), "glow", .003, rot=(-.1, 0, 0)))
    P.append(ck.tube([Vector((0, .1, .2)), Vector((0, .1, .27))], .012, "trim", minor=5))
    P.append(rb((.34, .02, .08), (0, -.185, .09), "trim", .006))
    P.append(ck.heart(.06, .01, (0, -.2, .09), "accent2", bevel=.003, seg=2))
    P.append(ck.sph((.07, .07, .05), (.17, -.08, .3), "trim", n=8, rings=4))
    return P


@piece(R, "menu_board", tags=["wall", "sign"], col=None, mount="wall", note="quadro de cardapio com moldura dourada e linhas luminosas, z 1.2 a 2.5")
def menu_board():
    z = 1.85
    P = [rb((.95, .04, 1.25), (0, .02, z), "trim", .015)]
    P.append(rb((.84, .03, 1.14), (0, -.01, z), "deep", .008))
    P += frame(.95, 1.25, .05, (0, -.02, z), "white", d=.04, r=.015)
    P.append(cloud([(-.45 + i * .11, -.03, z + .64, (.08, .05, .06)) for i in range(9)], "accent2", 8, 4))
    for k in range(7):
        w = .5 + ((k * 37) % 5) * .04
        P.append(rb((w, .012, .018), (-.12 + (w - .5) / 2, -.028, z + .3 - k * .12), "glow", .004))
        P.append(rb((.08, .012, .018), (.3, -.028, z + .3 - k * .12), "glow2", .004))
    P.append(neon(arc2(0, 0, .06, pi, 2 * pi, 10) + [(.06, .06), (-.06, .06), (-.06, 0)], (0, 0, z + .46), "glow2", .007, y=-.03))
    return P


@piece(R, "bistro_table_round", tags=["table", "seat_group"], col="cyl", mount="floor", note="mesa bistro redonda 0.8 m, tampo de marmore creme e pe de rose gold (h 0.75)")
def bistro_table():
    P = [ck.cyl(.4, .035, (0, 0, .735), "white", n=32, bevel=.012), ring(.4, .012, (0, 0, .735), "trim", n=32, minor=6)]
    P.append(ck.lathe([(0, 0), (.22, 0), (.2, .02), (.06, .06), (.035, .2), (.05, .3), (.03, .4), (.035, .6), (.07, .7), (0, .72)], "trim", n=16, smooth=1))
    P.append(ck.cyl(.08, .02, (0, 0, .71), "trim", n=14))
    P.append(ck.heart(.12, .015, (0, .0, .758), "accent2", rot=(pi / 2, 0, 0), bevel=.005, seg=2))
    return P


@piece(R, "chair_bistro_curvy", tags=["seat", "chair"], col="box", mount="floor", sit=[dict(id="sit", pos=(0, -.02, .48), face=(0, -1))],
       note="cadeira bistro curvilinea com encosto em arco com coracao, assento morango (0.9 m)")
def chair_bistro():
    P = [ck.cyl(.21, .06, (0, 0, .43), "fabric", n=24, bevel=.02), ring(.21, .01, (0, 0, .4), "trim", n=24, minor=5)]
    for k in range(4):
        a = pi / 4 + k * pi / 2
        P.append(ck.tube([Vector((.14 * cos(a), .14 * sin(a), .4)), Vector((.17 * cos(a), .17 * sin(a), .2)), Vector((.22 * cos(a), .22 * sin(a), .0))], .015, "trim", minor=6))
    pts = [Vector((.2 * cos(a), .21, .66 + .2 * sin(a))) for a in [pi * i / 14 for i in range(15)]]
    P.append(ck.tube([Vector((-.2, .2, .43)), Vector((-.2, .2, .6))] + pts + [Vector((.2, .2, .6)), Vector((.2, .2, .43))], .016, "trim", minor=6))
    P.append(ck.heart(.2, .03, (0, .21, .68), "accent2", bevel=.01, seg=2))
    P.append(ck.cyl(.2, .01, (0, 0, .395), "trim", n=20))
    return P


@piece(R, "booth_sofa", tags=["seat", "booth"], col="box", mount="floor", sit=[dict(id="sit_l", pos=(-.5, 0, .5), face=(0, -1)), dict(id="sit_r", pos=(.5, 0, .5), face=(0, -1))],
       note="banco de cabine capitone morango 2 m (costas altas 1.2 m); combine 2 de frente para uma mesa")
def booth():
    w, d = 2.0, .7
    P = [rb((w, d, .3), (0, 0, .2), "base", .05), rb((w - .1, d - .1, .16), (0, -.02, .43), "fabric", .06)]
    P.append(rb((w, .2, 1.15), (0, d / 2 - .1, .62), "base", .06))
    P += tuft(w - .16, .78, .12, (0, d / 2 - .22, .82), "fabric", sx=.18)
    P.append(ck.tube([Vector((-w / 2 + .05, -d / 2, .36)), Vector((w / 2 - .05, -d / 2, .36))], .012, "trim", minor=5))
    for sx in (-1, 1):
        P.append(rb((.1, d, .9), (sx * (w / 2 - .05), 0, .55), "base", .04))
        P.append(ck.sph((.14, .14, .1), (sx * (w / 2 - .05), -d / 2 + .05, 1.02), "trim", n=8, rings=4))
    P.append(ck.heart(.24, .04, (0, d / 2 - .09, 1.28), "trim", bevel=.012, seg=2))
    P.append(rb((w, d, .04), (0, 0, .03), "trim", .01))
    return P


@piece(R, "cake_stand_dome", tags=["food", "tabletop", "decor"], col=None, mount="tabletop", note="suporte de bolo com cupula de vidro, bolo de morango (h 0.5)")
def cake_stand():
    P = [ck.lathe([(0, 0), (.1, 0), (.11, .02), (.03, .05), (.025, .13), (.05, .16), (.21, .17), (.22, .19), (0, .19)], "white", n=24, smooth=1)]
    P.append(ring(.215, .007, (0, 0, .185), "trim", n=24, minor=4))
    P.append(ck.cyl(.16, .08, (0, 0, .235), "soft", n=24, bevel=.02))
    P.append(ck.cyl(.12, .07, (0, 0, .305), "white", n=24, bevel=.02))
    P.append(ck.cyl(.165, .012, (0, 0, .272), "accent2", n=24))
    P.append(cloud([(.1 * cos(a), .1 * sin(a), .37, .028) for a in [k * pi / 3 for k in range(6)]], "accent2", 6, 4))
    P.append(ck.lathe([(.22, .19), (.22, .3), (.18, .44), (.08, .5), (0, .51)], "glass", (0, 0, .0), n=24, smooth=1))
    P.append(ck.sph(.03, (0, 0, .52), "trim", n=8, rings=5))
    return P


@piece(R, "cupcake_tower", tags=["food", "tabletop", "decor", "hero"], col=None, mount="tabletop", hero=True, note="torre de cupcakes 3 andares com coracao (h 0.8)")
def cupcake_tower():
    P = [ck.lathe([(0, 0), (.12, 0), (.1, .03), (.03, .06), (.02, .6), (0, .62)], "trim", n=14, smooth=1)]
    levels = [(.3, .06, 8, "accent2", "white"), (.22, .27, 6, "white", "accent"), (.14, .46, 4, "soft", "accent2")]
    for (r, z, n, cm, fm) in levels:
        P.append(ck.cyl(r + .03, .018, (0, 0, z), "white", n=26, bevel=.005))
        P.append(ring(r + .03, .006, (0, 0, z + .01), "trim", n=26, minor=4))
        P += cupcakes([((r - .03) * cos(2 * pi * k / n), (r - .03) * sin(2 * pi * k / n), z + .01) for k in range(n)], cm, fm, "accent2", .9)
    P += cupcakes([(0, 0, .62)], "accent2", "white", "trim", 1.0)
    P.append(ck.heart(.12, .02, (0, 0, .78), "trim", bevel=.007, seg=2))
    return P


@piece(R, "macaron_plate", tags=["food", "tabletop"], col=None, mount="tabletop", note="prato com piramide de macarons pastel (h 0.2)")
def macaron_plate():
    P = [ck.lathe([(0, 0), (.08, 0), (.04, .03), (.2, .035), (.21, .05), (0, .05)], "white", n=24, smooth=1), ring(.21, .006, (0, 0, .05), "trim", n=24, minor=4)]
    items = []
    for L, (r, n, z) in enumerate(((.15, 8, .06), (.08, 4, .105))):
        for k in range(n):
            a = 2 * pi * k / n + L * .4
            items.append((r * cos(a), r * sin(a), z))
    items.append((0, 0, .15))
    P += macarons(items[:8], "accent2", "white", .9) + macarons(items[8:12], "soft", "white", .9) + macarons(items[12:], "base", "white", .9)
    return P


@piece(R, "coffee_set_tray", tags=["food", "tabletop"], col=None, mount="tabletop", note="bandeja com bule, 2 xicaras e acucareiro (0.5 m)")
def coffee_set():
    P = [rb((.5, .32, .02), (0, 0, .01), "trim", .008)]
    P.append(ck.lathe([(0, 0), (.07, 0), (.1, .06), (.1, .12), (.06, .17), (0, .18)], "white", (-.12, .02, .02), n=18, smooth=1))
    P.append(ck.lathe([(0, 0), (.03, 0), (.03, .02), (0, .02)], "accent2", (-.12, .02, .2), n=10))
    P.append(ck.sph(.02, (-.12, .02, .225), "trim", n=8, rings=4))
    P.append(ck.tube([Vector((-.04, .02, .13)), Vector((-.0, .02, .15)), Vector((-.01, .02, .06))], .01, "white", minor=5))
    P.append(ck.tube([Vector((-.2, .02, .16)), Vector((-.27, .02, .13)), Vector((-.21, .02, .09))], .01, "trim", minor=5))
    for sx in (.08, .2):
        P.append(ck.lathe([(0, 0), (.06, 0), (.065, .01), (0, .01)], "white", (sx, -.06, .02), n=14))
        P.append(ck.lathe([(0, 0), (.025, 0), (.04, .06), (.036, .06), (0, .0)], "accent2", (sx, -.06, .03), n=12))
        P.append(ck.lathe([(0, 0), (.034, 0), (.034, .002), (0, .002)], "deep", (sx, -.06, .088), n=10))
    P.append(ck.lathe([(0, 0), (.04, 0), (.05, .04), (.03, .07), (0, .07)], "white", (.15, .08, .02), n=12))
    return P


@piece(R, "pendant_lamp_cafe", tags=["light", "ceiling"], col=None, mount="ceiling", lights=[dict(pos=(0, 0, -1.1), color="#ffe0b8", range=4, intensity=0.9)],
       note="luminaria pendente com cupula morango canelada (pende 1.1 m, diametro 0.5)")
def pendant():
    P = [ck.cyl(.05, .03, (0, 0, -.015), "trim", n=10), ck.tube([Vector((0, 0, -.03)), Vector((0, 0, -.82))], .007, "trim", minor=4)]
    P.append(ck.lathe([(0, -.82), (.05, -.83), (.06, -.86), (.2, -.98), (.25, -1.06), (.25, -1.08), (.0, -1.08)], "accent2", n=28, flute=(14, .05), smooth=1))
    P.append(ring(.25, .01, (0, 0, -1.08), "trim", n=28, minor=5))
    P.append(ck.sph((.16, .16, .2), (0, 0, -1.04), "glow", n=10, rings=5))
    P.append(ck.sph((.08, .08, .06), (0, 0, -.83), "trim", n=8, rings=4))
    return P


@piece(R, "stool_bar_rose", tags=["seat", "stool"], col="cyl", mount="floor", sit=[dict(id="sit", pos=(0, 0, .69), face=(0, -1))],
       note="banqueta de bar giratoria morango/rose gold (assento 0.68)")
def stool_bar():
    P = [ck.cyl(.19, .09, (0, 0, .64), "fabric", n=22, bevel=.035), ring(.19, .009, (0, 0, .6), "trim", n=22, minor=4)]
    P.append(ck.sph((.36, .36, .08), (0, 0, .68), "fabric", n=18, rings=5))
    P.append(ck.lathe([(0, 0), (.2, 0), (.2, .02), (.04, .05), (.03, .55), (.07, .6), (0, .6)], "trim", n=18, smooth=1))
    P.append(ring(.14, .012, (0, 0, .22), "trim", n=22, minor=5))
    for k in range(3):
        a = k * 2 * pi / 3
        P.append(ck.tube([Vector((.03 * cos(a), .03 * sin(a), .22)), Vector((.14 * cos(a), .14 * sin(a), .22))], .008, "trim", minor=4))
    return P


@piece(R, "back_bar_shelves", tags=["shelf", "storage", "counter"], col="box", mount="floor", note="bancada de fundo 2.4 m com espelho, prateleiras de vidro, xicaras e potes (h 2.5)")
def back_bar():
    w, d = 2.4, .5
    P = [rb((w, d, .86), (0, 0, .43), "base", .04), rb((w + .06, d + .04, .05), (0, 0, .89), "white", .02)]
    for i in range(12):
        P.append(ck.cyl(.045, .78, (-1.1 + i * .2, -d / 2, .45), "accent", n=8))
    for sx in (-1, 1):
        P.append(rb((.06, .3, 1.5), (sx * (w / 2 - .03), .08, 1.67), "trim", .02))
    P.append(rb((w - .1, .03, 1.45), (0, d / 2 - .05, 1.67), "mirror", .008))
    P.append(rb((w, .08, .1), (0, .08, 2.45), "trim", .03))
    P.append(cloud([(-1.1 + i * .2, -.03, 2.38, (.2, .1, .12)) for i in range(12)], "accent2", 8, 4))
    for z in (1.4, 1.85):
        P.append(rb((w - .15, .26, .03), (0, .06, z), "glass", .008))
        P.append(ck.tube([Vector((-w / 2 + .1, -.07, z + .02)), Vector((w / 2 - .1, -.07, z + .02))], .008, "glow", minor=4))
    for i in range(10):
        P.append(ck.lathe([(0, 0), (.035, 0), (.045, .06), (0, .06)], "white", (-1.0 + i * .22, .06, 1.415), n=10))
    for i in range(6):
        x = -.95 + i * .38
        P.append(ck.lathe([(0, 0), (.06, 0), (.065, .13), (.04, .16), (0, .16)], "glass" if i % 2 else "accent2", (x, .06, 1.865), n=12))
        P.append(ck.sph(.03, (x, .06, 2.05), "trim", n=8, rings=4))
    return P


@piece(R, "vase_roses", tags=["decor", "tabletop", "plant"], col=None, mount="tabletop", note="vaso de vidro com rosas morango (0.35 m)")
def vase_roses():
    P = [ck.lathe([(0, 0), (.04, 0), (.06, .05), (.045, .12), (.05, .16), (0, .16)], "glass", n=14, smooth=1)]
    for k in range(5):
        a = 2 * pi * k / 5
        px, py = .035 * cos(a), .035 * sin(a)
        P.append(ck.tube([Vector((0, 0, .06)), Vector((px * .8, py * .8, .17)), Vector((px * 2, py * 2, .25))], .004, "leaf", minor=4))
        P.append(ck.sph((.06, .06, .05), (px * 2, py * 2, .26), "accent2" if k % 2 else "accent", n=8, rings=5))
    P.append(ck.sph((.06, .06, .05), (0, 0, .28), "accent2", n=8, rings=5))
    P.append(ck.tube([Vector((0, 0, .06)), Vector((0, 0, .28))], .004, "leaf", minor=4))
    return P


@piece(R, "sign_neon_cup", tags=["wall", "sign", "light"], col=None, mount="wall", lights=[dict(pos=(0, -.2, 2.2), color="#ff6f91", range=3, intensity=0.6)],
       note="letreiro neon de xicara com vapor e coracao, z 1.75 a 2.45")
def sign_neon():
    z = 2.1
    P = [rb((.9, .03, .7), (0, .015, z + .05), "deep", .012)]
    cup = arc2(0, 0, .14, pi, 2 * pi, 14, .16)
    P.append(neon([(-.14, .16)] + cup[1:] + [(.14, .16), (-.14, .16)], (0, 0, z - .22), "glow2", .012, y=-.03))
    P.append(neon(arc2(.18, .07, .07, -pi / 2, pi / 2, 8), (0, 0, z - .22), "glow2", .01, y=-.03))
    P.append(neon([(-.03, 0), (.03, .05), (-.03, .1), (.0, .15)], (0, 0, z + .0), "glow", .009, y=-.03))
    P.append(neon([(.06, 0), (.1, .05), (.06, .1), (.09, .15)], (0, 0, z + .0), "glow", .009, y=-.03))
    P.append(neon([(p[0] * .5, p[1] * .5) for p in heart_outline(.5, 40)], (.0, 0, z + .25), "glow2", .01, closed=True, y=-.03))
    return P


CAM = ((2.8, -5.0, 1.6), (0.2, 1.2, 1.1), 24)


def VIG(put):
    for x in range(-4, 6, 2):
        for y in range(-4, 5, 2):
            put("floor_checker_small", x, y)
    for x in (-2.0, 0.0, 2.0, 4.0):
        put("shared/wall_panel", x, 4.0)
    for y in (-3, -1, 1, 3):
        put("shared/wall_panel", -3.0, y, rz=pi / 2)
    put("back_bar_shelves", 0.9, 3.7)
    put("sign_neon_cup", -1.4, 4.0)
    put("menu_board", 3.2, 4.0)
    put("counter_service", 1.2, 1.7)
    put("display_case_pastry", -1.1, 1.7)
    put("register_retro", 2.0, 1.7, z=.96)
    put("espresso_machine", 1.2, 1.9, z=.96, rz=pi)
    put("cupcake_tower", .3, 1.7, z=.96)
    for x in (.3, 1.2, 2.1):
        put("pendant_lamp_cafe", x, 1.0, z=3.2)
    for x in (.5, 1.2, 1.9):
        put("stool_bar_rose", x, .85)
    put("bistro_table_round", -1.8, -.6)
    put("chair_bistro_curvy", -1.8, -1.25)
    put("chair_bistro_curvy", -2.45, -.6, rz=-pi / 2)
    put("chair_bistro_curvy", -1.15, -.6, rz=pi / 2)
    put("cake_stand_dome", -1.8, -.6, z=.76)
    put("bistro_table_round", 0.6, -1.8)
    put("chair_bistro_curvy", 0.6, -2.45)
    put("chair_bistro_curvy", 0.0, -1.8, rz=-pi / 2)
    put("coffee_set_tray", .6, -1.8, z=.76)
    put("shared/plant_potted", -2.6, 3.4)

"""Pecas extras e retrabalhos dos interiores jogaveis (paletas de mundo real). Registradas por sala em REG.
Convencoes iguais a lib.py: Blender Z-up, frente = -Y, origem no centro da base; pecas de parede: plano em y=0, corpo y>=0;
pecas de teto: origem no ponto de fixacao, pendem em -Z."""
from lib import *
from lib2 import *


# ---------------------------------------------------------------- helpers
def front(P):
    """espelha em Y: pecas de parede modeladas com a frente em +Y passam a projetar-se para -Y (frente do kit)."""
    from mathutils import Matrix
    m = Matrix.Scale(-1, 4, Vector((0, 1, 0)))
    for ob in P:
        if ob is not None:
            ob.data.transform(m)
            ob.data.flip_normals()
    return P


def jar(x, y, z, r, h, mat="glass", fill="deep", lid="trim"):
    return [ck.cyl(r, h, (x, y, z + h / 2), mat, n=12), ck.cyl(r * .86, h * .66, (x, y, z + h * .35), fill, n=10),
            ck.cyl(r * 1.04, h * .1, (x, y, z + h + h * .04), lid, n=12)]


def bottle(x, y, z, r, h, mat, cap="trim"):
    P = [ck.lathe([(0, 0), (r, 0), (r * 1.02, h * .55), (r * .5, h * .78), (r * .32, h * .88), (r * .32, h), (0, h)], mat, (x, y, z), n=10)]
    P.append(ck.cyl(r * .36, h * .12, (x, y, z + h * 1.04), cap, n=8))
    return P


def bag_sack(x, y, z, w, h, d, mat, lab="white"):
    return [pillow((w, d, h), (x, y, z + h / 2), mat, k=.3, seg=3), rb((w * .55, .008, h * .38), (x, y - d / 2 - .002, z + h * .55), lab, .003, seg=1)]


# ================================================================ SHARED
@piece("shared", "wall_panel_light", tags=["wall"], col="box", mount="wall", budget=1500,
       note="parede leve 2 m x 3.2 m (<1.5k tris): lambri raso + rodape, sem molduras pesadas")
def wall_panel_light():
    w = 2.0
    P = [wall_body(w)]
    P.append(rb((w, .03, .98), (0, -.012, .56), "accent", .008, seg=2))
    P.append(rb((w, .05, .06), (0, -.025, 1.07), "trim", .015, seg=2))
    P.append(rb((w, .04, .13), (0, -.015, .065), "deep", .01, seg=2))
    for i in range(3):
        P.append(rb((.5, .012, .6), (-.62 + i * .62, -.03, .56), "soft", .006, seg=1))
    return P


@piece("shared", "rug_rect", tags=["rug", "decor"], col=None, walk=True, mount="floor", budget=1200, note="tapete retangular 2.4 x 1.6 com borda")
def rug_rect():
    return [rb((2.4, 1.6, .02), (0, 0, .01), "soft", .006, seg=1), rb((2.2, 1.4, .006), (0, 0, .022), "accent", .003, seg=1),
            rb((1.9, 1.1, .006), (0, 0, .027), "base", .003, seg=1)]


@piece("shared", "floor_lamp_arc", tags=["light", "decor"], col="cyl", mount="floor", budget=1800,
       lights=[dict(pos=(.5, 0, 2.0), color="#ffe3b8", range=4, intensity=0.8)], note="luminaria de piso em arco com cupula de tecido")
def floor_lamp_arc():
    P = [ck.cyl(.2, .05, (0, 0, .025), "deep", n=20, bevel=.01), ck.cyl(.02, 1.6, (0, 0, .85), "trim", n=8)]
    pts = [Vector((0, 0, 1.6))] + [Vector((.55 * sin(t * pi / 2.1), 0, 1.6 + .35 * sin(t * pi * .75) - .16 * t * t)) for t in [i / 8 for i in range(1, 9)]]
    P.append(ck.tube(pts, .014, "trim", minor=6))
    P.append(ck.lathe([(.04, 0), (.2, 0), (.15, .26), (.06, .28)], "white", (pts[-1].x, 0, pts[-1].z - .26), n=20))
    P.append(ck.sph(.07, (pts[-1].x, 0, pts[-1].z - .18), "glow", n=8, rings=5))
    return P


# ================================================================ CAFE
@piece("cafe", "coffee_bag_shelf", tags=["shelf", "wall", "decor"], col=None, mount="wall", budget=3200,
       note="estante de parede 1.6 m com sacas de cafe e potes de graos (alt. 1.0-2.0 m)")
def coffee_bag_shelf():
    w = 1.6
    P = [rb((w, .05, .05), (0, .02, 1.0), "soft", .01)]
    for z in (1.0, 1.42, 1.84):
        P.append(rb((w, .26, .035), (0, .15, z), "deep", .01))
        for sx in (-1, 1):
            P.append(rb((.03, .22, .3), (sx * (w / 2 - .03), .13, z + .15), "soft", .006, seg=1)) if False else None
    for i, x in enumerate((-.55, -.2, .15, .5)):
        P += bag_sack(x, .13, 1.0175, .26, .34, .16, ("accent2", "soft", "base", "accent2")[i])
    for i, x in enumerate((-.5, -.12, .26, .62)):
        P += jar(x, .14, 1.4375, .07, .2, "glass", "deep")
    P.append(rb((.5, .1, .02), (-.35, .09, 1.87), "white", .005, seg=1))
    for x in (-.5, -.28, -.06, .16, .38, .6):
        P.append(ck.cyl(.045, .13, (x, .12, 1.86 + .065), ("accent", "base", "soft")[int(x * 10) % 3], n=10))
    P.append(ck.sph(.05, (.7, .12, 1.9), "leaf", n=8, rings=5))
    P.append(rb((w * .96, .01, .04), (0, .27, 1.62), "glow", .004, seg=1))
    return front(P)


@piece("cafe", "chalkboard_aframe", tags=["sign", "decor"], col="box", mount="floor", budget=1800, note="cavalete de giz 0.6 x 1.05 m com cardapio do dia")
def chalkboard():
    P = []
    for sy in (-1, 1):
        rot = (sy * -.2, 0, 0)
        P.append(rb((.62, .03, 1.1), (0, sy * .16, .55), "soft", .01, rot=rot))
        P.append(rb((.52, .012, .96), (0, sy * .16 + sy * .02, .56), "deep", .004, rot=rot, seg=1))
    # giz
    for i, w in enumerate((.3, .22, .36, .18, .28)):
        P.append(rb((w, .004, .014), (-.05 + i * .01, -.19, .85 - i * .1), "white", .002, rot=(.2, 0, 0), seg=1))
    P.append(ck.heart(.09, .006, (0, -.2, .93), "accent2", rot=(.2, 0, 0), bevel=.002, seg=1))
    P.append(rb((.64, .06, .02), (0, 0, .08), "soft", .006, seg=1))
    return P


@piece("cafe", "croissant_basket", tags=["food", "decor", "tabletop"], col=None, mount="tabletop", budget=2400, note="cesta de vime com croissants (0.38 m)")
def croissant_basket():
    P = [ck.lathe([(0, 0), (.13, 0), (.17, .08), (.19, .12), (.17, .12), (0, .06)], "deep", n=18, smooth=1)]
    P.append(ck.tube(circle_pts(.185, 24, .115), .008, "soft", minor=6, closed=True))
    for k, a in enumerate((0, 1.3, 2.6, 3.9, 5.1)):
        cx, cy = .07 * cos(a), .07 * sin(a)
        pts = [Vector((cx + .06 * cos(a + t) * 0 + .08 * sin(t) * cos(a + 1.57), cy + .08 * sin(t) * sin(a + 1.57), .1 + .02 * cos(t * 1.4))) for t in [-1.0 + i * .25 for i in range(9)]]
        P.append(ck.tube(pts, [.012 + .028 * (1 - abs(p.x - cx) * 0 - abs(i - 4) / 5.0) for i, p in enumerate(pts)] if False else .03, "soft", minor=6))
    return P


@piece("cafe", "hanging_planter", tags=["plant", "decor"], col=None, mount="ceiling", budget=2600, note="vaso suspenso com hera pendente (pende 1.2 m)")
def hanging_planter():
    P = [ck.lathe([(0, -.2), (.1, -.2), (.16, -.12), (.17, -.04), (0, -.04)], "white", (0, 0, -.6), n=16, smooth=1)]
    for k in range(3):
        a = 2 * pi * k / 3
        P.append(ck.tube([Vector((0, 0, 0)), Vector((.1 * cos(a), .1 * sin(a), -.35)), Vector((.16 * cos(a), .16 * sin(a), -.6))], .004, "trim", minor=4))
    P.append(ck.cyl(.04, .03, (0, 0, -.015), "trim", n=8))
    import random
    rnd = random.Random(5)
    items = []
    for k in range(7):
        a = 2 * pi * k / 7 + rnd.random() * .6
        ln = .3 + rnd.random() * .55
        pts = [Vector(((.1 + .05 * t) * cos(a) + .03 * sin(t * 5 + k), (.1 + .05 * t) * sin(a) + .03 * cos(t * 4 + k), -.62 - ln * t)) for t in [i / 6 for i in range(7)]]
        P.append(ck.tube(pts, .005, "leaf", minor=4))
        for i in range(1, 7):
            items.append((pts[i].x, pts[i].y, pts[i].z, (.07, .045, .028)))
    P.append(cloud(items, "leaf", 7, 4))
    return P


# ================================================================ SALAO
@piece("salao", "product_wall", tags=["wall", "shelf", "decor"], col=None, mount="wall", budget=3600, note="parede de produtos de cabelo 2.0 m, 3 niveis com frascos e iluminacao")
def product_wall():
    w = 2.0
    P = [rb((w + .06, .06, 1.5), (0, .03, 1.5), "deep", .015)]
    mats = ("white", "accent2", "accent", "glass", "soft")
    for r, z in enumerate((.95, 1.4, 1.85)):
        P.append(rb((w, .24, .03), (0, .12, z), "white", .008))
        P.append(rb((w - .06, .01, .03), (0, .015, z + .12), "glow", .004, seg=1))
        for i in range(10):
            x = -w / 2 + .14 + i * (w - .28) / 9
            h = .17 + .05 * ((i * 7 + r * 3) % 4)
            P += bottle(x, .12, z + .015, .028 + .004 * (i % 3), h, mats[(i + r) % 5], "trim")
    return front(P)


@piece("salao", "robe_stand", tags=["decor", "textile"], col="cyl", mount="floor", budget=3200, note="cabide de pe com dois roupoes macios (alt. 1.7 m)")
def robe_stand():
    P = [ck.cyl(.22, .04, (0, 0, .02), "deep", n=18, bevel=.01), ck.cyl(.018, 1.7, (0, 0, .87), "trim", n=8)]
    for sx in (-1, 1):
        P.append(ck.tube([Vector((0, 0, 1.62)), Vector((sx * .12, 0, 1.7)), Vector((sx * .2, 0, 1.64))], .012, "trim", minor=5))
        P.append(ck.sph(.03, (sx * .2, 0, 1.64), "trim", n=6, rings=4))
        x0 = sx * .2
        body = ck.lathe([(0, -1.15), (.2, -1.15), (.2, -.7), (.14, -.15), (.06, -.02), (0, 0)], "white" if sx < 0 else "accent", (x0, 0, 1.6), n=14, smooth=1)
        for v in body.data.vertices:
            v.co.y = (v.co.y) * .42
        P.append(body)
        P.append(rb((.37, .13, .045), (x0, -.01, 1.02), "soft", .02, seg=1))
        P.append(ck.tube([Vector((x0 - .02, -.07, 1.74)), Vector((x0, -.08, 1.2)), Vector((x0 + .0, -.075, 1.0))], .018, "soft", minor=6))
        for sd in (-1, 1):
            P.append(ck.tube([Vector((x0 + sd * .12, -.01, 1.5)), Vector((x0 + sd * .24, -.02, 1.2)), Vector((x0 + sd * .25, -.02, 1.0))], .04, "white" if sx < 0 else "accent", minor=7))
    return P


@piece("salao", "towel_stack", tags=["decor", "tabletop"], col=None, mount="tabletop", budget=1400, note="pilha de toalhas dobradas (0.35 m)")
def towel_stack():
    P = []
    for i, m in enumerate(("white", "accent", "white", "soft")):
        P.append(pillow((.34, .22, .06), (0, 0, .03 + i * .058), m, k=.3, seg=3))
    P.append(ck.sph(.05, (.06, -.02, .3), "leaf", n=8, rings=5))
    return P


@piece("salao", "nail_polish_rack", tags=["wall", "shelf", "decor"], col=None, mount="wall", budget=2400, note="expositor de esmaltes 1.0 m (3 fileiras)")
def nail_polish_rack():
    w = 1.0
    P = [rb((w + .04, .035, .62), (0, .02, 1.45), "deep", .01)]
    cols = ("accent2", "soft", "white", "accent", "fabric", "glass")
    for r, z in enumerate((1.25, 1.45, 1.65)):
        P.append(rb((w, .1, .02), (0, .08, z - .08), "trim", .006, seg=1))
        for i in range(9):
            x = -w / 2 + .07 + i * (w - .14) / 8
            P += bottle(x, .08, z - .07, .018, .07, cols[(i + r) % 6], "deep")
    return front(P)


@piece("salao", "sign_scissors_neon", tags=["wall", "sign", "light"], col=None, mount="wall", budget=2400,
       lights=[dict(pos=(0, -.2, 2.3), color="#ffeccf", range=3, intensity=0.5)],
       note="letreiro elegante: aro de latao com tesoura em fio de luz quente (substitui o neon rosa)")
def sign_scissors():
    z = 2.2
    P = [ck.cyl(.34, .03, (0, .015, z), "deep", rot=(pi / 2, 0, 0), n=40, bevel=.006)]
    P.append(ck.tube([Vector((.34 * cos(a), -.015, z + .34 * sin(a))) for a in [i * 2 * pi / 48 for i in range(48)]], .011, "trim", minor=6, closed=True))
    for sx in (-1, 1):
        P.append(ck.tube([Vector((sx * .015, -.03, z - .02)), Vector((sx * .13, -.03, z + .19))], .008, "glow", minor=5))
        P.append(ck.tube([Vector((sx * .13 + .08 * cos(a), -.03, z - .17 + .075 * sin(a))) for a in [i * 2 * pi / 16 for i in range(16)]], .008, "glow", minor=5, closed=True))
    P.append(ck.sph(.02, (0, -.03, z - .02), "trim", n=8, rings=5))
    return P


# ================================================================ BOUTIQUE
@piece("boutique", "bag_shelf_wall", tags=["wall", "shelf", "decor"], col=None, mount="wall", budget=4200, note="parede de bolsas 1.8 m com 6 nichos iluminados")
def bag_shelf_wall():
    w = 1.8
    P = [rb((w, .05, 1.5), (0, .03, 1.6), "accent", .01)]
    for r in range(2):
        z0 = 1.0 + r * .75
        for c in range(3):
            x = -.58 + c * .58
            P += frame(.5, .66, .02, (x, .11, z0 + .38), "trim", d=.22, r=.006)
            P.append(rb((.46, .012, .62), (x, .06, z0 + .38), "base", .004, seg=1))
            P.append(rb((.46, .2, .015), (x, .13, z0 + .08), "white", .004, seg=1))
            m = ("accent", "accent2", "white", "soft", "fabric", "deep")[(r * 3 + c) % 6]
            P.append(rb((.28, .1, .2), (x, .14, z0 + .2), m, .03, seg=3))
            P.append(ck.tube([Vector((x - .08, .14, z0 + .3)), Vector((x - .08, .14, z0 + .4)), Vector((x + .08, .14, z0 + .4)), Vector((x + .08, .14, z0 + .3))], .007, "trim", minor=5))
            P.append(rb((.46, .01, .02), (x, .115, z0 + .7), "glow", .003, seg=1))
    return front(P)


@piece("boutique", "perfume_counter", tags=["counter", "decor"], col="box", mount="floor", budget=5200,
       use=[dict(id="browse", pos=(0, -.8, 0), face=(0, 1), label="Ver perfumes")], note="balcao de perfumaria 1.5 m com tampo de vidro e frascos")
def perfume_counter():
    w, d = 1.5, .62
    P = [rb((w, d, .92), (0, 0, .46), "accent", .03), rb((w + .06, d + .04, .04), (0, 0, .95), "trim", .012)]
    P.append(rb((w - .04, d - .04, .02), (0, 0, .985), "glass", .005, seg=1))
    for i in range(5):
        x = -w / 2 + .17 + i * (w - .34) / 4
        P.append(rb((.015, .015, .2), (x, -d / 2 + .02, .45), "trim", .004, seg=1)) if False else None
    for i, x in enumerate((-.52, -.26, 0, .26, .52)):
        m = ("glass", "soft", "accent2", "white", "fabric")[i]
        h = .13 + .03 * (i % 3)
        P += bottle(x, 0, 1.0, .042, h, m, "trim")
    P.append(rb((.5, .12, .02), (.2, -.1, 1.0), "deep", .004, seg=1))
    P.append(rb((.02, d - .1, .65), (-w / 2 + .02, 0, .45), "glow", .004, seg=1))
    P.append(ck.cyl(.12, .015, (-.3, .12, 1.0), "trim", n=16))
    return P


@piece("boutique", "scarf_carousel", tags=["rack", "decor"], col="cyl", mount="floor", budget=3800,
       use=[dict(id="browse", pos=(0, -.8, 0), face=(0, 1), label="Ver lencos")], note="giratorio de acessorios com lencos e cintos, 1.6 m")
def scarf_carousel():
    P = [ck.cyl(.28, .05, (0, 0, .025), "deep", n=22, bevel=.01), ck.cyl(.02, 1.6, (0, 0, .85), "trim", n=8)]
    for r, z in enumerate((.55, 1.0, 1.45)):
        P.append(ck.tube(circle_pts(.3 - r * .04, 28, z), .008, "trim", minor=5, closed=True))
        n = 8
        for k in range(n):
            a = 2 * pi * k / n
            rr = .3 - r * .04
            m = ("accent2", "white", "soft", "accent", "fabric")[(k + r) % 5]
            P.append(rb((.1, .016, .34 - r * .04), (rr * cos(a), rr * sin(a), z - .17), m, .008, rot=(0, 0, a + pi / 2), seg=2))
    P.append(ck.sph(.05, (0, 0, 1.64), "trim", n=8, rings=5))
    return P


@piece("boutique", "sunglasses_stand", tags=["decor", "tabletop"], col=None, mount="tabletop", budget=1800, note="expositor giratorio de oculos de sol (0.45 m)")
def sunglasses_stand():
    P = [ck.cyl(.08, .02, (0, 0, .01), "deep", n=14), ck.cyl(.012, .4, (0, 0, .2), "trim", n=6)]
    for k in range(6):
        a = k * pi / 3
        P.append(ck.cyl(.034, .006, (.1 * cos(a), .1 * sin(a), .3 + .02 * (k % 2)), "deep", rot=(pi / 2, 0, a + pi / 2), n=12))
        P.append(ck.cyl(.034, .006, (.1 * cos(a) + .075 * -sin(a), .1 * sin(a) + .075 * cos(a), .3 + .02 * (k % 2)), "deep", rot=(pi / 2, 0, a + pi / 2), n=12))
    return P


# ================================================================ JOALHERIA
@piece("joalheria", "diamond_island", tags=["display", "hero"], col="box", hero=True, mount="floor", budget=9000,
       use=[dict(id="browse", pos=(0, -1.1, 0), face=(0, 1), label="Ver diamantes")],
       lights=[dict(pos=(0, 0, 1.35), color="#ffeccf", range=3, intensity=0.7)],
       note="ilha de vitrine octogonal 1.4 m com almofadas de veludo bordo e diamantes lapidados")
def diamond_island():
    P = [ck.lathe([(0, 0), (.72, 0), (.72, .72), (.68, .74), (0, .74)], "base", n=8, rot=(0, 0, pi / 8)) if False else ck.cyl(.72, .74, (0, 0, .37), "base", n=8, bevel=.02)]
    P.append(ck.cyl(.76, .05, (0, 0, .78), "trim", n=8, bevel=.012))
    P.append(ck.cyl(.66, .04, (0, 0, .03), "trim", n=8))
    P.append(ck.cyl(.7, .01, (0, 0, .82), "glow", n=8))
    P.append(ck.cyl(.68, .02, (0, 0, .84), "fabric", n=8, bevel=.005))
    for k in range(6):
        a = 2 * pi * k / 6
        x, y = .38 * cos(a), .38 * sin(a)
        P.append(ck.lathe([(0, 0), (.1, 0), (.09, .06), (0, .08)], "fabric", (x, y, .85), n=12))
        P.append(ck.lathe([(0, 0), (.04, .018), (.035, .04), (.015, .06), (0, .06)], "glass", (x, y, .93), n=8))
    P.append(ck.lathe([(0, 0), (.1, .03), (.09, .07), (.04, .13), (0, .13)], "glass", (0, 0, .87), n=10))
    # tampo de vidro
    P.append(ck.cyl(.69, .012, (0, 0, 1.2), "glass", n=8))
    for k in range(8):
        a = 2 * pi * (k + .5) / 8
        P.append(ck.cyl(.012, .36, (.69 * cos(a), .69 * sin(a), 1.02), "trim", n=6))
    P.append(ck.tube([Vector((.72 * cos(2 * pi * k / 8 + pi / 8), .72 * sin(2 * pi * k / 8 + pi / 8), 1.215)) for k in range(8)], .016, "trim", minor=6, closed=True))
    return P


@piece("joalheria", "necklace_velvet_wall", tags=["wall", "display"], col=None, mount="wall", budget=4000,
       lights=[dict(pos=(0, -.2, 1.8), color="#ffeccf", range=2, intensity=0.5)], note="painel de veludo bordo 1.2 m com 3 colares expostos")
def necklace_velvet_wall():
    P = [rb((1.2, .05, 1.1), (0, .025, 1.7), "fabric", .01)]
    P += frame(1.26, 1.16, .03, (0, .03, 1.7), "trim", d=.06, r=.01)
    for k, x in enumerate((-.38, 0, .38)):
        P.append(ck.cyl(.007, .01, (x, -.01, 2.1), "trim", rot=(pi / 2, 0, 0), n=6))
        pts = [Vector((x + .13 * sin(t), -.012, 2.1 - .26 * (1 - cos(t)) * .9)) for t in [-1.3 + i * .26 for i in range(11)]]
        P.append(ck.tube(pts, .004, "trim", minor=4))
        P.append(ck.lathe([(0, 0), (.035, .02), (.03, .045), (.012, .07), (0, .07)], "glass", (x, -.024, pts[5].z - .09), rot=(pi / 2, 0, 0), n=8))
        for i in range(1, 10, 2):
            P.append(ck.sph(.012, (pts[i].x, -.015, pts[i].z), "glass", n=6, rings=4))
    P.append(rb((.9, .012, .018), (0, -.002, 1.22), "glow", .003, seg=1))
    return P


@piece("joalheria", "appraisal_desk", tags=["desk", "decor"], col="box", mount="floor", budget=4800,
       use=[dict(id="appraise", pos=(0, -.9, 0), face=(0, 1), label="Avaliar uma joia")], note="mesa de avaliacao 1.3 m com lupa, luminaria e balanca")
def appraisal_desk():
    w, d = 1.3, .65
    P = [rb((w, d, .05), (0, 0, .76), "base", .02), rb((w - .02, d - .02, .012), (0, 0, .79), "fabric", .004, seg=1)]
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(ck.cyl(.026, .74, (sx * (w / 2 - .06), sy * (d / 2 - .06), .37), "trim", n=8))
    P.append(rb((w - .2, .03, .12), (0, d / 2 - .06, .66), "base", .01))
    P.append(ck.cyl(.1, .015, (.4, .1, .8), "trim", n=16))
    P.append(ck.tube([Vector((.4, .1, .81)), Vector((.4, .1, .32 + .5)), Vector((.25, .0, .98)), Vector((.12, -.1, .94))], .01, "trim", minor=5))
    P.append(ck.lathe([(.01, 0), (.07, 0), (.05, .08), (.01, .1)], "white", (.12, -.1, .86), n=14))
    P.append(ck.sph(.04, (.12, -.1, .88), "glow", n=8, rings=5))
    P.append(ck.cyl(.045, .01, (-.4, 0, .805), "trim", rot=(pi / 2, 0, 0), n=14))
    P.append(ck.tube([Vector((-.4, .04, .806)), Vector((-.4, .12, .88))], .006, "trim", minor=4))
    P.append(ck.sph(.03, (-.1, -.1, .82), "glass", n=8, rings=5))
    P.append(rb((.25, .18, .015), (-.2, .05, .8), "deep", .004, seg=1))
    return P


@piece("joalheria", "gift_box_stack", tags=["decor", "tabletop"], col=None, mount="tabletop", budget=2000, note="pilha de caixas de presente bordo e champanhe (0.3 m)")
def gift_box_stack():
    P = []
    for i, (w, h, m) in enumerate(((.3, .1, "fabric"), (.24, .09, "white"), (.17, .08, "deep"))):
        z = sum((.1, .09, .08)[:i])
        P.append(rb((w, w * .8, h), (0, 0, z + h / 2), m, .01, seg=2))
        P.append(rb((.02, w * .8 + .004, h + .004), (0, 0, z + h / 2), "trim", .004, seg=1))
    P.append(ck.sph((.07, .02, .035), (.03, 0, .3), "trim", n=8, rings=5))
    P.append(ck.sph((.07, .02, .035), (-.03, 0, .3), "trim", n=8, rings=5))
    return P


# ================================================================ ESTUDIO
@piece("estudio", "screen_changing_folding", tags=["screen", "fitting"], col="box", mount="floor", budget=3600,
       use=[dict(id="change", pos=(0, -.9, 0), face=(0, 1), label="Trocar de roupa")],
       note="biombo de 3 paineis em zigue-zague com moldura de madeira e tecido linho (1.8 x 1.75)")
def screen():
    pw = .6
    angs = (.36, -.36, .36)
    # corrente articulada: a ponta de um painel e a dobradica do proximo (zigue-zague)
    c = []
    x, y = 0.0, 0.0
    for k in range(3):
        d = (cos(angs[k]), sin(angs[k]))
        c.append((x + d[0] * pw / 2, y + d[1] * pw / 2))
        x, y = x + d[0] * pw, y + d[1] * pw
    cx0 = (c[0][0] + c[2][0]) / 2
    cy0 = (c[0][1] + c[2][1]) / 2
    P = []
    for k in range(3):
        a = angs[k]
        px, py = c[k][0] - cx0, c[k][1] - cy0
        rot = (0, 0, a)
        P.append(rb((pw, .026, 1.42), (px, py, .98), "fabric", .01, rot=rot, seg=2))
        for sz in (.26, 1.72):
            P.append(rb((pw + .02, .045, .06), (px, py, sz), "accent2", .014, rot=rot, seg=2))
        for sx in (-1, 1):
            ox = sx * (pw / 2)
            P.append(rb((.05, .045, 1.52), (px + ox * cos(a), py + ox * sin(a), .99), "accent2", .014, rot=rot, seg=2))
        P.append(rb((pw - .08, .03, .028), (px, py, 1.0), "soft", .008, rot=rot, seg=1))
        P.append(ck.cyl(.03, .035, (px + (pw / 2) * cos(a) * (-1 if k % 2 else 1), py + (pw / 2) * sin(a) * (-1 if k % 2 else 1), .018), "trim", n=8))
    return P


@piece("estudio", "costume_rack", tags=["rack", "wardrobe"], col="box", mount="floor", budget=4600,
       use=[dict(id="browse", pos=(0, -.8, 0), face=(0, 1), label="Ver figurinos")], note="arara de figurinos com rodinhas 1.5 m, 8 pecas em tons neutros")
def costume_rack():
    w = 1.5
    P = []
    for sx in (-1, 1):
        P.append(ck.tube([Vector((sx * w / 2, 0, .06)), Vector((sx * w / 2, 0, 1.7))], .018, "trim", minor=6))
        P.append(ck.tube([Vector((sx * w / 2, -.3, .05)), Vector((sx * w / 2, .3, .05))], .016, "trim", minor=6))
        for sy in (-1, 1):
            P.append(ck.cyl(.035, .03, (sx * w / 2, sy * .3, .03), "deep", rot=(0, pi / 2, 0), n=10))
    P.append(ck.tube([Vector((-w / 2, 0, 1.68)), Vector((w / 2, 0, 1.68))], .014, "trim", minor=6))
    P.append(ck.tube([Vector((-w / 2, 0, .35)), Vector((w / 2, 0, .35))], .012, "trim", minor=6))
    cols = ("accent", "base", "soft", "accent2", "fabric", "white", "deep", "accent")
    for i in range(8):
        x = -w / 2 + .12 + i * (w - .24) / 7
        P.append(dresses([(x, 0, 1.66, .85 + .12 * (i % 3), .2, 0)], cols[i]))
        P.append(ck.tube([Vector((x - .06, 0, 1.55)), Vector((x, 0, 1.68)), Vector((x + .06, 0, 1.55))], .004, "trim", minor=4))
    return P


@piece("estudio", "prop_trunk", tags=["prop", "decor"], col="box", mount="floor", budget=3000,
       sit=[dict(id="sit", pos=(0, 0, .5), face=(0, -1), label="Sentar no baú")], note="bau vintage 0.9 m com cantoneiras de latao, usado como banco de cenario")
def prop_trunk():
    w, d, h = .9, .48, .45
    P = [rb((w, d, h), (0, 0, h / 2 + .03), "accent2", .03), rb((w + .02, d + .02, .1), (0, 0, h + .02), "accent2", .04)]
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(ck.sph(.05, (sx * (w / 2), sy * (d / 2), .06), "trim", n=6, rings=4))
            P.append(ck.sph(.05, (sx * (w / 2), sy * (d / 2), h + .06), "trim", n=6, rings=4))
    for x in (-.28, .28):
        P.append(rb((.04, d + .03, h + .1), (x, 0, h / 2 + .06), "trim", .01, seg=1))
    P.append(rb((.1, .02, .1), (0, -d / 2 - .01, h * .8), "trim", .006, seg=1))
    for sx in (-1, 1):
        P.append(ck.cyl(.035, .03, (sx * (w / 2 - .06), 0, .015), "deep", n=8))
    return P


@piece("estudio", "pampas_vase", tags=["prop", "decor"], col="cyl", mount="floor", budget=3200, note="vaso alto de ceramica com capim-dos-pampas (1.5 m)")
def pampas_vase():
    P = [ck.lathe([(0, 0), (.1, 0), (.16, .12), (.19, .3), (.14, .55), (.08, .66), (.1, .7), (.07, .7), (0, .64)], "white", n=20, smooth=1)]
    import random
    rnd = random.Random(8)
    bm = bmesh.new()
    for k in range(34):
        a = rnd.random() * 2 * pi
        el = 1.05 + rnd.random() * .45
        ln = .6 + rnd.random() * .45
        pts = [Vector((.02 * cos(a) + t * ln * cos(el) * cos(a) * .55, .02 * sin(a) + t * ln * cos(el) * sin(a) * .55, .66 + t * ln * sin(el) - .15 * t * t)) for t in [i / 5 for i in range(6)]]
        P.append(ck.tube(pts, [.004 + .006 * (i / 5) for i in range(6)] if False else .006, "soft", minor=4)) if k < 10 else None
    for k in range(34):
        a = rnd.random() * 2 * pi
        el = .95 + rnd.random() * .5
        ln = .5 + rnd.random() * .5
        e = (.66 + ln * sin(el) * .9, ln * cos(el) * .5)
        merge(bm, ck.bm_sphere(.07, .07, .3, 6, 4), (e[1] * cos(a), e[1] * sin(a), e[0] + .08), (1, 1, 1))
    P.append(obj(bm, "white"))
    return P


@piece("estudio", "balloon_arch_light", tags=["prop", "decor"], col=None, mount="floor", budget=1800, note="arco de baloes leve (1.4k tris) em tons neutros, 2.4 x 2.2 m")
def balloon_arch_light():
    P = []
    cols = ("white", "soft", "accent2", "base")
    n = 26
    for i in range(n):
        a = pi * i / (n - 1)
        x = 1.15 * cos(a)
        z = .15 + 1.9 * sin(a)
        r = .15 + .05 * ((i * 5) % 3) / 2
        P.append(ck.sph((r * 2, r * 1.8, r * 2.1), (x, (i % 3 - 1) * .05, z), cols[i % 4], n=8, rings=5))
    P.append(ck.tube([Vector((1.15 * cos(pi * i / 24), 0, .15 + 1.9 * sin(pi * i / 24))) for i in range(25)], .01, "trim", minor=4))
    return P


@piece("estudio", "reflector_panel", tags=["light", "photo"], col="cyl", mount="floor", budget=1200,
       lights=[dict(pos=(0, -.3, 1.2), color="#fff4e6", range=4, intensity=0.5)], note="rebatedor branco 1.0 m em suporte")
def reflector_panel():
    P = [ck.cyl(.01, 1.6, (0, 0, .85), "trim", n=6), rb((.9, .03, 1.1), (0, 0, 1.15), "white", .01), rb((.94, .045, 1.14), (0, .0, 1.15), "deep", .01)]
    P[-1], P[-2] = P[-2], P[-1]
    for k in range(3):
        a = 2 * pi * k / 3 + .4
        P.append(ck.tube([Vector((0, 0, .5)), Vector((.4 * cos(a), .4 * sin(a), .02))], .012, "trim", minor=5))
    return P


# ================================================================ PALCO
@piece("palco", "vip_booth", tags=["seat", "lounge", "hero"], col="box", hero=True, mount="floor", budget=7000,
       sit=[dict(id="s1", pos=(-.6, .2, .48), face=(0, -1)), dict(id="s2", pos=(0, .2, .48), face=(0, -1)), dict(id="s3", pos=(.6, .2, .48), face=(0, -1))],
       lights=[dict(pos=(0, -.5, 1.6), color="#4ff0ff", range=3, intensity=0.7)], note="cabine VIP 2.6 m com sofa em U, mesa baixa e fita de LED")
def vip_booth():
    w = 2.6
    P = [pillow((w, .8, .42), (0, .3, .21), "fabric", k=.18, seg=3)]
    P.append(pillow((w, .26, .72), (0, .55, .72), "fabric", k=.25, seg=3))
    for sx in (-1, 1):
        P.append(pillow((.26, 1.1, .6), (sx * (w / 2 - .13), -.1, .42), "fabric", k=.25, seg=3))
    for i in range(7):
        x = -w / 2 + .35 + i * (w - .7) / 6
        P.append(ck.cyl(.035, .02, (x, .41, .78), "trim", rot=(pi / 2, 0, 0), n=8))
    P.append(rb((w - .1, .02, .035), (0, .42, .96), "glow2", .005, seg=1))
    P.append(rb((w - .4, .02, .03), (0, .17, .43), "glow", .004, seg=1))
    P.append(rb((.9, .5, .04), (0, -.55, .4), "deep", .015))
    P.append(rb((.84, .44, .012), (0, -.55, .425), "glass", .003, seg=1))
    for sx in (-1, 1):
        P.append(ck.cyl(.02, .38, (sx * .35, -.55, .19), "trim", n=8))
    P.append(rb((.8, .02, .02), (0, -.79, .41), "glow2", .003, seg=1))
    return P


@piece("palco", "champagne_bucket", tags=["decor", "tabletop"], col=None, mount="tabletop", budget=2200, note="balde de gelo cromado com garrafa e taças (0.4 m)")
def champagne_bucket():
    P = [ck.lathe([(0, 0), (.09, 0), (.12, .06), (.14, .22), (.12, .22), (0, .16)], "trim", n=18, smooth=1)]
    P += bottle(0, 0, .12, .04, .3, "deep", "trim")
    for sx in (-1, 1):
        P.append(ck.lathe([(0, 0), (.025, 0), (.004, .05), (.004, .09), (.03, .15), (.028, .16), (0, .1)], "glass", (sx * .22, -.04, 0), n=12))
    P.append(ck.sph(.03, (-.04, .04, .22), "white", n=6, rings=4))
    P.append(ck.sph(.03, (.05, 0, .22), "white", n=6, rings=4))
    return P


@piece("palco", "cocktail_table_high", tags=["table", "decor"], col="cyl", mount="floor", budget=2200,
       lights=[dict(pos=(0, 0, 1.0), color="#ff4fd0", range=2, intensity=0.5)], note="mesa alta de coquetel 0.7 m com aro neon")
def cocktail_table_high():
    P = [ck.cyl(.22, .03, (0, 0, .015), "deep", n=22, bevel=.008), ck.cyl(.035, 1.0, (0, 0, .52), "trim", n=10),
         ck.cyl(.36, .04, (0, 0, 1.04), "deep", n=28, bevel=.012), ck.tube(circle_pts(.36, 36, 1.045), .01, "glow", minor=5, closed=True),
         ck.tube(circle_pts(.2, 24, .08), .008, "glow2", minor=5, closed=True)]
    return P


@piece("palco", "led_column", tags=["light", "decor"], col="cyl", mount="floor", budget=2000,
       lights=[dict(pos=(0, 0, 1.6), color="#4ff0ff", range=4, intensity=0.8)], note="coluna de LED 2.6 m")
def led_column():
    P = [ck.cyl(.26, .08, (0, 0, .04), "deep", n=8, bevel=.01), ck.cyl(.2, 2.5, (0, 0, 1.33), "base", n=8, bevel=.01), ck.cyl(.24, .08, (0, 0, 2.62), "deep", n=8, bevel=.01)]
    for k in range(8):
        a = 2 * pi * (k + .5) / 8
        P.append(rb((.035, .035, 2.3), (.205 * cos(a), .205 * sin(a), 1.35), "glow2" if k % 2 else "glow", .008, rot=(0, 0, a), seg=1))
    return P


# ================================================================ CASA
@piece("casa", "vanity_mirror_wall", tags=["mirror", "wall", "hero"], col=None, hero=True, mount="wall", budget=6000,
       lights=[dict(pos=(0, -.2, 1.6), color="#ffe8c8", range=3, intensity=0.8)], note="espelho de parede 1.1 x 1.7 m com lampadas de camarim")
def vanity_mirror_wall():
    w, h = 1.1, 1.7
    P = [rb((w, .04, h), (0, .02, 1.2), "mirror", .01, seg=1)]
    P += frame(w + .08, h + .08, .05, (0, .03, 1.2), "trim", d=.06, r=.012)
    n = 7
    for i in range(n):
        z = .5 + i * (1.4 / (n - 1)) + .3
        for sx in (-1, 1):
            P.append(ck.sph(.032, (sx * (w / 2 + .12), -.01, z), "glow", n=8, rings=5))
    for sx in (-1, 1):
        P.append(rb((.035, .03, 1.5), (sx * (w / 2 + .12), .015, 1.25), "base", .01, seg=1))
    return P


@piece("casa", "art_canvas_large", tags=["decor", "wall"], col=None, mount="wall", budget=2200, note="tela abstrata 1.3 x 0.9 m em moldura de latao")
def art_canvas_large():
    P = frame(1.34, .94, .03, (0, .03, 1.7), "trim", d=.05, r=.01)
    P.append(rb((1.3, .02, .9), (0, .015, 1.7), "white", .005, seg=1))
    P.append(ck.sph((.9, .02, .5), (-.2, -.005, 1.72), "soft", n=14, rings=6))
    P.append(ck.sph((.6, .02, .38), (.25, -.012, 1.6), "accent2", n=14, rings=6))
    P.append(ck.sph((.3, .02, .22), (-.35, -.016, 1.9), "accent", n=12, rings=5))
    P.append(ck.tube([Vector((-.5, -.02, 1.45)), Vector((-.1, -.02, 1.55)), Vector((.3, -.02, 1.4)), Vector((.5, -.02, 1.5))], .008, "trim", minor=4))
    return P


@piece("casa", "bed_bench", tags=["seat", "decor"], col="box", mount="floor", budget=2600,
       sit=[dict(id="sit", pos=(0, 0, .47), face=(0, -1), label="Sentar")], note="banco estofado de pe de cama 1.5 m com pes dourados")
def bed_bench():
    P = [pillow((1.5, .5, .24), (0, 0, .36), "fabric", k=.28, seg=3), rb((1.4, .42, .06), (0, 0, .2), "white", .02)]
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(ck.cyl(.022, .17, (sx * .68, sy * .18, .085), "trim", n=8))
    for i in range(5):
        P.append(ck.sph(.012, (-.5 + i * .25, -.12, .485), "trim", n=6, rings=4))
    return P


@piece("casa", "bookcase_open", tags=["shelf", "decor"], col="box", mount="floor", budget=5600, note="estante aberta 1.2 m com livros, vasos e objetos (2.0 m)")
def bookcase_open():
    w, d, h = 1.2, .34, 2.0
    P = [rb((.04, d, h), (-w / 2 + .02, 0, h / 2), "base", .008), rb((.04, d, h), (w / 2 - .02, 0, h / 2), "base", .008), rb((w, .02, h), (0, d / 2 - .01, h / 2), "soft", .004, seg=1)]
    import random
    rnd = random.Random(3)
    for z in (.03, .5, .95, 1.4, 1.97):
        P.append(rb((w, d, .035), (0, 0, z), "base", .01))
    cols = ("accent2", "soft", "white", "accent", "deep", "fabric")
    for r, z in enumerate((.05, .52, .97, 1.42)):
        x = -w / 2 + .07
        while x < w / 2 - .2:
            bw = .03 + rnd.random() * .03
            bh = .26 + rnd.random() * .12
            if rnd.random() < .22:
                P.append(rb((.1, .1, .12), (x + .05, 0, z + .06 + .015), cols[int(rnd.random() * 6)], .02, seg=2))
                x += .14
                continue
            P.append(rb((bw, .22, bh), (x + bw / 2, .0, z + bh / 2 + .015), cols[int(rnd.random() * 6)], .004, seg=1))
            x += bw + .003
        if r % 2:
            P.append(ck.sph(.06, (w / 2 - .12, 0, z + .09), "leaf", n=8, rings=5))
    return P

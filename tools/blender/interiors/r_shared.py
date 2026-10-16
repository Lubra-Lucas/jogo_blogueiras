"""Pecas de casca compartilhadas (piso, paredes, molduras, cortinas, tapetes, plantas, espelhos...). Paleta neutra rosa/ouro."""
from lib import *
R = "shared"


def tile_base(mat="base", t=.03):
    return rb((2, 2, t), (0, 0, t / 2), mat, .006, seg=2)


@piece(R, "floor_checker", tags=["floor", "tile"], col="box", walk=True, mount="floor", note="ladrilho 2x2 m, topo em z=0.03")
def floor_checker():
    P = [tile_base("white")]
    for i in range(4):
        for j in range(4):
            if (i + j) % 2 == 0:
                P.append(box((.5, .5, .006), (-.75 + i * .5, -.75 + j * .5, .03), "accent"))
    P.append(box((2, .014, .008), (0, -.993, .032), "trim"))
    P.append(box((.014, 2, .008), (-.993, 0, .032), "trim"))
    for i in range(3):
        P.append(box((.012, 2, .004), (-.5 + i * .5, 0, .031), "trim"))
        P.append(box((2, .012, .004), (0, -.5 + i * .5, .031), "trim"))
    return P


@piece(R, "floor_parquet", tags=["floor", "tile"], col="box", walk=True, mount="floor", note="parquet basketweave 2x2 m")
def floor_parquet():
    P = [tile_base("deep")]
    for i in range(4):
        for j in range(4):
            horiz = (i + j) % 2 == 0
            m = "base" if horiz else "soft"
            for k in range(4):
                o = -.1875 + k * .125
                dims = (.49, .118, .008) if horiz else (.118, .49, .008)
                loc = (-.75 + i * .5 + (0 if horiz else o), -.75 + j * .5 + (o if horiz else 0), .032)
                P.append(box(dims, loc, m))
    return P


@piece(R, "floor_medallion", tags=["floor", "tile", "feature"], col="box", walk=True, mount="floor",
       note="piso de marmore com medalhao de coracao e aro dourado")
def floor_medallion():
    P = [tile_base("white")]
    P.append(ring(.82, .012, (0, 0, .034), "trim", n=48, minor=6))
    P.append(ring(.72, .008, (0, 0, .034), "trim", n=48, minor=6))
    P.append(heart(1.0, .012, (0, 0, .04), "accent2", rot=(pi / 2, 0, 0), bevel=.005, seg=2))
    P.append(heart(.6, .012, (0, 0, .05), "accent", rot=(pi / 2, 0, 0), bevel=.005, seg=2))
    for k in range(8):
        a = 2 * pi * k / 8 + pi / 8
        P.append(box((.1, .1, .008), (.93 * cos(a), .93 * sin(a), .034), "accent", rot=(0, 0, a + pi / 4)))
    return P


def wainscot(w, rail=1.05, y0=0.0):
    P = []
    n = max(1, int(round(w / .66)))
    pw = w / n - .12
    for i in range(n):
        x = -w / 2 + (i + .5) * w / n
        P.append(rb((pw, .034, rail - .34), (x, y0 - .015, .2 + (rail - .34) / 2 + .03), "accent", .014))
        P += frame(pw - .1, rail - .46, .016, (x, y0 - .04, .2 + (rail - .34) / 2 + .03), "trim", d=.012, r=.004)
    P.append(rb((w, .07, .07), (0, y0 - .02, rail), "white", .02))
    P.append(ck.cyl(.022, w, (0, y0 - .062, rail + .01), "trim", rot=(0, pi / 2, 0), n=10))
    return P


def upper_panels(w, z0=1.35, z1=2.95):
    P = []
    n = max(1, int(round(w / 1.0)))
    for i in range(n):
        x = -w / 2 + (i + .5) * w / n
        P += frame(w / n - .3, z1 - z0, .035, (x, -.016, (z0 + z1) / 2), "white", d=.02, r=.008)
        P += frame(w / n - .42, z1 - z0 - .12, .012, (x, -.03, (z0 + z1) / 2), "trim", d=.01, r=.004)
    return P


@piece(R, "wall_panel", tags=["wall"], col="box", mount="wall", note="parede 2 m x 3.2 m, lambri rosa + molduras")
def wall_panel():
    return [wall_body(2.0)] + wainscot(2.0) + upper_panels(2.0)


@piece(R, "wall_panel_wide", tags=["wall"], col="box", mount="wall", note="parede 4 m x 3.2 m")
def wall_panel_wide():
    return [wall_body(4.0)] + wainscot(4.0) + upper_panels(4.0)


@piece(R, "baseboard_2m", tags=["trim"], col=None, mount="wall", note="rodape 2 m")
def baseboard():
    P = [rb((2, .06, .2), (0, -.03, .1), "white", .02)]
    P.append(ck.cyl(.018, 2, (0, -.07, .2), "trim", rot=(0, pi / 2, 0), n=8))
    return P


@piece(R, "crown_2m", tags=["trim"], col=None, mount="wall", note="sanca/cornija 2 m, topo em z=3.2")
def crown():
    P = [rb((2, .14, .16), (0, -.07, 3.12), "white", .03), rb((2, .09, .05), (0, -.11, 3.06), "base", .015)]
    P.append(ck.cyl(.02, 2, (0, -.15, 3.06), "trim", rot=(0, pi / 2, 0), n=8))
    bm = bmesh.new()
    for i in range(20):
        merge(bm, ck.bm_sphere(1, 1, 1, 8, 4), (-.95 + i * .1, -.12, 3.14), (.06, .05, .06))
    P.append(obj(bm, "trim"))
    return P


@piece(R, "wall_arch_door", tags=["wall", "door"], col="box", mount="wall",
       colbox=((-1.6, 1.6), (0, .1), (2.75, 3.2)), note="parede 3.2 m com arco de passagem 1.5 x 2.6 m (colisor so no lintel)",
       use=[dict(id="door", pos=(0, -.6, 0), face=(0, 1), label="Passagem")])
def wall_arch_door():
    ow, orect = 1.5, 1.85
    r = ow / 2
    cut1 = box((ow, .6, orect), (0, .05, orect / 2), None)
    cut2 = ck.cyl(r, .6, (0, .05, orect), None, rot=(pi / 2, 0, 0), n=28)
    P = [wall_body(3.2, cuts=(cut1, cut2))]
    for sx in (-1, 1):
        wv = 1.6 - .75 - .12
        P += [rb((wv, .034, .7), (sx * 1.17, -.015, .58), "accent", .014)]
        P += frame(wv - .1, .56, .016, (sx * 1.17, -.04, .58), "trim", d=.012, r=.004)
        P.append(rb((.85, .07, .07), (sx * 1.18, -.02, 1.05), "white", .02))
    P.append(ck.tube(arch_curve(0, -.05, orect, r + .06, 20, 0, pi), .06, "white", minor=8, caps=True))
    P.append(ck.tube(arch_curve(0, -.08, orect, r + .015, 20, 0, pi), .02, "trim", minor=6))
    for sx in (-1, 1):
        P.append(rb((.12, .1, orect), (sx * (r + .06), -.05, orect / 2), "white", .03))
        P.append(rb((.17, .12, .2), (sx * (r + .06), -.05, .1), "white", .03))
    P.append(heart(.26, .05, (0, -.1, orect + r + .12), "trim", bevel=.015))
    P.append(rb((3.2, .06, .1), (0, -.03, 3.1), "white", .02))
    P.append(rb((3.2, .06, .12), (0, -.03, .06), "white", .02))
    return P


@piece(R, "wall_window_curtains", tags=["wall", "window"], col="box", mount="wall",
       note="parede 3 m com janela em arco, cortinas amarradas, varao dourado; vidro com luz do dia (slot glow)",
       use=[dict(id="window", pos=(0, -.8, 0), face=(0, 1), label="Janela")], budget=9000)
def wall_window_curtains():
    ow, orect, z0 = 1.3, 1.1, .85
    r = ow / 2
    cut1 = box((ow, .6, orect), (0, .05, z0 + orect / 2), None)
    cut2 = ck.cyl(r, .6, (0, .05, z0 + orect), None, rot=(pi / 2, 0, 0), n=24)
    P = [wall_body(3.0, cuts=(cut1, cut2))]
    P += wainscot(3.0)
    pts = [(x, z + z0) for x, z in arch_pts(ow, orect, 12)]
    P.append(prism(pts, .02, "xz", "glow", (0, .07, 0)))
    P.append(prism(pts, .014, "xz", "glass", (0, .03, 0)))
    P.append(ck.tube(arch_curve(0, -.03, z0 + orect, r + .04, 18, 0, pi), .04, "white", minor=8))
    P.append(ck.tube(arch_curve(0, -.05, z0 + orect, r, 18, 0, pi), .018, "trim", minor=6))
    for sx in (-1, 1):
        P.append(rb((.08, .08, orect), (sx * (r + .04), -.03, z0 + orect / 2), "white", .025))
        P.append(ck.tube([Vector((sx * r, -.04, z0)), Vector((sx * r, -.04, z0 + orect))], .016, "trim", minor=6))
    P.append(rb((ow + .4, .2, .06), (0, -.1, z0 - .03), "white", .025))
    P.append(ck.tube([Vector((0, -.045, z0)), Vector((0, -.045, z0 + orect + r))], .014, "trim", minor=6))
    P.append(ck.tube([Vector((-r, -.045, z0 + .6)), Vector((r, -.045, z0 + .6))], .014, "trim", minor=6))
    P.append(ck.cyl(.022, 2.5, (0, -.2, 2.95), "trim", rot=(0, pi / 2, 0), n=10))
    for sx in (-1, 1):
        P.append(ck.sph(.05, (sx * 1.28, -.2, 2.95), "trim", n=10, rings=6))
        P.append(drape(.82, 2.5, (sx * .78, -.2, 2.92), "fabric", folds=5, amp=.06, pinch=.28, pinch_z=.5, flare=.12))
        P.append(ck.sph((.14, .12, .1), (sx * .55, -.22, 1.6), "trim", n=8, rings=4))
    P.append(drape(1.4, .35, (0, -.22, 2.98), "fabric", folds=4, amp=.05, per=5, nz=3))
    return P


@piece(R, "ceiling_medallion", tags=["ceiling", "decor"], col=None, mount="ceiling", note="rosace de teto, origem = teto; use sob lustres")
def ceiling_medallion():
    prof = [(0, -.06), (.2, -.07), (.45, -.04), (.6, -.025), (.75, -.01), (.78, 0.0)]
    P = [ck.lathe(prof, "white", n=40, smooth=1, flute=(10, .06))]
    P.append(ring(.5, .018, (0, 0, -.05), "trim", n=40, minor=6))
    P.append(ring(.3, .012, (0, 0, -.07), "trim", n=32, minor=6))
    P.append(ck.sph((.16, .16, .1), (0, 0, -.08), "trim", n=12, rings=5))
    return P


@piece(R, "rug_round", tags=["rug", "decor"], col=None, walk=True, mount="floor", note="tapete redondo 2 m, aneis")
def rug_round():
    P = [ck.cyl(1.0, .025, (0, 0, .0125), "accent", n=48, bevel=.008, seg=2)]
    P.append(ck.cyl(.8, .004, (0, 0, .027), "white", n=48))
    P.append(ring(.9, .01, (0, 0, .03), "trim", n=48, minor=5))
    P.append(ck.cyl(.45, .004, (0, 0, .029), "accent2", n=40))
    P.append(ring(.42, .008, (0, 0, .033), "trim", n=40, minor=5))
    P.append(heart(.5, .01, (0, 0, .036), "white", rot=(pi / 2, 0, 0), bevel=.004, seg=2))
    return P


@piece(R, "rug_heart", tags=["rug", "decor"], col=None, walk=True, mount="floor", note="tapete coracao 2 m")
def rug_heart():
    return [heart(2.0, .03, (0, 0, .015), "accent2", rot=(pi / 2, 0, 0), bevel=.01, seg=2),
            heart(1.55, .03, (0, 0, .02), "accent", rot=(pi / 2, 0, 0), bevel=.01, seg=2),
            heart(1.1, .03, (0, 0, .025), "white", rot=(pi / 2, 0, 0), bevel=.01, seg=2)]


@piece(R, "plant_potted", tags=["plant", "decor"], col="cyl", mount="floor", note="vaso grande com folhagem (prefira Meshy para hero)")
def plant_potted():
    return potted_plant_parts(.8, .24, 9, "white")


@piece(R, "plant_small", tags=["plant", "decor", "tabletop"], col=None, mount="tabletop", note="vasinho de mesa")
def plant_small():
    return potted_plant_parts(.24, .085, 6, "accent", seed=4)


@piece(R, "wall_sconce", tags=["light", "wall"], col=None, mount="wall", lights=[dict(pos=(0, -.18, 2.1), color="#ffd9a0", range=3.0, intensity=0.8)],
       note="arandela dourada com cristais, centro a 1.9 m")
def wall_sconce():
    z = 1.9
    P = [rb((.16, .03, .34), (0, .015, z), "trim", .012)]
    P.append(ck.tube([Vector((0, -.01, z)), Vector((0, -.1, z - .02)), Vector((0, -.17, z + .05)), Vector((0, -.18, z + .1))], .018, "trim", minor=6))
    P.append(ck.lathe([(0, 0), (.06, 0), (.07, .03), (.04, .04), (0, .04)], "trim", (0, -.18, z + .09), n=14))
    P.append(ck.lathe([(.015, 0), (.03, .07), (.07, .17), (.09, .22), (.085, .22), (.06, .16), (.02, .08)], "glass", (0, -.18, z + .12), n=14))
    P.append(ck.sph((.05, .05, .1), (0, -.18, z + .22), "glow", n=8, rings=4))
    P.append(crystals([(sx * .07, -.18, z - .02 - k * .02, .035) for k in range(2) for sx in (-1, 1)] + [(0, -.18, z - .03, .04)]))
    return P


@piece(R, "mirror_wall_oval", tags=["mirror", "wall", "decor"], col=None, mount="wall", hero=True,
       use=[dict(id="mirror", pos=(0, -.8, 0), face=(0, 1), label="Espelho")],
       note="espelho oval com moldura dourada ornamentada e laco, de 0.5 a 2.0 m")
def mirror_wall_oval():
    cz, rx, rz = 1.25, .42, .72
    P = [ck.prism([(rx * cos(2 * pi * i / 48), rz * sin(2 * pi * i / 48)) for i in range(48)], .015, "xz", "mirror", (0, .02, cz))]
    pts = [Vector((rx * cos(2 * pi * i / 48), -.01, cz + rz * sin(2 * pi * i / 48))) for i in range(48)]
    P.append(ck.tube(pts, .035, "trim", minor=10, closed=True))
    pts2 = [Vector(((rx + .06) * cos(2 * pi * i / 48), -.02, cz + (rz + .06) * sin(2 * pi * i / 48))) for i in range(48)]
    P.append(ck.tube(pts2, .02, "trim", minor=8, closed=True))
    bm = bmesh.new()
    for i in range(24):
        a = 2 * pi * i / 24
        merge(bm, ck.bm_sphere(1, 1, 1, 8, 4), ((rx + .1) * cos(a), -.03, cz + (rz + .1) * sin(a)), (.05, .05, .05))
    P.append(obj(bm, "white"))
    P += bow(.34, (0, -.06, cz + rz + .16), "accent2", knot="trim")
    for sx in (-1, 1):
        P.append(heart(.14, .03, (sx * .6, -.04, cz + .1), "trim", bevel=.01, seg=2))
    return P


@piece(R, "picture_frame", tags=["decor", "wall"], col=None, mount="wall", note="quadro com moldura dourada (arte abstrata em coracoes)")
def picture_frame():
    cz = 1.55
    P = [rb((.7, .03, .9), (0, .015, cz), "white", .01)]
    P += frame(.7, .9, .06, (0, -.02, cz), "trim", d=.05, r=.02)
    P.append(rb((.5, .01, .7), (0, -.005, cz), "soft", .004))
    P.append(heart(.3, .012, (-.07, -.012, cz + .08), "accent2", bevel=.004, seg=2))
    P.append(heart(.2, .012, (.1, -.02, cz - .1), "accent", bevel=.004, seg=2))
    P.append(ck.sph((.12, .05, .12), (0, -.04, cz + .5), "trim", n=8, rings=4))
    return P


@piece(R, "shelf_wall", tags=["shelf", "wall", "decor"], col=None, mount="wall", note="prateleira flutuante com livros e vaso, a 1.5 m")
def shelf_wall():
    z = 1.5
    P = [rb((1.2, .26, .04), (0, -.13, z), "white", .012)]
    for sx in (-1, 1):
        P.append(ck.sph((.05, .18, .16), (sx * .45, -.1, z - .1), "trim", n=8, rings=4))
        P.append(rb((.03, .05, .16), (sx * .45, -.02, z - .08), "trim", .01))
    cols = ["accent2", "soft", "trim", "accent", "deep"]
    x = -.5
    for k in range(5):
        w = .035 + (k % 3) * .012
        h = .17 + (k % 2) * .05
        P.append(rb((w, .15, h), (x + w / 2, -.12, z + .02 + h / 2), cols[k], .006))
        x += w + .003
    P.append(ck.lathe([(0, 0), (.05, 0), (.07, .08), (.04, .17), (.05, .21), (.03, .21), (.02, .17), (.04, .08), (0, .07)], "glass", (.3, -.13, z + .02), n=14, smooth=1))
    P.append(heart(.14, .035, (-.1, -.13, z + .1), "accent2", bevel=.012, seg=2))
    return P


@piece(R, "fairy_lights_curtain", tags=["light", "decor", "wall"], col=None, mount="wall", hero=True,
       lights=[dict(pos=(0, -.1, 2.0), color="#ffd9a0", range=3.0, intensity=0.5)], note="cortina de luzes de fada, 2.2 m, do teto (3.1 m) para baixo")
def fairy_lights():
    P = [ck.cyl(.012, 2.3, (0, -.02, 3.1), "trim", rot=(0, pi / 2, 0), n=6)]
    pts = []
    for i in range(11):
        x = -1.0 + i * .2
        top = 3.08
        ln = 1.0 + ((i * 7) % 5) * .32
        P.append(ck.tube([Vector((x, -.02, top)), Vector((x + .02, -.02, top - ln))], .004, "trim", minor=3))
        for j in range(1, int(ln / .22) + 1):
            pts.append((x + .015 * sin(j), -.03, top - j * .22))
    P.append(bulbs(pts, .018, "glow"))
    return P

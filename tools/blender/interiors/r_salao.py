"""Salao & Spa: lilas + perola + prata."""
from lib import *
from lib2 import *
R = "salao"


@piece(R, "floor_pearl_tile", tags=["floor", "tile"], col="box", walk=True, mount="floor", note="piso perola com losangos lilas e fios de prata 2x2 m")
def floor_pearl():
    P = [rb((2, 2, .03), (0, 0, .015), "accent", .006, seg=2)]
    for i in range(2):
        for j in range(2):
            cx, cy = -.5 + i, -.5 + j
            P.append(box((.62, .62, .006), (cx, cy, .03), "base", rot=(0, 0, pi / 4)))
            P.append(box((.5, .5, .004), (cx, cy, .033), "white", rot=(0, 0, pi / 4)))
    for t in (-1, 0, 1):
        P.append(box((2, .012, .004), (0, t * 1.0 if t else 0, .032), "trim")) if t != 1 else None
        P.append(box((.012, 2, .004), (t * 1.0 if t else 0, 0, .032), "trim")) if t != 1 else None
    return [p for p in P if p is not None]


@piece(R, "chair_styling_hydraulic", tags=["seat", "chair", "salon", "hero"], col="cyl", hero=True, mount="floor",
       sit=[dict(id="sit", pos=(0, 0, .56), face=(0, -1), label="Sentar para o penteado")],
       note="cadeira de salao hidraulica lilas com base estrela cromada e apoio de pe (assento 0.5 m)")
def chair_styling():
    P = []
    for k in range(5):
        a = 2 * pi * k / 5 + pi / 2
        P.append(ck.tube([Vector((0, 0, .12)), Vector((.18 * cos(a), .18 * sin(a), .1)), Vector((.36 * cos(a), .36 * sin(a), .07))], .022, "trim", minor=6))
        P.append(ck.sph((.07, .07, .07), (.37 * cos(a), .37 * sin(a), .05), "deep", n=8, rings=4))
    P.append(ck.lathe([(0, .06), (.1, .06), (.09, .14), (.05, .18), (.05, .36), (.09, .38), (.09, .42), (0, .42)], "trim", n=16, smooth=1))
    P.append(ck.cyl(.04, .1, (0, 0, .3), "mirror", n=10))
    P.append(pillow((.58, .56, .16), (0, 0, .46), "fabric", k=.45))
    P.append(ring(.31, .008, (0, 0, .42), "trim", n=4, minor=4)) if False else None
    P.append(rb((.52, .12, .62), (0, .27, .78), "fabric", .06, rot=(-.12, 0, 0)))
    P += tuft(.42, .46, .08, (0, .25, .78), "fabric", sx=.15, buttons=True)
    P.append(pillow((.34, .12, .22), (0, .3, 1.13), "fabric", rot=(-.12, 0, 0), k=.45))
    for sx in (-1, 1):
        P.append(ck.tube([Vector((sx * .3, .2, .5)), Vector((sx * .32, .1, .6)), Vector((sx * .32, -.1, .62)), Vector((sx * .3, -.2, .55))], .016, "trim", minor=6))
        P.append(pillow((.08, .3, .06), (sx * .32, -.03, .67), "fabric", k=.4))
    P.append(ck.tube([Vector((-.18, -.24, .3)), Vector((-.18, -.36, .2)), Vector((.18, -.36, .2)), Vector((.18, -.24, .3))], .014, "trim", minor=6))
    P.append(rb((.42, .18, .03), (0, -.42, .2), "fabric", .012, rot=(.25, 0, 0)))
    P.append(ck.tube([Vector((-.18, -.34, .24)), Vector((-.18, -.42, .2))], .012, "trim", minor=5))
    return [p for p in P if p is not None]


def bulb_rect(w, h, cx, y, cz, n_h=7, n_v=8):
    pts = []
    for i in range(n_h):
        x = -w / 2 + w * (i + .5) / n_h
        pts += [(cx + x, y, cz + h / 2), (cx + x, y, cz - h / 2)]
    for j in range(n_v):
        z = -h / 2 + h * (j + .5) / n_v
        pts += [(cx - w / 2, y, cz + z), (cx + w / 2, y, cz + z)]
    return pts


@piece(R, "mirror_station_lit", tags=["salon", "station", "mirror", "hero"], col="box", hero=True, mount="floor",
       use=[dict(id="style", pos=(0, -.8, 0), face=(0, 1), label="Estacao de espelho")],
       lights=[dict(pos=(0, -.2, 1.6), color="#fff0f8", range=3, intensity=1.0)],
       note="estacao com espelho retangular iluminado por lampadas, bancada com gavetas e acessorios (1.4 x 0.5 x 2.2)")
def mirror_station():
    w, d = 1.4, .5
    P = [rb((w, d, .06), (0, 0, .06), "trim", .02), rb((w - .06, d - .06, .7), (0, 0, .44), "base", .04), rb((w + .06, d + .06, .06), (0, 0, .8), "white", .02)]
    for sx in (-1, 1):
        for z in (.6, .35):
            P.append(rb((.55, .02, .2), (sx * .3, -d / 2 + .02, z), "accent", .01))
            P.append(rb((.18, .02, .02), (sx * .3, -d / 2 - .005, z + .05), "trim", .008))
    P.append(rb((w - .1, .04, 1.3), (0, d / 2 - .02, 1.5), "white", .02))
    P.append(rb((w - .3, .02, 1.1), (0, d / 2 - .045, 1.5), "mirror", .006))
    P += frame(w - .12, 1.36, .05, (0, d / 2 - .05, 1.5), "trim", d=.05, r=.015)
    P.append(bulbs(bulb_rect(w - .08, 1.28, 0, d / 2 - .075, 1.5, 7, 8), .026))
    P.append(ck.heart(.2, .03, (0, d / 2 - .06, 2.26), "trim", bevel=.01, seg=2))
    P.append(ck.lathe([(0, 0), (.05, 0), (.045, .09), (.035, .17), (0, .17)], "white", (.4, .0, .83), n=12))
    P.append(ck.tube([Vector((.4, 0, .95)), Vector((.4, 0, .98)), Vector((.5, 0, .98))], .025, "white", minor=6))
    P.append(ck.cyl(.04, .1, (.55, 0, .88), "accent2", rot=(0, 1.2, 0), n=10))
    P.append(ck.lathe([(0, 0), (.04, 0), (.04, .22), (.025, .26), (0, .26)], "glass", (-.4, .1, .83), n=12))
    P.append(ck.lathe([(0, 0), (.03, 0), (.03, .1), (0, .1)], "accent2", (-.5, .1, .83), n=10))
    P.append(ck.lathe([(0, 0), (.035, 0), (.04, .12), (0, .12)], "soft", (-.2, .05, .83), n=10))
    for k in range(5):
        a = k * .25
        P.append(ck.tube([Vector((.0, .15, .83)), Vector((-.02 + .02 * k, .15, .95))], .005, "deep", minor=3)) if False else None
    P.append(oval_slab(.12, .08, .01, (.0, -.02, .83), "trim", bevel=.003))
    return [p for p in P if p is not None]


@piece(R, "washbasin_chair", tags=["salon", "seat", "wash"], col="box", mount="floor", sit=[dict(id="sit", pos=(0, -.1, .56), face=(0, -1), label="Lavar cabelo")],
       note="lavatorio de salao: cadeira reclinavel lilas com cuba de ceramica e ducha (1.0 x 1.7 x 1.1)")
def washbasin():
    P = []
    P.append(ck.lathe([(0, 0), (.22, 0), (.2, .04), (.07, .1), (.06, .4), (0, .4)], "trim", (0, -.1, 0), n=16, smooth=1))
    P.append(rb((.6, .95, .12), (0, -.1, .5), "fabric", .05, rot=(.0, 0, 0)))
    P.append(pillow((.58, .5, .2), (0, -.3, .54), "fabric", k=.45))
    P.append(pillow((.5, .6, .17), (0, .08, .62), "fabric", rot=(.35, 0, 0), k=.45))
    for sx in (-1, 1):
        P.append(ck.tube([Vector((sx * .34, -.4, .55)), Vector((sx * .34, -.1, .62)), Vector((sx * .34, .2, .55))], .016, "trim", minor=6))
    P.append(rb((.9, .5, .85), (0, .65, .43), "base", .05))
    P.append(ck.lathe([(0, 0), (.2, 0), (.28, .04), (.3, .1), (.0, .1)], "white", (0, .55, .87), n=24, smooth=1) if False else
             ck.lathe([(0, .0), (.2, .0), (.26, .05), (.27, .1), (.24, .11), (.0, .08)], "white", (0, .55, .86), n=24, smooth=1))
    P.append(ck.tube([Vector((.0, .85, .87)), Vector((0, .88, 1.1)), Vector((.0, .75, 1.17)), Vector((0, .62, 1.1))], .02, "trim", minor=6))
    P.append(ck.tube([Vector((.3, .8, .9)), Vector((.5, .7, .8)), Vector((.5, .4, .65)), Vector((.4, .2, .7))], .012, "trim", minor=5))
    P.append(ck.cyl(.035, .1, (.4, .2, .72), "trim", n=10))
    P.append(ck.heart(.14, .02, (0, .35, .45), "trim", bevel=.007, seg=2)) if False else None
    for sx in (-1, 1):
        P.append(ck.sph((.07, .07, .09), (sx * .12, .85, .93), "glass", n=8, rings=4))
    return [p for p in P if p is not None]


@piece(R, "manicure_table", tags=["salon", "table", "nails"], col="box", mount="floor", sit=[dict(id="client", pos=(0, -.55, .46), face=(0, 1)), dict(id="tech", pos=(0, .55, .46), face=(0, -1))],
       use=[dict(id="nails", pos=(0, -.8, 0), face=(0, 1), label="Fazer as unhas")],
       note="mesa de manicure 1.2 m com apoio de bracos, lampada UV e rack de esmaltes (h 0.75; rack 1.0 m)")
def manicure():
    P = [rb((1.2, .6, .05), (0, 0, .73), "white", .02), rb((1.14, .54, .55), (0, 0, .43), "base", .04), rb((1.24, .64, .04), (0, 0, .025), "trim", .015)]
    P.append(rb((.5, .02, .22), (-.3, -.285, .5), "accent", .01))
    P.append(knob((-.3, -.31, .55)))
    P.append(pillow((.42, .24, .07), (0, -.12, .79), "fabric", k=.45))
    P.append(ck.lathe([(0, 0), (.14, 0), (.14, .02), (.1, .1), (.0, .12)], "white", (.38, .0, .755), n=20, smooth=1))
    P.append(ck.lathe([(.0, 0), (.11, 0), (.1, .06), (0, .08)], "glow2", (.38, .0, .76), n=18))
    P.append(rb((.28, .18, .05), (.0, .17, .8), "accent2", .02) if False else None)
    for ti, z in enumerate((.755, .91, 1.06)):
        P.append(rb((.5 - ti * .06, .13, .018), (-.34, .22, z), "glass", .006))
    for sx in (-1, 1):
        P.append(ck.tube([Vector((-.34 + sx * .22, .22, .76)), Vector((-.34 + sx * .22, .22, 1.07))], .007, "trim", minor=4))
    cols = ["accent2", "soft", "deep", "base", "white", "accent"]
    for ti, z in enumerate((.775, .93, 1.08)):
        for k in range(5 - ti):
            x = -.34 - .2 + k * .1 + ti * .03
            P.append(ck.lathe([(0, 0), (.022, 0), (.024, .035), (.014, .045), (.014, .06), (0, .06)], "glass", (x, .22, z), n=8))
            P.append(ck.cyl(.012, .03, (x, .22, z + .075), cols[(k + ti) % 6], n=6))
    return [p for p in P if p is not None]


@piece(R, "stool_salon_round", tags=["seat", "stool", "salon"], col="cyl", mount="floor", sit=[dict(id="sit", pos=(0, 0, .5), face=(0, -1))],
       note="banquinho redondo de salao lilas com base cromada (assento 0.5)")
def stool_salon():
    P = [ck.cyl(.19, .1, (0, 0, .44), "fabric", n=22, bevel=.04), ring(.19, .01, (0, 0, .39), "trim", n=22, minor=4)]
    P.append(ck.sph((.36, .36, .1), (0, 0, .49), "fabric", n=18, rings=5))
    P.append(ck.lathe([(0, 0), (.2, 0), (.19, .02), (.04, .06), (.04, .36), (0, .38)], "trim", n=18, smooth=1))
    return P


@piece(R, "product_shelf_glass", tags=["salon", "shelf", "display", "hero"], col="box", hero=True, mount="floor", use=[dict(id="products", pos=(0, -.7, 0), face=(0, 1), label="Ver produtos")],
       lights=[dict(pos=(0, -.2, 1.3), color="#fff0f8", range=2.5, intensity=0.6)],
       note="expositor de produtos 1.2 m com prateleiras de vidro, LED e frascos (h 2.1)")
def product_shelf():
    w, d, h = 1.2, .4, 2.1
    P = [rb((w, d, .12), (0, 0, .06), "base", .02), rb((w + .06, d + .04, .06), (0, 0, h + .03), "trim", .02)]
    for sx in (-1, 1):
        P.append(rb((.05, d, h), (sx * (w / 2 - .025), 0, h / 2), "base", .015))
    P.append(rb((w, .03, h), (0, d / 2 - .015, h / 2), "accent", .008))
    cols = ["accent2", "base", "soft", "deep", "fabric", "glass"]
    for ri, z in enumerate((.4, .78, 1.16, 1.54, 1.92)):
        P.append(rb((w - .08, d - .04, .025), (0, -.01, z), "glass", .006))
        P.append(ck.tube([Vector((-w / 2 + .06, -d / 2 + .03, z + .014)), Vector((w / 2 - .06, -d / 2 + .03, z + .014))], .008, "glow", minor=4))
        bm1, bm2 = bmesh.new(), bmesh.new()
        for k in range(6):
            x = -.48 + k * .19
            hh = .14 + ((k + ri) % 3) * .04
            r = .035 + ((k * 2 + ri) % 2) * .01
            merge(bm1, ck.bm_lathe([(0, 0), (r, 0), (r * 1.05, hh * .8), (r * .6, hh), (0, hh)], 10), (x, 0, z + .013))
            merge(bm2, ck.bm_lathe([(0, 0), (r * .5, 0), (r * .5, .035), (0, .035)], 8), (x, 0, z + .013 + hh))
        P.append(obj(bm1, cols[ri % 6]))
        P.append(obj(bm2, "trim"))
    return P


@piece(R, "spa_massage_bed", tags=["spa", "bed", "hero"], col="box", hero=True, mount="floor", sit=[dict(id="lie", pos=(0, 0, .8), face=(0, -1), label="Deitar para massagem")],
       use=[dict(id="spa", pos=(0, -1.3, 0), face=(0, 1), label="Spa")],
       note="maca de massagem acolchoada lilas com berco facial, toalha e pedras (2.0 x 0.75 x 0.8)")
def massage_bed():
    P = [rb((1.8, .6, .38), (0, 0, .3), "base", .08), rb((1.9, .66, .03), (0, 0, .13), "trim", .01)]
    P += ball_feet([-.8, .8], [-.22, .22], .05, "trim", z=.06) if False else []
    for sx in (-.78, .78):
        for sy in (-.22, .22):
            P.append(ck.cyl(.04, .14, (sx, sy, .07), "trim", n=10))
    P.append(pillow((1.9, .72, .14), (0, 0, .55), "fabric", k=.45))
    P.append(pillow((.5, .72, .14), (-.88 + .0, 0, .55), "fabric", k=.45) if False else pillow((.46, .66, .12), (-.82, 0, .63), "fabric", k=.4))
    P.append(ring(.1, .03, (-.98, 0, .6), "soft", n=18, minor=8, ry=.075, rot=(0, 0, 0)))
    P.append(ck.drape(.7, .5, (.4, 0, .64), "white", folds=3, amp=.02, rot=(pi / 2, 0, 0), per=4, nz=3) if hasattr(ck, "drape") else drape(.7, .5, (.4, -.0, .64), "white", folds=3, amp=.02, per=4, nz=3, rot=(pi / 2, 0, 0)))
    P.append(pillow((.7, .75, .06), (.4, 0, .62), "white", k=.4))
    # toalha enrolada
    P.append(ck.cyl(.06, .35, (.82, -.1, .67), "white", rot=(pi / 2, 0, 0), n=12, bevel=.02))
    # pedras
    P.append(cloud([(-.2 + .07 * k, .0, .62, (.07, .05, .025)) for k in range(5)], "deep", 8, 4))
    P.append(cloud([(.1 + .04 * k, .08, .625, .018) for k in range(3)], "glow2", 6, 4)) if False else None
    P.append(ck.heart(.14, .02, (.0, -.34, .3), "trim", bevel=.007, seg=2))
    return [p for p in P if p is not None]


@piece(R, "towel_warmer_rack", tags=["spa", "storage", "decor"], col="box", mount="floor", note="cremalheira cromada com toalhas dobradas (0.9 x 0.3 x 1.5)")
def towel_rack():
    P = []
    for sx in (-1, 1):
        P.append(ck.tube([Vector((sx * .42, -.05, 0)), Vector((sx * .42, 0, .06)), Vector((sx * .42, 0, 1.45)), Vector((sx * .42, .0, 1.5))], .018, "trim", minor=6))
        P.append(ck.tube([Vector((sx * .42, .15, 0)), Vector((sx * .42, 0, .06))], .018, "trim", minor=6))
        P.append(ck.sph((.05, .05, .05), (sx * .42, 0, 1.52), "trim", n=8, rings=4))
    mats = ["white", "accent2", "white", "soft", "white", "accent2"]
    for k, z in enumerate((.3, .55, .8, 1.05, 1.3)):
        P.append(ck.tube([Vector((-.42, 0, z)), Vector((.42, 0, z))], .012, "trim", minor=5))
        P.append(rb((.7, .26, .07 + (k % 2) * .03), (0, .05, z + .06), mats[k], .025))
        P.append(rb((.4, .26, .06), (-.1, .05, z + .12 + (k % 2) * .02), mats[(k + 2) % 6], .02))
    P.append(ck.heart(.12, .02, (0, -.04, 1.55), "accent2", bevel=.007, seg=2))
    return P


@piece(R, "sofa_waiting_pearl", tags=["seat", "waiting", "sofa"], col="box", mount="floor", sit=[dict(id="sit_l", pos=(-.45, -.05, .5), face=(0, -1)), dict(id="sit_r", pos=(.45, -.05, .5), face=(0, -1))],
       note="sofa de espera perola/lilas 1.8 m, costas curvas capitone, pes prateados")
def sofa_waiting():
    w, d = 1.8, .85
    P = [rb((w, d, .24), (0, 0, .3), "fabric", .08), pillow((w - .3, d - .26, .2), (0, -.08, .47), "white", k=.4)]
    P.append(rb((w - .1, .25, .7), (0, d / 2 - .125, .7), "fabric", .1))
    P += tuft(w - .34, .5, .12, (0, d / 2 - .24, .78), "white", sx=.18)
    for sx in (-1, 1):
        P.append(pillow((.24, d, .46), (sx * (w / 2 - .12), 0, .5), "fabric", k=.45))
    P.append(ck.tube([Vector((-w / 2 + .1, -d / 2 + .02, .18)), Vector((w / 2 - .1, -d / 2 + .02, .18))], .016, "trim", minor=6))
    for sx in (-1, 1):
        for sy in (-1, 1):
            P += leg_curve(sx * (w / 2 - .1), sy * (d / 2 - .1), .18, .022, "trim", out=sx * .03)
    P.append(pillow((.38, .14, .36), (-.5, .2, .68), "accent2", rot=(-.3, 0, .2), k=.4))
    P.append(ck.heart(.34, .12, (.5, .2, .68), "soft", rot=(-.3, 0, 0), bevel=.045, seg=3))
    return P


@piece(R, "reception_desk_curved", tags=["counter", "reception", "hero"], col="box", hero=True, mount="floor", use=[dict(id="reception", pos=(0, -.9, 0), face=(0, 1), label="Recepcao / agendar")],
       note="balcao de recepcao curvo 2.4 m lilas com tampo perola, painel iluminado com coracao (h 1.1). Atendente em +Y")
def reception():
    pts = []
    w, d = 2.4, .8
    prof = []
    for i in range(25):
        t = i / 24
        x = -w / 2 + w * t
        y = -d / 2 - .22 * sin(pi * t) ** 1.2 * .0
        prof.append((x, y))
    # frente em arco suave: polilinha de planta
    plan = [(-w / 2 + .1, d / 2)] + [(-w / 2 + w * i / 20, -d / 2 - .14 * sin(pi * i / 20)) for i in range(21)] + [(w / 2 - .1, d / 2)]
    plan = [(-w / 2, d / 2)] + [(-w / 2 + w * i / 20, -d / 2 - .16 * sin(pi * i / 20)) for i in range(21)] + [(w / 2, d / 2)]
    P = [ck.prism(plan, .9, "xy", "base", (0, 0, .47), bevel=.03, seg=3)]
    top = [(x * 1.02, y * 1.04 - (.03 if y < 0 else -.03)) for x, y in plan]
    P.append(ck.prism(top, .06, "xy", "white", (0, 0, .96), bevel=.02, seg=3))
    P.append(ck.prism([(x, y) for x, y in plan], .05, "xy", "trim", (0, 0, .03), bevel=.015, seg=2))
    for i in range(1, 10):
        t = i / 10
        x = -w / 2 + w * t
        P.append(ck.cyl(.035, .78, (x * .97, -d / 2 - .16 * sin(pi * t) + .0, .47), "accent", n=8))
    P.append(ck.heart(.5, .05, (0, -d / 2 - .22, .62), "trim", bevel=.015, seg=2))
    P.append(ck.heart(.4, .02, (0, -d / 2 - .245, .62), "glow2", bevel=.006, seg=2))
    # objetos
    P.append(rb((.4, .02, .26), (.55, .15, 1.15), "deep", .008, rot=(-.25, 0, 0)))
    P.append(rb((.36, .014, .22), (.55, .14, 1.15), "glow2", .004, rot=(-.25, 0, 0)))
    P.append(ck.cyl(.05, .1, (.55, .24, 1.03), "trim", n=10))
    P.append(ck.lathe([(0, 0), (.045, 0), (.04, .03), (0, .04)], "trim", (-.3, -.1, .99), n=12))
    P.append(ck.sph(.015, (-.3, -.1, 1.04), "trim", n=6, rings=3))
    P += potted_flowers((-.75, .1, 1.12), 4, ("white", "accent"))
    P.append(ck.lathe([(0, 0), (.04, 0), (.05, .08), (0, .1)], "glass", (-.75, .1, .99), n=10))
    return P


@piece(R, "dryer_hood_chair", tags=["salon", "seat", "dryer"], col="box", mount="floor", sit=[dict(id="sit", pos=(0, -.05, .5), face=(0, -1))],
       note="secador de cabine (capacete) com poltrona lilas e anel luminoso (h 1.9)")
def dryer_hood():
    P = [rb((.68, .66, .16), (0, 0, .4), "fabric", .06), pillow((.58, .5, .16), (0, -.05, .5), "fabric", k=.45), rb((.6, .14, .55), (0, .27, .78), "fabric", .06)]
    for sx in (-1, 1):
        P.append(pillow((.12, .55, .3), (sx * .36, -.02, .62), "fabric", k=.45))
    P.append(ck.lathe([(0, 0), (.3, 0), (.28, .04), (.06, .09), (.05, .35), (0, .35)], "trim", (0, .0, 0), n=18, smooth=1))
    P.append(ck.tube([Vector((0, .3, .8)), Vector((0, .42, 1.2)), Vector((0, .42, 1.55)), Vector((0, .2, 1.7))], .03, "trim", minor=8))
    P.append(ck.lathe([(0, 0), (.34, .0), (.4, .14), (.38, .32), (.28, .46), (.12, .52), (0, .53)], "accent2", (0, -.0, 1.35), n=26, smooth=1) if False else
             ck.lathe([(.01, .53), (.14, .52), (.3, .46), (.38, .34), (.4, .14), (.34, .0), (.3, -.02), (.0, -.02)], "base", (0, -.02, 1.22), rot=(0, 0, 0), n=26, smooth=1))
    P.append(ring(.33, .018, (0, -.02, 1.2), "glow2", n=26, minor=6))
    P.append(ring(.35, .012, (0, -.02, 1.25), "trim", n=26, minor=5))
    for k in range(8):
        a = 2 * pi * k / 8
        P.append(ck.sph((.03, .03, .03), (.25 * cos(a), -.02 + .25 * sin(a), 1.215), "trim", n=6, rings=3))
    P.append(ck.heart(.18, .03, (0, -.25, 1.6), "trim", rot=(.3, 0, 0), bevel=.01, seg=2) if False else ck.sph((.1, .1, .1), (0, -.02, 1.76), "trim", n=8, rings=5))
    return [p for p in P if p is not None]


@piece(R, "spa_decor_set", tags=["spa", "decor", "tabletop"], col=None, mount="tabletop", note="conjunto spa: pedras empilhadas, velas, orquidea e frasco de oleo (0.5 m)")
def spa_set():
    P = [rb((.5, .3, .02), (0, 0, .01), "white", .008)]
    P.append(cloud([(-.15, 0, .05, (.13, .1, .06)), (-.15, 0, .1, (.1, .08, .05)), (-.15, 0, .14, (.07, .06, .04))], "deep", 10, 5))
    for i, (x, y) in enumerate(((.05, .08), (.14, -.04), (.2, .08))):
        P.append(ck.cyl(.04, .06 + i * .02, (x, y, .05 + i * .01), "white", n=14, bevel=.01))
        P.append(ck.sph((.025, .025, .045), (x, y, .1 + i * .03), "glow", n=8, rings=4))
    P.append(ck.lathe([(0, 0), (.035, 0), (.04, .07), (.02, .1), (0, .1)], "glass", (.0, -.08, .02), n=10))
    P.append(ck.tube([Vector((.18, .0, .02)), Vector((.18, .0, .06)), Vector((.17, .02, .22)), Vector((.12, .04, .32))], .005, "leaf", minor=4))
    P.append(ck.sph((.08, .08, .07), (.18, 0, .02), "white", n=8, rings=4) if False else None)
    for k in range(5):
        P.append(ck.sph((.05, .03, .045), (.17 - k * .015, .02 + k * .006, .24 + k * .02), "accent", n=6, rings=4))
    return [p for p in P if p is not None]


@piece(R, "chandelier_orbs", tags=["light", "ceiling", "hero"], col=None, mount="ceiling", hero=True, lights=[dict(pos=(0, 0, -1.2), color="#fff0f8", range=6, intensity=1.0)],
       note="lustre de bolhas de vidro lilas com nucleos luminosos em alturas diferentes (pende 1.6 m, diametro 1.1)")
def orb_chandelier():
    P = [ck.cyl(.12, .04, (0, 0, -.02), "trim", n=14)]
    import random
    rnd = random.Random(2)
    for k in range(9):
        a = 2 * pi * k / 9
        r = .1 + .35 * (k % 3) / 2
        x, y = r * cos(a), r * sin(a)
        ln = .7 + rnd.random() * .8
        s = .09 + rnd.random() * .06
        P.append(ck.tube([Vector((0, 0, -.04)), Vector((x * .4, y * .4, -ln * .35)), Vector((x, y, -ln + s))], .006, "trim", minor=4))
        P.append(ck.sph((s * 2, s * 2, s * 2), (x, y, -ln), "glass", n=12, rings=7))
        P.append(ck.sph((s * 1.1, s * 1.1, s * 1.1), (x, y, -ln), "glow", n=8, rings=5))
        P.append(ck.sph((.02, .02, .02), (x, y, -ln + s + .01), "trim", n=6, rings=3))
    return P


@piece(R, "trolley_salon", tags=["salon", "storage", "cart"], col="box", mount="floor", note="carrinho auxiliar de salao 3 niveis com frascos e escovas (0.5 x 0.4 x 0.95)")
def trolley():
    P = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(ck.cyl(.012, .88, (sx * .22, sy * .16, .5), "trim", n=8))
            P.append(ck.sph((.06, .06, .06), (sx * .22, sy * .16, .035), "deep", n=8, rings=4))
    cols = ["accent2", "base", "soft"]
    for k, z in enumerate((.12, .45, .85)):
        P.append(rb((.5, .38, .03), (0, 0, z), "white", .012))
        P.append(ck.tube(rect_pts(.5, .38, z + .018, 0, 0, .02), .006, "trim", minor=4, closed=True))
        bm = bmesh.new()
        for i in range(4):
            hh = .1 + (i % 2) * .05
            merge(bm, ck.bm_lathe([(0, 0), (.03, 0), (.032, hh * .8), (.016, hh), (0, hh)], 8), (-.17 + i * .11, .04 * (-1) ** i, z + .015))
        P.append(obj(bm, cols[k]))
    P.append(ck.tube([Vector((-.22, -.16, .9)), Vector((-.22, -.2, .95)), Vector((.22, -.2, .95)), Vector((.22, -.16, .9))], .012, "trim", minor=5))
    return P


@piece(R, "sign_scissors_neon", tags=["wall", "sign", "light"], col=None, mount="wall", lights=[dict(pos=(0, -.2, 2.3), color="#ffe8f6", range=3, intensity=0.5)],
       note="letreiro de neon de tesoura + coracao para a parede do salao (z 1.9 a 2.6)")
def sign_scissors():
    z = 2.2
    P = [rb((.9, .03, .7), (0, .015, z), "deep", .012)]
    P.append(neon([(p[0] * .55, p[1] * .55) for p in heart_outline(.5, 40)], (0, 0, z + .0 - .12), "glow2", .01, closed=True, y=-.03))
    for sx in (-1, 1):
        P.append(neon([(0, 0), (sx * .12, .24)], (0, 0, z - .28 + .0), "glow", .009, y=-.03))
        P.append(neon(arc2(sx * .13, -.07, .06, 0, 2 * pi, 14), (0, 0, z - .2), "glow", .009, closed=True, y=-.03))
    return P


CAM = ((2.8, -5.0, 1.6), (0.0, 1.2, 1.1), 24)


def VIG(put):
    for x in range(-4, 6, 2):
        for y in range(-4, 5, 2):
            put("floor_pearl_tile", x, y)
    for x in (-2.0, 0.0, 2.0, 4.0):
        put("shared/wall_panel", x, 4.0)
    for y in (-3, -1, 1, 3):
        put("shared/wall_panel", -3.0, y, rz=pi / 2)
    put("mirror_station_lit", -1.5, 3.7)
    put("mirror_station_lit", 0.1, 3.7)
    put("chair_styling_hydraulic", -1.5, 2.6, rz=pi - .5)
    put("chair_styling_hydraulic", 0.1, 2.6, rz=pi + .3)
    put("product_shelf_glass", 2.0, 3.75)
    put("sign_scissors_neon", 3.2, 4.0) if False else None
    put("chandelier_orbs", -.7, 1.2, z=3.2)
    put("reception_desk_curved", 2.4, -1.6, rz=pi / 2 + 0.0)
    put("sofa_waiting_pearl", -2.4, -1.4, rz=pi / 2 * -1)
    put("manicure_table", 1.0, 0.0)
    put("stool_salon_round", 1.0, -.6)
    put("dryer_hood_chair", 2.7, 1.6, rz=pi)
    put("spa_massage_bed", -2.2, 0.7, rz=0) if False else None
    put("towel_warmer_rack", -2.7, 1.4, rz=pi / 2)
    put("trolley_salon", -0.7, 2.6)
    put("shared/plant_potted", 3.4, 2.7)

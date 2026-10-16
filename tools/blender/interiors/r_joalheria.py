"""Joalheria: laca preta + champagne + veludo bordo."""
from lib import *
from lib2 import *
R = "joalheria"
EXPO = -0.7
WORLD = ("#3a2c40", 0.45)


def necklace(cx, cy, cz, w=.12, drop=.1, y_front=-.07, beads=13, pendant=True, mat_chain="trim", mat_bead="white", bead_r=.008):
    pts = []
    for i in range(21):
        t = -1 + 2 * i / 20
        pts.append(Vector((cx + t * w, cy + y_front * (1 - .3 * t * t), cz - drop * (1 - t * t))))
    P = [ck.tube(pts, .0035, mat_chain, minor=4)]
    P.append(cloud([(pts[k].x, pts[k].y, pts[k].z, bead_r) for k in range(2, 19, max(1, 17 // beads))], mat_bead, 6, 4))
    if pendant:
        P.append(crystals([(cx, cy + y_front * .7, cz - drop - .02, .028)], "glass"))
    return P


def ring_jewel(x, y, z, r=.012, gem="glass"):
    return [ring(r, .0035, (x, y, z + r), "trim", n=10, minor=4, rot=(pi / 2, 0, 0)), ck.sph((.013, .013, .013), (x, y, z + r * 2 + .004), gem, n=6, rings=4)]


def bust(x, y, z, mat="fabric", s=1.0):
    bm = bmesh.new()
    merge(bm, ck.bm_lathe([(0, 0), (.08, 0), (.08, .03), (.03, .06), (.035, .15), (.07, .2), (.12, .24), (.14, .3), (.1, .34), (.05, .36), (0, .36)], 16, 1), (x, y, z), (s, s * .6, s))
    return obj(bm, mat)


@piece(R, "floor_black_marble", tags=["floor", "tile"], col="box", walk=True, mount="floor", note="piso laca preta brilhante com fios champagne e medalhao 2x2 m")
def floor_black():
    P = [rb((2, 2, .03), (0, 0, .015), "base", .006, seg=2)]
    P.append(ring(.8, .008, (0, 0, .032), "trim", n=40, minor=4))
    P.append(ring(.55, .008, (0, 0, .032), "trim", n=4, minor=4, rot=(0, 0, pi / 4)))
    P.append(ring(.7, .006, (0, 0, .032), "trim", n=4, minor=4))
    P.append(box((2, .014, .008), (0, -.993, .032), "trim"))
    P.append(box((.014, 2, .008), (-.993, 0, .032), "trim"))
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(box((.28, .28, .005), (sx * .75, sy * .75, .03), "accent2", rot=(0, 0, pi / 4)))
    P.append(box((.3, .3, .006), (0, 0, .031), "accent2", rot=(0, 0, pi / 4)))
    return P


@piece(R, "case_counter_long", tags=["counter", "display", "jewelry", "hero"], col="box", hero=True, mount="floor", use=[dict(id="browse", pos=(0, -.8, 0), face=(0, 1), label="Ver joias")],
       lights=[dict(pos=(0, -.1, 1.3), color="#ffe6b0", range=2.5, intensity=0.7)],
       note="vitrine de balcao 1.6 m: base laca preta, vidro iluminado, veludo bordo, bustos, aneis e colares (h 1.4)")
def case_counter():
    w, d = 1.6, .62
    P = [rb((w, d, .82), (0, 0, .43), "base", .04), rb((w + .06, d + .06, .05), (0, 0, .86), "trim", .015), rb((w + .08, d + .08, .04), (0, 0, .03), "trim", .012)]
    for k in range(3):
        P += frame(.46, .62, .02, (-.5 + k * .5, -d / 2, .44), "trim", d=.015, r=.006)
        P.append(rb((.4, .012, .56), (-.5 + k * .5, -d / 2 - .002, .44), "accent", .005))
    P.append(ck.heart(.14, .012, (0, -d / 2 - .02, .44), "trim", bevel=.004, seg=2))
    P.append(rb((w - .06, d - .06, .03), (0, 0, .9), "fabric", .01))
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(ck.tube([Vector((sx * (w / 2 - .02), sy * (d / 2 - .03), .89)), Vector((sx * (w / 2 - .02), sy * (d / 2 - .03), 1.38))], .012, "trim", minor=6))
    P.append(rb((w - .06, .01, .46), (0, -d / 2 + .03, 1.14), "glass", .003))
    P.append(rb((w - .06, .01, .46), (0, d / 2 - .03, 1.14), "glass", .003))
    for sx in (-1, 1):
        P.append(rb((.01, d - .06, .46), (sx * (w / 2 - .03), 0, 1.14), "glass", .003))
    P.append(rb((w, d, .03), (0, 0, 1.4), "trim", .01))
    P.append(rb((w - .1, d - .1, .01), (0, 0, 1.38), "glow", .003))
    P.append(bust(-.55, 0, .915, "fabric", 1.0))
    P += necklace(-.55, 0, 1.2, .1, .08, -.065)
    P.append(bust(.55, 0, .915, "fabric", 1.0))
    P += necklace(.55, 0, 1.2, .11, .1, -.065, 15, True, "trim", "glass")
    for i in range(3):
        P.append(pillow((.12, .09, .05), (-.15 + i * .15, 0, .945), "accent2", k=.4))
        P += ring_jewel(-.15 + i * .15, 0, .97)
    for k in range(3):
        P.append(ck.heart(.09, .012, (-.1 + k * .1, -.2, .93), "trim", rot=(pi / 2, 0, 0), bevel=.004, seg=1))
    return P


@piece(R, "case_tower_glass", tags=["display", "jewelry", "hero"], col="box", hero=True, mount="floor", use=[dict(id="browse", pos=(0, -.7, 0), face=(0, 1), label="Ver joias")],
       lights=[dict(pos=(0, -.1, 1.5), color="#ffe6b0", range=2.5, intensity=0.8)],
       note="torre de vidro iluminada 0.55 x 0.55 x 1.9 com bustos e colares em 3 niveis")
def case_tower():
    P = [rb((.6, .6, .4), (0, 0, .22), "base", .03), rb((.64, .64, .05), (0, 0, .43), "trim", .015), rb((.66, .66, .04), (0, 0, .02), "trim", .012)]
    P.append(ck.heart(.14, .012, (0, -.31, .22), "trim", bevel=.004, seg=2))
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(ck.tube([Vector((sx * .27, sy * .27, .45)), Vector((sx * .27, sy * .27, 1.85))], .014, "trim", minor=6))
    for (a, b, c, d_) in ((0, -.27, .55, .01), (0, .27, .55, .01)):
        pass
    for sy in (-1, 1):
        P.append(rb((.52, .01, 1.38), (0, sy * .27, 1.15), "glass", .003))
    for sx in (-1, 1):
        P.append(rb((.01, .52, 1.38), (sx * .27, 0, 1.15), "glass", .003))
    P.append(rb((.62, .62, .05), (0, 0, 1.87), "trim", .015))
    P.append(rb((.5, .5, .015), (0, 0, 1.83), "glow", .003))
    for z in (.62, 1.0, 1.4):
        P.append(rb((.5, .5, .02), (0, 0, z), "fabric", .008))
        P.append(bust(0, 0, z + .01, "accent2" if z > 1 else "fabric", .9))
        P += necklace(0, 0, z + .28, .1, .08, -.06, 13, True, "trim", "white" if z < 1.2 else "glass")
    return P


@piece(R, "bust_necklace_stand", tags=["jewelry", "tabletop", "decor"], col=None, mount="tabletop", note="busto de veludo com colar de perolas e pingente de cristal (h 0.4)")
def bust_stand():
    P = [bust(0, 0, 0, "fabric", 1.1)]
    P += necklace(0, 0, .28, .11, .09, -.065, 15, True, "trim", "white", .01)
    P += necklace(0, 0, .3, .09, .05, -.07, 11, False, "trim", "glass", .007)
    return P


@piece(R, "ring_tree_stand", tags=["jewelry", "tabletop", "decor"], col=None, mount="tabletop", note="expositor escalonado com almofadas de veludo e aneis (0.35 x 0.25)")
def ring_tree():
    P = [rb((.4, .24, .03), (0, 0, .015), "trim", .01)]
    for k in range(3):
        z = .03 + k * .06
        P.append(rb((.36 - k * .09, .2, .06), (0, .0, z + .03), "base", .012))
        P.append(pillow((.3 - k * .09, .16, .03), (0, 0, z + .075), "fabric", k=.4))
        for i in range(4 - k):
            P += ring_jewel(-.1 + i * (.2 / max(1, 3 - k)) * 1.0 + k * .03, 0, z + .085, .014, "glass" if i % 2 else "accent2")
    P.append(ck.heart(.07, .01, (0, -.12, .12), "trim", rot=(pi / 2, 0, 0), bevel=.003, seg=1))
    return P


@piece(R, "tray_velvet_jewelry", tags=["jewelry", "tabletop"], col=None, mount="tabletop", note="bandeja de veludo com colar, brincos, pulseira e broche de coracao (0.4 m)")
def tray():
    P = [rb((.42, .3, .025), (0, 0, .0125), "trim", .008), rb((.38, .26, .02), (0, 0, .03), "fabric", .006)]
    P.append(ring(.06, .005, (-.12, -.03, .045), "trim", n=14, minor=4))
    P.append(cloud([(-.12 + .06 * cos(a), -.03 + .06 * sin(a), .05, .007) for a in [k * 2 * pi / 12 for k in range(12)]], "white", 6, 4))
    for sx in (-1, 1):
        P.append(ck.sph((.016, .016, .016), (.05 + sx * .02, .06, .05), "white", n=6, rings=4))
        P.append(crystals([(.05 + sx * .02, .06, .035, .016)], "glass"))
    P += necklace(.1, -.02, .06, .1, .0, 0.0, 12, True, "trim", "white")
    P.append(ck.heart(.07, .012, (.14, .08, .045), "trim", rot=(pi / 2, 0, 0), bevel=.004, seg=1))
    return P


@piece(R, "counter_checkout_black", tags=["counter", "register", "hero"], col="box", hero=True, mount="floor", use=[dict(id="pay", pos=(0, -.9, 0), face=(0, 1), label="Pagar")],
       note="balcao de caixa 1.8 m laca preta com frente canelada dourada, leitor, caixa de presente com fita (h 1.05). Atendente em +Y")
def counter_black():
    w, d = 1.8, .65
    P = [rb((w, d, .92), (0, 0, .49), "base", .05), rb((w + .1, d + .1, .06), (0, 0, 1.0), "accent", .02), rb((w + .12, d + .12, .05), (0, 0, .03), "trim", .015)]
    P.append(ck.tube(rect_pts(w + .08, d + .08, 1.035, 0, 0, .05), .012, "trim", minor=5, closed=True))
    for i in range(17):
        P.append(ck.cyl(.03, .8, (-.8 + i * .1, -d / 2, .5), "trim", n=8))
    P.append(rb((.28, .2, .02), (-.5, 0, 1.04), "deep", .01))
    P.append(rb((.22, .02, .16), (-.5, .12, 1.17), "deep", .008, rot=(-.2, 0, 0)))
    P.append(rb((.18, .01, .12), (-.5, .108, 1.17), "glow", .003, rot=(-.2, 0, 0)))
    P.append(rb((.22, .18, .12), (.5, 0, 1.09), "accent2", .02))
    P.append(rb((.23, .03, .12), (.5, 0, 1.09), "trim", .006))
    P.append(rb((.03, .19, .12), (.5, 0, 1.09), "trim", .006))
    P += bow(.2, (.5, 0, 1.18), "trim", knot="trim")
    P.append(bust(0, 0, 1.03, "fabric", .8))
    P += necklace(0, 0, 1.28, .09, .07, -.055)
    P.append(ck.heart(.2, .02, (0, -d / 2 - .03, .5), "trim", bevel=.007, seg=2))
    return P


@piece(R, "chandelier_gold_cascade", tags=["light", "ceiling", "hero"], col=None, mount="ceiling", hero=True, lights=[dict(pos=(0, 0, -1.2), color="#ffe2a0", range=7, intensity=1.2)],
       note="lustre grande dourado com 8 bracos, velas luminosas e cascata de cristais (pende 1.5 m, diametro 1.3)")
def chandelier_cascade():
    P = [ck.cyl(.12, .04, (0, 0, -.02), "trim", n=14), ck.tube([Vector((0, 0, -.04)), Vector((0, 0, -.55))], .018, "trim", minor=6)]
    P.append(ck.lathe([(0, -.35), (.05, -.42), (.1, -.5), (.12, -.6), (.1, -.7), (.04, -.78), (0, -.82)], "trim", n=14, smooth=1))
    P.append(ring(.62, .018, (0, 0, -.82), "trim", n=40, minor=6))
    P.append(ring(.3, .014, (0, 0, -1.05), "trim", n=32, minor=6))
    dr = []
    for k in range(8):
        a = 2 * pi * k / 8
        P.append(ck.tube([Vector((0, 0, -.65)), Vector((.3 * cos(a), .3 * sin(a), -.6)), Vector((.5 * cos(a), .5 * sin(a), -.72)), Vector((.62 * cos(a), .62 * sin(a), -.82))], .014, "trim", minor=5))
        P.append(ck.lathe([(0, 0), (.03, 0), (.04, .03), (.02, .05), (0, .05)], "trim", (.62 * cos(a), .62 * sin(a), -.82), n=8))
        P.append(ck.sph((.035, .035, .08), (.62 * cos(a), .62 * sin(a), -.74), "glow", n=8, rings=4))
        P.append(ck.tube([Vector((.62 * cos(a), .62 * sin(a), -.82)), Vector((.46 * cos(a + .2) , .46 * sin(a + .2), -.9)), Vector((.3 * cos(a + .39), .3 * sin(a + .39), -1.05))], .004, "trim", minor=3)) if False else None
    for k in range(36):
        a = 2 * pi * k / 36
        for j in range(4):
            dr.append((.62 * cos(a) * (1 - .1 * j), .62 * sin(a) * (1 - .1 * j), -.88 - j * .1 - (.05 if k % 2 else 0), .045))
    for k in range(20):
        a = 2 * pi * k / 20
        dr.append((.3 * cos(a), .3 * sin(a), -1.12 - .04 * (k % 2), .05))
    P.append(crystals(dr))
    P.append(crystals([(0, 0, -1.3, .14), (0, 0, -1.18, .07)]))
    return [p for p in P if p is not None]


@piece(R, "armchair_velvet_wing", tags=["seat", "lounge"], col="box", mount="floor", sit=[dict(id="sit", pos=(0, -.05, .5), face=(0, -1))],
       note="poltrona orelhao de veludo bordo com tachas douradas (0.85 x 0.8 x 1.1)")
def armchair_wing():
    w, d = .85, .8
    P = [rb((w, d, .26), (0, 0, .29), "fabric", .08), pillow((w - .4, d - .3, .18), (0, -.07, .47), "fabric", k=.45)]
    P.append(rb((w - .15, .22, 1.0), (0, d / 2 - .11, .78), "fabric", .1))
    P += tuft(w - .4, .6, .1, (0, d / 2 - .22, .82), "fabric", sx=.16)
    for sx in (-1, 1):
        P.append(pillow((.2, d - .1, .52), (sx * (w / 2 - .1), 0, .5), "fabric", k=.4))
        P.append(rb((.16, .28, .55), (sx * (w / 2 - .18), d / 2 - .22, 1.08), "fabric", .07, rot=(0, sx * .12, 0)))
        P.append(ck.cyl(.09, .2, (sx * (w / 2 - .1), -d / 2 + .06, .76), "fabric", rot=(0, pi / 2, 0), n=12, bevel=.03))
    P.append(ck.tube([Vector((-w / 2 + .03, -d / 2 + .01, .3)), Vector((w / 2 - .03, -d / 2 + .01, .3))], .01, "trim", minor=4))
    for i in range(10):
        P.append(ck.sph((.02, .02, .02), (-w / 2 + .07 + i * (w - .14) / 9, -d / 2 - .005, .32), "trim", n=6, rings=3))
    for sx in (-1, 1):
        for sy in (-1, 1):
            P += leg_curve(sx * (w / 2 - .08), sy * (d / 2 - .08), .17, .022, "trim", out=sx * .03)
    return P


@piece(R, "loveseat_velvet_tufted", tags=["seat", "lounge"], col="box", mount="floor", sit=[dict(id="sit_l", pos=(-.38, -.05, .5), face=(0, -1)), dict(id="sit_r", pos=(.38, -.05, .5), face=(0, -1))],
       note="namoradeira capitone bordo 1.6 m, costas curvas, pes dourados")
def loveseat():
    w, d = 1.6, .85
    P = [rb((w, d, .24), (0, 0, .29), "fabric", .08), pillow((w - .44, d - .3, .18), (0, -.08, .47), "fabric", k=.45)]
    P.append(rb((w - .1, .24, .8), (0, d / 2 - .12, .73), "fabric", .1))
    P += tuft(w - .38, .52, .12, (0, d / 2 - .24, .78), "fabric", sx=.17)
    for sx in (-1, 1):
        P.append(pillow((.22, d, .48), (sx * (w / 2 - .11), 0, .5), "fabric", k=.45))
    P.append(ck.tube([Vector((-w / 2 + .05, -d / 2 + .01, .22)), Vector((w / 2 - .05, -d / 2 + .01, .22))], .014, "trim", minor=5))
    for sx in (-1, 1):
        for sy in (-1, 1):
            P += leg_curve(sx * (w / 2 - .1), sy * (d / 2 - .1), .18, .022, "trim", out=sx * .03)
    P.append(pillow((.38, .13, .34), (-.5, .2, .68), "trim", rot=(-.3, 0, .2), k=.4))
    P.append(ck.heart(.32, .12, (.5, .2, .68), "accent2", rot=(-.3, 0, 0), bevel=.045, seg=3))
    return P


@piece(R, "safe_heart_vault", tags=["safe", "decor", "hero"], col="box", hero=True, mount="floor", use=[dict(id="safe", pos=(0, -.8, 0), face=(0, 1), label="Abrir cofre")],
       note="cofre fofo: corpo preto arredondado com porta redonda dourada, disco de segredo e coracao (1.0 x 0.7 x 1.25)")
def safe():
    w, d, h = 1.0, .7, 1.2
    P = [rb((w, d, h), (0, 0, h / 2 + .06), "base", .1), rb((w + .06, d + .06, .06), (0, 0, .03), "trim", .02)]
    P += ball_feet([-.38, .38], [-.25, .25], .05, "trim", z=.05) if False else []
    for sx in (-1, 1):
        P.append(ck.cyl(.05, .1, (sx * .4, .0, .0), "trim", n=10)) if False else None
    P.append(ck.cyl(.36, .06, (0, -d / 2 - .0, h / 2 + .06), "trim", rot=(pi / 2, 0, 0), n=40, bevel=.015))
    P.append(ck.cyl(.31, .04, (0, -d / 2 - .04, h / 2 + .06), "accent", rot=(pi / 2, 0, 0), n=40, bevel=.01))
    P.append(ring(.27, .014, (0, -d / 2 - .07, h / 2 + .06), "trim", n=36, minor=6, rot=(pi / 2, 0, 0)))
    P.append(ck.cyl(.12, .05, (0, -d / 2 - .08, h / 2 + .06), "trim", rot=(pi / 2, 0, 0), n=24, bevel=.012))
    for k in range(6):
        a = 2 * pi * k / 6
        P.append(ck.tube([Vector((0, -d / 2 - .1, h / 2 + .06)), Vector((.2 * cos(a), -d / 2 - .1, h / 2 + .06 + .2 * sin(a)))], .014, "trim", minor=5))
        P.append(ck.sph((.05, .05, .05), (.2 * cos(a), -d / 2 - .1, h / 2 + .06 + .2 * sin(a)), "trim", n=8, rings=4))
    P.append(ck.heart(.12, .03, (0, -d / 2 - .12, h / 2 + .06), "accent2", bevel=.01, seg=2))
    P.append(ck.cyl(.05, .02, (.0, -d / 2 - .01, h - .03), "glow2", rot=(pi / 2, 0, 0), n=14)) if False else None
    for z in (.3, h - .1):
        for sx in (-1, 1):
            P.append(ck.cyl(.035, .1, (sx * (w / 2 - .06), -d / 2 + .02, z + .06), "trim", rot=(pi / 2, 0, 0), n=10))
    P.append(ck.heart(.2, .02, (0, 0, h + .12 + .0), "trim", rot=(0, 0, 0), bevel=.007, seg=2) if False else rb((.5, .3, .02), (0, 0, h + .07), "fabric", .006))
    P += necklace(0, 0, h + .24, .08, .07, -.0, 11, True, "trim", "white") if False else []
    return [p for p in P if p is not None]


@piece(R, "table_side_gold_glass", tags=["table", "lounge"], col="cyl", mount="floor", note="mesinha lateral redonda dourada com tampo de vidro (0.5 m, h 0.55)")
def table_gold():
    P = [ck.cyl(.25, .02, (0, 0, .54), "glass", n=28, bevel=.006), ring(.25, .009, (0, 0, .54), "trim", n=28, minor=5)]
    P.append(ring(.2, .01, (0, 0, .15), "trim", n=28, minor=5))
    for k in range(3):
        a = 2 * pi * k / 3 + .5
        P.append(ck.tube([Vector((.22 * cos(a), .22 * sin(a), .52)), Vector((.17 * cos(a), .17 * sin(a), .3)), Vector((.22 * cos(a), .22 * sin(a), .0))], .014, "trim", minor=6))
    P.append(ck.lathe([(0, 0), (.04, 0), (.05, .06), (.03, .12), (.035, .15), (0, .15)], "accent2", (0, 0, .55), n=12, smooth=1))
    P += potted_flowers((0, 0, .75), 4, ("white", "accent2")) if False else []
    return P


@piece(R, "pedestal_dome_gem", tags=["display", "decor", "hero"], col="cyl", hero=True, mount="floor",
       lights=[dict(pos=(0, 0, 1.3), color="#ffe6b0", range=2, intensity=0.5)],
       note="pedestal de laca preta com redoma de vidro e diamante gigante iluminado (diam 0.5, h 1.5)")
def pedestal_gem():
    P = [ck.lathe([(0, 0), (.25, 0), (.25, .05), (.18, .1), (.16, .95), (.22, 1.0), (.24, 1.05), (0, 1.05)], "base", n=24, smooth=1)]
    P.append(ring(.245, .014, (0, 0, .06), "trim", n=28, minor=5))
    P.append(ring(.235, .014, (0, 0, 1.03), "trim", n=28, minor=5))
    P.append(ck.cyl(.2, .03, (0, 0, 1.07), "fabric", n=24))
    P.append(ck.lathe([(.22, 1.07), (.22, 1.3), (.18, 1.5), (.08, 1.62), (0, 1.65)], "glass", n=24, smooth=1))
    P.append(ck.sph(.03, (0, 0, 1.67), "trim", n=8, rings=5))
    P.append(ck.lathe([(0, 1.12), (.1, 1.18), (.14, 1.3), (.12, 1.34), (0, 1.5)], "glass", n=8))
    P.append(ck.lathe([(0, 1.14), (.06, 1.2), (.08, 1.3), (.06, 1.34), (0, 1.42)], "glow", n=8))
    return P


@piece(R, "stanchion_rope_pair", tags=["decor", "barrier"], col=None, mount="floor", note="2 postes dourados com corda de veludo bordo (1.5 m entre postes, h 0.95)")
def stanchion():
    P = []
    for sx in (-.75, .75):
        P.append(ck.lathe([(0, 0), (.15, 0), (.15, .02), (.04, .06), (.03, .85), (.05, .88), (.06, .93), (0, .97)], "trim", (sx, 0, 0), n=18, smooth=1))
        P.append(ck.sph((.1, .1, .1), (sx, 0, .96), "trim", n=10, rings=6))
    pts = [Vector((-.75 + 1.5 * i / 14, 0, .84 - .16 * sin(pi * i / 14))) for i in range(15)]
    P.append(ck.tube(pts, .022, "fabric", minor=8))
    P.append(ck.sph((.05, .05, .05), (-.75, 0, .84), "trim", n=8, rings=4))
    P.append(ck.sph((.05, .05, .05), (.75, 0, .84), "trim", n=8, rings=4))
    return P


@piece(R, "wall_shadowbox_lit", tags=["display", "wall", "jewelry"], col=None, mount="wall", lights=[dict(pos=(0, -.2, 1.7), color="#ffe6b0", range=2, intensity=0.4)],
       note="nicho de parede iluminado com colar em bustos (1.0 x 0.2, z 1.2 a 2.1)")
def shadowbox():
    P = [rb((1.0, .04, .95), (0, .02, 1.65), "base", .01)]
    P += frame(1.06, 1.0, .06, (0, -.05, 1.65), "trim", d=.1, r=.02)
    P.append(rb((.9, .01, .85), (0, .045, 1.65), "fabric", .004))
    P.append(rb((.9, .01, .85), (0, -.09, 1.65), "glass", .003))
    P.append(rb((.9, .05, .02), (0, -.05, 2.07), "glow", .004))
    P.append(bust(-.25, -.0, 1.25, "accent2", .9))
    P += necklace(-.25, 0, 1.53, .1, .08, -.065)
    P.append(bust(.25, -.0, 1.25, "accent2", .9))
    P += necklace(.25, 0, 1.53, .09, .06, -.065, 11, True, "trim", "glass")
    return P


@piece(R, "mirror_tryon_stand", tags=["mirror", "tabletop", "jewelry"], col=None, mount="tabletop", use=[dict(id="tryon", pos=(0, -.6, 0), face=(0, 1), label="Provar joias")],
       note="espelho oval de mesa com moldura dourada e pedestal (0.5 m)")
def mirror_tryon():
    P = [ck.lathe([(0, 0), (.1, 0), (.09, .03), (.03, .06), (.025, .13), (0, .13)], "trim", n=16, smooth=1)]
    cz, rx, rz = .35, .17, .22
    P.append(ck.prism([(rx * cos(2 * pi * i / 32), rz * sin(2 * pi * i / 32)) for i in range(32)], .012, "xz", "mirror", (0, .0, cz)))
    P.append(ck.tube([Vector(((rx + .01) * cos(2 * pi * i / 32), -.01, cz + (rz + .01) * sin(2 * pi * i / 32))) for i in range(32)], .014, "trim", minor=6, closed=True))
    P.append(ck.tube([Vector((0, 0, .12)), Vector((0, 0, cz - rz + .01))], .014, "trim", minor=5))
    P.append(ck.heart(.07, .012, (0, -.02, cz + rz + .06), "trim", bevel=.004, seg=1))
    return P


@piece(R, "sign_gold_diamond", tags=["wall", "sign", "light"], col=None, mount="wall", lights=[dict(pos=(0, -.2, 2.2), color="#ffe2a0", range=3, intensity=0.5)],
       note="letreiro neon dourado de diamante com brilhos (z 1.8 a 2.6)")
def sign_diamond():
    z = 2.2
    P = [rb((.9, .03, .7), (0, .015, z), "accent", .012)]
    pts = [(-.28, .06), (-.14, .22), (.14, .22), (.28, .06), (0, -.26)]
    P.append(neon(pts, (0, 0, z), "glow", .012, closed=True, y=-.03))
    P.append(neon([(-.28, .06), (.28, .06)], (0, 0, z), "glow", .01, y=-.03))
    P.append(neon([(-.14, .22), (-.07, .06), (0, -.26), (.07, .06), (.14, .22)], (0, 0, z), "glow", .008, y=-.03))
    for (x, zz, s) in ((.34, .28, .05), (-.36, .22, .035), (.4, -.1, .03)):
        P.append(neon([(x, zz - s), (x, zz + s)], (0, 0, z), "glow", .006, y=-.03))
        P.append(neon([(x - s, zz), (x + s, zz)], (0, 0, z), "glow", .006, y=-.03))
    return P


CAM = ((2.8, -5.0, 1.6), (0.0, 1.2, 1.1), 24)


def VIG(put):
    for x in range(-4, 6, 2):
        for y in range(-4, 5, 2):
            put("floor_black_marble", x, y)
    for x in (-2.0, 0.0, 2.0, 4.0):
        put("shared/wall_panel", x, 4.0)
    for y in (-3, -1, 1, 3):
        put("shared/wall_panel", -3.0, y, rz=pi / 2)
    put("wall_shadowbox_lit", -1.2, 4.0)
    put("sign_gold_diamond", 1.2, 4.0)
    put("shared/wall_sconce", -2.3, 4.0); put("shared/wall_sconce", 2.4, 4.0)
    put("case_counter_long", 0.2, 2.6)
    put("case_tower_glass", -1.8, 2.8)
    put("counter_checkout_black", 2.4, 2.0, rz=-pi / 2 * 0.0)
    put("pedestal_dome_gem", -0.9, 0.2)
    put("armchair_velvet_wing", -2.2, -.3, rz=-pi / 2 + .4)
    put("table_side_gold_glass", -2.5, -1.4)
    put("loveseat_velvet_tufted", 1.4, -.9, rz=.0)
    put("safe_heart_vault", -2.6, 1.2, rz=pi / 2) if False else None
    put("stanchion_rope_pair", 0.9, 0.7)
    put("chandelier_gold_cascade", 0.2, 1.0, z=3.2)
    put("bust_necklace_stand", 0.3, 2.6, z=1.4) if False else None
    put("ring_tree_stand", -.4, 2.6, z=1.4) if False else None
    put("tray_velvet_jewelry", .8, 2.6, z=1.4) if False else None
    put("safe_heart_vault", 3.3, -0.3, rz=pi / 2 * 1.0)

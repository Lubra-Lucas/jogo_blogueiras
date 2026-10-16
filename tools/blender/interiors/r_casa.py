"""Casa dos Sonhos: quarto/closet/sala/banheiro em rosa + ouro, capitone, cristais, coracoes."""
from lib import *
R = "casa"


def post(x, y, h=2.3):
    return ck.lathe([(0, 0), (.065, 0), (.065, .1), (.04, .2), (.04, h * .45), (.06, h * .5), (.04, h * .55), (.04, h - .12),
                     (.065, h - .08), (.04, h - .03), (0, h)], "trim", (x, y, 0), n=14, smooth=1)


@piece(R, "bed_canopy", tags=["bed", "bedroom", "hero"], col="box", hero=True, mount="floor",
       sit=[dict(id="sit_edge", pos=(0, -.8, .74), face=(0, -1), label="Sentar na cama")],
       use=[dict(id="sleep", pos=(0, .15, .74), face=(0, -1), label="Deitar")],
       note="cama de dossel king com cabeceira capitone, cortinas e cortinado (2.1 x 2.3 x 2.4 m). colisor so ate a altura da cama",
       colbox=((-1.0, 1.0), (-1.1, 1.2), (0, 1.0)))
def bed_canopy():
    P = []
    P.append(rb((1.9, 2.15, .3), (0, 0, .27), "base", .06))
    P.append(rb((1.93, 2.18, .03), (0, 0, .39), "trim", .01))
    P += ball_feet([-.85, .85], [-.95, .95], .07, "trim", z=.07)
    P.append(pillow((1.7, 2.0, .3), (0, 0, .58), "white"))
    P.append(pillow((1.76, 1.35, .2), (0, -.34, .7), "accent", k=.4))
    P.append(pillow((1.78, .3, .22), (0, .35, .72), "accent2", k=.45))
    for sx in (-1, 1):
        P.append(pillow((.62, .4, .2), (sx * .5, .75, .9), "white", rot=(.4, 0, 0)))
    P.append(pillow((.62, .4, .2), (0, .8, .95), "accent", rot=(.4, 0, 0)))
    P.append(ck.heart(.5, .17, (.0, .52, 1.0), "accent2", rot=(.2, 0, 0), bevel=.06, seg=3))
    P.append(ck.cyl(.09, .7, (0, -.1, .88), "soft", rot=(0, pi / 2, 0), n=14, bevel=.03))
    P += tuft(1.9, 1.15, .14, (0, 1.04, .99), "fabric", sx=.18)
    P += frame(1.98, 1.22, .06, (0, 1.12, .99), "trim", d=.1)
    P.append(cloud([(-.9 + k * .3, 1.07, 1.6 + (.03 if k % 2 else 0), (.32, .16, .22)) for k in range(7)], "fabric", 10, 5))
    P.append(ck.tube([Vector((-.95 + k * .1583, 1.0, 1.58 + .1 * sin(k * pi / 6) * 0 + .0)) for k in range(13)], .014, "trim", minor=5))
    P.append(ck.heart(.5, .08, (0, 1.12, 1.9), "trim", bevel=.025, seg=3))
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(post(sx * .98, sy * 1.08))
    top = 2.3
    for sy in (-1, 1):
        P.append(ck.tube([Vector((-.98, sy * 1.08, top)), Vector((.98, sy * 1.08, top))], .024, "trim", minor=6))
    for sx in (-1, 1):
        P.append(ck.tube([Vector((sx * .98, -1.08, top)), Vector((sx * .98, 1.08, top))], .024, "trim", minor=6))
    for sx in (-1, 1):
        P.append(drape(.62, 1.65, (sx * .68, 1.08, top - .02), "fabric", folds=3, amp=.05, pinch=.2, pinch_z=.55))
        P.append(drape(.7, 1.65, (sx * .98, -.72, top - .02), "fabric", folds=3, amp=.05, pinch=.2, pinch_z=.55, rot=(0, 0, pi / 2)))
    for sy in (-1, 1):
        P.append(drape(1.96, .3, (0, sy * 1.1, top - .02), "accent", folds=9, amp=.025, per=4, nz=3))
    for sx in (-1, 1):
        P.append(drape(2.16, .3, (sx * 1.0, 0, top - .02), "accent", folds=10, amp=.025, per=4, nz=3, rot=(0, 0, pi / 2)))
    P.append(ck.sph((.12, .12, .12), (0, 0, top + .03), "trim", n=8, rings=5))
    return P


@piece(R, "nightstand_pink", tags=["table", "bedroom"], col="box", mount="floor", note="criado-mudo 0.5 x 0.4 x 0.72 com 2 gavetas",
       use=[dict(id="lamp", pos=(0, -.5, 0), face=(0, 1), label="Abajur")])
def nightstand():
    P = [rb((.5, .4, .48), (0, 0, .46), "base", .05)]
    P.append(rb((.57, .46, .04), (0, 0, .72), "white", .018))
    P.append(ck.tube(rect_pts(.54, .43, .745, 0, 0, .05), .008, "trim", minor=5, closed=True))
    for k, z in enumerate((.55, .36)):
        P.append(rb((.42, .025, .15), (0, -.205, z), "accent", .02))
        P.append(knob((0, -.23, z), "trim", .022))
    for sx in (-1, 1):
        for sy in (-1, 1):
            P += leg_curve(sx * .2, sy * .15, .24, .022, "trim", out=sx * .03)
    return P


@piece(R, "lamp_table_pink", tags=["light", "tabletop", "bedroom"], col=None, mount="tabletop", lights=[dict(pos=(0, 0, .45), color="#ffd9a0", range=3.5, intensity=0.7)],
       note="abajur de mesa com base de vidro e cupula pregueada")
def lamp_table():
    P = [ck.lathe([(0, 0), (.1, 0), (.1, .02), (.06, .06), (.07, .16), (.035, .26), (.025, .3), (0, .3)], "trim", n=18, smooth=1),
         ck.lathe([(.03, .1), (.075, .12), (.08, .2), (.05, .28), (.02, .3), (.01, .2)], "glass", n=16, smooth=1)]
    P.append(ck.lathe([(.06, .3), (.2, .32), (.17, .5), (.1, .52), (.0, .52)], "accent", n=24, flute=(12, .05), smooth=1))
    P.append(ck.sph((.06, .06, .12), (0, 0, .42), "glow", n=8, rings=4))
    P.append(ck.sph(.03, (0, 0, .54), "trim", n=8, rings=5))
    return P


@piece(R, "vanity_hollywood", tags=["vanity", "bedroom", "hero"], col="box", hero=True, mount="floor",
       use=[dict(id="vanity", pos=(0, -.85, 0), face=(0, 1), label="Maquiagem / espelho")],
       lights=[dict(pos=(0, -.15, 1.5), color="#ffe2b0", range=3, intensity=0.9)],
       note="penteadeira coracao com espelho em arco e lampadas Hollywood (1.5 x 0.6 x 2.1 m)")
def vanity():
    P = []
    P.append(rb((1.6, .6, .05), (0, 0, .735), "white", .02))
    P.append(ck.tube(rect_pts(1.57, .57, .765, 0, 0, .06), .01, "trim", minor=6, closed=True))
    for sx in (-1, 1):
        P.append(rb((.44, .52, .62), (sx * .56, 0, .4), "base", .04))
        for z in (.58, .42, .26):
            P.append(rb((.36, .02, .12), (sx * .56, -.265, z), "accent", .01))
            P.append(knob((sx * .56, -.285, z)))
        P += ball_feet([sx * .56 - .15, sx * .56 + .15], [-.2, .2], .035, "trim", z=.045)
    P.append(rb((.62, .05, .2), (0, -.2, .63), "accent", .015))
    P.append(ck.heart(.24, .03, (0, -.24, .63), "trim", bevel=.01, seg=2))
    # espelho em arco
    z0 = .86
    mw, rect = 1.2, .62
    pts = [(x, z + z0) for x, z in arch_pts(mw, rect, 18)]
    P.append(prism(pts, .02, "xz", "mirror", (0, .22, 0)))
    P.append(prism([(x * 1.07, (z + z0 - .02)) for x, z in arch_pts(mw, rect, 18)], .03, "xz", "white", (0, .255, 0)))
    outline = [Vector((x * 1.0, .2, z)) for (x, z) in pts]
    P.append(ck.tube(outline, .022, "trim", minor=6, closed=True))
    # lampadas
    pos = []
    path = [(x * 1.06, z - .0) for (x, z) in pts] + [(pts[0][0] * 1.06, pts[0][1])]
    total = 0
    seg = []
    for i in range(len(path) - 1):
        d = sqrt((path[i + 1][0] - path[i][0]) ** 2 + (path[i + 1][1] - path[i][1]) ** 2)
        seg.append(d)
    L = sum(seg)
    n = 26
    acc, k = 0, 0
    for j in range(n):
        t = L * j / n
        while k < len(seg) - 1 and acc + seg[k] < t:
            acc += seg[k]
            k += 1
        u = (t - acc) / seg[k]
        x = path[k][0] + (path[k + 1][0] - path[k][0]) * u
        z = path[k][1] + (path[k + 1][1] - path[k][1]) * u
        pos.append((x, .18, z))
    P.append(bulbs(pos, .028))
    P.append(ck.heart(.3, .04, (0, .2, z0 + rect + .6 + .12), "trim", bevel=.012, seg=2))
    # objetos na mesa
    for i, (x, h, m) in enumerate(((-.55, .17, "glass"), (-.42, .12, "accent2"), (-.68, .1, "glass"))):
        P.append(ck.lathe([(0, 0), (.04, 0), (.045, h * .6), (.02, h), (0, h)], m, (x, .0, .76), n=12, smooth=1))
        P.append(ck.sph(.022, (x, 0, .77 + h), "trim", n=8, rings=4))
    P.append(ck.lathe([(0, 0), (.05, 0), (.05, .1), (0, .1)], "trim", (.55, .05, .76), n=14))
    for k in range(6):
        a = 2 * pi * k / 6
        P.append(ck.tube([Vector((.55 + .02 * cos(a), .05 + .02 * sin(a), .86)), Vector((.55 + .05 * cos(a), .05 + .05 * sin(a), .98))], .006, "deep", minor=4))
        P.append(ck.sph(.014, (.55 + .05 * cos(a), .05 + .05 * sin(a), .985), "accent2", n=6, rings=3))
    P.append(oval_slab(.14, .09, .01, (.3, -.05, .76), "accent", bevel=.004))
    P.append(ck.heart(.07, .02, (.3, -.05, .778), "trim", rot=(pi / 2, 0, 0), bevel=.006, seg=2))
    return P


@piece(R, "stool_tufted", tags=["seat", "bedroom"], col="cyl", mount="floor", sit=[dict(id="sit", pos=(0, 0, .46), face=(0, -1), label="Sentar")],
       note="banquinho capitone redondo, assento a 0.46 m")
def stool_tufted():
    P = [ck.cyl(.24, .12, (0, 0, .39), "fabric", n=22, bevel=.045, seg=3)]
    P.append(ck.sph((.42, .42, .12), (0, 0, .44), "fabric", n=20, rings=6))
    P.append(ring(.235, .012, (0, 0, .34), "trim", n=24, minor=6))
    for k in range(6):
        a = 2 * pi * k / 6
        P.append(ck.sph((.03, .03, .02), (.12 * cos(a), .12 * sin(a), .495), "trim", n=6, rings=3))
    P.append(ck.sph((.03, .03, .02), (0, 0, .5), "trim", n=6, rings=3))
    for sx in (-1, 1):
        for sy in (-1, 1):
            P += leg_curve(sx * .15, sy * .15, .34, .018, "trim", out=sx * .03, foot=True)
    return P


@piece(R, "pouf_round", tags=["seat", "living"], col="cyl", mount="floor", sit=[dict(id="sit", pos=(0, 0, .42), face=(0, -1))],
       note="pufe redondo capitone com piping dourado (0.55 m)")
def pouf():
    P = [ck.cyl(.3, .36, (0, 0, .2), "fabric", n=26, bevel=.1, seg=4)]
    P.append(ring(.3, .014, (0, 0, .36), "trim", n=28, minor=6))
    P.append(ring(.3, .014, (0, 0, .06), "trim", n=28, minor=6))
    for k in range(8):
        a = 2 * pi * k / 8
        P.append(ck.sph((.035, .035, .02), (.14 * cos(a), .14 * sin(a), .385), "trim", n=6, rings=3))
    P.append(ck.sph((.035, .035, .02), (0, 0, .39), "trim", n=6, rings=3))
    P.append(ck.cyl(.24, .02, (0, 0, .015), "trim", n=22))
    return P


def sofa_body(w, d, seat_h, back_h):
    P = []
    P.append(rb((w, d, .26), (0, 0, .25), "fabric", .08))
    P.append(pillow((w - .5, d - .22, .2), (0, -.05, .45), "fabric", k=.4))
    P += tuft(w - .5, back_h - .4, .17, (0, d / 2 - .1, .45 + (back_h - .4) / 2 + .12), "fabric", sx=.17)
    P.append(pillow((w - .55, .22, back_h - .35), (0, d / 2 - .06, .3 + back_h / 2 + .02), "fabric", k=.3) if False else ck.sph(.01, (0, 0, 0), "fabric", n=4, rings=3))
    for sx in (-1, 1):
        P.append(pillow((.26, d, .56), (sx * (w / 2 - .13), 0, .5), "fabric", k=.42))
        P += tuft(.2, .38, .08, (sx * (w / 2 - .13), -d / 2 + .02, .55), "fabric", sx=.16, buttons=False)
        P.append(ck.cyl(.1, .26, (sx * (w / 2 - .13), -d / 2 + .02, .8), "fabric", rot=(0, pi / 2, 0), n=12, bevel=.03))
    return P


@piece(R, "sofa_capitone", tags=["seat", "living", "hero"], col="box", hero=True, mount="floor",
       sit=[dict(id="sit_l", pos=(-.5, -.05, .5), face=(0, -1)), dict(id="sit_r", pos=(.5, -.05, .5), face=(0, -1))],
       note="sofa capitone 2.2 m, costas com diamantes e botoes dourados, pernas cabriole")
def sofa():
    w, d = 2.2, .95
    P = []
    P.append(rb((w, d, .24), (0, 0, .28), "fabric", .07))
    P.append(pillow((w - .5, d - .3, .2), (0, -.1, .46), "fabric", k=.4))
    P.append(rb((w - .24, .26, .78), (0, d / 2 - .13, .72), "fabric", .1))
    P += tuft(w - .46, .6, .13, (0, d / 2 - .26, .78), "fabric", sx=.19)
    for sx in (-1, 1):
        P.append(pillow((.27, d, .54), (sx * (w / 2 - .135), 0, .5), "fabric", k=.45))
        P.append(ck.cyl(.115, .27, (sx * (w / 2 - .135), -d / 2 + .02, .79), "fabric", rot=(0, pi / 2, 0), n=14, bevel=.03))
        P.append(ring(.1, .012, (sx * (w / 2 - .0 - (.135 if sx else 0)) + sx * .0, -d / 2 + .03, .79), "trim", n=14, minor=5, rot=(0, pi / 2, 0)))
    P.append(ck.tube([Vector((-w / 2 + .02, -d / 2 + .02, .16)), Vector((w / 2 - .02, -d / 2 + .02, .16))], .016, "trim", minor=6))
    for sx in (-1, 1):
        for sy in (-1, 1):
            P += leg_curve(sx * (w / 2 - .1), sy * (d / 2 - .1), .17, .025, "trim", out=sx * .03)
    for sx, m, rz in ((-.7, "accent2", .25), (.7, "white", -.25)):
        P.append(pillow((.42, .16, .4), (sx, .22, .72), m, rot=(-.3, 0, rz), k=.4))
    P.append(ck.heart(.36, .13, (0, .24, .72), "accent2", rot=(-.3, 0, 0), bevel=.05, seg=3))
    return P


@piece(R, "armchair_capitone", tags=["seat", "living"], col="box", mount="floor", sit=[dict(id="sit", pos=(0, -.05, .5), face=(0, -1))],
       note="poltrona capitone 0.9 m")
def armchair():
    w, d = .9, .85
    P = [rb((w, d, .24), (0, 0, .28), "fabric", .07), pillow((w - .44, d - .3, .2), (0, -.08, .46), "fabric", k=.4)]
    P.append(rb((w - .2, .24, .8), (0, d / 2 - .12, .72), "fabric", .1))
    P += tuft(w - .38, .62, .12, (0, d / 2 - .24, .78), "fabric", sx=.17)
    for sx in (-1, 1):
        P.append(pillow((.23, d - .1, .5), (sx * (w / 2 - .115), 0, .48), "fabric", k=.45))
        P.append(ck.cyl(.1, .23, (sx * (w / 2 - .115), -d / 2 + .06, .74), "fabric", rot=(0, pi / 2, 0), n=12, bevel=.03))
    for sx in (-1, 1):
        for sy in (-1, 1):
            P += leg_curve(sx * (w / 2 - .09), sy * (d / 2 - .09), .17, .022, "trim", out=sx * .03)
    return P


@piece(R, "coffee_table_heart", tags=["table", "living"], col="box", mount="floor", note="mesa de centro com tampo de vidro em coracao e pernas douradas (1.0 m)")
def coffee_table():
    P = [ck.heart(1.0, .03, (0, 0, .4), "glass", rot=(pi / 2, 0, 0), bevel=.01, seg=2)]
    P.append(ck.heart(1.0, .02, (0, 0, .37), "trim", rot=(pi / 2, 0, 0), bevel=.006, seg=2))
    P.append(ck.heart(.86, .02, (0, 0, .09), "accent", rot=(pi / 2, 0, 0), bevel=.006, seg=2))
    for (x, y) in ((-.3, .0), (.3, .0), (0, -.34)):
        P.append(ck.tube([Vector((x, y, .38)), Vector((x * 1.05, y * 1.05, .0))], .022, "trim", minor=7))
    P.append(ck.heart(.1, .02, (.1, .05, .44), "accent2", rot=(pi / 2, 0, .4), bevel=.007, seg=2))
    return P


@piece(R, "table_side_round", tags=["table", "living"], col="cyl", mount="floor", note="mesinha lateral redonda com vaso de flores (0.5 m, h 0.55)")
def table_side():
    P = [ck.cyl(.25, .03, (0, 0, .54), "white", n=28, bevel=.012), ring(.25, .01, (0, 0, .54), "trim", n=28, minor=5)]
    P.append(ck.lathe([(0, 0), (.04, .0), (.03, .25), (.12, .4), (.1, .53), (0, .53)], "trim", (0, 0, 0), n=18, smooth=1) if False else
             ck.lathe([(0, 0), (.12, 0), (.04, .06), (.03, .45), (.0, .53)], "trim", n=16, smooth=1))
    P.append(ck.lathe([(0, 0), (.04, 0), (.06, .06), (.04, .14), (.05, .17), (0, .17)], "glass", (0, 0, .555), n=14, smooth=1))
    P += potted_flowers((0, 0, .7))
    return P


def potted_flowers(loc, n=5, mats=("accent2", "accent", "white")):
    x, y, z = loc
    P = []
    for k in range(n):
        a = 2 * pi * k / n
        px, py = .06 * cos(a), .06 * sin(a)
        P.append(ck.tube([Vector((x, y, z - .15)), Vector((x + px * .5, y + py * .5, z - .06)), Vector((x + px, y + py, z))], .005, "leaf", minor=4))
        P += flower((x + px, y + py - .02, z + .02), .06, mats[k % len(mats)], "trim", 6, rot=(.3 * sin(a), 0, 0))
    return P


@piece(R, "chandelier_crystal", tags=["light", "ceiling", "hero"], col=None, mount="ceiling", hero=True,
       lights=[dict(pos=(0, 0, -1.0), color="#ffe0b0", range=7, intensity=1.2)],
       note="lustre de cristal dourado de 3 niveis; origem no teto, pende 1.3 m (largura 1.1 m)")
def chandelier():
    P = []
    P.append(ck.cyl(.1, .05, (0, 0, -.02), "trim", n=14))
    P.append(ck.tube([Vector((0, 0, -.03)), Vector((0, 0, -.6))], .016, "trim", minor=6))
    P.append(ck.lathe([(0, -.35), (.035, -.4), (.05, -.46), (.035, -.52), (0, -.55)], "trim", n=10, smooth=1))
    tiers = [(.55, -.62, 8), (.4, -.88, 6), (.25, -1.1, 5)]
    drops = []
    for (R_, z, n) in tiers:
        P.append(ring(R_, .016, (0, 0, z), "trim", n=36, minor=6))
        for k in range(n):
            a = 2 * pi * k / n
            P.append(ck.tube([Vector((0, 0, -.55 + (z + .55) * .3)), Vector((R_ * cos(a) * .5, R_ * sin(a) * .5, z + .12 + (-.07)), ), Vector((R_ * cos(a), R_ * sin(a), z))], .01, "trim", minor=4))
            P.append(ck.lathe([(0, 0), (.025, 0), (.03, .03), (.02, .06), (0, .08)], "trim", (R_ * cos(a), R_ * sin(a), z), n=8))
            P.append(ck.sph((.034, .034, .07), (R_ * cos(a), R_ * sin(a), z + .12), "glow", n=8, rings=4))
        m = int(R_ * 24)
        for k in range(m):
            a = 2 * pi * (k + .5) / m
            drops.append((R_ * cos(a), R_ * sin(a), z - .08 - .03 * (k % 3), .07 + .02 * (k % 2)))
    for (x, y, z, s) in drops:
        P.append(None) if False else None
    P.append(crystals(drops))
    P.append(crystals([(0, 0, -1.28, .12), (0, 0, -1.2, .06)] + [(.1 * cos(a), .1 * sin(a), -1.12, .06) for a in (0, 2.1, 4.2)]))
    P.append(ck.sph((.1, .1, .1), (0, 0, -1.12), "trim", n=10, rings=5))
    return [p for p in P if p is not None]


@piece(R, "balloons_hearts", tags=["decor", "balloon"], col=None, mount="floor", note="cacho de 3 baloes de coracao com fitas (altura 2.3 m)")
def balloons():
    P = [ck.cyl(.09, .05, (0, 0, .025), "trim", n=14, bevel=.01)]
    specs = ((-.18, 0, 1.7, .62, "accent2"), (.2, .05, 1.95, .55, "accent"), (0.0, -.1, 2.15, .5, "trim"))
    for (x, y, z, w, m) in specs:
        P.append(ck.heart(w, w * .38, (x, y, z), m, rot=(0, 0, 0), bevel=w * .16, seg=4))
        P.append(ck.tube([Vector((0, 0, .05)), Vector((x * .4, y * .4, z * .5)), Vector((x, y, z - w * .43))], .004, "white", minor=3))
        P.append(ck.sph((.04, .04, .03), (x, y, z - w * .46), m, n=6, rings=3))
    return P


@piece(R, "bookshelf_pink", tags=["shelf", "living"], col="box", mount="floor", note="estante 1.2 x 0.4 x 2.0 com livros, coracoes e vasinhos")
def bookshelf():
    w, d, h = 1.2, .4, 2.0
    P = [rb((w, d - .06, .04), (0, .03, .1), "base", .01)]
    P.append(rb((.04, d, h), (-w / 2 + .02, 0, h / 2), "base", .012))
    P.append(rb((.04, d, h), (w / 2 - .02, 0, h / 2), "base", .012))
    P.append(rb((w, .02, h), (0, d / 2 - .01, h / 2), "accent", .006))
    zs = [.1, .55, 1.0, 1.45, 1.9]
    for z in zs:
        P.append(rb((w, d, .04), (0, 0, z), "white", .012))
    P.append(rb((w + .06, d + .04, .06), (0, 0, h + .03), "white", .02))
    P.append(ck.tube(rect_pts(w + .06, d + .04, h + .062, 0, 0, .02), .01, "trim", minor=5, closed=True))
    cols = ["accent2", "soft", "trim", "accent", "deep", "fabric"]
    bm = {}
    import random
    rnd = random.Random(3)
    for si, z in enumerate(zs[:-1]):
        x = -w / 2 + .08
        while x < w / 2 - .2:
            r = rnd.random()
            if r < .12:
                x += .12
                continue
            bw = .035 + rnd.random() * .03
            bh = .22 + rnd.random() * .12
            P.append(box((bw, .22, bh), (x + bw / 2, .02, z + .02 + bh / 2), cols[rnd.randrange(6)], bevel=.004, seg=1))
            x += bw + .004
        if si == 1:
            P += [ck.heart(.14, .04, (w / 2 - .22, .0, z + .12), "accent2", rot=(0, 0, 0), bevel=.012, seg=2)]
    return P


@piece(R, "tv_console", tags=["tv", "living"], col="box", mount="floor", use=[dict(id="tv", pos=(0, -1.6, 0), face=(0, 1), label="Assistir TV")],
       note="console branco e dourado 1.6 m com TV de tela plana (altura 1.2 m)")
def tv_console():
    P = [rb((1.6, .42, .4), (0, 0, .35), "base", .05)]
    P.append(rb((1.66, .46, .04), (0, 0, .57), "white", .015))
    for sx in (-1, 1):
        P.append(rb((.7, .02, .3), (sx * .39, -.215, .35), "accent", .012))
        P.append(knob((sx * .12 * -1 * 1 + sx * .28, -.235, .35), "trim", .022))
    P += ball_feet([-.7, .7], [-.15, .15], .04, "trim", z=.07) if False else []
    for sx in (-1, 1):
        for sy in (-1, 1):
            P += leg_curve(sx * .7, sy * .15, .17, .02, "trim", out=sx * .03)
    # TV
    P.append(rb((1.2, .05, .7), (0, .05, .95), "deep", .02))
    P.append(box((1.12, .01, .62), (0, .018, .95), "glow2"))
    P.append(ck.cyl(.035, .1, (0, .06, .62), "trim", n=8))
    P.append(rb((.4, .16, .02), (0, .05, .6), "trim", .008))
    P.append(ck.heart(.14, .02, (-.7, -.05, .6), "accent2", rot=(0, 0, 0), bevel=.007, seg=2))
    return P


@piece(R, "clawfoot_tub", tags=["bath"], col="box", mount="floor", sit=[], use=[dict(id="bath", pos=(0, -.8, 0), face=(0, 1), label="Banho de espuma")],
       note="banheira clawfoot rosa com pes dourados e agua com bolhas (1.75 x 0.8 x 0.7)")
def tub():
    P = []
    outer = [(0, .18), (.34, .2), (.42, .35), (.42, .6), (.4, .66), (.36, .66), (.36, .62), (.36, .4), (.3, .3), (0, .3)]
    bm = bmesh.new()
    prof = [(0, .18), (.3, .18), (.4, .3), (.43, .5), (.42, .62), (.45, .66), (.4, .68), (.36, .64), (.35, .5), (.28, .34), (0, .3)]
    merge(bm, ck.bm_lathe(prof, 32), (0, 0, 0), (2.05, 1.0, 1.0))
    P.append(obj(bm, "accent"))
    P.append(ck.tube([Vector((-.87 + .1 * cos(a) * 0 + (1.75 * .5) * cos(a) * 0, 0, 0)) for a in (0, 1)], .001, "trim", minor=3)) if False else None
    bm = bmesh.new()
    merge(bm, ck.bm_lathe([(0, .0), (.36, 0), (.355, .02), (0, .02)], 32), (0, 0, .5), (2.0, .9, 1))
    P.append(obj(bm, "water"))
    P.append(ring(.84, .015, (0, 0, .68), "trim", n=36, minor=6, ry=.4) if False else None)
    pts = [Vector((.8 * 1.0 * cos(a) * 1.0, .42 * sin(a) * 1.0, .68)) for a in [2 * pi * i / 40 for i in range(40)]]
    P.append(ck.tube(pts, .014, "trim", minor=6, closed=True))
    for sx in (-1, 1):
        for sy in (-1, 1):
            P += leg_curve(sx * .6, sy * .25, .2, .03, "trim", out=sx * .08)
    # torneira
    P.append(ck.tube([Vector((.0, .42, .68)), Vector((0, .42, .95)), Vector((0, .3, 1.0)), Vector((0, .2, .9))], .018, "trim", minor=6))
    for sx in (-1, 1):
        P.append(ck.sph((.07, .07, .09), (sx * .12, .43, .75), "glass", n=8, rings=4))
    # espuma
    import random
    rnd = random.Random(5)
    P.append(cloud([(rnd.uniform(-.7, .7), rnd.uniform(-.25, .25), .52 + rnd.random() * .06, rnd.uniform(.07, .13)) for _ in range(26)], "white", 8, 5))
    P.append(cloud([(rnd.uniform(-.6, .6), rnd.uniform(-.2, .2), .6 + rnd.random() * .04, rnd.uniform(.02, .04)) for _ in range(12)], "glass", 6, 4))
    return [p for p in P if p is not None]


@piece(R, "bath_vanity_sink", tags=["bath", "vanity"], col="box", mount="floor", use=[dict(id="sink", pos=(0, -.7, 0), face=(0, 1), label="Lavar as maos")],
       note="bancada de banheiro 1.2 m com cuba em concha, torneira dourada")
def bath_vanity():
    P = [rb((1.2, .55, .78), (0, 0, .42), "base", .05)]
    P.append(rb((1.28, .6, .05), (0, 0, .835), "white", .02))
    for sx in (-1, 1):
        P.append(rb((.5, .02, .6), (sx * .3, -.28, .45), "accent", .012))
        P.append(knob((sx * .08, -.305, .6)))
    P.append(ck.lathe([(0, .0), (.17, .0), (.22, .03), (.24, .06), (.0, .06)], "white", (0, -.02, .86), n=24, smooth=1))
    P.append(ck.lathe([(0, 0), (.2, 0), (.2, .005), (0, .005)], "water", (0, -.02, .87), n=20))
    P.append(ck.tube([Vector((0, .2, .86)), Vector((0, .2, 1.0)), Vector((0, .12, 1.04)), Vector((0, .06, .98))], .016, "trim", minor=6))
    for sx in (-1, 1):
        P.append(ck.sph((.05, .05, .07), (sx * .1, .2, .9), "glass", n=8, rings=4))
    P.append(rb((.1, .05, .2), (-.5, .15, .96), "trim", .01) if False else ck.lathe([(0, 0), (.05, 0), (.05, .17), (.03, .2), (0, .2)], "glass", (-.45, .1, .86), n=12))
    for k in range(3):
        P.append(ck.sph((.13, .13, .08), (.45, .12, .9 + k * .0 - .02 if False else .88), "accent2", n=8, rings=4) if k == 0 else
                 ck.sph((.1 - k * .02, .1 - k * .02, .05), (.45, .12, .9 + k * .05), "accent", n=8, rings=4))
    return P


@piece(R, "wardrobe_glass_lit", tags=["closet", "storage", "hero"], col="box", hero=True, mount="floor", use=[dict(id="closet", pos=(0, -.8, 0), face=(0, 1), label="Abrir closet")],
       lights=[dict(pos=(0, -.1, 1.8), color="#fff0d8", range=3, intensity=0.9)],
       note="guarda-roupa de portas de vidro com iluminacao LED, vestidos pendurados (1.5 x 0.6 x 2.5)")
def wardrobe():
    w, d, h = 1.5, .6, 2.5
    P = [rb((w, d, .1), (0, 0, .05), "base", .02), rb((w + .06, d + .04, .1), (0, 0, h - .05), "white", .025)]
    P.append(rb((.06, d, h), (-w / 2 + .03, 0, h / 2), "base", .015))
    P.append(rb((.06, d, h), (w / 2 - .03, 0, h / 2), "base", .015))
    P.append(rb((w, .04, h), (0, d / 2 - .02, h / 2), "accent", .008))
    P.append(rb((w - .1, d - .1, .03), (0, 0, 1.15), "white", .01))
    # trilho + vestidos
    P.append(ck.tube([Vector((-w / 2 + .08, 0, 2.15)), Vector((w / 2 - .08, 0, 2.15))], .014, "trim", minor=6))
    mats = ["accent2", "accent", "soft", "fabric", "white", "deep"]
    for mi, m in enumerate(mats):
        items = [(-w / 2 + .17 + (mi + 0) * .22, 0, 2.15 - .02, .9 + .05 * (mi % 3), .22, 0)]
        P.append(dresses(items, m))
    # prateleira de baixo: bolsas
    for k, (x, m) in enumerate(((-.5, "accent2"), (-.15, "fabric"), (.2, "soft"), (.55, "white"))):
        P.append(rb((.22, .1, .16), (x, 0, 1.15 + .1), m, .035))
        P.append(ck.tube([Vector((x - .06, 0, 1.33)), Vector((x, 0, 1.4)), Vector((x + .06, 0, 1.33))], .006, "trim", minor=4))
    P.append(rb((w - .12, d - .12, .03), (0, 0, .2), "white", .01))
    P.append(shoes([(-.55 + k * .26, -.05, .22, 0) for k in range(5)], "accent2", .06))
    P.append(shoes([(-.55 + k * .26, -.05, 1.17, 0) for k in range(5)], "fabric", .07) if False else None)
    # luz LED
    P.append(ck.tube([Vector((-w / 2 + .1, -d / 2 + .08, 2.4)), Vector((w / 2 - .1, -d / 2 + .08, 2.4))], .012, "glow", minor=5))
    P.append(ck.tube([Vector((-w / 2 + .1, -d / 2 + .08, 1.15)), Vector((w / 2 - .1, -d / 2 + .08, 1.15))], .01, "glow", minor=5))
    # portas de vidro
    for sx in (-1, 1):
        cx = sx * (w / 4 - .01)
        P += frame(w / 2 - .02, h - .3, .05, (cx, -d / 2, h / 2), "trim", d=.04)
        P.append(rb((w / 2 - .12, .01, h - .4), (cx, -d / 2, h / 2), "glass", .004))
        P.append(ck.heart(.09, .03, (sx * .08, -d / 2 - .04, 1.15), "trim", bevel=.01, seg=2))
    P.append(ck.heart(.3, .05, (0, -d / 2 - .02, h + .13), "trim", bevel=.015, seg=2))
    return [p for p in P if p is not None]


@piece(R, "closet_shoe_wall", tags=["closet", "storage", "shoes", "hero"], col="box", hero=True, mount="floor", use=[dict(id="shoes", pos=(0, -.7, 0), face=(0, 1), label="Escolher sapatos")],
       lights=[dict(pos=(0, -.2, 1.4), color="#ffe8d0", range=3, intensity=0.8)],
       note="parede de sapatos 1.6 m x 2.3 m com prateleiras de vidro iluminadas")
def shoe_wall():
    w, d, h = 1.6, .35, 2.3
    P = [rb((w, .04, h), (0, d / 2 - .02, h / 2), "accent", .008)]
    for sx in (-1, 1):
        P.append(rb((.05, d, h), (sx * (w / 2 - .025), 0, h / 2), "base", .015))
    P.append(rb((w + .08, d + .04, .08), (0, 0, h + .04), "white", .02))
    P.append(rb((w, d, .08), (0, 0, .04), "base", .015))
    cols = ["accent2", "fabric", "soft", "deep", "white", "accent"]
    for ri, z in enumerate((.35, .75, 1.15, 1.55, 1.95)):
        P.append(rb((w - .1, d - .04, .02), (0, -.01, z), "glass", .006))
        P.append(ck.tube([Vector((-w / 2 + .06, -d / 2 + .03, z + .012)), Vector((w / 2 - .06, -d / 2 + .03, z + .012))], .008, "glow", minor=4))
        P.append(ck.tube([Vector((-w / 2 + .06, -d / 2 + .03, z)), Vector((w / 2 - .06, -d / 2 + .03, z))], .012, "trim", minor=5))
        P.append(shoes([(-.6 + k * .3, 0, z + .01, 0 + .1 * ((k + ri) % 3 - 1)) for k in range(5)], cols[ri % len(cols)], .1))
    return P


@piece(R, "closet_island", tags=["closet", "storage", "table"], col="box", mount="floor", use=[dict(id="jewelry", pos=(0, -.75, 0), face=(0, 1), label="Joias")],
       note="ilha do closet 1.4 x 0.7 x 0.95 com tampo de vidro e vitrine de joias")
def island():
    P = [rb((1.4, .7, .8), (0, 0, .42), "base", .05)]
    P.append(rb((1.46, .76, .06), (0, 0, .83), "white", .02))
    P.append(rb((1.3, .6, .06), (0, 0, .88), "fabric", .015))
    P.append(rb((1.36, .66, .04), (0, 0, .93), "glass", .012))
    P += frame(1.46, .76, .04, (0, 0, .955), "trim", d=.04) if False else []
    P.append(ck.tube(rect_pts(1.4, .7, .955, 0, 0, .04), .012, "trim", minor=6, closed=True))
    for sx in (-1, 1):
        for z in (.64, .46, .28):
            P.append(rb((.6, .02, .14), (sx * .34, -.355, z), "accent", .01))
            P.append(knob((sx * .34, -.375, z)))
    # joias na vitrine
    import random
    rnd = random.Random(8)
    P.append(ring(.07, .008, (-.4, -.1, .93), "trim", n=20, minor=5, rot=(pi / 2, 0, 0)))
    P.append(ck.sph(.02, (-.4, -.1, .995), "glass", n=8, rings=4))
    pts = [Vector((.3 + .16 * cos(a), -.02 + .1 * sin(a) * -1, .915 + .01)) for a in [pi * (.15 + i * 1.7 / 18) for i in range(19)]]
    P.append(ck.tube(pts, .007, "white", minor=4))
    P.append(cloud([(pts[i].x, pts[i].y, pts[i].z, .016) for i in range(0, 19, 1)], "white", 6, 3))
    P.append(ck.heart(.14, .02, (-.1, .1, .93), "trim", rot=(pi / 2, 0, 0), bevel=.006, seg=2))
    P.append(ck.heart(.1, .02, (.05, .15, .93), "accent2", rot=(pi / 2, 0, .3), bevel=.006, seg=2))
    P.append(ck.heart(.1, .02, (-.55, .15, .93), "glass", rot=(pi / 2, 0, -.3), bevel=.006, seg=2))
    P += ball_feet([-.62, .62], [-.28, .28], .035, "trim", z=.04)
    return P


@piece(R, "clothes_rail_gold", tags=["closet", "rack"], col="box", mount="floor", note="arara dourada com rodinhas e vestidos (1.5 x 0.5 x 1.7)")
def rail():
    P = []
    for sx in (-1, 1):
        P.append(ck.tube([Vector((sx * .72, -.2, .0)), Vector((sx * .72, -.2, .06)), Vector((sx * .72, 0, .12)), Vector((sx * .72, 0, 1.6)), Vector((sx * .72, 0, 1.68)), Vector((sx * .66, 0, 1.7))], .018, "trim", minor=6))
        P.append(ck.tube([Vector((sx * .72, .2, .0)), Vector((sx * .72, .2, .06)), Vector((sx * .72, 0, .12))], .018, "trim", minor=6))
        for sy in (-.2, .2):
            P.append(ck.sph((.07, .05, .07), (sx * .72, sy, .035), "trim", n=8, rings=4))
    P.append(ck.tube([Vector((-.72, 0, 1.68)), Vector((.72, 0, 1.68))], .016, "trim", minor=6))
    P.append(ck.tube([Vector((-.72, 0, .12)), Vector((.72, 0, .12))], .014, "trim", minor=6))
    mats = ["accent2", "white", "soft", "accent", "fabric", "deep", "accent2", "soft"]
    for mi, m in enumerate(mats):
        P.append(dresses([(-.6 + mi * .17, 0, 1.64, .95 + .1 * (mi % 3), .2, 0)], m))
    P.append(ck.heart(.18, .03, (0, -.02, 1.8), "accent2", bevel=.01, seg=2))
    return P


CAM = ((2.4, -5.4, 1.65), (-0.5, 0.6, 1.2), 24)


def VIG(put):
    for x in range(-4, 6, 2):
        for y in range(-4, 5, 2):
            put("shared/floor_checker", x, y)
    put("shared/wall_window_curtains", -1.5, 4.0)
    put("shared/wall_panel", 1.0, 4.0)
    put("shared/wall_panel", 3.0, 4.0)
    for y in (-3, -1, 1, 3):
        put("shared/wall_panel", -3.0, y, rz=pi / 2)
    put("shared/baseboard_2m", 1.0, 4.0); put("shared/baseboard_2m", 3.0, 4.0)
    put("shared/wall_sconce", 0.4, 4.0); put("shared/wall_sconce", 2.4, 4.0)
    put("shared/picture_frame", 1.4, 4.0)
    put("shared/ceiling_medallion", 0.4, 1.4, z=3.2)
    put("chandelier_crystal", 0.4, 1.4, z=3.2)
    put("bed_canopy", -1.7, 2.85)
    put("nightstand_pink", -0.1, 3.7)
    put("lamp_table_pink", -0.1, 3.7, z=.74)
    put("sofa_capitone", 1.9, 3.35)
    put("armchair_capitone", 0.35, 0.9, rz=-pi / 2 + .5)
    put("coffee_table_heart", 1.7, 1.55)
    put("shared/rug_round", 1.2, 1.5)
    put("pouf_round", 2.6, 0.5, rz=0)
    put("vanity_hollywood", -2.6, -0.6, rz=pi / 2)
    put("stool_tufted", -1.85, -0.6)
    put("wardrobe_glass_lit", -2.7, -2.6, rz=pi / 2)
    put("balloons_hearts", 3.3, 3.2)
    put("shared/plant_potted", 3.3, 0.3)
    put("shared/mirror_wall_oval", -3.0, 1.8 - 0.0, rz=pi / 2) if False else None
    put("shared/fairy_lights_curtain", -3.0, 0.8, rz=pi / 2) if False else None

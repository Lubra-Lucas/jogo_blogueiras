"""Boutique: azul bebe + branco + champagne."""
from lib import *
from lib2 import *
R = "boutique"


@piece(R, "floor_blue_diamond", tags=["floor", "tile"], col="box", walk=True, mount="floor", note="piso marmore branco com losangos azuis e fios champagne 2x2 m")
def floor_diamond():
    P = [rb((2, 2, .03), (0, 0, .015), "white", .006, seg=2)]
    P.append(box((1.38, 1.38, .006), (0, 0, .03), "base", rot=(0, 0, pi / 4)))
    P.append(box((1.1, 1.1, .007), (0, 0, .031), "white", rot=(0, 0, pi / 4)))
    P.append(box((.62, .62, .008), (0, 0, .032), "soft", rot=(0, 0, pi / 4)))
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(box((.3, .3, .006), (sx * .76, sy * .76, .03), "base", rot=(0, 0, pi / 4)))
    P.append(ring(.5, .008, (0, 0, .036), "trim", n=4, minor=4, rot=(0, 0, pi / 4)))
    P.append(ring(.95, .008, (0, 0, .034), "trim", n=4, minor=4, rot=(0, 0, pi / 4)))
    P.append(box((2, .012, .008), (0, -.994, .032), "trim"))
    P.append(box((.012, 2, .008), (-.994, 0, .032), "trim"))
    return P


@piece(R, "rack_round_carousel", tags=["rack", "clothes", "hero"], col="cyl", hero=True, mount="floor", use=[dict(id="browse", pos=(0, -.9, 0), face=(0, 1), label="Ver roupas")],
       note="arara redonda giratoria champagne com vestidos pastel (diametro 1.1 m, h 1.8)")
def rack_round():
    P = [ck.lathe([(0, 0), (.3, 0), (.32, .03), (.1, .08), (.04, .12), (.03, 1.45), (.05, 1.5), (0, 1.52)], "trim", n=20, smooth=1)]
    P.append(ring(.5, .016, (0, 0, 1.45), "trim", n=40, minor=6))
    P.append(ring(.5, .01, (0, 0, .4), "trim", n=40, minor=5) if False else ring(.4, .012, (0, 0, 1.5), "trim", n=36, minor=5))
    for k in range(4):
        a = pi / 2 * k + pi / 4
        P.append(ck.tube([Vector((0, 0, 1.5)), Vector((.5 * cos(a), .5 * sin(a), 1.45))], .012, "trim", minor=5))
    for m_i, m in enumerate(("accent", "white", "accent2", "soft", "fabric", "deep")):
        items = []
        for k in range(8):
            a = 2 * pi * (k * 6 + m_i) / 48
            if (k + m_i) % 3 == 0:
                items.append((.5 * cos(a), .5 * sin(a), 1.43, .95 + .08 * ((k + m_i) % 3), .17, a + pi / 2))
        if items:
            P.append(dresses(items, m))
    P.append(ck.sph((.1, .1, .1), (0, 0, 1.58), "trim", n=10, rings=6))
    P.append(ck.heart(.2, .03, (0, 0, 1.75), "trim", bevel=.01, seg=2))
    return P


@piece(R, "rack_wall_rail", tags=["rack", "clothes", "wall"], col=None, mount="wall", note="trilho de parede champagne com roupas e prateleira (1.8 m, z 1.0 a 2.4)")
def rack_wall():
    P = [rb((1.9, .04, .06), (0, .02, 2.0), "trim", .015)]
    P.append(ck.tube([Vector((-.9, -.0, 2.0)), Vector((-.9, -.25, 2.0)), Vector((.9, -.25, 2.0)), Vector((.9, 0, 2.0))], .016, "trim", minor=6))
    for sx in (-1, 1):
        P.append(ck.tube([Vector((sx * .9, 0, 2.0)), Vector((sx * .9, -.25, 2.0))], .02, "trim", minor=6))
    for mi, m in enumerate(("accent", "white", "accent2", "soft", "fabric", "white", "accent")):
        P.append(dresses([(-.78 + mi * .26, -.25, 1.98, .85 + .1 * (mi % 2), .2, 0)], m))
    P.append(rb((1.9, .3, .04), (0, -.15, 2.45), "white", .012))
    cols = ["accent2", "soft", "white", "accent", "fabric"]
    for k in range(5):
        P.append(pillow((.3, .22, .15), (-.75 + k * .37, -.15, 2.55), cols[k], k=.4))
    return P


@piece(R, "mannequin_gown", tags=["mannequin", "decor", "hero"], col="cyl", hero=True, mount="floor", note="manequim estilizado com vestido de gala azul (h 1.85)")
def mannequin_gown():
    P = [ck.cyl(.28, .03, (0, 0, .015), "trim", n=24, bevel=.01), ck.cyl(.02, 1.0, (0, 0, .5), "trim", n=8)]
    P.append(ck.sph((.16, .2, .26), (0, 0, 1.72), "white", n=14, rings=8))
    P.append(ck.cyl(.04, .14, (0, 0, 1.55), "white", n=10))
    P.append(ck.lathe([(0, 1.0), (.14, 1.02), (.15, 1.12), (.11, 1.25), (.14, 1.38), (.17, 1.46), (.08, 1.52), (0, 1.54)], "white", n=16, smooth=1))
    bm = bmesh.new()
    merge(bm, ck.bm_lathe([(0, 0), (.62, .0), (.6, .1), (.45, .45), (.28, .7), (.16, .85), (.13, 1.0), (.12, 1.1), (.16, 1.38), (.15, 1.44), (0, 1.44)], 24, 1), (0, 0, .03), (1, .85, 1))
    P.append(obj(bm, "base"))
    bm = bmesh.new()
    merge(bm, ck.bm_lathe([(.62, .02), (.66, .06), (.55, .35), (.3, .62), (.2, .78), (.17, .8), (.45, .3)], 24), (0, 0, .03), (1, .85, 1))
    P.append(obj(bm, "white"))
    P.append(ring(.135, .02, (0, 0, 1.12), "trim", n=18, minor=6))
    P += bow(.2, (0, -.15, 1.13), "accent2", knot="trim", tail=True)
    for sx in (-1, 1):
        P.append(ck.tube([Vector((sx * .17, 0, 1.45)), Vector((sx * .26, -.03, 1.3)), Vector((sx * .27, -.08, 1.12))], .028, "white", minor=7))
    P.append(ck.sph((.2, .22, .08), (0, .0, 1.84), "trim", n=10, rings=5) if False else None)
    return [p for p in P if p is not None]


@piece(R, "dress_form_stand", tags=["mannequin", "decor"], col="cyl", mount="floor", note="busto de costura sobre tripe champagne (h 1.6)")
def dress_form():
    P = [ck.cyl(.02, 1.0, (0, 0, .5), "trim", n=8)]
    for k in range(3):
        a = 2 * pi * k / 3
        P.append(ck.tube([Vector((0, 0, .4)), Vector((.15 * cos(a), .15 * sin(a), .2)), Vector((.28 * cos(a), .28 * sin(a), .0))], .014, "trim", minor=5))
    P.append(ck.lathe([(0, 1.0), (.15, 1.0), (.17, 1.1), (.13, 1.22), (.17, 1.4), (.18, 1.48), (.1, 1.53), (.05, 1.56), (0, 1.56)], "fabric", n=18, smooth=1))
    P.append(ck.sph((.07, .07, .06), (0, 0, 1.6), "trim", n=8, rings=5))
    P.append(ring(.135, .01, (0, 0, 1.22), "trim", n=18, minor=5))
    P.append(ck.heart(.07, .015, (.0, -.17, 1.38), "trim", bevel=.005, seg=2))
    return P


def table_top(r, z, mat="white"):
    return [ck.cyl(r, .04, (0, 0, z), mat, n=36, bevel=.015), ring(r, .01, (0, 0, z), "trim", n=36, minor=5)]


@piece(R, "table_display_round", tags=["table", "display", "boutique"], col="cyl", mount="floor", note="mesa expositora redonda 2 niveis com suéteres dobrados e bolsa (diam 1.3, h 1.1)")
def table_round():
    P = table_top(.65, .78) + table_top(.35, 1.08)
    P.append(ck.lathe([(0, 0), (.45, 0), (.45, .04), (.12, .1), (.07, .3), (.07, .72), (0, .76)], "trim", n=22, smooth=1))
    P.append(ck.cyl(.04, .3, (0, 0, .93), "trim", n=10))
    cols = ["accent2", "soft", "accent", "fabric", "white"]
    for k in range(5):
        a = 2 * pi * k / 5
        for h in range(3):
            P.append(pillow((.24, .18, .045), (.42 * cos(a), .42 * sin(a), .83 + h * .04), cols[(k + h) % 5], rot=(0, 0, a), k=.4))
    for h in range(3):
        P.append(pillow((.2, .16, .045), (.0, 0, 1.12 + h * .04), cols[h], k=.4))
    P.append(rb((.14, .06, .1), (.0, 0, 1.28), "fabric", .03))
    P.append(ck.tube([Vector((-.04, 0, 1.33)), Vector((0, 0, 1.4)), Vector((.04, 0, 1.33))], .006, "trim", minor=4))
    return P


@piece(R, "table_display_long", tags=["table", "display", "boutique"], col="box", mount="floor", note="mesa expositora retangular 1.6 m com roupas dobradas e lencos (h 0.85)")
def table_long():
    P = [rb((1.6, .7, .05), (0, 0, .83), "white", .02), ck.tube(rect_pts(1.58, .68, .86, 0, 0, .04), .01, "trim", minor=5, closed=True)]
    for sx in (-1, 1):
        for sy in (-1, 1):
            P += leg_curve(sx * .7, sy * .27, .81, .022, "trim", out=sx * .04)
    P.append(rb((1.3, .45, .02), (0, 0, .24), "soft", .006))
    cols = ["accent2", "accent", "soft", "fabric", "white", "deep"]
    for k in range(6):
        for h in range(2 + (k % 3)):
            P.append(pillow((.22, .3, .04), (-.6 + k * .24, -.05, .875 + h * .04), cols[(k + h) % 6], k=.4))
    P.append(drape(.5, .35, (.5, .22, .9), "accent2", folds=4, amp=.025, per=4, nz=4, rot=(pi / 2, 0, 0)))
    P.append(ck.heart(.14, .02, (0, -.35, .83), "trim", bevel=.007, seg=2))
    return P


@piece(R, "fitting_room_curtain", tags=["fitting", "booth", "hero"], col="box", hero=True, mount="floor", use=[dict(id="change", pos=(0, -1.0, 0), face=(0, 1), label="Provador")],
       sit=[dict(id="bench", pos=(0, .35, .48), face=(0, -1), label="Sentar")],
       note="provador 1.6 x 1.4 x 2.5 com cortinas amarradas, banco capitone, espelho e cabideiro. Entrada em -Y")
def fitting_room():
    w, d, h = 1.6, 1.4, 2.5
    P = [rb((w, d, .06), (0, 0, .03), "white", .015)]
    P.append(rb((w, .08, h), (0, d / 2 - .04, h / 2), "base", .02))
    for sx in (-1, 1):
        P.append(rb((.08, d, h), (sx * (w / 2 - .04), 0, h / 2), "base", .02))
        P.append(rb((.12, .12, h), (sx * (w / 2 - .06), -d / 2 + .06, h / 2), "trim", .03))
        for k in range(5):
            P.append(ck.cyl(.035, h - .5, (sx * (w / 2 - .1), -.5 + k * .2, h / 2 - .1), "white", n=8)) if False else None
    P.append(rb((w + .06, d + .06, .1), (0, 0, h + .05), "white", .03))
    P.append(ck.tube(rect_pts(w + .02, d + .02, h - .0, 0, 0, .04), .018, "trim", minor=6, closed=True))
    P.append(ck.cyl(.018, w, (0, -d / 2 + .06, h - .14), "trim", rot=(0, pi / 2, 0), n=8))
    for sx in (-1, 1):
        P.append(drape(.78, h - .35, (sx * .5, -d / 2 + .1, h - .14), "fabric", folds=4, amp=.06, pinch=.3, pinch_z=.6, flare=.1))
    P.append(drape(w, .3, (0, -d / 2 + .1, h - .1), "accent2", folds=8, amp=.03, per=4, nz=3))
    P.append(pillow((1.0, .45, .16), (0, .3, .38), "fabric", k=.45))
    P += tuft(1.0, .1, .06, (0, .3, .48), "fabric", sx=.15, buttons=True) if False else []
    for sx in (-1, 1):
        P += leg_curve(sx * .42, .3, .3, .02, "trim", out=sx * .03)
    # espelho + cabides
    P.append(prism([(x * 1.0, z + .8) for x, z in arch_pts(.7, 1.0, 12)], .02, "xz", "mirror", (0, d / 2 - .09, 0)))
    P.append(ck.tube([Vector((x, d / 2 - .1, z + .8)) for (x, z) in arch_pts(.74, 1.0, 12)], .02, "trim", minor=6, closed=True))
    for k in range(3):
        P.append(ck.sph((.05, .06, .05), (-.7 + 0 + .0, .1 + k * .0, 0), "trim", n=6, rings=3)) if False else None
    P.append(ck.sph((.06, .06, .06), (.62, d / 2 - .1, 1.7), "trim", n=8, rings=5))
    P.append(ck.sph((.06, .06, .06), (.62, d / 2 - .1, 1.45), "trim", n=8, rings=5))
    P.append(dresses([(.62, d / 2 - .16, 1.75, .8, .15, 0)], "accent2"))
    P.append(ck.heart(.24, .04, (0, -d / 2 + .02, h + .22), "trim", bevel=.012, seg=2))
    return [p for p in P if p is not None]


@piece(R, "mirror_trifold_stand", tags=["mirror", "fitting", "hero"], col="box", hero=True, mount="floor", use=[dict(id="mirror", pos=(0, -1.0, 0), face=(0, 1), label="Provar no espelho")],
       lights=[dict(pos=(0, -.4, 2.2), color="#fff0d8", range=3, intensity=0.7)],
       note="espelho triplo champagne sobre plataforma redonda (h 2.1, plataforma diam 1.5, +0.15)")
def mirror_trifold():
    P = [ck.cyl(.75, .15, (0, .1, .075), "white", n=40, bevel=.03), ring(.75, .014, (0, .1, .15), "trim", n=40, minor=6)]
    P.append(ck.cyl(.62, .01, (0, .1, .155), "accent", n=36))
    ang = .5
    for sx, rz in ((-1, ang), (0, 0), (1, -ang)):
        cx = sx * (.46 if sx else 0) * 1.0
        cy = .95 - (.12 if sx else 0) + (-.02 if sx else 0)
        pw, ph = .55 if sx == 0 else .5, 1.85
        z0 = .98
        pts = [(x, z) for x, z in arch_pts(pw - .08, ph - .45 - .0, 10)]
        mp = prism([(x, z + z0 - ph / 2 + .12) for x, z in arch_pts(pw - .08, ph - .5, 10)], .02, "xz", "mirror", (0, 0, 0))
        mp.location = (cx, cy, 0)
        mp.rotation_euler = (0, 0, rz)
        P.append(mp)
        fr = ck.tube([Vector((x, 0, z + z0 - ph / 2 + .12)) for x, z in arch_pts(pw - .04, ph - .5, 10)], .022, "trim", minor=6, closed=True)
        fr.location = (cx, cy - .01, 0)
        fr.rotation_euler = (0, 0, rz)
        P.append(fr)
    P.append(ck.heart(.2, .03, (0, .86, 2.1), "trim", bevel=.01, seg=2))
    return P


@piece(R, "checkout_counter", tags=["counter", "register", "hero"], col="box", hero=True, mount="floor", use=[dict(id="pay", pos=(0, -.9, 0), face=(0, 1), label="Pagar")],
       note="balcao de caixa 1.8 m branco com paineis champagne, leitor de cartao, sacolas e laco (h 1.0). Atendente em +Y")
def checkout():
    w, d = 1.8, .65
    P = [rb((w, d, .94), (0, 0, .5), "white", .05), rb((w + .1, d + .1, .06), (0, 0, 1.0), "accent", .02), rb((w + .12, d + .12, .05), (0, 0, .03), "trim", .015)]
    P.append(ck.tube(rect_pts(w + .08, d + .08, 1.04, 0, 0, .05), .012, "trim", minor=5, closed=True))
    for k in range(3):
        P.append(rb((.5, .02, .7), (-.6 + k * .6, -d / 2 - .0, .5), "base", .015))
        P += frame(.4, .6, .025, (-.6 + k * .6, -d / 2 - .02, .5), "trim", d=.015, r=.006)
    P.append(ck.heart(.22, .02, (0, -d / 2 - .04, .5), "trim", bevel=.007, seg=2))
    P.append(rb((.26, .2, .02), (-.5, 0, 1.04), "deep", .01))
    P.append(rb((.22, .02, .16), (-.5, .12, 1.17), "deep", .008, rot=(-.2, 0, 0)))
    P.append(rb((.18, .01, .12), (-.5, .108, 1.17), "glow2", .003, rot=(-.2, 0, 0)))
    P.append(ck.cyl(.05, .015, (.0, -.1, 1.04), "trim", n=14))
    P.append(ck.lathe([(0, 0), (.035, 0), (.03, .05), (0, .06)], "trim", (.0, -.1, 1.04), n=12))
    P += bow(.22, (.65, -.05, 1.12), "accent2", knot="trim")
    for k, (x, m) in enumerate(((.5, "accent2"), (.65, "base"), (.8, "soft"))):
        P.append(rb((.2, .1, .26), (x, .2, 1.16), m, .01))
        P.append(ck.tube([Vector((x - .05, .2, 1.29)), Vector((x, .2, 1.38)), Vector((x + .05, .2, 1.29))], .006, "white", minor=4))
    P.append(ck.heart(.1, .01, (.5, .148, 1.16), "white", bevel=.003, seg=1))
    return P


@piece(R, "shoe_wall_shelf", tags=["shoes", "display", "wall"], col=None, mount="wall", hero=False, note="prateleira de parede com sapatos de salto, 1.4 m (z 0.9 a 2.3)")
def shoe_shelf():
    P = [rb((1.45, .03, 1.5), (0, .015, 1.6), "white", .01)]
    cols = ["accent2", "white", "soft", "accent", "deep"]
    for ri, z in enumerate((1.0, 1.4, 1.8)):
        P.append(rb((1.4, .3, .025), (0, -.15, z), "glass", .006))
        P.append(ck.tube([Vector((-.7, -.28, z)), Vector((.7, -.28, z))], .01, "trim", minor=5))
        P.append(ck.tube([Vector((-.7, -.28, z + .014)), Vector((.7, -.28, z + .014))], .007, "glow", minor=4))
        P.append(shoes([(-.55 + k * .28, -.15, z + .013, .0) for k in range(5)], cols[(ri + 1) % 5], .09))
    return P


@piece(R, "ottoman_tufted_blue", tags=["seat", "pouf"], col="box", mount="floor", sit=[dict(id="sit", pos=(0, 0, .48), face=(0, -1))],
       note="otomana retangular capitone azul 1.0 x 0.5 (h 0.45)")
def ottoman():
    P = [pillow((1.0, .52, .34), (0, 0, .25), "fabric", k=.35)]
    P += tuft(.8, .32, .06, (0, 0, .43), "fabric", sx=.15, rot=(pi / 2, 0, 0))
    P.append(ck.tube(rect_pts(.98, .5, .1, 0, 0, .1), .012, "trim", minor=5, closed=True))
    P += ball_feet([-.42, .42], [-.18, .18], .04, "trim", z=.05)
    P.append(ck.heart(.12, .02, (0, -.27, .22), "trim", bevel=.007, seg=2))
    return P


@piece(R, "shopping_bags_set", tags=["decor", "floor", "bags"], col=None, mount="floor", note="3 sacolas de papel com alca de fita, laco e papel de seda")
def bags():
    P = []
    for (x, y, w, h, m, rz) in ((-.2, 0, .26, .32, "accent2", .2), (.12, .04, .22, .28, "soft", -.3), (.0, -.22, .3, .38, "base", .0)):
        bm = bmesh.new()
        P.append(rb((w, w * .45, h), (x, y, h / 2), m, .015, rot=(0, 0, rz)))
        P.append(rb((w * .5, .004, h * .26), (x, y - w * .225 * cos(rz), h * .55), "white", .002, rot=(0, 0, rz)) if False else
                 ck.heart(w * .3, .006, (x + w * .0 * cos(rz), y - w * .23, h * .5), "trim", rot=(0, 0, rz), bevel=.002, seg=1))
        P.append(ck.tube([Vector((x - w * .22 * cos(rz), y - w * .22 * sin(rz), h)), Vector((x - w * .15 * cos(rz), y, h + w * .55)), Vector((x + w * .15 * cos(rz), y, h + w * .55)), Vector((x + w * .22 * cos(rz), y + w * .22 * sin(rz), h))], .008, "trim", minor=4))
        P.append(cloud([(x, y, h + .02, (w * .5, w * .25, .06))], "white", 8, 4))
    return P


@piece(R, "hat_tree_gold", tags=["decor", "display", "hats"], col="cyl", mount="floor", note="arvore de chapeus champagne com 5 chapeus pastel (h 1.7)")
def hat_tree():
    P = [ck.lathe([(0, 0), (.2, 0), (.2, .03), (.05, .08), (.03, 1.5), (0, 1.55)], "trim", n=16, smooth=1)]
    P.append(ck.sph((.1, .1, .1), (0, 0, 1.6), "trim", n=8, rings=5))
    cols = ["accent2", "white", "soft", "accent", "fabric"]
    for k in range(5):
        a = 2 * pi * k / 5 + .3
        z = 1.2 + .22 * (k % 2) - .1 * (k // 3)
        P.append(ck.tube([Vector((0, 0, z)), Vector((.12 * cos(a), .12 * sin(a), z + .05)), Vector((.22 * cos(a), .22 * sin(a), z + .02))], .012, "trim", minor=5))
        hx, hy = .3 * cos(a), .3 * sin(a)
        P.append(ck.cyl(.14, .015, (hx, hy, z - .03), cols[k], n=18, bevel=.005))
        P.append(ck.lathe([(0, 0), (.08, 0), (.075, .08), (0, .09)], cols[k], (hx, hy, z - .02), n=14, smooth=0))
        P.append(ring(.08, .008, (hx, hy, z + .015), "trim", n=14, minor=4))
    return P


@piece(R, "chandelier_drum_crystal", tags=["light", "ceiling"], col=None, mount="ceiling", lights=[dict(pos=(0, 0, -.9), color="#fff0d8", range=6, intensity=1.0)],
       note="lustre de tambor com cortina de cristais e champagne (pende 1.0 m, diametro 0.9)")
def chandelier_drum():
    P = [ck.cyl(.1, .04, (0, 0, -.02), "trim", n=12), ck.tube([Vector((0, 0, -.04)), Vector((0, 0, -.5))], .012, "trim", minor=5)]
    P.append(ck.lathe([(0, -.5), (.4, -.52), (.44, -.6), (.44, -.7), (.4, -.78), (0, -.8)], "glow", n=30, smooth=0))
    P.append(ring(.44, .02, (0, 0, -.58), "trim", n=36, minor=6))
    P.append(ring(.44, .02, (0, 0, -.72), "trim", n=36, minor=6))
    for k in range(4):
        a = pi / 2 * k
        P.append(ck.tube([Vector((0, 0, -.5)), Vector((.44 * cos(a), .44 * sin(a), -.58))], .008, "trim", minor=4))
    dr = []
    for k in range(40):
        a = 2 * pi * k / 40
        for j in range(3):
            dr.append((.46 * cos(a), .46 * sin(a), -.78 - j * .09 - .04 * (k % 2), .045))
    P.append(crystals(dr))
    P.append(crystals([(0, 0, -.9, .1)]))
    return P


@piece(R, "sign_marquee_heart", tags=["wall", "sign", "light"], col=None, mount="wall", lights=[dict(pos=(0, -.2, 2.2), color="#fff0d8", range=3, intensity=0.5)],
       note="coracao marquise com lampadas em volta (z 1.8 a 2.6)")
def sign_marquee():
    z = 2.2
    P = [ck.heart(.8, .05, (0, .03, z), "white", bevel=.015, seg=2)]
    pts = heart_outline(.9, 40)
    P.append(bulbs([(p[0] * .95, -.03, z + p[1] * .95 - .02) for p in pts[::2]], .024))
    P.append(ck.tube([Vector((p[0] * .87, -.02, z + p[1] * .87 - .02)) for p in pts], .014, "trim", minor=5, closed=True))
    return P


CAM = ((2.8, -5.0, 1.6), (0.0, 1.2, 1.1), 24)


def VIG(put):
    for x in range(-4, 6, 2):
        for y in range(-4, 5, 2):
            put("floor_blue_diamond", x, y)
    for x in (-2.0, 0.0, 2.0, 4.0):
        put("shared/wall_panel", x, 4.0)
    for y in (-3, -1, 1, 3):
        put("shared/wall_panel", -3.0, y, rz=pi / 2)
    put("rack_wall_rail", -1.8, 4.0)
    put("shoe_wall_shelf", 0.4, 4.0)
    put("sign_marquee_heart", 2.4, 4.0)
    put("checkout_counter", 2.6, 2.5)
    put("fitting_room_curtain", -2.1, 2.9)
    put("mirror_trifold_stand", -0.5, 2.4, rz=0)
    put("rack_round_carousel", -1.6, 0.4)
    put("mannequin_gown", 0.3, 0.2)
    put("dress_form_stand", 1.3, 1.0)
    put("table_display_round", 1.7, -.8)
    put("table_display_long", -.8, -1.5)
    put("ottoman_tufted_blue", -2.4, -.8, rz=pi / 2)
    put("hat_tree_gold", 3.3, 0.2)
    put("shopping_bags_set", 3.0, 3.3, z=0) if False else put("shopping_bags_set", 1.7, -.8, z=.8)
    put("chandelier_drum_crystal", .2, 0.8, z=3.2)

"""Estudio de Fotos: pessego/coral + cromado."""
from lib import *
from lib2 import *
R = "estudio"


def tripod(h, spread, r=.012, mat="trim", cx=0, cy=0, top=None):
    P = []
    top = top or h
    for k in range(3):
        a = 2 * pi * k / 3 + pi / 6
        P.append(ck.tube([Vector((cx, cy, top - .05)), Vector((cx + spread * .5 * cos(a), cy + spread * .5 * sin(a), h * .5)), Vector((cx + spread * cos(a), cy + spread * sin(a), .0))], r, mat, minor=6))
        P.append(ck.sph((r * 3, r * 3, r * 2), (cx + spread * cos(a), cy + spread * sin(a), r), "deep", n=6, rings=3))
    P.append(ck.cyl(r * 1.5, h * .4, (cx, cy, top - h * .2), mat, n=8))
    return P


@piece(R, "floor_peach_gloss", tags=["floor", "tile"], col="box", walk=True, mount="floor", note="piso pessego laqueado com xadrez coral e juntas cromadas 2x2 m")
def floor_peach():
    P = [rb((2, 2, .03), (0, 0, .015), "base", .006, seg=2)]
    for i in range(4):
        for j in range(4):
            if (i + j) % 2 == 0:
                P.append(box((.49, .49, .006), (-.75 + i * .5, -.75 + j * .5, .03), "soft"))
    P.append(box((2, .014, .008), (0, -.993, .032), "trim"))
    P.append(box((.014, 2, .008), (-.993, 0, .032), "trim"))
    for i in range(3):
        P.append(box((.01, 2, .004), (-.5 + i * .5, 0, .031), "trim"))
        P.append(box((2, .01, .004), (0, -.5 + i * .5, .031), "trim"))
    return P


@piece(R, "backdrop_roll_stand", tags=["photo", "backdrop", "hero"], col="box", hero=True, mount="floor", use=[dict(id="pose", pos=(0, -1.8, 0), face=(0, 1), label="Sessao de fotos")],
       colbox=((-1.5, 1.5), (-.1, .1), (0, 2.8)), note="fundo infinito de papel pessego em rolo com 2 suportes cromados (3.0 m larg., 2.8 m alt.); area de pose a -Y")
def backdrop():
    w = 2.8
    P = []
    for sx in (-1, 1):
        x = sx * (w / 2 + .1)
        P += tripod(2.8, .6, .014, "trim", x, 0, 2.8) if False else []
        P.append(ck.tube([Vector((x, 0, .0)), Vector((x, 0, 2.8))], .02, "trim", minor=8))
        for k in range(3):
            a = 2 * pi * k / 3 + pi / 2
            P.append(ck.tube([Vector((x, 0, .1)), Vector((x + .4 * cos(a), .4 * sin(a), .02))], .016, "trim", minor=6))
            P.append(ck.sph((.06, .06, .05), (x + .4 * cos(a), .4 * sin(a), .025), "deep", n=6, rings=3))
        P.append(ck.sph((.09, .09, .09), (x, 0, 2.84), "trim", n=8, rings=5))
    P.append(ck.cyl(.07, w + .1, (0, 0, 2.7), "trim", rot=(0, pi / 2, 0), n=16))
    P.append(ck.cyl(.1, w - .15, (0, 0, 2.7), "soft", rot=(0, pi / 2, 0), n=22))
    bm = bmesh.new()
    nz = 28
    g = {}
    for a in range(2):
        for b in range(nz + 1):
            t = b / nz
            z = 2.62 * (1 - t)
            y = .0 if t < .7 else -.9 * ((t - .7) / .3) ** 2 * .9
            if t >= .7:
                z = 2.62 * (1 - t) * 1.0 + .0
            g[(a, b)] = bm.verts.new((-w / 2 + a * w, y - .1, max(z, .02) if t < .99 else .02))
    for b in range(nz):
        bm.faces.new((g[(0, b)], g[(1, b)], g[(1, b + 1)], g[(0, b + 1)]))
    P.append(obj(bm, "base"))
    P.append(ck.cyl(.04, .04, (w / 2 - .08, 0, 2.7), "deep", rot=(0, pi / 2, 0), n=10))
    return P


@piece(R, "softbox_light_stand", tags=["photo", "light"], col="cyl", mount="floor", lights=[dict(pos=(0, -.5, 1.9), color="#fff4e6", range=6, intensity=1.2)],
       note="softbox retangular 0.8 x 0.6 em tripe cromado com haste articulada (h 2.1)")
def softbox():
    P = tripod(2.0, .5, .014, "trim", 0, 0, 1.95)
    P.append(ck.tube([Vector((0, 0, 1.9)), Vector((0, -.1, 2.0))], .02, "trim", minor=6))
    P.append(rb((.1, .1, .1), (0, -.1, 2.0), "deep", .03))
    P.append(ck.lathe([(0, 0), (.1, 0), (.4, .0), (.4, 0)], "trim", (0, 0, 0)) if False else None)
    # softbox: tronco de piramide
    bm = bmesh.new()
    f = [(-.1, -.12, 1.9), (.1, -.12, 1.9), (.1, -.12, 2.1), (-.1, -.12, 2.1)]
    bk = [(-.32, -.48, 1.7), (.32, -.48, 1.7), (.32, -.48, 2.3), (-.32, -.48, 2.3)]
    vb = [bm.verts.new(p) for p in f]
    vf = [bm.verts.new(p) for p in bk]
    for i in range(4):
        j = (i + 1) % 4
        bm.faces.new((vb[i], vb[j], vf[j], vf[i]))
    bm.faces.new(vb[::-1])
    P.append(obj(bm, "white"))
    P.append(box((.62, .02, .56), (0, -.49, 2.0), "glow"))
    P.append(ck.tube(rect_pts(.66, .02, 2.0, 0, -.5, .0)[:0] or [Vector((-.33, -.5, 1.69)), Vector((.33, -.5, 1.69)), Vector((.33, -.5, 2.31)), Vector((-.33, -.5, 2.31)), Vector((-.33, -.5, 1.69))], .012, "trim", minor=5))
    return [p for p in P if p is not None]


@piece(R, "ring_light_stand", tags=["photo", "light"], col="cyl", mount="floor", lights=[dict(pos=(0, -.3, 1.6), color="#fff4e6", range=5, intensity=1.0)],
       note="ring light 0.5 m com suporte de celular em tripe (h 1.9)")
def ring_light():
    P = tripod(1.5, .4, .012, "trim", 0, 0, 1.45)
    P.append(ck.tube([Vector((0, 0, 1.45)), Vector((0, 0, 1.6))], .016, "trim", minor=6))
    P.append(ring(.26, .028, (0, 0, 1.9 - .15), "glow", n=40, minor=8, rot=(pi / 2, 0, 0)))
    P.append(ring(.26, .035, (0, .02, 1.75), "white", n=40, minor=8, rot=(pi / 2, 0, 0)))
    P.append(ck.tube([Vector((0, .0, 1.6)), Vector((0, .02, 1.75 - .26 + .0))], .014, "trim", minor=6))
    P.append(rb((.08, .02, .15), (0, -.0, 1.75), "deep", .01))
    P.append(rb((.07, .008, .13), (0, -.016, 1.75), "mirror", .003))
    P.append(ck.cyl(.01, .06, (0, -.0, 1.69), "trim", n=6))
    return P


@piece(R, "camera_tripod_pro", tags=["photo", "camera", "hero"], col="cyl", hero=True, mount="floor", use=[dict(id="camera", pos=(0, -.8, 0), face=(0, 1), label="Tirar foto")],
       note="camera mirrorless rosa/cromada com lente grande em tripe cromado (h 1.5)")
def camera():
    P = tripod(1.3, .45, .012, "trim", 0, 0, 1.2)
    P.append(ck.tube([Vector((0, 0, 1.2)), Vector((0, 0, 1.3))], .02, "trim", minor=6))
    z = 1.45
    P.append(rb((.2, .1, .13), (0, 0, z), "deep", .03))
    P.append(rb((.2, .1, .05), (0, 0, z + .09), "trim", .015))
    P.append(rb((.06, .06, .05), (0, 0, z + .14), "trim", .015))
    P.append(ck.cyl(.05, .03, (.07, .0, z + .08), "accent2", rot=(0, 0, 0), n=12))
    P.append(ck.lathe([(0, 0), (.055, 0), (.06, .03), (.07, .06), (.07, .12), (.06, .14), (0, .14)], "trim", (0, -.05, z), rot=(pi / 2, 0, 0) if False else (-pi / 2, 0, 0), n=20))
    P.append(ck.lathe([(0, 0), (.05, 0), (.052, .02), (0, .02)], "glass", (0, -.19, z), rot=(-pi / 2, 0, 0), n=18))
    P.append(ck.sph((.045, .045, .02), (0, -.205, z), "deep", n=10, rings=4))
    P.append(ring(.065, .006, (0, -.12, z), "accent2", n=20, minor=4, rot=(pi / 2, 0, 0)))
    P.append(ck.heart(.05, .01, (-.06, -.052, z + .035), "accent2", bevel=.003, seg=1))
    P.append(ck.sph((.03, .03, .03), (-.07, -.03, z + .12), "glow", n=8, rings=4))
    return [p for p in P if p is not None]


@piece(R, "flower_giant_prop", tags=["prop", "decor", "hero"], col="cyl", hero=True, mount="floor", note="flor gigante de cenario (cabeca 1.1 m, h 2.0) com caule, folhas e base redonda")
def flower_giant():
    P = [ck.cyl(.4, .06, (0, 0, .03), "white", n=28, bevel=.02), ring(.4, .012, (0, 0, .06), "trim", n=28, minor=5)]
    P.append(ck.tube([Vector((0, 0, .06)), Vector((.0, -.05, .8)), Vector((0, -.02, 1.4))], .035, "leaf", minor=8))
    zc = 1.5
    for L, (n, r, tilt, mat, ln) in enumerate(((10, .38, 1.0, "accent2", .52), (9, .3, .75, "accent", .46), (7, .2, .45, "soft", .36))):
        bm = bmesh.new()
        for k in range(n):
            a = 2 * pi * k / n + L * .3
            bl = ck.bm_sphere(ln * .8, .07, ln, 10, 6)
            for v in bl.verts:
                x, y, z = v.co.x, v.co.y, v.co.z + ln * .5
                y2 = y * cos(tilt) + z * sin(tilt)
                z2 = -y * sin(tilt) + z * cos(tilt)
                v.co = (x * cos(a) - y2 * sin(a), x * sin(a) + y2 * cos(a), z2)
            merge(bm, bl, (0, 0, zc - .03 * L))
        P.append(obj(bm, mat))
    P.append(ck.sph((.22, .22, .12), (0, 0, zc + .05), "trim", n=14, rings=6))
    P.append(cloud([(.07 * cos(a), .07 * sin(a), zc + .1, .02) for a in [k * pi / 3 for k in range(6)]], "glow", 6, 4))
    for sx, rz in ((-1, .3), (1, -.3)):
        bm = bmesh.new()
        bl = ck.bm_sphere(.28, .04, .7, 10, 6)
        for v in bl.verts:
            x, y, z = v.co.x, v.co.y, v.co.z + .35
            v.co = (x * cos(.7 * sx) + z * sin(.7 * sx) * 0.0 + (z * sx * .6), y, z)
        merge(bm, bl, (sx * .06, 0, .5))
        P.append(obj(bm, "leaf"))
    return P


@piece(R, "chair_heart_pose", tags=["seat", "prop"], col="box", mount="floor", sit=[dict(id="sit", pos=(0, 0, .5), face=(0, -1), label="Posar na cadeira")],
       note="cadeira de pose com encosto de coracao capitone coral e pernas cromadas (h 1.2)")
def chair_heart():
    P = [ck.cyl(.28, .1, (0, 0, .43), "fabric", n=28, bevel=.04), ring(.28, .012, (0, 0, .38), "trim", n=28, minor=5)]
    P.append(ck.sph((.54, .54, .12), (0, 0, .5), "fabric", n=20, rings=6))
    for k in range(4):
        a = pi / 4 + k * pi / 2
        P.append(ck.tube([Vector((.18 * cos(a), .18 * sin(a), .38)), Vector((.26 * cos(a), .26 * sin(a), .2)), Vector((.3 * cos(a), .3 * sin(a), .0))], .017, "trim", minor=6))
    P.append(ck.heart(.8, .14, (0, .26, .95), "fabric", bevel=.05, seg=3))
    return P


@piece(R, "sign_neon_camera", tags=["wall", "sign", "light"], col=None, mount="wall", lights=[dict(pos=(0, -.3, 2.2), color="#ff7f6b", range=3, intensity=0.6)],
       note="letreiro neon de camera com coracao e brilhos (z 1.8 a 2.6)")
def sign_camera():
    z = 2.15
    P = [rb((1.0, .03, .75), (0, .015, z), "deep", .012)]
    P.append(neon([(-.3, -.12), (.3, -.12), (.3, .12), (.14, .12), (.1, .2), (-.1, .2), (-.14, .12), (-.3, .12)], (0, 0, z), "glow2", .012, closed=True, y=-.03))
    P.append(neon(arc2(0, 0, .1, 0, 2 * pi, 20), (0, 0, z), "glow2", .012, closed=True, y=-.03))
    P.append(neon([(p[0] * .3, p[1] * .3) for p in heart_outline(.5, 30)], (0, 0, z - .0), "glow", .008, closed=True, y=-.03))
    for (x, zz, s) in ((.4, .25, .05), (-.4, .2, .035)):
        P.append(neon([(x, zz - s), (x, zz + s)], (0, 0, z), "glow", .006, y=-.03))
        P.append(neon([(x - s, zz), (x + s, zz)], (0, 0, z), "glow", .006, y=-.03))
    return P


@piece(R, "screen_changing_folding", tags=["screen", "fitting"], col="box", mount="floor", use=[dict(id="change", pos=(0, -.8, 0), face=(0, 1), label="Trocar de roupa")],
       note="biombo dobravel de 3 paineis em tecido coral com moldura cromada (1.8 x 1.8)")
def screen():
    P = []
    for k in range(3):
        ang = (-.35, .35, -.35)[k]
        cx = -.58 + k * .58
        cy = 0 if k != 1 else .0
        pw = .55
        parts = []
        parts.append(rb((pw, .03, 1.7), (0, 0, .95), "fabric", .01))
        parts += frame(pw + .04, 1.76, .035, (0, 0, .93), "trim", d=.04, r=.012)
        parts.append(ck.heart(.18, .012, (0, -.025, 1.35), "white", bevel=.004, seg=1))
        for p in parts:
            p.location = Vector((cx, cy, 0))
            p.rotation_euler = (0, 0, ang * 0.0)
            P.append(p)
    # zigue-zague: desloca em Y
    for i, p in enumerate(P):
        pass
    P2 = []
    for p in P:
        P2.append(p)
    return P2


@piece(R, "desk_monitor_station", tags=["desk", "computer", "hero"], col="box", hero=True, mount="floor", use=[dict(id="edit", pos=(0, -.8, 0), face=(0, 1), label="Editar fotos")],
       note="mesa com monitor grande (grade de fotos), teclado, mouse, luminaria e camera (1.4 x 0.7, h 1.3)")
def desk():
    w, d = 1.4, .7
    P = [rb((w, d, .05), (0, 0, .73), "white", .02)]
    for sx in (-1, 1):
        P.append(rb((.05, d - .1, .72), (sx * (w / 2 - .05), 0, .37), "trim", .015))
    P.append(rb((.5, d - .12, .5), (-.43, 0, .45), "base", .04))
    for z in (.62, .46, .3):
        P.append(rb((.42, .015, .12), (-.43, -d / 2 + .05, z), "accent", .006))
        P.append(knob((-.43, -d / 2 + .035, z), "trim", .014))
    P.append(ck.tube([Vector((.0, .15, .75)), Vector((0, .15, .9))], .02, "trim", minor=6))
    P.append(rb((.4, .16, .02), (0, .15, .76), "trim", .008))
    P.append(rb((.9, .04, .52), (0, .15, 1.15), "trim", .02))
    P.append(rb((.84, .01, .46), (0, .125, 1.15), "glow"))
    for i in range(3):
        for j in range(2):
            col = ["accent2", "soft", "fabric", "white", "base", "deep"][(i + j * 3) % 6]
            P.append(rb((.24, .004, .19), (-.27 + i * .27, .12, 1.0 + j * .23), col, .001))
    P.append(rb((.45, .14, .015), (.1, -.12, .765), "white", .005))
    P.append(rb((.07, .1, .02), (.45, -.12, .77), "white", .008))
    P.append(ck.lathe([(0, 0), (.04, 0), (.03, .02), (0, .03)], "trim", (.55, .1, .75), n=10))
    P.append(ck.tube([Vector((.55, .1, .77)), Vector((.55, .08, .98)), Vector((.5, 0, 1.15))], .008, "trim", minor=4))
    P.append(ck.lathe([(0, 0), (.06, 0), (.08, .04), (0, .06)], "accent2", (.5, 0, 1.12), rot=(0, 0, 0), n=14))
    P.append(ck.sph((.05, .05, .05), (.5, 0, 1.15), "glow", n=8, rings=4))
    P.append(ck.heart(.06, .01, (.22, -.12, .8), "accent2", bevel=.003, seg=1) if False else None)
    return [p for p in P if p is not None]


@piece(R, "chair_swivel_pink", tags=["seat", "office"], col="cyl", mount="floor", sit=[dict(id="sit", pos=(0, 0, .5), face=(0, -1))],
       note="cadeira giratoria coral com base estrela cromada (assento 0.46)")
def swivel():
    P = []
    for k in range(5):
        a = 2 * pi * k / 5 + pi / 2
        P.append(ck.tube([Vector((0, 0, .1)), Vector((.18 * cos(a), .18 * sin(a), .08)), Vector((.3 * cos(a), .3 * sin(a), .05))], .02, "trim", minor=6))
        P.append(ck.sph((.06, .06, .06), (.3 * cos(a), .3 * sin(a), .04), "deep", n=6, rings=3))
    P.append(ck.cyl(.04, .3, (0, 0, .25), "trim", n=10))
    P.append(pillow((.48, .46, .12), (0, 0, .44), "fabric", k=.45))
    P.append(pillow((.42, .1, .34), (0, .22, .72), "fabric", rot=(-.1, 0, 0), k=.45))
    P.append(ck.tube([Vector((0, .1, .46)), Vector((0, .2, .52))], .016, "trim", minor=5))
    return P


@piece(R, "umbrella_reflector_stand", tags=["photo", "light"], col="cyl", mount="floor", lights=[dict(pos=(0, -.4, 1.8), color="#fff4e6", range=5, intensity=0.8)],
       note="guarda-chuva refletor prateado em tripe (h 2.0, diam 1.1)")
def umbrella():
    P = tripod(1.7, .45, .012, "trim", 0, 0, 1.65)
    P.append(ck.tube([Vector((0, 0, 1.6)), Vector((0, -.05, 1.9))], .014, "trim", minor=6))
    P.append(ck.lathe([(0, 0), (.15, -.03), (.4, -.15), (.55, -.3), (.55, -.31), (.4, -.17), (.15, -.05), (0, -.02)], "mirror", (0, -.05, 1.95), rot=(-pi / 2 + .0, 0, 0), n=16))
    P.append(ck.lathe([(.55, -.3), (.56, -.3), (.56, -.32), (.55, -.32)], "white", (0, -.05, 1.95), rot=(-pi / 2, 0, 0), n=16))
    P.append(ck.sph((.06, .06, .06), (0, -.07, 1.93), "deep", n=6, rings=3))
    return P


@piece(R, "posing_blocks_set", tags=["prop", "platform"], col="box", mount="floor", sit=[dict(id="sit", pos=(.3, 0, .42), face=(0, -1))],
       note="3 plataformas cilindricas pastel de alturas 0.2/0.4/0.6 para poses (diam 0.5 a 0.9)")
def blocks():
    P = []
    for (x, y, r, h, m) in ((-.45, 0, .38, .2, "soft"), (.2, .1, .3, .4, "accent2"), (.65, -.25, .24, .6, "white")):
        P.append(ck.cyl(r, h, (x, y, h / 2), m, n=28, bevel=.025))
        P.append(ring(r, .01, (x, y, h), "trim", n=28, minor=5))
    return P


@piece(R, "polaroid_wall_string", tags=["wall", "decor"], col=None, mount="wall", lights=[], note="varal de polaroids com luzinhas (2.0 m, z 1.5 a 2.5)")
def polaroids():
    P = []
    pts = [Vector((-1 + 2 * i / 16, -.03, 2.45 - .12 * sin(pi * i / 16))) for i in range(17)]
    P.append(ck.tube(pts, .005, "trim", minor=4))
    cols = ["accent2", "soft", "fabric", "base", "deep", "white"]
    for k in range(7):
        x = -.82 + k * .275
        z = 2.45 - .12 * sin(pi * (x + 1) / 2) - .02
        rot = (0, 0, .06 * (-1) ** k)
        P.append(rb((.18, .01, .22), (x, -.04, z - .13), "white", .004, rot=(0, .0, .06 * (-1) ** k)))
        P.append(rb((.14, .004, .14), (x, -.047, z - .1), cols[k % 6], .002, rot=(0, 0, .06 * (-1) ** k)))
        P.append(rb((.012, .02, .03), (x, -.04, z - .01), "trim", .003))
    P.append(bulbs([(p.x + .02, -.04, p.z - .0) for p in pts[::2]], .014))
    return P


@piece(R, "balloon_arch_pastel", tags=["prop", "decor", "balloon"], col=None, mount="floor", note="arco organico de baloes pastel (2.4 m larg., 2.2 m alt.)")
def balloon_arch():
    import random
    rnd = random.Random(7)
    items = []
    cols = ["accent2", "soft", "accent", "fabric", "white"]
    groups = {m: [] for m in cols}
    for i in range(60):
        t = pi * i / 59
        x = 1.15 * cos(t)
        z = .15 + 2.0 * sin(t)
        r = .09 + rnd.random() * .09
        groups[cols[rnd.randrange(5)]].append((x + rnd.uniform(-.07, .07), rnd.uniform(-.1, .1), z + rnd.uniform(-.07, .07), r))
    P = [cloud(items, m, 10, 6) for m, items in groups.items() if items]
    P.append(ck.cyl(.2, .03, (-1.15, 0, .015), "trim", n=14)) if False else None
    return [p for p in P if p is not None]


@piece(R, "track_spots_ceiling", tags=["light", "ceiling"], col=None, mount="ceiling", lights=[dict(pos=(0, 0, -.4), color="#fff4e6", range=5, intensity=0.9)],
       note="trilho de teto cromado com 4 spots (2.0 m, pende 0.45)")
def track():
    P = [rb((2.0, .06, .04), (0, 0, -.02), "trim", .012)]
    for k in range(4):
        x = -.75 + k * .5
        P.append(ck.tube([Vector((x, 0, -.04)), Vector((x, 0, -.14))], .01, "trim", minor=5))
        P.append(ck.lathe([(0, 0), (.05, 0), (.07, -.12), (.07, -.2), (0, -.2)], "trim", (x, -.05 * ((-1) ** k), -.14), rot=(.3 * (-1) ** k, 0, 0), n=14))
        P.append(ck.cyl(.06, .01, (x + 0, -.05 * ((-1) ** k) + .0, -.34), "glow", n=14, rot=(.3 * (-1) ** k, 0, 0)))
    return P


CAM = ((2.8, -5.0, 1.6), (0.0, 1.2, 1.1), 24)


def VIG(put):
    for x in range(-4, 6, 2):
        for y in range(-4, 5, 2):
            put("floor_peach_gloss", x, y)
    for x in (-2.0, 0.0, 2.0, 4.0):
        put("shared/wall_panel", x, 4.0)
    for y in (-3, -1, 1, 3):
        put("shared/wall_panel", -3.0, y, rz=pi / 2)
    put("backdrop_roll_stand", 0.2, 3.5)
    put("sign_neon_camera", 3.0, 4.0)
    put("polaroid_wall_string", -2.2, 4.0) if False else None
    put("flower_giant_prop", -1.5, 2.3)
    put("chair_heart_pose", 0.4, 2.3, rz=.3)
    put("softbox_light_stand", -1.5, -.2, rz=.5)
    put("ring_light_stand", 1.7, -.6, rz=-.4)
    put("camera_tripod_pro", 0.2, -1.1, rz=pi)
    put("umbrella_reflector_stand", 2.7, 0.9, rz=.5)
    put("desk_monitor_station", -2.6, 0.0, rz=pi / 2) if False else None
    put("desk_monitor_station", -2.6, 0.8, rz=pi / 2)
    put("chair_swivel_pink", -1.8, .8, rz=-pi / 2)
    put("posing_blocks_set", 2.3, 2.6)
    put("screen_changing_folding", -2.6, 2.6, rz=pi / 2) if False else None
    put("track_spots_ceiling", 0.2, 1.2, z=3.2)
    put("balloon_arch_pastel", .5, 3.8) if False else None

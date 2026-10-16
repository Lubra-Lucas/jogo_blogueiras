"""Palco Neon / boate: ameixa + azul-marinho + neon rosa/ciano."""
from lib import *
from lib2 import *
from mathutils import Matrix, Quaternion
R = "palco"
EXPO = -0.2
WORLD = ("#1a1030", 0.5)
LIGHT = "#ff9be8"


def star_pts(r, n=5, k=.45):
    return [((r if i % 2 == 0 else r * k) * cos(pi / 2 + pi * i / n), (r if i % 2 == 0 else r * k) * sin(pi / 2 + pi * i / n)) for i in range(2 * n)]


@piece(R, "floor_dance_grid", tags=["floor", "tile", "dance"], col="box", walk=True, mount="floor", note="pista de danca 2x2 m: grade 4x4 de ladrilhos luminosos (glow rosa / glow2 ciano) sob vidro preto, moldura cromada")
def floor_dance():
    P = [rb((2, 2, .06), (0, 0, .03), "deep", .01, seg=2)]
    for i in range(4):
        for j in range(4):
            P.append(rb((.44, .44, .02), (-.75 + i * .5, -.75 + j * .5, .065), "glow" if (i + j) % 2 == 0 else "glow2", .004))
    P.append(rb((2, 2, .012), (0, 0, .085), "glass", .003))
    P.append(box((2, .03, .016), (0, -.985, .07), "trim"))
    P.append(box((.03, 2, .016), (-.985, 0, .07), "trim"))
    return P


@piece(R, "stage_platform_4m", tags=["stage", "platform", "hero"], col="box", walk=True, hero=True, mount="floor", use=[dict(id="perform", pos=(0, 0, .55), face=(0, -1), label="Subir no palco")],
       note="palco 4.0 x 2.6 m, altura 0.55 (topo caminhavel), borda neon, escada lateral e saia de cortinas")
def stage():
    w, d, h = 4.0, 2.6, .55
    P = [rb((w, d, h), (0, 0, h / 2), "base", .04), rb((w + .1, d + .1, .05), (0, 0, h + .025), "trim", .015)]
    P.append(rb((w - .1, d - .1, .01), (0, 0, h + .055), "deep", .004))
    for i in range(8):
        for j in range(4):
            P.append(rb((.46, .6, .006), (-w / 2 + .3 + i * .5, -d / 2 + .4 + j * .6, h + .062), "soft" if (i + j) % 2 else "deep", .001))
    P.append(ck.tube([Vector((-w / 2 - .0, -d / 2 - .03, h - .06)), Vector((w / 2, -d / 2 - .03, h - .06))], .018, "glow", minor=6))
    P.append(ck.tube([Vector((-w / 2 - .03, -d / 2, h - .06)), Vector((-w / 2 - .03, d / 2, h - .06))], .018, "glow2", minor=6))
    P.append(ck.tube([Vector((w / 2 + .03, -d / 2, h - .06)), Vector((w / 2 + .03, d / 2, h - .06))], .018, "glow2", minor=6))
    P.append(drape(w - .1, .4, (0, -d / 2 - .06, h - .1), "accent2", folds=16, amp=.04, per=4, nz=3))
    for k in range(3):
        P.append(rb((.9, .3, .17), (w / 2 + .45 + .0, -d / 2 + .4 + k * 0, .09 + k * .0), "base", .03)) if False else None
    for k in range(3):
        P.append(rb((.9, .5, .15), (w / 2 + .5, -d / 2 + .25 + .0, .085 + .0), "base", .03)) if k == 0 else None
    P.append(rb((.8, .55, .18), (w / 2 + .45, -.7, .09), "base", .03))
    P.append(rb((.8, .55, .18), (w / 2 + .45, -.7, .09 + .0), "base", .03)) if False else None
    P.append(rb((.5, .5, .18), (w / 2 + .35, -.7, .27), "base", .03) if False else rb((.45, .55, .18), (w / 2 + .25, -.7, .36), "base", .03))
    P.append(ck.tube([Vector((w / 2 + .85, -.42, .18)), Vector((w / 2 + .85, -.42, .35))], .01, "trim", minor=4)) if False else None
    for k in range(3):
        P.append(ck.heart(.2, .02, (-1.2 + k * 1.2, -d / 2 - .02, .22), "glow", bevel=.006, seg=2) if False else ck.heart(.2, .02, (-1.2 + k * 1.2, -d / 2 - .03, .25), "glow", bevel=.006, seg=2))
    return [p for p in P if p is not None]


@piece(R, "truss_lights_rig", tags=["light", "ceiling", "stage", "hero"], col=None, mount="ceiling", hero=True, lights=[dict(pos=(-1.2, 0, -.5), color="#ff4fd0", range=6, intensity=1.0), dict(pos=(1.2, 0, -.5), color="#4ff0ff", range=6, intensity=1.0)],
       note="treliça de palco 4.0 m com 6 refletores PAR coloridos (pende 0.6 m)")
def truss():
    P = []
    L = 4.0
    for sy in (-.15, .15):
        for sz in (-.3, -.05):
            P.append(ck.cyl(.018, L, (0, sy, sz), "trim", rot=(0, pi / 2, 0), n=8))
    for k in range(15):
        x = -L / 2 + L * k / 14
        P.append(ck.tube([Vector((x, -.15, -.3)), Vector((x + (.13 if k % 2 else -.13), .15, -.05))], .008, "trim", minor=4)) if False else None
        P.append(ck.tube([Vector((x, -.15, -.3)), Vector((x, -.15, -.05)), Vector((x, .15, -.05)), Vector((x, .15, -.3))], .008, "trim", minor=4))
    for k in range(6):
        x = -1.7 + k * .68
        col = "glow" if k % 2 == 0 else "glow2"
        P.append(ck.tube([Vector((x, 0, -.3)), Vector((x, 0, -.36))], .015, "trim", minor=5))
        P.append(ck.lathe([(0, 0), (.07, 0), (.1, -.18), (.0, -.18)], "deep", (x, 0, -.36), n=14))
        P.append(ck.cyl(.095, .02, (x, 0, -.56), col, n=14))
        P.append(ring(.1, .008, (x, 0, -.545), "trim", n=14, minor=4))
    return P


def disc_facets(r, nlat=9, nlon=18, s=.075):
    bm = bmesh.new()
    for i in range(1, nlat):
        th = pi * i / nlat
        n = max(4, int(nlon * sin(th)))
        for j in range(n):
            ph = 2 * pi * j / n + (i % 2) * pi / n
            nrm = Vector((sin(th) * cos(ph), sin(th) * sin(ph), -cos(th)))
            q = Vector((0, 0, 1)).rotation_difference(nrm)
            src = ck.bm_box(s, s, .025)
            mat = Matrix.Translation(nrm * r) @ q.to_matrix().to_4x4()
            m = {}
            for v in src.verts:
                m[v] = bm.verts.new(mat @ v.co)
            for f in src.faces:
                bm.faces.new([m[v] for v in f.verts])
            src.free()
    return bm


@piece(R, "disco_ball_mirrored", tags=["light", "ceiling", "decor", "hero"], col=None, mount="ceiling", hero=True, lights=[dict(pos=(0, 0, -1.0), color="#ffffff", range=8, intensity=0.8)],
       note="globo de espelhos facetado diam 0.9 m com corrente e tampa dourada; pende 1.1 m (gire no jogo)")
def disco():
    P = [ck.cyl(.08, .04, (0, 0, -.02), "trim", n=12), ck.tube([Vector((0, 0, -.04)), Vector((0, 0, -.55))], .006, "trim", minor=4)]
    P.append(ck.sph((.9, .9, .9), (0, 0, -1.0), "deep", n=18, rings=12) if False else ck.sph((.86, .86, .86), (0, 0, -1.0), "deep", n=16, rings=10))
    tiles = disc_facets(.45, 10, 20, .08)
    P.append(obj(tiles, "mirror", (0, 0, -1.0)))
    P.append(ck.cyl(.05, .1, (0, 0, -.58), "trim", n=10))
    P.append(ck.sph((.05, .05, .05), (0, 0, -1.47), "trim", n=8, rings=4))
    return P


@piece(R, "dj_booth_neon", tags=["dj", "stage", "hero"], col="box", hero=True, mount="floor", use=[dict(id="dj", pos=(0, .85, 0), face=(0, -1), label="Tocar como DJ")],
       lights=[dict(pos=(0, -.5, .8), color="#ff4fd0", range=4, intensity=0.9)],
       note="cabine de DJ 2.4 m: painel frontal de LED, 2 toca-discos, mixer, laptop e fone; DJ fica em +Y olhando -Y (h 1.15)")
def dj_booth():
    w, d = 2.4, .8
    P = [rb((w, d, .95), (0, 0, .5), "base", .05), rb((w + .1, d + .1, .06), (0, 0, 1.0), "soft", .02), rb((w + .12, d + .12, .04), (0, 0, .02), "trim", .012)]
    for i in range(12):
        for j in range(5):
            P.append(rb((.15, .012, .1), (-1.0 + i * .182, -d / 2 - .005, .2 + j * .14), "glow" if (i + j) % 3 == 0 else ("glow2" if (i + j) % 3 == 1 else "deep"), .003))
    P.append(ck.tube(rect_pts(w + .06, d + .06, 1.035, 0, 0, .05), .014, "glow2", minor=5, closed=True))
    for sx in (-1, 1):
        x = sx * .75
        P.append(rb((.6, .5, .05), (x, .0, 1.05), "deep", .015))
        P.append(ck.cyl(.2, .015, (x - sx * .02, 0, 1.085), "deep", n=28))
        P.append(ring(.2, .008, (x - sx * .02, 0, 1.092), "glow", n=28, minor=4))
        P.append(ck.cyl(.06, .01, (x - sx * .02, 0, 1.097), "accent2", n=14))
        P.append(ck.tube([Vector((x + sx * .2, .2, 1.08)), Vector((x + sx * .2, .12, 1.12)), Vector((x + sx * .12, -.1, 1.1))], .008, "trim", minor=4))
        P.append(ck.sph((.05, .05, .05), (x + sx * .22, .2, 1.09), "trim", n=8, rings=4))
    P.append(rb((.5, .4, .07), (0, 0, 1.06), "deep", .02))
    for k in range(5):
        P.append(ck.cyl(.022, .02, (-.17 + k * .085, -.12, 1.11), "glow" if k % 2 else "glow2", n=8))
    for k in range(4):
        P.append(rb((.015, .12, .01), (-.15 + k * .1, .08, 1.11), "trim", .003))
        P.append(ck.sph((.03, .03, .02), (-.15 + k * .1, .0 + .08 * (k % 2), 1.12), "accent2", n=6, rings=3))
    P.append(rb((.5, .32, .02), (0, .3, 1.04), "trim", .008)) if False else None
    P.append(rb((.38, .26, .02), (0, .3, 1.04), "trim", .008, rot=(0, 0, 0)))
    P.append(rb((.38, .01, .26), (0, .42, 1.17), "deep", .004, rot=(-.15, 0, 0)))
    P.append(rb((.34, .004, .22), (0, .41, 1.17), "glow2", .001, rot=(-.15, 0, 0)))
    P.append(ck.tube([Vector((.9, .3, 1.04)), Vector((.9, .3, 1.15)), Vector((1.0, .3, 1.15)), Vector((1.0, .3, 1.05))], .012, "trim", minor=5)) if False else None
    P.append(ck.heart(.3, .03, (0, -d / 2 - .06, .55), "glow", bevel=.01, seg=2))
    return [p for p in P if p is not None]


@piece(R, "speaker_stack_neon", tags=["audio", "stage", "decor"], col="box", mount="floor", note="torre de caixas de som 0.65 x 0.55 x 1.9 com subs, tops, grades cromadas e faixa neon")
def speaker():
    P = []
    P.append(rb((.65, .55, .5), (0, 0, .28), "deep", .035))
    P.append(rb((.6, .5, .38), (0, 0, .75), "deep", .03))
    P.append(rb((.55, .45, .28), (0, 0, 1.08), "deep", .03))
    P.append(rb((.5, .4, .24), (0, 0, 1.34), "deep", .03))
    P.append(rb((.45, .38, .22), (0, 0, 1.6), "deep", .03))
    for (z, r) in ((.28, .2), (.75, .17), (1.08, .11), (1.34, .09), (1.6, .09)):
        P.append(ck.lathe([(0, 0), (r, 0), (r * .8, -.04), (r * .3, -.05), (0, -.03)], "base", (0, -.27 if z < .6 else -.24 + (z > 1 and .02) , z), rot=(-pi / 2, 0, 0) if False else (pi / 2, 0, 0), n=18))
        P.append(ring(r, .01, (0, -.27 if z < .6 else -.24, z), "trim", n=18, minor=4, rot=(pi / 2, 0, 0)))
    P.append(ck.tube([Vector((-.3, -.28, .06)), Vector((.3, -.28, .06))], .012, "glow", minor=5))
    P.append(ck.tube([Vector((-.3, -.28, 1.72)), Vector((.3, -.28, 1.72))], .012, "glow2", minor=5))
    P.append(ck.heart(.1, .012, (0, -.26, .52), "glow2", bevel=.004, seg=1))
    return P


@piece(R, "bar_counter_neon", tags=["counter", "bar", "hero"], col="box", hero=True, mount="floor", use=[dict(id="bar", pos=(0, -.9, 0), face=(0, 1), label="Pedir drink")],
       lights=[dict(pos=(0, -.5, .3), color="#4ff0ff", range=3, intensity=0.8)],
       note="balcao de bar 3.0 m: laca ameixa, faixa neon ciano, tampo de vidro iluminado, taças e garrafas. Barman em +Y (h 1.1)")
def bar():
    w, d = 3.0, .7
    P = [rb((w, d, 1.02), (0, 0, .55), "base", .05), rb((w + .14, d + .14, .06), (0, 0, 1.08), "soft", .02), rb((w + .06, d + .06, .04), (0, 0, .02), "trim", .012)]
    P.append(rb((w + .1, d + .1, .015), (0, 0, 1.115), "glass", .004))
    P.append(rb((w + .06, d + .06, .01), (0, 0, 1.098), "glow", .003) if False else rb((w - .1, d - .1, .01), (0, 0, 1.1), "glow2", .003))
    for k in range(5):
        P.append(rb((.44, .02, .75), (-1.2 + k * .6, -d / 2 - .0, .56), "accent", .008))
    P.append(ck.tube([Vector((-w / 2 + .05, -d / 2 - .02, .3)), Vector((w / 2 - .05, -d / 2 - .02, .3))], .022, "glow2", minor=6))
    P.append(ck.tube([Vector((-w / 2 + .05, -d / 2 - .02, .85)), Vector((w / 2 - .05, -d / 2 - .02, .85))], .018, "glow", minor=6))
    P.append(ck.tube([Vector((-w / 2 + .1, -d / 2 - .1, .15)), Vector((w / 2 - .1, -d / 2 - .1, .15))], .016, "trim", minor=5))
    cols = ["glass", "accent2", "glow", "glow2"]
    for k in range(8):
        x = -1.2 + k * .34
        P.append(ck.lathe([(0, 0), (.035, 0), (.02, .02), (.02, .1), (.05, .15), (0, .15)], "glass", (x, .15 * ((-1) ** k) * .3, 1.12), n=10))
    for k in range(5):
        x = -1.0 + k * .5
        P.append(ck.lathe([(0, 0), (.04, 0), (.042, .15), (.02, .22), (.02, .3), (0, .3)], cols[k % 4], (x, .18, 1.12), n=10))
    return P


@piece(R, "stool_bar_neon", tags=["seat", "stool"], col="cyl", mount="floor", sit=[dict(id="sit", pos=(0, 0, .75), face=(0, -1))],
       note="banqueta alta com assento ameixa e aro neon (assento 0.74)")
def stool():
    P = [ck.cyl(.2, .1, (0, 0, .7), "fabric", n=22, bevel=.04), ring(.2, .01, (0, 0, .66), "glow2", n=22, minor=4)]
    P.append(ck.sph((.38, .38, .08), (0, 0, .75), "fabric", n=18, rings=5))
    P.append(ck.lathe([(0, 0), (.22, 0), (.22, .02), (.05, .06), (.035, .62), (.06, .66), (0, .66)], "trim", n=18, smooth=1))
    P.append(ring(.15, .012, (0, 0, .3), "trim", n=20, minor=5))
    P.append(ring(.22, .008, (0, 0, .025), "glow", n=22, minor=4))
    return P


@piece(R, "sofa_lounge_curved", tags=["seat", "lounge", "hero"], col="box", hero=True, mount="floor", sit=[dict(id="s1", pos=(-.6, -.05, .5), face=(0, -1)), dict(id="s2", pos=(0, -.05, .5), face=(0, -1)), dict(id="s3", pos=(.6, -.05, .5), face=(0, -1))],
       note="sofa lounge 2.4 m ameixa capitone com neon por baixo (h 0.9)")
def sofa_lounge():
    w, d = 2.4, .9
    P = [rb((w, d, .26), (0, 0, .28), "fabric", .08), pillow((w - .4, d - .3, .2), (0, -.08, .46), "fabric", k=.4)]
    P.append(rb((w - .1, .26, .8), (0, d / 2 - .13, .66), "fabric", .1))
    P += tuft(w - .4, .56, .12, (0, d / 2 - .26, .72), "fabric", sx=.19)
    for sx in (-1, 1):
        P.append(pillow((.24, d, .5), (sx * (w / 2 - .12), 0, .5), "fabric", k=.45))
    P.append(ck.tube(rect_pts(w - .1, d - .1, .08, 0, 0, .1), .014, "glow2", minor=5, closed=True))
    P.append(rb((w - .06, d - .06, .1), (0, 0, .06), "deep", .02))
    for k in range(3):
        P.append(pillow((.34, .12, .3), (-.8 + k * .8, .2, .66), "accent2" if k != 1 else "base", rot=(-.3, 0, .15 * (k - 1)), k=.4))
    return P


@piece(R, "table_lounge_glow", tags=["table", "lounge"], col="box", mount="floor", note="mesa de centro baixa 1.0 x 0.6 (h 0.4) com tampo luminoso e base cromada")
def table_lounge():
    P = [rb((1.0, .6, .06), (0, 0, .37), "deep", .02), rb((.9, .5, .02), (0, 0, .405), "glow2", .004), rb((1.04, .64, .02), (0, 0, .33), "trim", .008)]
    P.append(ck.tube(rect_pts(1.0, .6, .4, 0, 0, .05), .01, "trim", minor=4, closed=True))
    for sx in (-1, 1):
        P.append(ck.cyl(.04, .33, (sx * .35, 0, .165), "trim", n=10))
        P.append(ck.cyl(.12, .02, (sx * .35, 0, .01), "trim", n=14))
    return P


@piece(R, "sign_neon_heart_big", tags=["wall", "sign", "light", "hero"], col=None, mount="wall", hero=True, lights=[dict(pos=(0, -.3, 2.2), color="#ff4fd0", range=4, intensity=0.9)],
       note="letreiro neon: coracao duplo rosa com estrelas ciano e raios (z 1.6 a 2.9, 1.8 m larg.)")
def sign_heart():
    z = 2.25
    P = [rb((1.8, .03, 1.3), (0, .015, z), "deep", .015)]
    P.append(neon([(p[0] * 1.5, p[1] * 1.5) for p in heart_outline(.8, 48)], (0, 0, z - .22), "glow", .02, closed=True, y=-.03, minor=8))
    P.append(neon([(p[0] * 1.0, p[1] * 1.0) for p in heart_outline(.8, 40)], (0, 0, z - .15), "glow2", .014, closed=True, y=-.03))
    for (x, zz, r) in ((-.7, .32, .1), (.72, .38, .12), (.62, -.32, .07), (-.62, -.38, .08)):
        pts = [(x + a, zz + b) for a, b in star_pts(r, 4, .3)]
        P.append(neon(pts, (0, 0, z), "glow2", .01, closed=True, y=-.03))
    for k in range(5):
        a = pi / 2 + (k - 2) * .35
        P.append(neon([(.18 * cos(a), .68 + .18 * sin(a) - .0), (.3 * cos(a), .68 + .3 * sin(a))], (0, 0, z), "glow", .008, y=-.03)) if False else None
    return [p for p in P if p is not None]


@piece(R, "neon_arch_gate", tags=["decor", "entrance", "light"], col=None, mount="floor", lights=[dict(pos=(0, -.1, 2.2), color="#ff4fd0", range=4, intensity=0.8)],
       note="portal em arco neon 2.6 m larg. x 2.8 m alt. (pilares ameixa, tubo neon rosa/ciano, cortina de contas)")
def arch_gate():
    P = []
    for sx in (-1, 1):
        P.append(rb((.2, .25, 1.7), (sx * 1.2, 0, 0.85), "base", .05))
        P.append(rb((.28, .32, .12), (sx * 1.2, 0, .06), "trim", .03))
        P.append(rb((.28, .32, .1), (sx * 1.2, 0, 1.7), "trim", .03))
        P.append(ck.tube([Vector((sx * 1.2, -.14, .1)), Vector((sx * 1.2, -.14, 1.7))], .02, "glow2" if sx > 0 else "glow", minor=6))
    arc = arch_curve(0, -.14, 1.7, 1.2, 28, 0, pi)
    P.append(ck.tube([Vector((p.x, p.y, p.z)) for p in arc], .028, "glow", minor=8))
    P.append(ck.tube([Vector((p.x * .9, p.y - .02, 1.7 + (p.z - 1.7) * .9)) for p in arc], .016, "glow2", minor=6))
    P.append(ck.tube([Vector((p.x, 0, p.z)) for p in arch_curve(0, 0, 1.7, 1.2, 28, 0, pi)], .09, "base", minor=8))
    for k in range(5):
        a = pi * (k + .5) / 5
        P.append(ck.sph((.08, .08, .08), (1.2 * cos(a) * .0 + 1.2 * cos(a), -.16, 1.7 + 1.2 * sin(a)), "trim", n=8, rings=5))
    return P


@piece(R, "mic_stand_stage", tags=["stage", "karaoke", "decor"], col="cyl", mount="floor", use=[dict(id="sing", pos=(0, -.5, 0), face=(0, 1), label="Cantar")],
       note="pedestal de microfone cromado com microfone e laco (h 1.6)")
def mic():
    P = [ck.lathe([(0, 0), (.22, 0), (.22, .02), (.04, .06), (.02, 1.3), (0, 1.32)], "trim", n=18, smooth=1)]
    P.append(ck.tube([Vector((0, 0, 1.3)), Vector((0, -.04, 1.45)), Vector((0, -.14, 1.52))], .012, "trim", minor=5))
    P.append(ck.lathe([(0, 0), (.022, 0), (.03, .05), (.034, .12), (0, .14)], "deep", (0, -.14, 1.5), rot=(pi / 2 + .5 * 0, 0, 0), n=10) if False else
             ck.sph((.07, .07, .08), (0, -.16, 1.58), "mirror", n=10, rings=6))
    P.append(ck.cyl(.022, .1, (0, -.14, 1.5), "deep", n=8))
    P += bow(.1, (0, -.03, 1.1), "glow", knot="trim")
    return P


@piece(R, "stage_curtain_velvet", tags=["wall", "stage", "decor"], col=None, mount="wall", note="cortinao de veludo ameixa 4.0 m com franja dourada e cortineira (z 0 a 3.0)")
def stage_curtain():
    P = [drape(4.0, 2.8, (0, -.12, 3.0), "fabric", folds=11, amp=.12, per=6, nz=6)]
    P.append(drape(4.1, .5, (0, -.2, 3.05), "accent2", folds=14, amp=.05, per=5, nz=4))
    P.append(ck.cyl(.03, 4.2, (0, -.18, 3.05), "trim", rot=(0, pi / 2, 0), n=10))
    bm = bmesh.new()
    for i in range(40):
        merge(bm, ck.bm_sphere(1, 1, 1, 6, 3), (-1.95 + i * .1, -.22, 2.62), (.03, .03, .05))
    P.append(obj(bm, "trim"))
    P.append(bulbs([(-1.9 + i * .38, -.28, 3.15) for i in range(11)], .03, "glow2"))
    return P


@piece(R, "neon_stars_cluster", tags=["light", "ceiling", "decor"], col=None, mount="ceiling", lights=[dict(pos=(0, 0, -1.0), color="#4ff0ff", range=5, intensity=0.7)],
       note="cluster de estrelas neon penduradas em alturas diferentes (pende ate 1.5 m, 1.2 m larg.)")
def stars():
    P = [ck.cyl(.08, .03, (0, 0, -.015), "trim", n=10)]
    for k, (x, y, z, r, m) in enumerate(((0, 0, -.7, .2, "glow"), (.4, .1, -1.1, .14, "glow2"), (-.4, -.1, -.9, .12, "glow2"), (.2, -.2, -1.4, .1, "glow"), (-.25, .2, -1.3, .09, "glow"))):
        pts = star_pts(r, 5, .45)
        P.append(ck.prism(pts, .03, "xz", m, (x, y, z), bevel=.008, seg=2))
        P.append(ck.tube([Vector((0, 0, -.03)), Vector((x * .5, y * .5, z * .5)), Vector((x, y, z + r))], .004, "trim", minor=3))
    return P


@piece(R, "led_wall_panel_2m", tags=["wall", "light", "stage"], col=None, mount="wall", lights=[dict(pos=(0, -.3, 1.8), color="#ff4fd0", range=4, intensity=0.6)],
       note="painel de LED 2.0 x 2.0 m com pixels grandes rosa/ciano/branco e moldura cromada (z 0.8 a 2.8)")
def led_wall():
    P = [rb((2.0, .05, 2.0), (0, .025, 1.8), "deep", .01)]
    cols = ["glow", "glow2", "white", "accent2"]
    for i in range(10):
        for j in range(10):
            idx = (i * 3 + j * 5 + (i * j) % 4) % 5
            if idx == 4:
                continue
            P.append(box((.17, .012, .17), (-.9 + i * .2, -.006, .9 + .1 + j * .2), cols[idx % 4]))
    P += frame(2.06, 2.06, .06, (0, -.03, 1.8), "trim", d=.06, r=.02)
    return P


@piece(R, "pouf_lounge_neon", tags=["seat", "lounge"], col="cyl", mount="floor", sit=[dict(id="sit", pos=(0, 0, .46), face=(0, -1))], note="pufe redondo ameixa com aro neon (0.6 m)")
def pouf_neon():
    P = [ck.cyl(.3, .4, (0, 0, .24), "fabric", n=26, bevel=.1, seg=4), ring(.3, .014, (0, 0, .42), "trim", n=28, minor=5), ring(.3, .014, (0, 0, .06), "glow2", n=28, minor=5)]
    for k in range(8):
        a = 2 * pi * k / 8
        P.append(ck.sph((.035, .035, .02), (.14 * cos(a), .14 * sin(a), .445), "trim", n=6, rings=3))
    return P


CAM = ((2.6, -5.4, 1.65), (-0.2, 0.8, 1.2), 24)


def VIG(put):
    for x in range(-4, 6, 2):
        for y in range(-4, 5, 2):
            put("floor_dance_grid", x, y)
    for x in (-2.0, 0.0, 2.0, 4.0):
        put("shared/wall_panel", x, 4.0)
    for y in (-3, -1, 1, 3):
        put("shared/wall_panel", -3.0, y, rz=pi / 2)
    put("stage_curtain_velvet", 0.8, 4.0)
    put("stage_platform_4m", 0.8, 2.6)
    put("led_wall_panel_2m", -2.0, 4.0) if False else None
    put("dj_booth_neon", 0.8, 2.9, rz=pi, z=.55)
    put("speaker_stack_neon", -1.4, 2.3, z=.55, rz=.2)
    put("speaker_stack_neon", 3.0, 2.3, z=.55, rz=-.2)
    put("sign_neon_heart_big", -2.5, 4.0) if False else None
    put("truss_lights_rig", 0.8, 1.3, z=3.2)
    put("disco_ball_mirrored", -.5, -.3, z=3.2)
    put("bar_counter_neon", -1.3, -2.0, rz=pi / 2 * 0) if False else None
    put("bar_counter_neon", 0.8, -2.8, rz=0)
    put("stool_bar_neon", -.2, -3.7)
    put("stool_bar_neon", .8, -3.7)
    put("stool_bar_neon", 1.8, -3.7)
    put("sofa_lounge_curved", -2.2, -.2, rz=pi / 2 * -1 + pi) if False else None
    put("neon_stars_cluster", 2.3, -1.0, z=3.2)
    put("pouf_lounge_neon", 2.9, -.8)
    put("mic_stand_stage", 1.8, 2.0, z=.55)

"""
Kit Y2K pastel-futurista (Centro / Praca) - "Barbie futurista" dos anos 2000.
Mesmas convencoes do city_kit.py (reusa os primitivos): origem na base, frente -Y (vira +Z no GLB),
fachadas com plano frontal em y=0, materiais por SLOT + paletas em kit.json.
Uso: blender -b -P tools/blender/city_kit_y2k.py
"""
import bpy
import bmesh
import os
import sys
import json
import random
from math import pi, sin, cos, radians
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import city_kit as ck  # noqa
from city_kit import box, cyl, sph, tube, lathe, prism, heart, heart_pts, arc3, finish, bbox, tri_count  # noqa

ROOT = ck.ROOT
OUT = os.path.join(ROOT, "public", "assets", "city", "kit_y2k")

METALS = {
    "chrome_pink": ("#f6dfe9", 0.05), "chrome_lilac": ("#e6dcf6", 0.05), "chrome_blue": ("#dcebf8", 0.05),
    "chrome_mint": ("#dff3ea", 0.05), "chrome": ("#f5f7fb", 0.05),
}
PALETTES = {
    "bubblegum": dict(label="Bubblegum Chrome", base="#f7c6d9", accent="#fffaf6", accent2="#ff8fbf", soft="#d9c2f0", deep="#8a4a9a",
                      white="#fffaf6", glass="#ff9fe0", glow="#ff7ad9", glow2="#7ad9ff", metal="chrome_pink"),
    "lilac": dict(label="Lilac Iridescent", base="#d9c2f0", accent="#f7c6d9", accent2="#b58cf0", soft="#c6ddf5", deep="#5b3f87",
                  white="#fffaf6", glass="#b58cff", glow="#b58cff", glow2="#ff9fe0", metal="chrome_lilac"),
    "babyblue": dict(label="Baby Blue Pool", base="#c6ddf5", accent="#fffaf6", accent2="#6fb4ff", soft="#d6c4f0", deep="#2f5a8f",
                     white="#fffaf6", glass="#7fc4ff", glow="#6fd4ff", glow2="#ff9fd0", metal="chrome_blue"),
    "mint": dict(label="Mint Fresh", base="#bfe8d6", accent="#fffaf6", accent2="#5fe0b8", soft="#c6ddf5", deep="#2f7a62",
                 white="#fffaf6", glass="#7affd0", glow="#7affd0", glow2="#ff9fd0", metal="chrome_mint"),
}
SPEC = dict(base=(.1, 1, .03, .5, .4), accent=(.08, 1, .03, .3, .4), accent2=(.06, 1, .02, 0, .4), soft=(.1, 1, .03, .3, .4),
            deep=(.12, 1, .03, 0, .4), white=(.08, 1, .03, .3, .4))


def pal_mats(pal, suffix=""):
    P = PALETTES[pal]
    out = {}
    for slot in ("base", "accent", "accent2", "soft", "deep", "white"):
        r, c, cr, sh, shr = SPEC[slot]
        out[slot] = ck._mk(slot + suffix, P[slot], rough=r, coat=c, coat_rough=cr, sheen=sh, sheen_rough=shr)
    mc, mr = METALS[P["metal"]]
    out["trim"] = ck._mk("trim" + suffix, mc, rough=mr, metal=1.0, coat=0.0)
    g = ck._mk("glass" + suffix, P["glass"], rough=0.02, coat=0.0, alpha=0.55, spec=1.0)
    try:
        b = g.node_tree.nodes["Principled BSDF"]
        ck._set(b, "Thin Film Thickness", 450.0)
        ck._set(b, "Thin Film IOR", 1.6)
    except Exception:
        pass
    out["glass"] = g
    out["glow"] = ck._mk("glow" + suffix, P["glow"], rough=0.3, coat=0.0, emis=P["glow"], emis_str=7.0)
    out["glow2"] = ck._mk("glow2" + suffix, P["glow2"], rough=0.3, coat=0.0, emis=P["glow2"], emis_str=7.0)
    out["leaf"] = ck._mk("leaf" + suffix, "#9fe0c0", rough=0.2, coat=0.8, coat_rough=0.05, sheen=0.5)
    out["water"] = ck._mk("water" + suffix, "#cfeeff", rough=0.0, coat=0.0, alpha=0.42, spec=1.0, emis="#a8dcff", emis_str=0.6)
    return out


_cache = {}


def recolor(ob, pal):
    mats = _cache.setdefault(pal, pal_mats(pal, "@" + pal))
    ob.data = ob.data.copy()
    for i, m in enumerate(ob.data.materials):
        if m and m.name.split("@")[0] in mats:
            ob.data.materials[i] = mats[m.name.split("@")[0]]


# ------------------------------------------------------------------------------------------------
def stadium_pts(w, d, n=8):
    L, r = (w - d) / 2, d / 2
    pts = [(L + r * cos(-pi / 2 + pi * i / n), r * sin(-pi / 2 + pi * i / n)) for i in range(n + 1)]
    pts += [(-L + r * cos(pi / 2 + pi * i / n), r * sin(pi / 2 + pi * i / n)) for i in range(n + 1)]
    return pts


def rrect_pts(w, h, r, n=4):
    pts = []
    for (cx, cz, a0) in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, pi / 2), (-w / 2 + r, -h / 2 + r, pi), (w / 2 - r, -h / 2 + r, 1.5 * pi)):
        for i in range(n + 1):
            a = a0 + (pi / 2) * i / n
            pts.append((cx + r * cos(a), cz + r * sin(a)))
    return pts


def loop3(pts, z=0.0, plane="xy", y=0.0, dy=0.0, dz=0.0):
    if plane == "xy":
        return [Vector((p[0], p[1] + dy, z)) for p in pts]
    return [Vector((p[0], y, p[1] + dz)) for p in pts]


def arc_band(half, s, t, n=10):
    y = lambda x: -s * (1 - (x / half) ** 2)
    xs = [-half + 2 * half * i / n for i in range(n + 1)]
    return [(x, y(x) - t / 2) for x in xs] + [(x, y(x) + t / 2) for x in xs[::-1]], y


def ring3(R, z, n=28, cx=0, cy=0):
    return [Vector((cx + R * cos(2 * pi * i / n), cy + R * sin(2 * pi * i / n), z)) for i in range(n)]


def porthole(P, R, a, z, rx, rz, glass="glass", ringm="trim"):
    loc = (R * cos(a), R * sin(a), z)
    rot = (0, 0, a - pi / 2)
    ell = [Vector((rx * cos(t), 0, rz * sin(t))) for t in [2 * pi * i / 12 for i in range(12)]]
    P.append(tube(ell, .065, ringm, minor=4, closed=True, loc=loc, rot=rot))
    P.append(sph((2 * rx, .22, 2 * rz), loc, glass, rot=rot, n=10, rings=5))


# ------------------------------------------------------------------------------------------------
def piece_building_bubble():
    P = []
    R, H = 3.0, 9.6
    prof = [(0, 0), (R + .2, 0), (R + .3, .15), (R + .15, .5)]
    for f in range(3):
        z0 = .5 + f * 3.0
        for q in range(1, 7):
            t = q / 6
            prof.append((R - .05 + .55 * sin(pi * t) ** .8 * (1 if f < 2 else 1) - (.35 if q == 6 and f < 2 else 0) * 0, z0 + 3.0 * t))
        prof.append((R - .35, z0 + 3.0))
    prof = prof[:-1] + [(R - .5, H - .6), (R - 1.2, H - .2), (R - 2.0, H + .1), (0, H + .15)]
    P.append(lathe(prof, "base", n=32, smooth=1))
    P.append(lathe([(0, 0), (R + .45, 0), (R + .5, .12), (R + .4, .28), (0, .3)], "white", n=32, smooth=1))
    for z in (3.5, 6.5):
        P.append(tube(ring3(R - .2, z, 28), .1, "trim", minor=6, closed=True))
        P.append(tube(ring3(R - .18, z + .22, 28), .05, "glow", minor=4, closed=True))
    P.append(tube(ring3(R + .5, .32, 28), .055, "glow2", minor=4, closed=True))
    P.append(tube(ring3(R - .75, H - .45, 24), .08, "trim", minor=6, closed=True))
    for f in range(3):
        z = 2.0 + f * 3.0
        for k in range(8):
            a = 2 * pi * (k + .5 * (f % 2)) / 8
            if f == 0 and abs(((a + pi / 2 + pi) % (2 * pi)) - pi) < .5:
                continue
            porthole(P, R + .55 * .95, a, z, .5, .72)
    # porta oval frontal
    a = -pi / 2
    porthole(P, R + .45, a, 1.9, .8, 1.2, glass="glass")
    P.append(tube([Vector((.0, -(R + .5), 1.45 + 1.4 * sin(t))) for t in [pi * i / 8 for i in range(9)]], .0, "trim", minor=4)) if False else None
    P.append(lathe([(0, 0), (1.6, 0), (1.7, .1), (1.5, .22), (0, .24)], "accent", loc=(0, -(R + .9), 0), n=20, smooth=1))
    # coroa: antena com anel orbital
    P.append(tube([Vector((0, 0, H)), Vector((0, 0, H + .8)), Vector((0, 0, H + 1.5))], [.12, .07, .04], "trim", minor=6))
    P.append(sph(.2, (0, 0, H + 1.65), "glow", n=10, rings=6))
    P.append(tube(ring3(.7, H + .95, 24), .05, "trim", minor=5, closed=True))
    P.append(tube(ring3(.82, H + .95, 24), .03, "glow2", minor=4, closed=True))
    return P


def piece_building_capsule_row():
    P = []
    pts = stadium_pts(8, 3.4, 8)
    cy = 1.7
    P.append(prism([(x, y + cy) for x, y in pts], 4.0, "xy", "base", loc=(0, 0, 2.0), bevel=.1, seg=2))
    P.append(prism([(x * 1.012, (y * 1.012) + cy) for x, y in pts], 2.5, "xy", "glass", loc=(0, 0, 1.95)))
    P.append(prism([(x * 1.06, (y * 1.06) + cy) for x, y in pts], .28, "xy", "accent", loc=(0, 0, 4.1), bevel=.1, seg=3))
    P.append(prism([(x * 1.03, (y * 1.03) + cy) for x, y in pts], .3, "xy", "accent", loc=(0, 0, .15), bevel=.08, seg=2))
    for z, r in ((.72, .06), (3.2, .07)):
        P.append(tube(loop3([(x * 1.02, y * 1.02 + cy) for x, y in pts], z), r, "trim", minor=5, closed=True))
    P.append(tube(loop3([(x * 1.03, y * 1.03 + cy) for x, y in pts], 3.85), .045, "glow", minor=4, closed=True))
    P.append(tube(loop3([(x * 1.03, y * 1.03 + cy) for x, y in pts], .5), .04, "glow2", minor=4, closed=True))
    for i in range(-3, 4):
        P.append(box((.07, .07, 2.5), (i * .8, -.03, 1.95), "trim", bevel=.025))
    for sg in (-1, 1):
        for q in (1, 2):
            a = -pi / 2 + sg * q * .6
        P.append(box((.07, .07, 2.5), (sg * 3.2, -.62, 1.95), "trim", bevel=.025))
    P.append(box((.07, .07, 2.5), (-3.55, 0.35, 1.95), "trim", bevel=.025))
    P.append(box((5.0, .08, .22), (0, -.12, 3.55), "glow", bevel=.06, seg=2))
    P.append(sph((.5, .3, .5), (-3.0, -.2, 3.55), "glow2", n=8, rings=5))
    P.append(sph((.5, .3, .5), (3.0, -.2, 3.55), "glow2", n=8, rings=5))
    return P


def piece_storefront_glass():
    P = []
    band, yf = arc_band(2.0, .4, .08)
    P.append(prism(band, 2.6, "xy", "glass", loc=(0, 0, 1.6)))
    xs = [-2 + 4 * i / 12 for i in range(13)]
    for z, r in ((.32, .06), (2.9, .07)):
        P.append(tube([Vector((x, yf(x), z)) for x in xs], r, "trim", minor=5))
    for k in range(-4, 5):
        x = k * .45
        P.append(cyl(.025, 2.6, (x, yf(x), 1.6), "trim", n=6))
    p2, _ = arc_band(2.0, .4, .5)
    P.append(prism(p2, .32, "xy", "accent", loc=(0, 0, .16), bevel=.08, seg=3))
    P.append(prism(arc_band(2.0, .4, .9)[0], .22, "xy", "accent", loc=(0, 0, 3.15), bevel=.07, seg=3))
    P.append(tube([Vector((x, yf(x) - .02, 3.02)) for x in xs], .04, "glow", minor=4))
    for sg in (-1, 1):
        P.append(cyl(.2, 3.5, (sg * 2.05, -.05, 1.75), "white", n=14, bevel=.0))
        P.append(sph((.5, .5, .3), (sg * 2.05, -.05, 3.5), "accent2", n=10, rings=5))
    P.append(box((3.6, .1, 3.0), (0, .75, 1.65), "soft", bevel=.04))
    for sg in (-1, 1):
        P.append(box((.05, .05, 1.4), (sg * .18, yf(sg * .18) - .06, 1.1), "trim", bevel=.02))
    P.append(box((.05, .05, 2.6), (0, yf(0), 1.6), "trim", bevel=.02))
    P.append(sph((.7, .1, .7), (0, .72, 1.6), "glow2", n=8, rings=5))
    return P


def piece_canopy_curved():
    P = []
    L = 5.0
    z = lambda u: 3.05 + .55 * max(0.0, ((-u) + 1.6) / 3.2) ** 2.2
    us = [-1.6 + 3.2 * i / 12 for i in range(13)]
    top = [(u, z(u) + .09) for u in us]
    bot = [(u, z(u) - .09) for u in us][::-1]
    P.append(prism(top + bot, L, "xz", "accent", rot=(0, 0, pi / 2), loc=(0, 0, 0), bevel=.07, seg=2))
    for sx in (-1, 1):
        P.append(tube([Vector((sx * L / 2, u, z(u))) for u in us], .06, "trim", minor=5))
    P.append(tube([Vector((x, -1.6, z(-1.6) - .05)) for x in (-L / 2, L / 2)], .04, "glow", minor=4))
    for sx in (-1, 1):
        P.append(tube([Vector((sx * 2.1, .9, .0)), Vector((sx * 2.1, .9, 1.5)), Vector((sx * 2.1, .85, 3.0))], [.12, .08, .06], "trim", minor=6))
        P.append(lathe([(0, 0), (.4, 0), (.38, .12), (0, .15)], "white", loc=(sx * 2.1, .9, 0), n=14, smooth=1))
        P.append(tube(ring3(.3, .16, 14, sx * 2.1, .9), .03, "glow2", minor=4, closed=True))
    P.append(sph((.4, .4, .3), (0, .0, 3.65), "glow2", n=8, rings=5)) if False else None
    return P


def piece_kiosk_pod():
    P = []
    P.append(lathe([(0, 0), (1.5, 0), (1.55, .1), (1.5, .85), (1.35, .95), (0, .95)], "accent2", n=28, smooth=1))
    P.append(tube(ring3(1.53, .3, 24), .06, "trim", minor=5, closed=True))
    P.append(tube(ring3(1.53, .12, 24), .035, "glow", minor=4, closed=True))
    P.append(lathe([(0, .95), (1.7, .95), (1.78, 1.02), (1.65, 1.12), (0, 1.12)], "white", n=28, smooth=1))
    prof = [(1.3 * cos(a), 1.1 + 1.25 * sin(a)) for a in [pi / 2 * i / 8 for i in range(9)]][::-1]
    P.append(lathe([(1.3, 1.1)] + prof[1:], "glass", n=24))
    P.append(lathe([(0, 1.1), (.6, 1.1), (.5, 1.5), (.0, 1.5)], "soft", n=14))
    P.append(lathe([(0, 2.35), (1.75, 2.35), (1.95, 2.5), (1.6, 2.7), (.5, 2.9), (0, 2.95)], "base", n=28, smooth=1))
    P.append(tube(ring3(1.9, 2.42, 28), .06, "glow", minor=4, closed=True))
    P.append(tube(ring3(1.85, 2.58, 28), .05, "trim", minor=5, closed=True))
    P.append(sph(.3, (0, 0, 3.1), "glow2", n=10, rings=6))
    P.append(tube(ring3(.45, 3.1, 18), .035, "trim", minor=4, closed=True))
    for k in range(3):
        a = 2 * pi * k / 3
        P.append(sph((.8, .06, .5), (1.2 * cos(a), 1.2 * sin(a), 1.7), "glow", rot=(0, 0, a - pi / 2), n=8, rings=5))
    return P


def piece_holo_sign():
    P = []
    rr = rrect_pts(2.6, 1.5, .4, 4)
    P.append(prism(rr, .12, "xz", "glow2", loc=(0, 0, 2.3), bevel=.03, seg=2))
    P.append(prism(rrect_pts(2.35, .95, .3, 4), .14, "xz", "glow", loc=(0, -.02, 2.52), bevel=.03, seg=2))
    P.append(prism(rrect_pts(2.1, .35, .15, 3), .16, "xz", "white", loc=(0, -.04, 2.78), bevel=.03, seg=2))
    P.append(tube([Vector((p[0], -.02, p[1] + 2.3)) for p in rrect_pts(2.8, 1.7, .5, 4)], .07, "trim", minor=5, closed=True))
    for sx in (-1, 1):
        P.append(tube([Vector((sx * 1.0, .0, .0)), Vector((sx * 1.0, .0, 1.0)), Vector((sx * 1.0, .0, 1.6))], [.09, .07, .06], "trim", minor=6))
        P.append(lathe([(0, 0), (.35, 0), (.3, .1), (0, .12)], "accent", loc=(sx * 1.0, 0, 0), n=12, smooth=1))
        P.append(sph(.1, (sx * 1.3, -.0, 2.95), "glow", n=8, rings=5))
    return P


def piece_neon_strip():
    P = []
    P.append(tube([Vector((x, 0, .0)) for x in (-1.0, 0, 1.0)], .045, "glow", minor=6, loc=(0, 0, .06)))
    for x in (-1.0, 1.0):
        P.append(sph(.075, (x, 0, .06), "trim", n=8, rings=5))
    for x in (-.6, .6):
        P.append(box((.08, .09, .08), (x, .06, .06), "trim", bevel=.025))
    return P


def piece_neon_strip_curve():
    P = []
    P.append(tube([Vector((1.5 * cos(a), 1.5 * sin(a), 0) for a in [0.0]) if False else Vector((1.5 * cos(a), 1.5 * sin(a), .06)) for a in [pi / 2 * i / 12 for i in range(13)]], .045, "glow2", minor=6))
    for a in (0, pi / 2):
        P.append(sph(.075, (1.5 * cos(a), 1.5 * sin(a), .06), "trim", n=8, rings=5))
    return P


def piece_lamp_futuristic():
    P = []
    P.append(lathe([(0, 0), (.45, 0), (.5, .06), (.42, .2), (.2, .3), (0, .32)], "accent", n=20, smooth=1))
    P.append(tube(ring3(.47, .1, 20), .035, "glow", minor=4, closed=True))
    path = [Vector((0, 0, .3)), Vector((0, 0, 1.5)), Vector((0, 0, 2.8))]
    for i in range(1, 9):
        a = pi / 2 * i / 8
        path.append(Vector((.9 - .9 * cos(a), 0, 2.8 + .9 * sin(a))))
    r = [.1, .08, .06] + [.055] * 8
    P.append(tube(path, r, "trim", minor=6))
    P.append(sph((.5, .5, .5), (.9, 0, 3.75), "glow", n=14, rings=8))
    P.append(tube([Vector((.9 + .42 * cos(t), .42 * sin(t) * 0.0, 3.75 + .42 * sin(t))) for t in [2 * pi * i / 20 for i in range(20)]], .035, "trim", minor=4, closed=True))
    P.append(tube([Vector((.9 + .42 * cos(t) * .0, .42 * cos(t), 3.75 + .42 * sin(t))) for t in [2 * pi * i / 20 for i in range(20)]], .03, "glow2", minor=4, closed=True))
    P.append(sph((.2, .2, .16), (0, 0, 1.2), "glow2", n=8, rings=5))
    return P


def piece_bench_bubble():
    P = []
    pts = stadium_pts(2.1, .62, 6)
    P.append(prism(pts, .26, "xy", "accent2", loc=(0, 0, .5), bevel=.1, seg=3))
    P.append(prism(stadium_pts(1.95, .3, 6), .3, "xy", "base", loc=(0, .22, .92), rot=(-.18, 0, 0), bevel=.1, seg=3))
    for x in (-.65, .65):
        P.append(lathe([(0, 0), (.22, 0), (.2, .1), (.12, .38), (0, .38)], "trim", loc=(x, 0, 0), n=12, smooth=1))
    P.append(tube(loop3(stadium_pts(2.12, .64, 6), .33), .03, "glow", minor=4, closed=True))
    return P


def piece_planter_orb():
    P = []
    P.append(lathe([(0, 0), (.55, 0), (.6, .06), (.5, .16), (0, .18)], "trim", n=16, smooth=1))
    P.append(sph((1.2, 1.2, 1.2), (0, 0, .68), "accent", n=18, rings=10))
    P.append(tube(ring3(.6, .68, 20), .05, "glow", minor=4, closed=True))
    P.append(tube(ring3(.58, .52, 20), .04, "trim", minor=4, closed=True))
    P.append(cyl(.28, .06, (0, 0, 1.22), "deep", n=12))
    for k in range(7):
        a = 2 * pi * k / 7
        P.append(sph((.2, .08, .75), (.2 * cos(a), .2 * sin(a), 1.55), "leaf", rot=(0, .65, a), n=8, rings=5)) if False else \
            P.append(sph((.7, .16, .22), (.34 * cos(a), .34 * sin(a), 1.5), "leaf", rot=(0, -.6, a), n=8, rings=5))
    P.append(sph(.2, (0, 0, 1.55), "glow2", n=10, rings=6))
    P.append(sph(.12, (.12, .08, 1.78), "glow", n=8, rings=5))
    return P


def piece_floating_platform():
    P = []
    P.append(lathe([(0, .4), (1.4, .4), (1.65, .5), (1.65, .62), (1.5, .75), (0, .75)], "accent", n=32, smooth=1))
    P.append(lathe([(0, .62), (1.1, .65), (1.2, .75), (0, .76)], "soft", n=28))
    P.append(tube(ring3(1.62, .56, 32), .06, "trim", minor=5, closed=True))
    P.append(lathe([(0, .3), (1.1, .3), (1.25, .38), (0, .4)], "glow", n=28))
    P.append(tube(ring3(1.35, .38, 28), .05, "glow2", minor=4, closed=True))
    P.append(lathe([(0, 0), (.6, 0), (.5, .03), (0, .04)], "glow", n=16))
    return P


def piece_plaza_centerpiece():
    P = []
    P.append(lathe([(0, 0), (3.6, 0), (3.75, .1), (3.8, .5), (3.55, .62), (3.4, .56), (3.3, .4), (0, .38)], "white", n=40, smooth=1))
    P.append(tube(ring3(3.65, .6, 40), .07, "trim", minor=5, closed=True))
    P.append(tube(ring3(3.78, .3, 40), .05, "glow", minor=4, closed=True))
    P.append(lathe([(0, .45), (3.3, .45), (3.34, .43), (0, .43)], "water", n=40))
    P.append(lathe([(0, .38), (1.3, .38), (1.1, .9), (.8, 1.2), (.0, 1.25)], "accent", n=24, smooth=1))
    P.append(tube(ring3(1.0, .95, 24), .06, "glow2", minor=4, closed=True))
    for i, (r, z) in enumerate(((1.6, 1.6), (1.1, 2.1), (.7, 2.6))):
        P.append(lathe([(0, z), (r, z), (r + .08, z + .08), (r, z + .16), (0, z + .18)], "base" if i % 2 == 0 else "soft", n=28, smooth=1))
        P.append(tube(ring3(r, z + .08, 28), .04, "glow" if i % 2 == 0 else "glow2", minor=4, closed=True))
    hp = heart_pts(2.6, 40)
    P.append(tube([Vector((p[0], 0, p[1] + 4.0)) for p in hp], .14, "trim", minor=6, closed=True))
    hp2 = heart_pts(2.15, 40)
    P.append(tube([Vector((p[0], -.02, p[1] + 3.97)) for p in hp2], .06, "glow", minor=4, closed=True))
    P.append(sph(.5, (0, 0, 3.95), "glass", n=14, rings=8))
    P.append(sph(.2, (0, 0, 3.95), "glow2", n=10, rings=6))
    for k in range(10):
        a = 2 * pi * k / 10
        pts = []
        for q in range(9):
            t = q / 8
            r = 3.0 * (1 - t) ** .9 + .35 * t
            z = .5 + 3.0 * t ** .8 * (1 - .15 * t)
            pts.append(Vector((r * cos(a), r * sin(a), z)))
        P.append(tube(pts, .03, "water", minor=5))
    rnd = random.Random(5)
    for k in range(9):
        a, r, z = rnd.uniform(0, 2 * pi), rnd.uniform(.5, 3), rnd.uniform(1, 5.4)
        L = rnd.uniform(.13, .22)
        c = (r * cos(a), r * sin(a), z)
        P.append(sph((L, .02, .03), c, "glow", n=6, rings=3))
        P.append(sph((.03, .02, L), c, "glow", n=6, rings=3))
    return P


def piece_paving_y2k():
    P = []
    P.append(box((2, 2, .05), (0, 0, .025), "glow", bevel=.01))
    for i in range(2):
        for j in range(2):
            m = "accent" if (i + j) % 2 == 0 else "soft"
            P.append(box((.93, .93, .08), (-.5 + i, -.5 + j, .05), m, bevel=.14, seg=3))
    P.append(cyl(.34, .06, (0, 0, .1), "trim", n=20, bevel=.02))
    P.append(cyl(.2, .08, (0, 0, .11), "glow2", n=16))
    return P


PIECES = [
    ("building_bubble", piece_building_bubble), ("building_capsule_row", piece_building_capsule_row),
    ("storefront_glass", piece_storefront_glass), ("canopy_curved", piece_canopy_curved), ("kiosk_pod", piece_kiosk_pod),
    ("holo_sign", piece_holo_sign), ("neon_strip", piece_neon_strip), ("neon_strip_curve", piece_neon_strip_curve),
    ("lamp_futuristic", piece_lamp_futuristic), ("bench_bubble", piece_bench_bubble), ("planter_orb", piece_planter_orb),
    ("floating_platform", piece_floating_platform), ("plaza_centerpiece", piece_plaza_centerpiece), ("paving_y2k", piece_paving_y2k),
]

META = {
    "building_bubble": dict(mount="torre redonda, centro na origem; porta oval em -Y (frente +Z no GLB)", collider=("cylinder", [3.5, 10.5], [0, 5.25, 0])),
    "building_capsule_row": dict(mount="modulo comprido: plano frontal em z=0, corpo ate z=-3.4; encadeie de 8 em 8 m ou use sozinho", collider=("box", [8.2, 4.4, 3.5], [0, 2.2, -1.7])),
    "storefront_glass": dict(mount="vitrine curva 4 m; frente z=0, fundo ~0.8; encaixe em parede/pilares", collider=("box", [4.2, 3.6, 1.1], [0, 1.8, -.3])),
    "canopy_curved": dict(mount="cobertura flutuante sobre 2 postes (colisores so dos postes)", collider=("boxes", [[.5, 3.2, .5, -2.1, 1.6, -.9], [.5, 3.2, .5, 2.1, 1.6, -.9]], None)),
    "kiosk_pod": dict(collider=("cylinder", [1.9, 3.1], [0, 1.55, 0])),
    "holo_sign": dict(note="paineis glow/glow2 sao emissivos: bom para bloom e para trocar por textura animada depois", collider=("box", [2.9, 3.2, .4], [0, 1.6, 0])),
    "neon_strip": dict(note="decorativo, 2 m", collider=None),
    "neon_strip_curve": dict(note="decorativo, quarto de circulo R=1.5", collider=None),
    "lamp_futuristic": dict(collider=("cylinder", [.4, 4.2], [0, 2.1, 0])),
    "bench_bubble": dict(collider=("box", [2.2, 1.1, .8], [0, .55, 0])),
    "planter_orb": dict(collider=("cylinder", [.62, 1.9], [0, .95, 0])),
    "floating_platform": dict(walkable=True, note="degrau/plataforma de 0.75 m; piso caminhavel no topo", collider=("cylinder", [1.65, .75], [0, .375, 0])),
    "plaza_centerpiece": dict(collider=("cylinder", [3.85, .65], [0, .32, 0]), note="colisor so da bacia; coracao de cromo flutua a ~4 m"),
    "paving_y2k": dict(walkable=True, collider=None, note="amostra 2x2 m, vira textura/padrao do piso"),
}


def build_all():
    ck.M.update(pal_mats("bubblegum"))
    out = {}
    for name, fn in PIECES:
        out[name] = finish(name, fn())
    return out


def export_all(objs):
    os.makedirs(OUT, exist_ok=True)
    kit = {"units": "m", "up": "Y", "front": "+Z", "style": "Y2K pastel futurist (Centro/Praca)", "pieces": {},
           "slots": ["base", "accent", "accent2", "soft", "deep", "white", "trim", "glass", "glow", "glow2", "leaf", "water"],
           "slotNotes": "recolore por predio trocando a cor de cada material; glow/glow2 sao emissivos (neon); trim = cromo tingido; glass = perolado translucido",
           "metals": {k: dict(color=v[0], roughness=v[1], metallic=1) for k, v in METALS.items()}, "palettes": PALETTES}
    for name, ob in objs.items():
        bpy.ops.object.select_all(action="DESELECT")
        ob.select_set(True)
        bpy.context.view_layer.objects.active = ob
        path = os.path.join(OUT, name + ".glb")
        bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                                  export_cameras=False, export_lights=False)
        (x0, x1), (y0, y1), (z0, z1) = bbox(ob)
        info = dict(file="kit_y2k/%s.glb" % name, tris=tri_count(ob), bytes=os.path.getsize(path),
                    size=[round(x1 - x0, 3), round(z1 - z0, 3), round(y1 - y0, 3)],
                    bbox_min=[round(x0, 3), round(z0, 3), round(-y1, 3)], bbox_max=[round(x1, 3), round(z1, 3), round(-y0, 3)],
                    materials=[m.name for m in ob.data.materials if m])
        meta = META.get(name, {})
        info["walkable"] = bool(meta.get("walkable", False))
        col = meta.get("collider")
        if col:
            info["collider"] = dict(type=col[0], size=col[1], center=col[2])
        for k in ("mount", "note"):
            if k in meta:
                info[k] = meta[k]
        kit["pieces"][name] = info
    with open(os.path.join(OUT, "kit.json"), "w", encoding="utf-8") as f:
        json.dump(kit, f, indent=2, ensure_ascii=False)
    return kit


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    objs = build_all()
    kit = export_all(objs)
    tot = 0
    for n, i in kit["pieces"].items():
        tot += i["tris"]
        print("%-22s tris=%6d  %7.1f KB  size=%s" % (n, i["tris"], i["bytes"] / 1024, i["size"]))
    print("TOTAL tris", tot)


if __name__ == "__main__":
    main()

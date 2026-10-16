"""Helpers extras (neon, doces, etc.). Importado por lib no fim (from lib2 import *)."""
from lib import *


def neon(pts2d, loc, mat="glow2", r=.011, closed=False, y=0.0, minor=6):
    """tubo neon num contorno (x,z) no plano XZ (frente -Y)"""
    return ck.tube([Vector((loc[0] + p[0], loc[1] + y, loc[2] + p[1])) for p in pts2d], r, mat, minor=minor, closed=closed)


def arc2(cx, cz, r, a0, a1, n=14, ry=None):
    ry = r if ry is None else ry
    return [(cx + r * cos(a0 + (a1 - a0) * i / n), cz + ry * sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]


def heart_outline(w, n=40):
    return [(p[0], p[1]) for p in ck.heart_pts(w, n)]


def cupcakes(items, cup="accent2", frost="white", cherry="accent2", s=1.0):
    a, b, c = bmesh.new(), bmesh.new(), bmesh.new()
    for (x, y, z) in items:
        merge(a, ck.bm_lathe([(0, 0), (.026 * s, 0), (.036 * s, .04 * s), (0, .04 * s)], 10), (x, y, z))
        merge(b, ck.bm_lathe([(0, .036 * s), (.042 * s, .04 * s), (.036 * s, .062 * s), (.026 * s, .08 * s), (.013 * s, .098 * s), (0, .112 * s)], 10), (x, y, z))
        merge(c, ck.bm_sphere(.026 * s, .026 * s, .026 * s, 6, 4), (x, y, z + .12 * s))
    return [obj(a, cup), obj(b, frost), obj(c, cherry)]


def macarons(items, m1="accent2", m2="white", s=1.0):
    a, b = bmesh.new(), bmesh.new()
    for (x, y, z) in items:
        merge(a, ck.bm_sphere(.07 * s, .07 * s, .02 * s, 10, 3), (x, y, z))
        merge(a, ck.bm_sphere(.07 * s, .07 * s, .02 * s, 10, 3), (x, y, z + .03 * s))
        merge(b, ck.bm_sphere(.062 * s, .062 * s, .014 * s, 10, 3), (x, y, z + .015 * s))
    return [obj(a, m1), obj(b, m2)]


def potted_flowers(loc, n=5, mats=("accent2", "accent", "white")):
    x, y, z = loc
    P = []
    for k in range(n):
        a = 2 * pi * k / n
        px, py = .06 * cos(a), .06 * sin(a)
        P.append(ck.tube([Vector((x, y, z - .15)), Vector((x + px * .5, y + py * .5, z - .06)), Vector((x + px, y + py, z))], .005, "leaf", minor=4))
        P += flower((x + px, y + py - .02, z + .02), .06, mats[k % len(mats)], "trim", 6, rot=(.3 * sin(a), 0, 0))
    return P

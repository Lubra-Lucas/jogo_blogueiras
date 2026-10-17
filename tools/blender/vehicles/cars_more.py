"""Convertible, SUV, sports coupe, van specs. Car frame: x left(+), f forward(+), z up."""
from math import sin, cos, pi
from mathutils import Vector, Quaternion
from vlib import *
from vhelp import *
from cars_specs import K, hubs4, hubs_fix


def top_z(sh, f, x=0.0):
    hw, zc, hh, nu, nl = sh.params(f)
    if hw <= 1e-6: return zc + hh
    u = min(abs(x) / hw, 0.999)
    return zc + hh * (1 - u ** nu) ** (1.0 / nu)


def stripe(ctx, sh, f0, f1, halfw, mat='accent', n=18, lift=0.006, x=0.0, thick=0.004):
    pts = [(x, f0 + (f1 - f0) * i / n, top_z(sh, f0 + (f1 - f0) * i / n, x) + lift) for i in range(n + 1)]
    ctx.acc.tube(pts, (halfw, thick), mat, seg=4)


# =====================================================================================
def conversivel():
    L = 4.5; wb = 2.75; R = 0.34; track = 1.57
    def tub():
        return Shape(dict(
            hw=K((-2.25, 0.925), (2.25, 0.925)),
            zb=K((-2.25, 0.18), (2.25, 0.18)),
            zt=K((-2.25, 0.96), (-1.6, 1.0), (-0.5, 0.95), (0.4, 0.95), (1.2, 0.92), (2.25, 0.78)),
            nu=K((-2.25, 4.5), (2.25, 4.5)), nl=K((-2.25, 4.0), (2.25, 4.0))),
            -2.25, 2.25, 0.6, 0.65, N=16, step=0.5)
    t = tub()
    hx = 0.64; hz = 0.70
    fh = t.find_f(hx, hz, True); ft = t.find_f(0.70, 0.74, False)
    def decor(ctx):
        a = ctx.acc
        for sd in (1, -1):
            lamp(ctx, sd * hx, hz, 0.13, 'headlight', depth=0.6, front=True)
            lamp(ctx, sd * 0.70, 0.74, 0.075, 'taillight', depth=0.6, front=False)
        for front in (True, False):
            p = plan_path(ctx.tub, 0.40, 1.85 if front else -1.85, front, off=0.03)
            a.tube(p, (0.03, 0.045), 'trim', seg=6)
        plate_lamp(ctx, 0, 0.55, 0.46, 0.27, 'trim', front=True, depth=0.035, bevel=0.03)
        plate_lamp(ctx, 0, 0.55, 0.40, 0.21, 'tire', front=True, depth=0.05, bevel=0.025)
        for xx in (-0.12, 0, 0.12):
            p, n = surface_point(ctx, xx, 0.55, True)
            a.tube([tuple(p + Vector((0, 0.03, -0.09))), tuple(p + Vector((0, 0.03, 0.09)))], 0.008, 'trim', seg=4)
        pb, nb = surface_point(ctx, 0, 0.78, True)
        a.sphere(pb, (0.035, 0.035, 0.012), 'trim', q=orient_z(nb), u=10, v=5)
        stripe(ctx, ctx.tub, 0.35, 1.85, 0.025, 'trim', lift=0.004)
        for sd in (1, -1):
            pts = [(sd * (ctx.tub.surf_x(f, 0.60) + 0.004), f, 0.60) for f in [-0.95 + 1.9 * i / 6 for i in range(7)]]
            a.tube(pts, 0.009, 'trim', seg=5)
        door_line(ctx, 0.20, 0.30, 0.90); door_line(ctx, -0.98, 0.30, 0.90)
        handle(ctx, -0.65, 0.84, 0.12)
        bot = Vector((0, 0.24, 0.94)); topv = bot + Vector((0, -0.16, 0.27))
        mid = (bot + topv) / 2
        q = Quaternion((1, 0, 0), -0.54)
        a.box(tuple(mid), (1.56, 0.012, 0.29), 'glass', q=q)
        for sd in (1, -1):
            a.tube([(sd * 0.79, bot.y, bot.z), (sd * 0.79, topv.y, topv.z)], 0.018, 'trim', seg=6)
        a.tube([(-0.79, topv.y, topv.z), (0.79, topv.y, topv.z)], 0.016, 'trim', seg=6)
        a.tube([(-0.79, bot.y, bot.z), (0.79, bot.y, bot.z)], 0.016, 'trim', seg=6)
        a.tube([(x, f, top_z(ctx.tub, f, x) + 0.004) for (x, f) in
                [(0.77, 0.12), (0.77, -0.4), (0.77, -0.93), (0.0, -0.95), (-0.77, -0.93), (-0.77, -0.4), (-0.77, 0.12)]],
               0.014, 'trim', seg=5)
        mirror(ctx, 0.86, 0.22, 1.02, s=0.8)
        for sx in (0.35, -0.35):
            a.cyl((sx, -2.20, 0.26), 0.032, 0.14, 'trim', axis='f', seg=8)
        a.box((0, -2.21, 0.84), (0.2, 0.03, 0.03), 'trim', bevel=0.01)
        for sd in (1, -1):
            seat(ctx, sd * 0.40, -0.45, 0.68, w=0.5, lean=0.25, bh=0.50)
        a.box((0, 0.16, 0.80), (1.60, 0.24, 0.20), 'interior', bevel=0.06, seg=2)
        a.box((0, -0.30, 0.55), (0.2, 0.9, 0.25), 'interior', bevel=0.04)
        steering(ctx, 0.40, -0.02, 1.02, R=0.18)
    return dict(
        id='conversivel', name='Madame', L=L, H=1.25, W=1.85, wb=wb, R=R, track=track,
        body='#6e2433', accent='#efe6cf', rim='#d8dadf', interior='#b58a5a',
        tub=tub, cabin=None, glass=None, decor=decor,
        cockpit=dict(f0=-0.93, f1=0.12, xh=0.74, floor=0.42),
        hubs=hubs_fix(hubs4(wb, track, R, R, 0.24, 0.24)),
        wheel=dict(nspoke=12, spoke_w=0.05, white=True, wire=True), arch_gap=0.05,
        seat=(0.40, -0.55, 0.68),
        lamps=dict(head=[(hx, fh, hz), (-hx, fh, hz)], tail=[(0.70, ft, 0.74), (-0.70, ft, 0.74)]),
        colliders=[((0, 0, 0.56), (0.9, 2.2, 0.38)), ((0, -0.4, 1.0), (0.8, 0.7, 0.22))],
    )


# =====================================================================================
def suv():
    L = 4.5; wb = 2.8; R = 0.40; track = 1.58
    def tub():
        return Shape(dict(
            hw=K((-2.25, 0.95), (2.25, 0.95)),
            zb=K((-2.25, 0.28), (2.25, 0.28)),
            zt=K((-2.25, 1.15), (-1.0, 1.12), (0.6, 1.10), (1.5, 1.08), (2.25, 1.0)),
            nu=K((-2.25, 4.5), (2.25, 4.5)), nl=K((-2.25, 4.0), (2.25, 4.0))),
            -2.25, 2.25, 0.5, 0.5, N=16, step=0.5)
    def cabin():
        return Shape(dict(
            hw=K((-2.0, 0.88), (0.75, 0.88)),
            zb=K((-2.0, 1.0), (0.75, 1.0)),
            zt=K((-2.0, 1.12), (-1.95, 1.62), (-1.82, 1.85), (0.05, 1.85), (0.30, 1.78), (0.55, 1.38), (0.75, 1.12)),
            nu=K((-2.0, 3.4), (0.75, 3.4)), nl=K((-2.0, 8), (0.75, 8))),
            -2.0, 0.75, 0.2, 0.25, tumble=0.10, zshrink=0.15, N=24, step=0.2)
    def glass(ctx):
        cab = ctx.cabin
        def fn(c, n, i, j):
            f = c.y
            hw, zc, hh, _, _ = cab.params(f); top = zc + hh
            if c.z < 1.12: return 'body'
            if j in (23, 0, 1, 2, 9, 10, 11, 12) and c.z < top - 0.10:
                for a, b in ((-0.48, 0.38), (-1.3, -0.58)):
                    if a <= f <= b: return 'glass'
            if n.y > 0.35 and j in (4, 5, 6, 7) and f > 0.25 and c.z > 1.14: return 'glass'
            if n.y < -0.35 and j in (4, 5, 6, 7) and f < -1.9 and c.z > 1.2: return 'glass'
            return 'body'
        return fn
    t = tub()
    hx = 0.68; hz = 0.88
    fh = t.find_f(hx, hz, True); ft = t.find_f(0.82, 1.0, False)
    def decor(ctx):
        a = ctx.acc
        for sd in (1, -1):
            lamp(ctx, sd * hx, hz, 0.15, 'headlight', depth=0.6, front=True)
            plate_lamp(ctx, sd * 0.84, 1.0, 0.11, 0.30, 'taillight', front=False, depth=0.035, bevel=0.03)
        for front in (True, False):
            p = plan_path(ctx.tub, 0.50, 1.95 if front else -1.95, front, off=0.04)
            a.tube(p, (0.045, 0.065), 'trim', seg=6)
        plate_lamp(ctx, 0, 0.84, 0.50, 0.30, 'tire', front=True, depth=0.04, bevel=0.03)
        for zz in (0.77, 0.84, 0.91):
            p, n = surface_point(ctx, 0, zz, True)
            a.tube([(-0.22, p.y + 0.03, zz), (0.22, p.y + 0.03, zz)], 0.009, 'trim', seg=4)
        fb = ctx.tub.find_f(0.48, 0.55, True)
        pts = [(-0.52, fb - 0.02, 0.46), (-0.50, fb + 0.10, 0.55), (-0.50, fb + 0.12, 0.95), (0.50, fb + 0.12, 0.95), (0.50, fb + 0.10, 0.55), (0.52, fb - 0.02, 0.46)]
        a.tube(pts, 0.03, 'trim', seg=6)
        a.tube([(0, fb + 0.12, 0.95), (0, fb - 0.0, 0.72)], 0.02, 'trim', seg=5)
        a.box((0, ctx.tub.find_f(0.0, 0.34, True) + 0.0, 0.34), (0.8, 0.30, 0.10), 'tire', bevel=0.03)
        pb, nb = surface_point(ctx, 0, 1.02, True)
        a.sphere(pb, (0.04, 0.04, 0.012), 'trim', q=orient_z(nb), u=10, v=5)
        door_line(ctx, 0.42, 0.34, 1.10); door_line(ctx, -0.52, 0.34, 1.10); door_line(ctx, -1.35, 0.34, 1.10)
        handle(ctx, -0.12, 0.98, 0.14); handle(ctx, -0.96, 0.98, 0.14)
        mirror(ctx, 0.99, 0.40, 1.30, s=1.1)
        zr = top_z(ctx.cabin, -0.9, 0.56) + 0.03
        for sd in (1, -1):
            a.tube([(sd * 0.58, -1.75, zr), (sd * 0.58, 0.0, zr)], 0.022, 'trim', seg=6)
            for ff in (-1.6, -0.9, -0.2):
                a.cyl((sd * 0.58, ff, zr - 0.02), 0.016, 0.05, 'trim', axis='z', seg=6)
        for ff in (-1.2, -0.45):
            a.tube([(-0.58, ff, zr + 0.025), (0.58, ff, zr + 0.025)], 0.014, 'trim', seg=5)
        a.cyl((0.4, -2.06, 0.34), 0.035, 0.16, 'trim', axis='f', seg=8)
        for sd in (1, -1):
            seat(ctx, sd * 0.40, -0.20, 0.92, w=0.5, bh=0.55)
        seat(ctx, 0.0, -1.05, 0.92, w=1.4, headrest=False, bh=0.5)
        a.box((0, 0.52, 1.0), (1.55, 0.32, 0.26), 'interior', bevel=0.07, seg=2)
        a.box((0, 0.1, 0.80), (0.2, 0.75, 0.30), 'interior', bevel=0.04)
        a.box((0, -1.62, 0.9), (1.5, 0.7, 0.12), 'interior', bevel=0.03)
        steering(ctx, 0.40, 0.30, 1.28, R=0.19)
    return dict(
        id='suv', name='Safari', L=L, H=1.85, W=1.90, wb=wb, R=R, track=track,
        body='#2f5d46', accent='#d9cfae', rim='#b9bcc2', interior='#6b5a48',
        tub=tub, cabin=cabin, glass=glass, decor=decor,
        cockpit=dict(f0=-1.85, f1=0.50, xh=0.72, floor=0.62),
        hubs=hubs_fix(hubs4(wb, track, R, R, 0.30, 0.30)),
        wheel=dict(nspoke=6, spoke_w=0.08), arch_gap=0.05,
        seat=(0.40, -0.30, 0.92),
        lamps=dict(head=[(hx, fh, hz), (-hx, fh, hz)], tail=[(0.84, ft, 1.0), (-0.84, ft, 1.0)]),
        colliders=[((0, 0, 0.70), (0.94, 2.22, 0.42)), ((0, -0.6, 1.5), (0.84, 1.3, 0.38))],
    )


# =====================================================================================
def esportivo():
    L = 4.4; wb = 2.6; Rf = 0.34; Rr = 0.36; track = 1.64
    def tub():
        return Shape(dict(
            hw=K((-2.2, 0.975), (2.2, 0.975)),
            zb=K((-2.2, 0.14), (2.2, 0.14)),
            zt=K((-2.2, 0.82), (-1.4, 0.86), (-0.5, 0.80), (0.5, 0.78), (1.5, 0.72), (2.2, 0.62)),
            nu=K((-2.2, 3.6), (2.2, 3.6)), nl=K((-2.2, 4.0), (2.2, 4.0))),
            -2.2, 2.2, 0.55, 0.85, N=16, step=0.5)
    t = tub()
    fh = t.find_f(0.66, 0.50, True); ft = t.find_f(0.56, 0.66, False)
    def decor(ctx):
        a = ctx.acc
        for sd in (1, -1):
            plate_lamp(ctx, sd * 0.66, 0.50, 0.30, 0.085, 'headlight', front=True, depth=0.04, bevel=0.03)
            plate_lamp(ctx, sd * 0.56, 0.66, 0.46, 0.07, 'taillight', front=False, depth=0.04, bevel=0.025)
        p = plan_path(ctx.tub, 0.26, 1.80, True, off=0.02)
        a.tube(p, (0.03, 0.025), 'accent', seg=6)
        p = plan_path(ctx.tub, 0.28, -1.80, False, off=0.02)
        a.tube(p, (0.03, 0.03), 'tire', seg=6)
        plate_lamp(ctx, 0, 0.40, 0.80, 0.10, 'tire', front=True, depth=0.04, bevel=0.03)
        stripe(ctx, ctx.tub, 0.5, 2.12, 0.14, 'accent', n=14)
        stripe(ctx, ctx.tub, -2.0, -1.34, 0.14, 'accent', n=8)
        door_line(ctx, 0.28, 0.24, 0.80); door_line(ctx, -0.55, 0.24, 0.80)
        handle(ctx, -0.28, 0.72, 0.11)
        for sd in (1, -1):
            x = ctx.tub.surf_x(-0.85, 0.46) + 0.004
            a.box((sd * x, -0.85, 0.46), (0.03, 0.46, 0.17), 'tire', bevel=0.012)
            for zz in (0.42, 0.50):
                a.tube([(sd * (x + 0.012), -1.05, zz), (sd * (x + 0.012), -0.65, zz)], 0.007, 'trim', seg=4)
        mirror(ctx, 0.88, 0.20, 0.90, s=0.9)
        for sd in (1, -1):
            a.box((sd * 0.52, -1.98, 0.86), (0.05, 0.12, 0.30), 'trim', bevel=0.012)
        a.box((0, -2.02, 1.02), (1.30, 0.28, 0.045), 'accent', bevel=0.02, seg=2, q=Quaternion((1, 0, 0), 0.1))
        for sd in (1, -1):
            a.box((sd * 0.66, -2.02, 1.02), (0.03, 0.32, 0.12), 'accent', bevel=0.01)
            a.cyl((sd * 0.36, -2.17, 0.30), 0.04, 0.12, 'trim', axis='f', seg=8)
        # ---- para-brisa baixo e inclinado, com moldura
        bf, bz = 0.27, 0.74; rise = (-0.20, 0.31)
        for sd in (1, -1):
            xb = sd * 0.80
            zb0 = top_z(ctx.tub, bf, 0.80) - 0.03
            a.tube([(xb, bf, zb0), (xb * 0.95, bf + rise[0], zb0 + rise[1] + 0.03)], 0.02, 'trim', seg=6)
        zt0 = top_z(ctx.tub, bf, 0.0)
        mid = (0, bf + rise[0] / 2, zt0 + rise[1] / 2 - 0.02)
        a.box(mid, (1.52, 0.012, 0.37), 'glass', q=Quaternion((1, 0, 0), -0.59))
        a.tube([(-0.76, bf + rise[0], zt0 + rise[1] - 0.005), (0.76, bf + rise[0], zt0 + rise[1] - 0.005)], 0.017, 'trim', seg=6)
        a.tube([(-0.78, bf, zt0 - 0.025), (0.78, bf, zt0 - 0.025)], 0.016, 'trim', seg=6)
        # ---- duas corcovas atras dos bancos (carenagem), com friso
        for sd in (1, -1):
            a.sphere((sd * 0.40, -1.42, 0.86), (0.30, 0.42, 0.15), 'body', u=14, v=8)
            a.tube([(sd * 0.40, f, 0.86 + 0.15 * (1 - ((f + 1.42) / 0.42) ** 2) ** 0.5 + 0.004) for f in [-1.42 + 0.40 * k / 8 for k in range(-8, 9)]], (0.022, 0.006), 'accent', seg=4)
        # ---- bancos de couro com costura e encosto de cabeca
        for sd in (1, -1):
            x = sd * 0.40
            seat(ctx, x, -0.52, 0.56, w=0.46, lean=0.35, bh=0.42)
            for dx in (-0.12, 0.12):
                a.tube([(x + dx, -0.30, 0.567), (x + dx, -0.74, 0.567)], (0.005, 0.004), 'accent', seg=4)
                a.tube([(x + dx, -0.77 + 0.065 * 0.94 + 0.343 * 0.15, 0.726 + 0.065 * 0.343 - 0.94 * 0.15), (x + dx, -0.77 + 0.065 * 0.94 - 0.343 * 0.15, 0.726 + 0.065 * 0.343 + 0.94 * 0.15)], (0.005, 0.004), 'accent', seg=4)
            a.tube([(x - 0.21, -0.28, 0.50), (x + 0.21, -0.28, 0.50)], 0.009, 'accent', seg=4)
            a.box((x, -0.52, 0.365), (0.50, 0.62, 0.012), 'tire', bevel=0.004)
        # ---- painel, console e instrumentos
        a.box((0, 0.08, 0.66), (1.52, 0.24, 0.16), 'interior', bevel=0.05, seg=2)
        a.box((0, 0.06, 0.745), (1.50, 0.22, 0.03), 'tire', bevel=0.012)
        for sd in (1, -1):
            for dx in (-0.09, 0.09):
                a.cyl((sd * 0.40 + dx, -0.05, 0.775), 0.065, 0.05, 'trim', axis='f', seg=14)
                a.cyl((sd * 0.40 + dx, -0.077, 0.775), 0.052, 0.02, 'glass', axis='f', seg=14)
        a.box((0, -0.04, 0.70), (0.24, 0.05, 0.10), 'trim', bevel=0.012)
        a.box((0, -0.40, 0.48), (0.2, 0.8, 0.22), 'interior', bevel=0.04)
        a.box((0, -0.40, 0.592), (0.16, 0.70, 0.025), 'tire', bevel=0.01)
        a.cyl((0, -0.20, 0.66), 0.014, 0.12, 'trim', axis='z', seg=6)
        a.sphere((0, -0.20, 0.73), (0.03, 0.03, 0.03), 'tire', u=8, v=6)
        a.box((0, -0.62, 0.365), (0.34, 0.2, 0.012), 'tire')
        steering(ctx, 0.40, -0.12, 0.84, R=0.15)
    return dict(
        id='esportivo', name='Relampago', L=L, H=1.20, W=1.95, wb=wb, R=[Rf, Rr], track=track,
        body='#26406b', accent='#e6e2d6', rim='#b0b4bb', interior='#b4835a',
        tub=tub, cabin=None, glass=None, decor=decor,
        cockpit=dict(f0=-1.25, f1=0.22, xh=0.58, floor=0.36),
        hubs=hubs_fix({'FL': (track / 2, wb / 2, Rf, Rf, 0.25), 'FR': (-track / 2, wb / 2, Rf, Rf, 0.25),
                       'RL': (track / 2, -wb / 2, Rr, Rr, 0.31), 'RR': (-track / 2, -wb / 2, Rr, Rr, 0.31)}),
        wheel=dict(nspoke=6, spoke_w=0.09), arch_gap=0.04,
        seat=(0.40, -0.62, 0.56),
        lamps=dict(head=[(0.66, fh, 0.50), (-0.66, fh, 0.50)], tail=[(0.56, ft, 0.66), (-0.56, ft, 0.66)]),
        colliders=[((0, 0, 0.47), (0.95, 2.18, 0.33)), ((0, -0.55, 0.93), (0.75, 0.95, 0.19))],
    )


# =====================================================================================
def van():
    L = 5.2; wb = 3.2; R = 0.36; track = 1.72
    def tub():
        return Shape(dict(
            hw=K((-2.6, 0.96), (2.6, 0.96)),
            zb=K((-2.6, 0.24), (2.6, 0.24)),
            zt=K((-2.6, 1.0), (1.2, 1.0), (2.0, 0.92), (2.6, 0.84)),
            nu=K((-2.6, 4.5), (2.6, 4.5)), nl=K((-2.6, 4.0), (2.6, 4.0))),
            -2.6, 2.6, 0.4, 0.55, N=20, step=0.4)
    def cabin():
        return Shape(dict(
            hw=K((-2.6, 0.94), (1.45, 0.94)),
            zb=K((-2.6, 0.80), (1.45, 0.80)),
            zt=K((-2.6, 1.1), (-2.5, 2.2), (-2.35, 2.5), (0.8, 2.5), (1.0, 2.42), (1.25, 1.9), (1.45, 1.1)),
            nu=K((-2.6, 4.0), (1.45, 4.0)), nl=K((-2.6, 8), (1.45, 8))),
            -2.6, 1.45, 0.25, 0.2, tumble=0.04, zshrink=0.1, N=24, step=0.3)
    def glass(ctx):
        def fn(c, n, i, j):
            f = c.y
            if c.z < 1.12: return 'body'
            if n.x < -0.6 and -1.65 <= f <= -0.25 and 1.30 <= c.z <= 2.0: return 'glass'
            if abs(n.x) > 0.5 and 0.15 <= f <= 1.05 and 1.30 < c.z < 2.05: return 'glass'
            if n.y > 0.3 and j in (3, 4, 5, 6, 7, 8, 9) and f > 0.95 and c.z > 1.2: return 'glass'
            return 'body'
        return fn
    t = tub()
    hx = 0.70; hz = 0.78
    fh = t.find_f(hx, hz, True); ft = cabin().find_f(0.86, 1.3, False)
    def decor(ctx):
        a = ctx.acc
        for sd in (1, -1):
            lamp(ctx, sd * hx, hz, 0.17, 'headlight', depth=0.65, front=True, ringr=1.0)
            plate_lamp(ctx, sd * 0.86, 1.3, 0.10, 0.34, 'taillight', front=False, depth=0.035, bevel=0.03, shape=ctx.cabin)
        for front in (True, False):
            p = plan_path(ctx.tub, 0.42, 2.15 if front else -2.2, front, off=0.04)
            a.tube(p, (0.04, 0.06), 'trim', seg=6)
        plate_lamp(ctx, 0, 0.62, 0.46, 0.30, 'tire', front=True, depth=0.04, bevel=0.03)
        for xx in (-0.16, -0.08, 0, 0.08, 0.16):
            p, n = surface_point(ctx, xx, 0.62, True)
            a.tube([tuple(p + Vector((0, 0.03, -0.12))), tuple(p + Vector((0, 0.03, 0.12)))], 0.009, 'trim', seg=4)
        pb, nb = surface_point(ctx, 0, 0.90, True)
        a.sphere(pb, (0.05, 0.05, 0.014), 'trim', q=orient_z(nb), u=10, v=5)
        door_line(ctx, 1.20, 0.30, 1.9); door_line(ctx, 0.15, 0.30, 1.9)
        handle(ctx, 0.28, 1.15, 0.12)
        mirror(ctx, 1.08, 1.25, 1.55, s=1.4)
        wx = -(0.94 + 0.04)
        a.box((wx - 0.12, -0.95, 1.30), (0.34, 1.62, 0.045), 'trim', bevel=0.012)
        for k in range(7):
            ff = -1.78 + 0.27 * k
            mat = 'accent' if k % 2 == 0 else 'body'
            a.box((-1.34, ff, 2.12), (0.70, 0.27, 0.04), mat, q=Quaternion((0, 1, 0), -0.33), bevel=0.01)
        for ff in (-1.78, -0.01):
            a.tube([(-0.95, ff, 2.28), (-1.62, ff, 2.04)], 0.012, 'trim', seg=4)
        a.box((0.3, -1.4, 2.56), (0.55, 0.55, 0.10), 'body', bevel=0.04)
        a.cyl((0.45, -2.62, 0.30), 0.04, 0.12, 'trim', axis='f', seg=8)
        a.box((0, -2.62, 1.3), (0.18, 0.04, 0.06), 'trim', bevel=0.015)
        for sd in (1, -1):
            seat(ctx, sd * 0.42, 0.58, 0.88, w=0.62, lean=0.15, bh=0.6)
        a.box((0, 1.20, 1.12), (1.7, 0.30, 0.28), 'interior', bevel=0.07, seg=2)
        a.box((-0.62, -0.95, 0.9), (0.5, 1.6, 0.9), 'interior', bevel=0.03)
        a.box((0.5, -1.7, 0.95), (0.6, 0.6, 1.0), 'interior', bevel=0.03)
        steering(ctx, 0.42, 0.88, 1.38, R=0.2)
    return dict(
        id='van', name='Food Truck', L=L, H=2.5, W=2.0, wb=wb, R=R, track=track,
        body='#8fb09a', accent='#efe6cf', rim='#c9ccd2', interior='#8a7660',
        tub=tub, cabin=cabin, glass=glass, decor=decor,
        cockpit=dict(f0=-2.4, f1=1.05, xh=0.62, floor=0.46),
        hubs=hubs_fix(hubs4(wb, track, R, R, 0.24, 0.24)),
        wheel=dict(nspoke=8, spoke_w=0.045), arch_gap=0.05,
        seat=(0.42, 0.48, 0.88),
        lamps=dict(head=[(hx, fh, hz), (-hx, fh, hz)], tail=[(0.86, ft, 1.3), (-0.86, ft, 1.3)]),
        colliders=[((0, 0, 0.66), (0.97, 2.58, 0.42)), ((0, -0.55, 1.8), (0.95, 2.0, 0.7))],
    )

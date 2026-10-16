"""Car specs. Car frame: x left(+), f forward(+), z up."""
from math import sin, cos, pi
from mathutils import Vector, Quaternion
from vlib import *
from vhelp import *


def K(*pts): return list(pts)


def hubs4(wb, track, Rf, Rr, wf, wr):
    return {'FL': (track / 2, wb / 2, Rf, Rf, wf), 'FR': (-track / 2, wb / 2, Rf, Rf, wf),
            'RL': (track / 2, -wb / 2, Rr, Rr, wr), 'RR': (-track / 2, -wb / 2, Rr, Rr, wr)}


def hubs_fix(h):
    # hubs dict value (x, f, z, R, w): tuple built above is (x,f,R,R,w) -> z=R
    out = {}
    for k, (x, f, z, R, w) in h.items(): out[k] = (x, f, R, R, w)
    return out


# =====================================================================================
def compacto():
    L = 3.5; wb = 2.25; R = 0.30; track = 1.44
    def tub():
        return Shape(dict(
            hw=K((-1.75, 0.85), (1.75, 0.85)),
            zb=K((-1.75, 0.17), (1.75, 0.17)),
            zt=K((-1.75, 0.93), (-1.2, 0.95), (0, 0.90), (1.0, 0.90), (1.75, 0.80)),
            nu=K((-1.75, 4.5), (1.75, 4.5)), nl=K((-1.75, 4.0), (1.75, 4.0))),
            -1.75, 1.75, 0.55, 0.55, N=24, step=0.3)
    def cabin():
        return Shape(dict(
            hw=K((-1.2, 0.80), (0.62, 0.80)),
            zb=K((-1.2, 0.80), (0.62, 0.80)),
            zt=K((-1.2, 0.97), (-1.05, 1.34), (-0.85, 1.55), (-0.1, 1.57), (0.15, 1.50), (0.40, 1.22), (0.62, 0.97)),
            nu=K((-1.2, 2.8), (0.62, 2.8)), nl=K((-1.2, 8), (0.62, 8))),
            -1.2, 0.62, 0.22, 0.22, tumble=0.13, zshrink=0.2, N=24, step=0.2)
    def glass(ctx):
        cab = ctx.cabin
        def fn(c, n, i, j):
            f = c.y
            hw, zc, hh, _, _ = cab.params(f); top = zc + hh
            if c.z < 0.97: return 'body'
            if j in (23, 0, 1, 2, 9, 10, 11, 12) and c.z < top - 0.10:
                for a, b in ((-0.36, 0.30), (-1.0, -0.52)):
                    if a <= f <= b: return 'glass'
            if n.y > 0.42 and j in (4, 5, 6, 7) and f > 0.1 and c.z > 0.99: return 'glass'
            if n.y < -0.42 and j in (4, 5, 6, 7) and f < -0.9 and c.z > 1.05: return 'glass'
            return 'body'
        return fn
    t = tub()
    hx = 0.52; hz = 0.62
    fh = t.find_f(hx, hz, True); ft = t.find_f(0.62, 0.72, False)
    def decor(ctx):
        a = ctx.acc
        for sd in (1, -1):
            lamp(ctx, sd * hx, hz, 0.15, 'headlight', depth=0.6, front=True)
            lamp(ctx, sd * 0.62, 0.72, 0.075, 'taillight', depth=0.6, front=False)
        for front in (True, False):
            p = plan_path(ctx.tub, 0.38, 1.52 if front else -1.52, front, off=0.03)
            a.tube(p, (0.028, 0.042), 'trim', seg=6)
        plate_lamp(ctx, 0, 0.48, 0.40, 0.11, 'tire', front=True, depth=0.03)
        for zz in (0.455, 0.505):
            pass
        pb, nb = surface_point(ctx, 0, 0.74, True)
        a.sphere(pb + nb * 0.0, (0.035, 0.035, 0.012), 'trim', q=orient_z(nb), u=10, v=5)
        door_line(ctx, 0.42, 0.28, 0.90); door_line(ctx, -0.50, 0.28, 0.90)
        handle(ctx, -0.30, 0.80, 0.12)
        mirror(ctx, 0.86, 0.36, 1.00)
        a.cyl((0.5, -1.68, 0.24), 0.03, 0.12, 'trim', axis='f', seg=8)
        # interior
        for sd in (1, -1):
            seat(ctx, sd * 0.37, -0.05, 0.70, w=0.44)
        seat(ctx, 0.0, -0.78, 0.70, w=1.05, headrest=False)
        a.box((0, 0.40, 0.76), (1.38, 0.30, 0.24), 'interior', bevel=0.07, seg=2)
        a.box((0, 0.16, 0.60), (0.18, 0.55, 0.30), 'interior', bevel=0.04)
        steering(ctx, 0.37, 0.22, 0.98)
    return dict(
        id='compacto', name='Docinho', L=L, H=1.55, W=1.70, wb=wb, R=R, track=track,
        body='#e9dfc8', accent='#6e8f7a', rim='#c9ccd2', interior='#8a6a52',
        tub=tub, cabin=cabin, glass=glass, decor=decor,
        cockpit=dict(f0=-1.05, f1=0.40, xh=0.58, floor=0.46),
        hubs=hubs_fix(hubs4(wb, track, R, R, 0.20, 0.20)),
        wheel=dict(nspoke=5, spoke_w=0.07), arch_gap=0.045,
        seat=(0.37, -0.15, 0.70),
        lamps=dict(head=[(hx, fh, hz), (-hx, fh, hz)], tail=[(0.62, ft, 0.72), (-0.62, ft, 0.72)]),
        colliders=[((0, 0, 0.55), (0.84, 1.72, 0.37)), ((0, -0.3, 1.2), (0.7, 0.8, 0.33))],
    )





def _all():
    import cars_more
    d = {'compacto': compacto}
    for k in ('conversivel', 'suv', 'esportivo', 'van'):
        d[k] = getattr(cars_more, k)
    return d


CARS = _all()

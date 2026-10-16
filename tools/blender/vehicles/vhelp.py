"""Helpers shared by the car specs."""
import bpy, bmesh
from math import sin, cos, pi
from mathutils import Vector, Matrix, Quaternion
from vlib import *


# ------------------------------------------------------------------ helpers shared by the car specs
class Ctx:
    pass


def circle_pts(c, n, R, k=20):
    n = Vector(n).normalized()
    ref = Vector((1, 0, 0)) if abs(n.x) < 0.9 else Vector((0, 1, 0))
    ex = ref.cross(n).normalized(); ey = n.cross(ex)
    return [tuple(Vector(c) + ex * R * cos(2 * pi * i / k) + ey * R * sin(2 * pi * i / k)) for i in range(k)]


def surface_point(ctx, x, z, front=True, shape=None):
    sh = shape or ctx.tub
    f = sh.find_f(x, z, front)
    n = Vector(sh.normal_at(x, f, z))
    return Vector((x, f, z)), n


def lamp(ctx, x, z, rho, mat, depth=0.55, ring=True, front=True, ringmat='trim', sink=0.2, kind='dome', ringr=1.0):
    p, n = surface_point(ctx, x, z, front)
    pos = p - n * (rho * sink)
    q = orient_z(n)
    ctx.acc.sphere(pos, (rho, rho, rho * depth), mat, q=q, u=12, v=6)
    if ring:
        ctx.acc.tube(circle_pts(p + n * 0.004, n, rho * ringr * 1.03, 14), 0.011, ringmat, seg=4, closed=True)


def plate_lamp(ctx, x, z, w, h, mat, front=False, depth=0.03, bevel=0.012, shape=None):
    p, n = surface_point(ctx, x, z, front, shape)
    q = orient_z(n)
    ctx.acc.box(p - n * (depth * 0.3), (w, h, depth), mat, q=q, bevel=bevel)


def plan_path(sh, z, f_from, front=True, off=0.0, n=8):
    """polyline wrapping the nose/tail outline of shape sh at height z, starting at f_from on +x side, around the tip."""
    tip = sh.f1 if front else sh.f0
    pts = []
    for i in range(n + 1):
        f = f_from + (tip - f_from) * i / n
        x = sh.surf_x(f, z)
        if x < 0.05: break
        pts.append((x, f))
    if not pts: return []
    ftip = pts[-1][1]
    d = 1 if front else -1
    L = [(x + off, f + (0 if i < len(pts) - 1 else 0)) for i, (x, f) in enumerate(pts)]
    path = [(x, f, z) for (x, f) in L] + [(0.0, ftip + d * (off + 0.02), z)] + [(-x, f, z) for (x, f) in reversed(L)]
    return path


def door_line(ctx, f, z0, z1, off=0.004, rad=0.0055, mat='tire', both=True):
    sh = ctx.tub
    for sd in ((1, -1) if both else (1,)):
        pts = [(sd * (sh.surf_x(f, z0 + (z1 - z0) * i / 4) + off), f, z0 + (z1 - z0) * i / 4) for i in range(5)]
        ctx.acc.tube(pts, rad, mat, seg=5)


def handle(ctx, f, z, w=0.13, both=True, mat='trim'):
    sh = ctx.tub
    for sd in ((1, -1) if both else (1,)):
        x = sh.surf_x(f, z) + 0.006
        ctx.acc.box((sd * x, f, z), (0.026, w, 0.03), mat, bevel=0.01)


def mirror(ctx, x, f, z, mat='body', s=1.0):
    for sd in (1, -1):
        ctx.acc.cyl((sd * (x - 0.05 * s), f, z - 0.045 * s), 0.012, 0.09 * s, 'trim', axis='x', seg=6)
        ctx.acc.sphere((sd * x, f, z), (0.045 * s, 0.065 * s, 0.05 * s), mat, u=10, v=6)


def seat(ctx, x, f, ztop, w=0.46, back=True, headrest=True, lean=0.2, bh=0.52, mat='interior'):
    a = ctx.acc
    a.box((x, f, ztop - 0.07), (w, 0.50, 0.14), mat, bevel=0.05, seg=1)
    if back:
        q = Quaternion((1, 0, 0), -lean)
        a.box((x, f - 0.25, ztop + bh / 2 - 0.04), (w, 0.12, bh), mat, q=q, bevel=0.05, seg=1)
        if headrest:
            a.box((x, f - 0.25 - sin(lean) * 0.5, ztop + bh + 0.07), (w * 0.5, 0.09, 0.14), mat, q=q, bevel=0.04, seg=1)


def steering(ctx, x, f, z, R=0.17):
    a = ctx.acc
    n = Vector((0, -0.94, 0.34)); ey = Vector((0, 0.34, 0.94))
    c = Vector((x, f, z))
    pts = [tuple(c + Vector((1, 0, 0)) * R * cos(2 * pi * i / 16) + ey * R * sin(2 * pi * i / 16)) for i in range(16)]
    a.tube(pts, 0.02, 'interior', seg=6, closed=True)
    a.tube([tuple(c), tuple(c + Vector((0, 0.30, -0.12)))], 0.02, 'interior', seg=6)
    a.cyl(c + Vector((0, -0.005, 0.005)), 0.045, 0.03, 'trim', q=orient_z(n), seg=8)


def wheel_cut_cyl(acc_bm_list, spec):
    pass


def add_bm(acc, bm, keep=True):
    me = bpy.data.meshes.new('_t'); bm.to_mesh(me); acc.bm.from_mesh(me); bpy.data.meshes.remove(me); bm.free()


def cut_cockpit(bm, f0, f1, xh, floor_z, shrink=0.96, wall='interior', floor='interior'):
    top = []
    for fc in bm.faces:
        c = fc.calc_center_median(); n = fc.normal
        f = -c.y
        if f0 < f < f1 and abs(c.x) < xh and n.z > 0.45: top.append(fc)
    bmesh.ops.delete(bm, geom=top, context='FACES_ONLY')
    bnd = [e for e in bm.edges if e.is_boundary]
    res = bmesh.ops.extrude_edge_only(bm, edges=bnd)
    verts = [g for g in res['geom'] if isinstance(g, bmesh.types.BMVert)]
    walls = [g for g in res['geom'] if isinstance(g, bmesh.types.BMFace)]
    for v in verts:
        v.co.z = floor_z; v.co.x *= shrink
    nb = [e for e in bm.edges if e.is_boundary]
    fl = bmesh.ops.holes_fill(bm, edges=nb, sides=len(nb))
    for g in walls: g.material_index = MI[wall]
    for g in fl['faces']: g.material_index = MI[floor]
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm



"""
Casino lounge kit (Las Vegas glam) - Jogo das Blogueiras.
Self-contained Blender script (no imports from the other kits).

Run:
  "C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe" -b --factory-startup -noaudio --python tools/blender/casino/build_casino.py
  options after "--":  --only a,b   (build only some pieces)   --nosheet (skip contact sheet render)

Output: public/assets/casino/<piece>.glb, casino.json, carpet.png, felt.png
Conventions: Blender Z-up, FRONT = -Y (becomes +Z in glTF), origin at floor center, 1 unit = 1 m.
"""
import bpy
import bmesh
import math
import os
import sys
import json
import random
from math import pi, sin, cos, radians, atan2, hypot, sqrt
from mathutils import Vector, Matrix, Euler

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
OUT = os.path.join(ROOT, "public", "assets", "casino")
SHEET_DIR = "C:/Users/user/AppData/Local/Temp/claude/shots/casino"
os.makedirs(OUT, exist_ok=True)

ARGV = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ONLY = None
if "--only" in ARGV:
    ONLY = set(ARGV[ARGV.index("--only") + 1].split(","))
NOSHEET = "--nosheet" in ARGV

# ---------------------------------------------------------------- materials
def hexc(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    # sRGB -> linear
    return [(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c] + [1.0]


MATS = {
    # name: (hex, metallic, roughness, extra)
    "felt": ("#0f4a32", 0.0, 0.92, {}),
    "lacquer": ("#0b0b0d", 0.0, 0.12, {"coat": 1.0}),
    "brass": ("#c9a24a", 1.0, 0.25, {}),
    "velvet": ("#5a0f1f", 0.0, 0.7, {"sheen": 0.8}),
    "ivory": ("#efe6d2", 0.0, 0.32, {"coat": 0.4}),
    "chrome": ("#cfd3d8", 1.0, 0.08, {}),
    "walnut": ("#3a2416", 0.0, 0.38, {"coat": 0.6}),
    "glow": ("#ffd592", 0.0, 0.4, {"emit": ("#ffd592", 3.0)}),
    "chip_red": ("#a3182a", 0.0, 0.3, {"coat": 0.5}),
    "chip_ivory": ("#efe6d2", 0.0, 0.3, {"coat": 0.5}),
    "chip_black": ("#0b0b0d", 0.0, 0.25, {"coat": 0.6}),
    "chip_blue": ("#1c3f7a", 0.0, 0.3, {"coat": 0.5}),
    "chip_green": ("#1f6b45", 0.0, 0.3, {"coat": 0.5}),
    "glass": ("#14181c", 0.0, 0.05, {"coat": 1.0}),
    "screen": ("#06080c", 0.0, 0.08, {"emit": ("#27507a", 0.9)}),
    "crystal": ("#f4efe2", 0.0, 0.04, {"coat": 1.0, "emit": ("#fff3d8", 0.25)}),
    "shade": ("#efe6d2", 0.0, 0.5, {"emit": ("#ffd592", 0.9)}),
}
_mcache = {}


def MAT(name):
    if name in _mcache:
        return _mcache[name]
    hx, met, rough, ex = MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = hexc(hx)
    b.inputs["Metallic"].default_value = met
    b.inputs["Roughness"].default_value = rough
    if "coat" in ex:
        b.inputs["Coat Weight"].default_value = ex["coat"]
        b.inputs["Coat Roughness"].default_value = 0.03
    if "sheen" in ex:
        b.inputs["Sheen Weight"].default_value = ex["sheen"]
    if "emit" in ex:
        b.inputs["Emission Color"].default_value = hexc(ex["emit"][0])
        b.inputs["Emission Strength"].default_value = ex["emit"][1]
    _mcache[name] = m
    return m


# ---------------------------------------------------------------- piece container
class Piece:
    def __init__(self, name, origin=(0, 0, 0)):
        self.name = name
        self.bm = bmesh.new()
        self.mats = []
        self.origin = Vector(origin)
        self.obj = None

    def mi(self, mat):
        if mat not in self.mats:
            self.mats.append(mat)
        return self.mats.index(mat)


cur = None


def use(p):
    global cur
    cur = p


def emit(t, mat, c=(0, 0, 0), rot=(0, 0, 0), M4=None):
    """merge temp bmesh t into the current piece with material mat."""
    bmesh.ops.recalc_face_normals(t, faces=t.faces[:])
    if M4 is None:
        M4 = Matrix.Translation(c) @ Euler(rot, "XYZ").to_matrix().to_4x4()
    bmesh.ops.transform(t, matrix=M4, verts=t.verts)
    P = cur
    mi = P.mi(mat)
    mp = {}
    for v in t.verts:
        mp[v] = P.bm.verts.new(v.co)
    for f in t.faces:
        try:
            nf = P.bm.faces.new([mp[v] for v in f.verts])
            nf.material_index = mi
        except ValueError:
            pass
    t.free()


def bb(x0, x1, y0, y1, z0, z1, mat, bev=0.0, rot=None):
    return box(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), (x1 - x0, y1 - y0, z1 - z0), mat, bev=bev, rot=rot)


def box(c, s, mat, bev=0.0, rot=None):
    t = bmesh.new()
    bmesh.ops.create_cube(t, size=1.0)
    for v in t.verts:
        v.co.x *= s[0]
        v.co.y *= s[1]
        v.co.z *= s[2]
    if bev > 0:
        b = min(bev, min(s) * 0.4)
        bmesh.ops.bevel(t, geom=t.edges[:], offset=b, offset_type="OFFSET", segments=2, profile=0.5, affect="EDGES")
    emit(t, mat, c, rot or (0, 0, 0))


def cyl(c, r, h, mat, seg=32, r2=None, rot=None, bev=0):
    """cylinder/cone with BASE center at c (local +Z)."""
    t = bmesh.new()
    bmesh.ops.create_cone(t, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=(r if r2 is None else r2), depth=h)
    for v in t.verts:
        v.co.z += h / 2
    emit(t, mat, c, rot or (0, 0, 0))


def tube(p0, p1, r, mat, seg=12, r2=None):
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0
    L = d.length
    q = d.to_track_quat("Z", "Y")
    t = bmesh.new()
    bmesh.ops.create_cone(t, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=(r if r2 is None else r2), depth=L)
    for v in t.verts:
        v.co.z += L / 2
    emit(t, mat, M4=Matrix.Translation(p0) @ q.to_matrix().to_4x4())


def sph(c, r, mat, seg=16, sc=(1, 1, 1)):
    t = bmesh.new()
    bmesh.ops.create_uvsphere(t, u_segments=seg, v_segments=max(4, seg // 2), radius=r)
    for v in t.verts:
        v.co.x *= sc[0]
        v.co.y *= sc[1]
        v.co.z *= sc[2]
    emit(t, mat, c)


def torus(c, R, r, mat, seg=32, rs=10, rot=None):
    t = bmesh.new()
    rings = []
    for i in range(seg):
        a = 2 * pi * i / seg
        ring = []
        for j in range(rs):
            b = 2 * pi * j / rs
            rr = R + r * cos(b)
            ring.append(t.verts.new((rr * cos(a), rr * sin(a), r * sin(b))))
        rings.append(ring)
    for i in range(seg):
        a, b = rings[i], rings[(i + 1) % seg]
        for j in range(rs):
            t.faces.new((a[j], a[(j + 1) % rs], b[(j + 1) % rs], b[j]))
    emit(t, mat, c, rot or (0, 0, 0))


def lathe(prof, mat, c=(0, 0, 0), seg=32, loop=False, wav=None, rot=None):
    """prof: list of (r, z). r~0 collapses to the axis. loop=True joins last ring to first (shell)."""
    t = bmesh.new()
    rings = []
    for (r, z) in prof:
        if abs(r) < 1e-6:
            rings.append([t.verts.new((0, 0, z))])
        else:
            ring = []
            for i in range(seg):
                a = 2 * pi * i / seg
                rr = r * (1 + wav[0] * cos(wav[1] * a)) if wav else r
                ring.append(t.verts.new((rr * cos(a), rr * sin(a), z)))
            rings.append(ring)
    pairs = list(zip(rings, rings[1:]))
    if loop:
        pairs.append((rings[-1], rings[0]))
    for a, b in pairs:
        if len(a) == 1 and len(b) == 1:
            continue
        if len(a) == 1:
            for i in range(seg):
                t.faces.new((a[0], b[(i + 1) % seg], b[i]))
        elif len(b) == 1:
            for i in range(seg):
                t.faces.new((a[i], a[(i + 1) % seg], b[0]))
        else:
            for i in range(seg):
                t.faces.new((a[i], a[(i + 1) % seg], b[(i + 1) % seg], b[i]))
    if not loop:
        for ring in (rings[0], rings[-1]):
            if len(ring) > 1:
                t.faces.new(ring)
    emit(t, mat, c, rot or (0, 0, 0))


def sweep(path, prof, mat, closed=False, c=(0, 0, 0)):
    """path: [(x,y)], prof: [(d,z)] closed loop (d = outward/right of travel). """
    t = bmesh.new()
    n = len(path)
    rings = []
    for i, (x, y) in enumerate(path):
        if closed:
            p0, p1 = path[i - 1], path[(i + 1) % n]
        else:
            p0, p1 = path[max(i - 1, 0)], path[min(i + 1, n - 1)]
        tx, ty = p1[0] - p0[0], p1[1] - p0[1]
        L = hypot(tx, ty) or 1.0
        nx, ny = ty / L, -tx / L
        rings.append([t.verts.new((x + nx * d, y + ny * d, z)) for d, z in prof])
    m = len(prof)
    rng = range(n) if closed else range(n - 1)
    for i in rng:
        a, b = rings[i], rings[(i + 1) % n]
        for k in range(m):
            t.faces.new((a[k], a[(k + 1) % m], b[(k + 1) % m], b[k]))
    if not closed:
        t.faces.new(rings[0])
        t.faces.new(rings[-1])
    emit(t, mat, c)


def poly(pts, a0, a1, mat, plane="xy"):
    """extrude 2D polygon between a0..a1 on the third axis."""
    t = bmesh.new()

    def mp(u, v, w):
        if plane == "xy":
            return (u, v, w)
        if plane == "xz":
            return (u, w, v)
        return (w, u, v)  # yz

    lo = [t.verts.new(mp(u, v, a0)) for u, v in pts]
    hi = [t.verts.new(mp(u, v, a1)) for u, v in pts]
    n = len(pts)
    t.faces.new(lo)
    t.faces.new(hi)
    for i in range(n):
        j = (i + 1) % n
        t.faces.new((lo[i], lo[j], hi[j], hi[i]))
    emit(t, mat)


def rect_prof(d0, d1, z0, z1):
    return [(d0, z0), (d1, z0), (d1, z1), (d0, z1)]


def ell_prof(hw, z0, z1, n=14):
    zc, hh = (z0 + z1) / 2, (z1 - z0) / 2
    return [(hw * cos(2 * pi * k / n), zc + hh * sin(2 * pi * k / n)) for k in range(n)]


def arc_pts(cx, cy, r, a0, a1, n=48):
    return [(cx + r * cos(a0 + (a1 - a0) * i / n), cy + r * sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]


def ell_pts(a, b, n=64):
    return [(a * cos(2 * pi * i / n), b * sin(2 * pi * i / n)) for i in range(n)]


def rr_pts(hx, hy, rad, n=8):
    pts = []
    for (cx, cy, a0) in ((hx - rad, -hy + rad, -pi / 2), (hx - rad, hy - rad, 0), (-hx + rad, hy - rad, pi / 2), (-hx + rad, -hy + rad, pi)):
        for i in range(n + 1):
            a = a0 + (pi / 2) * i / n
            pts.append((cx + rad * cos(a), cy + rad * sin(a)))
    return pts


def arc_ribbon(cx, cy, r, a0, a1, w, z, mat, h=0.004, n=40):
    sweep(arc_pts(cx, cy, r, a0, a1, n), rect_prof(-w / 2, w / 2, z, z + h), mat)


def ring_flat(c, r, w, z, mat, h=0.004, n=28):
    sweep([(c[0] + r * cos(2 * pi * i / n), c[1] + r * sin(2 * pi * i / n)) for i in range(n)], rect_prof(-w / 2, w / 2, z, z + h), mat, closed=True)


def teardrop(c, h, r, mat, seg=8, flip=False):
    """teardrop with tip at bottom (c = tip)."""
    prof = [(0, 0), (0.35 * r, 0.12 * h), (0.85 * r, 0.38 * h), (r, 0.55 * h), (0.75 * r, 0.8 * h), (0.3 * r, 0.95 * h), (0, h)]
    lathe(prof, mat, c, seg=seg)


# ---------------------------------------------------------------- finishing / export
PIECES = {}   # name -> list of Piece objects (built)
SHEET = []    # (name, [objs], bbox dims)


def finish(name, parts, zero_z=True, recenter_xy=False, uvs=("felt", "velvet")):
    """create objects from pieces, apply shifts, smooth + edge split. returns list of objs."""
    allv = [v.co.copy() for p in parts for v in p.bm.verts]
    xs = [v.x for v in allv]
    ys = [v.y for v in allv]
    zs = [v.z for v in allv]
    sx = -(min(xs) + max(xs)) / 2 if recenter_xy else 0.0
    sy = -(min(ys) + max(ys)) / 2 if recenter_xy else 0.0
    sz = -min(zs) if zero_z else 0.0
    sh = Vector((sx, sy, sz))
    objs = []
    for p in parts:
        bmesh.ops.translate(p.bm, vec=sh - (p.origin + sh), verts=p.bm.verts)  # to origin-local (see below)
        # NOTE: translate by -origin so mesh is relative to p.origin; world loc = origin + sh
        me = bpy.data.meshes.new(p.name)
        # uv for felt/velvet faces: planar world XY projection (0.5 m tile)
        uv = p.bm.loops.layers.uv.new("UVMap")
        for f in p.bm.faces:
            m = p.mats[f.material_index]
            for l in f.loops:
                co = l.vert.co + p.origin + sh
                if m in uvs:
                    l[uv].uv = (co.x * 2.0, co.y * 2.0)
        p.bm.to_mesh(me)
        p.bm.free()
        for mt in p.mats:
            me.materials.append(MAT(mt))
        for poly_ in me.polygons:
            poly_.use_smooth = True
        ob = bpy.data.objects.new(p.name, me)
        bpy.context.scene.collection.objects.link(ob)
        ob.location = p.origin + sh
        md = ob.modifiers.new("es", "EDGE_SPLIT")
        md.use_edge_angle = True
        md.split_angle = radians(38)
        md.use_edge_sharp = False
        objs.append(ob)
    return objs


def tris_of(objs):
    n = 0
    dg = bpy.context.evaluated_depsgraph_get()
    for o in objs:
        e = o.evaluated_get(dg)
        me = e.to_mesh()
        n += sum(len(p.vertices) - 2 for p in me.polygons)
        e.to_mesh_clear()
    return n


def bbox_world(objs):
    bpy.context.view_layer.update()
    mn = Vector((1e9, 1e9, 1e9))
    mx = Vector((-1e9, -1e9, -1e9))
    for o in objs:
        for v in o.data.vertices:
            w = o.matrix_world @ v.co
            for i in range(3):
                mn[i] = min(mn[i], w[i])
                mx[i] = max(mx[i], w[i])
    return mn, mx


def export(name, objs, notes, glow=False):
    mn, mx = bbox_world(objs)
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    fp = os.path.join(OUT, name + ".glb")
    bpy.ops.export_scene.gltf(filepath=fp, export_format="GLB", use_selection=True, export_apply=True,
                              export_yup=True, export_materials="EXPORT", export_cameras=False, export_lights=False)
    size = mx - mn
    # game axes: x = bx, y = bz, z = -by -> size (dx, dz, dy)
    info = {
        "file": name + ".glb",
        "size": [round(size.x, 3), round(size.z, 3), round(size.y, 3)],
        "min": [round(mn.x, 3), round(mn.z, 3), round(-mx.y, 3)],
        "max": [round(mx.x, 3), round(mx.z, 3), round(-mn.y, 3)],
        "tris": tris_of(objs),
        "materials": sorted({m.name for o in objs for m in o.data.materials}),
        "objects": [o.name for o in objs],
        "emissive": sorted({m for m in ("glow", "screen", "shade", "crystal") if any(m in [x.name for x in o.data.materials] for o in objs)}),
        "notes": notes,
    }
    print("EXPORT", name, info["size"], "tris", info["tris"])
    SHEET.append((name, objs, size, mn, mx))
    return info


# ================================================================= PIECES
def build_card_table():
    P = Piece("card_table")
    use(P)
    cy = 0.6          # circle center y (flat dealer side at y=+0.6)
    R = 1.2
    semi = lambda r, n=56: arc_pts(0, cy, r, pi, 2 * pi, n)
    # apron / body
    poly(semi(1.17), 0.66, 0.84, "lacquer", "xy")
    sweep(semi(1.17), rect_prof(-0.004, 0.012, 0.64, 0.70), "brass")
    sweep(semi(1.17), rect_prof(-0.004, 0.012, 0.80, 0.83), "brass")
    # dealer edge trim
    bb(-1.19, 1.19, cy - 0.012, cy + 0.012, 0.64, 0.86, "brass", bev=0.004)
    bb(-1.17, 1.17, cy - 0.04, cy - 0.012, 0.66, 0.84, "lacquer")
    # felt
    poly(semi(1.07), 0.835, 0.86, "felt", "xy")
    # padded rail (armrest) on the player curve
    sweep(semi(1.13, 60), ell_prof(0.078, 0.84, 0.925, 16), "lacquer")
    sweep(semi(1.13, 60), [(-0.012, 0.9238), (0.012, 0.9238), (0.012, 0.9268), (-0.012, 0.9268)], "brass")
    # straight rail on dealer side (low brass lip)
    bb(-1.07, 1.07, cy - 0.035, cy, 0.84, 0.875, "lacquer", bev=0.01)
    # betting layout on felt
    zf = 0.859
    arc_ribbon(0, cy, 0.90, radians(198), radians(342), 0.012, zf, "brass")
    arc_ribbon(0, cy, 0.62, radians(192), radians(348), 0.010, zf, "ivory")
    arc_ribbon(0, cy, 0.99, radians(206), radians(334), 0.007, zf, "ivory")
    for a in (214, 242, 270, 298, 326):
        x = 0.75 * cos(radians(a))
        y = cy + 0.75 * sin(radians(a))
        ring_flat((x, y), 0.085, 0.010, zf, "brass")
        ring_flat((x, y), 0.055, 0.006, zf, "ivory")
    # dealer chip tray
    bb(-0.42, 0.42, cy - 0.28, cy - 0.12, 0.855, 0.866, "lacquer", bev=0.01)
    bb(-0.43, 0.43, cy - 0.29, cy - 0.28, 0.855, 0.872, "brass")
    bb(-0.43, 0.43, cy - 0.12, cy - 0.11, 0.855, 0.872, "brass")
    bb(-0.43, -0.42, cy - 0.28, cy - 0.12, 0.855, 0.872, "brass")
    bb(0.42, 0.43, cy - 0.28, cy - 0.12, 0.855, 0.872, "brass")
    for i in range(5):
        x = -0.32 + 0.16 * i
        cyl((x, cy - 0.2, 0.866), 0.05, 0.012, ["chip_red", "chip_ivory", "chip_black", "chip_blue", "chip_green"][i], seg=20)
    # pedestal legs
    for sx in (-1, 1):
        x = sx * 0.62
        y = cy - 0.3
        cyl((x, y, 0.0), 0.27, 0.035, "brass", seg=40)
        cyl((x, y, 0.035), 0.21, 0.05, "lacquer", seg=40)
        cyl((x, y, 0.085), 0.10, 0.56, "lacquer", seg=28)
        torus((x, y, 0.12), 0.10, 0.012, "brass", 28, 8)
        torus((x, y, 0.60), 0.10, 0.012, "brass", 28, 8)
        cyl((x, y, 0.645), 0.15, 0.02, "brass", seg=32, r2=0.12)
    # lower stretcher / kick plate between legs
    bb(-0.62, 0.62, cy - 0.34, cy - 0.26, 0.5, 0.62, "lacquer", bev=0.01)
    objs = finish("card_table", [P])
    return export("card_table", objs, "Dealer side = flat edge at +Y (back). Players on the curve (-Y front). Felt top surface z=0.86; rail top 0.93.")


def build_poker_table():
    P = Piece("poker_table")
    use(P)
    ell = lambda a, b, n=72: ell_pts(a, b, n)
    # base
    cyl((0, 0, 0), 0.60, 0.035, "brass", seg=48)
    cyl((0, 0, 0.035), 0.50, 0.05, "lacquer", seg=48)
    lathe([(0, 0.085), (0.16, 0.085), (0.12, 0.14), (0.10, 0.2), (0.12, 0.25), (0.10, 0.3), (0.10, 0.5), (0.12, 0.54), (0.20, 0.58), (0.0, 0.58)],
          "brass", seg=40)
    torus((0, 0, 0.14), 0.115, 0.014, "ivory", 36, 8)
    # apron
    poly(ell(1.27, 0.67), 0.60, 0.72, "lacquer", "xy")
    sweep(ell(1.27, 0.67), rect_prof(-0.004, 0.014, 0.585, 0.64), "brass", closed=True)
    # felt
    poly(ell(1.16, 0.56), 0.70, 0.74, "felt", "xy")
    # velvet rail
    sweep(ell(1.22, 0.62), ell_prof(0.085, 0.70, 0.785, 16), "velvet", closed=True)
    sweep(ell(1.20, 0.60), rect_prof(-0.007, 0.007, 0.7845, 0.7885), "brass", closed=True)
    sweep(ell(1.136, 0.536), rect_prof(-0.006, 0.006, 0.739, 0.743), "ivory", closed=True)
    # dealer button ring inlay + cup holder dimples
    for i in range(6):
        a = radians(30 + 60 * i) if False else 2 * pi * (i + 0.5) / 6
        x, y = 1.22 * cos(a), 0.62 * sin(a)
        cyl((x, y, 0.775), 0.036, 0.012, "lacquer", seg=20)
        torus((x, y, 0.787), 0.036, 0.004, "brass", 20, 6)
    # card burn box / dealer chip
    cyl((0.0, 0.0, 0.74), 0.07, 0.01, "brass", seg=24)
    cyl((0.0, 0.0, 0.75), 0.05, 0.004, "chip_red", seg=24)
    objs = finish("poker_table", [P])
    return export("poker_table", objs, "Oval 2.6x1.4, felt surface z=0.74, rail top 0.785 (velvet), single brass pedestal. Origin at floor center.")


def build_roulette():
    P = Piece("roulette_table")
    R = Piece("wheel_rotor", origin=(-0.98, 0.0, 0.84))
    use(P)
    # body
    bb(-1.5, 1.5, -0.65, 0.65, 0.0, 0.07, "brass", bev=0.01)
    bb(-1.46, 1.46, -0.61, 0.61, 0.07, 0.80, "lacquer", bev=0.025)
    bb(-1.49, 1.49, -0.64, 0.64, 0.76, 0.80, "brass", bev=0.008)
    # felt + rail
    bb(-1.40, 1.40, -0.55, 0.55, 0.80, 0.84, "felt")
    path = rr_pts(1.46, 0.61, 0.12, 8)
    sweep(path, ell_prof(0.075, 0.80, 0.90, 16), "lacquer", closed=True)
    path2 = rr_pts(1.46, 0.61, 0.12, 8)
    sweep(path2, rect_prof(-0.01, 0.01, 0.8985, 0.903), "brass", closed=True)
    # layout (right side)
    zf = 0.84
    x0 = -0.45
    cw = 0.13
    ch = 0.2
    ytop = 0.38
    reds = {1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36}
    # zero cell
    bb(-0.58, -0.45, ytop - 3 * ch, ytop, zf, zf + 0.004, "chip_green", bev=0.0015)
    for c in range(12):
        for r in range(3):
            n = 3 * c + (3 - r)
            xc = x0 + cw * (c + 0.5)
            yc = ytop - ch * (r + 0.5)
            bb(xc - cw / 2 + 0.006, xc + cw / 2 - 0.006, yc - ch / 2 + 0.006, yc + ch / 2 - 0.006, zf, zf + 0.004,
               "chip_red" if n in reds else "lacquer", bev=0.0015)
            # small ivory pip marking (number hint): diamond dot
            cyl((xc, yc, zf + 0.004), 0.016, 0.002, "ivory", seg=8)
    # 2to1 cells
    for r in range(3):
        yc = ytop - ch * (r + 0.5)
        x1 = x0 + cw * 12
        bb(x1 + 0.006, x1 + cw - 0.006, yc - ch / 2 + 0.006, yc + ch / 2 - 0.006, zf, zf + 0.004, "velvet", bev=0.0015)
    # grid lines (brass)
    xr = x0 + cw * 13
    ybot = ytop - 3 * ch
    for i in range(14):
        x = x0 + cw * i
        bb(x - 0.003, x + 0.003, ybot, ytop, zf, zf + 0.0035, "brass")
    bb(-0.583, -0.577, ybot, ytop, zf, zf + 0.0035, "brass")
    for r in range(4):
        y = ytop - ch * r
        bb(-0.58, xr, y - 0.003, y + 0.003, zf, zf + 0.0035, "brass")
    # dozens + outside bets
    yd = ybot - 0.11
    for i in range(3):
        xa = x0 + cw * 4 * i
        bb(xa + 0.006, xa + cw * 4 - 0.006, yd - 0.05, yd + 0.05, zf, zf + 0.003, "felt")
        bb(xa + 0.003, xa + cw * 4 - 0.003, yd - 0.05, yd - 0.044, zf, zf + 0.0035, "brass")
        bb(xa + 0.003, xa + cw * 4 - 0.003, yd + 0.044, yd + 0.05, zf, zf + 0.0035, "brass")
        bb(xa - 0.003, xa + 0.003, yd - 0.05, yd + 0.05, zf, zf + 0.0035, "brass")
    bb(x0 + cw * 12 - 0.003, x0 + cw * 12 + 0.003, yd - 0.05, yd + 0.05, zf, zf + 0.0035, "brass")
    yo = yd - 0.11
    kinds = ["ivory", "chip_red", "lacquer", "ivory", "ivory", "ivory"]
    for i in range(6):
        xa = x0 + cw * 2 * i
        bb(xa + 0.003, xa + cw * 2 - 0.003, yo - 0.05, yo + 0.05, zf, zf + 0.0035, "felt")
        bb(xa - 0.003, xa + 0.003, yo - 0.05, yo + 0.05, zf, zf + 0.0035, "brass")
        bb(xa, xa + cw * 2, yo - 0.05, yo - 0.044, zf, zf + 0.0035, "brass")
        bb(xa, xa + cw * 2, yo + 0.044, yo + 0.05, zf, zf + 0.0035, "brass")
        if i in (1, 2):
            t = bmesh.new()
            bmesh.ops.create_cube(t, size=1.0)
            for v in t.verts:
                v.co = Vector((v.co.x * 0.06, v.co.y * 0.06, v.co.z * 0.004))
            emit(t, "chip_red" if i == 1 else "lacquer", (xa + cw, yo, zf + 0.003), (0, 0, pi / 4))
        else:
            cyl((xa + cw, yo, zf), 0.01, 0.003, "ivory", seg=8)
    bb(xa + cw * 2 - 0.003, xa + cw * 2 + 0.003, yo - 0.05, yo + 0.05, zf, zf + 0.0035, "brass")
    # wheel bowl (walnut) at left end, axis at wx
    wx, wy = -0.98, 0.0
    zt = 0.84
    use(P)
    bowl = [(0, 0), (0.34, 0), (0.385, 0.045), (0.375, 0.10), (0.35, 0.118), (0.31, 0.105), (0.265, 0.078), (0.0, 0.058)]
    lathe(bowl, "walnut", (wx, wy, zt), seg=56)
    torus((wx, wy, zt + 0.118), 0.352, 0.009, "brass", 56, 8)
    torus((wx, wy, zt + 0.07), 0.262, 0.006, "brass", 48, 6)
    # ball in the track
    sph((wx + 0.30, wy, zt + 0.103), 0.011, "ivory", 10)
    # diamond deflectors on the slope
    for i in range(8):
        a = 2 * pi * i / 8
        sph((wx + 0.318 * cos(a), wy + 0.318 * sin(a), zt + 0.106), 0.010, "brass", 8, (1, 1, 1.3))
    # rotor (separate object, origin at axis)
    use(R)
    ox, oy, oz = R.origin
    lathe([(0, 0.0), (0.258, 0.0), (0.258, 0.026), (0.0, 0.026)], "walnut", (ox, oy, oz + 0.058), seg=48)
    npk = 37
    # pockets: red/black alternating, 0 = green
    for i in range(npk):
        a0 = 2 * pi * i / npk
        a1 = 2 * pi * (i + 1) / npk
        t = bmesh.new()
        r0, r1 = 0.165, 0.248
        zl, zh = 0.0, 0.016
        vs = []
        for (r, z) in ((r0, zl), (r1, zl), (r1, zh), (r0, zh)):
            vs.append((t.verts.new((r * cos(a0 + 0.0035), r * sin(a0 + 0.0035), z)), t.verts.new((r * cos(a1 - 0.0035), r * sin(a1 - 0.0035), z))))
        for k in range(4):
            k2 = (k + 1) % 4
            t.faces.new((vs[k][0], vs[k][1], vs[k2][1], vs[k2][0]))
        t.faces.new([vs[k][0] for k in range(4)])
        t.faces.new([vs[k][1] for k in range(3, -1, -1)])
        m = "chip_green" if i == 0 else ("chip_red" if i % 2 == 1 else "lacquer")
        emit(t, m, (ox, oy, oz + 0.084))
    ring_flat((ox, oy), 0.2545, 0.012, oz + 0.082, "brass", h=0.02, n=48)
    ring_flat((ox, oy), 0.164, 0.010, oz + 0.082, "brass", h=0.02, n=48)
    lathe([(0, 0.0), (0.16, 0.0), (0.15, 0.012), (0.105, 0.04), (0.055, 0.075), (0.032, 0.095), (0.0, 0.1)], "brass", (ox, oy, oz + 0.082), seg=40)
    cyl((ox, oy, oz + 0.18), 0.011, 0.07, "brass", seg=12)
    sph((ox, oy, oz + 0.255), 0.022, "brass", 14)
    for k in range(4):
        a = pi / 2 * k
        tube((ox, oy, oz + 0.22), (ox + 0.07 * cos(a), oy + 0.07 * sin(a), oz + 0.205), 0.0065, "brass", 8)
        sph((ox + 0.07 * cos(a), oy + 0.07 * sin(a), oz + 0.205), 0.011, "brass", 8)
    objs = finish("roulette_table", [P, R])
    return export("roulette_table", objs, "Table 3.0x1.3; wheel bowl at the -X end. Object 'wheel_rotor' has its origin on the wheel axis: rotate it around its Y (game axes, = Blender Z).")


def build_slot():
    P = Piece("slot_machine")
    use(P)
    # plinth + body
    bb(-0.39, 0.39, -0.35, 0.36, 0.0, 0.10, "lacquer", bev=0.012)
    bb(-0.405, 0.405, -0.36, 0.375, 0.095, 0.125, "brass", bev=0.008)
    bb(-0.40, 0.40, -0.34, 0.375, 0.125, 0.90, "lacquer", bev=0.02)
    for sx in (-1, 1):
        bb(sx * 0.392 - 0.012, sx * 0.392 + 0.012, -0.352, -0.332, 0.125, 0.90, "brass", bev=0.004)
    # coin tray
    bb(-0.20, 0.20, -0.385, -0.30, 0.30, 0.37, "brass", bev=0.012)
    bb(-0.17, 0.17, -0.375, -0.31, 0.325, 0.385, "glass")
    bb(-0.16, 0.16, -0.345, -0.335, 0.40, 0.46, "glass")
    # angled button deck
    poly([(-0.375, 0.90), (-0.375, 0.945), (-0.22, 1.03), (0.0, 1.03), (0.0, 0.90)], -0.40, 0.40, "lacquer", "yz")
    bb(-0.405, 0.405, -0.385, -0.365, 0.90, 0.95, "brass", bev=0.005)
    th = atan2(1.03 - 0.945, 0.155)
    for i, x in enumerate((-0.28, -0.14, 0.0, 0.14, 0.28)):
        y = -0.30
        z = 0.945 + (y + 0.375) * math.tan(th)
        m = ["chip_red", "ivory", "glow", "ivory", "chip_green"][i]
        rr = 0.05 if i == 2 else 0.032
        cyl((x, y, z - 0.004), rr + 0.008, 0.008, "brass", seg=20, rot=(th, 0, 0))
        cyl((x, y, z), rr, 0.016, m, seg=20, rot=(th, 0, 0))
    # upper cabinet
    bb(-0.40, 0.40, -0.22, 0.375, 1.03, 1.62, "lacquer", bev=0.02)
    # screen + frame
    bb(-0.31, 0.31, -0.235, -0.21, 1.10, 1.55, "screen")
    bb(-0.335, 0.335, -0.245, -0.215, 1.55, 1.58, "brass", bev=0.004)
    bb(-0.335, 0.335, -0.245, -0.215, 1.07, 1.10, "brass", bev=0.004)
    for sx in (-1, 1):
        bb(sx * 0.31 - (0.0 if sx < 0 else 0.025), sx * 0.31 + (0.025 if sx < 0 else 0.0), -0.245, -0.215, 1.07, 1.58, "brass", bev=0.004)
    rnd = random.Random(7)
    for k in range(1, 5):
        x = -0.31 + 0.124 * k
        bb(x - 0.004, x + 0.004, -0.250, -0.235, 1.10, 1.55, "ivory")
    for c in range(5):
        xc = -0.31 + 0.124 * (c + 0.5)
        for rz in (1.17, 1.325, 1.48):
            m = rnd.choice(["chip_red", "brass", "ivory", "chip_green", "chip_blue"])
            if rnd.random() < 0.5:
                cyl((xc, -0.236, rz), 0.034, 0.008, m, seg=16, rot=(pi / 2, 0, 0))
            else:
                sph((xc, -0.242, rz), 0.034, m, 12, (1, 0.25, 1))
    bb(-0.31, 0.31, -0.252, -0.246, 1.321, 1.329, "glow")
    # marquee arch (x,z) extruded along y
    arch = lambda a, b, zc, n=28: [(a * cos(pi * i / n), zc + b * sin(pi * i / n)) for i in range(n + 1)]
    poly(arch(0.40, 0.28, 1.62), 1.62, 1.62, "lacquer", "xz") if False else None
    pts = arch(0.40, 0.28, 1.62)
    poly(pts, -0.22, 0.375, "lacquer", "xz")
    poly(arch(0.37, 0.25, 1.625), -0.23, -0.22, "brass", "xz")
    poly(arch(0.345, 0.225, 1.64), -0.24, -0.23, "glow", "xz")
    for i in range(15):
        a = pi * (i + 0.5) / 15
        sph((0.385 * cos(a) * 0.985, -0.245, 1.62 + 0.262 * sin(a)), 0.014, "glow", 8)
    # brass cap trim at arch base
    bb(-0.41, 0.41, -0.235, 0.385, 1.615, 1.64, "brass", bev=0.005)
    # lever on right side
    tube((0.38, -0.02, 1.17), (0.455, -0.02, 1.17), 0.04, "brass", 14)
    tube((0.455, -0.02, 1.17), (0.455, -0.07, 1.58), 0.014, "brass", 10)
    sph((0.455, -0.07, 1.62), 0.05, "chip_red", 16)
    objs = finish("slot_machine", [P])
    return export("slot_machine", objs, "Front = -Y. Emissive: glow (marquee, bulbs, center button, win line) and screen (reels window). Lever on +X side.", glow=True)


def chip(cx, cy, z, col, stripe, r=0.2, h=0.04, ang=0.0, top=False):
    cyl((cx, cy, z), r, h, col, seg=36)
    n = 8
    for k in range(n):
        a = ang + 2 * pi * k / n
        box((cx + (r - 0.004) * cos(a), cy + (r - 0.004) * sin(a), z + h / 2), (0.016, 0.075, h * 0.82), stripe, rot=(0, 0, a + pi / 2))
    if top:
        ring_flat((cx, cy), 0.135, 0.014, z + h, stripe, h=0.002, n=32)
        ring_flat((cx, cy), 0.07, 0.008, z + h, stripe, h=0.002, n=24)


def build_chips():
    P = Piece("chip_stack")
    use(P)
    rnd = random.Random(11)
    spec = [(-0.45, 0.0, "chip_red", "chip_ivory", 6), (0.0, 0.03, "chip_ivory", "chip_red", 9), (0.45, -0.02, "chip_black", "chip_ivory", 4)]
    for (x, y, c, s, n) in spec:
        for i in range(n):
            jx, jy = rnd.uniform(-0.004, 0.004), rnd.uniform(-0.004, 0.004)
            chip(x + jx, y + jy, i * 0.04, c, s, ang=rnd.uniform(0, 1), top=(i == n - 1))
    objs = finish("chip_stack", [P], recenter_xy=True)
    return export("chip_stack", objs, "Three stacks (red 6, ivory 9, black 4). Chip r=0.2, thickness 0.04 (oversized toy scale).")


def build_shoe():
    P = Piece("card_shoe")
    use(P)
    # shoe body: slanted box (y,z profile) extruded along x
    poly([(-0.10, 0.0), (0.10, 0.0), (0.10, 0.15), (-0.10, 0.075)], -0.15, 0.15, "lacquer", "yz")
    bb(-0.155, 0.155, -0.105, 0.105, 0.0, 0.012, "brass", bev=0.004)
    th = atan2(0.075, 0.2)
    L = hypot(0.2, 0.075)
    # brass side rails along the ramp
    for sx in (-1, 1):
        box((sx * 0.1, 0.0, 0.1125 + 0.012), (0.012, L, 0.03), "brass", bev=0.003, rot=(th, 0, 0))
    # card block resting on the ramp
    nrm = Vector((0, -sin(th), cos(th)))
    ctr = Vector((0, 0.01, 0.1125)) + nrm * 0.026
    box(ctr, (0.18, L * 0.9, 0.032), "ivory", bev=0.002, rot=(th, 0, 0))
    box(ctr + nrm * 0.017, (0.17, L * 0.88, 0.003), "chip_red", rot=(th, 0, 0))
    # brass front lip and pusher paddle
    box(Vector((0, -0.095, 0.0775)) + nrm * 0.0, (0.22, 0.012, 0.03), "brass", bev=0.003, rot=(th, 0, 0))
    box(Vector((0, 0.07, 0.1475)) + nrm * 0.02, (0.17, 0.008, 0.07), "brass", bev=0.003, rot=(th, 0, 0))
    # loose cards to the right
    rnd = random.Random(5)
    for i in range(12):
        ang = rnd.uniform(-0.3, 0.3)
        box((0.31 + rnd.uniform(-0.006, 0.006), 0.0 + rnd.uniform(-0.006, 0.006), 0.003 + i * 0.0045),
            (0.075, 0.108, 0.0042), "ivory", bev=0.001, rot=(0, 0, ang))
    box((0.31, 0.0, 0.003 + 12 * 0.0045), (0.066, 0.098, 0.0016), "chip_red", rot=(0, 0, 0.1))
    objs = finish("card_shoe", [P], recenter_xy=True)
    return export("card_shoe", objs, "Blackjack shoe (ramp, front = -Y) with a loose stack of 12 cards on the +X side.")


def build_stool():
    P = Piece("bar_stool")
    use(P)
    lathe([(0, 0.0), (0.23, 0.0), (0.235, 0.02), (0.22, 0.04), (0.12, 0.05), (0.0, 0.05)], "lacquer", seg=40)
    torus((0, 0, 0.012), 0.232, 0.01, "brass", 40, 6)
    cyl((0, 0, 0.05), 0.045, 0.02, "brass", seg=20)
    cyl((0, 0, 0.07), 0.024, 0.60, "brass", seg=20)
    # footrest ring (chrome) + spokes
    torus((0, 0, 0.26), 0.17, 0.014, "chrome", 40, 10)
    for k in range(3):
        a = 2 * pi * k / 3 + 0.3
        tube((0.02 * cos(a), 0.02 * sin(a), 0.26), (0.17 * cos(a), 0.17 * sin(a), 0.26), 0.009, "chrome", 8)
    torus((0, 0, 0.26), 0.026, 0.012, "chrome", 16, 8)
    # seat
    cyl((0, 0, 0.66), 0.045, 0.02, "brass", seg=20, r2=0.07)
    cyl((0, 0, 0.675), 0.19, 0.015, "lacquer", seg=40)
    lathe([(0, 0.69), (0.195, 0.69), (0.215, 0.71), (0.215, 0.735), (0.19, 0.752), (0.1, 0.758), (0.0, 0.76)], "velvet", seg=40)
    torus((0, 0, 0.693), 0.2, 0.011, "brass", 40, 8)
    for k in range(10):
        a = 2 * pi * k / 10
        sph((0.21 * cos(a), 0.21 * sin(a), 0.718), 0.008, "brass", 8)
    objs = finish("bar_stool", [P])
    return export("bar_stool", objs, "Seat top z=0.76 (use ~0.72 for avatar sit). Velvet seat, brass pole, chrome footrest.")


def build_chandelier():
    P = Piece("chandelier")
    use(P)
    # canopy + chain (hangs down from z=0)
    lathe([(0, 0.0), (0.09, 0.0), (0.075, -0.02), (0.03, -0.045), (0.0, -0.05)], "brass", seg=24)
    for i in range(7):
        z = -0.06 - i * 0.06
        torus((0, 0, z), 0.018, 0.005, "brass", 12, 6, rot=(pi / 2, 0, (i % 2) * pi / 2))
    zh = -0.50
    lathe([(0, zh + 0.07), (0.05, zh + 0.05), (0.07, zh), (0.05, zh - 0.05), (0.0, zh - 0.1)], "brass", seg=24)
    # main ring
    Rr = 0.52
    zr = -0.58
    torus((0, 0, zr), Rr, 0.022, "brass", 64, 10)
    torus((0, 0, zr - 0.07), Rr - 0.1, 0.012, "brass", 48, 8)
    for k in range(8):
        a = 2 * pi * k / 8 + pi / 8
        tube((0.05 * cos(a), 0.05 * sin(a), zh + 0.01), (Rr * cos(a), Rr * sin(a), zr), 0.01, "brass", 8)
    # candle arms
    for k in range(8):
        a = 2 * pi * k / 8
        ca, sa = cos(a), sin(a)
        p0 = (Rr * ca, Rr * sa, zr)
        p1 = ((Rr + 0.06) * ca, (Rr + 0.06) * sa, zr + 0.09)
        tube(p0, p1, 0.011, "brass", 8)
        cyl(((Rr + 0.06) * ca, (Rr + 0.06) * sa, zr + 0.09), 0.026, 0.02, "brass", seg=14, r2=0.034)
        cyl(((Rr + 0.06) * ca, (Rr + 0.06) * sa, zr + 0.11), 0.017, 0.09, "ivory", seg=12)
        teardrop(((Rr + 0.06) * ca, (Rr + 0.06) * sa, zr + 0.20), 0.07, 0.017, "glow", seg=10)
    # hanging crystal drops
    for k in range(24):
        a = 2 * pi * k / 24 + pi / 24
        x, y = (Rr + 0.005) * cos(a), (Rr + 0.005) * sin(a)
        L = 0.06 if k % 2 == 0 else 0.11
        tube((x, y, zr - 0.01), (x, y, zr - L), 0.003, "brass", 6)
        teardrop((x, y, zr - L - 0.075), 0.075, 0.018, "crystal", seg=8)
    for k in range(12):
        a = 2 * pi * k / 12
        x, y = (Rr - 0.1) * cos(a), (Rr - 0.1) * sin(a)
        tube((x, y, zr - 0.075), (x, y, zr - 0.12), 0.003, "brass", 6)
        teardrop((x, y, zr - 0.12 - 0.06), 0.06, 0.014, "crystal", seg=8)
    # central finial + big drop
    tube((0, 0, zh - 0.1), (0, 0, zh - 0.22), 0.008, "brass", 8)
    sph((0, 0, zh - 0.235), 0.025, "brass", 12)
    teardrop((0, 0, zh - 0.245 - 0.20), 0.2, 0.04, "crystal", seg=12)
    objs = finish("chandelier", [P], zero_z=False)
    return export("chandelier", objs, "Origin = ceiling attachment point; hangs down (game -Y). Emissive: glow flames, crystal (faint).", glow=True)


def build_bar():
    P = Piece("bar_counter")
    use(P)
    # front body
    bb(-1.5, 1.5, -0.20, 0.28, 0.0, 0.07, "brass", bev=0.01)
    bb(-1.49, 1.49, -0.19, 0.27, 0.07, 1.02, "lacquer", bev=0.02)
    # vertical fluting (half-round brass reeds)
    for i in range(30):
        x = -1.45 + 0.1 * i
        cyl((x, -0.195, 0.14), 0.014, 0.82, "brass", seg=8)
    bb(-1.49, 1.49, -0.205, -0.185, 0.115, 0.14, "brass", bev=0.004)
    bb(-1.49, 1.49, -0.205, -0.185, 0.96, 1.0, "brass", bev=0.004)
    # walnut top
    bb(-1.56, 1.56, -0.40, 0.38, 1.02, 1.09, "walnut", bev=0.025)
    bb(-1.52, 1.52, -0.375, -0.2, 1.0, 1.02, "brass")
    # foot rail
    tube((-1.45, -0.40, 0.20), (1.45, -0.40, 0.20), 0.03, "brass", 16)
    for x in (-1.45, -0.75, 0.0, 0.75, 1.45):
        tube((x, -0.40, 0.20), (x, -0.2, 0.20), 0.016, "brass", 10)
        sph((x, -0.40, 0.20), 0.034, "brass", 10)
    sph((-1.45, -0.40, 0.20), 0.036, "brass", 12)
    sph((1.45, -0.40, 0.20), 0.036, "brass", 12)
    # back bar
    bb(-1.5, 1.5, 0.60, 0.88, 0.0, 0.07, "brass", bev=0.01)
    bb(-1.49, 1.49, 0.61, 0.87, 0.07, 0.92, "lacquer", bev=0.02)
    bb(-1.52, 1.52, 0.58, 0.88, 0.92, 0.96, "walnut", bev=0.01)
    bb(-1.45, 1.45, 0.84, 0.90, 0.96, 1.95, "lacquer", bev=0.02)
    bb(-1.47, 1.47, 0.83, 0.91, 1.93, 1.98, "brass", bev=0.01)
    for z in (1.30, 1.64):
        bb(-1.42, 1.42, 0.70, 0.84, z, z + 0.035, "walnut", bev=0.006)
        bb(-1.42, 1.42, 0.695, 0.70, z - 0.002, z + 0.04, "brass")
        bb(-1.40, 1.40, 0.72, 0.76, z - 0.012, z, "glow")
    bb(-1.40, 1.40, 0.72, 0.76, 0.912, 0.92, "glow")
    # bottles
    rnd = random.Random(21)
    cols = ["chip_green", "velvet", "walnut", "brass", "chip_blue", "glass", "ivory"]

    def bottle(x, y, z, h, r, m):
        prof = [(0, 0), (r, 0), (r, h * 0.55), (r * 0.9, h * 0.65), (r * 0.38, h * 0.78), (r * 0.36, h * 0.98), (0, h * 0.98)]
        lathe(prof, m, (x, y, z), seg=10)
        cyl((x, y, z + h * 0.97), r * 0.4, h * 0.05, "brass", seg=8)

    for z in (0.96, 1.335, 1.675):
        x = -1.30
        while x < 1.30:
            h = rnd.uniform(0.22, 0.31) if z < 1.0 else rnd.uniform(0.17, 0.24)
            bottle(x, 0.78, z, h, rnd.uniform(0.03, 0.04), rnd.choice(cols))
            x += rnd.uniform(0.12, 0.18)
    # glasses on the bar
    for x in (-1.0, -0.2, 0.7):
        lathe([(0, 1.09), (0.03, 1.09), (0.006, 1.095), (0.006, 1.14), (0.04, 1.2), (0.036, 1.2), (0.0, 1.145)], "crystal", (x, -0.1, 0), seg=14, loop=True) if False else None
    objs = finish("bar_counter", [P])
    return export("bar_counter", objs, "Front = -Y (customers). Back bar with shelves + bottles at +Y. Walnut top at z=1.09. Emissive: glow strips under shelves.", glow=True)


def build_lamp():
    P = Piece("lamp_floor")
    use(P)
    lathe([(0, 0.0), (0.22, 0.0), (0.22, 0.02), (0.18, 0.035), (0.10, 0.07), (0.04, 0.11), (0.0, 0.11)], "brass", seg=40)
    cyl((0, 0, 0.0), 0.2, 0.006, "lacquer", seg=40)
    cyl((0, 0, 0.11), 0.018, 1.17, "brass", seg=16)
    for z in (0.2, 0.7, 1.12):
        torus((0, 0, z), 0.024, 0.01, "brass", 16, 8)
    sph((0, 0, 0.45), 0.035, "brass", 14)
    # shade (fluted, ivory, lit)
    lathe([(0.22, 1.24), (0.14, 1.60), (0.13, 1.60), (0.21, 1.245)], "shade", seg=48, loop=True, wav=(0.03, 12))
    torus((0, 0, 1.243), 0.222, 0.007, "brass", 48, 6)
    torus((0, 0, 1.60), 0.142, 0.007, "brass", 48, 6)
    for k in range(3):
        a = 2 * pi * k / 3
        tube((0, 0, 1.28), (0.215 * cos(a), 0.215 * sin(a), 1.245), 0.005, "brass", 6)
    sph((0, 0, 1.40), 0.055, "glow", 14)
    cyl((0, 0, 1.28), 0.012, 0.05, "brass", seg=10)
    objs = finish("lamp_floor", [P])
    return export("lamp_floor", objs, "Art-deco floor lamp 1.6 m. Emissive: shade (soft) and glow bulb.", glow=True)


def build_pillar():
    P = Piece("pillar")
    use(P)
    bb(-0.34, 0.34, -0.34, 0.34, 0.0, 0.06, "brass", bev=0.008)
    bb(-0.30, 0.30, -0.30, 0.30, 0.06, 0.16, "lacquer", bev=0.012)
    bb(-0.26, 0.26, -0.26, 0.26, 0.16, 0.22, "brass", bev=0.008)
    cyl((0, 0, 0.22), 0.20, 2.64, "lacquer", seg=40)
    torus((0, 0, 0.235), 0.205, 0.014, "brass", 40, 8)
    torus((0, 0, 2.85), 0.205, 0.014, "brass", 40, 8)
    for k in range(12):
        a = 2 * pi * k / 12
        r = 0.2
        box((r * cos(a), r * sin(a), 1.54), (0.012, 0.035, 2.5), "brass", rot=(0, 0, a))
    bb(-0.26, 0.26, -0.26, 0.26, 2.86, 2.92, "brass", bev=0.008)
    bb(-0.30, 0.30, -0.30, 0.30, 2.92, 3.04, "lacquer", bev=0.012)
    bb(-0.35, 0.35, -0.35, 0.35, 3.04, 3.14, "brass", bev=0.01)
    bb(-0.30, 0.30, -0.30, 0.30, 3.14, 3.20, "lacquer", bev=0.01)
    objs = finish("pillar", [P])
    return export("pillar", objs, "3.2 m art-deco column: lacquer shaft, 12 brass inlays, brass base/capital.")


BUILDERS = [
    ("card_table", build_card_table), ("poker_table", build_poker_table), ("roulette_table", build_roulette),
    ("slot_machine", build_slot), ("chip_stack", build_chips), ("card_shoe", build_shoe), ("bar_stool", build_stool),
    ("chandelier", build_chandelier), ("bar_counter", build_bar), ("lamp_floor", build_lamp), ("pillar", build_pillar),
]

# ================================================================= textures
def make_textures():
    import numpy as np
    N = 512
    rng = np.random.default_rng(42)
    yy, xx = np.mgrid[0:N, 0:N]
    u = xx / N
    v = yy / N

    def srgb_img(name, arr):
        img = bpy.data.images.new(name, N, N, alpha=False)
        a = np.clip(np.nan_to_num(arr), 0, 1)
        print("TEXSTAT", name, arr.shape, float(np.nanmean(arr)), float(a.mean()))
        rgba = np.ones((N, N, 4), dtype=np.float32)
        rgba[..., :3] = a
        img.colorspace_settings.name = "sRGB"
        img.pixels.foreach_set(rgba.astype(np.float32).ravel())
        img.update()
        img.filepath_raw = os.path.join(OUT, name)
        img.file_format = "PNG"
        img.save()

    def blur_wrap(a, k=1):
        s = a.copy()
        for dx in range(-k, k + 1):
            for dy in range(-k, k + 1):
                if dx or dy:
                    s += np.roll(np.roll(a, dx, 0), dy, 1)
        return s / ((2 * k + 1) ** 2)

    # carpet: burgundy velvet + gold art-deco diamond lattice
    base = np.array([58, 10, 22]) / 255.0
    gold = np.array([140, 106, 44]) / 255.0
    f1 = ((u + v) * 4.0) % 1.0
    f2 = ((u - v) * 4.0) % 1.0
    d1 = np.abs(f1 - 0.5)
    d2 = np.abs(f2 - 0.5)
    line = np.maximum(np.clip((d1 - 0.465) / 0.035, 0, 1), np.clip((d2 - 0.465) / 0.035, 0, 1))
    inner = np.clip(1.0 - np.abs((d1 + d2) - 0.40) / 0.02, 0, 1) * 0.0 + np.clip(1.0 - np.abs(np.maximum(1 - 2 * np.abs(f1 - 0.5), 1 - 2 * np.abs(f2 - 0.5)) - 0.0) * 0, 0, 1) * 0
    # small diamond at each cell center (cell centers are where f1=0.5,f2=0.5 -> d1=d2=0)
    dia = np.clip(1.0 - np.abs((d1 + d2) - 0.14) / 0.018, 0, 1)
    dot = np.clip(1.0 - (d1 + d2) / 0.05, 0, 1)
    # nodes (line crossings)
    node = np.clip((np.minimum(d1, d2) - 0.40) / 0.10, 0, 1) * 0.0
    pat = np.clip(line * 0.32 + dia * 0.28 + dot * 0.30, 0, 0.5)
    noise = blur_wrap(rng.random((N, N)), 1)
    noise = (noise - noise.mean()) * 1.2
    nap = (np.sin(u * 2 * pi * 64) * np.sin(v * 2 * pi * 64)) * 0.012
    col = base[None, None, :] * (1 + (noise[..., None] * 0.9) + nap[..., None]) * (1 - pat[..., None]) + gold[None, None, :] * pat[..., None] * (1 + noise[..., None] * 0.5)
    srgb_img("carpet.png", col)

    # felt
    fb = np.array([15, 74, 50]) / 255.0
    n1 = rng.random((N, N))
    fibre = (blur_wrap(n1, 1) - 0.5) * 0.9 + (n1 - 0.5) * 0.5
    streak = (np.roll(n1, 1, 1) + np.roll(n1, -1, 1) + n1) / 3.0
    low = (np.sin(u * 2 * pi * 3 + 1.3) * np.sin(v * 2 * pi * 2 + 0.4) * 0.5 + np.sin((u + v) * 2 * pi * 5) * 0.25) * 0.03
    felt = fb[None, None, :] * (1 + fibre[..., None] * 0.28 + (streak[..., None] - 0.5) * 0.12 + low[..., None])
    srgb_img("felt.png", felt)
    print("TEXTURES ok")


# ================================================================= sheet render
def render_sheet():
    sc = bpy.context.scene
    # grid layout
    order = [
        ["card_table", "poker_table", "roulette_table"],
        ["slot_machine", "bar_counter", "pillar", "lamp_floor"],
        ["chip_stack", "card_shoe", "bar_stool", "chandelier"],
    ]
    byname = {n: (o, s, mn, mx) for (n, o, s, mn, mx) in SHEET}
    rows = []
    for ri, row in enumerate(order):
        x = 0.0
        ents = []
        for n in row:
            if n not in byname:
                continue
            objs, size, mn, mx = byname[n]
            w = max(size.x, 0.8) + 1.0
            cx = x + w / 2
            for o in objs:
                o.location = o.location + Vector((cx, ri * 3.6 - 3.6, 2.6 if n == "chandelier" else 0.0))
            x += w
            ents.append(n)
        # center row
        for n in ents:
            for o in byname[n][0]:
                o.location.x -= x / 2
        rows.append(ents)
    # floor
    bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, -0.001))
    fl = bpy.context.active_object
    fm = bpy.data.materials.new("floor")
    fm.use_nodes = True
    fm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.12, 0.05, 0.07, 1)
    fm.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.8
    fl.data.materials.append(fm)
    # world
    w = bpy.data.worlds.new("w")
    sc.world = w
    w.use_nodes = True
    bgn = w.node_tree.nodes["Background"]
    bgn.inputs["Color"].default_value = (0.55, 0.55, 0.6, 1)
    bgn.inputs["Strength"].default_value = 0.9
    # lights
    for loc, en, sz in (((-6, -8, 9), 900, 8), ((8, -6, 7), 500, 8), ((0, 6, 6), 300, 6)):
        bpy.ops.object.light_add(type="AREA", location=loc)
        L = bpy.context.active_object
        L.data.energy = en
        L.data.size = sz
        d = Vector((0, 0, 0.8)) - Vector(loc)
        L.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    for eng in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT", "BLENDER_WORKBENCH"):
        try:
            sc.render.engine = eng
            break
        except TypeError:
            continue
    print("RENDER ENGINE", sc.render.engine)
    sc.view_settings.view_transform = "Standard"
    sc.render.image_settings.file_format = "PNG"
    bpy.ops.object.camera_add()
    cam = bpy.context.active_object
    sc.camera = cam
    cam.data.type = "ORTHO"

    def shot(name, cx, cy, scale, resx, resy, tilt=68, zc=1.0):
        sc.render.resolution_x = resx
        sc.render.resolution_y = resy
        cam.data.ortho_scale = scale
        rx = radians(tilt)
        dist = 40
        cam.rotation_euler = (rx, 0, 0)
        dirv = Vector((0, 0, -1))
        dirv.rotate(cam.rotation_euler)
        cam.location = Vector((cx, cy, zc)) - dirv * dist
        sc.render.filepath = os.path.join(SHEET_DIR, name)
        bpy.ops.render.render(write_still=True)

    try:
        shot("blender_sheet.png", 0, 0, 17.5, 2400, 1500)
        for i in range(3):
            shot("blender_row%d.png" % (i + 1), 0, i * 3.6 - 3.6, 12.5, 2000, 1000, tilt=72, zc=1.0 + (0.8 if i == 2 else 0))
    except Exception as e:
        print("RENDER FAIL", e)


# ================================================================= main
def main():
    # clean scene
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    info = []
    for name, fn in BUILDERS:
        if ONLY and name not in ONLY:
            continue
        info.append(fn())
    if not ONLY or "textures" in ONLY:
        make_textures()
    tex = [{"file": "carpet.png", "size_px": 512, "notes": "seamless burgundy velvet with low-contrast gold art-deco diamond lattice (sRGB). Repeat ~every 2 m."},
           {"file": "felt.png", "size_px": 512, "notes": "seamless deep green felt fibre noise (sRGB). Felt faces in the GLBs have planar XY UVs (2 tiles per meter)."}]
    if not ONLY:
        with open(os.path.join(OUT, "casino.json"), "w", encoding="utf-8") as f:
            json.dump({"convention": "size/min/max in game axes (x right, y up, z toward player/front); meters; origin at floor center; front faces +Z in game",
                       "pieces": info, "textures": tex}, f, indent=2)
    if not NOSHEET:
        render_sheet()
    print("DONE")


main()

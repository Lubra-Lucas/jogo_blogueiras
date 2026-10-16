"""
Kit modular da cidade (exterior) no estilo "casa de bonecas de porcelana de luxo".
Gera cada peca proceduralmente (bmesh + modifiers), exporta GLB (Y-up) e kit.json.

Uso:  blender -b -P tools/blender/city_kit.py            (exporta tudo)
Convencoes (espaco Blender, Z-up; no GLB vira Y-up e a frente -Y vira +Z):
  - fachada: plano frontal em y=0, frente olhando para -Y, corpo da parede em y=0..+0.4
  - origem na base, centro horizontal da peca. Pecas "de encaixe" (awning, balcony, cornice, sign,
    dome) tem origem na base da propria peca; kit.json traz "mount" com onde encaixar.
"""
import bpy
import bmesh
import math
import os
import sys
import json
import random
from math import pi, sin, cos, radians
from mathutils import Vector, Matrix, Euler

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "public", "assets", "city", "kit")

PAL = dict(pink="#f7c6d9", bubble="#ff8fbf", cream="#fff3ea", white="#fffaf6", gold="#e6b84f",
           lilac="#d9c2f0", wine="#8a2f4a")

M = {}


def lin(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    c = [(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c]
    return (c[0], c[1], c[2], 1.0)


def _set(b, name, v):
    try:
        b.inputs[name].default_value = v
    except Exception:
        pass


# chaves distintas das do kit Y2K (os dois JSONs sao fundidos no jogo)
METALS = {
    "jewel_gold": ("#f2cf6e", 0.14), "rose_gold": ("#f0aa9c", 0.18), "silver": ("#e3e6ee", 0.16),
    "champagne": ("#ecd9a2", 0.2), "chrome": ("#f5f7fb", 0.05), "pearl": ("#f6f0fa", 0.16),
}
# slots: base (corpo), accent (2a cor suave), accent2 (cor forte: listras/coracoes), soft (3a cor pastel),
#        deep (tom escuro), seat (estofado), white, trim (metal), glass, glow, leaf, water
PALETTES = {
    "casa":      dict(label="Casa dos Sonhos", base="#fff3ea", accent="#f7c6d9", accent2="#ff8fbf", soft="#d9c2f0", deep="#8a2f4a",
                      seat="#f6a3c4", white="#fffaf6", glass="#ffb3d1", glow="#ffd08a", metal="jewel_gold"),
    "cafe":      dict(label="Cafe Rose", base="#bfe8d6", accent="#fff3ea", accent2="#e0405a", soft="#ffd9c9", deep="#8f2a3d",
                      seat="#e8697e", white="#fffaf6", glass="#ffc9c0", glow="#ffd9a0", metal="rose_gold"),
    "salao":     dict(label="Salao & Spa", base="#d6c4f0", accent="#fff3ea", accent2="#a77fd9", soft="#f1e6ff", deep="#5b3f87",
                      seat="#c9a8ee", white="#fffaf6", glass="#e3ccff", glow="#ffe0f0", metal="silver"),
    "boutique":  dict(label="Boutique", base="#c6ddf5", accent="#fffaf6", accent2="#7fb2ea", soft="#e3efff", deep="#2f5a8f",
                      seat="#a8c8ef", white="#fffaf6", glass="#cfe6ff", glow="#fff0c8", metal="champagne"),
    "joalheria": dict(label="Joalheria", base="#1d1a22", accent="#2f2a38", accent2="#8a2f4a", soft="#4a4256", deep="#8a2f4a",
                      seat="#3b2f45", white="#f3eee8", glass="#9a7fb5", glow="#ffe2a0", metal="champagne"),
    "estudio":   dict(label="Estudio de Fotos", base="#ffc2a8", accent="#fff3ea", accent2="#ff7f6b", soft="#ffe0cf", deep="#a8483a",
                      seat="#ff9d86", white="#fffaf6", glass="#ffd5c4", glow="#fff0d0", metal="chrome"),
    "palco":     dict(label="Palco / Boate", base="#b04ad8", accent="#e9c6ff", accent2="#ff4fd0", soft="#6a2d9c", deep="#3a1466",
                      seat="#8a3cc0", white="#f6e8ff", glass="#ff8be8", glow="#ff5ff0", glow_str=8.0, metal="silver"),
    "jardim":    dict(label="Jardim", base="#b9d2a8", accent="#fffaf6", accent2="#f2d36b", soft="#f6e3a1", deep="#6b8a58",
                      seat="#d6e6a8", white="#fffaf6", glass="#d6f0d0", glow="#fff2b0", metal="jewel_gold"),
}
def _hp(label, base, accent, accent2, soft, deep, glass, metal, seat=None, glow="#fff0b8"):
    return dict(label=label, base=base, accent=accent, accent2=accent2, soft=soft, deep=deep, seat=seat or accent2,
                white="#fffaf6", glass=glass, glow=glow, metal=metal)


# casas do Jardim (variadas, so um toque de rosa), Casa dos Sonhos (rosa + ouro) e Parque do Lago (menta/sage, coral e limao)
PALETTES.update({
    "h_peach":    _hp("Casa pessego", "#ffd9c2", "#fff1e4", "#f29b86", "#ffe9d6", "#b4604e", "#ffd6c8", "jewel_gold"),
    "h_mint":     _hp("Casa menta", "#c4ecd8", "#f3fff9", "#6fc9a6", "#e2f7ee", "#3a8a6c", "#c9f3e2", "pearl"),
    "h_cream":    _hp("Casa creme", "#fff3df", "#ffe3b8", "#f2a8b8", "#fff8ec", "#b86a7a", "#ffe9d2", "rose_gold"),
    "h_lavender": _hp("Casa lavanda", "#dccdf5", "#f4ecff", "#a98bdc", "#ece3fb", "#6a4fa0", "#e3d5fa", "pearl"),
    "h_butter":   _hp("Casa manteiga", "#fcecae", "#fff8d8", "#f4b860", "#fff3c4", "#a77c1f", "#fff0b0", "jewel_gold"),
    "h_sky":      _hp("Casa celeste", "#c8e2f8", "#f1f8ff", "#7fb4e6", "#e1effc", "#3d6fa5", "#d3ebff", "silver"),
    "h_blush":    _hp("Casa rose", "#f9d0de", "#fff4f7", "#e57fa6", "#fde6ee", "#a24668", "#ffd3e3", "rose_gold"),
    "casa_rosa":  _hp("Casa dos Sonhos", "#f8c3d8", "#fff3ea", "#f06aa4", "#ffd9e8", "#b03a74", "#ffb3d1", "jewel_gold", seat="#f6a3c4", glow="#ffd08a"),
    "p_ponte":    _hp("Parque pearl", "#fff6ee", "#bfe8d6", "#ff8f7a", "#ffe9df", "#c4584a", "#d6f3e8", "rose_gold", seat="#ff9f8f"),
    "p_coral":    _hp("Parque coral", "#ffd6cc", "#fff6ee", "#ff8f7a", "#ffe9df", "#c4584a", "#ffd6c8", "jewel_gold", seat="#ff9f8f"),
    "p_lemon":    _hp("Parque limao", "#fff0a8", "#fffbe0", "#f5cf4a", "#fff6c4", "#a78a1f", "#fff3b8", "jewel_gold", seat="#ffe27a"),
    "p_mint":     _hp("Parque menta", "#bfe8d6", "#f3fff9", "#6fc9a6", "#dff7ec", "#3a8a6c", "#c9f3e2", "pearl", seat="#9fe0c4"),
    "p_lilac":    _hp("Parque lilas", "#dccdf5", "#f4ecff", "#b394e8", "#ece3fb", "#6a4fa0", "#e3d5fa", "pearl", seat="#c9b0f2"),
})

# parametros de acabamento por slot: rough, coat, coat_rough, sheen, sheen_rough
SPEC = dict(base=(.18, .9, .04, .9, .3), accent=(.14, 1, .04, .4, .4), accent2=(.08, 1, .02, 0, .4), soft=(.1, 1, .02, .3, .4),
            deep=(.12, 1, .03, 0, .4), seat=(.38, .45, .2, 1, .35), white=(.12, 1, .04, .3, .4))


def _mk(name, color, rough=0.2, metal=0.0, coat=0.8, coat_rough=0.04, sheen=0.0, sheen_rough=0.4,
        emis=None, emis_str=0.0, alpha=1.0, spec=0.5):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    _set(b, "Base Color", lin(color))
    _set(b, "Roughness", rough)
    _set(b, "Metallic", metal)
    _set(b, "Coat Weight", coat)
    _set(b, "Coat Roughness", coat_rough)
    _set(b, "Sheen Weight", sheen)
    _set(b, "Sheen Roughness", sheen_rough)
    _set(b, "Specular IOR Level", spec)
    if emis:
        _set(b, "Emission Color", lin(emis))
        _set(b, "Emission Strength", emis_str)
    if alpha < 1:
        _set(b, "Alpha", alpha)
        try:
            m.surface_render_method = "BLENDED"
        except Exception:
            pass
    return m


def make_mat(name, color, **kw):
    M[name] = _mk(name, color, **kw)
    return M[name]


def palette_mats(pal, suffix=""):
    P = PALETTES[pal]
    out = {}
    for slot in ("base", "accent", "accent2", "soft", "deep", "seat", "white"):
        r, c, cr, sh, shr = SPEC[slot]
        out[slot] = _mk(slot + suffix, P[slot], rough=r, coat=c, coat_rough=cr, sheen=sh, sheen_rough=shr)
    mc, mr = METALS[P["metal"]]
    out["trim"] = _mk("trim" + suffix, mc, rough=mr, metal=1.0, coat=0.3 if P["metal"] != "chrome" else 0.0)
    out["glass"] = _mk("glass" + suffix, P["glass"], rough=0.03, coat=0.0, alpha=0.5, spec=0.8)
    out["glow"] = _mk("glow" + suffix, P["glow"], rough=0.3, coat=0.0, emis=P["glow"], emis_str=P.get("glow_str", 5.0))
    out["leaf"] = _mk("leaf" + suffix, "#a8dcc0", rough=0.3, coat=0.7, coat_rough=0.1, sheen=0.6)
    out["water"] = _mk("water" + suffix, "#cfeeff", rough=0.0, coat=0.0, alpha=0.42, spec=1.0, emis="#a8dcff", emis_str=0.5)
    return out


def build_materials(pal="casa"):
    M.update(palette_mats(pal))


def recolor(ob, pal, tag):
    """copia a malha e troca os slots por materiais da paleta (so para renders / teste)."""
    mats = _PAL_CACHE.setdefault(pal, palette_mats(pal, "@" + pal))
    ob.data = ob.data.copy()
    for i, m in enumerate(ob.data.materials):
        if m and m.name.split("@")[0] in mats:
            ob.data.materials[i] = mats[m.name.split("@")[0]]


_PAL_CACHE = {}


# ----------------------------------------------------------------------------------------------------
# geometria base (bmesh) -> objetos
# ----------------------------------------------------------------------------------------------------
def bm_box(sx, sy, sz):
    bm = bmesh.new()
    v = [bm.verts.new((x * sx / 2, y * sy / 2, z * sz / 2)) for z in (-1, 1) for y in (-1, 1) for x in (-1, 1)]
    for f in ([0, 1, 3, 2], [4, 5, 7, 6], [0, 1, 5, 4], [2, 3, 7, 6], [0, 2, 6, 4], [1, 3, 7, 5]):
        bm.faces.new([v[i] for i in f])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def chaikin(pts, it):
    for _ in range(it):
        if len(pts) < 3:
            break
        n = [pts[0]]
        for i in range(len(pts) - 1):
            a, b = pts[i], pts[i + 1]
            n.append((a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25))
            n.append((a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75))
        n.append(pts[-1])
        pts = n
    return pts


def bm_lathe(profile, n=24, smooth=0, closed=False, flute=None):
    prof = chaikin(list(profile), smooth) if smooth else list(profile)
    bm = bmesh.new()
    rings = []
    zs = [p[1] for p in prof]
    zmin, zmax = min(zs), max(zs)
    for (r, z) in prof:
        if abs(r) < 1e-6:
            rings.append([bm.verts.new((0, 0, z))])
        else:
            w = max(0.0, (z - zmin) / max(zmax - zmin, 1e-6)) ** 1.5
            ring = []
            for j in range(n):
                t = 2 * pi * j / n
                k = 1 + (flute[1] * w * cos(flute[0] * t) if flute else 0)
                ring.append(bm.verts.new((r * k * cos(t), r * k * sin(t), z)))
            rings.append(ring)
    cnt = len(rings) if closed else len(rings) - 1
    for i in range(cnt):
        A, B = rings[i], rings[(i + 1) % len(rings)]
        for j in range(n):
            j2 = (j + 1) % n
            a = A[j % len(A)]
            b = A[j2 % len(A)]
            c = B[j2 % len(B)]
            d = B[j % len(B)]
            q = []
            for v in (a, b, c, d):
                if v not in q:
                    q.append(v)
            if len(q) >= 3:
                try:
                    bm.faces.new(q)
                except ValueError:
                    pass
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def bm_sphere(dx, dy, dz, n=14, rings=9):
    prof = [(sin(pi * i / rings) * .5, -cos(pi * i / rings) * .5) for i in range(rings + 1)]
    bm = bm_lathe(prof, n)
    for v in bm.verts:
        v.co.x *= dx
        v.co.y *= dy
        v.co.z *= dz
    return bm


def bm_tube(points, r, minor=8, closed=False, caps=True):
    bm = bmesh.new()
    pts = [Vector(p) for p in points]
    n = len(pts)
    tang = []
    for i in range(n):
        if closed:
            t = pts[(i + 1) % n] - pts[i - 1]
        else:
            t = pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]
        tang.append(t.normalized())
    t0 = tang[0]
    ref = Vector((0, 1, 0)) if abs(t0.y) < .9 else Vector((1, 0, 0))
    nrm = t0.cross(ref).normalized()
    rings = []
    for i in range(n):
        t = tang[i]
        nrm = (nrm - t * nrm.dot(t)).normalized()
        b = t.cross(nrm)
        rr = r[i] if isinstance(r, (list, tuple)) else r
        rings.append([bm.verts.new(pts[i] + (nrm * cos(2 * pi * k / minor) + b * sin(2 * pi * k / minor)) * rr)
                      for k in range(minor)])
    cnt = n if closed else n - 1
    for i in range(cnt):
        A, B = rings[i], rings[(i + 1) % n]
        for k in range(minor):
            k2 = (k + 1) % minor
            bm.faces.new((A[k], A[k2], B[k2], B[k]))
    if caps and not closed:
        bm.faces.new(rings[0])
        bm.faces.new(rings[-1][::-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def bm_prism(pts, h, plane="xy"):
    """extrude um contorno 2D. plane xy -> extrude em Z; xz -> contorno em X/Z, extrude em Y."""
    bm = bmesh.new()

    def V(p, s):
        return (p[0], p[1], s) if plane == "xy" else (p[0], s, p[1])
    bot = [bm.verts.new(V(p, -h / 2)) for p in pts]
    top = [bm.verts.new(V(p, h / 2)) for p in pts]
    bm.faces.new(bot)
    bm.faces.new(top[::-1])
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((bot[i], bot[j], top[j], top[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def heart_pts(w, n=34):
    s = w / 32.0
    out = []
    for i in range(n):
        t = 2 * pi * i / n
        x = 16 * sin(t) ** 3
        y = 13 * cos(t) - 5 * cos(2 * t) - 2 * cos(3 * t) - cos(4 * t)
        out.append((x * s, (y + 2.5) * s))
    return out


def ellipse_pts(rx, rz, n=32, a0=0, a1=2 * pi, close=False):
    cnt = n + 1 if (a1 - a0) < 2 * pi - 1e-6 else n
    return [(rx * cos(a0 + (a1 - a0) * i / (cnt - 1 if cnt != n else n)),
             rz * sin(a0 + (a1 - a0) * i / (cnt - 1 if cnt != n else n))) for i in range(cnt)]


def arc3(cx, cz, rx, rz, a0, a1, n=12, y=0.0):
    return [Vector((cx + rx * cos(a0 + (a1 - a0) * i / n), y, cz + rz * sin(a0 + (a1 - a0) * i / n)))
            for i in range(n + 1)]


def spiral3(cx, cz, r0, r1, a0, turns, n=24, y=0.0, ccw=True):
    out = []
    for i in range(n + 1):
        t = i / n
        a = a0 + (1 if ccw else -1) * turns * 2 * pi * t
        r = r0 + (r1 - r0) * t
        out.append(Vector((cx + r * cos(a), y, cz + r * sin(a))))
    return out


_ids = [0]


def _obj_from_bm(bm, mat, loc, rot, bevel=0.0, seg=2, ang=30, scale=None):
    me = bpy.data.meshes.new("p%d" % _ids[0])
    _ids[0] += 1
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(me.name, me)
    bpy.context.scene.collection.objects.link(ob)
    if mat:
        me.materials.append(M[mat])
    if bevel > 0:
        md = ob.modifiers.new("b", "BEVEL")
        md.width = bevel
        md.segments = seg
        md.limit_method = "ANGLE"
        md.angle_limit = radians(ang)
        _apply_eval(ob, md)
    xf = Matrix.LocRotScale(Vector(loc), Euler(rot, "XYZ"), Vector(scale) if scale else None)
    ob.data.transform(xf)
    return ob


def _apply_eval(ob, md):
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me2 = bpy.data.meshes.new_from_object(ev)
    old = ob.data
    ob.modifiers.remove(md)
    ob.data = me2
    bpy.data.meshes.remove(old)


def box(dims, loc, mat, rot=(0, 0, 0), bevel=0.0, seg=2):
    if max(dims) < .6:
        seg = min(seg, 2)
    return _obj_from_bm(bm_box(*dims), mat, loc, rot, bevel, seg)


def cyl(r, h, loc, mat, rot=(0, 0, 0), n=20, bevel=0.0, seg=2, rz=None):
    bm = bm_lathe([(0, -h / 2), (r, -h / 2), (r, h / 2), (0, h / 2)], n)
    if rz:
        for v in bm.verts:
            v.co.y *= rz / r
    return _obj_from_bm(bm, mat, loc, rot, bevel, seg, ang=40)


def sph(dims, loc, mat, rot=(0, 0, 0), n=14, rings=9):
    if not isinstance(dims, (tuple, list)):
        dims = (dims * 2,) * 3
    if max(dims) < .3:
        n, rings = min(n, 8), min(rings, 5)
    return _obj_from_bm(bm_sphere(*dims, n=n, rings=rings), mat, loc, rot)


def tube(points, r, mat, minor=8, closed=False, loc=(0, 0, 0), rot=(0, 0, 0), caps=True, scale=None):
    if (r[0] if isinstance(r, (list, tuple)) else r) < .08:
        minor = min(minor, 6)
    return _obj_from_bm(bm_tube(points, r, minor, closed, caps), mat, loc, rot, scale=scale)


def lathe(profile, mat, loc=(0, 0, 0), rot=(0, 0, 0), n=28, smooth=0, closed=False, flute=None):
    return _obj_from_bm(bm_lathe(profile, n, smooth, closed, flute), mat, loc, rot)


def prism(pts, h, plane, mat, loc=(0, 0, 0), rot=(0, 0, 0), bevel=0.0, seg=3):
    return _obj_from_bm(bm_prism(pts, h, plane), mat, loc, rot, bevel, seg, ang=20)


def heart(w, thick, loc, mat, rot=(0, 0, 0), bevel=None, seg=3):
    return prism(heart_pts(w, 34 if w > .6 else 20), thick, "xz", mat, loc, rot, bevel if bevel is not None else thick * .42,
                 seg if w > .6 else 2)


def bow(size, loc, mat, knot=None, tail=True):
    s = size
    x, y, z = loc
    P = []
    for sx in (-1, 1):
        P.append(sph((.95 * s, .3 * s, .55 * s), (x + sx * .5 * s, y, z), mat, rot=(0, -sx * .38, 0), n=14, rings=8))
        if tail:
            P.append(sph((.3 * s, .22 * s, .75 * s), (x + sx * .17 * s, y - .02 * s, z - .55 * s), mat,
                         rot=(0, -sx * .35, 0), n=10, rings=6))
    P.append(sph((.36 * s, .34 * s, .36 * s), (x, y - .03 * s, z), knot or mat, n=12, rings=7))
    return P


def bool_cut(ob, cutter):
    md = ob.modifiers.new("bool", "BOOLEAN")
    md.operation = "DIFFERENCE"
    md.object = cutter
    md.solver = "EXACT"
    _apply_eval(ob, md)
    bpy.data.objects.remove(cutter)


def frame_rect(w, h, t, loc, mat, y=None):
    cx, cy, cz = loc
    P = []
    for sx in (-1, 1):
        P.append(box((t, t, h), (cx + sx * w / 2, cy, cz), mat, bevel=t * .45, seg=3))
        P.append(box((w, t, t), (cx, cy, cz + sx * h / 2), mat, bevel=t * .45, seg=3))
        for sz in (-1, 1):
            P.append(sph(t * 1.7, (cx + sx * w / 2, cy - t * .1, cz + sz * h / 2), "base", n=10, rings=6))
    return P


# orcamento de triangulos por peca (o jogo carrega o kit inteiro e funde por celula); acima disso aplica Decimate
BUDGET = {"wall_door": 3000, "wall_window": 1900, "wall_plain": 1900, "bench_tufted": 1700, "arch_gate": 2600, "fountain_center": 6500,
          "lamp_post": 950, "planter_round": 1100, "hedge_heart": 1100, "fence_segment": 700, "awning_striped": 1000,
          "balcony_curved": 1100, "house_shell": 1100, "house_shell_wide": 1700, "roof_pitched": 900, "gazebo": 3200,
          "bridge_small": 2200, "column_rococo": 1200, "cornice_scallop": 1000, "roof_dome_small": 1500, "wall_corner": 1200,
          "facade_win": 620, "facade_door": 680, "balloon_heart": 700, "sign_frame": 2000}


def decimate_to(ob, target):
    for _ in range(3):
        n = tri_count(ob)
        if n <= target * 1.06:
            return
        md = ob.modifiers.new("dec", "DECIMATE")
        md.decimate_type = "COLLAPSE"
        md.ratio = max(0.1, target / n)
        md.use_collapse_triangulate = True
        bpy.context.view_layer.objects.active = ob
        try:
            bpy.ops.object.modifier_apply(modifier=md.name)
        except Exception as e:
            print("dec fail", e)
            ob.modifiers.remove(md)
            return


def finish(name, parts):
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    ob.data.name = name
    if name in BUDGET:
        decimate_to(ob, BUDGET[name])
    bpy.ops.object.shade_smooth_by_angle(angle=radians(50))
    md = ob.modifiers.new("wn", "WEIGHTED_NORMAL")
    md.keep_sharp = True
    md.weight = 50
    try:
        bpy.ops.object.modifier_apply(modifier=md.name)
    except Exception as e:
        print("wn fail", e)
        ob.modifiers.remove(md)
    ob.select_set(False)
    return ob


def tri_count(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)


# ----------------------------------------------------------------------------------------------------
# PECAS - arquitetura
# ----------------------------------------------------------------------------------------------------
def wall_shell(cuts=(), gap=None):
    P = []
    body = box((4, .4, 4), (0, .2, 2), "base", bevel=.04, seg=2)
    for c in cuts:
        bool_cut(body, c)
    P.append(body)
    if gap:
        w = 2 - gap
        for sg in (-1, 1):
            P.append(box((w, .5, .4), (sg * (gap + w / 2), .15, .2), "accent", bevel=.07, seg=3))
    else:
        P.append(box((4, .5, .4), (0, .15, .2), "accent", bevel=.07, seg=3))
    P.append(box((4, .6, .35), (0, -.05, 3.825), "white", bevel=.07, seg=3))
    P.append(cyl(.045, 4, (0, -.02, 3.62), "trim", rot=(0, pi / 2, 0), n=10))
    P.append(cyl(.045, 4, (0, -.07, .42), "trim", rot=(0, pi / 2, 0), n=10))
    return P


def piece_wall_plain():
    P = wall_shell()
    P.append(box((3.0, .1, 2.7), (0, -.02, 2.0), "accent", bevel=.045, seg=3))
    P += frame_rect(2.6, 2.3, .05, (0, -.08, 2.0), "trim")
    P.append(heart(.95, .12, (0, -.1, 2.0), "trim", bevel=.04))
    P.append(heart(.74, .14, (0, -.13, 2.0), "accent2", bevel=.05))
    return P


def window_parts(base_z=0.85, spring=1.9, R=.7, y_glass=.2, ring=True):
    P = []
    h = spring - base_z
    P.append(box((2 * R, .04, h), (0, y_glass, base_z + h / 2), "glass"))
    P.append(cyl(R, .04, (0, y_glass, spring), "glass", rot=(pi / 2, 0, 0), n=24))
    P.append(box((2 * R + .2, .03, h + R + .2), (0, y_glass + .06, base_z + (h + R + .2) / 2 - .1), "soft"))
    # moldura dourada
    P.append(tube(arc3(0, spring, R, R, 0, pi, 16, y=-.02), .055, "trim", minor=8))
    for sg in (-1, 1):
        P.append(box((.11, .11, h), (sg * R, -.02, base_z + h / 2), "trim", bevel=.04, seg=2))
    P.append(box((2 * R + .1, .11, .1), (0, -.02, base_z), "trim", bevel=.04, seg=2))
    # travessas
    P.append(box((.05, .06, h + R), (0, .18, base_z + (h + R) / 2), "trim", bevel=.02))
    P.append(box((2 * R, .06, .05), (0, .18, base_z + h * .55), "trim", bevel=.02))
    # aro rosa grosso
    P.append(tube(arc3(0, spring, R + .17, R + .17, 0, pi, 20, y=-.05), .1, "accent", minor=10))
    for sg in (-1, 1):
        P.append(cyl(.1, h + .12, (sg * (R + .17), -.05, base_z + (h - .12) / 2 + .06 - .0), "accent", n=12))
    # peitoril dourado com perolas
    P.append(box((2 * R + .55, .38, .12), (0, -.17, base_z - .08), "trim", bevel=.05, seg=3))
    for i in range(5):
        P.append(sph(.075, (-R + 2 * R * i / 4, -.37, base_z - .08), "base", n=10, rings=6))
    # coracao no topo
    P.append(heart(.34, .1, (0, -.12, spring + R + .27), "accent2", bevel=.035))
    return P


def piece_wall_window():
    cut1 = box((1.4, 1.0, 1.05), (0, .2, .85 + 1.05 / 2), None)
    cut2 = cyl(.7, 1.0, (0, .2, 1.9), None, rot=(pi / 2, 0, 0), n=24)
    P = wall_shell([cut1, cut2])
    P += window_parts()
    for sg in (-1, 1):
        P.append(box((.5, .1, 2.2), (sg * 1.62, -.02, 1.9), "soft", bevel=.045, seg=3))
        P.append(sph(.1, (sg * 1.62, -.1, 3.1), "base", n=10, rings=6))
    return P


def piece_wall_door():
    cut1 = box((2.0, 1.0, 1.6), (0, .2, .8), None)
    cut2 = cyl(1.0, 1.0, (0, .2, 1.6), None, rot=(pi / 2, 0, 0), n=28)
    P = wall_shell([cut1, cut2], gap=1.15)
    # folhas
    P.append(box((1.94, .1, 1.6), (0, .2, .8), "accent2", bevel=.02))
    P.append(cyl(.97, .1, (0, .2, 1.6), "accent2", rot=(pi / 2, 0, 0), n=28, bevel=.0))
    P.append(box((.05, .14, 2.45), (0, .17, 1.25), "trim", bevel=.02))
    for sg in (-1, 1):
        P.append(box((.62, .06, .85), (sg * .5, .13, .6), "accent", bevel=.035, seg=3))
        P += frame_rect(.62, .85, .03, (sg * .5, .095, .6), "trim")
        P.append(sph(.075, (sg * .13, .08, 1.15), "trim", n=10, rings=6))
    P.append(heart(.9, .09, (0, .08, 2.0), "trim", bevel=.035))
    P.append(heart(.7, .1, (0, .05, 2.0), "glass", bevel=.02))
    # moldura da porta
    P.append(tube(arc3(0, 1.6, 1.0, 1.0, 0, pi, 20, y=-.03), .07, "trim", minor=8))
    for sg in (-1, 1):
        P.append(box((.14, .14, 1.6), (sg * 1.0, -.03, .8), "trim", bevel=.05, seg=2))
    P.append(tube(arc3(0, 1.6, 1.2, 1.2, 0, pi, 24, y=-.06), .12, "accent", minor=10))
    for sg in (-1, 1):
        P.append(cyl(.12, 1.6, (sg * 1.2, -.06, .8), "accent", n=12))
        P.append(sph(.13, (sg * 1.2, -.1, 1.6 + 0.0), "base", n=10, rings=6))
    P.append(heart(.4, .12, (0, -.1, 2.95), "accent2", bevel=.045))
    # degraus
    P.append(box((2.8, .55, .1), (0, -.28, .05), "white", bevel=.045, seg=3))
    P.append(box((2.3, .4, .1), (0, -.62, .05), "accent", bevel=.045, seg=3))
    return P


def piece_wall_corner():
    P = []
    P.append(lathe([(0, 0), (.66, 0), (.66, .38), (.6, .42), (.6, 3.6), (.66, 3.66), (.66, 4.0), (0, 4.0)],
                   "base", loc=(0, .2, 0), n=28))
    P.append(lathe([(0, 0), (.7, 0), (.72, .05), (.72, .35), (.66, .42), (0, .42)], "accent", loc=(0, .2, 0), n=28,
                   smooth=1))
    P.append(lathe([(0, 3.62), (.62, 3.62), (.72, 3.66), (.74, 3.8), (.68, 4.0), (0, 4.0)], "white", loc=(0, .2, 0),
                   n=28, smooth=1))
    for z in (.5, 3.55):
        P.append(tube([Vector((.62 * cos(a), .2 + .62 * sin(a), z)) for a in [2 * pi * i / 28 for i in range(28)]], .05,
                      "trim", minor=8, closed=True))
    # pilastras de painel rosa e perolas
    for i in range(7):
        P.append(sph(.09, (.0, .2 - .61, .85 + i * .38), "base", n=10, rings=6))
    P.append(heart(.45, .1, (0, .2 - .64, 2.05), "accent2", bevel=.04))
    return P


def piece_column_rococo():
    P = []
    P.append(lathe([(0, 0), (.62, 0), (.64, .06), (.62, .16), (.46, .24), (.4, .3), (0, .3)], "accent", n=28, smooth=1))
    # fuste canelado
    r0, a, nn, segs = .33, .028, 14, 84
    bm = bmesh.new()
    z0, z1 = .3, 3.05
    top, bot = [], []
    for i in range(segs):
        t = 2 * pi * i / segs
        r = r0 + a * cos(nn * t)
        bot.append(bm.verts.new((r * cos(t), r * sin(t), z0)))
        top.append(bm.verts.new((r * cos(t), r * sin(t), z1)))
    for i in range(segs):
        j = (i + 1) % segs
        bm.faces.new((bot[i], bot[j], top[j], top[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    P.append(_obj_from_bm(bm, "base", (0, 0, 0), (0, 0, 0)))
    P.append(cyl(.31, 2.8, (0, 0, 1.7), "base", n=28))
    for z in (.33, 3.03):
        P.append(tube([Vector((.34 * cos(t), .34 * sin(t), z)) for t in [2 * pi * i / 28 for i in range(28)]], .05, "trim",
                      minor=8, closed=True))
    P.append(lathe([(0, 3.05), (.34, 3.05), (.42, 3.12), (.38, 3.2), (.52, 3.32), (.58, 3.42), (0, 3.42)], "trim", n=28, smooth=1))
    for sx in (-1, 1):
        P.append(tube(spiral3(sx * .52, 3.2, .17, .05, 0 if sx > 0 else pi, 1.1, 20, ccw=(sx > 0)), .035, "trim", minor=6))
    for sy in (-1, 1):
        P.append(sph(.13, (0, sy * .5, 3.22), "trim", n=10, rings=6))
    P.append(box((1.16, 1.16, .14), (0, 0, 3.43), "white", bevel=.05, seg=3))
    P.append(sph(.12, (0, -.56, 3.43), "base", n=10, rings=6))
    return P


def piece_arch_gate():
    P = []
    for sg in (-1, 1):
        x = sg * 1.75
        P.append(box((.75, .7, 3.0), (x, 0, 1.5), "base", bevel=.12, seg=3))
        P.append(box((.88, .84, .35), (x, 0, .18), "accent", bevel=.08, seg=3))
        P.append(box((.88, .84, .3), (x, 0, 3.0), "trim", bevel=.08, seg=3))
        P.append(box((.4, .06, 2.1), (x, -.35, 1.55), "accent", bevel=.03, seg=3))
        P.append(heart(.3, .1, (x, -.38, 1.55), "accent2", bevel=.04))
        P.append(sph(.2, (x, 0, 3.3), "base", n=12, rings=8))
    R = 1.75
    P.append(tube(arc3(0, 3.15, R, R, 0, pi, 28), .3, "white", minor=12, scale=(1, 1.1, 1)))
    P.append(tube(arc3(0, 3.15, R, R, 0, pi, 28, y=-.3), .1, "trim", minor=8))
    P.append(tube(arc3(0, 3.15, R - .3, R - .3, 0, pi, 24, y=-.18), .07, "accent", minor=8))
    for i in range(1, 8):
        a = pi * i / 8
        if i == 4:
            continue
        P.append(sph(.11, (R * cos(a), -.3, 3.15 + R * sin(a)), "base", n=10, rings=6))
    P.append(heart(.8, .3, (0, -.28, 3.15 + R + .05), "accent2", bevel=.1))
    P += bow(.35, (0, -.45, 3.15 + R + .02), "trim")
    P.append(sph(.14, (0, 0, 3.15 + R + .55), "trim", n=10, rings=6))
    return P


def piece_cornice_scallop():
    P = []
    P.append(box((4, .55, .34), (0, -.275, .62), "white", bevel=.07, seg=3))
    P.append(box((4, .72, .18), (0, -.34, .86), "accent", bevel=.07, seg=3))
    P.append(box((4, .45, .14), (0, -.225, .44), "base", bevel=.05, seg=3))
    P.append(cyl(.045, 4, (0, -.5, .45), "trim", rot=(0, pi / 2, 0), n=10))
    P.append(cyl(.045, 4, (0, -.7, .86), "trim", rot=(0, pi / 2, 0), n=10))
    n = 8
    w = 4.0 / n
    for i in range(n):
        x = -2 + w * (i + .5)
        pts = ellipse_pts(w / 2 - .01, .3, 14, pi, 2 * pi)
        P.append(prism(pts, .08, "xz", "accent2" if i % 2 else "accent", loc=(x, -.4, .5), bevel=.025, seg=2))
        P.append(sph(.07, (x, -.46, .22), "trim", n=8, rings=5))
    return P


def piece_roof_dome_small():
    P = []
    P.append(lathe([(0, 0), (1.55, 0), (1.62, .06), (1.6, .2), (1.45, .26), (1.4, .6), (0, .6)], "accent", n=32, smooth=1))
    P.append(tube([Vector((1.5 * cos(t), 1.5 * sin(t), .62)) for t in [2 * pi * i / 32 for i in range(32)]], .06, "trim",
                  minor=8, closed=True))
    prof = [(1.36 * cos(a), .6 + 1.25 * sin(a)) for a in [pi / 2 * i / 10 for i in range(11)]][::-1]
    P.append(lathe([(0, .6)] + prof, "base", n=32))
    for k in range(6):
        t = pi * k / 6
        P.append(tube(arc3(0, .6, 1.4, 1.29, 0, pi, 14), .045, "trim", minor=6, rot=(0, 0, t)))
    P.append(tube([Vector((1.2 * cos(t), 1.2 * sin(t), .98)) for t in [2 * pi * i / 28 for i in range(28)]], .04, "trim",
                  minor=6, closed=True))
    P.append(lathe([(0, 1.82), (.2, 1.82), (.17, 1.9), (0, 1.9)], "trim", n=14))
    P.append(sph(.2, (0, 0, 2.0), "base", n=14, rings=8))
    P.append(lathe([(0, 2.1), (.1, 2.1), (.05, 2.5), (0, 2.65)], "trim", n=10))
    P.append(sph(.1, (0, 0, 2.2), "trim", n=10, rings=6))
    return P


def piece_awning_striped():
    P = []
    nP, w, depth = 6, .6, 1.2
    L = math.hypot(depth, .4)
    ang = math.atan2(.4, depth)
    for i in range(nP):
        x = -1.8 + w * (i + .5)
        m = "accent2" if i % 2 == 0 else "base"
        P.append(box((w - .006, L, .05), (x, -depth / 2, .65), m, rot=(ang, 0, 0), bevel=.02, seg=2))
        P.append(box((w - .006, .06, .15), (x, -depth - .0, .375), m, bevel=.02, seg=2))
        pts = ellipse_pts(w / 2 - .003, .3, 12, pi, 2 * pi)
        P.append(prism(pts, .06, "xz", m, loc=(x, -depth, .3), bevel=.02, seg=2))
        P.append(sph(.045, (x, -depth - .04, .02), "trim", n=8, rings=5))
    for sg in (-1, 1):
        P.append(box((.06, depth, .06), (sg * 1.82, -depth / 2, .6), "trim", rot=(ang, 0, 0), bevel=.025))
        P.append(sph(.08, (sg * 1.82, -depth, .44), "trim", n=8, rings=5))
    P.append(tube([Vector((-1.8, -depth - .03, .46)), Vector((1.8, -depth - .03, .46))], .03, "trim", minor=6))
    return P


def piece_balcony_curved():
    P = []
    rx, ry = 1.5, 1.05
    pts = [(rx * cos(a), -ry * sin(a)) for a in [pi * i / 20 for i in range(21)]]
    P.append(prism(pts, .2, "xy", "base", loc=(0, 0, -.1 + .1), bevel=.05, seg=3))
    P.append(prism([(x * 1.06, y * 1.08) for x, y in pts], .06, "xy", "accent", loc=(0, 0, .0), bevel=.025, seg=2))
    # corbel / barriga
    P.append(sph((1.4, 1.0, .5), (0, -.25, -.1), "accent", n=16, rings=8))
    P.append(tube([Vector((rx * .94 * cos(a), -ry * .9 * sin(a), 1.0)) for a in [pi * i / 24 for i in range(25)]], .05, "trim",
                  minor=8))
    P.append(tube([Vector((rx * .94 * cos(a), -ry * .9 * sin(a), .12)) for a in [pi * i / 24 for i in range(25)]], .035, "trim",
                  minor=6))
    for i in range(11):
        a = pi * i / 10
        x, y = rx * .94 * cos(a), -ry * .9 * sin(a)
        P.append(cyl(.035, .88, (x, y, .56), "base", n=8))
        if i % 2 == 0:
            P.append(sph(.075, (x, y, 1.05), "trim", n=10, rings=6))
    P.append(heart(.3, .1, (0, -ry * .9 - .02, .56), "accent2", bevel=.04))
    for sg in (-1, 1):
        P.append(tube(spiral3(sg * .75, -.3, .22, .05, pi if sg > 0 else 0, 1.1, 20, y=-.0, ccw=(sg > 0)), .035, "trim", minor=6))
    return P


def piece_sign_frame():
    P = []
    P.append(prism(ellipse_pts(1.0, .6, 40), .08, "xz", "base", loc=(0, .0, 0), bevel=.03, seg=3))
    ring = [Vector((1.05 * cos(a), -.04, .65 * sin(a))) for a in [2 * pi * i / 44 for i in range(44)]]
    P.append(tube(ring, .075, "trim", minor=10, closed=True))
    ring2 = [Vector((1.2 * cos(a), -.03, .78 * sin(a))) for a in [2 * pi * i / 44 for i in range(44)]]
    P.append(tube(ring2, .05, "accent", minor=8, closed=True))
    for i in range(20):
        a = 2 * pi * i / 20
        P.append(sph(.05, (1.12 * cos(a), -.06, .72 * sin(a)), "base", n=8, rings=5))
    P.append(heart(.5, .13, (0, -.06, .86), "accent2", bevel=.05))
    P += bow(.28, (0, -.1, -.78), "trim", tail=False)
    for sg in (-1, 1):
        P.append(tube(spiral3(sg * 1.45, .18, .22, .05, pi if sg > 0 else 0, 1.2, 22, y=-.04, ccw=(sg > 0)), .04, "trim", minor=6))
        P.append(tube(spiral3(sg * 1.45, -.18, .22, .05, pi if sg > 0 else 0, 1.2, 22, y=-.04, ccw=(sg < 0)), .04, "trim", minor=6))
    return P


# ----------------------------------------------------------------------------------------------------
# PECAS - mobiliario urbano
# ----------------------------------------------------------------------------------------------------
def piece_lamp_post():
    P = []
    P.append(lathe([(0, 0), (.42, 0), (.44, .06), (.4, .2), (.28, .35), (.2, .6), (.14, .9), (0, .9)], "accent", n=24, smooth=1))
    P.append(lathe([(0, .55), (.26, .55), (.3, .6), (.22, .68), (0, .68)], "trim", n=20, smooth=1))
    P.append(cyl(.055, 3.4, (0, 0, 2.3), "trim", n=12))
    for z, r in ((1.3, .09), (2.2, .08), (3.0, .09)):
        P.append(sph((r * 2, r * 2, r * 1.2), (0, 0, z), "trim", n=12, rings=6))
    for sg in (-1, 1):
        P.append(tube(spiral3(sg * .5, 2.45, .5, .1, pi if sg > 0 else 0, 1.25, 28, ccw=(sg > 0)), .04, "trim", minor=6))
        # globo pequeno na ponta do cacho
        a_end = (pi if sg > 0 else 0) + (1 if sg > 0 else -1) * 1.25 * 2 * pi
        P.append(sph(.17, (sg * .5 + .1 * cos(a_end), 0, 2.45 + .1 * sin(a_end) + .18), "glow", n=12, rings=8))
    P.append(lathe([(0, 3.5), (.2, 3.5), (.24, 3.55), (.14, 3.65), (0, 3.65)], "trim", n=16, smooth=1))
    P.append(sph(.34, (0, 0, 3.98), "glow", n=18, rings=12))
    P.append(lathe([(0, 4.28), (.22, 4.28), (.2, 4.36), (.08, 4.5), (0, 4.5)], "trim", n=16, smooth=1))
    P.append(sph(.1, (0, 0, 4.58), "base", n=12, rings=8))
    return P


def piece_bench_tufted():
    P = []
    cols, rows = 5, 2
    pw, pd = .36, .27
    for i in range(cols):
        for j in range(rows):
            x = (i - (cols - 1) / 2) * pw
            y = (j - (rows - 1) / 2) * (pd + .01) + .02
            P.append(box((pw - .01, pd, .17), (x, y, .43), "seat", bevel=.06, seg=3))
            P.append(sph(.028, (x, y - .0, .52), "trim", n=8, rings=5))
    for i in range(cols):
        for j in range(3):
            x = (i - (cols - 1) / 2) * pw
            z = .66 + j * .22
            P.append(box((pw - .01, .13, .21), (x, .3 - .0 + j * .0, z), "seat", rot=(-.12, 0, 0), bevel=.05, seg=3))
            P.append(sph(.026, (x, .22 - .003 * j, z), "trim", n=8, rings=5))
    P.append(box((1.86, .58, .06), (0, .02, .31), "trim", bevel=.025))
    for sg in (-1, 1):
        P.append(cyl(.17, .64, (sg * .96, .02, .55), "seat", rot=(pi / 2, 0, 0), n=16, bevel=.0))
        P.append(sph((.28, .1, .28), (sg * .96, -.3, .55), "base", n=12, rings=6))
        P.append(sph(.04, (sg * .96, -.36, .55), "trim", n=8, rings=5))
        for sy in (-1, 1):
            leg = [Vector((0, 0, .31)), Vector((0, 0, .24)), Vector((0, 0, .17)), Vector((.0, 0, .1))]
            leg = [Vector((sg * (.96 + .0), 0, .0)) + Vector(p) for p in [(0, 0, .3), (0, 0, .22), (sg * .02, 0, .14), (sg * .08, 0, .07),
                                                                          (sg * .15, 0, .03), (sg * .2, 0, .07), (sg * .17, 0, .1), (sg * .14, 0, .07)]]
            P.append(tube(leg, .028, "trim", minor=6, loc=(0, sy * .24 + .02, 0)))
    P.append(tube([Vector((x, .33, 1.03)) for x in [(-.93 + 1.86 * i / 16) for i in range(17)]], .03, "trim", minor=6))
    P.append(heart(.34, .1, (0, .3, 1.05), "trim", rot=(-.12, 0, 0), bevel=.035))
    P.append(heart(.24, .1, (0, .28, 1.05), "accent2", rot=(-.12, 0, 0), bevel=.035))
    return P


def flowers_on(center, R, n, rnd, zmin=0.0, sz=(.07, .11)):
    P = []
    mats = ["accent2", "accent", "soft", "base", "accent2"]
    for i in range(n):
        th = rnd.uniform(0, 2 * pi)
        ph = rnd.uniform(0.0, pi / 2 - .15)
        r = rnd.uniform(*sz)
        P.append(sph(r * 2, (center[0] + R * sin(ph) * cos(th), center[1] + R * sin(ph) * sin(th), center[2] + R * cos(ph)),
                     mats[i % len(mats)], n=8, rings=5))
    return P


def piece_planter_round():
    P = []
    prof = [(0, 0), (.3, 0), (.34, .05), (.26, .13), (.2, .22), (.22, .34), (.4, .5), (.55, .68), (.6, .84), (.54, .88), (.44, .8)]
    P.append(lathe(prof + [(0, .8)], "white", n=28, smooth=1))
    P.append(tube([Vector((.58 * cos(t), .58 * sin(t), .86)) for t in [2 * pi * i / 28 for i in range(28)]], .045, "trim", minor=8,
                  closed=True))
    P.append(tube([Vector((.4 * cos(t), .4 * sin(t), .48)) for t in [2 * pi * i / 28 for i in range(28)]], .05, "accent2",
                  minor=8, closed=True))
    P.append(sph((1.0, 1.0, .7), (0, 0, .8), "leaf", n=18, rings=8))
    P += flowers_on((0, 0, .85), .43, 16, random.Random(7))
    P += flowers_on((0, 0, 1.0), .12, 4, random.Random(8), sz=(.09, .12))
    P.append(heart(.26, .08, (0, -.47, .6), "trim", rot=(.0, 0, 0), bevel=.03))
    return P


def piece_hedge_heart():
    P = []
    P.append(lathe([(0, 0), (.4, 0), (.43, .04), (.36, .14), (.36, .42), (.42, .46), (.4, .5), (0, .5)], "accent", n=22, smooth=1))
    P.append(tube([Vector((.4 * cos(t), .4 * sin(t), .47)) for t in [2 * pi * i / 22 for i in range(22)]], .04, "trim", minor=6, closed=True))
    P.append(cyl(.06, .3, (0, 0, .62), "trim", n=8))
    w = 1.25
    cz = .55 + .68
    P.append(heart(w, .62, (0, 0, cz), "leaf", bevel=.2, seg=3))
    rnd = random.Random(3)
    hp = heart_pts(w * .86)
    got = 0
    tries = 0
    def inside(px, pz):
        c = False
        n = len(hp)
        for i in range(n):
            x1, z1 = hp[i]
            x2, z2 = hp[(i + 1) % n]
            if (z1 > pz) != (z2 > pz) and px < (x2 - x1) * (pz - z1) / (z2 - z1) + x1:
                c = not c
        return c
    mats = ["accent2", "accent", "soft", "accent2"]
    while got < 16 and tries < 500:
        tries += 1
        px, pz = rnd.uniform(-.6, .6), rnd.uniform(-.6, .55)
        if inside(px, pz):
            P.append(sph(.17, (px, -.3, cz + pz), mats[got % 4], n=8, rings=5))
            P.append(sph(.05, (px, -.41, cz + pz), "trim", n=6, rings=4))
            got += 1
    P += bow(.3, (0, -.31, .98), "deep", knot="trim")
    return P


def piece_fence_segment():
    P = []
    for sg in (-1, 1):
        P.append(lathe([(0, 0), (.1, 0), (.11, .05), (.07, .12), (.06, .85), (.09, .9), (0, .9)], "base", loc=(sg * .95, 0, 0), n=14, smooth=1))
        P.append(sph(.12, (sg * .95, 0, 1.0), "trim", n=12, rings=8))
    P.append(box((1.9, .05, .07), (0, 0, .16), "trim", bevel=.025))
    for i in range(7):
        x = -.72 + i * .24
        P.append(lathe([(0, .0), (.035, 0), (.04, .1), (.035, .8), (0, .86)], "base", loc=(x, 0, .0), n=8))
        P.append(sph(.045, (x, 0, .86), "trim", n=8, rings=5))
    pts = []
    n = 4
    w = 1.9 / n
    for k in range(n):
        pts += arc3(-.95 + w * (k + .5), .86, w / 2, .22, pi, 2 * pi, 8)[:-1] if k < n - 1 else arc3(-.95 + w * (k + .5), .86, w / 2, .22, pi, 2 * pi, 8)
    P.append(tube(pts, .025, "trim", minor=6))
    for k in range(n):
        P.append(heart(.16, .05, (-.95 + w * (k + .5), 0, .86 - .22 - .06), "accent2", bevel=.02, seg=2))
    return P


def piece_balloon_heart():
    P = []
    ang = .12
    P.append(heart(.95, .5, (0, 0, 2.5), "accent2", rot=(0, ang, 0), bevel=.2, seg=3))
    P.append(sph(.1, (.0, 0, 2.02), "accent2", n=8, rings=5))
    wob = [Vector((.06 * sin(i * .9), .05 * cos(i * 1.1), 2.0 * (1 - i / 14))) for i in range(15)]
    P.append(tube(wob, .008, "white", minor=4))
    P += bow(.14, (0, -.0, 2.0), "trim", tail=True)
    P.append(sph(.05, (wob[-1].x, wob[-1].y, .02), "trim", n=8, rings=5))
    return P


def scallop_ring(R, z, lobes, amp, n=96):
    return [Vector((R * (1 + amp * cos(lobes * 2 * pi * i / n)) * cos(2 * pi * i / n),
                    R * (1 + amp * cos(lobes * 2 * pi * i / n)) * sin(2 * pi * i / n), z)) for i in range(n)]


def shell_basin(P, R, z0, h, lobes, amp, mat="white", lining="accent", pool=0.8, n=32):
    """bacia em forma de concha: parede canelada, borda recortada com fio de metal e perolas, piscina refletiva."""
    prof = [(0, z0), (R * .3, z0), (R * .62, z0 + h * .3), (R * .92, z0 + h * .68), (R * 1.0, z0 + h * .92), (R * 1.0, z0 + h),
            (R * .93, z0 + h), (R * .87, z0 + h * .8), (R * .66, z0 + h * .52), (0, z0 + h * .42)]
    P.append(lathe(prof, mat, n=n, smooth=1, flute=(lobes, amp)))
    P.append(tube(scallop_ring(R * .97, z0 + h, lobes, amp, n * 2), .05, "trim", minor=6, closed=True))
    for k in range(lobes):
        a = 2 * pi * k / lobes
        P.append(sph(.085, (R * .99 * (1 + amp) * cos(a), R * .99 * (1 + amp) * sin(a), z0 + h + .02), "white", n=8, rings=5))
    wz = z0 + h * .78
    P.append(lathe([(0, wz), (R * pool, wz), (R * pool + .03, wz - .03), (0, wz - .03)], "water", n=n))
    return wz


def piece_fountain_center():
    P = []
    P.append(lathe([(0, 0), (2.3, 0), (2.45, .06), (2.5, .2), (2.2, .3)], "accent", n=40, smooth=1))
    wz1 = shell_basin(P, 2.55, .15, .78, 10, .06, pool=.9, n=40)
    P.append(lathe([(0, .5), (.75, .5), (.7, .62), (.5, .8), (.4, 1.0), (.5, 1.1), (.4, 1.2), (.38, 1.5), (.5, 1.62), (.6, 1.68), (0, 1.7)],
                   "white", n=32, smooth=1))
    for z, r in ((.95, .46), (1.28, .42)):
        P.append(tube([Vector((r * cos(t), r * sin(t), z)) for t in [2 * pi * i / 28 for i in range(28)]], .05, "trim", minor=6, closed=True))
    for k in range(4):
        P.append(tube(spiral3(.62, .85, .22, .05, pi, 1.05, 12, ccw=True), .045, "trim", minor=5, rot=(0, 0, 2 * pi * k / 4)))
    wz2 = shell_basin(P, 1.6, 1.65, .6, 8, .07, mat="accent", lining="white", pool=.85, n=28)
    P.append(lathe([(0, 1.9), (.55, 1.9), (.4, 2.1), (.3, 2.4), (.38, 2.52), (.5, 2.6), (0, 2.62)], "white", n=28, smooth=1))
    P.append(tube([Vector((.33 * cos(t), .33 * sin(t), 2.22)) for t in [2 * pi * i / 24 for i in range(24)]], .045, "trim", minor=6, closed=True))
    for k in range(3):
        P.append(tube(spiral3(.42, 2.2, .2, .05, pi, 1.0, 10, ccw=True), .04, "trim", minor=5, rot=(0, 0, 2 * pi * k / 3 + pi / 4)))
    wz3 = shell_basin(P, .95, 2.55, .45, 6, .08, mat="white", lining="accent", pool=.8, n=20)
    # cisne central
    sz = wz3 + .08
    P.append(sph((.95, .5, .42), (0, 0, sz + .12), "white", n=14, rings=8))
    for sy in (-1, 1):
        P.append(sph((.7, .22, .36), (-.12, sy * .26, sz + .26), "white", rot=(sy * .35, -.12, sy * .12), n=12, rings=7))
    P.append(sph((.4, .22, .3), (-.52, 0, sz + .34), "white", rot=(0, -.5, 0), n=10, rings=6))
    neck = [Vector(p) for p in [(.32, 0, sz + .18), (.5, 0, sz + .38), (.52, 0, sz + .62), (.38, 0, sz + .82), (.3, 0, sz + .98),
                                (.4, 0, sz + 1.08), (.52, 0, sz + 1.04)]]
    P.append(tube(neck, [.11, .1, .085, .07, .06, .055, .05], "white", minor=8))
    P.append(sph(.15, (.55, 0, sz + 1.03), "white", n=10, rings=6))
    P.append(lathe([(0, 0), (.04, 0), (.035, .13), (0, .2)], "trim", loc=(.63, 0, sz + 1.03), rot=(0, pi / 2, 0), n=8))
    P.append(sph(.06, (.62, 0, sz + 1.07), "deep", n=6, rings=4))
    P += bow(.34, (.34, 0, sz + .22), "accent2", knot="trim")
    P.append(heart(.3, .1, (.3, 0, sz + 1.3), "accent2", bevel=.04))

    def jets(n, r0, z0, r1, z1, rad, off=0.0, lift=.3):
        for k in range(n):
            a = off + 2 * pi * k / n
            pts = []
            for q in range(9):
                t = q / 8
                r = r0 + (r1 - r0) * (t ** .85)
                z = z0 + (z1 - z0) * (t ** 1.8) + lift * sin(pi * min(t * 1.35, 1)) * (1 - t)
                pts.append(Vector((r * cos(a), r * sin(a), z)))
            P.append(tube(pts, rad, "water", minor=6))
    jets(6, .9, wz3 + .35, 1.5, wz2, .04, 0.0, .28)
    jets(8, 1.55, wz2 + .35, 2.3, wz1, .05, .1, .3)
    jets(3, .1, sz + .3, .75, wz3, .04, .3, .35)
    # conchas-bica de metal na borda da bacia 1
    for k in range(4):
        a = pi / 4 + k * pi / 2
        P.append(lathe([(0, 0), (.1, 0), (.22, .14), (.28, .26), (.2, .28), (0, .18)], "trim",
                       loc=(2.62 * cos(a), 2.62 * sin(a), .6), n=16, flute=(5, .15)))
    # brilhos (estrelinhas)
    rnd = random.Random(11)
    for k in range(5):
        a = rnd.uniform(0, 2 * pi)
        r = rnd.uniform(.4, 2.6)
        z = rnd.uniform(1.0, 4.0)
        c = (r * cos(a), r * sin(a), z)
        L = rnd.uniform(.14, .24)
        P.append(sph((L, .02, .03), c, "glow", n=6, rings=3))
        P.append(sph((.03, .02, L), c, "glow", n=6, rings=3))
    return P


def piece_paving_tile():
    P = []
    P.append(box((2, 2, .05), (0, 0, .025), "trim", bevel=.012, seg=2))
    for i in range(4):
        for j in range(4):
            if (i in (1, 2)) and (j in (1, 2)):
                continue
            m = "base" if (i + j) % 2 == 0 else "accent"
            P.append(box((.46, .46, .06), (-.75 + .5 * i, -.75 + .5 * j, .03 + .01), m, bevel=.07, seg=3))
    P.append(cyl(.46, .08, (0, 0, .04), "white", n=24, bevel=.03))
    P.append(cyl(.34, .1, (0, 0, .045), "accent2", n=24, bevel=.03))
    P.append(heart(.5, .06, (0, 0, .1), "trim", rot=(pi / 2, 0, 0), bevel=.02, seg=2))
    return P


# ----------------------------------------------------------------------------------------------------
# PECAS - casas leves do Jardim, coreto e ponte do Parque
# (origem da casa/telhado = centro da planta no chao; modulos de fachada = plano frontal em y=0, frente -Y)
# ----------------------------------------------------------------------------------------------------
def arch_outline(w, h_rect, n=14):
    """contorno X/Z de janela/porta em arco: base em z=0, retangulo ate h_rect e meio-circulo em cima."""
    r = w / 2
    pts = [(-r, 0), (r, 0), (r, h_rect)]
    pts += [(r * cos(a), h_rect + r * sin(a)) for a in [pi * i / n for i in range(1, n)]]
    pts += [(-r, h_rect)]
    return pts


def lite_window(loc, rot, w=1.3, hr=1.1, glass="glass"):
    """janelinha em arco com moldura de metal (para as laterais/fundos), centrada em loc (base da janela)."""
    x, y, z = loc
    P = []
    P.append(prism(arch_outline(w + .26, hr, 10), .1, "xz", "trim", loc=(x, y, z - .08), rot=rot, bevel=.02, seg=2))
    P.append(prism(arch_outline(w, hr, 10), .16, "xz", glass, loc=(x, y, z), rot=rot))
    return P


def house_shell(w=8.0, d=8.0, h=8.0, side_wins=True):
    """corpo de casa de 2 andares (planta w x d, centrada), com soquinho, faixa do 2o andar e cornija com festao."""
    P = []
    P.append(box((w, d, h), (0, 0, h / 2), "base", bevel=.2, seg=2))
    P.append(box((w + .3, d + .3, .6), (0, 0, .3), "white", bevel=.1, seg=2))
    P.append(box((w + .24, d + .24, .3), (0, 0, 4.1), "white", bevel=.08, seg=2))
    P.append(box((w + .3, d + .3, .26), (0, 0, h - .72), "accent", bevel=.08, seg=2))
    P.append(box((w + .6, d + .6, .5), (0, 0, h - .25), "white", bevel=.12, seg=2))
    P.append(box((w + .66, d + .66, .07), (0, 0, h - .5), "trim", bevel=.03, seg=2))
    # pilastras de quina
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(cyl(.26, h - .7, (sx * (w / 2 + .02), sy * (d / 2 + .02), h / 2), "accent", n=10))
    # festao (conchinhas) da cornija
    for side in range(4):
        L = w if side < 2 else d
        cnt = int(round(L / 1.35))
        wd = L / cnt
        for i in range(cnt):
            u = -L / 2 + wd * (i + .5)
            pts = ellipse_pts(wd / 2 - .03, .3, 8, pi, 2 * pi)
            m = "accent2" if i % 2 else "accent"
            zz = h - .55
            if side < 2:
                sy = -1 if side == 0 else 1
                P.append(prism(pts, .07, "xz", m, loc=(u, sy * (d / 2 + .34), zz), bevel=.02, seg=1))
            else:
                sx = -1 if side == 2 else 1
                P.append(prism(pts, .07, "xz", m, loc=(sx * (w / 2 + .34), u, zz), rot=(0, 0, pi / 2), bevel=.02, seg=1))
    if side_wins:
        for sx in (-1, 1):
            for z0 in (.95, 5.0):
                P += lite_window((sx * (w / 2 + .02), 0, z0), (0, 0, pi / 2))
        for z0 in (.95, 5.0):
            for x in ((-w / 4, w / 4) if w > 9 else (0,)):
                P += lite_window((x, d / 2 + .02, z0), (0, 0, pi))
    return P


def piece_house_shell():
    return house_shell(8, 8, 8)


def piece_house_shell_wide():
    return house_shell(12, 12, 8)


def piece_facade_win():
    """modulo 4 x 4 de fachada leve: janela em arco com persianas, jardineira florida e coracao."""
    P = []
    P.append(box((3.5, .14, 3.5), (0, -.07, 2.0), "accent", bevel=.06, seg=2))
    P.append(prism(arch_outline(1.9, 1.0, 12), .08, "xz", "soft", loc=(0, -.17, .8)))
    P.append(prism(arch_outline(1.66, 1.0, 12), .08, "xz", "trim", loc=(0, -.2, .86)))
    P.append(prism(arch_outline(1.4, 1.0, 12), .1, "xz", "glass", loc=(0, -.22, .9)))
    P.append(box((.05, .06, 1.7), (0, -.3, 1.75), "trim", bevel=.02, seg=1))
    P.append(box((1.3, .05, .05), (0, -.3, 1.5), "trim", bevel=.02, seg=1))
    for sg in (-1, 1):
        P.append(box((.5, .1, 2.0), (sg * 1.35, -.2, 1.9), "accent2", bevel=.05, seg=2))
        P.append(box((.28, .06, 1.5), (sg * 1.35, -.27, 1.9), "soft", bevel=.03, seg=1))
    P.append(box((1.8, .38, .34), (0, -.4, .55), "accent2", bevel=.07, seg=2))
    fl = ["white", "soft", "accent", "white", "soft", "accent"]
    for i in range(6):
        P.append(sph(.13, (-.72 + i * .29, -.42 + (i % 2) * .05, .82), fl[i], n=8, rings=5))
    P.append(heart(.36, .1, (0, -.2, 3.32), "accent2", bevel=.04))
    return P


def piece_facade_door():
    """modulo 4 x 4 com porta em arco, degraus, lanternas e coracao."""
    P = []
    P.append(box((3.5, .14, 3.5), (0, -.07, 2.0), "accent", bevel=.06, seg=2))
    P.append(prism(arch_outline(2.15, 1.55, 14), .1, "xz", "trim", loc=(0, -.17, .35)))
    P.append(prism(arch_outline(1.85, 1.55, 14), .14, "xz", "accent2", loc=(0, -.2, .35)))
    P.append(prism(arch_outline(1.15, .7, 10), .16, "xz", "glass", loc=(0, -.24, 1.45), bevel=.0))
    P.append(box((.05, .1, 2.2), (0, -.3, 1.45), "trim", bevel=.02, seg=1))
    for sg in (-1, 1):
        P.append(sph(.08, (sg * .22, -.3, 1.05), "trim", n=8, rings=5))
        P.append(box((.6, .08, .9), (sg * .45, -.3, .95), "soft", bevel=.03, seg=1))
        # lanterna
        P.append(box((.06, .22, .06), (sg * 1.45, -.12, 2.35), "trim", bevel=.02, seg=1))
        P.append(sph(.15, (sg * 1.45, -.3, 2.2), "glow", n=10, rings=6))
    P.append(box((2.7, .75, .16), (0, -.5, .08), "white", bevel=.06, seg=2))
    P.append(box((2.2, .45, .16), (0, -.9, .08), "accent", bevel=.06, seg=2))
    P.append(heart(.42, .1, (0, -.2, 3.15), "accent2", bevel=.04))
    return P


def piece_roof_pitched():
    """telhado de 4 aguas com beiral festonado, cumeeira e chamine; origem no centro da planta, base em z=0."""
    P = []
    w = d = 9.3
    hh = 3.0
    top = 1.5
    bm = bmesh.new()
    b = [bm.verts.new(p) for p in ((-w / 2, -d / 2, 0), (w / 2, -d / 2, 0), (w / 2, d / 2, 0), (-w / 2, d / 2, 0))]
    t = [bm.verts.new(p) for p in ((-top, -top, hh), (top, -top, hh), (top, top, hh), (-top, top, hh))]
    for i in range(4):
        j = (i + 1) % 4
        bm.faces.new((b[i], b[j], t[j], t[i]))
    bm.faces.new(t[::-1])
    bm.faces.new(b)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    P.append(_obj_from_bm(bm, "accent2", (0, 0, 0), (0, 0, 0), bevel=.28, seg=3, ang=20))
    P.append(box((w + .15, d + .15, .3), (0, 0, .12), "white", bevel=.1, seg=2))
    # fio de metal na cumeeira e coroa
    P.append(box((top * 2 + .5, top * 2 + .5, .22), (0, 0, hh + .02), "trim", bevel=.08, seg=2))
    P.append(sph(.32, (0, 0, hh + .35), "white", n=12, rings=8))
    P.append(lathe([(0, 0), (.08, 0), (.04, .5), (0, .75)], "trim", loc=(0, 0, hh + .6), n=8))
    # festao
    for side in range(4):
        L = w
        cnt = 7
        wd = L / cnt
        for i in range(cnt):
            u = -L / 2 + wd * (i + .5)
            pts = ellipse_pts(wd / 2 - .03, .34, 8, pi, 2 * pi)
            m = "base" if i % 2 else "accent"
            if side < 2:
                sy = -1 if side == 0 else 1
                P.append(prism(pts, .08, "xz", m, loc=(u, sy * (d / 2 + .05), .3), bevel=.02, seg=1))
            else:
                sx = -1 if side == 2 else 1
                P.append(prism(pts, .08, "xz", m, loc=(sx * (w / 2 + .05), u, .3), rot=(0, 0, pi / 2), bevel=.02, seg=1))
    # chamine
    P.append(box((1.0, 1.0, 2.3), (2.5, 1.6, 1.6), "white", bevel=.1, seg=2))
    P.append(box((1.3, 1.3, .3), (2.5, 1.6, 2.85), "accent", bevel=.1, seg=2))
    P.append(box((.7, .7, .08), (2.5, 1.6, 3.04), "deep", bevel=.0, seg=1))
    return P


def piece_gazebo():
    """coreto: plataforma redonda de ~7 m, 6 colunas, festao e domo cebola com ponta dourada (origem no centro, no chao)."""
    P = []
    R = 2.7
    P.append(lathe([(0, 0), (3.85, 0), (3.85, .14), (0, .14)], "accent", n=30))
    P.append(lathe([(0, .14), (3.4, .14), (3.45, .2), (3.4, .38), (0, .38)], "white", n=30))
    P.append(tube([Vector((3.35 * cos(t), 3.35 * sin(t), .4)) for t in [2 * pi * i / 30 for i in range(30)]], .05, "trim", minor=6, closed=True))
    P.append(lathe([(0, .38), (3.0, .38), (3.0, .4), (0, .4)], "soft", n=30))
    angs = [-pi / 2 + pi / 6 + k * pi / 3 for k in range(6)]
    for a in angs:
        x, y = R * cos(a), R * sin(a)
        P.append(lathe([(0, .4), (.3, .4), (.3, .55), (.2, .62), (.17, .7), (.17, 3.1), (.24, 3.2), (.24, 3.5), (0, 3.5)], "white", loc=(x, y, 0), n=10))
        P.append(sph(.2, (x, y, .78), "trim", n=8, rings=5))
    P.append(tube([Vector((R * cos(t), R * sin(t), 3.55)) for t in [2 * pi * i / 30 for i in range(30)]], .16, "accent2", minor=8, closed=True))
    P.append(tube([Vector((R * cos(t), R * sin(t), 3.72)) for t in [2 * pi * i / 30 for i in range(30)]], .05, "trim", minor=6, closed=True))
    for k in range(6):
        a = angs[k] + pi / 6
        arcw = 2 * R * sin(pi / 6) / 2 - .12
        pts = ellipse_pts(arcw, .75, 10, pi, 2 * pi)
        P.append(prism(pts, .1, "xz", "accent" if k % 2 else "soft", loc=(R * cos(a), R * sin(a), 3.55), rot=(0, 0, a + pi / 2), bevel=.03, seg=2))
        P.append(sph(.09, (R * cos(a), R * sin(a), 2.78), "trim", n=8, rings=5))
        if k != 5:
            # grade baixa entre as colunas (o vao da frente fica livre)
            a0, a1 = angs[k], angs[k + 1]
            P.append(tube([Vector((R * cos(a0 + (a1 - a0) * i / 5), R * sin(a0 + (a1 - a0) * i / 5), 1.15)) for i in range(6)], .045, "trim", minor=5))
            P.append(tube([Vector((R * cos(a0 + (a1 - a0) * i / 5), R * sin(a0 + (a1 - a0) * i / 5), .72)) for i in range(6)], .035, "trim", minor=5))
            for i in range(1, 5):
                aa = a0 + (a1 - a0) * i / 5
                P.append(cyl(.05, .45, (R * cos(aa), R * sin(aa), .93), "white", n=6))
    # domo
    P.append(lathe([(0, 3.75), (3.3, 3.75), (3.4, 3.85), (3.3, 4.0), (3.05, 4.3), (2.4, 4.9), (1.5, 5.55), (.75, 6.1), (.3, 6.5), (0, 6.85)],
                   "accent2", n=30, smooth=1, flute=(6, .05)))
    P.append(tube([Vector((3.28 * cos(t), 3.28 * sin(t), 3.95)) for t in [2 * pi * i / 30 for i in range(30)]], .07, "trim", minor=6, closed=True))
    P.append(sph(.3, (0, 0, 6.95), "white", n=12, rings=8))
    P.append(lathe([(0, 0), (.08, 0), (.04, .6), (0, .9)], "trim", loc=(0, 0, 7.15), n=8))
    return P


def piece_bridge_small():
    """ponte arqueada de 8,4 m (eixo Y do Blender -> Z do GLB), largura 3 m, flecha de 0,9 m, com balaustrada de perolas."""
    P = []
    L, H, W = 4.2, .9, 3.0

    def hz(y):
        return H * (1 - (y / L) ** 2)
    N = 14
    ys = [-L + 2 * L * i / N for i in range(N + 1)]

    def strip(width, thick, zoff, mat, bevel=.05):
        bm = bmesh.new()
        top = [[bm.verts.new((sx * width / 2, y, hz(y) + zoff)) for sx in (-1, 1)] for y in ys]
        bot = [[bm.verts.new((sx * width / 2, y, hz(y) + zoff - thick)) for sx in (-1, 1)] for y in ys]
        for i in range(N):
            bm.faces.new((top[i][0], top[i][1], top[i + 1][1], top[i + 1][0]))
            bm.faces.new((bot[i][1], bot[i][0], bot[i + 1][0], bot[i + 1][1]))
            bm.faces.new((top[i][0], top[i + 1][0], bot[i + 1][0], bot[i][0]))
            bm.faces.new((top[i][1], bot[i][1], bot[i + 1][1], top[i + 1][1]))
        bm.faces.new((top[0][1], top[0][0], bot[0][0], bot[0][1]))
        bm.faces.new((top[N][0], top[N][1], bot[N][1], bot[N][0]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        return _obj_from_bm(bm, mat, (0, 0, 0), (0, 0, 0), bevel=bevel, seg=2, ang=35)
    P.append(strip(W, .5, 0, "white"))
    P.append(strip(W - .9, .04, .035, "accent", bevel=.0))
    P.append(strip(W + .12, .16, -.1, "trim", bevel=.03))
    for sx in (-1, 1):
        xr = sx * (W / 2 - .12)
        P.append(tube([Vector((xr, y, hz(y) + .95)) for y in ys], .06, "trim", minor=6))
        P.append(tube([Vector((xr, y, hz(y) + .3)) for y in ys], .045, "trim", minor=5))
        for i in range(2, N - 1, 2):
            y = ys[i]
            P.append(cyl(.07, .7, (xr, y, hz(y) + .6), "white", n=8))
            P.append(sph(.08, (xr, y, hz(y) + .27), "accent", n=8, rings=5))
        for y in (-L + .1, L - .1):
            P.append(lathe([(0, 0), (.2, 0), (.17, .15), (.14, 1.05), (.2, 1.12), (0, 1.12)], "white", loc=(xr, y, hz(y)), n=10))
            P.append(sph(.15, (xr, y, hz(y) + 1.25), "trim", n=10, rings=6))
        P.append(heart(.5, .1, (xr, 0, hz(0) + .62), "accent2", rot=(0, 0, pi / 2), bevel=.04))
    return P


PIECES = [
    ("wall_plain", piece_wall_plain), ("wall_window", piece_wall_window), ("wall_door", piece_wall_door),
    ("wall_corner", piece_wall_corner), ("column_rococo", piece_column_rococo), ("arch_gate", piece_arch_gate),
    ("cornice_scallop", piece_cornice_scallop), ("roof_dome_small", piece_roof_dome_small),
    ("awning_striped", piece_awning_striped), ("balcony_curved", piece_balcony_curved), ("sign_frame", piece_sign_frame),
    ("lamp_post", piece_lamp_post), ("bench_tufted", piece_bench_tufted), ("planter_round", piece_planter_round),
    ("hedge_heart", piece_hedge_heart), ("fence_segment", piece_fence_segment), ("balloon_heart", piece_balloon_heart),
    ("fountain_center", piece_fountain_center), ("paving_tile", piece_paving_tile),
    ("house_shell", piece_house_shell), ("house_shell_wide", piece_house_shell_wide), ("facade_win", piece_facade_win),
    ("facade_door", piece_facade_door), ("roof_pitched", piece_roof_pitched), ("gazebo", piece_gazebo), ("bridge_small", piece_bridge_small),
]

# colisores sugeridos (em coordenadas do jogo, Y-up: x largura, y altura, z profundidade; centro relativo a origem)
META = {
    "wall_plain": dict(mount="fachada: plano frontal em z=0 (frente +Z no GLB), corpo em z=-0.4..0; empilhe andares a cada 4 m", collider=("box", [4, 4, .5], [0, 2, -.15])),
    "wall_window": dict(mount="idem wall_plain", collider=("box", [4, 4, .5], [0, 2, -.15])),
    "wall_door": dict(mount="idem wall_plain; a abertura da porta e solida (colisor cobre a parede inteira, a porta e decorativa)", collider=("box", [4, 4, .5], [0, 2, -.15])),
    "wall_corner": dict(mount="coluna de quina, centro em z=-0.2", collider=("cylinder", [.7, 4], [0, 2, -.2])),
    "column_rococo": dict(mount="livre", collider=("cylinder", [.62, 3.5], [0, 1.75, 0])),
    "arch_gate": dict(mount="livre, vao de 2.6 m no centro", collider=("boxes", [[.9, 3.3, .9, -1.75, 1.65, 0], [.9, 3.3, .9, 1.75, 1.65, 0]], None)),
    "cornice_scallop": dict(mount="no topo da parede (z do topo da fachada), z=0 da peca fica ao nivel do topo da parede", collider=None),
    "roof_dome_small": dict(mount="sobre o telhado", collider=None),
    "awning_striped": dict(mount="encostado na fachada a 2.8 m de altura; costas em z=0", collider=None),
    "balcony_curved": dict(mount="piso da sacada ao nivel do piso do 2o andar (y=4); costas em z=0", collider=None),
    "sign_frame": dict(mount="centro-costas na fachada; pivo no centro da elipse", collider=None),
    "lamp_post": dict(collider=("cylinder", [.35, 4.6], [0, 2.3, 0])),
    "bench_tufted": dict(collider=("box", [2.0, 1.0, .75], [0, .5, 0.0])),
    "planter_round": dict(collider=("cylinder", [.6, 1.3], [0, .65, 0])),
    "hedge_heart": dict(collider=("cylinder", [.45, 1.9], [0, .95, 0])),
    "fence_segment": dict(collider=("box", [2.1, 1.1, .2], [0, .55, 0])),
    "balloon_heart": dict(collider=None, note="flutuante; preso por fio, sem colisao"),
    "fountain_center": dict(collider=("cylinder", [2.65, 1.0], [0, .5, 0]), note="colisor so da bacia; o topo e decorativo"),
    "paving_tile": dict(walkable=True, collider=None, note="amostra 2x2 m para virar textura/padrao do piso da praca"),
    "house_shell": dict(mount="corpo 8x8x8 m (2 andares), centro da planta na origem; frente +Z; encaixe facade_win/facade_door em z=+4 e roof_pitched em y=8", collider=("box", [8.4, 8, 8.4], [0, 4, 0])),
    "house_shell_wide": dict(mount="corpo 12x12x8 m, idem house_shell; usado no miolo da Casa dos Sonhos", collider=("box", [12.4, 8, 12.4], [0, 4, 0])),
    "facade_win": dict(mount="modulo de fachada 4x4 m, plano de fundo em z=0, sai para +Z (empilhe 2 andares a cada 4 m)", collider=None),
    "facade_door": dict(mount="idem facade_win; porta no centro com degraus", collider=None),
    "roof_pitched": dict(mount="sobre house_shell (y=8): telhado de 4 aguas com beiral festonado + chamine", collider=None),
    "gazebo": dict(mount="coreto redondo r=3.85 m, vao de entrada virado para +Z; plataforma 0.4 m; ~7 m de altura", collider=("boxes", [[.45, 3.5, .45, 1.35, 1.75, -2.34], [.45, 3.5, .45, 2.7, 1.75, 0], [.45, 3.5, .45, 1.35, 1.75, 2.34], [.45, 3.5, .45, -1.35, 1.75, 2.34], [.45, 3.5, .45, -2.7, 1.75, 0], [.45, 3.5, .45, -1.35, 1.75, -2.34]], None)),
    "bridge_small": dict(mount="ponte arqueada, eixo no Z do GLB (8.4 m), 3 m de largura, topo 0.9 m; colisor montado no jogo (rampas + grades)", collider=None, walkable=True),
}


def build_all():
    build_materials()
    out = {}
    for name, fn in PIECES:
        out[name] = finish(name, fn())
    return out


def bbox(ob):
    xs = [v.co.x for v in ob.data.vertices]
    ys = [v.co.y for v in ob.data.vertices]
    zs = [v.co.z for v in ob.data.vertices]
    return (min(xs), max(xs)), (min(ys), max(ys)), (min(zs), max(zs))


def export_all(objs):
    os.makedirs(OUT, exist_ok=True)
    kit = {"units": "m", "up": "Y", "front": "+Z", "style": "luxury porcelain dollhouse", "pieces": {},
           "slots": ["base", "accent", "accent2", "soft", "deep", "seat", "white", "trim", "glass", "glow", "leaf", "water"],
           "slotNotes": "geometria exportada com materiais nomeados por slot; recolore por predio trocando a cor de cada material (trim = metal)",
           "metals": {k: dict(color=v[0], roughness=v[1], metallic=1) for k, v in METALS.items()},
           "palettes": PALETTES}
    for name, ob in objs.items():
        bpy.ops.object.select_all(action="DESELECT")
        ob.select_set(True)
        bpy.context.view_layer.objects.active = ob
        path = os.path.join(OUT, name + ".glb")
        bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_yup=True,
                                  export_apply=True, export_cameras=False, export_lights=False)
        (x0, x1), (y0, y1), (z0, z1) = bbox(ob)
        info = dict(file="kit/%s.glb" % name, tris=tri_count(ob), bytes=os.path.getsize(path),
                    size=[round(x1 - x0, 3), round(z1 - z0, 3), round(y1 - y0, 3)],
                    bbox_min=[round(x0, 3), round(z0, 3), round(-y1, 3)], bbox_max=[round(x1, 3), round(z1, 3), round(-y0, 3)],
                    materials=[m.name for m in ob.data.materials if m])
        meta = META.get(name, {})
        info["walkable"] = bool(meta.get("walkable", False))
        col = meta.get("collider")
        if col:
            info["collider"] = dict(type=col[0], size=col[1], center=col[2])
        if "mount" in meta:
            info["mount"] = meta["mount"]
        if "note" in meta:
            info["note"] = meta["note"]
        kit["pieces"][name] = info
    with open(os.path.join(OUT, "kit.json"), "w", encoding="utf-8") as f:
        json.dump(kit, f, indent=2, ensure_ascii=False)
    # copia para o codigo (o jogo importa o JSON; ver src/game/world/city/kit.tsx)
    with open(os.path.join(ROOT, "src", "game", "world", "city", "kitRomantic.json"), "w", encoding="utf-8") as f:
        json.dump(kit, f, indent=1, ensure_ascii=False)
    return kit


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    objs = build_all()
    kit = export_all(objs)
    total = 0
    for n, i in kit["pieces"].items():
        total += i["tris"]
        print("%-18s tris=%6d  %7.1f KB  size=%s" % (n, i["tris"], i["bytes"] / 1024, i["size"]))
    print("TOTAL tris", total)


if __name__ == "__main__":
    main()

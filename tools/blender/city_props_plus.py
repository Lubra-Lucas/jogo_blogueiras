"""
Props de cenario "plus" (mais detalhados que o kit base) - Jogo das Blogueiras.
Reaproveita (somente leitura) os helpers de city_kit.py: bevels, materiais por slot, paletas.

Uso:  blender -b -P tools/blender/city_props_plus.py [-- --only a,b,c]
Saida: public/assets/city/props_plus/<nome>.glb + props_plus.json

Convencoes (iguais ao kit): Blender Z-up, frente = -Y (vira +Z no GLB Y-up), origem na base/centro da peca,
materiais nomeados por slot (base, accent, accent2, soft, deep, seat, white, trim, glass, glow, leaf, water).
"""
import bpy
import bmesh
import math
import os
import sys
import json
import shutil
import tempfile
from math import pi, sin, cos, radians, atan2, sqrt
from mathutils import Vector, Matrix, Euler

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(ROOT, "public", "assets", "city", "props_plus")

# snapshot de city_kit.py (outro agente edita o original): importamos a copia
_snap = os.path.join(tempfile.gettempdir(), "ck_snap_pp")
os.makedirs(_snap, exist_ok=True)
try:
    shutil.copy(os.path.join(HERE, "city_kit.py"), os.path.join(_snap, "ck_snap.py"))
    sys.path.insert(0, _snap)
    import ck_snap as ck  # noqa
except Exception as _e:  # pragma: no cover
    print("snapshot fail", _e)
    sys.path.insert(0, HERE)
    import city_kit as ck  # noqa

M = ck.M
lin = ck.lin
box, cyl, sph, tube, lathe, prism, heart, bow = ck.box, ck.cyl, ck.sph, ck.tube, ck.lathe, ck.prism, ck.heart, ck.bow
arc3, bool_cut, tri_count = ck.arc3, ck.bool_cut, ck.tri_count
_orig_obj = ck._obj_from_bm


def _cheap_obj(bm, mat, loc, rot, bevel=0.0, seg=2, ang=30, scale=None):
    # economia de triangulos: segmentos de bevel 1-2 -> 1, 3 -> 2
    seg = 1 if seg <= 2 else 2
    return _orig_obj(bm, mat, loc, rot, bevel, seg, ang, scale)


ck._obj_from_bm = _cheap_obj
_obj_from_bm = _cheap_obj
_orig_sph, _orig_tube = ck.sph, ck.tube


def _cheap_sph(dims, loc, mat, rot=(0, 0, 0), n=14, rings=9):
    return _orig_sph(dims, loc, mat, rot, min(n, 12), min(rings, 7))


def _cheap_tube(points, r, mat, minor=8, closed=False, loc=(0, 0, 0), rot=(0, 0, 0), caps=True, scale=None):
    r0 = r[0] if isinstance(r, (list, tuple)) else r
    return _orig_tube(points, r, mat, min(minor, 5 if r0 < .02 else (6 if r0 < .05 else 8)), closed, loc, rot, caps, scale)


ck.sph = sph = _cheap_sph
ck.tube = tube = _cheap_tube


def hrt(w, thick, loc, mat, rot=(0, 0, 0), bevel=None, seg=2):
    n = 18 if w > .5 else 12
    return _obj_from_bm(ck.bm_prism(ck.heart_pts(w, n), thick, "xz"), mat, loc, rot, bevel if bevel is not None else thick * .4, 1, ang=50)


heart = hrt


def cyl(r, h, loc, mat, rot=(0, 0, 0), n=20, bevel=0.0, seg=2, rz=None):
    n = min(n, 12 if r < .06 else (16 if r < .3 else 24))
    return ck.cyl(r, h, loc, mat, rot, n, bevel, seg, rz)

# ----------------------------------------------------------------------------------------------------
# paletas (variadas; um tom de rosa no maximo por familia)
# ----------------------------------------------------------------------------------------------------
_hp = ck._hp
PALS = {
    # Centro (Y2K suave)
    "photo":    _hp("Foto Y2K", "#fff4f9", "#ffd1e6", "#ff5fa8", "#d7c8ff", "#8e2b66", "#ffd9ec", "rose_gold", seat="#ff8fc4", glow="#fff0f8"),
    "sign":     _hp("Sinalizacao", "#fff6ec", "#bfe8d6", "#ff8f7a", "#cfe0ff", "#3b5a7a", "#d9f0ff", "jewel_gold", seat="#ffb3a3"),
    "kiosk":    _hp("Banca Aqua", "#bfe8f2", "#fffaf6", "#ff6f91", "#ffe08a", "#2f6f8a", "#d6f4ff", "silver", seat="#ff9bb3"),
    "bin":      _hp("Lixeira Menta", "#bfe8d6", "#fffaf6", "#ff8fbf", "#ffe9a8", "#3a8a6c", "#d6f3e8", "silver", seat="#9fe0c4"),
    "mail":     _hp("Correio Coracao", "#ff7a9c", "#ffd1de", "#fff6ee", "#ffc2d4", "#a02850", "#ffd1de", "jewel_gold", seat="#ff9bb3"),
    "bike":     _hp("Bicicletario", "#d7c8ff", "#fffaf6", "#7fd6c2", "#fff0b8", "#5b4a9a", "#e3d9ff", "chrome", seat="#fff0b8"),
    "booth":    _hp("Capsula Y2K", "#e8f0ff", "#c5d6ff", "#7aa8ff", "#d9c8ff", "#3a4a9a", "#c8e0ff", "chrome", seat="#a8c0ff", glow="#8fd8ff"),
    "vending":  _hp("Vending Pod", "#ffe9a8", "#fffaf6", "#ff7f6b", "#bfe8d6", "#a8483a", "#d9f3ff", "chrome", seat="#ffc4a8", glow="#fff0a0"),
    "car":      _hp("Carrinho Bolha", "#9ee6d2", "#fffaf6", "#ff9bc4", "#fff0b8", "#2f8a76", "#d6f6ff", "chrome", seat="#ffb3d1"),
    # Avenida da Moda (luxo moderno)
    "cafe_lux": _hp("Cafe Champagne", "#f3e6d4", "#fffaf6", "#c9a063", "#e4d2b4", "#6b4a2f", "#f3ead6", "champagne", seat="#e2c9a0", glow="#ffe2a0"),
    "mannequin":_hp("Vitrine Noir", "#2a2630", "#3b3644", "#c8a86a", "#f3eee8", "#14111a", "#cdbfe0", "champagne", seat="#8a2f4a", glow="#ffe2b0"),
    "palm_lux": _hp("Palmeira Lux", "#fffaf6", "#e9dfd0", "#c9a063", "#f3eee8", "#5b6b4a", "#f3ead6", "champagne", seat="#e2c9a0"),
    # Jardim / Parque (romantico)
    "flower":   _hp("Carrinho de Flores", "#fff3df", "#bfe8d6", "#ff8fa8", "#ffd9a8", "#6b8a58", "#fff0d2", "jewel_gold", seat="#ffb3c4"),
    "macaron":  _hp("Macaron", "#e3d5fa", "#fff3ea", "#ff9bc4", "#bfe8d6", "#7a5aa8", "#f1e6ff", "pearl", seat="#ffd1e0"),
    "rose":     _hp("Arco de Rosas", "#fffaf6", "#f9c6d6", "#e8506e", "#fff0f4", "#b03a50", "#ffe3ea", "pearl", seat="#ff8fa8"),
    "swan":     _hp("Cisne", "#fffaf6", "#ffb8c9", "#ff8f7a", "#e3f1ff", "#c4584a", "#d6f3ff", "jewel_gold", seat="#ffd1d9"),
    "birdcage": _hp("Gaiola", "#f7efe6", "#fffaf6", "#a9d9c6", "#ffe9a8", "#5b8a78", "#fff3c8", "jewel_gold", seat="#cdeadd", glow="#ffe9a0"),
}
ck.PALETTES.update(PALS)

# materiais "extra" (cores fixas de decoracao; o jogo pode ignorar ou recolorir)
LEAF = {"palm_lux": "#6fb88a", "flower": "#9ed6a8", "rose": "#8fcf9a", "birdcage": "#a9dcb4"}


def setup_mats(pal):
    for m in list(bpy.data.materials):
        bpy.data.materials.remove(m)
    M.clear()
    M.update(ck.palette_mats(pal))
    if pal in LEAF:
        b = M["leaf"].node_tree.nodes["Principled BSDF"]
        b.inputs["Base Color"].default_value = lin(LEAF[pal])


# ----------------------------------------------------------------------------------------------------
# helpers novos
# ----------------------------------------------------------------------------------------------------
def sup(a, b, p=4.0, N=96, mod=None, off=(0, 0)):
    """contorno super-elipse (retangulo arredondado) amostrado por angulo -> [(x,z)]."""
    out = []
    for i in range(N):
        t = 2 * pi * i / N
        c, s = cos(t), sin(t)
        r = (abs(c / a) ** p + abs(s / b) ** p) ** (-1.0 / p)
        if mod:
            r *= mod(t)
        out.append((r * c + off[0], r * s + off[1]))
    return out


def wavy(k, amp):
    return lambda t: 1.0 + amp * sin(k * t)


def scallop(k, amp):
    return lambda t: 1.0 + amp * (abs(sin(k * t / 2)) - 1.0)


def rr_pts(w, h, r, n=6):
    """retangulo arredondado CCW (x,y)."""
    pts = []
    for (cx, cy, a0) in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
        for i in range(n + 1):
            a = radians(a0 + 90 * i / n)
            pts.append((cx + r * cos(a), cy + r * sin(a)))
    return pts


def ring_prism(outer, inner, depth, mat, loc=(0, 0, 0), bevel=0.02, seg=2, rot=(0, 0, 0)):
    """anel extrudado em Y (contornos (x,z) com mesmo numero de pontos)."""
    bm = bmesh.new()
    n = len(outer)
    h = depth / 2
    of = [bm.verts.new((p[0], -h, p[1])) for p in outer]
    ob_ = [bm.verts.new((p[0], h, p[1])) for p in outer]
    inf = [bm.verts.new((p[0], -h, p[1])) for p in inner]
    inb = [bm.verts.new((p[0], h, p[1])) for p in inner]
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((of[i], of[j], inf[j], inf[i]))
        bm.faces.new((ob_[j], ob_[i], inb[i], inb[j]))
        bm.faces.new((of[j], of[i], ob_[i], ob_[j]))
        bm.faces.new((inf[i], inf[j], inb[j], inb[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _obj_from_bm(bm, mat, loc, rot, bevel, seg, ang=35)


def circ(cx, cy, cz, R, n=24, plane="xz"):
    if plane == "xz":
        return [Vector((cx + R * cos(2 * pi * i / n), cy, cz + R * sin(2 * pi * i / n))) for i in range(n)]
    return [Vector((cx + R * cos(2 * pi * i / n), cy + R * sin(2 * pi * i / n), cz)) for i in range(n)]


def text3d(s, size, depth, loc, mat, rot=(pi / 2, 0, 0), res=2, bevel=0.0, spacing=1.0):
    cu = bpy.data.curves.new("txt", "FONT")
    cu.body = s
    cu.size = size
    cu.extrude = depth / 2
    cu.bevel_depth = bevel
    cu.bevel_resolution = 1
    cu.resolution_u = res
    cu.align_x = "CENTER"
    cu.align_y = "CENTER"
    cu.space_character = spacing
    ob = bpy.data.objects.new("txt", cu)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.update()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    bpy.data.objects.remove(ob)
    bpy.data.curves.remove(cu)
    o = bpy.data.objects.new("t", me)
    bpy.context.scene.collection.objects.link(o)
    me.materials.append(M[mat])
    me.transform(Matrix.LocRotScale(Vector(loc), Euler(rot, "XYZ"), None))
    return o


def pearls(pts3, r, mat="white", n=8, rings=5):
    return [sph(r, p, mat, n=n, rings=rings) for p in pts3]


def stripes(w, d, loc, n, ma, mb, tilt, t=.05, rot_z=0.0):
    """tecido listrado inclinado: tira por tira ao longo de X; frente em -Y; tilt = queda para a frente (rad)."""
    P = []
    L = d / cos(tilt)
    sw = w / n
    x0, y0, z0 = loc
    for i in range(n):
        x = x0 - w / 2 + sw * (i + .5)
        P.append(box((sw * .98, L, t), (x, y0, z0), ma if i % 2 == 0 else mb, rot=(-tilt, 0, 0), bevel=.012, seg=2))
    # babado em ondas na borda frontal
    yf = y0 - d / 2
    zf = z0 - L / 2 * sin(tilt)
    for i in range(n):
        x = x0 - w / 2 + sw * (i + .5)
        P.append(sph((sw * .98, t * 3.0, sw * .75), (x, yf, zf - sw * .28), ma if i % 2 == 0 else mb, n=10, rings=5))
    return P


def rn(a, b, k=3):
    return [a + (b - a) * i / (k - 1) for i in range(k)]


# ----------------------------------------------------------------------------------------------------
# registro de pecas
# ----------------------------------------------------------------------------------------------------
REG = []


def piece(name, pal, family, collider=None, walkable=False, note=None, mount=None, tri_target=None):
    def deco(fn):
        REG.append(dict(name=name, fn=fn, pal=pal, family=family, collider=collider, walkable=walkable, note=note, mount=mount,
                        tri_target=tri_target))
        return fn
    return deco


# ====================================================================================================
# 1. photo_spot_frame  (Centro / social)
# ====================================================================================================
@piece("photo_spot_frame", "photo", "centro",
       collider=("boxes", [[.34, 3.3, .5, -1.25, 1.65, -.2], [.34, 3.3, .5, 1.25, 1.65, -.2], [.5, 1.2, .5, 2.15, .6, .9]], None),
       walkable=False, note="palco 4.8x3.6 m de altura 0.14 (pisavel); moldura a 0.2 m do centro do palco; pessoa fica atras da moldura (y>0 Blender = -z jogo) e aparece na abertura",
       mount="livre; frente -Z do jogo ... (+Z no GLB)")
def piece_photo_spot_frame():
    P = []
    # palco
    P.append(prism(rr_pts(4.9, 3.7, .75, 4), .14, "xy", "white", loc=(0, 0, .07), bevel=.04, seg=3))
    P.append(prism(rr_pts(5.05, 3.85, .8, 4), .05, "xy", "trim", loc=(0, 0, .025), bevel=0))
    P.append(prism(rr_pts(4.3, 3.1, .6, 4), .02, "xy", "accent", loc=(0, 0, .15), bevel=0.0))
    # coracaozinhos de "fique aqui" no chao
    for sx in (-1, 1):
        P.append(heart(.34, .03, (sx * .42, 1.15, .17), "accent2", rot=(pi / 2, 0, 0), bevel=.01))
    P.append(heart(.5, .03, (0, -1.2, .17), "soft", rot=(pi / 2, 0, 0), bevel=.01))
    # moldura
    FZ, FY = 1.95, .3
    N = 56
    k = 8
    out2 = sup(1.62, 1.44, 4.2, N, mod=wavy(k, .03))
    out1 = sup(1.52, 1.34, 4.2, N)
    inn = sup(1.1, .92, 4.4, N, off=(0, .1))
    inn_t = sup(1.16, .98, 4.4, N, off=(0, .1))
    P.append(ring_prism(out2, inn, .1, "white", loc=(0, FY + .06, FZ), bevel=0))
    P.append(ring_prism(out1, inn_t, .2, "accent", loc=(0, FY, FZ), bevel=.05, seg=1))
    P.append(ring_prism(inn_t, inn, .26, "trim", loc=(0, FY - .02, FZ), bevel=0))
    # perolas na borda interna
    beads = sup(1.2, 1.02, 4.4, 22, off=(0, .1))
    P += pearls([(x, FY - .17, FZ + z) for x, z in beads], .05, "white", 8, 4)
    # anel externo de contas finas (cordao)
    # laco no topo + coracao
    P += bow(.85, (0, FY - .2, FZ + 1.5), "accent2", knot="soft")
    P.append(heart(.42, .14, (0, FY - .32, FZ + 1.5), "trim", rot=(0, 0, 0), bevel=.04))
    # coracoes nas laterais
    for sx in (-1, 1):
        P.append(heart(.34, .1, (sx * 1.56, FY - .12, FZ - .1), "accent2", bevel=.035))
        P.append(heart(.2, .08, (sx * 1.56, FY - .12, FZ + .5), "soft", bevel=.025))
        P.append(heart(.2, .08, (sx * 1.56, FY - .12, FZ - .7), "soft", bevel=.025))
    # faixa de texto na parte de baixo
    P.append(prism(rr_pts(2.7, .46, .2, 6), .09, "xz", "deep", loc=(0, FY - .13, FZ - 1.12), bevel=.02))
    P.append(text3d("#JogoDasBlogueiras", .21, .05, (0, FY - .2, FZ - 1.12), "white", res=1))
    # pernas / pes (colunas gordinhas)
    for sx in (-1, 1):
        x = sx * 1.25
        P.append(lathe([(0, .14), (.26, .14), (.26, .2), (.17, .3), (.15, .6), (.2, .66), (.2, .78), (0, .78)], "white", loc=(x, FY, 0), n=14))
        P.append(cyl(.22, .05, (x, FY, .15), "trim", n=14, bevel=.01))
        P.append(sph(.12, (x, FY, .8), "trim", n=10, rings=6))
    P.append(box((2.6, .16, .1), (0, FY + .05, .7), "trim", bevel=.04, seg=2))
    # escoras traseiras
    for sx in (-1, 1):
        P.append(tube([Vector((sx * 1.2, FY + .1, .7)), Vector((sx * 1.2, FY + 1.1, .16))], .045, "trim", minor=6))
    # ring light com tripe
    rx, ry = 2.05, -.7
    P.append(cyl(.03, 1.5, (rx, ry, .95), "trim", n=10))
    for a in (90, 210, 330):
        d = Vector((cos(radians(a)), sin(radians(a)), 0))
        P.append(tube([Vector((rx, ry, 1.0)), Vector((rx, ry, 1.0)) + d * .5 + Vector((0, 0, -.88))], .02, "trim", minor=5))
        P.append(sph(.04, (rx + d.x * .5, ry + d.y * .5, .13), "soft", n=8, rings=5))
    P.append(cyl(.06, .2, (rx, ry, 1.0), "soft", n=10, bevel=.01))
    ZR = 2.15
    P.append(tube(circ(rx, ry, ZR, .4, 30), .06, "accent2", minor=8, closed=True, rot=(0, 0, 0)) if False else
             tube([Vector((rx + .4 * cos(2 * pi * i / 20), ry, ZR + .4 * sin(2 * pi * i / 20))) for i in range(20)], .06, "accent2", minor=8, closed=True))
    P.append(tube([Vector((rx + .4 * cos(2 * pi * i / 20), ry - .035, ZR + .4 * sin(2 * pi * i / 20))) for i in range(20)], .034, "glow", minor=6, closed=True))
    P.append(box((.1, .02, .2), (rx, ry - .02, ZR), "deep", bevel=.01))
    P.append(box((.14, .05, .05), (rx, ry, ZR + .12), "trim", bevel=.01))
    P.append(cyl(.012, .38, (rx, ry, ZR), "trim", n=6, rot=(0, pi / 2, 0)))
    return P


# ====================================================================================================
# 2. wayfinding_post  (Centro / navegacao)
# ====================================================================================================
def arrow_pts(L, H, tip=.38, r=.07, left=False):
    pts = [(-L / 2, -H / 2), (L / 2 - tip, -H / 2), (L / 2, 0), (L / 2 - tip, H / 2), (-L / 2, H / 2)]
    # cantos esquerdos arredondados
    if left:
        pts = [(-x, z) for x, z in pts][::-1]
    return pts


def icon_medallion(kind, loc, mat_disc, mat_a, mat_b, s=1.0, ysign=-1):
    """icone pequeno (disco + figura) voltado para -Y a partir de loc."""
    P = []
    x, y, z = loc
    P.append(cyl(.2 * s, .05 * s, (x, y, z), mat_disc, rot=(pi / 2, 0, 0), n=20, bevel=.012, seg=2))
    yy = y - .04 * s
    if kind == "bag":
        P.append(box((.17 * s, .05 * s, .14 * s), (x, yy, z - .02 * s), mat_a, bevel=.012))
        P.append(tube(arc3(x, z + .05 * s, .045 * s, .05 * s, 0, pi, 8, y=yy), .01 * s, mat_b, minor=5))
    elif kind == "flower":
        for i in range(5):
            a = 2 * pi * i / 5 + .3
            P.append(sph(.08 * s, (x + .075 * s * cos(a), yy, z + .075 * s * sin(a)), mat_a, n=8, rings=5))
        P.append(sph(.07 * s, (x, yy - .02 * s, z), mat_b, n=8, rings=5))
    elif kind == "camera":
        P.append(box((.2 * s, .05 * s, .13 * s), (x, yy, z - .01 * s), mat_a, bevel=.015))
        P.append(cyl(.05 * s, .06 * s, (x, yy - .03 * s, z - .01 * s), mat_b, rot=(pi / 2, 0, 0), n=12))
        P.append(box((.07 * s, .04 * s, .03 * s), (x - .05 * s, yy, z + .08 * s), mat_a))
    elif kind == "cup":
        P.append(lathe([(0, -.07 * s), (.05 * s, -.07 * s), (.07 * s, .06 * s), (0, .06 * s)], mat_a, loc=(x, yy, z - .01 * s), rot=(pi / 2, 0, 0), n=12))
        P.append(tube(arc3(x + .07 * s, z - .01 * s, .04 * s, .04 * s, -pi / 2, pi / 2, 8, y=yy), .011 * s, mat_b, minor=5))
        P.append(sph((.1 * s, .02 * s, .02 * s), (x, yy - .02 * s, z + .06 * s), mat_b, n=8, rings=4))
    elif kind == "heart":
        P.append(heart(.2 * s, .04 * s, (x, yy, z), mat_a, bevel=.012))
    elif kind == "tree":
        P.append(sph((.14 * s, .05 * s, .14 * s), (x, yy, z + .04 * s), mat_a, n=10, rings=6))
        P.append(box((.03 * s, .04 * s, .09 * s), (x, yy, z - .08 * s), mat_b))
    return P


@piece("wayfinding_post", "sign", "centro",
       collider=("cylinder", [.45, 3.8], [0, 1.9, 0]), note="placas em branco (texto depois); 4 setas + medalhoes de icone (bolsa, flor, camera, xicara)")
def piece_wayfinding_post():
    P = []
    # base escalonada
    P.append(cyl(.52, .1, (0, 0, .05), "white", n=28, bevel=.025, seg=3))
    P.append(cyl(.42, .12, (0, 0, .16), "accent2", n=28, bevel=.03, seg=3))
    P.append(lathe([(0, .22), (.3, .22), (.26, .3), (.16, .45), (.12, .6), (0, .6)], "white", n=24, smooth=1))
    P.append(cyl(.2, .035, (0, 0, .32), "trim", n=20, bevel=.01))
    # poste
    P.append(lathe([(0, .6), (.1, .6), (.085, .8), (.07, 1.0), (.07, 3.2), (.095, 3.3), (0, 3.3)], "base", n=18))
    for z in (.7, 1.25, 1.95, 2.55, 3.15):
        P.append(cyl(.1, .045, (0, 0, z), "trim", n=14, bevel=.012))
    # placas
    specs = [  # z, direcao (+1 aponta p/ +X), rot z, cor, icone, largura
        (2.88, 1, .06, "accent2", "bag", 1.5),
        (2.42, -1, -.05, "accent", "flower", 1.45),
        (1.96, 1, -.03, "soft", "camera", 1.55),
        (1.5, -1, .06, "base", "cup", 1.4),
    ]
    for (z, d, rz, mat, ic, L) in specs:
        sd = 1 if d > 0 else -1
        pts = arrow_pts(L, .36, .3, left=(sd < 0))
        # moldura metalica atras (ligeiramente maior)
        big = arrow_pts(L + .08, .43, .34, left=(sd < 0))
        cxo = sd * (L / 2 + .02)
        P.append(prism(big, .06, "xz", "trim", loc=(cxo, .02, z), rot=(0, 0, 0), bevel=.014, seg=2))
        P.append(prism(pts, .1, "xz", mat, loc=(cxo, -.03, z), bevel=.03, seg=3))
        # placa interna branca (area do texto)
        inner = arrow_pts(L - .62, .24, .2, left=(sd < 0))
        P.append(prism(inner, .03, "xz", "white", loc=(cxo - sd * .22, -.09, z), bevel=.008, seg=2))
        # medalhao
        mx = cxo - sd * (L / 2 - .17)
        P += icon_medallion(ic, (mx, -.1, z), "white", "accent2" if mat in ("base", "accent", "soft") else "deep", "trim", 1.0)
        # abraçadeira
        P.append(cyl(.115, .1, (0, 0, z), "trim", n=14, bevel=.015))
        P.append(sph(.025, (sd * (L + .02), -.03, z + .02), "trim", n=6, rings=4))
    # placa redonda de "voce esta aqui" lateral baixa
    P.append(cyl(.28, .06, (0, -.12, 1.0), "accent2", rot=(pi / 2, 0, 0), n=24, bevel=.02))
    P.append(cyl(.2, .03, (0, -.17, 1.0), "white", rot=(pi / 2, 0, 0), n=24, bevel=.008))
    P.append(heart(.2, .04, (0, -.2, 1.0), "accent2", bevel=.012))
    P.append(tube(circ(0, -.13, 1.0, .29, 24), .014, "trim", minor=5, closed=True))
    # topo: coroa + coracao
    P.append(sph(.17, (0, 0, 3.4), "trim", n=14, rings=8))
    P.append(cyl(.14, .06, (0, 0, 3.3), "white", n=16, bevel=.015))
    P.append(heart(.5, .12, (0, 0, 3.75), "accent2", bevel=.04))
    # laço e correntinha com coracao pendurado
    P += bow(.28, (0, -.14, 3.28), "soft")
    P.append(tube([Vector((.1, -.09, 1.28)), Vector((.12, -.12, 1.1)), Vector((.1, -.12, .98))], .008, "trim", minor=4)) if False else None
    return P


# ====================================================================================================
# 3. magazine_kiosk  (Centro / banca)
# ====================================================================================================
@piece("magazine_kiosk", "kiosk", "centro",
       collider=("box", [2.9, 3.2, 1.9], [0, 1.6, 0]), note="frente aberta para -Z do jogo; balcao a 1.0 m; revistas em prateleiras laterais")
def piece_magazine_kiosk():
    P = []
    W, D = 2.8, 1.8  # corpo
    # soco e piso
    P.append(prism(rr_pts(W + .35, D + .35, .3, 5), .12, "xy", "white", loc=(0, 0, .06), bevel=.03, seg=3))
    P.append(prism(rr_pts(W + .45, D + .45, .33, 5), .04, "xy", "trim", loc=(0, 0, .02), bevel=.01))
    # paredes do fundo e laterais (casinha aberta)
    P.append(box((W, .12, 2.5), (0, D / 2 - .06, 1.37), "base", bevel=.03, seg=2))
    for sx in (-1, 1):
        P.append(box((.14, D, 2.5), (sx * (W / 2 - .07), 0, 1.37), "base", bevel=.03, seg=2))
        P.append(box((.12, D + .08, .16), (sx * (W / 2 - .07), 0, .2), "accent", bevel=.03, seg=2))
        # coluna frontal arredondada
        P.append(cyl(.1, 2.5, (sx * (W / 2 - .02), -D / 2 + .02, 1.37), "white", n=14, bevel=.01))
        P.append(sph(.13, (sx * (W / 2 - .02), -D / 2 + .02, 2.65), "trim", n=10, rings=6))
        P.append(cyl(.14, .06, (sx * (W / 2 - .02), -D / 2 + .02, .15), "trim", n=14, bevel=.012))
    # balcao
    P.append(box((W - .2, .62, .95), (0, -D / 2 + .55, .6), "accent", bevel=.04, seg=3))
    P.append(box((W - .1, .74, .07), (0, -D / 2 + .55, 1.1), "trim", bevel=.025, seg=2))
    P.append(box((W - .5, .02, .5), (0, -D / 2 + .23, .62), "soft", bevel=.01))
    for sx in (-1, 1):
        P.append(heart(.3, .03, (sx * .6, -D / 2 + .21, .62), "accent2", bevel=.01))
    P.append(heart(.34, .03, (0, -D / 2 + .21, .62), "white", bevel=.01))
    # toldo listrado + dome
    P += stripes(W + .3, 1.15, (0, -D / 2 - .05, 2.62), 8, "accent2", "white", .28)
    P.append(box((W + .3, .12, .22), (0, D / 2 + .02, 2.86), "deep", bevel=.04, seg=2)) if False else None
    P.append(box((W + .3, D * .7, .08), (0, D * .15, 2.87), "accent2", bevel=.025, seg=2))
    P.append(box((W + .12, D + .12, .12), (0, 0, 2.72), "white", bevel=.04, seg=2))
    # letreiro em cima (pilula) com texto
    P.append(prism(rr_pts(2.35, .42, .2, 6), .1, "xz", "deep", loc=(0, -D / 2 - .06, 3.15), bevel=.03, seg=3))
    P.append(tube([Vector((x, -D / 2 - .13, 3.15 + z)) for x, z in rr_pts(2.25, .32, .15, 5)], .012, "trim", minor=5, closed=True))
    P.append(text3d("REVISTA BLOGUEIRA", .17, .04, (0, -D / 2 - .13, 3.15), "white", res=1))
    P.append(sph(.1, (0, 0, 3.5), "trim", n=10, rings=6))
    P.append(heart(.3, .08, (0, -D / 2 + .5, 3.5), "accent2", bevel=.025)) if False else None
    for sx in (-1, 1):
        P.append(cyl(.025, .35, (sx * 1.1, -D / 2 - .06, 2.95), "trim", n=8))
        P.append(sph(.05, (sx * 1.1, -D / 2 - .06, 3.15), "trim", n=8, rings=5))
    # prateleiras de revistas nas laterais (paineis inclinados) + capas
    covers = ["accent2", "soft", "accent", "seat", "white", "deep", "base"]
    for sx in (-1, 1):
        for row, zc in enumerate((1.25, 1.75, 2.25)):
            x0 = sx * (W / 2 + .02)
            # prateleira
            P.append(box((.07, .8, .04), (sx * (W / 2 + .14), -D / 2 + .55, zc - .22), "trim", bevel=.012))
    # capas na parede do fundo e laterais externas (painel de capas)
    k = 0
    for row in range(3):
        for col in range(5):
            c = covers[(k * 3 + row) % len(covers)]
            k += 1
            x = -1.0 + col * .5
            z = 1.4 + row * .36
            P.append(box((.34, .03, .3), (x, D / 2 - .15, z), c, bevel=0))
            P.append(box((.28, .03, .06), (x, D / 2 - .17, z + .09), "white" if c != "white" else "deep", bevel=0))
            P.append(box((.14, .03, .1), (x, D / 2 - .17, z - .05), covers[(k + 2) % len(covers)], bevel=0))
    # expositor lateral externo girando (revistas em leque, capas coloridas)
    for sx, base_x in ((-1, -W / 2 - .45), (1, W / 2 + .45)):
        P.append(cyl(.03, 1.45, (base_x, -D / 2 + .5, .75), "trim", n=8))
        P.append(cyl(.22, .05, (base_x, -D / 2 + .5, .03), "soft", n=14, bevel=.012))
        for j in range(4):
            a = radians(j * 90 + 20 * sx)
            for r_, zz in ((0, 1.2), (1, 0.85)):
                c = covers[(j + r_ * 2 + (0 if sx < 0 else 3)) % len(covers)]
                P.append(box((.3, .025, .36), (base_x + .17 * cos(a), -D / 2 + .5 + .17 * sin(a), zz + .45), c, rot=(-.15, 0, a + pi / 2), bevel=0))
    # montes de revistas no balcao + potinho de pirulitos
    for i, c in enumerate(["accent2", "soft", "white", "deep"]):
        P.append(box((.42, .3, .035), (-.7 + i * .01, -D / 2 + .55, 1.16 + i * .037), c, rot=(0, 0, .08 * (i - 1.5)), bevel=0))
    P.append(lathe([(0, 0), (.09, 0), (.12, .05), (.12, .2), (.09, .24), (0, .24)], "glass", loc=(.65, -D / 2 + .5, 1.14), n=14))
    for i in range(5):
        a = i * 1.26
        P.append(sph(.045, (.65 + .05 * cos(a), -D / 2 + .5 + .05 * sin(a), 1.4 + .02 * i), covers[i % len(covers)], n=8, rings=5))
        P.append(cyl(.006, .24, (.65 + .03 * cos(a), -D / 2 + .5 + .03 * sin(a), 1.3), "white", n=5))
    # luminaria pendente
    for sx in (-1, 1):
        P.append(sph(.08, (sx * .6, -D / 2 + .4, 2.3), "glow", n=10, rings=6))
        P.append(cyl(.008, .3, (sx * .6, -D / 2 + .4, 2.5), "trim", n=5))
    return P


# ====================================================================================================
# helpers extras
# ====================================================================================================
def smooth3(pts, it=2):
    pts = [Vector(p) for p in pts]
    for _ in range(it):
        n = [pts[0]]
        for i in range(len(pts) - 1):
            a, b = pts[i], pts[i + 1]
            n += [a * .75 + b * .25, a * .25 + b * .75]
        n.append(pts[-1])
        pts = n
    return pts


def gore_dome(R, H, ngore, ma, mb, loc, rings=4, scal=.08, rot=(0, 0, 0)):
    """cupula (guarda-sol / toldo) em gomos alternados com barra ondulada."""
    P = []
    for g in range(ngore):
        a0, a1 = 2 * pi * g / ngore, 2 * pi * (g + 1) / ngore
        bm = bmesh.new()
        apex = bm.verts.new((0, 0, H))
        rows = []
        for i in range(1, rings + 1):
            r = R * i / rings
            z = H * (1 - (i / rings) ** 2.3)
            row = []
            for j in range(3):
                a = a0 + (a1 - a0) * j / 2
                zz = z + (scal if (i == rings and j == 1) else 0)
                row.append(bm.verts.new((r * cos(a), r * sin(a), zz)))
            rows.append(row)
        for j in range(2):
            bm.faces.new((apex, rows[0][j], rows[0][j + 1]))
        for i in range(rings - 1):
            for j in range(2):
                bm.faces.new((rows[i][j], rows[i + 1][j], rows[i + 1][j + 1], rows[i][j + 1]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        P.append(_obj_from_bm(bm, ma if g % 2 == 0 else mb, loc, rot, 0))
    return P


def wheel(cx, cy, cz, R, mat_tire, mat_rim, mat_hub, spokes=6, tire=.03, plane="xz"):
    P = []
    n = 20

    def pts(r):
        if plane == "xz":
            return [Vector((cx + r * cos(2 * pi * i / n), cy, cz + r * sin(2 * pi * i / n))) for i in range(n)]
        return [Vector((cx, cy + r * cos(2 * pi * i / n), cz + r * sin(2 * pi * i / n))) for i in range(n)]
    P.append(tube(pts(R), tire, mat_tire, minor=6, closed=True))
    P.append(tube(pts(R - tire * 1.2), tire * .35, mat_rim, minor=4, closed=True))
    P.append(sph(R * .22, (cx, cy, cz), mat_hub, n=10, rings=6))
    for i in range(spokes):
        a = 2 * pi * i / spokes
        if plane == "xz":
            e = Vector((cx + (R - tire) * cos(a), cy, cz + (R - tire) * sin(a)))
        else:
            e = Vector((cx, cy + (R - tire) * cos(a), cz + (R - tire) * sin(a)))
        P.append(tube([Vector((cx, cy, cz)), e], tire * .22, mat_rim, minor=4, caps=False))
    return P


def leaflet_frond(base, direction, length, droop, leaf_len, mat, up=Vector((0, 0, 1))):
    """folha de palmeira: espinha em arco + folíolos triangulares dos dois lados."""
    P = []
    d = Vector(direction).normalized()
    spine = []
    N = 9
    for i in range(N + 1):
        t = i / N
        spine.append(Vector(base) + d * (length * t) + up * (length * .35 * sin(pi * t * .85) - droop * t * t * length))
    P.append(tube(spine, [.03 * (1 - t / (N + 1) * .8) for t in range(N + 1)], mat, minor=5))
    side = d.cross(up).normalized()
    bm = bmesh.new()
    for i in range(1, N + 1):
        a = spine[i]
        b = spine[i - 1]
        t = i / N
        ll = leaf_len * (1 - abs(t - .45) * .9)
        tang = (a - b).normalized()
        for sd in (-1, 1):
            tip = a + side * sd * ll + tang * ll * .55 + Vector((0, 0, -ll * .45))
            v1, v2, v3 = bm.verts.new(b), bm.verts.new(a), bm.verts.new(tip)
            bm.faces.new((v1, v2, v3))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    P.append(_obj_from_bm(bm, mat, (0, 0, 0), (0, 0, 0), 0))
    return P


def rose(loc, r, mat, mat2=None):
    P = [sph((r * 2, r * 2, r * 1.6), loc, mat, n=7, rings=4)]
    if mat2:
        P.append(sph((r * 1.1, r * 1.1, r * .9), (loc[0], loc[1], loc[2] + r * .55), mat2, n=6, rings=4))
    return P


def leafblob(loc, s, mat="leaf", rot=(0, 0, 0)):
    return sph((s * 1.6, s * .7, s * .35), loc, mat, rot=rot, n=6, rings=4)


# ====================================================================================================
# 4. trash_bin_cute
# ====================================================================================================
@piece("trash_bin_cute", "bin", "centro", collider=("cylinder", [.45, 1.3], [0, .65, 0]))
def piece_trash_bin_cute():
    P = []
    P.append(cyl(.38, .08, (0, 0, .04), "trim", n=20, bevel=.02, seg=2))
    P.append(lathe([(0, .08), (.3, .08), (.34, .16), (.385, .86), (.41, .92), (0, .92)], "base", n=24))
    for z, r in ((.34, .355), (.7, .385)):
        P.append(tube(circ(0, 0, z, r, 24, "xy"), .016, "trim", minor=5, closed=True))
    for i in range(12):
        a = 2 * pi * i / 12 + .26
        P.append(cyl(.012, .56, (.39 * cos(a), .39 * sin(a), .52), "accent", n=6))
    P.append(tube(circ(0, 0, .93, .415, 24, "xy"), .028, "trim", minor=6, closed=True))
    P.append(lathe([(0, .92), (.42, .92), (.43, .98), (.37, 1.1), (.22, 1.19), (0, 1.22)], "accent2", n=24, smooth=1))
    P.append(box((.4, .05, .22), (0, -.36, 1.07), "trim", bevel=.02, seg=2, rot=(-.5, 0, 0)))
    P.append(box((.3, .06, .13), (0, -.375, 1.07), "deep", bevel=.02, seg=2, rot=(-.5, 0, 0)))
    P += bow(.3, (.0, .18, 1.26), "soft", knot="white")
    P.append(heart(.3, .05, (0, -.395, .55), "white", bevel=.02))
    P.append(heart(.2, .06, (0, -.405, .55), "accent2", bevel=.02))
    for a in (60, 180, 300):
        P.append(sph(.07, (.34 * cos(radians(a)), .34 * sin(radians(a)), .06), "accent2", n=8, rings=5))
    return P


# ====================================================================================================
# 5. mailbox_heart
# ====================================================================================================
@piece("mailbox_heart", "mail", "centro", collider=("cylinder", [.45, 1.9], [0, .95, 0]))
def piece_mailbox_heart():
    P = []
    P.append(cyl(.42, .1, (0, 0, .05), "white", n=20, bevel=.03, seg=3))
    P.append(cyl(.34, .08, (0, 0, .14), "trim", n=20, bevel=.02))
    P.append(lathe([(0, .18), (.31, .18), (.36, .3), (.34, 1.15), (.38, 1.3), (.3, 1.5), (.16, 1.62), (0, 1.66)], "base", n=24, smooth=1))
    P.append(tube(circ(0, 0, 1.3, .385, 24, "xy"), .028, "trim", minor=6, closed=True))
    P.append(tube(circ(0, 0, .3, .355, 24, "xy"), .02, "trim", minor=5, closed=True))
    P.append(heart(.62, .07, (0, -.34, 1.02), "trim", bevel=.02))
    P.append(heart(.52, .08, (0, -.36, 1.02), "white", bevel=.025))
    P.append(box((.34, .05, .06), (0, -.4, 1.1), "deep", bevel=.02, seg=2))
    P.append(box((.4, .06, .5), (0, -.33, .62), "accent", bevel=.04, seg=2))
    P.append(box((.3, .05, .4), (0, -.36, .62), "base", bevel=.03, seg=2))
    P.append(sph(.035, (.13, -.4, .62), "trim", n=8, rings=5))
    P.append(box((.14, .04, .04), (0, -.38, .85), "white", bevel=.01))
    P.append(cyl(.012, .26, (0, 0, 1.78), "trim", n=6))
    P.append(heart(.2, .05, (0, 0, 1.98), "white", bevel=.02))
    P.append(sph(.055, (0, 0, 1.67), "trim", n=8, rings=5))
    for sx in (-1, 1):
        P.append(sph((.2, .04, .34), (sx * .42, -.04, 1.0), "white", rot=(0, sx * .5, 0), n=10, rings=6))
        P.append(sph((.14, .04, .26), (sx * .46, -.04, .8), "soft", rot=(0, sx * .7, 0), n=8, rings=5))
    P.append(cyl(.12, .03, (0, -.36, 1.42), "white", rot=(pi / 2, 0, 0), n=16, bevel=.01))
    P.append(heart(.12, .04, (0, -.39, 1.42), "accent2", bevel=.01))
    return P


# ====================================================================================================
# 6. bike_rack
# ====================================================================================================
@piece("bike_rack", "bike", "centro", collider=("box", [3.4, 1.2, .8], [0, .6, 0]), note="bicicletario com bike cruiser parada (cesta de flores)")
def piece_bike_rack():
    P = []
    P.append(prism(rr_pts(3.5, 1.0, .25, 5), .07, "xy", "white", loc=(0, 0, .035), bevel=.02, seg=2))
    P.append(prism(rr_pts(3.6, 1.1, .28, 5), .03, "xy", "trim", loc=(0, 0, .015), bevel=.01))
    for x in (-1.45, 1.45):
        pts = [Vector((x - .28, 0, .07)), Vector((x - .28, 0, .5))] + arc3(x, .5, .28, .28, pi, 0, 10) + [Vector((x + .28, 0, .5)), Vector((x + .28, 0, .07))]
        P.append(tube(pts, .04, "accent2", minor=8))
        P.append(sph(.05, (x - .28, 0, .07), "trim", n=8, rings=5))
        P.append(sph(.05, (x + .28, 0, .07), "trim", n=8, rings=5))
    zc = .43
    for wx in (-.58, .58):
        P += wheel(wx, 0, zc, .34, "deep", "trim", "white", 6)
        P.append(tube(arc3(wx, zc, .385, .385, radians(15), radians(165), 10), .018, "accent", minor=6))
    P.append(tube(smooth3([(-.58, 0, zc), (-.12, 0, .36), (.05, 0, .36)], 1), .022, "accent2", minor=6))
    P.append(tube([Vector((-.12, 0, .36)), Vector((-.2, 0, .95))], .022, "accent2", minor=6))
    P.append(tube(smooth3([(-.2, 0, .88), (.05, 0, .76), (.38, 0, .94)], 2), .024, "accent2", minor=6))
    P.append(tube([Vector((.05, 0, .36)), Vector((.4, 0, .98))], .024, "accent2", minor=6))
    P.append(tube([Vector((.4, 0, .98)), Vector((.58, 0, zc))], .02, "trim", minor=6))
    P.append(tube([Vector((-.2, 0, .88)), Vector((-.58, 0, zc))], .016, "accent2", minor=5))
    P.append(sph((.26, .13, .07), (-.22, 0, 1.0), "seat", n=10, rings=6))
    P.append(tube([Vector((.38, 0, .97)), Vector((.4, 0, 1.1))], .018, "trim", minor=6))
    P.append(tube([Vector((.4, -.3, 1.12)), Vector((.4, .3, 1.12))], .016, "trim", minor=6))
    for sy in (-1, 1):
        P.append(cyl(.026, .12, (.4, sy * .3, 1.12), "white", rot=(pi / 2, 0, 0), n=8))
    P.append(lathe([(0, 0), (.14, 0), (.18, .17), (.16, .2), (.0, .2)], "soft", loc=(.62, 0, .98), n=14))
    P.append(tube(circ(.62, 0, 1.18, .17, 14, "xy"), .012, "trim", minor=4, closed=True))
    for i, (dx, dy, m) in enumerate([(.0, 0, "accent2"), (.08, .06, "white"), (-.07, .05, "seat"), (.05, -.08, "soft")]):
        P += rose((.62 + dx, dy, 1.2 + (i % 2) * .03), .05, m)
    P.append(leafblob((.62, .1, 1.2), .08))
    P.append(leafblob((.62, -.1, 1.2), .08, rot=(0, 0, 1)))
    P.append(cyl(.06, .02, (-.0, 0, .36), "trim", rot=(pi / 2, 0, 0), n=10))
    P.append(cyl(.015, 1.3, (1.55, .35, .7), "trim", n=8))
    P.append(cyl(.2, .05, (1.55, .35, 1.4), "accent2", rot=(pi / 2, 0, 0), n=18, bevel=.012))
    P.append(heart(.2, .05, (1.55, .31, 1.4), "white", bevel=.015))
    return P


# ====================================================================================================
# 7. phone_booth_capsule
# ====================================================================================================
def arc_wall(R, h, a0, a1, thick, z0, mat, n=14):
    bm = bmesh.new()
    rows = []
    for i in range(n + 1):
        a = a0 + (a1 - a0) * i / n
        rows.append([bm.verts.new((r * cos(a), r * sin(a), z)) for r in (R, R - thick) for z in (z0, z0 + h)])
    for i in range(n):
        A, B = rows[i], rows[i + 1]
        bm.faces.new((A[0], B[0], B[1], A[1]))
        bm.faces.new((A[3], B[3], B[2], A[2]))
        bm.faces.new((A[1], B[1], B[3], A[3]))
        bm.faces.new((A[2], B[2], B[0], A[0]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _obj_from_bm(bm, mat, (0, 0, 0), (0, 0, 0), 0)


@piece("phone_booth_capsule", "booth", "centro", collider=("cylinder", [.85, 3.0], [0, 1.5, 0]), note="abertura de 110 graus para a frente (-Y Blender)")
def piece_phone_booth_capsule():
    P = []
    R, H = .8, 2.55
    P.append(cyl(.95, .12, (0, 0, .06), "white", n=28, bevel=.03, seg=3))
    P.append(tube(circ(0, 0, .13, .88, 28, "xy"), .035, "glow", minor=6, closed=True))
    P.append(cyl(.84, .08, (0, 0, .17), "accent", n=28, bevel=.02))
    gap = radians(55)
    a0, a1 = radians(270) + gap, radians(270) + 2 * pi - gap
    P.append(arc_wall(R, H - .5, a0, a1, .035, .27, "glass", 18))
    for a in (a0 + (a1 - a0) * .25, (a0 + a1) / 2, a0 + (a1 - a0) * .75):
        P.append(cyl(.05, H - .4, (R * cos(a), R * sin(a), .27 + (H - .4) / 2), "trim", n=10))
    for a in (a0, a1):
        P.append(cyl(.1, H - .3, (R * cos(a), R * sin(a), .27 + (H - .3) / 2 - .05), "soft", n=14, bevel=.012))
        P.append(sph(.12, (R * cos(a), R * sin(a), H - .1), "trim", n=10, rings=6))
    P.append(tube(circ(0, 0, 1.05, R + .01, 28, "xy"), .03, "trim", minor=6, closed=True))
    P.append(cyl(.9, .12, (0, 0, H + .02), "soft", n=28, bevel=.035, seg=3))
    P.append(lathe([(0, H + .05), (.88, H + .05), (.8, H + .2), (.5, H + .38), (.18, H + .46), (0, H + .47)], "accent2", n=28, smooth=1))
    P.append(tube(circ(0, 0, H + .06, .86, 28, "xy"), .04, "glow", minor=6, closed=True))
    P.append(sph(.1, (0, 0, H + .52), "trim", n=10, rings=6))
    P.append(cyl(.26, .06, (0, -R - .05, H + .22), "white", rot=(pi / 2, 0, 0), n=22, bevel=.015))
    P.append(cyl(.2, .03, (0, -R - .09, H + .22), "glow", rot=(pi / 2, 0, 0), n=22))
    P.append(tube([Vector((-.1, -R - .12, H + .2)), Vector((-.1, -R - .12, H + .3)), Vector((.1, -R - .12, H + .3)), Vector((.1, -R - .12, H + .2))], .02, "deep", minor=5))
    P.append(box((.34, .1, .5), (0, R - .12, 1.5), "accent2", bevel=.04, seg=2))
    P.append(box((.26, .03, .1), (0, R - .18, 1.62), "glow", bevel=.01))
    for i in range(3):
        for j in range(2):
            P.append(sph(.025, (-.07 + i * .07, R - .185, 1.45 - j * .06), "white", n=6, rings=4))
    P.append(tube([Vector((-.2, R - .15, 1.62)), Vector((-.22, R - .2, 1.62)), Vector((-.22, R - .2, 1.5)), Vector((-.2, R - .15, 1.5))], .028, "trim", minor=5))
    P.append(tube(smooth3([(-.2, R - .15, 1.5), (-.28, R - .15, 1.2), (-.2, R - .15, 1.1)], 2), .008, "deep", minor=4))
    P.append(box((.5, .22, .05), (0, R - .2, 1.05), "trim", bevel=.015))
    P.append(cyl(.2, .1, (0, .1, .27), "seat", n=14, bevel=.02))
    return P


# ====================================================================================================
# 8. vending_pod
# ====================================================================================================
@piece("vending_pod", "vending", "centro", collider=("box", [1.3, 2.3, .95], [0, 1.15, 0]))
def piece_vending_pod():
    P = []
    W, D, Hh = 1.25, .9, 2.1
    P.append(box((W + .1, D + .1, .12), (0, 0, .06), "trim", bevel=.03, seg=2))
    body = box((W, D, Hh - .1), (0, 0, .12 + (Hh - .1) / 2), "base", bevel=.1, seg=3)
    bool_cut(body, box((.8, .32, 1.3), (-.12, -D / 2 + .08, 1.35), None))
    P.append(body)
    P.append(box((W - .1, D - .05, .22), (0, 0, Hh + .04), "accent2", bevel=.08, seg=3))
    P.append(prism(rr_pts(W - .25, .3, .13, 5), .08, "xz", "white", loc=(0, -D / 2, Hh + .02), bevel=.02))
    P.append(prism(rr_pts(W - .4, .2, .09, 5), .06, "xz", "glow", loc=(0, -D / 2 - .06, Hh + .02), bevel=0))
    P.append(heart(.16, .04, (0, -D / 2 - .1, Hh + .02), "accent2", bevel=.01))
    P.append(ring_prism(rr_pts(.88, 1.37, .1, 4), rr_pts(.78, 1.27, .08, 4), .08, "trim", loc=(-.12, -D / 2 - .02, 1.35), bevel=.015))
    P.append(prism(rr_pts(.78, 1.27, .08, 4), .04, "xz", "deep", loc=(-.12, -D / 2 + .22, 1.35), bevel=0))
    cols = ["accent2", "soft", "accent", "seat", "white", "deep"]
    for row in range(4):
        z = .98 + row * .31
        P.append(box((.78, .2, .02), (-.12, -D / 2 + .08, z - .05), "trim", bevel=0))
        for k in range(4):
            c = cols[(row * 2 + k) % len(cols)]
            x = -.12 - .27 + k * .18
            if row % 2 == 0:
                P.append(cyl(.055, .17, (x, -D / 2 + .1, z + .04), c, n=10, bevel=.012))
                P.append(cyl(.057, .03, (x, -D / 2 + .1, z + .13), "trim", n=10))
            else:
                P.append(box((.1, .08, .17), (x, -D / 2 + .1, z + .04), c, bevel=.015))
    P.append(box((.8, .02, 1.29), (-.12, -D / 2 - .06, 1.35), "glass", bevel=0))
    P.append(box((.28, .06, 1.3), (.45, -D / 2, 1.28), "accent", bevel=.03))
    for i in range(5):
        P.append(sph(.045, (.45, -D / 2 - .05, 1.7 - i * .14), "glow" if i % 2 == 0 else "accent2", n=8, rings=5))
    P.append(box((.16, .04, .1), (.45, -D / 2 - .05, 1.0), "deep", bevel=.01))
    P.append(box((.74, .1, .26), (-.12, -D / 2, .43), "deep", bevel=.05, seg=2))
    P.append(box((.58, .18, .16), (-.12, -D / 2 - .05, .43), "soft", bevel=.04, seg=2, rot=(.15, 0, 0)))
    for sx in (-1, 1):
        P.append(heart(.5, .05, (sx * (W / 2 + .01), 0, 1.1), "white", rot=(0, 0, pi / 2), bevel=.02))
        P.append(heart(.34, .06, (sx * (W / 2 + .03), 0, 1.1), "accent2", rot=(0, 0, pi / 2), bevel=.02))
    P += bow(.4, (0, D / 2 - .1, Hh + .22), "soft", knot="accent2")
    for sx in (-1, 1):
        P.append(sph(.07, (sx * .5, -.35, .08), "accent2", n=8, rings=5))
    return P


# ====================================================================================================
# 9. bubble_car_parked
# ====================================================================================================
@piece("bubble_car_parked", "car", "centro", collider=("box", [1.5, 1.5, 2.4], [0, .75, 0]), note="frente do carro para -Y Blender (+Z GLB)")
def piece_bubble_car_parked():
    P = []
    L, Wd = 2.4, 1.45
    P.append(sph((Wd, L, .85), (0, 0, .62), "base", n=22, rings=12))
    P.append(box((Wd * .9, L * .72, .07), (0, 0, .24), "trim", bevel=.03, seg=2))
    for sx in (-1, 1):
        P.append(tube(smooth3([(sx * .68, -.7, .55), (sx * .72, -.2, .56), (sx * .72, .5, .55)], 2), .022, "accent2", minor=6))
        P.append(heart(.26, .03, (sx * .715, .05, .74), "accent2", rot=(0, 0, pi / 2 * sx), bevel=.01))
    P.append(sph((1.18, 1.35, .95), (0, .1, 1.08), "glass", n=22, rings=12))
    P.append(sph((1.2, 1.38, .3), (0, .1, 1.5), "accent", n=20, rings=8))
    for a in (200, 340, 90):
        P.append(tube(smooth3([(.6 * cos(radians(a)), .1 + .66 * sin(radians(a)), .65), (.55 * cos(radians(a)), .1 + .6 * sin(radians(a)), 1.2),
                              (.3 * cos(radians(a)), .1 + .35 * sin(radians(a)), 1.6)], 2), .022, "trim", minor=5))
    for sx in (-.28, .28):
        P.append(sph((.4, .4, .3), (sx, .2, .62), "seat", n=10, rings=6))
        P.append(sph((.4, .12, .5), (sx, .45, .9), "seat", n=10, rings=6))
    P.append(tube(circ(-.28, -.35, .95, .1, 12), .015, "trim", minor=4, closed=True))
    for sx in (-1, 1):
        for y in (-.78, .78):
            P.append(cyl(.27, .2, (sx * .7, y, .27), "deep", rot=(0, pi / 2, 0), n=16, bevel=.04, seg=2))
            P.append(cyl(.16, .05, (sx * .805, y, .27), "trim", rot=(0, pi / 2, 0), n=12, bevel=.012))
            P.append(cyl(.06, .06, (sx * .83, y, .27), "accent2", rot=(0, pi / 2, 0), n=8))
    for sx in (-1, 1):
        P.append(sph((.22, .12, .22), (sx * .38, -1.12, .62), "glow", n=10, rings=6))
        P.append(sph((.16, .1, .12), (sx * .42, 1.12, .6), "accent2", n=8, rings=5))
        P.append(sph((.1, .1, .1), (sx * .72, -.35, 1.02), "trim", n=8, rings=5))
    P.append(tube(smooth3([(-.55, -1.15, .36), (0, -1.22, .34), (.55, -1.15, .36)], 2), .035, "trim", minor=6))
    P.append(tube(smooth3([(-.55, 1.15, .36), (0, 1.22, .34), (.55, 1.15, .36)], 2), .035, "trim", minor=6))
    P.append(box((.4, .03, .12), (0, -1.15, .36), "white", bevel=.015))
    P.append(box((.4, .03, .12), (0, 1.14, .36), "white", bevel=.015))
    P += bow(.5, (0, -.1, 1.68), "accent2", knot="trim")
    P.append(heart(.3, .05, (0, -.75, .98), "accent2", rot=(-.9, 0, 0), bevel=.015))
    return P


# ====================================================================================================
# 10. cafe_table_set
# ====================================================================================================
def chair(loc, rz, mats=("trim", "seat", "accent")):
    P = []
    x, y, z = loc
    c, s = cos(rz), sin(rz)

    def T(p):
        return Vector((x + p[0] * c - p[1] * s, y + p[0] * s + p[1] * c, z + p[2]))
    P.append(cyl(.23, .06, tuple(T((0, 0, .46))), mats[0], n=18, bevel=.015))
    P.append(cyl(.215, .06, tuple(T((0, 0, .51))), mats[1], n=18, bevel=.025, seg=2))
    for i in range(4):
        a = pi / 4 + i * pi / 2
        p0 = T((.17 * cos(a), .17 * sin(a), .44))
        p1 = T((.26 * cos(a), .26 * sin(a), 0))
        P.append(tube([p0, T((.22 * cos(a), .22 * sin(a), .22)), p1], .014, mats[0], minor=5))
        P.append(sph(.022, tuple(p1), mats[0], n=6, rings=4))
    pts = [T((-.2, .15, .5)), T((-.22, .21, .7)), T((-.16, .24, .92)), T((0, .25, .98)), T((.16, .24, .92)), T((.22, .21, .7)), T((.2, .15, .5))]
    P.append(tube(smooth3(pts, 1), .018, mats[0], minor=6))
    P.append(tube(smooth3([T((-.13, .22, .62)), T((-.1, .24, .84)), T((0, .245, .86)), T((.1, .24, .84)), T((.13, .22, .62))], 1), .012, mats[2], minor=5))
    P.append(heart(.13, .02, tuple(T((0, .23, .74))), mats[2], rot=(0, 0, rz), bevel=.006))
    return P


@piece("cafe_table_set", "cafe_lux", "avenida", collider=("cylinder", [1.15, 1.0], [0, .5, 0]), note="guarda-sol 2.6 m de diametro a 2.1-2.65 m (nao colide)")
def piece_cafe_table_set():
    P = []
    P.append(cyl(.3, .04, (0, 0, .02), "trim", n=20, bevel=.012))
    P.append(lathe([(0, .04), (.26, .04), (.2, .1), (.07, .2), (.05, .5), (.06, .66), (.07, .7), (0, .7)], "trim", n=18))
    P.append(cyl(.55, .035, (0, 0, .72), "white", n=28, bevel=.012))
    P.append(tube(circ(0, 0, .74, .55, 28, "xy"), .02, "trim", minor=6, closed=True))
    P.append(cyl(.45, .005, (0, 0, .742), "accent", n=24))
    P.append(cyl(.025, 2.3, (0, 0, 1.35), "trim", n=8))
    P += gore_dome(1.3, .5, 8, "base", "accent2", (0, 0, 2.1), rings=4, scal=.1)
    P.append(sph(.07, (0, 0, 2.65), "trim", n=10, rings=6))
    for i in range(8):
        a = 2 * pi * i / 8
        P.append(sph(.04, (1.3 * cos(a), 1.3 * sin(a), 2.14), "trim", n=6, rings=4))
    P += chair((-.95, -.35, 0), radians(85))
    P += chair((.95, -.35, 0), radians(115))
    P.append(lathe([(0, 0), (.1, 0), (.12, .01), (.01, .01), (0, 0)], "white", loc=(-.18, -.1, .74), n=14))
    P.append(lathe([(0, .0), (.04, 0), (.05, .02), (.065, .07), (0, .07)], "white", loc=(-.18, -.1, .745), n=12))
    P.append(tube(arc3(-.18 + .065, .775, .025, .025, -pi / 2, pi / 2, 6, y=-.1), .008, "white", minor=4))
    P.append(sph((.1, .1, .02), (-.18, -.1, .816), "deep", n=8, rings=4))
    for i, m in enumerate(("accent2", "soft", "seat")):
        P.append(cyl(.035, .014, (.15, -.05, .748 + i * .03), m, n=10))
        P.append(cyl(.027, .018, (.15, -.05, .757 + i * .03), "white", n=8))
    P.append(lathe([(0, 0), (.035, 0), (.045, .05), (.02, .1), (.025, .14), (.0, .14)], "glass", loc=(.12, .2, .74), n=10))
    P += rose((.12, .2, .9), .035, "accent2")
    P.append(leafblob((.15, .2, .88), .04))
    return P


# ====================================================================================================
# 11. mannequin_display
# ====================================================================================================
@piece("mannequin_display", "mannequin", "avenida", collider=("box", [1.9, 3.0, 1.2], [0, 1.5, -.1]))
def piece_mannequin_display():
    P = []
    P.append(cyl(.95, .06, (0, -.2, .03), "trim", n=28, bevel=.015))
    P.append(cyl(.9, .2, (0, -.2, .16), "accent", n=28, bevel=.03, seg=2))
    P.append(cyl(.8, .03, (0, -.2, .27), "seat", n=28))
    pts = [(-.95, 0), (.95, 0), (.95, 2.0)] + [(.95 * cos(pi * i / 16), 2.0 + .95 * sin(pi * i / 16)) for i in range(1, 16)] + [(-.95, 2.0)]
    P.append(prism(pts, .1, "xz", "trim", loc=(0, .62, 0), bevel=.02))
    inner = [(x * .93, z * .95 + .03) for x, z in pts]
    P.append(prism(inner, .1, "xz", "base", loc=(0, .57, 0), bevel=.012))
    P.append(tube([Vector((x * .86, .5, z * .93 + .05)) for x, z in pts[2:-1]], .014, "glow", minor=5))
    P.append(box((1.9, .26, .1), (0, .6, .06), "trim", bevel=.03))
    P.append(lathe([(0, .27), (.62, .27), (.6, .36), (.5, .75), (.36, 1.0), (.2, 1.16), (0, 1.2)], "seat", loc=(0, -.2, 0), n=28, smooth=1, flute=(14, .05)))
    for z, r in ((.33, .61), (.55, .56)):
        P.append(tube(circ(0, -.2, z, r, 28, "xy"), .028, "accent", minor=6, closed=True))
    P.append(lathe([(0, 1.1), (.19, 1.1), (.16, 1.25), (.17, 1.42), (.2, 1.53), (.14, 1.58), (0, 1.58)], "seat", loc=(0, -.2, 0), n=20))
    P.append(tube(circ(0, -.2, 1.17, .2, 20, "xy"), .02, "trim", minor=5, closed=True))
    for sx in (-1, 1):
        P.append(sph((.12, .12, .1), (sx * .09, -.29, 1.47), "seat", n=8, rings=5))
    P += bow(.3, (0, -.4, 1.2), "accent", knot="trim")
    P.append(cyl(.045, .16, (0, -.2, 1.62), "white", n=10))
    P.append(sph((.2, .22, .27), (0, -.2, 1.84), "white", n=14, rings=9))
    P.append(sph((.23, .25, .24), (0, -.17, 1.9), "accent", n=14, rings=8))
    P.append(sph((.12, .12, .12), (0, -.15, 2.07), "accent", n=10, rings=6))
    P.append(tube(circ(0, -.2, 1.57, .085, 14, "xy"), .012, "trim", minor=4, closed=True))
    for ptsA in ([(-.19, -.2, 1.5), (-.3, -.2, 1.3), (-.2, -.3, 1.15)], [(.19, -.2, 1.5), (.33, -.22, 1.35), (.38, -.2, 1.15)]):
        P.append(tube(smooth3(ptsA, 2), .042, "white", minor=7))
        P.append(sph(.06, ptsA[-1], "white", n=8, rings=5))
    P.append(sph(.075, (-.19, -.2, 1.5), "white", n=8, rings=5))
    P.append(sph(.075, (.19, -.2, 1.5), "white", n=8, rings=5))
    for x, c in ((.7, "seat"), (.52, "accent")):
        yy = -.55 + (x - .6)
        P.append(box((.2, .1, .26), (x, yy, .4), c, bevel=.015, rot=(0, 0, .3)))
        P.append(tube(arc3(x, .53, .07, .08, 0, pi, 8, y=yy), .01, "trim", minor=4))
    for sx in (-1, 1):
        P.append(cyl(.07, .16, (sx * .6, .3, 3.25), "trim", rot=(1.0, 0, 0), n=10, bevel=.01))
        P.append(cyl(.035, .03, (sx * .6, .22, 3.19), "glow", rot=(1.0, 0, 0), n=10))
        P.append(tube([Vector((sx * .6, .55, 3.0)), Vector((sx * .6, .4, 3.25))], .015, "trim", minor=4))
    return P


# ====================================================================================================
# 12. palm_planter_lux
# ====================================================================================================
@piece("palm_planter_lux", "palm_lux", "avenida", collider=("cylinder", [.7, 1.0], [0, .5, 0]), note="copa ate 4.2 m de altura; so o vaso colide")
def piece_palm_planter_lux():
    P = []
    P.append(cyl(.52, .08, (0, 0, .04), "trim", n=24, bevel=.02))
    P.append(lathe([(0, .08), (.42, .08), (.5, .2), (.46, 1.0), (.52, 1.08), (.5, 1.14), (0, 1.14)], "base", n=24, smooth=1, flute=(12, .04)))
    P.append(tube(circ(0, 0, 1.1, .515, 24, "xy"), .035, "trim", minor=6, closed=True))
    P.append(tube(circ(0, 0, .22, .495, 24, "xy"), .028, "trim", minor=6, closed=True))
    P.append(tube(circ(0, 0, .66, .49, 24, "xy"), .02, "accent", minor=5, closed=True))
    for sy in (-1, 1):
        P.append(heart(.2, .03, (0, sy * .5, .6), "accent", rot=(pi / 2, 0, 0), bevel=.01))
    P.append(cyl(.42, .05, (0, 0, 1.12), "deep", n=20))
    P.append(sph((.8, .8, .22), (0, 0, 1.16), "deep", n=12, rings=6))
    for i in range(7):
        a = i * 0.9
        P.append(sph((.1, .08, .05), (.26 * cos(a), .26 * sin(a), 1.25), "white", n=6, rings=4))
    spine = smooth3([(0, 0, 1.2), (.08, .04, 2.0), (.0, .0, 2.9), (-.1, -.05, 3.6)], 2)
    P.append(tube(spine, [.14 - .05 * i / (len(spine) - 1) for i in range(len(spine))], "accent", minor=8))
    top = spine[-1]
    for i in range(15):
        a = 2 * pi * i / 15 + .3
        d = Vector((cos(a), sin(a), 0))
        ln = 1.55 - (.22 if i % 2 else 0)
        P += leaflet_frond(top + Vector((0, 0, -.05)), d + Vector((0, 0, .25 - (i % 2) * .3)), ln, .5 + (i % 3) * .1, .62, "leaf")
    P.append(sph(.12, tuple(top + Vector((0, 0, .02))), "trim", n=8, rings=5))
    for i in range(3):
        a = i * 2.1
        P.append(sph(.07, tuple(top + Vector((.13 * cos(a), .13 * sin(a), -.12))), "accent2", n=6, rings=4))
    for i in range(5):
        a = i * 1.26 + .2
        P.append(leafblob((.25 * cos(a), .25 * sin(a), 1.3), .22, "leaf", rot=(0, 0, a)))
    return P


# ====================================================================================================
# 13. flower_cart
# ====================================================================================================
def bucket(loc, mat_b, flowers, r=.2, h=.3):
    P = []
    x, y, z = loc
    P.append(lathe([(0, 0), (r * .8, 0), (r, h), (r * 1.05, h + .02), (0, h + .02)], mat_b, loc=loc, n=14))
    P.append(tube(circ(x, y, z + h, r * 1.03, 14, "xy"), .012, "trim", minor=4, closed=True))
    for i, (dx, dy, dz, m) in enumerate(flowers):
        P += rose((x + dx * r, y + dy * r, z + h + dz), .075, m, "white" if i % 3 == 0 else None)
    P.append(leafblob((x, y + r * .6, z + h + .03), .1))
    P.append(leafblob((x, y - r * .6, z + h + .03), .1, rot=(0, 0, 1.2)))
    return P


@piece("flower_cart", "flower", "jardim", collider=("box", [2.4, 1.2, 1.4], [0, .6, 0]), note="canopy a 2.3 m; carrinho com baldes de flores")
def piece_flower_cart():
    P = []
    # corpo
    P.append(box((1.8, .9, .6), (0, 0, .78), "base", bevel=.06, seg=3))
    P.append(box((1.9, 1.0, .08), (0, 0, 1.12), "accent", bevel=.03, seg=2))
    P.append(box((1.7, .8, .08), (0, 0, .46), "trim", bevel=.02))
    for sy in (-1, 1):
        for i in range(7):
            P.append(sph((.21, .06, .24), (-.75 + i * .25, sy * .46, .8), "accent", n=8, rings=5))
        P.append(tube([Vector((-.88, sy * .48, 1.0)), Vector((.88, sy * .48, 1.0))], .018, "trim", minor=5))
        P.append(tube([Vector((-.88, sy * .48, .6)), Vector((.88, sy * .48, .6))], .018, "trim", minor=5))
    P.append(heart(.34, .04, (0, -.47, .8), "accent2", bevel=.012))
    for sy in (-1, 1):
        P += wheel(0, sy * .52, .42, .4, "deep", "trim", "accent2", 8, .04)
        P.append(cyl(.03, .5, (-.85, sy * .35, .25), "trim", n=8))
        P.append(sph(.05, (-.85, sy * .35, .02), "soft", n=8, rings=5))
    P.append(tube([Vector((0, -.52, .42)), Vector((0, .52, .42))], .02, "trim", minor=5))
    # cabos de empurrar
    for sy in (-1, 1):
        P.append(tube(smooth3([(.9, sy * .35, .95), (1.25, sy * .35, 1.05), (1.35, sy * .35, 1.2)], 1), .028, "trim", minor=6))
        P.append(sph(.04, (1.35, sy * .35, 1.2), "soft", n=8, rings=5))
    # baldes e flores
    cols = ["accent2", "soft", "seat", "white", "accent"]
    pos = [(-.6, -.2), (-.2, .2), (.2, -.2), (.6, .2)]
    for k, (bx, by) in enumerate(pos):
        fl = [((i % 3 - 1) * .55, ((i // 3) - 1) * .5 * (1 if i % 2 else -1), (i % 2) * .03, cols[(i + k) % len(cols)]) for i in range(6)]
        P += bucket((bx, by, 1.16), "soft" if k % 2 else "white", fl)
    # buque grande pendurado na frente
    P += bow(.35, (0, -.52, .55), "soft", knot="accent2")
    # postes + toldo
    for sx in (-1, 1):
        P.append(cyl(.025, 1.2, (sx * .88, -.45, 1.7), "trim", n=8))
        P.append(cyl(.025, 1.2, (sx * .88, .45, 1.7), "trim", n=8))
        P.append(sph(.04, (sx * .88, -.45, 2.32), "trim", n=8, rings=5))
    P += stripes(2.1, 1.35, (0, 0, 2.3), 8, "accent2", "white", .2)
    P.append(box((2.1, .05, .05), (0, .55, 2.38), "trim", bevel=.01))
    return P


# ====================================================================================================
# 14. macaron_stand
# ====================================================================================================
def macaron(loc, r, m_shell, m_cream="white"):
    x, y, z = loc
    return [cyl(r, r * .35, (x, y, z), m_shell, n=9, bevel=r * .12, seg=1), cyl(r * .88, r * .34, (x, y, z + r * .35), m_cream, n=9),
            cyl(r, r * .35, (x, y, z + r * .7), m_shell, n=9, bevel=r * .12, seg=1)]


@piece("macaron_stand", "macaron", "jardim", collider=("cylinder", [.75, 1.0], [0, .5, 0]), note="mesa de doces com expositor de 3 andares e guarda-sol de 2 m (a 1.85-2.25 m)")
def piece_macaron_stand():
    P = []
    # mesa com toalha ondulada
    P.append(cyl(.65, .05, (0, 0, .03), "trim", n=24, bevel=.012))
    P.append(lathe([(0, .05), (.2, .05), (.14, .15), (.09, .3), (.08, .7), (0, .7)], "trim", n=16))
    P.append(lathe([(0, .85), (.62, .85), (.7, .82), (.72, .66), (.66, .64), (.5, .72), (0, .72)], "accent2", loc=(0, 0, 0), n=32, flute=(16, .05)))
    P.append(cyl(.6, .04, (0, 0, .87), "white", n=28, bevel=.012))
    P.append(tube(circ(0, 0, .72, .56, 24, "xy"), .02, "trim", minor=5, closed=True)) if False else None
    # expositor de 3 andares
    P.append(cyl(.012, .62, (0, 0, 1.2), "trim", n=6))
    cols = ["accent2", "soft", "accent", "seat", "white", "base"]
    k = 0
    for tier, (rr, zz, cnt) in enumerate(((.3, .92, 7), (.22, 1.2, 5), (.14, 1.46, 3))):
        P.append(cyl(rr, .025, (0, 0, zz), "trim", n=22, bevel=.008))
        P.append(tube(circ(0, 0, zz + .012, rr, 22, "xy"), .01, "trim", minor=4, closed=True))
        for i in range(cnt):
            a = 2 * pi * i / cnt
            P += macaron((rr * .72 * cos(a), rr * .72 * sin(a), zz + .02), .06, cols[k % len(cols)])
            k += 1
        if tier < 2:
            P.append(sph(.025, (0, 0, zz + .26 + tier * .0), "trim", n=6, rings=4))
    P.append(sph(.04, (0, 0, 1.54), "trim", n=8, rings=5))
    P.append(heart(.14, .03, (0, 0, 1.64), "accent2", bevel=.01))
    # cloche de bolo + xicara + vaso
    P.append(cyl(.15, .03, (-.36, -.15, .895), "trim", n=14, bevel=.008))
    P.append(cyl(.1, .09, (-.36, -.15, .96), "white", n=14, bevel=.02))
    P.append(sph((.12, .12, .1), (-.36, -.15, 1.03), "accent2", n=10, rings=6))
    P.append(lathe([(0, 0), (.15, 0), (.15, .02), (.12, .17), (.03, .26), (0, .27)], "glass", loc=(-.36, -.15, .91), n=14))
    P.append(sph(.025, (-.36, -.15, 1.2), "trim", n=6, rings=4))
    P.append(lathe([(0, 0), (.06, 0), (.05, .06), (.0, .06)], "white", loc=(.34, -.25, .87), n=10))
    P.append(lathe([(0, 0), (.03, 0), (.04, .06), (0, .06)], "white", loc=(.34, -.25, .93), n=10))
    # vasinho com flores
    P.append(lathe([(0, 0), (.04, 0), (.06, .1), (.03, .12), (0, .12)], "glass", loc=(.28, .22, .87), n=10))
    for i, m in enumerate(("accent2", "soft", "white")):
        P += rose((.28 + .02 * (i - 1), .22 + .02 * (i % 2), .99 + .03 * i), .03, m)
    # guarda-sol preso numa haste lateral
    P.append(cyl(.02, 1.9, (0, .55, 1.0), "trim", n=8))
    P += gore_dome(1.0, .38, 8, "accent2", "white", (0, .55, 1.85), rings=3, scal=.08)
    P.append(sph(.05, (0, .55, 2.25), "trim", n=8, rings=5))
    P.append(cyl(.55, .02, (0, .55, 1.85), "trim", n=6) if False else None)
    return P


# ====================================================================================================
# 15. rose_arch
# ====================================================================================================
@piece("rose_arch", "rose", "jardim",
       collider=("boxes", [[.5, 2.6, .5, -1.2, 1.3, 0], [.5, 2.6, .5, 1.2, 1.3, 0]], None), note="vao livre de 1.9 m x 2.6 m; passagem de jardim")
def piece_rose_arch():
    P = []
    Wd, Hs = 2.0, 2.2
    # bases (vasos de pedra com coracao)
    for sx in (-1, 1):
        x = sx * (Wd / 2 + .15)
        P.append(cyl(.34, .12, (x, 0, .06), "trim", n=18, bevel=.02))
        P.append(lathe([(0, .12), (.26, .12), (.3, .3), (.27, .5), (.32, .56), (0, .56)], "white", loc=(x, 0, 0), n=14))
        P.append(heart(.2, .03, (x, -.28, .32), "accent2", bevel=.01))
        P.append(tube([Vector((x - .13, 0, .56)), Vector((x - .13, 0, Hs))], .04, "white", minor=8))
        P.append(tube([Vector((x + .13, 0, .56)), Vector((x + .13, 0, Hs))], .04, "white", minor=8)) if False else None
    # arco de treliça (duplo)
    arc = arc3(0, Hs, Wd / 2 + .15, .85, 0, pi, 18)
    for dy in (-.12, .12):
        P.append(tube([Vector((p.x, p.y + dy, p.z)) for p in arc], .035, "white", minor=6))
    for sx in (-1, 1):
        x = sx * (Wd / 2 + .15)
        for dy in (-.12, .12):
            P.append(tube([Vector((x, dy, .56)), Vector((x, dy, Hs))], .035, "white", minor=6))
        # travessas de treliça
        for z in (.9, 1.3, 1.7):
            P.append(tube([Vector((x, -.12, z)), Vector((x, .12, z))], .02, "white", minor=4))
    for i in range(1, 18, 2):
        p = arc[i]
        P.append(tube([Vector((p.x, -.12, p.z)), Vector((p.x, .12, p.z))], .02, "white", minor=4))
    # coroa: coracao dourado no topo
    P.append(heart(.5, .1, (0, 0, Hs + .85 + .22), "trim", bevel=.03))
    P.append(heart(.34, .12, (0, -.0, Hs + .85 + .25), "accent2", bevel=.03))
    # rosas e folhas ao longo do arco e colunas
    path = [Vector((sx * (Wd / 2 + .15), 0, z)) for sx in (-1,) for z in rn(.7, Hs, 6)]
    path += [Vector((p.x, 0, p.z)) for p in arc[1:-1]]
    path += [Vector((Wd / 2 + .15, 0, z)) for z in rn(Hs, .7, 6)]
    cols = ["accent2", "seat", "accent", "soft", "accent2", "deep"]
    for i, p in enumerate(path):
        for j in range(2 if i % 2 == 0 else 1):
            ox = (-1) ** (i + j) * (.1 + .04 * j)
            oy = ((i * 7 + j * 3) % 5 - 2) * .07
            oz = ((i * 5 + j) % 3 - 1) * .08
            P += rose((p.x + ox, p.y + oy - .08 * j, p.z + oz), .095 - .015 * j, cols[(i * 2 + j) % len(cols)], "white" if (i + j) % 4 == 0 else None)
        for sy in ((-1, 1) if i % 2 == 0 else (1,)):
            P.append(leafblob((p.x - ox * .8, p.y + sy * .13, p.z + .1), .17, "leaf", rot=(0, ((i * 3) % 7) * .5, i)))
    # cacho de rosas pendurado no topo
    for k in range(4):
        P += rose((.0 + (k % 2) * .1 - .05, -.12, Hs + .85 - .1 - k * .1), .08, cols[k], None)
    # laco
    P += bow(.45, (0, -.2, Hs + .55), "soft", knot="trim")
    return P


# ====================================================================================================
# 16. swan_boat
# ====================================================================================================
@piece("swan_boat", "swan", "jardim", collider=("box", [1.5, 1.8, 3.0], [0, .9, 0]), note="origem na linha d'agua; pe do pedalinho flutua; frente (pescoco) para -Y Blender")
def piece_swan_boat():
    P = []
    # aneis de agua
    P.append(prism(ellipse := [(1.1 * cos(2 * pi * i / 28) * 1.15, 1.9 * sin(2 * pi * i / 28) * 1.15) for i in range(28)], .02, "xy", "water", loc=(0, .1, .02)))
    # casco
    P.append(sph((1.25, 2.5, 1.0), (0, .25, .38), "white", n=20, rings=10))
    P.append(box((1.3, 2.0, .1), (0, .25, .06), "accent2", bevel=.03, seg=2)) if False else None
    P.append(tube(smooth3([(-.55, -.6, .5), (-.62, .3, .55), (-.5, 1.1, .5)], 2), .035, "accent2", minor=6))
    P.append(tube(smooth3([(.55, -.6, .5), (.62, .3, .55), (.5, 1.1, .5)], 2), .035, "accent2", minor=6))
    # assento interno com almofadas
    P.append(box((1.0, .5, .16), (0, .45, .65), "soft", bevel=.06, seg=3))
    P.append(box((1.0, .14, .4), (0, .7, .85), "seat", bevel=.05, seg=3, rot=(-.15, 0, 0)))
    for sx in (-1, 1):
        P.append(sph((.3, .3, .1), (sx * .27, .42, .75), "seat", n=10, rings=6))
    # asas
    for sx in (-1, 1):
        for k, (yy, zz, sc, rx) in enumerate(((.15, .78, 1.0, .5), (.45, .85, .9, .45), (.75, .82, .8, .4))):
            P.append(sph((.18, .62 * sc, .5 * sc), (sx * .62, yy, zz + .1 * k * .0), "white", rot=(0, sx * rx, sx * -.1), n=12, rings=7))
        P.append(sph((.1, .5, .3), (sx * .72, .35, .98), "accent", rot=(0, sx * .5, 0), n=10, rings=6))
    # cauda
    for k in range(3):
        P.append(sph((.12, .5, .22), (-.18 + k * .18, 1.5, .8 + (k == 1) * .08), "white", rot=(-.5, 0, (k - 1) * .3), n=10, rings=6))
    # pescoco em S
    neck = smooth3([(0, -.95, .55), (0, -1.2, .9), (0, -1.15, 1.45), (0, -1.0, 1.95), (0, -1.15, 2.3), (0, -1.45, 2.4)], 3)
    P.append(tube(neck, [.2 - .1 * i / (len(neck) - 1) for i in range(len(neck))], "white", minor=10))
    # cabeca
    head = neck[-1]
    P.append(sph((.24, .3, .24), tuple(head), "white", n=14, rings=8))
    P.append(lathe([(0, 0), (.08, 0), (.05, .22), (0, .27)], "accent2", loc=(head.x, head.y - .2, head.z - .02), rot=(-pi / 2 - .15, 0, 0), n=10))
    P.append(sph((.06, .04, .08), (head.x, head.y - .15, head.z + .09), "deep", n=6, rings=4)) if False else None
    for sx in (-1, 1):
        P.append(sph(.04, (head.x + sx * .1, head.y - .1, head.z + .07), "deep", n=8, rings=5))
        P.append(sph(.012, (head.x + sx * .105, head.y - .135, head.z + .085), "white", n=4, rings=3))
    # coroa + colar de coracao
    P.append(tube(circ(head.x, head.y + .02, head.z + .2, .09, 8, "xy"), .015, "trim", minor=4, closed=True))
    for i in range(5):
        a = 2 * pi * i / 5
        P.append(sph(.025, (head.x + .09 * cos(a), head.y + .02 + .09 * sin(a), head.z + .27), "trim", n=6, rings=4))
    P.append(tube(circ(neck[8].x, neck[8].y, neck[8].z, .17, 12, "xy"), .02, "accent2", minor=5, closed=True))
    P += bow(.3, (0, -1.22, 1.3), "accent2", knot="trim") if False else []
    P.append(heart(.18, .04, (0, neck[8].y - .18, neck[8].z - .05), "accent2", bevel=.01)) if False else None
    # pedais/roda traseira
    P.append(cyl(.2, .08, (0, 1.55, .3), "soft", rot=(0, pi / 2, 0), n=14, bevel=.01))
    return P


# ====================================================================================================
# 17. birdcage_lamp
# ====================================================================================================
@piece("birdcage_lamp", "birdcage", "jardim", collider=("cylinder", [.4, 3.6], [0, 1.8, 0]), note="gaiola luminosa; passaro dentro")
def piece_birdcage_lamp():
    P = []
    P.append(cyl(.42, .1, (0, 0, .05), "trim", n=20, bevel=.02))
    P.append(lathe([(0, .1), (.3, .1), (.26, .2), (.14, .35), (.09, .6), (.07, 1.0), (0, 1.0)], "white", n=18))
    P.append(lathe([(0, 1.0), (.08, 1.0), (.06, 2.0), (.05, 2.6), (0, 2.6)], "trim", n=12))
    for z in (.9, 1.5, 2.2):
        P.append(tube(circ(0, 0, z, .085, 12, "xy"), .015, "trim", minor=4, closed=True))
    # bracos em volutas
    for sx in (-1, 1):
        P.append(tube(smooth3([(0, 0, 1.2), (sx * .15, 0, 1.0), (sx * .3, 0, 1.1), (sx * .27, 0, 1.28)], 2), .018, "trim", minor=5))
        P.append(sph(.04, (sx * .27, 0, 1.28), "accent2", n=6, rings=4))
    # suporte e gaiola
    cz = 3.1
    P.append(tube(smooth3([(0, 0, 2.6), (.0, -.1, 2.85), (0, 0, 3.0)], 2), .02, "trim", minor=5)) if False else None
    P.append(cyl(.03, .5, (0, 0, 2.85), "trim", n=8))
    P.append(cyl(.25, .05, (0, 0, cz - .35), "accent", n=18, bevel=.015))
    P.append(lathe([(0, cz - .38), (.23, cz - .38), (.18, cz - .32), (0, cz - .3)], "accent2", n=18))
    P.append(tube(circ(0, 0, cz - .33, .26, 16, "xy"), .02, "trim", minor=5, closed=True))
    NB = 14
    for i in range(NB):
        a = 2 * pi * i / NB
        pts = [Vector((.25 * cos(a), .25 * sin(a), cz - .33)), Vector((.33 * cos(a), .33 * sin(a), cz - .05)), Vector((.19 * cos(a), .19 * sin(a), cz + .32)), Vector((0, 0, cz + .5))]
        P.append(tube(smooth3(pts, 1), .01, "trim", minor=4, caps=False))
    P.append(tube(circ(0, 0, cz - .06, .33, 16, "xy"), .012, "trim", minor=4, closed=True))
    P.append(tube(circ(0, 0, cz + .2, .23, 16, "xy"), .012, "trim", minor=4, closed=True))
    P.append(lathe([(0, cz + .3), (.19, cz + .3), (.13, cz + .43), (0, cz + .5)], "accent2", n=16))
    P.append(tube(circ(0, 0, cz + .52, .06, 10), .014, "trim", minor=4, closed=True)) if False else None
    P.append(sph(.05, (0, 0, cz + .55), "trim", n=8, rings=5))
    P.append(heart(.14, .03, (0, 0, cz + .68), "accent2", bevel=.01))
    # luz e passarinho
    P.append(sph(.15, (0, .0, cz + .08), "glow", n=12, rings=8))
    P.append(tube([Vector((0, 0, cz - .1)), Vector((0, 0, cz - .3))], .01, "trim", minor=4)) if False else None
    P.append(box((.03, .4, .02), (0, 0, cz - .18), "trim"))
    P.append(sph((.14, .2, .16), (0, .0, cz - .12), "accent", n=10, rings=6))
    P.append(sph((.09, .09, .09), (0, -.1, cz - .02), "accent", n=8, rings=5))
    P.append(lathe([(0, 0), (.02, 0), (0, .05)], "accent2", loc=(0, -.17, cz - .02), rot=(-pi / 2, 0, 0), n=6))
    # hera / flores na base
    spine = smooth3([(.08, 0, .6), (.14, .04, 1.0), (.04, .1, 1.5), (.12, 0, 2.0)], 2)
    P.append(tube(spine, .012, "leaf", minor=4))
    for i in range(0, len(spine), 2):
        p = spine[i]
        P.append(leafblob((p.x + .06, p.y, p.z), .07, "leaf", rot=(0, 0, i)))
        if i % 4 == 0:
            P += rose((p.x - .03, p.y - .04, p.z), .04, "accent2")
    for a in (50, 170, 290):
        P += rose((.3 * cos(radians(a)), .3 * sin(radians(a)), .17), .05, "accent2" if a != 170 else "soft")
        P.append(leafblob((.28 * cos(radians(a + 20)), .28 * sin(radians(a + 20)), .13), .09, "leaf", rot=(0, 0, a)))
    return P


# ====================================================================================================
# build / export
# ====================================================================================================
def bbox_game(ob):
    xs = [v.co.x for v in ob.data.vertices]
    ys = [v.co.y for v in ob.data.vertices]
    zs = [v.co.z for v in ob.data.vertices]
    return (min(xs), max(xs)), (min(ys), max(ys)), (min(zs), max(zs))


def build_piece(spec):
    setup_mats(spec["pal"])
    parts = [p for p in spec["fn"]() if p is not None]
    if os.environ.get("PP_PROF"):
        rows = sorted(((tri_count(p), p) for p in parts), key=lambda t: -t[0])[:14]
        for t, p in rows:
            c = sum((v.co for v in p.data.vertices), Vector()) / max(1, len(p.data.vertices))
            print("   prof", t, p.data.materials[0].name if p.data.materials else "-", tuple(round(x, 2) for x in c))
        print("   parts", len(parts))
    ob = ck.finish(spec["name"], parts)
    if spec["tri_target"]:
        ck.decimate_to(ob, spec["tri_target"])
    return ob


def export_piece(spec, ob):
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, spec["name"] + ".glb")
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_yup=True,
                              export_apply=True, export_cameras=False, export_lights=False)
    (x0, x1), (y0, y1), (z0, z1) = bbox_game(ob)
    info = dict(file="props_plus/%s.glb" % spec["name"], family=spec["family"], palette=spec["pal"],
                tris=tri_count(ob), bytes=os.path.getsize(path),
                size=[round(x1 - x0, 3), round(z1 - z0, 3), round(y1 - y0, 3)],
                bbox_min=[round(x0, 3), round(z0, 3), round(-y1, 3)], bbox_max=[round(x1, 3), round(z1, 3), round(-y0, 3)],
                materials=[m.name for m in ob.data.materials if m], walkable=bool(spec["walkable"]))
    col = spec["collider"]
    if col:
        info["collider"] = dict(type=col[0], size=col[1], center=col[2])
    if spec["note"]:
        info["note"] = spec["note"]
    if spec["mount"]:
        info["mount"] = spec["mount"]
    return info


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    only = None
    if "--only" in argv:
        only = argv[argv.index("--only") + 1].split(",")
    jpath = os.path.join(OUT, "props_plus.json")
    data = dict(units="m", up="Y", front="+Z", style="porcelain/vinyl toy props plus",
                slots=["base", "accent", "accent2", "soft", "deep", "seat", "white", "trim", "glass", "glow", "leaf", "water"],
                metals={k: dict(color=v[0], roughness=v[1], metallic=1) for k, v in ck.METALS.items()},
                palettes=PALS, pieces={})
    if only and os.path.exists(jpath):
        data = json.load(open(jpath, encoding="utf-8"))
        data["palettes"] = PALS
    for spec in REG:
        if only and spec["name"] not in only:
            continue
        bpy.ops.wm.read_factory_settings(use_empty=True)
        ob = build_piece(spec)
        info = export_piece(spec, ob)
        data["pieces"][spec["name"]] = info
        print("%-20s tris=%6d  %7.1f KB  size=%s" % (spec["name"], info["tris"], info["bytes"] / 1024, info["size"]))
    os.makedirs(OUT, exist_ok=True)
    with open(jpath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    main()

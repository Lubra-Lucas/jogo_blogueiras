"""
Kit de MIAMI BEACH (Art Deco de Ocean Drive + praia). Reusa os primitivos de city_kit.py (somente leitura).
Convencoes iguais as do kit da cidade (Blender Z-up; no GLB vira Y-up e a frente -Y vira +Z):
  - predios: origem no CENTRO da pegada, na base; fachada de frente em y=-D/2 (olhando para -Y), corpo ate y=+D/2.
  - materiais por SLOT (base, accent, accent2, soft, deep, white, trim, glass, glow, glow2, leaf, wood, cloth);
    o jogo recolore por instancia (paletas em miami_kit.json), igual ao kit Y2K.
  - cada predio/prop pesado tem uma versao `lod_<peca>` (sem sobrancelhas/molduras) para as celulas distantes.
Uso: blender -b --factory-startup -noaudio --python tools/blender/miami_kit.py
Saidas: public/assets/miami/kit/*.glb, public/assets/miami/kit/kit.json e src/game/world/miami/miamiKit.json
"""
import bpy
import bmesh
import os
import sys
import json
from math import pi, sin, cos, radians, atan2, sqrt
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import city_kit as ck  # noqa
from city_kit import box, cyl, sph, tube, lathe, prism, finish, bbox, tri_count  # noqa

ROOT = ck.ROOT
OUT = os.path.join(ROOT, "public", "assets", "miami", "kit")

# ------------------------------------------------------------------------------------------------ paletas
# cores reais de Miami Beach (menta, pessego, creme, celeste, limao) com acentos turquesa e coral; pouco rosa.
METALS = {"brass_white": ("#ece6d4", 0.28, 0.55), "chrome": ("#f5f7fb", 0.12, 0.9)}


def _p(label, base, accent, accent2, soft, deep, glass, glow, glow2, metal="brass_white", leaf="#3f9b4f", wood="#b88a5c", cloth=None):
    return dict(label=label, base=base, accent=accent, accent2=accent2, soft=soft, deep=deep, white="#fffaf0",
                glass=glass, glow=glow, glow2=glow2, leaf=leaf, wood=wood, cloth=cloth or accent, metal=metal)


PALETTES = {
    "mint":   _p("Menta", "#b2e6d2", "#fffaf0", "#e9856b", "#f6ecd2", "#277c86", "#6fbcd8", "#37e6e0", "#ff7f5e"),
    "peach":  _p("Pessego", "#fbd0b0", "#fff6e6", "#2fb5b0", "#f7e0c6", "#a64b3a", "#78c2dc", "#ff8f6b", "#37e6e0"),
    "cream":  _p("Creme", "#fbf0d6", "#8fd0cf", "#e9856b", "#fff6e0", "#3a7f86", "#7cc6dc", "#ffb347", "#37e6e0"),
    "sky":    _p("Celeste", "#b4d8f2", "#fffaf0", "#f2a65a", "#d9ecf8", "#2b5f8f", "#6fbcd8", "#52e0ff", "#ffb86b"),
    "lemon":  _p("Limao", "#f8e8a6", "#fffaf0", "#3bbdb8", "#fff3c4", "#8a6a2a", "#78c2dc", "#ff7f5e", "#37e6e0"),
    "white":  _p("Branco", "#fbf7ee", "#7fd0d0", "#f08a73", "#e8e2d2", "#2f6d78", "#78c2dc", "#37e6e0", "#ffb347"),
    "aqua":   _p("Aqua", "#9ae0dc", "#fffaf0", "#fbd0b0", "#d8f0ec", "#1f6d78", "#6fbcd8", "#ff7f5e", "#ffe27a"),
    # torres de salva-vidas (cores de praia, bem saturadas) e barracas
    "lg_yellow": _p("Salva-vidas amarelo", "#f6cf45", "#fffaf0", "#e9856b", "#fff0b0", "#2b5f8f", "#78c2dc", "#ff7f5e", "#37e6e0", cloth="#e9553b"),
    "lg_turq":   _p("Salva-vidas turquesa", "#35c0bd", "#fffaf0", "#fbd0b0", "#bfeeea", "#1f6d78", "#78c2dc", "#ffb347", "#ff7f5e", cloth="#f6cf45"),
    "lg_coral":  _p("Salva-vidas coral", "#f08a73", "#fffaf0", "#35c0bd", "#ffe0d2", "#8a3a2c", "#78c2dc", "#37e6e0", "#ffe27a", cloth="#35c0bd"),
    "lg_blue":   _p("Salva-vidas azul", "#4a9fd8", "#fffaf0", "#f6cf45", "#cfe7f7", "#1f4f7f", "#78c2dc", "#ffe27a", "#ff7f5e", cloth="#f08a73"),
    "lg_green":  _p("Salva-vidas verde", "#5cc49a", "#fffaf0", "#f6cf45", "#d3f1e3", "#256f58", "#78c2dc", "#ffe27a", "#ff7f5e", cloth="#4a9fd8"),
    "nat":    _p("Natural", "#e9ddbf", "#fffaf0", "#e9856b", "#f3e8cc", "#6b4a2f", "#78c2dc", "#ffb347", "#37e6e0"),
    "terra":  _p("Terracota", "#d98a63", "#fffaf0", "#35c0bd", "#f0c7a8", "#7a3f2b", "#78c2dc", "#ffb347", "#37e6e0"),
}

SPEC = dict(base=(.30, .65, .08), accent=(.28, .7, .08), accent2=(.22, .85, .06), soft=(.3, .6, .1), deep=(.3, .6, .1),
            white=(.26, .75, .08), leaf=(.42, .25, .2), wood=(.5, .1, .3), cloth=(.7, .0, .4))


def setup_mats(pal="mint", suffix=""):
    P = PALETTES[pal]
    out = {}
    for slot, (r, c, cr) in SPEC.items():
        out[slot] = ck._mk(slot + suffix, P[slot], rough=r, coat=c, coat_rough=cr, sheen=0.0)
    mc, mr, mm = METALS[P["metal"]]
    out["trim"] = ck._mk("trim" + suffix, mc, rough=mr, metal=mm, coat=0.0)
    out["glass"] = ck._mk("glass" + suffix, P["glass"], rough=0.04, coat=0.0, alpha=0.6, spec=0.9)
    out["glow"] = ck._mk("glow" + suffix, P["glow"], rough=0.3, coat=0.0, emis=P["glow"], emis_str=6.0)
    out["glow2"] = ck._mk("glow2" + suffix, P["glow2"], rough=0.3, coat=0.0, emis=P["glow2"], emis_str=6.0)
    return out


ck.M.update(setup_mats("mint"))


# ------------------------------------------------------------------------------------------------ helpers
def bx(P, dims, loc, mat, rot=(0, 0, 0), bevel=0.0):
    P.append(box(dims, loc, mat, rot=rot, bevel=bevel, seg=2))


def mesh_obj(verts, faces, mats, midx=None, name="m"):
    """objeto a partir de listas cruas; mats = nomes de slot; midx = indice de material por face."""
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], [tuple(f) for f in faces])
    me.update()
    for m in mats:
        me.materials.append(ck.M[m])
    if midx:
        for i, p in enumerate(me.polygons):
            p.material_index = midx[i]
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def frond(length, width, droop, yaw, pitch0, base=(0, 0, 0), segs=5, mat="leaf"):
    """folha de palmeira: faixa arqueada com nervura central em V (3 vertices por corte)."""
    verts, faces = [], []
    ca, sa = cos(yaw), sin(yaw)
    for i in range(segs + 1):
        t = i / segs
        r = length * t
        # arco: sobe e cai
        h = sin(pitch0) * r - droop * r * r / length
        w = width * (sin(pi * min(1.0, t * 1.15)) ** 0.6) * (1 - 0.35 * t) + 0.02
        cx = base[0] + ca * r
        cy = base[1] + sa * r
        cz = base[2] + h
        px, py = -sa, ca
        verts.append((cx + px * w, cy + py * w, cz - w * 0.25))
        verts.append((cx, cy, cz + w * 0.12))
        verts.append((cx - px * w, cy - py * w, cz - w * 0.25))
    for i in range(segs):
        a = i * 3
        b = a + 3
        faces += [(a, a + 1, b + 1, b), (a + 1, a + 2, b + 2, b + 1)]
    ob = mesh_obj(verts, faces, [mat], None, "frond")
    # folha dupla-face: duplica invertida
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    ret = bmesh.ops.duplicate(bm, geom=list(bm.faces))
    bmesh.ops.reverse_faces(bm, faces=[f for f in ret["geom"] if isinstance(f, bmesh.types.BMFace)])
    bm.to_mesh(ob.data)
    bm.free()
    return ob


def trunk_curve(h, r0, r1, bend, n=14, ring_every=2, minor=7, lean_dir=(1, 0)):
    """tronco curvo (tubo) com aneis: pontos ao longo de uma curva suave."""
    pts, rads = [], []
    for i in range(n + 1):
        t = i / n
        off = bend * t * t
        pts.append(Vector((lean_dir[0] * off, lean_dir[1] * off, h * t)))
        rr = r0 + (r1 - r0) * t
        rads.append(rr * (1.12 if (i % ring_every == 0 and i not in (0, n)) else 1.0))
    return tube(pts, rads, "wood", minor=minor, caps=True), pts[-1]


# ------------------------------------------------------------------------------------------------ fachadas Art Deco
def window_bay(P, cx, yf, z0, w, h, lod, ebrow="white", frame="white", sill=True, glassm="glass"):
    """janela deco: vidro + moldura + 'eyebrow' (marquise fina sobre a janela) + peitoril."""
    if lod:
        bx(P, (w, 0.1, h), (cx, yf + 0.02, z0 + h / 2), glassm)
        return
    bx(P, (w + 0.24, 0.08, h + 0.24), (cx, yf + 0.0, z0 + h / 2), frame)
    bx(P, (w, 0.1, h), (cx, yf - 0.03, z0 + h / 2), glassm)
    bx(P, (w + 0.7, 0.62, 0.1), (cx, yf - 0.25, z0 + h + 0.22), ebrow)
    if sill:
        bx(P, (w + 0.3, 0.22, 0.08), (cx, yf - 0.08, z0 - 0.08), frame)


def side_windows(P, W, D, floors, fh, lod, z_first=0.9, n=2, w=1.4, h=1.6, glassm="glass"):
    """janelas dos lados (x = +-W/2): sem eyebrow em LOD; so vidros."""
    for sgn in (-1, 1):
        for fl in range(1, floors):
            for k in range(n):
                y = -D / 2 + D * (k + 1) / (n + 1)
                bx(P, (0.1, w, h), (sgn * (W / 2 + 0.0), y, fl * fh + z_first + h / 2), glassm)
        if not lod:
            for fl in range(1, floors):
                bx(P, (0.2, D + 0.3, 0.2), (sgn * (W / 2 + 0.05), 0, fl * fh), "white")


def floor_bands(P, W, D, floors, fh, mat="white", lod=False):
    for fl in range(1, floors):
        bx(P, (W + 0.3, D + 0.3, 0.2), (0, 0, fl * fh), mat)


def entrance(P, cx, yf, width, fh, canopy_mat="accent2", lod=False):
    """porta + marquise com borda neon + vitrines laterais."""
    bx(P, (width, 0.14, fh * 0.78), (cx, yf + 0.0, fh * 0.39), "deep")
    bx(P, (width * 0.72, 0.12, fh * 0.62), (cx, yf - 0.04, fh * 0.34), "glass")
    bx(P, (width + 1.6, 1.9, 0.18), (cx, yf - 0.95, fh * 0.86), canopy_mat)
    bx(P, (width + 1.6, 0.1, 0.1), (cx, yf - 1.85, fh * 0.86 - 0.06), "glow")
    if not lod:
        for sx in (-1, 1):
            bx(P, (0.14, 0.14, fh * 0.86), (cx + sx * (width / 2 + 0.7), yf - 1.75, fh * 0.43), "trim")


def neon_line(P, W, yf, z, mat="glow", thick=0.1):
    bx(P, (W, thick, thick), (0, yf - 0.06, z), mat)


def hotel_a(lod=False):
    """Hotel classico de 3 andares: pilastra central com lamina vertical neon, 'eyebrows', marquise e coroa em degraus."""
    W, D, fh, fl = 18.0, 13.0, 3.4, 3
    H = fh * fl
    P = []
    bx(P, (W, D, H), (0, 0, H / 2), "base")
    bx(P, (W + 0.5, D + 0.5, 0.5), (0, 0, H + 0.25), "white")
    bx(P, (W * 0.5, D * 0.55, 1.1), (0, 0.4, H + 1.05), "base")
    bx(P, (W * 0.5 + 0.3, D * 0.55 + 0.3, 0.2), (0, 0.4, H + 1.7), "white")
    yf = -D / 2
    floor_bands(P, W, D, fl, fh, lod=lod)
    # faixa de acento sob o parapeito
    bx(P, (W + 0.1, 0.12, 0.45), (0, yf - 0.04, H - 0.5), "accent2" if not lod else "accent")
    # fileiras de janelas (centro livre para a lamina)
    for f in range(1, fl):
        for cx in (-7.2, -4.4, 4.4, 7.2):
            window_bay(P, cx, yf, f * fh + 0.85, 1.7, 1.75, lod)
    for cx in (-7.2, -4.4, 4.4, 7.2):
        window_bay(P, cx, yf, 0.85, 1.7, 1.75, lod, sill=False)
    # lamina vertical central
    bx(P, (2.3, 0.7, H + 3.2), (0, yf - 0.35, (H + 3.2) / 2), "white")
    bx(P, (0.28, 0.16, H + 2.2), (0, yf - 0.75, (H + 2.2) / 2 + 0.2), "glow")
    for f in range(1, fl):
        bx(P, (1.2, 0.12, 1.3), (0, yf - 0.78, f * fh + 1.6), "glass")
    entrance(P, 0, yf - 0.36, 2.6, fh, lod=lod)
    neon_line(P, W - 0.6, yf, H + 0.05, "glow2")
    if not lod:
        for f in range(1, fl):
            neon_line(P, W - 0.6, yf, f * fh + 0.12, "glow", 0.08)
    side_windows(P, W, D, fl, fh, lod)
    return P


def hotel_b(lod=False):
    """Streamline Moderne: canto arredondado, faixas de velocidade, torre redonda com vigias (portholes)."""
    W, D, fh, fl = 16.0, 14.0, 3.3, 3
    H = fh * fl
    P = []
    # corpo com a quina frontal direita arredondada (raio 4.5)
    R = 4.5
    pts = [(-W / 2, -D / 2), (W / 2 - R, -D / 2)]
    for i in range(1, 7):
        a = -pi / 2 + (pi / 2) * i / 6
        pts.append((W / 2 - R + R * cos(a), -D / 2 + R + R * sin(a)))
    pts += [(W / 2, D / 2), (-W / 2, D / 2)]
    P.append(prism(pts, H, "xy", "base", loc=(0, 0, H / 2)))
    P.append(prism([(x * 1.012 + 0, y * 1.012) for x, y in pts], 0.5, "xy", "white", loc=(0, 0, H + 0.25)))
    yf = -D / 2
    # faixas continuas de vidro e linhas de velocidade brancas
    for f in range(fl):
        z = f * fh + 1.0
        bx(P, (W - R - 1.4, 0.1, 1.5), (-(R + 1.4) / 2 + 0.0, yf - 0.02, z + 0.75), "glass")
        if not lod:
            for k, dz in enumerate((1.7, 1.95, 2.2)):
                bx(P, (W - R + 0.6, 0.12, 0.07), (-(R - 0.6) / 2, yf - 0.04, f * fh + dz + 0.6), "white")
            bx(P, (W - R - 0.8, 0.42, 0.08), (-(R + 0.8) / 2 + 0.0, yf - 0.2, z + 1.68), "white")
    # torre redonda no canto esquerdo
    tr = 2.4
    P.append(cyl(tr, H + 3.2, (-W / 2 + 1.0, yf + 1.2, (H + 3.2) / 2), "accent", n=18))
    P.append(cyl(tr + 0.25, 0.3, (-W / 2 + 1.0, yf + 1.2, H + 3.3), "white", n=18))
    if not lod:
        for f in range(0, fl):
            ph = sph((0.95, 0.2, 0.95), (-W / 2 + 1.0, yf + 1.2 - tr, f * fh + 1.8), "glass", n=8, rings=5)
            P.append(ph)
            P.append(sph((1.2, 0.14, 1.2), (-W / 2 + 1.0, yf + 1.2 - tr + 0.04, f * fh + 1.8), "white", n=8, rings=4))
    bx(P, (0.34, 0.2, H + 1.2), (-W / 2 + 1.0, yf + 1.2 - tr - 0.05, (H + 1.2) / 2 + 1.2), "glow")
    # entrada
    entrance(P, 1.8, yf, 2.8, fh, canopy_mat="accent", lod=lod)
    bx(P, (W - 1, 0.12, 0.12), (0, yf - 0.06, H - 0.35), "glow2")
    side_windows(P, W, D, fl, fh, lod, n=3)
    # chamine/coroa
    bx(P, (5, 4, 1.2), (3, 2, H + 1.1), "accent")
    return P


def hotel_c(lod=False):
    """Hotel largo e baixo, 2 andares + bloco central mais alto com arcos (colunata) e letreiro neon horizontal."""
    W, D, fh, fl = 24.0, 12.0, 3.6, 2
    H = fh * fl
    P = []
    bx(P, (W, D, H), (0, 0, H / 2), "base")
    bx(P, (8.0, D * 0.9, 3.6), (0, 0.5, H + 1.8), "base")
    bx(P, (8.6, D * 0.9 + 0.6, 0.4), (0, 0.5, H + 3.8), "white")
    bx(P, (W + 0.5, D + 0.5, 0.45), (0, 0, H + 0.22), "white")
    yf = -D / 2
    floor_bands(P, W, D, fl, fh, lod=lod)
    # colunata no terreo: 6 colunas + recuo escuro
    xs = [-10.0, -6.0, -2.0, 2.0, 6.0, 10.0]
    bx(P, (W - 1.5, 1.4, fh * 0.85), (0, yf + 0.7, fh * 0.43), "deep")
    for x in xs:
        P.append(cyl(0.3, fh * 0.95, (x, yf - 0.3, fh * 0.48), "white", n=8 if lod else 12))
    bx(P, (W - 0.6, 1.2, 0.3), (0, yf - 0.3, fh * 0.98), "accent")
    for k in range(5):
        cx = -8.0 + 4.0 * k
        bx(P, (2.6, 0.1, 2.0), (cx, yf + 1.35, 1.3), "glass")
    for cx in (-9, -5.5, 5.5, 9):
        window_bay(P, cx, yf, fh + 0.9, 2.0, 1.8, lod)
    for cx in (-2.0, 0.0, 2.0):
        bx(P, (1.3, 0.1, 1.7), (cx, yf + 0.4 - 0.5, H + 1.1 + 0.8), "glass")
    # letreiro neon horizontal no bloco central
    bx(P, (7.0, 0.3, 1.0), (0, yf + 0.4 - 0.35, H + 2.95), "deep")
    bx(P, (6.6, 0.1, 0.6), (0, yf + 0.4 - 0.55, H + 2.95), "glow")
    neon_line(P, W - 1, yf - 0.05, H + 0.02, "glow2")
    # mastro com bandeirola
    P.append(cyl(0.07, 3.4, (-W / 2 + 1, 0, H + 1.9), "trim", n=6))
    bx(P, (0.06, 1.2, 0.7), (-W / 2 + 1, -0.6, H + 3.2), "accent2")
    side_windows(P, W, D, fl, fh, lod)
    return P


def tower_deco(lod=False):
    """Torre esguia de 5 andares em degraus com pinaculo (estilo Art Deco), neon nas arestas."""
    W, D, fh = 9.0, 9.0, 3.3
    P = []
    tiers = [(W, D, 3 * fh), (W * 0.82, D * 0.82, 1.4 * fh), (W * 0.6, D * 0.6, 1.1 * fh)]
    z = 0.0
    for i, (w, d, h) in enumerate(tiers):
        bx(P, (w, d, h), (0, 0, z + h / 2), "base" if i != 1 else "accent")
        bx(P, (w + 0.35, d + 0.35, 0.3), (0, 0, z + h + 0.15), "white")
        z += h + 0.3
    P.append(cyl(0.45, 3.4, (0, 0, z + 1.7), "white", n=8))
    P.append(cyl(0.12, 4.5, (0, 0, z + 5.4), "trim", n=6))
    P.append(sph((0.5, 0.5, 0.5), (0, 0, z + 7.8), "glow", n=8, rings=5))
    yf = -D / 2
    for f in range(3):
        for cx in (-2.6, 0, 2.6):
            window_bay(P, cx, yf, f * fh + 0.9, 1.5, 1.7, lod)
    for cx in (-1.8, 1.8):
        window_bay(P, cx, yf * 0.82, 3 * fh + 0.3 + 0.7, 1.3, 1.6, lod, sill=False)
    # arestas neon verticais
    for sx in (-1, 1):
        bx(P, (0.16, 0.16, 3 * fh - 0.4), (sx * (W / 2 + 0.04), yf - 0.04, 3 * fh / 2), "glow")
    entrance(P, 0, yf, 2.2, fh, lod=lod)
    for sgn in (-1, 1):
        for f in range(3):
            bx(P, (0.1, 1.4, 1.6), (sgn * W / 2, 0, f * fh + 1.7), "glass")
    return P


def shop_deco(lod=False):
    """Loja baixa de calcada (surf shop / sorveteria / moda praia): vitrine larga, toldo listrado, placa neon."""
    W, D, H = 11.0, 9.0, 5.0
    P = []
    bx(P, (W, D, H), (0, 0, H / 2), "base")
    bx(P, (W + 0.4, D + 0.4, 0.4), (0, 0, H + 0.2), "white")
    bx(P, (W * 0.55, 0.5, 1.7), (0, -D / 2 + 0.25, H + 1.25), "base")
    bx(P, (W * 0.55 + 0.3, 0.8, 0.2), (0, -D / 2 + 0.35, H + 2.2), "white")
    yf = -D / 2
    # vitrine + porta
    bx(P, (W - 2.0, 0.12, 2.5), (0, yf - 0.02, 1.7), "glass")
    for x in (-3.9, -1.3, 1.3, 3.9):
        bx(P, (0.12, 0.14, 2.6), (x, yf - 0.06, 1.7), "trim")
    bx(P, (1.5, 0.16, 2.3), (0, yf - 0.08, 1.2), "deep")
    # toldo listrado (7 listras)
    n = 7
    sw = (W - 0.6) / n
    for k in range(n):
        m = "accent2" if k % 2 == 0 else "white"
        bx(P, (sw, 2.2, 0.14), (-W / 2 + 0.3 + sw * (k + 0.5), yf - 1.0, 3.55 - 0.1), m, rot=(radians(-9), 0, 0))
    bx(P, (W - 0.6, 0.14, 0.3), (0, yf - 2.05, 3.3), "accent2")
    # placa neon
    bx(P, (W * 0.5, 0.2, 1.0), (0, yf - 0.1, H - 0.2), "deep")
    bx(P, (W * 0.5 - 0.4, 0.1, 0.5), (0, yf - 0.22, H - 0.2), "glow")
    bx(P, (W - 0.8, 0.1, 0.1), (0, yf - 0.06, H + 0.45), "glow2")
    if not lod:
        window_bay(P, -3.6, yf, H - 1.0, 0.0001, 0.0001, True)
    return P


def airport_terminal(lod=False):
    """Terminal do aeroporto: asa esquerda e direita fechadas, saguao central aberto (balcao de check-in entre elas)
    sob uma grande marquise ondulada branca, torre de controle na ponta, letreiro neon."""
    W, D, H = 38.0, 16.0, 7.2
    P = []
    yf = -D / 2
    # asas (corpos fechados)
    for sx in (-1, 1):
        x = sx * (W / 2 - 7.0)
        bx(P, (14.0, D, H), (x, 0, H / 2), "base")
        bx(P, (14.6, D + 0.6, 0.5), (x, 0, H + 0.25), "white")
        bx(P, (12.0, 0.12, 4.2), (x, yf - 0.02, 3.4), "glass")
        for k in range(1, 6):
            bx(P, (0.12, 0.16, 4.3), (x - 6.0 + k * 2.0, yf - 0.06, 3.4), "trim")
        bx(P, (14.0, 0.14, 0.4), (x, yf - 0.05, 5.8), "accent")
        bx(P, (13.0, 0.1, 0.1), (x, yf - 0.1, H + 0.55), "glow")
    # fundo do saguao
    bx(P, (W - 28.0 + 0.2, 1.0, H), (0, D / 2 - 0.5, H / 2), "base")
    bx(P, (W - 28.0, 0.1, 5.0), (0, D / 2 - 1.05, 2.9), "glass")
    # marquise central ondulada sobre o saguao (tres lajes inclinadas)
    for k, (z, tilt) in enumerate(((H + 0.8, 0), (H + 1.5, 0))):
        bx(P, (W + 1.0, D + 3.0, 0.45), (0, -1.2, z), "white", rot=(radians(-3), 0, 0))
    bx(P, (W + 1.0, 0.5, 1.1), (0, yf - 2.4, H + 1.3), "accent")
    if not lod:
        bx(P, (W - 3, 0.12, 0.14), (0, yf - 2.7, H + 1.1), "glow")
    # pilares do saguao
    for x in (-5.0, 5.0):
        P.append(cyl(0.4, H + 0.6, (x, yf + 1.0, (H + 0.6) / 2), "white", n=10))
    # torre de controle (ponta esquerda, fora da pegada principal)
    tx = -W / 2 - 3.0
    P.append(cyl(1.4, 15.0, (tx, 1.5, 7.5), "base", n=14))
    P.append(cyl(2.4, 0.5, (tx, 1.5, 15.2), "white", n=14))
    P.append(cyl(2.2, 2.4, (tx, 1.5, 16.6), "glass", n=14))
    P.append(cyl(2.5, 0.35, (tx, 1.5, 18.0), "accent2", n=14))
    P.append(cyl(0.08, 3.4, (tx, 1.5, 19.8), "trim", n=6))
    P.append(sph((0.28, 0.28, 0.28), (tx, 1.5, 21.6), "glow2", n=8, rings=5))
    # letreiro "AEROPORTO" (placa luminosa)
    bx(P, (12.0, 0.3, 1.5), (0, yf - 2.55, H + 3.0), "deep")
    bx(P, (11.4, 0.1, 0.9), (0, yf - 2.75, H + 3.0), "glow")
    return P


def checkin_counter(lod=False):
    """Balcao de check-in: bancada curva em duas cores, tela, placa com aviao luminoso e cordao de fila."""
    P = []
    bx(P, (6.0, 1.4, 1.05), (0, 0, 0.52), "white", bevel=0.05)
    bx(P, (6.2, 1.6, 0.1), (0, 0, 1.08), "deep")
    bx(P, (5.6, 0.08, 0.5), (0, -0.74, 0.6), "accent2")
    bx(P, (0.7, 0.05, 0.5), (-1.4, 0.0, 1.45), "deep")
    bx(P, (0.6, 0.03, 0.4), (-1.4, -0.03, 1.46), "glass")
    bx(P, (0.7, 0.05, 0.5), (1.4, 0.0, 1.45), "deep")
    bx(P, (0.6, 0.03, 0.4), (1.4, -0.03, 1.46), "glass")
    # placa alta
    bx(P, (0.14, 0.14, 2.6), (-2.6, 0.55, 1.3), "trim")
    bx(P, (0.14, 0.14, 2.6), (2.6, 0.55, 1.3), "trim")
    bx(P, (6.0, 0.22, 1.1), (0, 0.55, 2.9), "deep")
    bx(P, (5.6, 0.1, 0.7), (0, 0.4, 2.9), "glow")
    # aviao estilizado na placa
    bx(P, (1.7, 0.12, 0.12), (0, 0.32, 2.9), "white")
    bx(P, (0.6, 0.12, 0.5), (-0.1, 0.32, 2.9), "white", rot=(0, radians(25), 0))
    # postes de fila
    for x in (-2.0, 2.0):
        P.append(cyl(0.04, 0.9, (x, -2.0, 0.45), "trim", n=6))
        P.append(cyl(0.16, 0.05, (x, -2.0, 0.03), "trim", n=8))
    P.append(tube([Vector((-2, -2, 0.82)), Vector((0, -2, 0.7)), Vector((2, -2, 0.82))], 0.025, "accent2", minor=4))
    return P


def airplane_deco(lod=False):
    """Aviao de jato estilizado (escultura de entrada do aeroporto, pousado numa base)."""
    P = []
    L = 9.0
    P.append(lathe([(0, -L / 2), (0.55, -L / 2 + 0.5), (0.9, -L / 2 + 1.8), (0.95, L / 2 - 2.2), (0.7, L / 2 - 0.6), (0.18, L / 2)], "white", loc=(0, 0, 0), rot=(pi / 2, 0, 0), n=14))
    P.append(sph((1.0, 1.4, 0.8), (0, -L / 2 + 0.8, 0.28), "glass", n=10, rings=6))
    bx(P, (L * 0.9, 1.9, 0.12), (0, 0.3, -0.12), "white", rot=(0, 0, 0))
    # asas
    for sx in (-1, 1):
        bx(P, (3.8, 1.5, 0.12), (sx * 2.9, 0.4, -0.12), "white", rot=(0, 0, sx * radians(-18)))
        bx(P, (0.4, 0.9, 0.5), (sx * 5.0, 1.7, 0.1), "accent2")
        P.append(cyl(0.38, 1.3, (sx * 2.4, -0.4, -0.55), "trim", rot=(pi / 2, 0, 0), n=10))
    # cauda
    bx(P, (0.14, 1.8, 2.0), (0, L / 2 - 1.2, 1.1), "accent2", rot=(radians(-10), 0, 0))
    bx(P, (3.0, 1.0, 0.1), (0, L / 2 - 0.6, 0.35), "white")
    # janelinhas
    if not lod:
        for k in range(10):
            for sx in (-1, 1):
                bx(P, (0.04, 0.22, 0.2), (sx * 0.93, -2.2 + k * 0.55, 0.32), "deep")
        bx(P, (1.9, 0.1, 0.12), (0, 0.5, 0.0), "accent")
    # base
    P.append(cyl(0.12, 1.5, (0, 0, -1.2), "trim", n=8))
    P.append(cyl(2.2, 0.3, (0, 0, -2.0), "white", n=18))
    return P


# ------------------------------------------------------------------------------------------------ vegetacao
def palm_royal(lod=False):
    """Palmeira-real alta (~9.5 m): tronco liso afinando, aneis, copa de fronds arqueadas e cocos."""
    P = []
    n, minor = (6, 5) if lod else (14, 7)
    tk, top = trunk_curve(9.0, 0.30, 0.17, 0.9, n=n, ring_every=2, minor=minor)
    P.append(tk)
    top = Vector(top)
    cnt = 8 if lod else 12
    for i in range(cnt):
        yaw = 2 * pi * i / cnt + (0.2 if i % 2 else 0)
        pitch = radians(32 if i % 2 else 12)
        L = 3.7 if i % 2 else 4.2
        P.append(frond(L, 0.62 if not lod else 0.8, 2.1, yaw, pitch, base=(top.x, top.y, top.z), segs=3 if lod else 5))
    # coroa e cocos
    if not lod:
        P.append(sph((0.55, 0.55, 0.45), (top.x, top.y, top.z - 0.15), "wood", n=8, rings=5))
        for k in range(4):
            a = 2 * pi * k / 4
            P.append(sph((0.28, 0.28, 0.28), (top.x + cos(a) * 0.42, top.y + sin(a) * 0.42, top.z - 0.55), "leaf", n=6, rings=4))
    return P


def palm_coconut(lod=False):
    """Coqueiro inclinado (~6.5 m), mais cheio e arqueado."""
    P = []
    n, minor = (5, 5) if lod else (12, 7)
    tk, top = trunk_curve(6.2, 0.26, 0.15, 1.9, n=n, ring_every=3, minor=minor, lean_dir=(0.8, 0.6))
    P.append(tk)
    top = Vector(top)
    cnt = 8 if lod else 11
    for i in range(cnt):
        yaw = 2 * pi * i / cnt + 0.4
        P.append(frond(3.3, 0.55 if not lod else 0.75, 2.0, yaw, radians(28 if i % 2 else 6), base=(top.x, top.y, top.z), segs=3 if lod else 5))
    if not lod:
        for k in range(5):
            a = 2 * pi * k / 5
            P.append(sph((0.24, 0.24, 0.24), (top.x + cos(a) * 0.36, top.y + sin(a) * 0.36, top.z - 0.5), "wood", n=6, rings=4))
    return P


def palm_small(lod=False):
    """Palmeira ornamental baixa (~2.8 m) para vasos e jardineiras."""
    P = []
    tk, top = trunk_curve(1.6, 0.14, 0.1, 0.2, n=4 if lod else 6, ring_every=2, minor=5)
    P.append(tk)
    top = Vector(top)
    for i in range(7 if lod else 10):
        yaw = 2 * pi * i / (7 if lod else 10)
        P.append(frond(1.7, 0.4, 1.3, yaw, radians(34 if i % 2 else 12), base=(top.x, top.y, top.z), segs=3))
    return P


def shrub(lod=False):
    P = []
    for (x, y, z, r) in ((0, 0, 0.55, 0.65), (0.5, 0.2, 0.42, 0.45), (-0.45, -0.1, 0.4, 0.42), (0.1, -0.5, 0.38, 0.38)):
        P.append(sph((r * 2, r * 2, r * 1.5), (x, y, z), "leaf", n=8, rings=5))
    for (x, y, z) in ((0.2, 0.3, 0.85), (-0.3, 0.1, 0.78)):
        P.append(sph((0.2, 0.2, 0.2), (x, y, z), "accent2", n=6, rings=4))
    return P


# ------------------------------------------------------------------------------------------------ praia
def lifeguard_tower(lod=False):
    """Torre de salva-vidas de Miami Beach: cabine colorida sobre palafitas, escada, janelas, bandeira e cruz."""
    P = []
    S = 1.9
    # palafitas
    for sx in (-1, 1):
        for sy in (-1, 1):
            bx(P, (0.16, 0.16, 2.0), (sx * 0.85, sy * 0.85, 1.0), "white")
    bx(P, (1.9, 1.9, 0.14), (0, 0, 2.0), "wood")
    bx(P, (1.9, 0.08, 0.7), (0, -0.85, 2.4), "white")
    # deck frontal
    bx(P, (2.5, 1.0, 0.1), (0, -1.55, 2.05), "wood")
    for x in (-1.2, 1.2):
        bx(P, (0.05, 0.9, 0.8), (x, -1.55, 2.5), "white")
    bx(P, (2.5, 0.05, 0.05), (0, -2.0, 2.9), "white")
    # cabine
    bx(P, (2.0, 1.7, 1.55), (0, 0.15, 2.9), "base", bevel=0.03)
    bx(P, (1.1, 0.08, 0.7), (-0.25, -0.72, 3.05), "glass")
    bx(P, (0.06, 1.0, 0.7), (1.02, 0.1, 3.05), "glass")
    bx(P, (0.06, 1.0, 0.7), (-1.02, 0.1, 3.05), "glass")
    # telhado inclinado (aba frontal)
    bx(P, (2.7, 2.6, 0.12), (0, -0.1, 3.82), "accent2", rot=(radians(-9), 0, 0))
    bx(P, (2.7, 0.12, 0.2), (0, -1.38, 3.72), "white")
    # cruz salva-vidas
    bx(P, (0.5, 0.05, 0.14), (0.62, -0.75, 3.3), "white")
    bx(P, (0.14, 0.05, 0.5), (0.62, -0.75, 3.3), "white")
    # escada lateral
    # degraus: escada inclinada na frente
    for sx in (-1, 1):
        bx(P, (0.07, 0.07, 2.4), (sx * 0.5, -2.7, 1.05), "white", rot=(radians(-34), 0, 0))
    for k in range(7):
        z = 0.22 + k * 0.28
        y = -3.55 + (z / 2.0) * 1.35
        bx(P, (1.0, 0.3, 0.06), (0, y, z), "wood")
    # mastro e bandeira (pano)
    P.append(cyl(0.035, 2.2, (0.85, 0.7, 4.7), "trim", n=6))
    bx(P, (0.04, 0.8, 0.5), (0.85, 0.35, 5.45), "cloth")
    # sapatas
    for sx in (-1, 1):
        for sy in (-1, 1):
            bx(P, (0.34, 0.34, 0.1), (sx * 0.85, sy * 0.85, 0.05), "white")
    return P


def umbrella(lod=False):
    """Guarda-sol listrado (8 gomos alternando accent2/white), mastro curvo."""
    P = []
    P.append(cyl(0.025, 2.4, (0, 0, 1.2), "trim", n=6))
    R, H, n = 1.15, 0.5, 8
    verts = [(0, 0, 2.4 + H)]
    faces, midx = [], []
    ring = []
    for i in range(n * 2):
        a = 2 * pi * i / (n * 2)
        verts.append((cos(a) * R, sin(a) * R, 2.4 + 0.0))
    for i in range(n * 2):
        j = (i + 1) % (n * 2)
        faces.append((0, 1 + i, 1 + j))
        midx.append((i % 4) // 2)
    P.append(mesh_obj(verts, faces, ["accent2", "white"], midx, "umb"))
    P.append(sph((0.07, 0.07, 0.07), (0, 0, 2.95), "trim", n=6, rings=4))
    return P


def lounger(lod=False):
    """Espreguicadeira: base baixa, encosto inclinado, almofada listrada e toalha."""
    P = []
    bx(P, (0.68, 1.5, 0.08), (0, 0.0, 0.32), "trim", bevel=0.02)
    bx(P, (0.68, 0.8, 0.08), (0, 0.95, 0.62), "trim", rot=(radians(-34), 0, 0), bevel=0.02)
    for sx in (-1, 1):
        bx(P, (0.05, 0.05, 0.32), (sx * 0.3, -0.62, 0.16), "trim")
        bx(P, (0.05, 0.05, 0.32), (sx * 0.3, 0.55, 0.16), "trim")
    bx(P, (0.62, 1.42, 0.1), (0, 0.0, 0.4), "accent", bevel=0.03)
    bx(P, (0.62, 0.78, 0.1), (0, 0.92, 0.7), "accent", rot=(radians(-34), 0, 0), bevel=0.03)
    bx(P, (0.62, 0.4, 0.04), (0, -0.3, 0.46), "accent2")
    bx(P, (0.62, 0.2, 0.04), (0, 0.2, 0.46), "accent2")
    return P


def beach_towel(lod=False):
    P = []
    bx(P, (0.8, 1.7, 0.03), (0, 0, 0.02), "accent2")
    bx(P, (0.8, 0.2, 0.035), (0, 0.4, 0.022), "white")
    bx(P, (0.8, 0.2, 0.035), (0, -0.2, 0.022), "white")
    return P


def beach_bar(lod=False):
    """Quiosque de praia (tiki bar): balcao de madeira, telhado de palha em duas camadas, banquinhos, prateleira neon."""
    P = []
    bx(P, (5.0, 3.0, 0.18), (0, 0, 0.09), "wood")
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(cyl(0.11, 2.6, (sx * 2.3, sy * 1.35, 1.4), "wood", n=7))
    bx(P, (4.6, 0.9, 1.05), (0, -0.55, 0.7), "white", bevel=0.03)
    bx(P, (4.9, 1.15, 0.1), (0, -0.55, 1.28), "wood")
    bx(P, (4.4, 0.1, 0.7), (0, 1.3, 1.4), "deep")
    bx(P, (4.0, 0.08, 0.1), (0, 1.22, 1.75), "glow")
    # telhado de palha: duas pirâmides achatadas
    cone1 = lathe([(0, 0), (3.5, 0), (3.5, 0.08), (0, 1.0)], "soft", loc=(0, 0, 2.5), n=12)
    cone2 = lathe([(0, 0), (2.4, 0), (0, 0.8)], "soft", loc=(0, 0, 3.3), n=10)
    P += [cone1, cone2]
    P.append(cyl(0.08, 0.5, (0, 0, 4.2), "wood", n=6))
    for k in range(4):
        x = -1.8 + 1.2 * k
        P.append(cyl(0.2, 0.06, (x, -1.6, 0.68), "accent2", n=8))
        P.append(cyl(0.04, 0.6, (x, -1.6, 0.33), "trim", n=5))
    return P


def cabana(lod=False):
    """Cabana do Beach Club: 4 postes, dossel de pano branco, cortinas, sofa-cama com almofadas."""
    P = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(cyl(0.07, 2.7, (sx * 1.6, sy * 1.2, 1.35), "wood", n=7))
    bx(P, (3.7, 2.9, 0.1), (0, 0, 2.72), "white", rot=(0, 0, 0))
    bx(P, (3.9, 0.1, 0.34), (0, -1.45, 2.58), "accent2")
    bx(P, (3.9, 0.1, 0.34), (0, 1.45, 2.58), "accent2")
    for sx in (-1, 1):
        bx(P, (0.06, 0.9, 1.8), (sx * 1.64, -1.0, 1.7), "cloth")
        bx(P, (0.06, 0.9, 1.8), (sx * 1.64, 1.0, 1.7), "cloth")
    bx(P, (2.9, 1.7, 0.35), (0, 0, 0.3), "white", bevel=0.05)
    bx(P, (2.7, 1.5, 0.2), (0, 0, 0.55), "soft", bevel=0.06)
    for x in (-1.0, 0.0, 1.0):
        bx(P, (0.5, 0.2, 0.4), (x, 0.55, 0.85), "accent2" if x == 0 else "accent", rot=(radians(-18), 0, 0), bevel=0.06)
    bx(P, (0.6, 0.6, 0.45), (2.2, 0.0, 0.25), "wood")
    return P


def vball_net(lod=False):
    """Rede de volei de praia: dois postes, rede quadriculada simples e faixa superior."""
    P = []
    for sx in (-1, 1):
        P.append(cyl(0.05, 2.5, (sx * 4.5, 0, 1.25), "trim", n=6))
    bx(P, (9.0, 0.03, 0.98), (0, 0, 1.75), "white")
    bx(P, (9.0, 0.05, 0.1), (0, 0, 2.26), "accent2")
    bx(P, (9.0, 0.05, 0.06), (0, 0, 1.26), "accent2")
    # linhas da rede (grade fina)
    if not lod:
        for k in range(1, 18):
            bx(P, (0.012, 0.045, 0.98), (-4.5 + k * 0.5, 0, 1.75), "deep")
    return P


def surf_rack(lod=False):
    """Expositor de pranchas coloridas (5 pranchas em pe) com varas de madeira."""
    P = []
    cols = ["accent2", "base", "white", "accent", "soft"]
    for k in range(5):
        x = -1.0 + 0.5 * k
        P.append(sph((0.38, 0.1, 2.0 + (k % 2) * 0.2), (x, 0, 1.05 + (k % 2) * 0.1), cols[k], n=8, rings=6))
    bx(P, (2.8, 0.08, 0.08), (0, -0.2, 0.55), "wood")
    bx(P, (2.8, 0.08, 0.08), (0, 0.2, 0.55), "wood")
    for sx in (-1, 1):
        bx(P, (0.08, 0.6, 0.55), (sx * 1.4, 0, 0.28), "wood")
    return P


def icecream_cart(lod=False):
    """Carrinho de sorvete retro: caixa em duas cores, toldo listrado, 2 rodas, placa com casquinha luminosa."""
    P = []
    bx(P, (2.0, 1.2, 0.9), (0, 0, 0.8), "white", bevel=0.05)
    bx(P, (2.05, 1.25, 0.12), (0, 0, 1.27), "accent2")
    bx(P, (1.9, 0.08, 0.5), (0, -0.62, 0.55), "accent")
    for sx in (-1, 1):
        P.append(cyl(0.38, 0.12, (sx * 0.8, 0.0, 0.38), "deep", rot=(0, pi / 2, 0), n=12))
        P.append(cyl(0.16, 0.14, (sx * 0.8, 0.0, 0.38), "trim", rot=(0, pi / 2, 0), n=8))
    P.append(cyl(0.04, 1.9, (-0.9, 0.5, 2.2), "trim", n=5))
    P.append(cyl(0.04, 1.9, (0.9, 0.5, 2.2), "trim", n=5))
    n = 6
    for k in range(n):
        m = "accent2" if k % 2 == 0 else "white"
        bx(P, (2.2 / n, 1.8, 0.07), (-1.1 + 2.2 / n * (k + 0.5), 0.1, 2.88), m, rot=(radians(-10), 0, 0))
    # casquinha na lateral frontal
    P.append(sph((0.36, 0.2, 0.36), (0, -0.68, 1.78), "glow2", n=8, rings=5))
    P.append(sph((0.28, 0.16, 0.28), (0, -0.68, 2.0), "glow", n=8, rings=5))
    return P


def kiosk_deco(lod=False):
    """Quiosque art deco de calcada (4 x 3 m): janela de atendimento, marquise, topo escalonado e neon."""
    P = []
    bx(P, (4.0, 3.0, 2.8), (0, 0, 1.4), "base", bevel=0.04)
    bx(P, (4.3, 3.3, 0.25), (0, 0, 2.9), "white")
    bx(P, (2.4, 1.8, 0.8), (0, 0.2, 3.4), "accent")
    bx(P, (2.7, 2.1, 0.18), (0, 0.2, 3.9), "white")
    bx(P, (3.0, 0.1, 1.3), (0, -1.5, 1.6), "glass")
    bx(P, (3.4, 0.9, 0.12), (0, -1.9, 2.5), "accent2", rot=(radians(8), 0, 0))
    bx(P, (3.4, 0.08, 0.08), (0, -2.3, 2.42), "glow")
    bx(P, (3.2, 0.5, 0.1), (0, -1.65, 0.98), "wood")
    bx(P, (3.5, 0.1, 0.12), (0, -1.55, 2.78), "glow2")
    return P


def lamp_deco(lod=False):
    """Poste art deco: fuste esguio, braco duplo com globos que acendem a noite, base escalonada."""
    P = []
    P.append(cyl(0.2, 0.25, (0, 0, 0.12), "white", n=8 if lod else 10))
    P.append(cyl(0.12, 3.8, (0, 0, 2.0), "deep", n=6 if lod else 8))
    bx(P, (1.2, 0.08, 0.08), (0, 0, 3.8), "trim")
    for sx in (-1, 1):
        P.append(sph((0.2, 0.2, 0.2), (sx * 0.6, 0, 3.95), "glow", n=6 if lod else 9, rings=4 if lod else 6))
        P.append(cyl(0.08, 0.1, (sx * 0.6, 0, 3.78), "trim", n=6))
    return P


def bench_deco(lod=False):
    P = []
    bx(P, (1.8, 0.5, 0.07), (0, 0, 0.46), "wood")
    bx(P, (1.8, 0.07, 0.4), (0, 0.24, 0.72), "wood", rot=(radians(12), 0, 0))
    for sx in (-1, 1):
        bx(P, (0.08, 0.5, 0.46), (sx * 0.8, 0, 0.23), "accent2")
    return P


def trash_bin(lod=False):
    P = []
    P.append(cyl(0.28, 0.85, (0, 0, 0.43), "base", n=8 if lod else 12))
    P.append(cyl(0.3, 0.06, (0, 0, 0.88), "deep", n=8 if lod else 12))
    return P


def planter_deco(lod=False):
    P = []
    bx(P, (1.8, 1.0, 0.7), (0, 0, 0.35), "white", bevel=0.05)
    bx(P, (1.9, 1.1, 0.07), (0, 0, 0.72), "accent2")
    P.append(sph((1.5, 0.8, 0.9), (0, 0, 0.95), "leaf", n=8, rings=5))
    return P


def bollard(lod=False):
    P = []
    P.append(cyl(0.12, 0.8, (0, 0, 0.4), "white", n=8))
    P.append(cyl(0.13, 0.12, (0, 0, 0.74), "accent2", n=8))
    return P


# ------------------------------------------------------------------------------------------------ pier
def pier_deck(lod=False):
    """Segmento do pier (5 x 8 m): tabuas de madeira, corrimao branco com postes, estacas ate o mar. Topo do deck em z=0.3."""
    P = []
    L, Wd = 8.0, 5.0
    bx(P, (Wd, L, 0.22), (0, 0, 0.19), "wood")
    if not lod:
        for k in range(1, 8):
            bx(P, (Wd, 0.04, 0.02), (0, -L / 2 + k * 1.0, 0.31), "deep")
    for sx in (-1, 1):
        bx(P, (0.1, L, 0.1), (sx * (Wd / 2 - 0.05), 0, 1.15), "white")
        bx(P, (0.06, L, 0.06), (sx * (Wd / 2 - 0.05), 0, 0.75), "white")
        for k in range(5):
            bx(P, (0.12, 0.12, 0.95), (sx * (Wd / 2 - 0.05), -L / 2 + 0.2 + k * 1.9, 0.78), "white")
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(cyl(0.15, 3.6, (sx * 2.0, sy * 3.2, -1.5), "deep", n=6 if lod else 8))
    return P


def pier_head(lod=False):
    """Fim do pier: plataforma maior com pavilhao deco (telhado em onda), bancos e luminarias."""
    P = []
    Wd, L = 10.0, 9.0
    bx(P, (Wd, L, 0.22), (0, 0, 0.19), "wood")
    for sx in (-1, 1):
        bx(P, (0.1, L, 0.1), (sx * (Wd / 2 - 0.05), 0, 1.15), "white")
        for k in range(5):
            bx(P, (0.12, 0.12, 0.95), (sx * (Wd / 2 - 0.05), -L / 2 + 0.3 + k * 2.1, 0.78), "white")
    bx(P, (Wd, 0.1, 0.1), (0, L / 2 - 0.05, 1.15), "white")
    for k in range(5):
        bx(P, (0.12, 0.12, 0.95), (-Wd / 2 + 0.3 + k * 2.35, L / 2 - 0.05, 0.78), "white")
    # pavilhao
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(cyl(0.12, 3.0, (sx * 2.2, sy * 1.6 + 0.4, 1.7), "white", n=8))
    bx(P, (5.2, 4.0, 0.3), (0, 0.4, 3.3), "accent2")
    bx(P, (5.6, 4.4, 0.16), (0, 0.4, 3.52), "white")
    bx(P, (5.6, 0.1, 0.1), (0, 0.4 - 2.2, 3.4), "glow")
    bx(P, (3.2, 2.6, 0.4), (0, 0.4, 3.8), "base")
    bx(P, (3.6, 3.0, 0.14), (0, 0.4, 4.05), "white")
    for sx in (-1, 1):
        for sy in (-1, 1):
            P.append(cyl(0.2, 3.6, (sx * 4.3, sy * 4.0, -1.5), "deep", n=6 if lod else 8))
    return P


# ------------------------------------------------------------------------------------------------ placas neon
def _text_sign(name, text, w, h, mat_board="deep", mat_text="glow", size=None):
    """placa retangular escura com letras luminosas (texto 3D convertido em malha)."""
    P = []
    bx(P, (w, 0.2, h), (0, 0, h / 2), mat_board)
    bx(P, (w - 0.25, 0.06, 0.08), (0, -0.12, h - 0.14), mat_text)
    bx(P, (w - 0.25, 0.06, 0.08), (0, -0.12, 0.14), mat_text)
    try:
        bpy.ops.object.text_add(location=(0, -0.14, h / 2), rotation=(pi / 2, 0, 0))
        t = bpy.context.object
        t.data.body = text
        t.data.size = size or h * 0.55
        t.data.extrude = 0.025
        t.data.align_x = "CENTER"
        t.data.align_y = "CENTER"
        bpy.ops.object.convert(target="MESH")
        t = bpy.context.object
        t.data.materials.clear()
        t.data.materials.append(ck.M[mat_text])
        # encolhe o texto para caber na placa
        bb = [Vector(c) for c in t.bound_box]
        tw = max(c.x for c in bb) - min(c.x for c in bb)
        if tw > w - 0.5:
            k = (w - 0.5) / tw
            t.scale = (k, 1, k)
            bpy.ops.object.transform_apply(scale=True)
        P.append(t)
    except Exception as ex:
        print("texto falhou:", ex)
    return P


def make_sign(text, w=3.6, h=1.0):
    return lambda lod=False: _text_sign(text, text, w, h)


def sign_blade(lod=False):
    """Lamina vertical de neon (hotel): placa estreita com letras empilhadas HOTEL."""
    P = []
    h = 5.0
    bx(P, (1.1, 0.3, h), (0, 0, h / 2), "deep")
    bx(P, (0.9, 0.08, h - 0.4), (0, -0.19, h / 2), "white")
    for i, ch in enumerate("HOTEL"):
        pass
    for k in range(5):
        bx(P, (0.55, 0.06, 0.55), (0, -0.25, 0.7 + k * 0.78), "glow" if k % 2 == 0 else "glow2")
    bx(P, (0.12, 0.12, 1.0), (0, 0.0, h + 0.5), "trim")
    return P


# ------------------------------------------------------------------------------------------------ registro
PIECES = [
    # (nome, funcao, tem_lod)
    ("deco_hotel_a", hotel_a, True), ("deco_hotel_b", hotel_b, True), ("deco_hotel_c", hotel_c, True),
    ("deco_tower", tower_deco, True), ("deco_shop", shop_deco, True), ("airport_terminal", airport_terminal, True),
    ("checkin_counter", checkin_counter, False), ("airplane_deco", airplane_deco, True),
    ("palm_royal", palm_royal, True), ("palm_coconut", palm_coconut, True), ("palm_small", palm_small, False), ("shrub", shrub, False),
    ("lifeguard_tower", lifeguard_tower, False), ("umbrella", umbrella, False), ("lounger", lounger, False), ("beach_towel", beach_towel, False),
    ("beach_bar", beach_bar, False), ("cabana", cabana, False), ("vball_net", vball_net, False), ("surf_rack", surf_rack, False),
    ("icecream_cart", icecream_cart, False), ("kiosk_deco", kiosk_deco, False), ("lamp_deco", lamp_deco, True), ("bench_deco", bench_deco, False),
    ("trash_bin", trash_bin, False), ("planter_deco", planter_deco, False), ("bollard", bollard, False),
    ("pier_deck", pier_deck, True), ("pier_head", pier_head, False), ("sign_blade", sign_blade, False),
    ("sign_hotel", make_sign("HOTEL", 3.6, 0.95), False), ("sign_beach", make_sign("BEACH CLUB", 5.2, 1.0), False),
    ("sign_gelato", make_sign("GELATO", 3.6, 0.95), False), ("sign_surf", make_sign("SURF & SUN", 4.6, 0.95), False),
    ("sign_airport", make_sign("AEROPORTO", 8.0, 1.2), False), ("sign_miami", make_sign("MIAMI BEACH", 7.0, 1.2), False),
]

# colisores no espaco do GLB: box [w, h, d] + centro [x, y, z] (z>0 = frente); 'boxes' = lista [w,h,d,cx,cy,cz]; 'cylinder' [r, h]
META = {
    "deco_hotel_a": dict(collider=("box", [18.0, 13.0, 13.0], [0, 6.5, 0])),
    "deco_hotel_b": dict(collider=("box", [16.0, 11.0, 14.0], [0, 5.5, 0])),
    "deco_hotel_c": dict(collider=("box", [24.0, 8.0, 12.0], [0, 4.0, 0.0])),
    "deco_tower": dict(collider=("box", [9.0, 14.0, 9.0], [0, 7.0, 0])),
    "deco_shop": dict(collider=("box", [11.0, 5.0, 9.0], [0, 2.5, 0])),
    "airport_terminal": dict(collider=("boxes", [[14.0, 7.2, 16.0, -12.0, 3.6, 0.0], [14.0, 7.2, 16.0, 12.0, 3.6, 0.0], [10.0, 7.2, 1.0, 0.0, 3.6, -7.5], [3.2, 16.0, 3.2, -22.0, 8.0, -1.5]], None)),
    "checkin_counter": dict(collider=("box", [6.2, 1.1, 1.6], [0, 0.55, 0])),
    "airplane_deco": dict(collider=("cylinder", [1.2, 2.5], [0, 0.0, 0])),
    "palm_royal": dict(collider=("cylinder", [0.3, 6.0], [0, 3.0, 0])),
    "palm_coconut": dict(collider=("cylinder", [0.25, 4.0], [0, 2.0, 0])),
    "palm_small": dict(collider=("cylinder", [0.2, 1.4], [0, 0.7, 0])),
    "shrub": dict(collider=None),
    "lifeguard_tower": dict(collider=("boxes", [[0.5, 3.0, 0.5, 0.85, 1.5, 0.85], [0.5, 3.0, 0.5, -0.85, 1.5, 0.85], [0.5, 3.0, 0.5, 0.85, 1.5, -0.85], [0.5, 3.0, 0.5, -0.85, 1.5, -0.85]], None)),
    "umbrella": dict(collider=("cylinder", [0.08, 2.2], [0, 1.1, 0])),
    "lounger": dict(collider=None),
    "beach_towel": dict(collider=None),
    "beach_bar": dict(collider=("boxes", [[5.0, 1.3, 1.2, 0, 0.65, 0.55], [0.4, 2.6, 0.4, 2.3, 1.3, -1.35], [0.4, 2.6, 0.4, -2.3, 1.3, -1.35]], None)),
    "cabana": dict(collider=("box", [3.0, 0.9, 1.8], [0, 0.45, 0])),
    "vball_net": dict(collider=("boxes", [[0.2, 2.5, 0.2, 4.5, 1.25, 0], [0.2, 2.5, 0.2, -4.5, 1.25, 0]], None)),
    "surf_rack": dict(collider=("box", [2.8, 2.2, 0.6], [0, 1.1, 0])),
    "icecream_cart": dict(collider=("box", [2.2, 1.2, 1.4], [0, 0.6, 0])),
    "kiosk_deco": dict(collider=("box", [4.0, 3.0, 3.0], [0, 1.5, 0])),
    "lamp_deco": dict(collider=("cylinder", [0.2, 4.0], [0, 2.0, 0])),
    "bench_deco": dict(collider=("box", [1.8, 0.8, 0.6], [0, 0.4, 0])),
    "trash_bin": dict(collider=("cylinder", [0.3, 0.9], [0, 0.45, 0])),
    "planter_deco": dict(collider=("box", [1.8, 0.8, 1.0], [0, 0.4, 0])),
    "bollard": dict(collider=("cylinder", [0.14, 0.8], [0, 0.4, 0])),
    "pier_deck": dict(walkable=True, collider=("boxes", [[5.0, 0.3, 8.0, 0, 0.15, 0], [0.2, 1.3, 8.0, -2.45, 0.65, 0], [0.2, 1.3, 8.0, 2.45, 0.65, 0]], None)),
    "pier_head": dict(walkable=True, collider=("boxes", [[10.0, 0.3, 9.0, 0, 0.15, 0], [0.2, 1.3, 9.0, -4.95, 0.65, 0], [0.2, 1.3, 9.0, 4.95, 0.65, 0], [10.0, 1.3, 0.2, 0, 0.65, 4.4]], None)),
    "sign_blade": dict(collider=None), "sign_hotel": dict(collider=None), "sign_beach": dict(collider=None),
    "sign_gelato": dict(collider=None), "sign_surf": dict(collider=None), "sign_airport": dict(collider=None), "sign_miami": dict(collider=None),
}

BUDGET = {"deco_hotel_a": 2600, "deco_hotel_b": 2400, "deco_hotel_c": 2600, "deco_tower": 1800, "deco_shop": 1200, "airport_terminal": 1800,
          "palm_royal": 900, "palm_coconut": 900}


def build_all():
    out = {}
    for name, fn, has_lod in PIECES:
        ob = finish(name, fn())
        out[name] = ob
        if has_lod:
            ob2 = finish("lod_" + name, fn(lod=True))
            out["lod_" + name] = ob2
    return out


def export_all(objs):
    os.makedirs(OUT, exist_ok=True)
    kit = {"units": "m", "up": "Y", "front": "+Z", "style": "Miami Beach Art Deco (Ocean Drive) + praia", "pieces": {},
           "slots": ["base", "accent", "accent2", "soft", "deep", "white", "trim", "glass", "glow", "glow2", "leaf", "wood", "cloth"],
           "metals": {k: dict(color=v[0], roughness=v[1], metallic=v[2]) for k, v in METALS.items()}, "palettes": PALETTES}
    for name, ob in objs.items():
        bpy.ops.object.select_all(action="DESELECT")
        ob.select_set(True)
        bpy.context.view_layer.objects.active = ob
        path = os.path.join(OUT, name + ".glb")
        bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                                  export_cameras=False, export_lights=False)
        (x0, x1), (y0, y1), (z0, z1) = bbox(ob)
        info = dict(file="kit/%s.glb" % name, tris=tri_count(ob), bytes=os.path.getsize(path),
                    size=[round(x1 - x0, 3), round(z1 - z0, 3), round(y1 - y0, 3)],
                    materials=[m.name for m in ob.data.materials if m])
        base = name[4:] if name.startswith("lod_") else name
        meta = META.get(base, {})
        info["walkable"] = bool(meta.get("walkable", False))
        col = meta.get("collider")
        if col and not name.startswith("lod_"):
            info["collider"] = dict(type=col[0], size=col[1], center=col[2])
        kit["pieces"][name] = info
    with open(os.path.join(OUT, "kit.json"), "w", encoding="utf-8") as f:
        json.dump(kit, f, indent=2, ensure_ascii=False)
    with open(os.path.join(ROOT, "src", "game", "world", "miami", "miamiKit.json"), "w", encoding="utf-8") as f:
        json.dump(kit, f, indent=1, ensure_ascii=False)
    return kit


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    ck.M.clear()
    ck.M.update(setup_mats("mint"))
    objs = build_all()
    kit = export_all(objs)
    tot = 0
    for n, i in kit["pieces"].items():
        tot += i["tris"]
        print("%-22s tris=%6d  %7.1f KB  size=%s" % (n, i["tris"], i["bytes"] / 1024, i["size"]))
    print("TOTAL tris", tot)


if __name__ == "__main__":
    main()

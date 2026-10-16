"""
Biblioteca compartilhada dos kits de INTERIORES (casa de bonecas de vinil de luxo).
Reaproveita primitivas de tools/blender/city_kit.py (somente leitura).
Convencoes: espaco Blender Z-up; frente da peca = -Y (vira +Z no GLB); origem no centro da base.
Pecas de parede: plano da parede em y=0, corpo em y>=0, frente -Y. Pecas de teto: origem no ponto de fixacao (topo), pendem em -Z.
"""
import bpy
import bmesh
import math
import os
import sys
import json
from math import pi, sin, cos, radians, sqrt, exp
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".."))
import city_kit as ck  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
OUT = os.path.join(ROOT, "public", "assets", "interiors")
M = ck.M
box, cyl, sph, lathe, tube, prism, heart, lin = ck.box, ck.cyl, ck.sph, ck.lathe, ck.tube, ck.prism, ck.heart, ck.lin
ck.BUDGET.clear()

METALS = dict(gold=("#f2cf6e", .14), rose_gold=("#f0aa9c", .18), silver=("#e3e6ee", .16), champagne=("#ecd9a2", .2),
              chrome=("#f5f7fb", .05), pearl=("#f6f0fa", .16), black_chrome=("#2b2733", .08), copper=("#e59a72", .2))

SLOTS = ["base", "accent", "accent2", "soft", "deep", "white", "fabric", "trim", "mirror", "glass", "glow", "glow2", "leaf", "water"]


def build_mats(P):
    M.clear()
    sp = dict(base=(.18, .9, .04, .9, .3), accent=(.14, 1, .04, .4, .4), accent2=(.08, 1, .02, 0, .4), soft=(.1, 1, .02, .3, .4),
              deep=(.12, 1, .03, 0, .4), white=(.12, 1, .04, .3, .4))
    for s, (r, c, cr, sh, shr) in sp.items():
        M[s] = ck._mk(s, P[s], rough=r, coat=c, coat_rough=cr, sheen=sh, sheen_rough=shr)
    M["fabric"] = ck._mk("fabric", P["fabric"], rough=.55, coat=0.0, sheen=1.0, sheen_rough=.35)
    mc, mr = METALS[P["metal"]]
    M["trim"] = ck._mk("trim", mc, rough=mr, metal=1.0, coat=0.0)
    M["mirror"] = ck._mk("mirror", "#d8e8f5", rough=.04, metal=.7, coat=0.0, emis="#bcd4ec", emis_str=.35)
    M["glass"] = ck._mk("glass", P["glass"], rough=.03, coat=0.0, alpha=.3, spec=.8)
    M["glow"] = ck._mk("glow", P["glow"], rough=.3, coat=0.0, emis=P["glow"], emis_str=P.get("glow_str", 5.0))
    g2 = P.get("glow2", P["glow"])
    M["glow2"] = ck._mk("glow2", g2, rough=.3, coat=0.0, emis=g2, emis_str=P.get("glow_str", 5.0))
    M["leaf"] = ck._mk("leaf", P.get("leaf", "#a8dcc0"), rough=.3, coat=.7, coat_rough=.1, sheen=.6)
    M["water"] = ck._mk("water", "#cfeeff", rough=0.0, coat=0.0, alpha=.42, spec=1.0, emis="#a8dcff", emis_str=.5)


def mkpal(label, base, accent, accent2, soft, deep, fabric, metal, glass=None, glow="#ffd9a0", white="#fffaf6", leaf="#a8dcc0", **kw):
    d = dict(label=label, base=base, accent=accent, accent2=accent2, soft=soft, deep=deep, fabric=fabric, metal=metal,
             glass=glass or accent2, glow=glow, white=white, leaf=leaf)
    d.update(kw)
    return d


# ------------------------------------------------------------------ registro de pecas
REG = {}      # room -> list of dict(name, fn, meta)


def piece(room, name, tags=(), col="box", walk=False, mount="floor", sit=(), use=(), budget=8000, lights=(), note=None,
          colbox=None, hero=False, pal=None):
    def deco(fn):
        REG.setdefault(room, []).append(dict(name=name, fn=fn, tags=list(tags), col=col, walk=walk, mount=mount,
                                             sit=list(sit), use=list(use), budget=(12000 if hero else budget), lights=list(lights),
                                             note=note, colbox=colbox, hero=hero, pal=pal))
        return fn
    return deco


# ------------------------------------------------------------------ geometria
def merge(dst, src, loc=(0, 0, 0), scale=(1, 1, 1), rz=0.0):
    m = {}
    c, s = cos(rz), sin(rz)
    for v in src.verts:
        x, y, z = v.co.x * scale[0], v.co.y * scale[1], v.co.z * scale[2]
        m[v] = dst.verts.new((x * c - y * s + loc[0], x * s + y * c + loc[1], z + loc[2]))
    for f in src.faces:
        try:
            dst.faces.new([m[v] for v in f.verts])
        except ValueError:
            pass
    src.free()


def obj(bm, mat, loc=(0, 0, 0), rot=(0, 0, 0)):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return ck._obj_from_bm(bm, mat, loc, rot)


def cloud(items, mat, n=8, rings=4):
    """varias esferas/elipsoides numa so malha. item = (x,y,z,r) ou (x,y,z,(dx,dy,dz)) -> diametros."""
    bm = bmesh.new()
    for (x, y, z, r) in items:
        d = r if isinstance(r, (tuple, list)) else (2 * r,) * 3
        merge(bm, ck.bm_sphere(1, 1, 1, n, rings), (x, y, z), d)
    return obj(bm, mat)


def circle_pts(R, n=32, z=0.0, cx=0.0, cy=0.0, ry=None):
    ry = R if ry is None else ry
    return [Vector((cx + R * cos(2 * pi * i / n), cy + ry * sin(2 * pi * i / n), z)) for i in range(n)]


def ring(R, r, loc, mat, n=36, minor=8, ry=None, rot=(0, 0, 0)):
    return ck.tube(circle_pts(R, n, 0, 0, 0, ry), r, mat, minor=minor, closed=True, loc=loc, rot=rot)


def rb(dims, loc, mat, r=0.03, rot=(0, 0, 0), seg=3):
    r = min(r, min(dims) * .46)
    return box(dims, loc, mat, rot, bevel=r, seg=seg)


def pillow(dims, loc, mat, rot=(0, 0, 0), k=.42, seg=4):
    return box(dims, loc, mat, rot, bevel=min(dims) * k, seg=seg)


def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def tuft(w, h, t, loc, mat, btn="trim", rot=(0, 0, 0), sx=.16, cell=None, buttons=True, taper=.5):
    """painel capitone (diamantes) no plano XZ, frente = -Y; t = espessura maxima. Retorna lista de objetos."""
    cell = cell or sx / 3.2
    nx, nz = max(4, int(round(w / cell))), max(4, int(round(h / cell)))
    bm = bmesh.new()
    grid = {}
    dents = []
    for i in range(-int(w / sx) - 2, int(w / sx) + 3):
        for j in range(-int(h / sx) - 2, int(h / sx) + 3):
            if (i + j) % 2 == 0:
                dents.append((i * sx, j * sx))
    for a in range(nx + 1):
        for b in range(nz + 1):
            x = -w / 2 + w * a / nx
            z = -h / 2 + h * b / nz
            d = min(sqrt((x - dx) ** 2 + (z - dz) ** 2) for dx, dz in dents if abs(dx - x) < sx * 1.6 and abs(dz - z) < sx * 1.6)
            puff = smooth(d / (sx * .78))
            eb = min(x + w / 2, w / 2 - x, z + h / 2, h / 2 - z)
            ef = smooth(eb / (sx * .55))
            thick = t * (taper + (1 - taper) * (puff * .75 + .25 * ef) * (.3 + .7 * ef) + 0)
            if eb < 1e-6:
                thick = t * taper * .9
            grid[(a, b)] = bm.verts.new((x, t / 2 - thick, z))
    for a in range(nx):
        for b in range(nz):
            bm.faces.new((grid[(a, b)], grid[(a + 1, b)], grid[(a + 1, b + 1)], grid[(a, b + 1)]))
    # contorno -> fundo plano
    rim = [(a, 0) for a in range(nx)] + [(nx, b) for b in range(nz)] + [(a, nz) for a in range(nx, 0, -1)] + [(0, b) for b in range(nz, 0, -1)]
    back = [bm.verts.new((grid[k].co.x, t / 2, grid[k].co.z)) for k in rim]
    for i in range(len(rim)):
        j = (i + 1) % len(rim)
        bm.faces.new((grid[rim[i]], grid[rim[j]], back[j], back[i]))
    bm.faces.new(back[::-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    out = [ck._obj_from_bm(bm, mat, loc, rot)]
    if buttons:
        bb = bmesh.new()
        for (dx, dz) in dents:
            if abs(dx) < w / 2 - sx * .45 and abs(dz) < h / 2 - sx * .45:
                merge(bb, ck.bm_sphere(1, 1, 1, 6, 3), (dx, t / 2 - t * taper - .002, dz), (.026, .018, .026))
        out.append(ck._obj_from_bm(bb, btn, loc, rot))
    return out


def drape(w, h, loc, mat, folds=6, amp=.05, pinch=0.0, pinch_z=.45, flare=0.0, rot=(0, 0, 0), nz=10, per=7, tilt=0.0):
    """cortina/dossel: folha com pregas senoidais no plano XZ (origem no topo central, pende em -Z)."""
    nx = folds * per
    bm = bmesh.new()
    g = {}
    for a in range(nx + 1):
        u = a / nx
        for b in range(nz + 1):
            v = b / nz   # 0 topo .. 1 base
            x = (u - .5) * w
            x *= 1 - pinch * exp(-((v * h - pinch_z * h) / (.12 * h + .12)) ** 2) + flare * v
            a_ = amp * (.55 + .45 * v)
            y = a_ * sin(folds * 2 * pi * u + v * tilt)
            g[(a, b)] = bm.verts.new((x, y, -v * h))
    for a in range(nx):
        for b in range(nz):
            bm.faces.new((g[(a, b)], g[(a + 1, b)], g[(a + 1, b + 1)], g[(a, b + 1)]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return ck._obj_from_bm(bm, mat, loc, rot)


def crystal(loc, s, mat="glass", rot=(0, 0, 0)):
    """gota de cristal facetada (bipiramide hexagonal alongada)."""
    return ck.lathe([(0, -s), (s * .32, -s * .35), (s * .36, s * .15), (0, s * .62)], mat, loc, rot, n=6)


def crystals(items, mat="glass"):
    """varios cristais numa malha. items = (x,y,z,s)"""
    bm = bmesh.new()
    for (x, y, z, s) in items:
        merge(bm, ck.bm_lathe([(0, -s), (s * .32, -s * .35), (s * .36, s * .15), (0, s * .62)], 6), (x, y, z))
    return obj(bm, mat)


def bulbs(pts, r, mat="glow"):
    return cloud([(p[0], p[1], p[2], r) for p in pts], mat, 8, 4)


def sheet_curve(pts_xz, width, loc, mat, rot=(0, 0, 0), thick=.0):
    """faixa extrudada em Y de um perfil (x,z) - para encostos curvos, pranchas"""
    return ck.prism(pts_xz, width, "xz", mat, loc, rot)


def leg_curve(x, y, h, r, mat="trim", out=.05, foot=True):
    pts = [Vector((x, y, h)), Vector((x + out * .3, y, h * .72)), Vector((x - out * .2, y, h * .38)),
           Vector((x + out * .8, y, h * .1)), Vector((x + out, y, .0))]
    rr = [r * 1.1, r * .8, r * .7, r * .9, r * 1.1]
    return [ck.tube(pts, rr, mat, minor=6, caps=True)] + ([ck.sph((r * 2.4, r * 2.4, r * 1.6), (x + out, y, r * .7), mat, n=8, rings=4)] if foot else [])


def ball_feet(xs, ys, r, mat="trim", z=None):
    return [ck.sph((r * 2, r * 2, r * 1.6), (x, y, (z if z is not None else r * .8)), mat, n=8, rings=4) for x in xs for y in ys]


def piping(pts, r, mat="trim", closed=False):
    return ck.tube(pts, r, mat, minor=5, closed=closed)


def rect_pts(w, d, z, cx=0, cy=0, rad=0, n=4):
    """retangulo arredondado como ponto de tubo fechado"""
    if rad <= 0:
        return [Vector((cx - w / 2, cy - d / 2, z)), Vector((cx + w / 2, cy - d / 2, z)), Vector((cx + w / 2, cy + d / 2, z)), Vector((cx - w / 2, cy + d / 2, z))]
    pts = []
    for (qx, qy, a0) in ((1, -1, -pi / 2), (1, 1, 0), (-1, 1, pi / 2), (-1, -1, pi)):
        ccx, ccy = cx + qx * (w / 2 - rad), cy + qy * (d / 2 - rad)
        for k in range(n + 1):
            a = a0 + (pi / 2) * k / n
            pts.append(Vector((ccx + rad * cos(a), ccy + rad * sin(a), z)))
    return pts


def rr_slab(w, d, h, loc, mat, rad=.1, n=5, top_r=.03):
    """laje arredondada (planta com cantos redondos) -> lathe nao serve; usa prisma + bevel"""
    pts = [(p.x, p.y) for p in rect_pts(w, d, 0, 0, 0, rad, n)]
    return ck.prism(pts, h, "xy", mat, (loc[0], loc[1], loc[2] + h / 2), (0, 0, 0), bevel=top_r, seg=3)


def oval_slab(rx, ry, h, loc, mat, n=40, bevel=.03):
    pts = [(rx * cos(2 * pi * i / n), ry * sin(2 * pi * i / n)) for i in range(n)]
    return ck.prism(pts, h, "xy", mat, (loc[0], loc[1], loc[2] + h / 2), (0, 0, 0), bevel=bevel, seg=3)


def vase_lathe(prof, mat, loc, n=20):
    return ck.lathe(prof, mat, loc, n=n, smooth=1)


def flower(loc, r, petal, center="trim", n=6, rot=(0, 0, 0)):
    P = []
    bm = bmesh.new()
    for k in range(n):
        a = 2 * pi * k / n
        merge(bm, ck.bm_sphere(1, 1, 1, 8, 4), (r * .55 * cos(a), 0, r * .55 * sin(a)), (r * .9, r * .35, r * .9))
    P.append(ck.ck_obj(bm, petal, loc, rot) if hasattr(ck, "ck_obj") else ck._obj_from_bm(bm, petal, loc, rot))
    P.append(ck.sph(r * .6, (loc[0], loc[1] - r * .12, loc[2]), center, n=8, rings=4))
    return P


def potted_plant_parts(h=1.0, pot_r=.22, leaves=9, pot_mat="white", seed=1):
    import random
    rnd = random.Random(seed)
    P = [ck.lathe([(0, 0), (pot_r * .75, 0), (pot_r, pot_r * 1.15), (pot_r * 1.05, pot_r * 1.45), (pot_r * .9, pot_r * 1.45), (0, pot_r * 1.25)], pot_mat, n=22, smooth=1),
         ck.cyl(pot_r * 1.08, .03, (0, 0, pot_r * 1.42), "trim", n=22, bevel=.01, seg=2)]
    bm = bmesh.new()
    for k in range(leaves):
        a = 2 * pi * k / leaves + rnd.random() * .5
        tilt = .35 + rnd.random() * .6
        ll = h * (.45 + rnd.random() * .35)
        # folha = elipsoide achatado inclinado
        bl = ck.bm_sphere(ll * .36, ll * .06, ll, 8, 5)
        for v in bl.verts:
            x, y, z = v.co.x, v.co.y, v.co.z + ll * .5
            x2 = x * cos(tilt) + z * sin(tilt)
            z2 = -x * sin(tilt) + z * cos(tilt)
            v.co.x = x2 * cos(a) - y * sin(a)
            v.co.y = x2 * sin(a) + y * cos(a)
            v.co.z = z2
        merge(bm, bl, (0, 0, pot_r * 1.4))
    P.append(obj(bm, "leaf"))
    return P


# ------------------------------------------------------------------ finalizacao / export
def finish(name, parts, budget):
    parts = [p for p in parts if p is not None]
    ck.BUDGET[name] = budget
    return ck.finish(name, [p for p in parts if p is not None])


def bounds(ob):
    vs = [v.co for v in ob.data.vertices]
    return (min(v.x for v in vs), max(v.x for v in vs)), (min(v.y for v in vs), max(v.y for v in vs)), (min(v.z for v in vs), max(v.z for v in vs))


def g(p):
    """Blender (x,y,z) -> jogo (x,z,-y)"""
    return [round(p[0], 3), round(p[2], 3), round(-p[1], 3)]


def hint_out(h):
    o = dict(h)
    for k in ("pos",):
        if k in o:
            o[k] = g(o[k])
    if "face" in o:
        f = o["face"]
        o["face"] = [round(f[0], 3), round(-f[1], 3)]   # direcao no plano XZ do jogo
    return o


def export_room(room, only=None, pal_override=None):
    """constroi e exporta todas as pecas registradas da sala. retorna dict de infos."""
    from palettes import PALS
    rdir = os.path.join(OUT, room)
    os.makedirs(rdir, exist_ok=True)
    infos = {}
    for rec in REG.get(room, []):
        if only and rec["name"] not in only:
            continue
        build_mats(PALS[rec["pal"] or room])
        parts = rec["fn"]()
        ob = finish(rec["name"], parts, rec["budget"])
        (x0, x1), (y0, y1), (z0, z1) = bounds(ob)
        bpy.ops.object.select_all(action="DESELECT")
        ob.select_set(True)
        bpy.context.view_layer.objects.active = ob
        path = os.path.join(rdir, rec["name"] + ".glb")
        bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                                  export_cameras=False, export_lights=False)
        info = dict(file="%s/%s.glb" % (room, rec["name"]), tris=ck.tri_count(ob), bytes=os.path.getsize(path),
                    size=[round(x1 - x0, 3), round(z1 - z0, 3), round(y1 - y0, 3)],
                    bbox_min=[round(x0, 3), round(z0, 3), round(-y1, 3)], bbox_max=[round(x1, 3), round(z1, 3), round(-y0, 3)],
                    materials=[m.name for m in ob.data.materials if m], mount=rec["mount"], tags=rec["tags"], walkable=bool(rec["walk"]),
                    hero=bool(rec["hero"]))
        if rec["col"] == "box":
            cb = rec["colbox"]
            if cb:
                (a0, a1), (b0, b1), (c0, c1) = cb
            else:
                (a0, a1), (b0, b1), (c0, c1) = (x0, x1), (y0, y1), (z0, z1)
            info["collider"] = dict(type="box", size=[round(a1 - a0, 3), round(c1 - c0, 3), round(b1 - b0, 3)],
                                    center=g(((a0 + a1) / 2, (b0 + b1) / 2, (c0 + c1) / 2)))
        elif rec["col"] == "cyl":
            info["collider"] = dict(type="cylinder", radius=round(max(x1 - x0, y1 - y0) / 2, 3), height=round(z1 - z0, 3),
                                    center=g(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)))
        if rec["sit"]:
            info["sit"] = [hint_out(h) for h in rec["sit"]]
        if rec["use"]:
            info["use"] = [hint_out(h) for h in rec["use"]]
        if rec["lights"]:
            info["lights"] = [hint_out(h) for h in rec["lights"]]
        if rec["note"]:
            info["note"] = rec["note"]
        infos[rec["name"]] = info
        print("%-26s tris=%6d  %7.1f KB  size=%s" % (rec["name"], info["tris"], info["bytes"] / 1024, info["size"]))
        # limpa para a proxima
        bpy.data.objects.remove(ob)
    return infos


def update_json(room, infos):
    from palettes import PALS
    path = os.path.join(OUT, "interiors.json")
    data = {}
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    data.update({"units": "m", "up": "Y", "front": "+Z", "style": "luxury vinyl dollhouse interiors", "slots": SLOTS,
                 "slotNotes": "materiais nomeados por slot; recolor por sala trocando a cor. mount: floor|wall|ceiling|tabletop. "
                              "Pecas de teto: origem no ponto de fixacao, pendem em -Y(jogo). Pecas de parede: plano da parede em z=0, corpo em z<=0 (jogo), frente +Z. "
                              "sit/use: pos em coordenadas locais da peca (jogo, metros), face = direcao XZ para onde o jogador/boneca olha",
                 "metals": {k: dict(color=v[0], roughness=v[1], metallic=1) for k, v in METALS.items()}})
    data.setdefault("rooms", {})
    data.setdefault("pieces", {})
    data["rooms"][room] = dict(label=PALS[room]["label"], palette=PALS[room])
    for k in [k for k, v in data["pieces"].items() if v.get("room") == room and k not in infos and False]:
        del data["pieces"][k]
    for n, i in infos.items():
        i["room"] = room
        data["pieces"][room + "/" + n] = i
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1, ensure_ascii=False)


# ------------------------------------------------------------------ helpers de arquitetura
def frame(w, h, t, loc, mat, d=None, r=None, rot=(0, 0, 0)):
    """moldura retangular no plano XZ (centro loc)"""
    d = d or t
    cx, cy, cz = loc
    r = r if r is not None else min(t, d) * .4
    P = []
    P.append(rb((t, d, h), (cx - (w - t) / 2, cy, cz), mat, r))
    P.append(rb((t, d, h), (cx + (w - t) / 2, cy, cz), mat, r))
    P.append(rb((w - 2 * t + .001, d, t), (cx, cy, cz + (h - t) / 2), mat, r))
    P.append(rb((w - 2 * t + .001, d, t), (cx, cy, cz - (h - t) / 2), mat, r))
    return P


def arch_pts(w, h_rect, n=14):
    return ck.arch_outline(w, h_rect, n)


def arch_curve(cx, y, z0, r, n=14, a0=0.0, a1=pi):
    return [Vector((cx + r * cos(a0 + (a1 - a0) * i / n), y, z0 + r * sin(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]


def wall_body(w=2.0, h=3.2, t=.1, cuts=(), mat="base"):
    b = box((w, t, h), (0, t / 2, h / 2), mat)
    for c in cuts:
        ck.bool_cut(b, c)
    return b
bow = ck.bow


def dress_bm(bm, loc, h, w, rz=0.0, flare=1.0, sleeve=True):
    """vestido pendurado (top em loc, pende em -Z), achatado em Y."""
    prof = [(0, -h), (w * .55 * flare, -h), (w * .5 * flare, -h * .72), (w * .26, -h * .42), (w * .17, -h * .28), (w * .22, -h * .1), (w * .09, -h * .02), (0, 0)]
    merge(dst=bm, src=ck.bm_lathe(prof, 10), loc=loc, scale=(1, .3, 1), rz=rz)


def dresses(items, mat):
    """items = (x,y,z_top,h,w,rz)"""
    bm = bmesh.new()
    for (x, y, z, h, w, rz) in items:
        dress_bm(bm, (x, y, z), h, w, rz)
    return obj(bm, mat)


def shoe_bm(bm, loc, rz=0.0, s=1.0, heel=.1):
    """sapato de salto simples (bico para -Y local antes de rz)."""
    x, y, z = loc
    c, sn = cos(rz), sin(rz)

    def T(px, py, pz):
        return (x + (px * c - py * sn) * s, y + (px * sn + py * c) * s, z + pz * s)
    sole = ck.bm_sphere(.07, .21, .02, 8, 4)
    merge(bm, sole, T(0, 0, heel + .01), (s * c, s, s), rz)
    up = ck.bm_sphere(.07, .12, .07, 8, 5)
    merge(bm, up, T(0, -.06, heel + .05), (s, s, s), rz)
    back = ck.bm_sphere(.065, .07, .09, 8, 4)
    merge(bm, back, T(0, .08, heel + .06), (s, s, s), rz)
    hl = ck.bm_lathe([(0, 0), (.012, 0), (.018, heel * .9), (0, heel)], 6)
    merge(bm, hl, T(0, .085, 0), (s, s, s), rz)
    # arco do pe
    arch = ck.bm_sphere(.045, .09, .05, 6, 3)
    merge(bm, arch, T(0, .0, heel * .55 + .03), (s, s, s), rz)


def shoes(items, mat, heel=.1):
    bm = bmesh.new()
    for (x, y, z, rz) in items:
        shoe_bm(bm, (x, y, z), rz, 1.0, heel)
    return obj(bm, mat)


def hearts_row(n, w, loc, step, mat, thick=.02):
    return [ck.heart(w, thick, (loc[0] + i * step, loc[1], loc[2]), mat, bevel=thick * .4, seg=2) for i in range(n)]


def knob(loc, mat="trim", r=.02):
    return ck.sph((r * 2, r * 1.4, r * 2), loc, mat, n=8, rings=4)

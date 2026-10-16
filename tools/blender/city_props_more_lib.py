"""
[LIB] Mobiliario urbano "more" (rua real, toy-vinil) - Jogo das Blogueiras.
Reaproveita (somente leitura) os helpers de city_kit.py e city_props_plus.py.

Uso:  blender -b -P tools/blender/city_props_more.py [-- --only a,b,c]
Saida: public/assets/city/props_more/<nome>.glb + props_more.json

Convencoes (iguais ao kit): Blender Z-up, frente = -Y (vira +Z no GLB Y-up), origem na base/centro da peca,
materiais por slot: base (corpo) accent (2o corpo) accent2 (cor forte) soft (3a) deep (escuro/pneus/postes) seat (madeira/estofado)
white trim (metal) glass glow leaf water.  Paletas em tons REAIS (pedra calcaria, carvao, marinho, floresta, tijolo, madeira, concreto, metais).
Colisores no JSON em coordenadas do jogo (x, y-cima, z-frente).
"""
import bpy
import bmesh
import math
import os
import sys
import json
from math import pi, sin, cos, radians, atan2, sqrt
from mathutils import Vector, Matrix, Euler

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(ROOT, "public", "assets", "city", "props_more")
sys.path.insert(0, HERE)
import city_props_plus as pp  # noqa  (helpers; importa city_kit via snapshot)

ck = pp.ck
M = ck.M
lin = ck.lin
box, sph, tube, lathe, prism = ck.box, ck.sph, ck.tube, ck.lathe, ck.prism
cyl, heart, bow = pp.cyl, pp.heart, ck.bow
arc3, tri_count = ck.arc3, ck.tri_count
rr_pts, sup, circ, text3d, wheel, rn, smooth3 = pp.rr_pts, pp.sup, pp.circ, pp.text3d, pp.wheel, pp.rn, pp.smooth3
_hp = ck._hp
stripes, pearls = pp.stripes, pp.pearls

# metais reais
ck.METALS.update({"brass": ("#c9a15a", 0.24), "bronze": ("#8c6a46", 0.3), "steel": ("#c3c9d1", 0.2),
                  "black_steel": ("#3a3d44", 0.28), "copper": ("#c27a56", 0.26)})


def P_(label, base, accent, accent2, soft, deep, seat, metal, glass="#9db7c4", glow="#ffe2a8", white="#f4f0e6", leaf=None, gs=None):
    d = _hp(label, base, accent, accent2, soft, deep, glass, metal, seat=seat, glow=glow)
    d["white"] = white
    if leaf:
        d["leaf"] = leaf
    if gs:
        d["glow_str"] = gs
    return d


PALS = {
    "stone":    P_("Calcario", "#e4dac6", "#c9bba0", "#b5502f", "#f0e8d8", "#2f3036", "#8a6038", "brass"),
    "char":     P_("Carvao", "#3b3e45", "#55595f", "#c9a15a", "#8a8d92", "#1c1d21", "#5a4632", "steel"),
    "navy":     P_("Marinho", "#2c3e5e", "#46587a", "#d9b45a", "#9aa6bd", "#161d2e", "#6b4a2f", "brass"),
    "forest":   P_("Floresta", "#2f5d46", "#4f7d5a", "#c9a15a", "#a9c2a0", "#1d3a2c", "#7a5232", "bronze"),
    "brick":    P_("Tijolo", "#9a4f3a", "#b8694c", "#e0b858", "#d8b89a", "#3a2a26", "#5a3b28", "steel"),
    "wood":     P_("Madeira", "#b98a58", "#8a6038", "#5f7f4a", "#e0c9a0", "#3a2a1c", "#a07a48", "steel"),
    "concrete": P_("Concreto", "#b9b7b2", "#8f8d89", "#e0a030", "#d8d6d0", "#3a3a3c", "#6a6a6c", "steel"),
    "neon":     P_("Neon noturno", "#23252f", "#2f3347", "#ff3fb4", "#35e8ff", "#101018", "#3a2f4a", "black_steel", glow="#ff3fb4", gs=8.0),
    "white":    P_("Branco jardim", "#f1ede2", "#d9d2c2", "#6f9a6a", "#e8e2d2", "#5a5a58", "#8a6038", "steel"),
    "y2k":      P_("Y2K aco", "#dfe3e8", "#bfc7d2", "#2f8fd0", "#e8e3f2", "#2b3140", "#7a8aa8", "chrome", glow="#6fd4ff", gs=6.0),
    "luxo":     P_("Luxo marfim", "#efe6d4", "#d9c9a8", "#c9a15a", "#f6f0e2", "#1f1f24", "#6a1f2a", "brass", glow="#ffe2a0"),
    "traffic":  P_("Semaforo", "#2b2d33", "#44474f", "#e0402f", "#f2b632", "#17181c", "#6b4a2f", "steel", glow="#46d68a", gs=6.0),
    "recycle":  P_("Reciclagem", "#2f6fb0", "#2f9a5a", "#e0b020", "#c9d0d6", "#26282e", "#8a6038", "steel"),
    "hydrant":  P_("Hidrante", "#d33a2c", "#e0705a", "#c9a15a", "#f2d9a8", "#3a2a26", "#8a6038", "brass"),
    "bus":      P_("Abrigo", "#2f4a6a", "#c3c9d1", "#e0a030", "#e8e4d8", "#1f2128", "#8a6038", "steel", glass="#a9c4d2", glow="#fff0c8"),
    "post_red": P_("Correio vermelho", "#b8352f", "#d9584a", "#c9a15a", "#f1e4c8", "#2a1c1a", "#8a6038", "brass"),
    "post_blue": P_("Correio azul", "#2a5aa0", "#4a7ac0", "#e0b020", "#e8e4d8", "#17202e", "#8a6038", "steel"),
    "cone":     P_("Obra", "#f26a1f", "#ffb020", "#f26a1f", "#f4f0e6", "#2a2a2c", "#b39a70", "steel"),
    "plywood":  P_("Tapume", "#c9a56e", "#e8d3a0", "#f2b21f", "#f4f0e6", "#3a3a3c", "#8a6a3a", "steel"),
    "car_red":  P_("Carro vermelho", "#b8352f", "#f4f0e6", "#2a2a2e", "#d9584a", "#1f2024", "#2a2a2e", "chrome"),
    "car_navy": P_("Carro marinho", "#27406b", "#f4f0e6", "#c9a15a", "#46587a", "#1f2024", "#c9bfa8", "chrome"),
    "car_cream": P_("Carro creme", "#efe6cf", "#f4f0e6", "#2f7a6a", "#c9c0a8", "#1f2024", "#7a4a2f", "chrome"),
    "car_green": P_("Carro verde", "#2f6a52", "#efe6cf", "#c9a15a", "#4f8a6e", "#1f2024", "#c9bfa8", "chrome"),
    "car_mustard": P_("Carro mostarda", "#d9a02a", "#f4f0e6", "#2a2a2e", "#f0c25a", "#1f2024", "#2a2a2e", "chrome"),
    "car_silver": P_("Carro prata", "#b9bfc9", "#e8ecf2", "#2a2a2e", "#8f97a3", "#1f2024", "#2a2a2e", "chrome"),
    "car_black": P_("Carro preto", "#1f2026", "#3a3d44", "#c9a15a", "#55595f", "#111114", "#c9a15a", "chrome"),
    "car_teal": P_("Carro petroleo", "#1f6a74", "#efe6cf", "#e0b858", "#3a8a94", "#1f2024", "#c9bfa8", "chrome"),
    "truck_cream": P_("Food truck creme", "#efe6cf", "#2f7a6a", "#e0402f", "#f6f0e2", "#26282e", "#8a6038", "steel"),
    "truck_mint": P_("Food truck sage", "#8fb09a", "#efe6cf", "#d9872f", "#c9d9c8", "#26282e", "#8a6038", "steel"),
    "truck_navy": P_("Food truck marinho", "#2a3a5a", "#f1e6d0", "#e0b858", "#6a7a9a", "#16181e", "#6b4a2f", "brass"),
    "truck_neon": P_("Food truck noturno", "#2a2630", "#46405a", "#35e8ff", "#ff3fb4", "#101018", "#3a2f4a", "black_steel", glow="#35e8ff", gs=8.0),
    "carnival": P_("Carrinho festa", "#f4efe2", "#b8352f", "#e0b020", "#2f6fb0", "#2a2a2e", "#8a6038", "brass"),
    "umbrella": P_("Guarda-sol", "#e8e0cc", "#2f4a6a", "#c9553a", "#7a9a6a", "#2a2a2e", "#8a6038", "steel"),
    "garden":   P_("Jardim", "#ecd8bf", "#8fb08a", "#c25e3a", "#e8d79a", "#3f5a3a", "#8a6038", "bronze", leaf="#6aa05a"),
    "bike_a":   P_("Bike verde", "#2f6a52", "#efe6cf", "#c9a15a", "#8a6038", "#1f2024", "#8a6038", "steel"),
    "bike_b":   P_("Bike creme", "#e8dfc8", "#2f4a6a", "#c9553a", "#8a6038", "#1f2024", "#8a6038", "steel"),
    "bike_c":   P_("Bike marinho", "#27406b", "#c3c9d1", "#e0b020", "#8a6038", "#1f2024", "#6b4a2f", "steel"),
    "play":     P_("Playground", "#2f6fb0", "#e0b020", "#c9402f", "#3f8a52", "#2a2a2e", "#a07a48", "steel"),
    "flower_real": P_("Carrinho de flores", "#f1ede2", "#3f7a4a", "#c9553a", "#e8d79a", "#4a3220", "#8a6038", "brass", leaf="#5f9a58"),
    # ---- rodada 2 (vida da rua) ----
    "olive":    P_("Oliveira em vaso", "#b8704a", "#8f5236", "#c9a15a", "#8a9a6a", "#3a2a1c", "#8a6038", "steel", leaf="#7f9060"),
    "bags":     P_("Sacolas de loja", "#f1ede2", "#1f1f24", "#b8352f", "#d9c9a8", "#2f4a6a", "#8a6038", "brass"),
    "chalk":    P_("Lousa de cafe", "#2b302d", "#8a6038", "#f4f0e6", "#e0b858", "#1c1d21", "#a07a48", "steel"),
    "market":   P_("Feira", "#f1ede2", "#c9402f", "#e0b020", "#7aa05a", "#5a3b28", "#a07a48", "steel", leaf="#5f9a58"),
    "buckets":  P_("Baldes de flor", "#aeb4bb", "#d9405a", "#f2d36b", "#f4f0e6", "#4a3220", "#8a6038", "steel", leaf="#5f9a58"),
    "gold":     P_("Dourado luxo", "#c9a15a", "#efe6d4", "#1f1f24", "#f6f0e2", "#2a2a2e", "#6a1f2a", "brass", leaf="#4f7d4a"),
    "scaffold": P_("Andaime", "#b9bfc6", "#8f969e", "#f26a1f", "#c9a56e", "#2a2a2c", "#a07a48", "steel"),
    "cartyel":  P_("Carrinho amarelo", "#e0b020", "#b8352f", "#f1ede2", "#c9a56e", "#2a2a2e", "#8a6038", "steel"),
    "mural":    P_("Mural", "#e8dfc8", "#c9553a", "#2f4a6a", "#e0b858", "#2f5d46", "#8a6038", "steel"),
    "ad":       P_("Anuncio", "#f4f0e6", "#1f1f24", "#b8352f", "#e0b858", "#2f4a6a", "#8a6038", "steel", glow="#fff0c8"),
    "blanket":  P_("Manta de piquenique", "#f1ede2", "#b8352f", "#2f4a6a", "#e0b858", "#3a2a1c", "#8a6038", "steel"),
    "rug":      P_("Tapete", "#7a2a30", "#c9a15a", "#f1ede2", "#2f4a6a", "#3a1a1c", "#8a6038", "brass"),
    "arcade":   P_("Fliperama", "#23252f", "#2f3347", "#35e8ff", "#ff3fb4", "#101018", "#3a2f4a", "black_steel", glow="#35e8ff", gs=8.0),
    "wall_tan": P_("Parede/equip", "#d9d3c4", "#a8a396", "#b5502f", "#f0e8d8", "#2f3036", "#8a6038", "steel", glass="#9db7c4"),
    "boat":     P_("Barco", "#efe6cf", "#2f4a6a", "#b8352f", "#a07a48", "#3a2a1c", "#a07a48", "brass"),
    "pier":     P_("Deck", "#a07a48", "#8a6038", "#c9a15a", "#c9b08a", "#3a2a1c", "#8a6038", "steel"),
    "lights":   P_("Luzinhas", "#2a2a2e", "#44474f", "#c9a15a", "#f4efe2", "#17181c", "#6b4a2f", "black_steel", glow="#ffe2a8", gs=7.0),
}
ck.PALETTES.update(PALS)
LEAFC = {"garden": "#6aa05a"}


def setup_mats(pal):
    for m in list(bpy.data.materials):
        bpy.data.materials.remove(m)
    M.clear()
    M.update(ck.palette_mats(pal))
    lf = PALS[pal].get("leaf", "#5f9a58")
    M["leaf"].node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = lin(lf)


# ----------------------------------------------------------------------------------------------------
# helpers
# ----------------------------------------------------------------------------------------------------
REG = []
# rodada 2: orcamento de triangulos por peca (Decimate colapsa o excedente; pecas planas/pano nao entram)
R2_TT = {"flower_buckets": 1100, "bike_share_dock": 1300, "fruit_stand": 1300, "flower_kiosk": 1300, "hotdog_cart": 900, "coffee_cart": 800,
         "post_box_pillar": 520, "potted_olive": 800, "topiary_planter": 700, "patio_heater": 520, "shopping_bags": 420, "dog_bowl_post": 340,
         "charging_station": 520, "atm_unit": 520, "shop_awning": 640, "rooftop_water_tank": 700, "rooftop_garden": 1100,
         "window_display_dress": 800, "window_display_bags": 600, "window_display_shoes": 800, "limo_black": 1000, "lake_pier": 900,
         "scaffold_tower": 1200, "site_hut": 700, "cement_mixer": 600, "bird_bath": 450, "newspaper_stack": 350, "chalkboard_sign": 380}


def piece(name, pal, family, collider=None, walkable=False, note=None, mount=None, tri_target=None, cull="props", variants=None):
    def deco(fn):
        REG.append(dict(name=name, fn=fn, pal=pal, family=family, collider=collider, walkable=walkable, note=note, mount=mount,
                        tri_target=tri_target, variants=variants, cull=cull))
        return fn
    return deco


def bx(w, d, h, x, y, z, m, b=.02, rot=(0, 0, 0), seg=2):
    """caixa com base em z (x,y centro; z base)."""
    return box((w, d, h), (x, y, z + h / 2), m, rot=rot, bevel=b, seg=seg)


def post(x, y, z0, z1, r, m, n=12, b=0.0):
    return cyl(r, z1 - z0, (x, y, (z0 + z1) / 2), m, n=n, bevel=b)


def cylX(r, L, loc, m, n=14, b=0.0):
    return cyl(r, L, loc, m, rot=(0, pi / 2, 0), n=n, bevel=b)


def cylY(r, L, loc, m, n=14, b=0.0):
    return cyl(r, L, loc, m, rot=(pi / 2, 0, 0), n=n, bevel=b)


def disc(r, h, loc, m, n=24, b=.01):
    return cyl(r, h, (loc[0], loc[1], loc[2] + h / 2), m, n=n, bevel=b)


def foot(x, y, r, m="trim", h=.1):
    return [cyl(r, h, (x, y, h / 2), m, n=16, bevel=.025), cyl(r * .72, h * .9, (x, y, h + h * .35), m, n=16, bevel=.02)]


def stripe_bands(r0, r1, h, z0, m1, m2, n=3, x=0, y=0):
    return []


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
    if spec["name"] in R2_TT and not spec["tri_target"]:
        spec["tri_target"] = R2_TT[spec["name"]]
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
    info = dict(file="props_more/%s.glb" % spec["name"], family=spec["family"], palette=spec["pal"],
                tris=tri_count(ob), bytes=os.path.getsize(path),
                size=[round(x1 - x0, 3), round(z1 - z0, 3), round(y1 - y0, 3)],
                bbox_min=[round(x0, 3), round(z0, 3), round(-y1, 3)], bbox_max=[round(x1, 3), round(z1, 3), round(-y0, 3)],
                materials=[m.name for m in ob.data.materials if m], walkable=bool(spec["walkable"]))
    col = spec["collider"]
    if col:
        info["collider"] = dict(type=col[0], size=col[1], center=col[2])
    if spec["note"]:
        info["note"] = spec["note"]
    if spec.get("cull"):
        info["cull"] = spec["cull"]
    return info


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    only = None
    if "--only" in argv:
        only = argv[argv.index("--only") + 1].split(",")
    jpath = os.path.join(OUT, "props_more.json")
    data = dict(units="m", up="Y", front="+Z", style="porcelain/vinyl toy street props, real-world palettes",
                slots=["base", "accent", "accent2", "soft", "deep", "seat", "white", "trim", "glass", "glow", "leaf", "water"],
                metals={k: dict(color=v[0], roughness=v[1], metallic=1) for k, v in ck.METALS.items()},
                palettes=PALS, pieces={})
    os.makedirs(OUT, exist_ok=True)
    if only and os.path.exists(jpath):
        data = json.load(open(jpath, encoding="utf-8"))
        data["palettes"] = PALS
        data["metals"] = {k: dict(color=v[0], roughness=v[1], metallic=1) for k, v in ck.METALS.items()}
    for spec in REG:
        if only and spec["name"] not in only:
            continue
        bpy.ops.wm.read_factory_settings(use_empty=True)
        ob = build_piece(spec)
        info = export_piece(spec, ob)
        data["pieces"][spec["name"]] = info
        print("%-24s tris=%6d  %7.1f KB  size=%s" % (spec["name"], info["tris"], info["bytes"] / 1024, info["size"]))
    with open(jpath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    # copia para o codigo do jogo (mesmo esquema do kitRomantic.json)
    import shutil
    dst = os.path.join(ROOT, "src", "game", "world", "city")
    shutil.copy(jpath, os.path.join(dst, "propsMore.json"))
    pp_json = os.path.join(ROOT, "public", "assets", "city", "props_plus", "props_plus.json")
    if os.path.exists(pp_json):
        shutil.copy(pp_json, os.path.join(dst, "propsPlus.json"))



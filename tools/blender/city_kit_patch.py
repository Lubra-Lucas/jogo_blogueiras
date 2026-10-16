"""
Regera SO algumas pecas dos kits (Y2K do Centro ou Romantico do Jardim) sem tocar nas paletas editadas a mao nos JSONs.
Uso:
  blender -b --factory-startup -noaudio -P tools/blender/city_kit_patch.py -- y2k bench_bubble,lamp_futuristic [--out DIR]
  blender -b --factory-startup -noaudio -P tools/blender/city_kit_patch.py -- romantic house_shell,facade_win
Escreve public/assets/city/<kit>/<peca>.glb e atualiza APENAS pieces[<peca>] (arquivo, tris, bytes, tamanho, bbox, materiais) em
public/assets/city/<kit>/kit.json e src/game/world/city/kit(Y2k|Romantic).json. Colisores/mount ja existentes sao mantidos
(os de META so entram em pecas novas). Depois rode city_lod.py (-- --only a,b) para regerar o LOD das pecas pesadas.
"""
import bpy
import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import city_kit as ck  # noqa
import city_kit_y2k as y2k  # noqa

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
which, names = argv[0], argv[1].split(",")
if which == "y2k":
    mod, sub, json_name = y2k, "kit_y2k", "kitY2k.json"
    pieces = dict(y2k.PIECES)
    meta = y2k.META
else:
    mod, sub, json_name = ck, "kit", "kitRomantic.json"
    pieces = dict(ck.PIECES)
    meta = ck.META

ROOT = ck.ROOT
OUT = os.path.join(ROOT, "public", "assets", "city", sub)
bpy.ops.wm.read_factory_settings(use_empty=True)
if which == "y2k":
    ck.M.update(y2k.pal_mats("bubblegum"))
    fin = y2k.finish
else:
    ck.build_materials()
    fin = ck.finish

paths = [os.path.join(OUT, "kit.json"), os.path.join(ROOT, "src", "game", "world", "city", json_name)]
docs = [json.load(open(p, encoding="utf-8")) for p in paths]
for name in names:
    ob = fin(name, pieces[name]())
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    path = os.path.join(OUT, name + ".glb")
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                              export_cameras=False, export_lights=False)
    (x0, x1), (y0, y1), (z0, z1) = ck.bbox(ob)
    upd = dict(file="%s/%s.glb" % (sub, name), tris=ck.tri_count(ob), bytes=os.path.getsize(path),
               size=[round(x1 - x0, 3), round(z1 - z0, 3), round(y1 - y0, 3)],
               bbox_min=[round(x0, 3), round(z0, 3), round(-y1, 3)], bbox_max=[round(x1, 3), round(z1, 3), round(-y0, 3)],
               materials=[m.name for m in ob.data.materials if m])
    for d in docs:
        old = d["pieces"].get(name)
        if old is None:  # peca nova: usa META
            m = meta.get(name, {})
            old = dict(walkable=bool(m.get("walkable", False)))
            if m.get("collider"):
                c = m["collider"]
                old["collider"] = dict(type=c[0], size=c[1], center=c[2])
            for k in ("mount", "note"):
                if k in m:
                    old[k] = m[k]
        old.update(upd)
        d["pieces"][name] = old
    print("%-22s tris=%6d  %7.1f KB" % (name, upd["tris"], upd["bytes"] / 1024))
for p, d in zip(paths, docs):
    with open(p, "w", encoding="utf-8") as f:
        json.dump(d, f, indent=2 if p.endswith("kit.json") else 1, ensure_ascii=False)

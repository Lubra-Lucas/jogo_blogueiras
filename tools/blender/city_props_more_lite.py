"""
Versoes "lite" (decimadas) dos props de props_plus para uso em massa na rua (orcamento de triangulos da cidade).
Uso:  blender -b -P tools/blender/city_props_more_lite.py
Entrada: public/assets/city/props_plus/<nome>.glb (+ props_plus.json)  ->  Saida: public/assets/city/props_more/lite_<nome>.glb + props_lite.json
(copiado tambem para src/game/world/city/propsLite.json). Materiais por slot e paletas sao preservados.
"""
import bpy
import os
import json
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
PP = os.path.join(ROOT, "public", "assets", "city", "props_plus")
OUT = os.path.join(ROOT, "public", "assets", "city", "props_more")
TARGET = {
    "photo_spot_frame": 3600, "wayfinding_post": 2800, "magazine_kiosk": 3000, "flower_cart": 3000, "rose_arch": 2800,
    "macaron_stand": 2800, "bike_rack": 2200, "phone_booth_capsule": 2400, "vending_pod": 2400, "bubble_car_parked": 2400,
    "cafe_table_set": 2400, "mannequin_display": 2800, "palm_planter_lux": 2800, "trash_bin_cute": 1200, "mailbox_heart": 1400,
    "birdcage_lamp": 1800, "swan_boat": 2400,
}
src = json.load(open(os.path.join(PP, "props_plus.json"), encoding="utf-8"))
data = dict(units="m", up="Y", front="+Z", style="lite (decimado) de props_plus", slots=src["slots"], metals=src["metals"], palettes={}, pieces={})


def tris(ob):
    ob.data.calc_loop_triangles()
    return len(ob.data.loop_triangles)


for name, target in TARGET.items():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(PP, name + ".glb"))
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    # aplica transformacoes (importador cria parent) e junta
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(meshes) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    n0 = tris(ob)
    md = ob.modifiers.new("dec", "DECIMATE")
    md.decimate_type = "COLLAPSE"
    md.ratio = min(1.0, target / max(n0, 1))
    md.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=md.name)
    n1 = tris(ob)
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    path = os.path.join(OUT, "lite_" + name + ".glb")
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                              export_cameras=False, export_lights=False)
    info = dict(src["pieces"][name])
    info["file"] = "props_more/lite_%s.glb" % name
    info["tris"] = n1
    info["bytes"] = os.path.getsize(path)
    data["pieces"]["lite_" + name] = info
    print("lite_%-22s %6d -> %6d" % (name, n0, n1))

jp = os.path.join(OUT, "props_lite.json")
json.dump(data, open(jp, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
shutil.copy(jp, os.path.join(ROOT, "src", "game", "world", "city", "propsLite.json"))

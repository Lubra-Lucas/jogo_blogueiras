"""
LOD distante (decimado) de todas as pecas pesadas da cidade - Jogo das Blogueiras.
Uso:  blender -b --factory-startup -P tools/blender/city_lod.py [-- --only a,b]
Entrada: os JSONs de src/game/world/city (kitY2k, kitRomantic, propsPlus, propsMore) e os GLBs de public/assets/city/<kit>/.
Saida:   public/assets/city/lod/lod_<peca>.glb + public/assets/city/lod/lod.json (copiado para src/game/world/city/propsLod.json).
Materiais por SLOT sao preservados (kit.tsx recolore por vertice), o colisor continua sendo o da peca original.
kit.tsx troca para a versao lod_<peca> quando a celula esta alem de `lod` metros (ver KitScene).
"""
import bpy
import os
import sys
import json
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
CITY = os.path.join(ROOT, "src", "game", "world", "city")
ASSETS = os.path.join(ROOT, "public", "assets", "city")
OUT = os.path.join(ASSETS, "lod")
SOURCES = ["kitY2k", "kitRomantic", "propsPlus", "propsMore"]
MIN_TRIS = 520


def target_for(n):
    if n > 6000:
        return int(max(900, n * 0.17))
    if n > 3000:
        return int(max(650, n * 0.2))
    if n > 1500:
        return int(max(420, n * 0.27))
    return int(max(220, n * 0.38))


def tris(ob):
    ob.data.calc_loop_triangles()
    return len(ob.data.loop_triangles)


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    only = argv[argv.index("--only") + 1].split(",") if "--only" in argv else None
    os.makedirs(OUT, exist_ok=True)
    jpath = os.path.join(OUT, "lod.json")
    data = dict(units="m", up="Y", front="+Z", style="LOD decimado (city_lod.py)", pieces={})
    if only and os.path.exists(jpath):
        data = json.load(open(jpath, encoding="utf-8"))
    for src in SOURCES:
        sj = json.load(open(os.path.join(CITY, src + ".json"), encoding="utf-8"))
        for name, info in sj["pieces"].items():
            n0 = info["tris"]
            if n0 < MIN_TRIS or name.startswith("lite_") or name.startswith("lod_"):
                continue
            if only and name not in only:
                continue
            path = os.path.join(ASSETS, info["file"])
            if not os.path.exists(path):
                continue
            bpy.ops.wm.read_factory_settings(use_empty=True)
            bpy.ops.import_scene.gltf(filepath=path)
            meshes = [o for o in bpy.data.objects if o.type == "MESH"]
            if not meshes:
                continue
            bpy.ops.object.select_all(action="DESELECT")
            for o in meshes:
                o.select_set(True)
            bpy.context.view_layer.objects.active = meshes[0]
            bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
            if len(meshes) > 1:
                bpy.ops.object.join()
            ob = bpy.context.view_layer.objects.active
            try:
                bpy.ops.mesh.customdata_custom_splitnormals_clear()
            except Exception:
                pass
            t0 = tris(ob)
            tgt = target_for(t0)
            md = ob.modifiers.new("dec", "DECIMATE")
            md.decimate_type = "COLLAPSE"
            md.ratio = min(1.0, tgt / max(t0, 1))
            md.use_collapse_triangulate = True
            bpy.ops.object.modifier_apply(modifier=md.name)
            t1 = tris(ob)
            bpy.ops.object.select_all(action="DESELECT")
            ob.select_set(True)
            out = os.path.join(OUT, "lod_" + name + ".glb")
            bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                                      export_cameras=False, export_lights=False)
            data["pieces"]["lod_" + name] = dict(file="lod/lod_%s.glb" % name, tris=t1, of=name, bytes=os.path.getsize(out))
            print("lod_%-28s %6d -> %6d" % (name, t0, t1))
    json.dump(data, open(jpath, "w", encoding="utf-8"), indent=1)
    shutil.copy(jpath, os.path.join(CITY, "propsLod.json"))
    print("total lod pieces", len(data["pieces"]), "tris", sum(v["tris"] for v in data["pieces"].values()))


main()

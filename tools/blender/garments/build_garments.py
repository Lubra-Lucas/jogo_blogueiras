"""Gera as roupas: blender -b --factory-startup -noaudio --python build_garments.py -- corset tutu ..."""
import sys, os, json, time, importlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from garment_lib import *

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ITEMS = [a for a in args if not a.startswith("--")] or ["corset"]
t0 = time.time()
body = Body(); log("body loaded", round(time.time() - t0, 1), "s")
tex = os.path.join(OUTDIR, "tex"); os.makedirs(tex, exist_ok=True)
if not os.path.exists(os.path.join(tex, "lace.png")):
    import textures; textures.make_all(tex)
jpath = os.path.join(OUTDIR, "garments.json")
db = json.load(open(jpath, encoding="utf-8")) if os.path.exists(jpath) else {"version": 1, "items": []}
ref = glb_json(os.path.join(REPO, "public", "assets", "characters", "doll_base.glb"))
for it in ITEMS:
    t1 = time.time()
    mod = importlib.import_module("g_" + it)
    G, mats, meta = mod.build(body)
    ob = to_blender(G, mats, tex)
    path = os.path.join(OUTDIR, it + ".glb")
    sz = export_glb(ob, body.rig, path)
    j = glb_json(path)
    sk = j["skins"][0]
    nm = [j["nodes"][i]["name"] for i in sk["joints"]]; rn = [ref["nodes"][i]["name"] for i in ref["skins"][0]["joints"]]
    ntg = len(j["meshes"][0]["primitives"][0].get("targets", []))
    log(it, "tris", G.tri_count(), "KB", sz // 1024, "joints match", nm == rn, "morphs", ntg, "materials", [m["name"] for m in j["materials"]], "t", round(time.time() - t1, 1))
    meta.update(file=it + ".glb", triangles=G.tri_count(), sizeBytes=sz, morphTargets=ntg)
    db["items"] = [x for x in db["items"] if x["id"] != it] + [meta]
    bpy.data.objects.remove(ob, do_unlink=True)
json.dump(db, open(jpath, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

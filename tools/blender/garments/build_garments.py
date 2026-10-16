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
import patterns as _pt
if not os.path.exists(os.path.join(tex, "pattern_trico.jpg")): _pt.make_patterns(tex)
jpath = os.path.join(OUTDIR, "garments.json")
db = json.load(open(jpath, encoding="utf-8")) if os.path.exists(jpath) else {"version": 1, "items": []}
db["patterns"] = [dict(id=k, label=v["label"], file="tex/pattern_" + k + ".jpg", tonal=v["tonal"], tileMeters=1.0) for k, v in _pt.PATTERNS.items()]
ref = glb_json(os.path.join(REPO, "public", "assets", "characters", "doll_base.glb"))
for it in ITEMS:
    t1 = time.time()
    try:
        mod = importlib.import_module("g_" + it)
        G, mats, meta = mod.build(body)
        ob = to_blender(G, mats, tex)
    except Exception:
        import traceback; print("[garm] FAILED", it); traceback.print_exc(); sys.stdout.flush(); continue
    path = os.path.join(OUTDIR, it + ".glb")
    sz = export_glb(ob, body.rig, path)
    j = glb_json(path)
    sk = j["skins"][0]
    nm = [j["nodes"][i]["name"] for i in sk["joints"]]; rn = [ref["nodes"][i]["name"] for i in ref["skins"][0]["joints"]]
    ntg = len(j["meshes"][0]["primitives"][0].get("targets", []))
    log(it, "tris", G.tri_count(), "KB", sz // 1024, "joints match", nm == rn, "morphs", ntg, "materials", [m["name"] for m in j["materials"]], "t", round(time.time() - t1, 1))
    meta.setdefault("patterns", dict(slot="base", supported=list(_pt.PATTERNS.keys()), default=None))
    meta.update(file=it + ".glb", triangles=G.tri_count(), sizeBytes=sz, morphTargets=ntg)
    bpy.data.objects.remove(ob, do_unlink=True)
    cur = json.load(open(jpath, encoding="utf-8")) if os.path.exists(jpath) else db   # reler: permite varios processos em paralelo
    cur["items"] = [x for x in cur["items"] if x["id"] != it] + [meta]
    cur["patterns"] = db["patterns"]
    json.dump(cur, open(jpath, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    db = cur
db["gameNotes"] = {
    "bodysuit": "O corpo da boneca tem um bodysuit rosa pintado na textura: roupas sem manga/tomara-que-caia/cavadas deixam essa regiao (ombros, colo, barriga) aparecer. O jogo deve tingir a mascara do bodysuit para a cor da pele quando o item equipado tiver slot top/dress sem cobertura total (itens com covers sem 'shoulders'/'neck').",
    "patterns": "db.patterns lista as estampas tileaveis (JPEG 512, 1 UV = ~1 m). Cada item tem patterns {slot, supported[], default}: para aplicar, material[slot].map = textura (wrap repeat) e color = tom (branco = estampa original; tonal=true multiplica uma trama clara pela cor do slot). O item pode ja vir com estampa embutida (default != null).",
    "shoeLift": "Itens slot 'shoes' trazem 'lift' (m): quanto o fundo da sola fica abaixo do chao (plataformas). O jogo deve subir a boneca em 'lift' (ou aceitar afundar ate 2 cm). 'heelCm' e' so informativo. O pe da boneca e' en pointe: solados em cunha chegam ao chao e saltos finos sao reais.",
    "neck": "Pescoco = z 1.20..1.26 m (Neck bone 1.184-1.254). Golas altas/cachecois ficam nessa faixa.",
    "hides": "Botas/tenis escondem 'legwear' (meias nao devem atravessar o cano).",
}
for x in db["items"]:
    x.setdefault("patterns", dict(slot="base", supported=list(_pt.PATTERNS.keys()), default=None))
json.dump(db, open(jpath, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

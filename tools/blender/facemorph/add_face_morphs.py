"""Acrescenta os morphs de formato do rosto (v2) a doll_layers.glb (feminino) e male_base.glb (masculino), editando o GLB direto no binario
(sem Blender, sem round-trip: preserva rotacoes de repouso, esqueleto e os morphs antigos). Idempotente: remove os alvos acrescentados
numa execucao anterior (marcados em mesh.extras.faceMorphsV2) antes de acrescentar de novo.
Uso: python tools/blender/facemorph/add_face_morphs.py [female|male|both]      (Python 3 + numpy + scipy + Pillow)
Depois: python tools/blender/facemorph/check_face_morphs.py  (Blender) para medir as faixas seguras (public/.../safe_*.json) e rodar de novo este script.
"""
import json, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, "..", "doll"))
from glbtool import Glb
from fm_lib import Head, generate, LABELS, FEMALE_NEW, MALE_NEW

REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
CH = os.path.join(REPO, "public", "assets", "characters")
CFG = {
    "female": dict(glb=os.path.join(CH, "doll_layers.glb"), meta=os.path.join(CH, "doll_layers.json"), new=FEMALE_NEW, safe=os.path.join(HERE, "safe_female.json")),
    "male": dict(glb=os.path.join(CH, "male", "male_base.glb"), meta=os.path.join(CH, "male", "male_base.json"), new=MALE_NEW, safe=os.path.join(HERE, "safe_male.json")),
}
MIN_DELTA = 6e-5            # abaixo de 0,06 mm o vertice nao entra no alvo esparso (invisivel; mantem o GLB leve)


def strip(g):
    mesh = g.J["meshes"][0]; prim = g.prim()
    info = mesh.get("extras", {}).get("faceMorphsV2")
    if not info: return
    g.J["accessors"] = g.J["accessors"][:info["accessors"]]
    g.J["bufferViews"] = g.J["bufferViews"][:info["bufferViews"]]; g.views = g.views[:info["bufferViews"]]
    prim["targets"] = prim["targets"][:info["targets"]]
    mesh["extras"]["targetNames"] = mesh["extras"]["targetNames"][:info["targets"]]
    if "weights" in mesh: mesh["weights"] = mesh["weights"][:info["targets"]]
    del mesh["extras"]["faceMorphsV2"]


def run(gender):
    c = CFG[gender]
    g = Glb(c["glb"]); strip(g)
    P, N, UV, IDX = g.mesh()
    mesh = g.J["meshes"][0]; prim = g.prim()
    names = list(mesh["extras"]["targetNames"])
    want = [k for k in c["new"] if k not in names]
    h = Head(P, N, IDX, gender)
    deltas = generate(h, set(want))
    mesh["extras"]["faceMorphsV2"] = {"accessors": len(g.J["accessors"]), "bufferViews": len(g.J["bufferViews"]), "targets": len(prim["targets"])}
    added = []
    for k in want:
        D = deltas[k][h.inv]                                       # de volta aos vertices originais (UV duplicados recebem o mesmo delta)
        idx = np.nonzero(np.linalg.norm(D, axis=1) > MIN_DELTA)[0]
        acc = g.add_sparse_vec3(idx, D[idx])
        prim["targets"].append({"POSITION": acc}); names.append(k)
        if "weights" in mesh: mesh["weights"].append(0)
        added.append((k, len(idx), float(np.linalg.norm(D, axis=1).max() * 1000)))
        print(f"  {gender:6s} {k:22s} {len(idx):6d} verts  max {added[-1][2]:5.1f} mm")
    mesh["extras"]["targetNames"] = names
    g.save(c["glb"])
    meta = json.load(open(c["meta"], encoding="utf-8"))
    safe = json.load(open(c["safe"])) if os.path.exists(c["safe"]) else {}
    have = {m["name"] for m in meta["morphs"]}
    for k in want:
        if k not in have:
            meta["morphs"].append({"name": k, "label": LABELS[k], "group": "Rosto", "min": 0, "max": 1, "targets": ["body"]})
    for m in meta["morphs"]:
        if m["name"].startswith("f_") and m["name"] != "f_maleBase":
            m["safeMax"] = float(safe.get(m["name"], 1.0))            # faixa segura (0..1), medida por check_face_morphs.py
    meta["sizesBytes"] = {os.path.basename(c["glb"]): os.path.getsize(c["glb"])}
    json.dump(meta, open(c["meta"], "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"ok {gender}: {os.path.getsize(c['glb']) // 1024} KB, {len(prim['targets'])} alvos")


if __name__ == "__main__":
    which = sys.argv[1] if len(sys.argv) > 1 else "both"
    for gnd in (["female", "male"] if which == "both" else [which]): run(gnd)

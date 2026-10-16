"""Le o resultado de penetration.py e grava no garments.json: sitSafe (false = a peca atravessa as coxas na pose sentada) e motionClean.
python annotate_manifest.py <pen.json>"""
import json, sys, os

HERE = os.path.dirname(os.path.abspath(__file__))
MAN = os.path.abspath(os.path.join(HERE, "..", "..", "..", "public", "assets", "garments", "garments.json"))
pen = json.load(open(sys.argv[1], encoding="utf-8"))
db = json.load(open(MAN, encoding="utf-8"))
nclean = 0
for it in db["items"]:
    v = pen.get(it["id"])
    if not v: continue
    walk = [v[k] for k in ("walk", "walk+m", "desfile", "desfile+m")]
    cnt = max(x[0] for x in walk); mx = max(x[1] for x in walk)
    sit = v["sit"]
    it["motionClean"] = bool(cnt <= 5 or mx <= 6.0)
    it["sitSafe"] = bool(not (sit[0] > 30 and sit[1] > 12.0))
    nclean += it["motionClean"]
json.dump(db, open(MAN, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("motionClean", nclean, "of", len(db["items"]), "| sitSafe false:", sum(1 for i in db["items"] if i.get("sitSafe") is False))

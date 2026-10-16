"""Contact sheet: python sheet.py <tag> <looks.json>   looks = [{"name":"x","items":[{"id":"tee","pal":{}}], "morphs":{}}]
Renders each look front + 3/4 (walk) with EEVEE via render_garments.py and stitches them side by side."""
import sys, os, json, subprocess
from PIL import Image, ImageDraw

BL = r"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = r"C:\Users\user\AppData\Local\Temp\claude\shots\garments3"
os.makedirs(OUT, exist_ok=True)
tag = sys.argv[1]; looks = json.load(open(sys.argv[2], encoding="utf-8"))
tiles = []
for i, lk in enumerate(looks):
    t = f"{tag}_{i}"
    shots = lk.get("shots") or [
        dict(name="front", azim=0, pose="rest", w=420, h=640),
        dict(name="q34", azim=38, pose="walk", w=420, h=640)]
    for s in shots:
        s.setdefault("focus", lk.get("focus", [0, 0, 0.82])); s.setdefault("dist", lk.get("dist", 3.0)); s.setdefault("lens", 60)
        s.setdefault("w", 420); s.setdefault("h", 640)
        if "morphs" in lk and "morphs" not in s: s["morphs"] = lk["morphs"]
    spec = dict(out=OUT, tag=t, items=lk["items"], shots=shots, hair=True, bg=lk.get("bg", [0.62, 0.62, 0.64]), exposure=lk.get("exposure", -0.2))
    sp = os.path.join(OUT, f"_{t}.json"); json.dump(spec, open(sp, "w"))
    subprocess.run([BL, "-b", "--factory-startup", "-noaudio", "--python", os.path.join(HERE, "render_garments.py"), "--", sp],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    row = [Image.open(os.path.join(OUT, f"{t}_{s['name']}.png")).convert("RGB") for s in shots]
    tiles.append((lk["name"], row))
w, h = tiles[0][1][0].size
cols = len(tiles[0][1])
perrow = int(sys.argv[3]) if len(sys.argv) > 3 else len(tiles)
nrow = (len(tiles) + perrow - 1) // perrow
sheet = Image.new("RGB", (w * cols * perrow, (h + 26) * nrow), (150, 150, 156))
d = ImageDraw.Draw(sheet)
for k, (name, row) in enumerate(tiles):
    rr, cc = divmod(k, perrow)
    for j, im in enumerate(row): sheet.paste(im, ((cc * cols + j) * w, rr * (h + 26) + 26))
    d.text((cc * cols * w + 8, rr * (h + 26) + 6), name, fill=(20, 20, 30))
out = os.path.join(OUT, f"{tag}.png"); sheet.save(out); print(out)

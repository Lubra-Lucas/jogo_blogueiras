"""Desenha os uvLandmarks de base_female.json sobre a textura de pele (PNG de depuracao).
Uso (Python do sistema, com Pillow): python tools/blender/debug_landmarks.py [saida.png]
A textura vem de tools/blender/.cache (gerada pelo build_character.py)."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
meta = json.load(open(HERE.parent.parent / "public/assets/characters/base_female.json", encoding="utf-8"))
L = meta["uvLandmarks"]
tex = Image.open(HERE / ".cache" / "skin_young_caucasian_female.jpg").convert("RGB")
W, H = tex.size
assert [W, H] == [meta["skinTexture"]["width"], meta["skinTexture"]["height"]]
out = sys.argv[1] if len(sys.argv) > 1 else str(HERE / ".cache" / "landmarks_debug.png")
crop = (1450, 650, 2048, 1250)  # ilha do rosto (px)
Z = 3


def px(p):
    return ((p[0] * W - crop[0]) * Z, ((1 - p[1]) * H - crop[1]) * Z)


im = tex.crop(crop).resize(((crop[2] - crop[0]) * Z, (crop[3] - crop[1]) * Z), Image.LANCZOS)
d = ImageDraw.Draw(im, "RGBA")


def poly(pts, col, w=2, close=True):
    q = [px(p) for p in pts]
    d.line(q + ([q[0]] if close else []), fill=col, width=w)


def dot(p, col, r=5):
    x, y = px(p)
    d.ellipse([x - r, y - r, x + r, y + r], fill=col)


for s in ("l", "r"):
    e = L["eyes"][s]
    poly(e["contour"], (0, 255, 255, 255))
    poly(e["shadow"], (255, 160, 0, 255))
    poly(e["upperLid"], (255, 255, 0, 255), 2, False)
    poly(e["lowerLid"], (0, 120, 255, 255), 2, False)
    poly(e["liner"], (255, 0, 255, 255), 2)
    poly(e["wing"], (255, 0, 255, 255), 2)
    dot(e["center"], (0, 0, 255, 255)); dot(e["inner"], (0, 255, 0, 255)); dot(e["outer"], (255, 0, 0, 255))
    poly(L["blush"][s]["polygon"], (255, 80, 160, 255))
    b = L["brows"][s]
    poly(b["line"], (120, 60, 0, 255), 3, False)
    dot(b["center"], (120, 60, 0, 255))
m = L["mouth"]
poly(m["outline"], (255, 0, 0, 255), 2)
poly(m["slit"], (255, 255, 255, 255), 2, False)
dot(m["cornerL"], (0, 255, 0, 255)); dot(m["cornerR"], (255, 0, 0, 255)); dot(m["center"], (0, 0, 255, 255))
dot(L["noseTip"], (0, 255, 0, 255), 6)
im.save(out)
print("salvo", out)

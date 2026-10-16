"""Monta comparativo lado a lado (PIL).
Uso: python compose.py <saida.png> <esq.png> <dir.png> "<legenda esq>" "<legenda dir>" "<titulo>"
"""
import sys
from PIL import Image, ImageDraw, ImageFont

out, left, right, ll, lr, title = sys.argv[1:7]
a, b = Image.open(left).convert("RGB"), Image.open(right).convert("RGB")
if a.height != b.height:
    b = b.resize((int(b.width * a.height / b.height), a.height), Image.LANCZOS)
gap, bar, top = 12, 78, 64
W = a.width + b.width + gap
H = a.height + bar + top
c = Image.new("RGB", (W, H), (18, 18, 20))
c.paste(a, (0, top))
c.paste(b, (a.width + gap, top))
d = ImageDraw.Draw(c)


def font(sz, bold=False):
    for f in (("arialbd.ttf" if bold else "arial.ttf"), "segoeui.ttf"):
        try:
            return ImageFont.truetype(f, sz)
        except Exception:
            pass
    return ImageFont.load_default()


d.text((20, 14), title, font=font(34, True), fill=(235, 235, 235))
d.text((20, top + a.height + 20), ll, font=font(30, True), fill=(255, 190, 210))
d.text((a.width + gap + 20, top + a.height + 20), lr, font=font(30, True), fill=(190, 230, 255))
c.save(out)
print("ok", c.size)

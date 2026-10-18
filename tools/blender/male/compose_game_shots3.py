"""Monta as capturas do jogo (?maletest=1) da etapa 3 em shots/masculino3: folha de 12 rostos (4x3), morphs de formato e cabelos.
Usage: python compose_game_shots3.py   (depois de capturar sheet_<i>_<front|q34>.png, morph_<f_x>.png, hair_<front|q34>.png)
"""
import os
from PIL import Image, ImageDraw, ImageFont

S = r"C:\Users\user\AppData\Local\Temp\claude\shots\masculino3"
NAMES = ["1. Quadrado", "2. Retangular / longo", "3. Oval jovem", "4. Redondo simpatico", "5. Triangular", "6. Losango",
         "7. Maduro", "8. Atleta", "9. Artistico", "10. Delicado / boneca", "11. Coracao", "12. Livre"]
MORPHS = ["f_jawWide", "f_jawAngular", "f_jawSoft", "f_chinWide", "f_chinPointed", "f_chinForward", "f_chinBack", "f_chinCleft", "f_browRidge",
          "f_foreheadHigh", "f_foreheadLow", "f_cheekboneHigh", "f_cheekFull", "f_cheekHollow", "f_faceLong", "f_faceShort", "f_faceWide",
          "f_noseWide", "f_noseLong", "f_noseBridge", "f_lipsFull", "f_lipsThin", "f_neckThick", "f_adamsApple", "f_earsSmall", "f_earsBig"]


def font(sz):
    for f in ("arial.ttf", "C:/Windows/Fonts/arial.ttf", "DejaVuSans.ttf"):
        try: return ImageFont.truetype(f, sz)
        except Exception: pass
    return ImageFont.load_default()


def crop(n):
    im = Image.open(os.path.join(S, n + ".png")).convert("RGB")
    bg = im.getpixel((im.width - 1, im.height - 1)); w, h = im.size

    def same(p): return sum(abs(a - b) for a, b in zip(p, bg)) < 12
    x1 = w
    while x1 > 1 and same(im.getpixel((x1 - 1, h // 2))): x1 -= 1
    y1 = h
    while y1 > 1 and same(im.getpixel((w // 2, y1 - 1))): y1 -= 1
    return im.crop((0, 0, x1, y1))


def sheet12(view, out, tile=620):
    ims = []
    for i in range(12):
        im = crop(f"sheet_{i}_{view}")
        s = min(im.width, im.height)
        im = im.crop(((im.width - s) // 2, 0, (im.width + s) // 2, s)).resize((tile, tile), Image.LANCZOS)
        ims.append(im)
    pad, lab = 8, 34
    sh = Image.new("RGB", (4 * tile + 5 * pad, 3 * (tile + lab) + 4 * pad), (255, 255, 255))
    d = ImageDraw.Draw(sh); f = font(22)
    for k, im in enumerate(ims):
        x = pad + (k % 4) * (tile + pad); y = pad + (k // 4) * (tile + lab + pad)
        d.text((x + 6, y + 5), NAMES[k], fill=(30, 30, 30), font=f)
        sh.paste(im, (x, y + lab))
    sh.save(os.path.join(S, out)); print(out, sh.size)


def morphs(out):
    strips = [crop(f"morph_{m}") for m in MORPHS]
    w = 600
    strips = [s.resize((w, int(w * s.height / s.width)), Image.LANCZOS) for s in strips]
    h = max(s.height for s in strips)
    cols = 4; rows = 7
    lab = 44; pad = 8
    sh = Image.new("RGB", (cols * w + (cols + 1) * pad, rows * (h + lab) + (rows + 1) * pad), (255, 255, 255))
    d = ImageDraw.Draw(sh); f = font(20); f2 = font(15)
    for k, s in enumerate(strips):
        x = pad + (k % cols) * (w + pad); y = pad + (k // cols) * (h + lab + pad)
        d.text((x + 6, y + 4), MORPHS[k], fill=(20, 20, 20), font=f)
        d.text((x + 6, y + 26), "pesos 0 | 0,5 | 1,0  (cima: frente, baixo: 3/4)", fill=(90, 90, 90), font=f2)
        sh.paste(s, (x, y + lab))
    sh.save(os.path.join(S, out)); print(out, sh.size)


def hairs(out):
    a, b = crop("hair_front"), crop("hair_q34")
    w = max(a.width, b.width)
    f = font(22); lab = 34
    sh = Image.new("RGB", (w * 2 + 24, a.height + lab + 16), (255, 255, 255))
    d = ImageDraw.Draw(sh)
    d.text((14, 6), "Frente  (colunas: raspado | topete curto | curto com risca; linhas: 2 cores)", fill=(30, 30, 30), font=f)
    d.text((w + 20, 6), "3/4", fill=(30, 30, 30), font=f)
    sh.paste(a, (8, lab)); sh.paste(b, (w + 16, lab))
    sh.save(os.path.join(S, out)); print(out, sh.size)


if __name__ == "__main__":
    sheet12("front", "folha_12_frente.png")
    sheet12("q34", "folha_12_34.png")
    morphs("morphs_formato.png")
    hairs("cabelos.png")

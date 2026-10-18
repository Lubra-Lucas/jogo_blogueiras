"""Empacota o kit de camadas do rosto (tools/blender/male/kit_src/*.png) em MENOS texturas por material (limite de 16 samplers do WebGL):
  public/assets/characters/male/face/
    eye_<eye>_sclera.png, eye_<eye>_iris.png     (copias)           eye: natural|almond|doll|dolla|classic
    eyefx_<eye>_<lash>.png   R = brilho (hi), G = delineado, B = cilios (alfa de cada), A = 255.  lash: none|natural|doll|dolla.  classic: so eyefx_classic_classic (RGBA dos cilios) e eyefx_classic_none (vazio)
    brow_<style>.png, blush.png, classic_shade.png                   (copias)
    mouth_<style>_pk.png     R = cinza dos labios, G = alfa dos labios, B = alfa do brilho, A = 255.   classic: RGBA original (cor por razao) em mouth_classic_pk.png
    detail_<beard>.png       canvas unico 0,20 x 0,28 m centrado em (0, 1,55): R = barba, G = linhas de expressao, B = olheiras (os dois olhos), A = 255
Usage: python pack_face_kit.py   (depois de make_face_kit.py, make_face_kit2.py e extract_classic_layers.py)
"""
import os, shutil
import numpy as np
from PIL import Image, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "kit_src")
OUT = os.path.join(HERE, "..", "..", "..", "public", "assets", "characters", "male", "face")
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT): os.remove(os.path.join(OUT, f))

EYES = ["natural", "almond", "doll", "dolla", "ref"]
LASHES = ["none", "natural", "doll", "dolla"]
MOUTHS = ["natural", "thin", "doll", "dollg", "ref"]
BEARDS = ["none", "stubble", "mustache", "goatee", "full"]
DETAIL = {"size": (0.20, 0.28), "center": (0.0, 1.55), "k": 6000}


def L(name): return Image.open(os.path.join(SRC, name + ".png")).convert("RGBA")
def A(name): return np.asarray(L(name))[..., 3]
def save(name, arr): Image.fromarray(arr.astype(np.uint8), "RGBA").save(os.path.join(OUT, name + ".png"), optimize=True)


def main():
    for e in EYES + ["classic"]:
        shutil.copy(os.path.join(SRC, f"eye_{e}_sclera.png"), OUT); shutil.copy(os.path.join(SRC, f"eye_{e}_iris.png"), OUT)
    for b in ["thick", "arched", "thin", "soft", "ref", "classic"]: shutil.copy(os.path.join(SRC, f"brow_{b}.png"), OUT)
    shutil.copy(os.path.join(SRC, "blush.png"), OUT); shutil.copy(os.path.join(SRC, "classic_shade.png"), OUT)
    # olho: hi/linha/cilios
    for e in EYES:
        hi = A(f"eye_{e}_hi"); ln = A(f"eye_{e}_line")
        for l in LASHES:
            ls = np.zeros_like(hi) if l == "none" else A(f"lash_{l}_{e}")
            save(f"eyefx_{e}_{l}", np.stack([hi, ln, ls, np.full_like(hi, 255)], -1))
    shutil.copy(os.path.join(SRC, "lash_classic.png"), os.path.join(OUT, "eyefx_classic_classic.png"))
    save("eyefx_classic_none", np.zeros((4, 4, 4)))
    # boca
    for m in MOUTHS:
        lips = np.asarray(L(f"mouth_{m}_lips")); gl = A(f"mouth_{m}_gloss")
        save(f"mouth_{m}_pk", np.stack([lips[..., 0], lips[..., 3], gl, np.full_like(gl, 255)], -1))
    shutil.copy(os.path.join(SRC, "mouth_classic_lips.png"), os.path.join(OUT, "mouth_classic_pk.png"))
    # detalhes (barba, linhas, olheiras) num canvas so
    k = DETAIL["k"]; W, H = DETAIL["size"]; cx, cy = DETAIL["center"]
    w, h = int(W * k), int(H * k)
    lines = Image.fromarray(A("lines"), "L")                                   # canvas 0,20 x 0,20 @ (0, 1,59), 6000 px/m
    bags = Image.fromarray(A("eye_bags"), "L")                                  # canvas 0,10 x 0,09, 8000 px/m, centrado no olho
    bags = bags.resize((int(0.10 * k), int(0.09 * k)), Image.LANCZOS)
    eyeX, eyeY = 0.0485, 1.5827

    def paste_to(canvas, img, ccx, ccy, flip=False):
        if flip: img = img.transpose(Image.FLIP_LEFT_RIGHT)
        x = int((ccx - cx) * k + w / 2 - img.width / 2); y = int((cy - ccy) * k + h / 2 - img.height / 2)
        tmp = Image.new('L', canvas.size, 0); tmp.paste(img, (x, y))
        canvas.paste(ImageChops.lighter(canvas, tmp))
    g = Image.new("L", (w, h), 0); paste_to(g, lines, 0.0, 1.59)
    bl = Image.new("L", (w, h), 0); paste_to(bl, bags, eyeX, eyeY); paste_to(bl, bags, -eyeX, eyeY, flip=True)
    for b in BEARDS:
        r = Image.new("L", (w, h), 0)
        if b != "none": paste_to(r, Image.fromarray(A(f"beard_{b}"), "L"), 0.0, 1.495)
        save(f"detail_{b}", np.stack([np.asarray(r), np.asarray(g), np.asarray(bl), np.full((h, w), 255)], -1))
    print("pack ok", len(os.listdir(OUT)), "arquivos")


if __name__ == "__main__":
    main()

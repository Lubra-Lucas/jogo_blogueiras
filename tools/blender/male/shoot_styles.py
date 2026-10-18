"""Captura (Chrome headless) as folhas de estilos do jogo (?maletest=1&scene=cat) e compoe uma folha por categoria (masculino em cima, feminino embaixo).
Usage: python shoot_styles.py [categoria ...]   (servidor em localhost:5203; saida em shots/lote_estilos)"""
import json, os, re, subprocess, sys, time
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
GEN = os.path.join(HERE, "..", "..", "..", "src", "shared", "faceKit.generated.ts")
OUT = r"C:\Users\user\AppData\Local\Temp\claude\shots\lote_estilos"
TMP = os.path.join(OUT, "_parts")
os.makedirs(TMP, exist_ok=True)
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
NAMES = {"eyes": "KIT_EYES", "lashes": "KIT_LASHES", "brows": "KIT_BROWS", "mouths": "KIT_MOUTHS", "beards": "KIT_BEARDS", "nose": "KIT_NOSE", "freckles": "KIT_FRECKLES", "contour": "KIT_CONTOUR", "paint": "KIT_PAINT"}
SIZE = (1800, 450)


def catalog(cat, gender):
    txt = open(GEN, encoding="utf-8").read()
    arr = json.loads(re.search(r"export const %s: KitStyle\[\] = (\[.*\])" % NAMES[cat], txt).group(1))
    g = "m" if gender == "male" else "f"
    out = [x for x in arr if x["g"] in ("mf", g) and (not x.get("hidden") or cat == "eyes")]
    return out


def shot(name, query):
    path = os.path.join(TMP, name + ".png")
    url = f"http://localhost:5203/jogo_blogueiras/?maletest=1&kv={int(time.time())}&{query}"
    subprocess.run([CHROME, "--headless=new", "--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--hide-scrollbars",
                    r"--user-data-dir=C:\Users\user\AppData\Local\Temp\claude\chrome_prof", f"--window-size={SIZE[0]},{SIZE[1]}", "--virtual-time-budget=60000", f"--screenshot={path}", url],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=300)
    return path


def crop(path):
    im = Image.open(path).convert("RGB"); bg = im.getpixel((im.width - 1, im.height - 1)); w, h = im.size
    x1 = w
    while x1 > 1 and sum(abs(a - b) for a, b in zip(im.getpixel((x1 - 1, h // 2)), bg)) < 12: x1 -= 1
    y1 = h
    while y1 > 1 and sum(abs(a - b) for a, b in zip(im.getpixel((w // 2, y1 - 1)), bg)) < 12: y1 -= 1
    return im.crop((0, 0, x1, y1))


def font(sz):
    try: return ImageFont.truetype("C:/Windows/Fonts/arial.ttf", sz)
    except Exception: return ImageFont.load_default()


def do(cat):
    rows = []
    for gender in ("male", "female"):
        lst = catalog(cat, gender)
        for i in range(0, len(lst), 7):
            chunk = lst[i:i + 7]
            p = shot(f"{cat}_{gender}_{i}", f"scene=cat&cat={cat}&g={gender}&from={i}&count=7&rest=1&fov=6.2")
            im = crop(p)
            # recorta a faixa util e escreve as etiquetas por cima (7 colunas)
            w = im.width; cw = w / 7.0
            d = ImageDraw.Draw(im); f = font(17)
            for k, it in enumerate(chunk):
                tag = it["label"] + {"natural": "", "glam": " (glam)", "fun": " (divertido)"}[it["group"]]
                d.text((int(k * cw + 6), im.height - 24), tag[:24], fill=(40, 30, 50), font=f)
            rows.append((gender, im))
    W = max(r.width for _, r in rows); H = sum(r.height for _, r in rows) + 40 * len(rows)
    sheet = Image.new("RGB", (W, H), (255, 255, 255)); y = 0; d = ImageDraw.Draw(sheet); f = font(24)
    for g, im in rows:
        d.text((8, y + 6), f"{cat} - " + ("masculino" if g == "male" else "feminino"), fill=(20, 20, 20), font=f); sheet.paste(im, (0, y + 36)); y += im.height + 40
    sheet.save(os.path.join(OUT, f"folha_{cat}.png")); print("folha", cat, sheet.size, flush=True)


if __name__ == "__main__":
    for c in (sys.argv[1:] or NAMES): do(c)

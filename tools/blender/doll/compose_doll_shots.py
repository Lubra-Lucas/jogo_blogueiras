"""Monta as capturas do jogo (?maletest=1&scene=dcmp|dbody|dswap|dsix|deyes) em shots/boneca_camadas. Usage: python compose_doll_shots.py"""
import os
from PIL import Image, ImageDraw, ImageFont

S = r"C:\Users\user\AppData\Local\Temp\claude\shots\boneca_camadas3"
SIX = ["Classica (reproduz a pintura)", "Natural", "Amendoada", "Doce", "Marcante", "Redonda suave"]


def font(sz):
    for f in ("arial.ttf", "C:/Windows/Fonts/arial.ttf"):
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


def stack(rows, out, labels):
    lab = 40; pad = 8
    w = max(r.width for r in rows)
    sh = Image.new("RGB", (w + 2 * pad, sum(r.height + lab + pad for r in rows) + pad), (255, 255, 255))
    d = ImageDraw.Draw(sh); f = font(24)
    y = pad
    for r, t in zip(rows, labels):
        d.text((pad + 6, y + 6), t, fill=(30, 30, 30), font=f)
        sh.paste(r, (pad, y + lab)); y += r.height + lab + pad
    sh.save(os.path.join(S, out)); print(out, sh.size)


def grid(ims, cols, labels, out, tile=620):
    ims = [i.crop(((i.width - min(i.size)) // 2, 0, (i.width + min(i.size)) // 2, min(i.size))).resize((tile, tile), Image.LANCZOS) for i in ims]
    lab = 36; pad = 8; rows = (len(ims) + cols - 1) // cols
    sh = Image.new("RGB", (cols * tile + (cols + 1) * pad, rows * (tile + lab) + (rows + 1) * pad), (255, 255, 255))
    d = ImageDraw.Draw(sh); f = font(22)
    for k, im in enumerate(ims):
        x = pad + (k % cols) * (tile + pad); y = pad + (k // cols) * (tile + lab + pad)
        d.text((x + 6, y + 6), labels[k], fill=(30, 30, 30), font=f); sh.paste(im, (x, y + lab))
    sh.save(os.path.join(S, out)); print(out, sh.size)


def third(old, new, male, cut=(500, 1000)):
    """as 3 capturas (um personagem por vez, mesma camera) viram uma imagem: coluna esquerda da antiga, do meio da nova, direita do masculino"""
    a, b, c = (Image.open(os.path.join(S, n + ".png")).convert("RGB") for n in (old, new, male))
    w, h = a.size; im = a.copy()
    im.paste(b.crop((cut[0], 0, cut[1], h)), (cut[0], 0)); im.paste(c.crop((cut[1], 0, w, h)), (cut[1], 0))
    im.save(os.path.join(S, "_tmp_" + old + ".png")); return crop("_tmp_" + old)


def ext_sheet(name, out, label):
    stack([crop(name)], out, [label])


if __name__ == "__main__":
    t = "(1) ANTIGA   |   (2) NOVA Classica   |   (3) masculino"
    f = third("h_front_12", "h_front_02", "h_front_01"); q = third("h_q34_12", "h_q34_02", "h_q34_01")
    stack([f, q], "01_comparativo_3.png", [t + " - frente", "3/4"])
    z = third("hz_12", "hz_02", "hz_02", (500, 1500))
    stack([z], "01b_zoom_olhos.png", ["Zoom nos olhos: antiga (esq., recorte) x Classica nova (centro/direita)"])
    grid([crop(f"c_six_{i}") for i in range(6)], 3, SIX, "04_seis_femininos.png")
    grid([crop(f"c_sixp_{i}") for i in range(6)], 3, [n + " (perfil)" for n in SIX], "04b_seis_femininos_perfil.png")
    stack([crop("c_ms_side"), crop("c_ms_q34")], "05_masculinos_perfil.png", ["Masculinos: Quadrado | Atleta | Livre | Maduro - perfil", "3/4"])
    stack([crop("c_extd"), crop("c_extm")], "06_extremos_queixo.png", ["Femininos (perfil): base | chinPointed | chinWide | jawWide | jawSoft | chinPointed+faceLong | jawWide+chinWide | cheekHollow+chinPointed",
                                                                        "Masculinos (perfil): base | chinPointed | chinWide | jawWide | jawAngular | chinPointed+faceLong | jawWide+jawAngular | chinForward+chinWide"])

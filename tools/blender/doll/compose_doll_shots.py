"""Monta as capturas do jogo (?maletest=1&scene=dcmp|dbody|dswap|dsix|deyes) em shots/boneca_camadas. Usage: python compose_doll_shots.py"""
import os
from PIL import Image, ImageDraw, ImageFont

S = r"C:\Users\user\AppData\Local\Temp\claude\shots\boneca_camadas"
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


if __name__ == "__main__":
    t = "(1) boneca ANTIGA (pintada)   |   (2) boneca NOVA (camadas)   |   (3) masculino novo (Quadrado, raspado)"
    stack([crop("c_cmp_front"), crop("c_cmp_q34")], "01_comparativo_3.png", [t + "  - frente", "3/4"])
    c = crop("c_body"); c.save(os.path.join(S, "02_comparativo_corpo.png")); print("02_comparativo_corpo.png", c.size)
    stack([crop("c_swap_front"), crop("c_swap_q34")], "03_troca_olhos_boneca.png", ["Boneca nova, o mesmo rosto, 4 olhos: natural | amendoado | boneca | boneca pintada (frente)", "3/4"])
    grid([crop(f"c_six_{i}_front") for i in range(6)], 3, [f"{n} (frente)" for n in SIX], "04_seis_femininos.png")
    grid([crop(f"c_six_{i}_q34") for i in range(6)], 3, [f"{n} (3/4)" for n in SIX], "04b_seis_femininos_34.png")
    stack([crop("c_eyes_a"), crop("c_eyes_b"), crop("c_eyes_c")], "05_regiao_olhos.png", ["Olhos da boneca nova: 3/4 esquerda", "3/4 direita", "quase de perfil (relevo antigo nao aparece)"])

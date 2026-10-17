"""Monta as capturas do jogo (?maletest=1, Chrome headless) em shots/masculino2: recorta a borda do canvas e faz as pranchas. Usage: python compose_game_shots.py"""
import os
from PIL import Image, ImageDraw
S = r"C:\Users\user\AppData\Local\Temp\claude\shots\masculino2"
NAMES = ["Executivo", "Esportista", "Jovem", "Intenso", "Suave", "Maduro"]


def crop(n):
    im = Image.open(os.path.join(S, n + ".png")).convert("RGB")
    bg = im.getpixel((im.width - 1, im.height - 1)); w, h = im.size
    # remove a borda de cor igual ao canto (pagina atras do canvas)
    def same(p): return sum(abs(a - b) for a, b in zip(p, bg)) < 12
    x1 = w
    while x1 > 1 and same(im.getpixel((x1 - 1, h // 2))): x1 -= 1
    y1 = h
    while y1 > 1 and same(im.getpixel((w // 2, y1 - 1))): y1 -= 1
    return im.crop((0, 0, x1, y1))


def sheet(ims, cols, labels, out, pad=6, lab=26):
    w = max(i.width for i in ims); h = max(i.height for i in ims)
    rows = (len(ims) + cols - 1) // cols
    sh = Image.new("RGB", (cols * w + pad * (cols + 1), rows * (h + lab) + pad * (rows + 1)), (255, 255, 255))
    d = ImageDraw.Draw(sh)
    for k, im in enumerate(ims):
        x = pad + (k % cols) * (w + pad); y = pad + (k // cols) * (h + lab + pad)
        sh.paste(im, (x, y + lab))
        d.text((x + 6, y + 6), labels[k], fill=(30, 30, 30))
    sh.save(os.path.join(S, out)); print(out, sh.size)


if __name__ == "__main__":
    for v, tag in (("front", "frente"), ("q34", "3/4")):
        ims = [crop(f"six_{i}_{v}") for i in range(6)]
        ims = [i.resize((560, int(560 * i.height / i.width))) for i in ims]
        sheet(ims, 3, [f"{n} ({tag})" for n in NAMES], f"02_seis_rostos_{'frente' if v == 'front' else '34'}.png")
    sheet([crop("doll_front"), crop("doll_q34")], 1, ["Frente: boneca atual (esq.) x masculino montado por camadas (dir.)", "3/4"], "03_perto_da_boneca.png")
    sheet([crop("swap_front"), crop("swap_q34")], 1, ["Frente: o mesmo rosto com 3 olhos: natural | amendoado | boneca", "3/4"], "04_troca_real.png")
    sheet([crop("skin_front"), crop("skin_q34")], 1, ["Frente: textura ORIGINAL do Meshy (esq.) x pele limpa (dir.)", "3/4"], "01_pele_limpa.png")
    crop("grid").save(os.path.join(S, "05_grade_corpo_inteiro.png"))

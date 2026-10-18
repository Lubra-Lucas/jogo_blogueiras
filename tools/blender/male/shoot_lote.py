"""Folhas "divertidos" (8 rostos) e 12 rostos aleatorios do lote de estilos. Usage: python shoot_lote.py  (servidor em localhost:5203)"""
import os, sys
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import shoot_styles as S


def stack(ims, labels, out):
    W = max(i.width for i in ims); H = sum(i.height + 40 for i in ims)
    sh = Image.new("RGB", (W, H), (255, 255, 255)); d = ImageDraw.Draw(sh); f = S.font(24); y = 0
    for im, t in zip(ims, labels):
        d.text((8, y + 6), t, fill=(20, 20, 20), font=f); sh.paste(im, (0, y + 36)); y += im.height + 40
    sh.save(os.path.join(S.OUT, out)); print(out, sh.size, flush=True)


if __name__ == "__main__":
    S.SIZE = (1500, 560)
    f = S.crop(S.shot("fun_f", "scene=fun8&row=0&rest=1&fov=6"))
    m = S.crop(S.shot("fun_m", "scene=fun8&row=1&rest=1&fov=6"))
    f34 = S.crop(S.shot("fun_f34", "scene=fun8&row=0&rest=1&fov=6&view=q34"))
    m34 = S.crop(S.shot("fun_m34", "scene=fun8&row=1&rest=1&fov=6&view=q34"))
    stack([f, m, f34, m34], ["Divertidos: femininos (coração, estrela, gatinha, anime)", "Divertidos: masculinos (palhaço, espiral, brincalhão, gato)", "femininos (3/4)", "masculinos (3/4)"], "folha_divertidos.png")
    S.SIZE = (1800, 520)
    a = S.crop(S.shot("rnd_a", "scene=rand&from=0&rest=1&fov=7"))
    b = S.crop(S.shot("rnd_b", "scene=rand&from=6&rest=1&fov=7"))
    stack([a, b], ["12 rostos aleatórios (1-6)", "12 rostos aleatórios (7-12)"], "folha_12_aleatorios.png")

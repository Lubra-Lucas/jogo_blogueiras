"""Kit de camadas do rosto masculino (PNG com alfa) -> public/assets/characters/male/face/ + kit.json
Usage: python make_face_kit.py        (Python 3 + Pillow + numpy; sem Blender)

Cada camada e um PNG centrado na sua origem (centro do olho / da boca / da sobrancelha), com tamanho fisico conhecido
(kit.json: canvas.<grupo> = [largura, altura] em metros no espaco de repouso da malha). O shader (maleMaterial.ts) projeta de frente,
posiciona/escala/gira e espelha. Camadas "tingiveis" sao BRANCAS/cinzas com alfa (a cor vem do tint); as fixas (esclera, brilho) tem cor propria.
Eixos do canvas: +x = lado externo do olho ESQUERDO do personagem (o direito e o espelho), +y = cima.
"""
import os, json, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "kit_src")
os.makedirs(OUT, exist_ok=True)
K = 8000          # px por metro no PNG final
SS = 3            # supersampling
CANVAS = {"eye": (0.100, 0.090), "brow": (0.090, 0.034), "mouth": (0.090, 0.052), "blush": (0.100, 0.075)}


class Cv:
    """canvas supersampled em L (mascara) com conversao metros -> px"""
    def __init__(self, group):
        self.W, self.H = CANVAS[group]
        self.w, self.h = int(round(self.W * K)), int(round(self.H * K))
        self.group = group

    def new(self, v=0):
        return Image.new("L", (self.w * SS, self.h * SS), v)

    def p(self, x, y):
        return ((x / self.W + 0.5) * self.w * SS, (0.5 - y / self.H) * self.h * SS)

    def pts(self, xs, ys):
        return [self.p(x, y) for x, y in zip(xs, ys)]

    def m(self, d):          # metros -> px (supersampled)
        return d * K * SS

    def blur(self, im, r_m):
        return im.filter(ImageFilter.GaussianBlur(max(0.1, r_m * K * SS)))

    def down(self, im):
        return im.resize((self.w, self.h), Image.LANCZOS)

    def save(self, name, alpha, rgb=None):
        """alpha: L supersampled; rgb: L supersampled (cinza) ou None (= branco)"""
        a = self.down(alpha)
        if rgb is None: g = Image.new("L", a.size, 255)
        else: g = self.down(rgb)
        im = Image.merge("RGBA", (g, g, g, a))
        im.save(os.path.join(OUT, name + ".png"), optimize=True)


def smooth(t, e): return np.clip(t, 0, 1) ** e


def eye_curves(s, n=120):
    t = np.linspace(0, 1, n)
    x = -s["a"] + 2 * s["a"] * t
    up = s["hu"] * np.sin(np.pi * t ** s["kin"]) ** s["pu"]
    lo = -s["hl"] * np.sin(np.pi * t ** s["kl"]) ** s["pl"]
    lift = s["lift"] * (2 * t - 1)
    return x, up + lift, lo + lift


EYES = {
    "natural": dict(label="Natural", a=0.0150, hu=0.0088, hl=0.0058, kin=0.85, kl=1.1, pu=0.8, pl=0.9, lift=0.0008, ir=0.0074, iy=0.0004, ix=0.0,
                    liner=0.0013, flick=0.0, hi=1, shadow=0.55, caruncle=1),
    "almond": dict(label="Amendoado", a=0.0172, hu=0.0074, hl=0.0046, kin=0.78, kl=1.2, pu=0.85, pl=1.0, lift=0.0022, ir=0.0066, iy=0.0003, ix=0.0,
                   liner=0.0016, flick=0.0028, hi=1, shadow=0.6, caruncle=1),
    "doll": dict(label="Boneca (grande)", a=0.0178, hu=0.0150, hl=0.0110, kin=0.95, kl=1.0, pu=0.62, pl=0.65, lift=0.0005, ir=0.0132, iy=-0.0016, ix=0.0,
                 liner=0.0030, flick=0.0045, hi=2, shadow=0.35, caruncle=1),
    # "boneca pintada": olho muito grande da boneca feminina (iris azul grande, delineado preto grosso com rabinho, canto externo elevado)
    # "Referencia": olho amendoado, levemente encapuzado (palpebra superior baixa e reta), delineado natural fino
    "ref": dict(label="Referencia (encapuzado)", a=0.0205, hu=0.0066, hl=0.0050, kin=0.80, kl=1.1, pu=0.95, pl=1.0, lift=0.0010, ir=0.0082, iy=-0.0006, ix=0.0,
                liner=0.0016, flick=0.0016, hi=1, shadow=0.75, caruncle=1),
    "dolla": dict(label="Boneca pintada", a=0.0285, hu=0.0172, hl=0.0100, kin=0.86, kl=1.0, pu=0.70, pl=0.80, lift=0.0075, ir=0.0150, iy=-0.0078, ix=-0.0015,
                  liner=0.0064, flick=0.0060, hi=1, shadow=0.30, caruncle=1, glow=0.35, pup=0.36, hir=0.15),
}


def draw_eye(name, s):
    cv = Cv("eye")
    x, up, lo = eye_curves(s)
    poly = cv.pts(np.concatenate([x, x[::-1]]), np.concatenate([up, lo[::-1]]))
    shape = cv.new(0); ImageDraw.Draw(shape).polygon(poly, fill=255)
    shape_s = cv.blur(shape, 0.00025)
    # --- esclera: branco quente, sombra da palpebra superior e cantos mais escuros
    sc = cv.new(250)
    d = ImageDraw.Draw(sc)
    # sombra superior: faixa escura sob a curva superior, borrada
    sh = cv.new(0); ImageDraw.Draw(sh).line(cv.pts(x, up), fill=255, width=int(cv.m(s["hu"] * 1.1)))
    sh = cv.blur(sh, 0.0030)
    sc = ImageChops.subtract(sc, sh.point(lambda v: int(v * s["shadow"] * 0.38)))
    # cantos
    corner = cv.new(0); dc = ImageDraw.Draw(corner)
    for cx in (-s["a"], s["a"]):
        px, py = cv.p(cx, 0); r = cv.m(s["a"] * 0.55)
        dc.ellipse([px - r, py - r, px + r, py + r], fill=120)
    corner = cv.blur(corner, 0.0035)
    sc = ImageChops.subtract(sc, corner.point(lambda v: int(v * 0.28)))
    cv.save(f"eye_{name}_sclera", shape_s, sc)
    # --- iris (cinza para tingir): disco com anel limbal escuro, raios, pupila; recortado pelas palpebras
    r = s["ir"]; cx, cy = s["ix"], s["iy"]
    ir = cv.new(0); di = ImageDraw.Draw(ir)
    px, py = cv.p(cx, cy)
    di.ellipse([px - cv.m(r), py - cv.m(r), px + cv.m(r), py + cv.m(r)], fill=170)
    base = np.array(ir, np.float32)
    # gradiente radial + raios
    h, w = base.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    rr = np.hypot(xx - px, yy - py) / cv.m(r)
    ang = np.arctan2(yy - py, xx - px)
    rays = 0.5 + 0.5 * np.sin(ang * 46 + np.sin(ang * 7) * 2)
    val = 0.95 - 0.55 * np.clip((rr - 0.6) / 0.4, 0, 1) ** 1.6 + 0.15 * rays * np.clip(1 - rr, 0, 1)
    val = val + s.get('glow', 0.0) * np.clip(-(yy - py) / cv.m(r), 0, 1) * np.clip(1 - rr, 0, 1)
    val = np.where(rr < s.get('pup', 0.40 if s['ir'] < 0.01 else 0.34), 0.04, val)                      # pupila
    val = np.clip(val, 0, 1)
    g = Image.fromarray((val * 255).astype(np.uint8), "L")
    a_ir = Image.fromarray(((rr <= 1.0) * 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(cv.m(0.00018)))
    a_ir = ImageChops.multiply(a_ir, shape)                    # recorta pela palpebra
    # sombra da palpebra sobre a iris (escurece o topo)
    top = cv.new(0); ImageDraw.Draw(top).line(cv.pts(x, up), fill=255, width=int(cv.m(s["hu"] * 0.9)))
    top = cv.blur(top, 0.0022)
    g = ImageChops.subtract(g, top.point(lambda v: int(v * 0.5)))
    cv.save(f"eye_{name}_iris", a_ir, g)
    # --- brilho (fixo, branco): 1 ou 2 reflexos
    hi = cv.new(0); dh = ImageDraw.Draw(hi)
    hx, hy = cx + r * 0.38, cy + r * 0.40
    hr = r * s.get('hir', 0.20 if s["hi"] == 1 else 0.26)
    px, py = cv.p(hx, hy); dh.ellipse([px - cv.m(hr), py - cv.m(hr), px + cv.m(hr), py + cv.m(hr)], fill=255)
    if s["hi"] >= 2:
        hx2, hy2, hr2 = cx - r * 0.42, cy - r * 0.42, r * 0.11
        px, py = cv.p(hx2, hy2); dh.ellipse([px - cv.m(hr2), py - cv.m(hr2), px + cv.m(hr2), py + cv.m(hr2)], fill=210)
        # meia-lua inferior (bokeh)
        px, py = cv.p(cx, cy - r * 0.55); dh.arc([px - cv.m(r * 0.55), py - cv.m(r * 0.35), px + cv.m(r * 0.55), py + cv.m(r * 0.35)], 20, 160, fill=90, width=int(cv.m(r * 0.12)))
    hi = ImageChops.multiply(cv.blur(hi, 0.00012), shape)
    cv.save(f"eye_{name}_hi", hi)
    # --- delineado: linha superior grossa (com rabinho) + linha d'agua inferior suave
    ln = cv.new(0); dl = ImageDraw.Draw(ln)
    ux = list(x); uy = list(up)
    if s["flick"] > 0:
        for k in range(1, 9):
            tt = k / 8
            ux.append(s["a"] + s["flick"] * 1.3 * tt); uy.append(up[-1] + s["flick"] * 0.9 * tt - 0.0004 * tt * tt)
    n = len(ux)
    for i in range(n - 1):                          # espessura varia: mais grossa no meio/externo
        t = i / max(n - 1, 1)
        wth = s["liner"] * (0.45 + 0.9 * math.sin(math.pi * min(1, t * 1.05)) ** 0.8)
        if i >= len(x) - 1: wth *= max(0.15, 1 - (i - len(x) + 2) / 9)
        dl.line([cv.p(ux[i], uy[i] + wth * 0.45), cv.p(ux[i + 1], uy[i + 1] + wth * 0.45)], fill=255, width=max(1, int(cv.m(wth))))
    ln = cv.blur(ln, 0.00014)
    lw = cv.new(0); dw = ImageDraw.Draw(lw)
    dw.line(cv.pts(x[8:-8], lo[8:-8]), fill=70, width=max(1, int(cv.m(0.0007))))
    ln = ImageChops.lighter(ln, cv.blur(lw, 0.00018))
    # prega da palpebra (sulco) acima do olho
    cr = cv.new(0); dcr = ImageDraw.Draw(cr)
    dcr.line(cv.pts(x[10:-6], up[10:-6] + s["hu"] * 0.55 + 0.0012), fill=60, width=max(1, int(cv.m(0.0006))))
    ln = ImageChops.lighter(ln, cv.blur(cr, 0.0003))
    cv.save(f"eye_{name}_line", ln)
    # --- cilios (um PNG por estilo de cilio, alinhado a este olho)
    for ls in ("natural", "doll", "dolla"):
        la = cv.new(0); dla = ImageDraw.Draw(la)
        nl = 14 if ls == "natural" else (26 if ls == "doll" else 30)
        t0, t1 = (0.12, 1.0) if ls == "natural" else ((0.05, 1.04) if ls == "doll" else (0.02, 1.06))
        rng = np.random.RandomState(7 if ls == "natural" else 11)
        for i in range(nl):
            t = t0 + (t1 - t0) * i / (nl - 1)
            ti = min(t, 1.0)
            bx = -s["a"] + 2 * s["a"] * ti
            idx = int(ti * (len(x) - 1))
            by = up[idx]
            # normal da curva (aprox.) e inclinacao para fora
            dx = x[min(idx + 1, len(x) - 1)] - x[max(idx - 1, 0)]; dy = up[min(idx + 1, len(x) - 1)] - up[max(idx - 1, 0)]
            nx, ny = -dy, dx; nl_ = math.hypot(nx, ny) or 1; nx, ny = nx / nl_, ny / nl_
            out = 0.35 + 0.9 * t                                  # inclina para fora
            ang = math.atan2(ny, nx) - out * 0.55 * (1 if True else -1)
            if ls == "natural": ln_ = (0.0030 + 0.0035 * math.sin(math.pi * min(t, 1) * 0.85)) * (0.85 + 0.3 * rng.rand()); th = 0.00042
            elif ls == "doll": ln_ = (0.0042 + 0.0060 * math.sin(math.pi * min(t, 1) * 0.8) ** 0.9 + 0.002 * t) * (0.85 + 0.3 * rng.rand()); th = 0.00075
            else: ln_ = (0.0060 + 0.0090 * math.sin(math.pi * min(t, 1) * 0.75) ** 0.9 + 0.0065 * t ** 2) * (0.8 + 0.4 * rng.rand()); th = 0.00115
            pts_ = []
            for k in range(7):                                    # curva com curvatura para cima
                u = k / 6
                a_ = ang + u * (0.55 if ls in ("doll", "dolla") else 0.35)
                px_ = bx + math.cos(ang) * ln_ * u + (math.cos(a_ + 1.2) * 0.12 * ln_ * u * u)
                py_ = by + math.sin(ang) * ln_ * u + (math.sin(a_ + 1.2) * 0.12 * ln_ * u * u)
                pts_.append(cv.p(px_, py_))
            for k in range(6):
                wk = max(1, int(cv.m(th * (1 - 0.8 * k / 6))))
                dla.line([pts_[k], pts_[k + 1]], fill=255, width=wk)
        if ls == "dolla":                                         # cilios inferiores finos (castanho-escuros), so no 70% externo
            for i in range(22):
                t = 0.18 + 0.82 * i / 21; idx = int(t * (len(x) - 1))
                bx, by = x[idx], lo[idx]
                L_ = 0.0042 + 0.0028 * math.sin(math.pi * t)
                dla.line([cv.p(bx, by), cv.p(bx + 0.0014 + 0.0016 * t, by - L_)], fill=150, width=max(1, int(cv.m(0.00055))))
        if ls == "doll":                                          # cilios inferiores curtos
            for i in range(9):
                t = 0.2 + 0.7 * i / 8; idx = int(t * (len(x) - 1))
                bx, by = x[idx], lo[idx]
                dla.line([cv.p(bx, by), cv.p(bx + 0.0008, by - 0.0035 - 0.0015 * math.sin(math.pi * t))], fill=200, width=max(1, int(cv.m(0.0004))))
        la = cv.blur(la, 0.00010)
        cv.save(f"lash_{ls}_{name}", la)


def draw_brow(name, thick, arch, taper, tilt, length, solid=170):
    cv = Cv("brow")
    n = 80; t = np.linspace(0, 1, n)
    x = -length / 2 + length * t
    y = arch * np.sin(np.pi * t ** 1.1) + tilt * (t - 0.5)
    th = thick * (0.55 + 0.6 * np.sin(np.pi * np.clip(t * 0.9 + 0.05, 0, 1)) ** 0.7) * (1 - taper * np.clip((t - 0.55) / 0.45, 0, 1) ** 1.3) * (0.30 + 0.70 * np.clip(np.minimum(t, 1 - t) / 0.14, 0, 1) ** 0.6)
    top = cv.pts(x, y + th / 2); bot = cv.pts(x[::-1], (y - th / 2)[::-1])
    shape = cv.new(0); ImageDraw.Draw(shape).polygon(top + bot, fill=255)
    shape = cv.blur(shape, 0.00045)
    # pelos: tracos finos com leve variacao de alfa/direcao
    rng = np.random.RandomState(3)
    hairs = cv.new(0); dh = ImageDraw.Draw(hairs)
    for i in range(520):
        tt = rng.rand(); k = int(tt * (n - 1))
        px = x[k] + rng.randn() * 0.0003; py = y[k] + (rng.rand() - 0.5) * th[k] * 0.9
        ang = (0.6 - 0.9 * tt) * 0.0 + (math.atan2(np.gradient(y)[k], np.gradient(x)[k])) + (rng.rand() - 0.5) * 0.5 - 0.25
        ln = 0.0035 + rng.rand() * 0.004
        dh.line([cv.p(px, py), cv.p(px + math.cos(ang) * ln, py + math.sin(ang) * ln)], fill=int(90 + rng.rand() * 110), width=max(1, int(cv.m(0.00028))))
    hairs = cv.blur(hairs, 0.00008)
    alpha = ImageChops.multiply(shape, ImageChops.lighter(hairs.point(lambda v: 150 + v // 3), shape.point(lambda v: 0)))
    alpha = ImageChops.lighter(ImageChops.multiply(alpha, Image.new("L", alpha.size, 255)), ImageChops.multiply(shape, Image.new("L", shape.size, solid)))
    cv.save(f"brow_{name}", alpha)


def draw_mouth(name, width, up_t, lo_t, bow, corner, gloss_str):
    cv = Cv("mouth")
    n = 160; t = np.linspace(0, 1, n)
    x = -width / 2 + width * t
    edge = np.sin(np.pi * t) ** 0.6
    # linha da boca (curva levemente caida nos cantos)
    line_y = -corner * (2 * t - 1) ** 2 * 0.9 + corner * 0.25
    # labio superior: cupido (dois picos + vale central)
    cupid = bow * (np.exp(-((t - 0.5) / 0.07) ** 2) * -1 + 0.9 * (np.exp(-((t - 0.36) / 0.09) ** 2) + np.exp(-((t - 0.64) / 0.09) ** 2)))
    up_y = line_y + up_t * edge ** 1.0 + cupid * up_t
    lo_y = line_y - lo_t * np.sin(np.pi * t) ** 0.75
    upper = cv.new(0); ImageDraw.Draw(upper).polygon(cv.pts(np.concatenate([x, x[::-1]]), np.concatenate([up_y, line_y[::-1] + 0.0002])), fill=255)
    lower = cv.new(0); ImageDraw.Draw(lower).polygon(cv.pts(np.concatenate([x, x[::-1]]), np.concatenate([line_y - 0.0002, lo_y[::-1]])), fill=255)
    lips = ImageChops.lighter(upper, lower)
    lips = cv.blur(lips, 0.00028)
    # sombreamento (cinza): labio superior mais escuro, inferior mais claro no centro, cantos e linha escuros
    gy = cv.new(0); dg = ImageDraw.Draw(gy)
    shade = np.zeros((cv.h * SS, cv.w * SS), np.float32)
    yy, xx = np.mgrid[0:cv.h * SS, 0:cv.w * SS].astype(np.float32)
    ux = (xx / (cv.w * SS) - 0.5) * cv.W; uy = (0.5 - yy / (cv.h * SS)) * cv.H
    ly = np.interp(ux, x, line_y)
    val = np.where(uy > ly, 0.72 + 0.10 * np.clip((uy - ly) / max(up_t, 1e-4), 0, 1), 0.92 - 0.12 * np.clip(((uy - ly) / -max(lo_t, 1e-4)), 0, 1) ** 2)
    val = np.where(np.abs(uy - ly) < 0.0004, 0.28, val)                    # linha da boca
    val = val * (0.78 + 0.22 * np.clip(1 - (np.abs(ux) / (width / 2)) ** 3, 0, 1))
    g = Image.fromarray((np.clip(val, 0, 1) * 255).astype(np.uint8), "L")
    cv.save(f"mouth_{name}_lips", lips, g)
    # brilho (fixo, branco): faixa no labio inferior + ponto no superior; intensidade pela alfa
    gl = cv.new(0); dgl = ImageDraw.Draw(gl)
    t2 = np.linspace(0.22, 0.78, 40); x2 = -width / 2 + width * t2
    ly2 = np.interp(x2, x, line_y); lw = np.interp(x2, x, lo_y)
    ymid = (ly2 + lw) / 2 - lo_t * 0.05
    dgl.line(cv.pts(x2, ymid), fill=int(255 * gloss_str), width=max(1, int(cv.m(lo_t * 0.28))))
    t3 = np.linspace(0.30, 0.70, 30); x3 = -width / 2 + width * t3
    uy3 = np.interp(x3, x, up_y); ly3 = np.interp(x3, x, line_y)
    dgl.line(cv.pts(x3, (uy3 * 0.65 + ly3 * 0.35)), fill=int(150 * gloss_str), width=max(1, int(cv.m(up_t * 0.2))))
    gl = ImageChops.multiply(cv.blur(gl, 0.00045), lips)
    cv.save(f"mouth_{name}_gloss", gl)


def draw_blush():
    cv = Cv("blush")
    h, w = cv.h * SS, cv.w * SS
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    ux = (xx / w - 0.5) * cv.W; uy = (0.5 - yy / h) * cv.H
    r = np.hypot(ux / 0.036, uy / 0.026)
    a = np.clip(1 - r, 0, 1) ** 1.7
    cv.save("blush", Image.fromarray((a * 255).astype(np.uint8), "L"))


def main():
    for k, s in EYES.items(): draw_eye(k, s)
    draw_brow("thick", 0.0098, 0.0012, 0.35, 0.0006, 0.062)
    draw_brow("arched", 0.0070, 0.0058, 0.55, -0.0008, 0.066)
    draw_brow("thin", 0.0036, 0.0030, 0.6, 0.0004, 0.062)
    draw_mouth("natural", 0.046, 0.0050, 0.0068, 0.30, 0.0009, 0.35)
    draw_mouth("thin", 0.043, 0.0032, 0.0046, 0.18, 0.0012, 0.2)
    draw_mouth("doll", 0.040, 0.0078, 0.0112, 0.55, -0.0004, 1.0)
    draw_mouth("dollg", 0.060, 0.0098, 0.0150, 0.50, -0.0010, 0.5)
    draw_brow("soft", 0.0120, 0.0030, 0.62, 0.0010, 0.064, 238)
    draw_brow("ref", 0.0085, 0.0010, 0.40, 0.0006, 0.070, 225)
    draw_mouth("ref", 0.056, 0.0058, 0.0082, 0.30, 0.0004, 0.30)
    draw_blush()
    kit = {
        "canvas": {k: list(v) for k, v in CANVAS.items()},
        "eyes": [{"id": k, "label": v["label"]} for k, v in EYES.items()],
        "lashes": [{"id": "none", "label": "Sem cilios"}, {"id": "natural", "label": "Natural"}, {"id": "doll", "label": "Boneca (volumosos)"}, {"id": "dolla", "label": "Boneca pintada (pretos)"}],
        "brows": [{"id": "thick", "label": "Reta grossa"}, {"id": "arched", "label": "Arqueada"}, {"id": "thin", "label": "Fina natural"}, {"id": "soft", "label": "Macia (boneca)"}, {"id": "ref", "label": "Reta grossa com fios (referencia)"}],
        "mouths": [{"id": "natural", "label": "Natural masculina"}, {"id": "thin", "label": "Fina"}, {"id": "doll", "label": "Boneca glossy"}, {"id": "dollg", "label": "Boneca cheia glossy"}, {"id": "ref", "label": "Cheia natural (referencia)"}],
        "files": "eye_<id>_{sclera,iris,hi,line}.png, lash_<lash>_<eye>.png, brow_<id>.png, mouth_<id>_{lips,gloss}.png, blush.png",
    }
    json.dump(kit, open(os.path.join(OUT, "kit.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print("kit ok", len(os.listdir(OUT)), "arquivos")


if __name__ == "__main__":
    main()

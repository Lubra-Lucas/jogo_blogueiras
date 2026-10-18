"""Kit de camadas MASCULINAS (barba, olheira, linhas de expressao) -> public/assets/characters/male/face/
Usage: python make_face_kit.py && python make_face_kit2.py
Camadas de rosto inteiro usam coordenadas ABSOLUTAS do espaco de repouso (x, y em metros; centro do canvas em kit.json -> faceCanvas).
"""
import os, json, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import make_face_kit as K0

OUT = K0.OUT
KB = 6000
FACE_CANVAS = {"beard": ((0.200, 0.170), (0.0, 1.495)), "lines": ((0.200, 0.200), (0.0, 1.59))}


class FCv:
    def __init__(self, name):
        (self.W, self.H), (self.cx, self.cy) = FACE_CANVAS[name]
        self.w, self.h = int(self.W * KB), int(self.H * KB)

    def p(self, x, y): return ((x - self.cx) / self.W + 0.5) * self.w, (0.5 - (y - self.cy) / self.H) * self.h
    def pts(self, P): return [self.p(x, y) for x, y in P]
    def m(self, d): return d * KB
    def new(self): return Image.new("L", (self.w, self.h), 0)

    def save(self, name, a):
        Image.merge("RGBA", (Image.new("L", a.size, 255),) * 3 + (a,)).save(os.path.join(OUT, name + ".png"), optimize=True)


def sym(P):
    """lado x>=0 -> contorno fechado simetrico"""
    return list(P) + [(-x, y) for x, y in P[::-1]]


def strokes(cv, mask, dens, length, thick, seed, ang0=-1.45, spread=0.5, lo=120, hi=255):
    rng = np.random.RandomState(seed)
    ys, xs = np.nonzero(np.array(mask) > 40)
    n = int(len(xs) * dens)
    idx = rng.choice(len(xs), n, replace=(n > len(xs)))
    out = Image.new("L", mask.size, 0); d = ImageDraw.Draw(out)
    for i in idx:
        x, y = xs[i], ys[i]
        xm = (x / cv.w - 0.5) * cv.W + cv.cx
        ang = ang0 + 0.5 * math.copysign(1, xm) * spread * min(abs(xm) / 0.05, 1) + (rng.rand() - 0.5) * 0.9
        ln = cv.m(length) * (0.6 + 0.8 * rng.rand())
        d.line([(x, y), (x + math.cos(ang) * ln, y - math.sin(ang) * ln)], fill=int(lo + (hi - lo) * rng.rand()), width=max(1, int(cv.m(thick))))
    return out


def poly(cv, P, blur=0.0006):
    m = Image.new("L", (cv.w, cv.h), 0); ImageDraw.Draw(m).polygon(cv.pts(P), fill=255)
    return m.filter(ImageFilter.GaussianBlur(cv.m(blur)))


def lip_cut(cv):
    m = Image.new("L", (cv.w, cv.h), 0); ImageDraw.Draw(m).ellipse(cv.pts([(-0.0235, 1.512), (0.0235, 1.492)]), fill=255)
    return m.filter(ImageFilter.GaussianBlur(cv.m(0.0008)))


JAW = [(0.081, 1.572), (0.081, 1.548), (0.076, 1.520), (0.068, 1.497), (0.056, 1.476), (0.040, 1.462), (0.020, 1.4545), (0.0, 1.4515)]
CHEEK = [(0.0, 1.5255), (0.020, 1.5245), (0.034, 1.521), (0.047, 1.536), (0.062, 1.552), (0.074, 1.567)]

def must_mask(cv):
    right = [(0.0, 1.5290), (0.010, 1.5305), (0.022, 1.5265), (0.033, 1.5170), (0.039, 1.5085), (0.036, 1.5035), (0.028, 1.5105), (0.016, 1.5150), (0.0, 1.5155)]
    P = [(x, y) for x, y in right] + [(-x, y) for x, y in right[::-1]]
    return poly(cv, P)


def goatee_mask(cv):
    right = [(0.0, 1.4905), (0.012, 1.4885), (0.019, 1.478), (0.021, 1.4665), (0.016, 1.4545), (0.0, 1.4525)]
    P = [(x, y) for x, y in right] + [(-x, y) for x, y in right[::-1]]
    return poly(cv, P, 0.0007)


def draw_beards():
    cv = FCv("beard")
    # barba cheia curta: borda do rosto -> contorno da bochecha, mais bigode e cavanhaque, recorte da boca
    outer = JAW[::-1] + CHEEK[::-1]            # queixo -> costeleta -> contorno da bochecha (volta ao centro)
    P = [(x, y) for x, y in outer] + [(-x, y) for x, y in outer[::-1]]
    full = poly(cv, P, 0.0010)
    full = ImageChops.lighter(full, ImageChops.lighter(must_mask(cv), goatee_mask(cv)))
    full = ImageChops.subtract(full, lip_cut(cv))
    st = strokes(cv, full, 1.1, 0.0026, 0.0006, 5, lo=150, hi=255)
    noise = Image.fromarray((np.random.RandomState(4).rand(cv.h // 6 + 1, cv.w // 6 + 1) * 70 + 185).astype(np.uint8), "L").resize((cv.w, cv.h), Image.BICUBIC)
    body = ImageChops.multiply(full, noise).point(lambda v: min(255, int(v * 0.97)))
    cv.save("beard_full", ImageChops.lighter(body, ImageChops.multiply(st, full)))
    # por fazer: regiao maior (labio superior, queixo e sob o queixo), so pontos esparsos
    under = [(0.081, 1.560), (0.081, 1.548), (0.076, 1.518), (0.068, 1.494), (0.054, 1.468), (0.040, 1.450), (0.020, 1.440), (0.0, 1.436)]
    top = [(0.0, 1.5345), (0.020, 1.5335), (0.034, 1.5345), (0.047, 1.540), (0.062, 1.552), (0.074, 1.558)]
    P = [(x, y) for x, y in under[::-1] + top[::-1]]
    P = P + [(-x, y) for x, y in P[::-1]]
    reg = poly(cv, P, 0.0035)
    reg = ImageChops.subtract(reg, lip_cut(cv))
    rng = np.random.RandomState(9)
    ra = np.array(reg)
    ys, xs = np.nonzero(ra > 10)
    dots = Image.new("L", (cv.w, cv.h), 0); dd = ImageDraw.Draw(dots)
    for i in rng.choice(len(xs), int(len(xs) * 0.07), replace=False):
        x, y = xs[i], ys[i]; r = 0.9 + rng.rand() * 1.2
        dd.ellipse([x - r, y - r, x + r, y + r], fill=int(ra[y, x] * (0.4 + 0.6 * rng.rand())))
    cv.save("beard_stubble", dots.filter(ImageFilter.GaussianBlur(0.6)))
    mm = must_mask(cv)
    cv.save("beard_mustache", ImageChops.lighter(mm.point(lambda v: int(v * 0.8)), strokes(cv, mm, 0.85, 0.0020, 0.0005, 6, ang0=-1.2, spread=1.2)))
    mg = ImageChops.lighter(goatee_mask(cv), mm)
    cv.save("beard_goatee", ImageChops.lighter(mg.point(lambda v: int(v * 0.78)), strokes(cv, mg, 0.8, 0.0022, 0.0005, 7)))


def draw_bags():
    cv = K0.Cv("eye")
    a = cv.new(0); d = ImageDraw.Draw(a)
    x = np.linspace(-0.0165, 0.0175, 40)
    top = np.full(40, -0.0075)
    bot = -0.0075 - 0.0125 * np.sin(np.pi * np.linspace(0, 1, 40)) ** 0.9
    d.polygon(cv.pts(np.concatenate([x, x[::-1]]), np.concatenate([top, bot[::-1]])), fill=200)
    cv.save("eye_bags", cv.blur(a, 0.0032))


def draw_lines():
    cv = FCv("lines")
    a = cv.new(); d = ImageDraw.Draw(a)
    w = max(1, int(cv.m(0.00075)))
    for yy, half in ((1.645, 0.040), (1.6595, 0.042), (1.674, 0.038)):
        for sgn in (-1, 1):
            xs = np.linspace(0.006, half, 24)
            d.line(cv.pts([(sgn * x_, yy + 0.0015 * math.sin(x_ / half * math.pi * 1.1) - 0.0008 * (x_ / half) ** 2) for x_ in xs]), fill=150, width=w)
    for sgn in (-1, 1):
        for k, ang in enumerate((0.45, 0.0, -0.45)):
            x0, y0 = sgn * 0.0675, 1.5835 + (k - 1) * 0.002
            L = 0.011 - 0.002 * abs(k - 1)
            d.line(cv.pts([(x0, y0), (x0 + sgn * math.cos(ang) * L, y0 + math.sin(ang) * L)]), fill=130, width=w)
        d.line(cv.pts([(sgn * (0.0235 + 0.009 * t ** 1.1), 1.543 - 0.047 * t) for t in np.linspace(0, 1, 30)]), fill=140, width=w)
    cv.save("lines", a.filter(ImageFilter.GaussianBlur(0.9)))


def main():
    draw_beards(); draw_bags(); draw_lines()
    kp = os.path.join(OUT, "kit.json")
    kit = json.load(open(kp, encoding="utf-8"))
    kit["beards"] = [{"id": "none", "label": "Sem barba"}, {"id": "stubble", "label": "Por fazer"}, {"id": "mustache", "label": "Bigode"},
                     {"id": "goatee", "label": "Cavanhaque"}, {"id": "full", "label": "Barba cheia curta"}]
    kit["faceCanvas"] = {k: {"size": list(v[0]), "center": list(v[1])} for k, v in FACE_CANVAS.items()}
    kit["extras"] = "beard_<stubble|mustache|goatee|full>.png (canvas beard), eye_bags.png (canvas eye), lines.png (canvas lines)"
    json.dump(kit, open(kp, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print("kit2 ok")


if __name__ == "__main__":
    main()

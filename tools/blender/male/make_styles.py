"""Lote de estilos do rosto (olhos, cilios, sobrancelhas, bocas, barbas, nariz, extras, pinturas) -> public/assets/characters/male/face/
e src/shared/faceKit.generated.ts (catalogos + geometria do atlas, a UNICA fonte da verdade dos ids/etiquetas/grupos).
Usage: python make_face_kit.py && python make_face_kit2.py && python extract_classic_layers.py (ja feitos) ; python make_styles.py
Texturas (para caber nos samplers: tudo em ATLAS, estilo escolhido por indice de celula em uniform):
  parts.png        brow (4x4 celulas), mouth (4x4), lash (4x3): RGBA
                   brow: A = cobertura, RGB = cor (branco = tingivel pela cor da sobrancelha; colorido = mantem)
                   mouth: R = labios (cinza), G = cobertura, B = brilho, A = 255 normal | ~190 = 2a cor (lingua/batom 2) | ~125 = dentes
                   lash: A = cobertura, RGB = cor (branco = tingivel)
  extras.png       RGB: R = nariz, G = sardas/pintas, B = contorno/idade (4x4 celulas de rosto inteiro), A = 255
  paint.png        A = pinturas de festa (4x4 celulas), RGB branco
  eye_<id>_sclera.png / eyepk_<id>.png   olho: esclera RGBA; pk = R brilho, G delineado, B iris (0,1 + 0,9*cinza; 0 = fora), A = 255
  beard_<id>.png   cinza (R) 4000 px/m
  classic_parts.png (1024x3072): lash/brow/mouth da Classica empilhados
"""
import os, sys, json, math, shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import make_face_kit as K
K.SKIP_LASH = True
import make_face_kit2 as K2

REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
SRC = os.path.join(HERE, "kit_src")
OUT = os.path.join(REPO, "public", "assets", "characters", "male", "face")
GEN = os.path.join(REPO, "src", "shared", "faceKit.generated.ts")
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT): os.remove(os.path.join(OUT, f))

PM = 5000                      # px/m dos atlas de partes
BROW_C, MOUTH_C, LASH_C = (450, 170), (450, 260), (500, 450)   # tamanho das celulas
BROW_M, MOUTH_M, LASH_M = (0.09, 0.034), (0.09, 0.052), (0.10, 0.09)
ATLAS_W = 2000
SHEETS = {"brow": (0, 4, 4, BROW_C), "mouth": (680, 4, 5, MOUTH_C), "lash": (1980, 4, 4, LASH_C)}   # y0, cols, rows, cell
ATLAS_H = 1980 + 4 * 450
FACE_CELL = (256, 358)         # celula dos atlas de rosto inteiro (0,20 x 0,28 m); canvas = x -0,1..0,1 ; y 1,41..1,69 (coordenadas do masculino)
FACE_CAN = {"x0": -0.10, "x1": 0.10, "y0": 1.41, "y1": 1.69}

LASH_STD = dict(a=0.016, hu=0.0085, hl=0.0058, kin=0.85, kl=1.1, pu=0.8, pl=0.9, lift=0.0008)
CATALOG = {}                     # categoria -> lista de dicts


def add(cat, id_, label, group="natural", g="mf", **extra):
    CATALOG.setdefault(cat, []).append(dict(id=id_, label=label, group=group, g=g, **extra))


def L(name): return Image.open(os.path.join(SRC, name + ".png")).convert("RGBA")


# ------------------------------------------------------------------ olhos
def eyes():
    for k, s in K.EYES.items(): K.draw_eye(k, s)
    groups = {"natural": "natural", "almond": "natural", "ref": "natural", "small": "natural", "round": "natural", "hooded": "natural", "droopy": "natural",
              "monolid": "natural", "longalmond": "natural", "sleepy": "natural", "doll": "glam", "dolla": "glam", "cat": "glam", "catliner": "glam",
              "heart": "fun", "star": "fun", "slit": "fun", "anime": "fun", "spiral": "fun", "cartoon": "fun"}
    order = ["natural", "almond", "small", "round", "hooded", "droopy", "monolid", "longalmond", "sleepy", "ref", "cat", "catliner", "doll", "dolla", "anime", "heart", "star", "slit", "spiral", "cartoon"]
    for e in order:
        s = K.EYES[e]
        sc = L(f"eye_{e}_sclera").resize((560, 504), Image.LANCZOS); sc.save(os.path.join(OUT, f"eye_{e}_sclera.png"), optimize=True)
        hi = np.asarray(L(f"eye_{e}_hi"))[..., 3]; ln = np.asarray(L(f"eye_{e}_line"))[..., 3]
        ir = np.asarray(L(f"eye_{e}_iris")); gray = ir[..., 0].astype(np.float32) / 255; ia = ir[..., 3].astype(np.float32) / 255
        b = np.where(ia > 0.004, 0.1 + 0.9 * gray, 0) * np.minimum(ia * 4, 1) * 255
        pk = np.stack([hi, ln, b.astype(np.uint8), np.full_like(hi, 255)], -1)
        Image.fromarray(pk.astype(np.uint8), "RGBA").resize((560, 504), Image.LANCZOS).save(os.path.join(OUT, f"eyepk_{e}.png"), optimize=True)
        add("eyes", e, s["label"].replace("Boneca pintada", "Boneca pintada"), groups[e], "mf" if e not in ("dolla",) else "f", geom=dict(a=s["a"], hu=s["hu"], lift=s["lift"]), defIris=None)
    # classica (pintura original)
    shutil.copy(os.path.join(SRC, "eye_classic_sclera.png"), OUT); shutil.copy(os.path.join(SRC, "eye_classic_iris.png"), OUT)
    add("eyes", "classic", "Clássico (pintura original)", "natural", "f", geom=dict(a=0.0285, hu=0.0175, lift=0.0))


# ------------------------------------------------------------------ cilios
def lash_cell(style):
    cv = K.Cv("eye")
    x, up, lo = K.eye_curves(LASH_STD)
    la = Image.new("RGBA", (cv.w * K.SS, cv.h * K.SS), (0, 0, 0, 0)); d = ImageDraw.Draw(la)
    rng = np.random.RandomState(abs(hash(style)) % 1000 + 7)
    P = dict(
        natural=dict(n=14, t0=.12, t1=1.0, base=.0030, grow=.0035, th=.00042, curl=.35, flick=0),
        doll=dict(n=26, t0=.05, t1=1.04, base=.0042, grow=.0060, th=.00075, curl=.55, flick=0),
        dolla=dict(n=30, t0=.02, t1=1.06, base=.0060, grow=.0090, th=.0011, curl=.55, flick=0.002),
        cat=dict(n=20, t0=.25, t1=1.08, base=.0020, grow=.0125, th=.0008, curl=.9, flick=.004),
        spider=dict(n=11, t0=.1, t1=1.0, base=.0075, grow=.0050, th=.00055, curl=.3, flick=0),
        lower=dict(n=16, t0=.10, t1=1.0, base=.0030, grow=.0040, th=.0006, curl=.3, flick=0),
        long=dict(n=20, t0=.06, t1=1.05, base=.0090, grow=.0090, th=.00075, curl=.8, flick=0),
        rainbow=dict(n=26, t0=.05, t1=1.04, base=.0050, grow=.0070, th=.0009, curl=.55, flick=0),
        glitter=dict(n=24, t0=.05, t1=1.04, base=.0050, grow=.0070, th=.0009, curl=.55, flick=0),
        feather=dict(n=14, t0=.12, t1=1.05, base=.0070, grow=.0060, th=.0016, curl=.7, flick=0),
    )[style]
    nl = P["n"]
    for i in range(nl):
        t = P["t0"] + (P["t1"] - P["t0"]) * i / (nl - 1); ti = min(t, 1.0)
        bx = -LASH_STD["a"] + 2 * LASH_STD["a"] * ti; idx = int(ti * (len(x) - 1)); by = up[idx]
        dx = x[min(idx + 1, len(x) - 1)] - x[max(idx - 1, 0)]; dy = up[min(idx + 1, len(x) - 1)] - up[max(idx - 1, 0)]
        nx, ny = -dy, dx; nlen = math.hypot(nx, ny) or 1; nx, ny = nx / nlen, ny / nlen
        ang = math.atan2(ny, nx) - (0.35 + 0.9 * t) * 0.55
        ln_ = (P["base"] + P["grow"] * math.sin(math.pi * min(t, 1) * 0.8) ** 0.9 + (P["flick"] * t ** 2 if P["flick"] else 0)) * (0.85 + 0.3 * rng.rand())
        if style == "cat": ln_ = (P["base"] + P["grow"] * t ** 2.2) * (0.9 + 0.2 * rng.rand())
        pts = []
        for k in range(7):
            u = k / 6; a_ = ang + u * P["curl"]
            pts.append(cv.p(bx + math.cos(ang) * ln_ * u + math.cos(a_ + 1.2) * 0.12 * ln_ * u * u, by + math.sin(ang) * ln_ * u + math.sin(a_ + 1.2) * 0.12 * ln_ * u * u))
        hue = i / (nl - 1)
        for k in range(6):
            wk = max(1, int(cv.m(P["th"] * (1 - 0.75 * k / 6))))
            if style == "rainbow":
                import colorsys
                r_, g_, b_ = [int(c * 255) for c in colorsys.hsv_to_rgb(hue * 0.85, 0.75, 1.0)]; col = (r_, g_, b_, 255)
            elif style == "glitter":
                tip = k >= 4; col = (255, 214, 120, 255) if tip else (255, 255, 255, 255)
                if tip and rng.rand() < 0.5: col = (255, 170, 215, 255)
            elif style == "feather":
                col = (255, 255, 255, int(255 * (1 - 0.35 * k / 6)))
            else: col = (255, 255, 255, 255)
            d.line([pts[k], pts[k + 1]], fill=col, width=wk)
    if style in ("lower", "doll", "dolla"):
        for i in range(14 if style == "lower" else 9):
            t = 0.12 + 0.8 * i / (13 if style == "lower" else 8); idx = int(t * (len(x) - 1)); bx, by = x[idx], lo[idx]
            Ln = (0.0050 if style == "lower" else 0.0035) + 0.0015 * math.sin(math.pi * t)
            d.line([cv.p(bx, by), cv.p(bx + 0.0012 + 0.0012 * t, by - Ln)], fill=(255, 255, 255, 255 if style == "lower" else 200), width=max(1, int(cv.m(0.0006 if style == "lower" else 0.0004))))
    la = la.filter(ImageFilter.GaussianBlur(0.00010 * K.K * K.SS)).resize((cv.w, cv.h), Image.LANCZOS)
    return la.resize(LASH_C, Image.LANCZOS)


LASH_LIST = [("natural", "Natural", "natural", "mf"), ("doll", "Volumosos", "glam", "f"), ("dolla", "Volumosos pretos", "glam", "f"), ("cat", "Gatinho", "glam", "f"),
             ("spider", "Separados (spider)", "glam", "mf"), ("lower", "Inferiores marcados", "natural", "mf"), ("long", "Longuíssimos", "glam", "f"),
             ("rainbow", "Arco-íris", "fun", "mf"), ("glitter", "Pontas de glitter", "fun", "mf"), ("feather", "Penas", "fun", "mf")]


# ------------------------------------------------------------------ sobrancelhas
def brow_cell(style):
    cv = K.Cv("brow"); rng = np.random.RandomState(abs(hash(style)) % 1000 + 3)
    n = 90; t = np.linspace(0, 1, n)
    P = dict(  # thick, arch, taper, tilt, length, peak(None|pos), gap, feather, dots, unibrow
        angular=dict(th=.0080, arch=.0036, taper=.55, tilt=.0004, ln=.066, peak=.62),
        thinstraight=dict(th=.0030, arch=.0004, taper=.4, tilt=.0003, ln=.068),
        archhigh=dict(th=.0070, arch=.0070, taper=.6, tilt=-.0006, ln=.066),
        gap=dict(th=.0082, arch=.0016, taper=.4, tilt=.0004, ln=.066, gap=.40),
        feathered=dict(th=.0090, arch=.0020, taper=.5, tilt=.0004, ln=.070, feather=True),
        bushy=dict(th=.0125, arch=.0006, taper=.15, tilt=.0004, ln=.070),
        short=dict(th=.0080, arch=.0004, taper=.3, tilt=.0004, ln=.045),
        glitter=dict(th=.0090, arch=.0030, taper=.5, tilt=.0004, ln=.066, glitter=True),
        rainbow=dict(th=.0085, arch=.0030, taper=.3, tilt=.0004, ln=.066, rainbow=True),
        dots=dict(th=.0080, arch=.0034, taper=.0, tilt=.0004, ln=.066, dots=True),
        uni=dict(th=.0105, arch=.0010, taper=.0, tilt=.0, ln=.088, shift=0.0),
    )[style]
    ln = P["ln"]; x = -ln / 2 + ln * t + P.get("shift", 0.0)
    if P.get("peak"):
        pk = P["peak"]; y = np.where(t < pk, P["arch"] * t / pk, P["arch"] * (1 - t) / (1 - pk)) + P["tilt"] * (t - 0.5)
    else: y = P["arch"] * np.sin(np.pi * t ** 1.1) + P["tilt"] * (t - 0.5)
    th = P["th"] * (0.55 + 0.6 * np.sin(np.pi * np.clip(t * 0.9 + 0.05, 0, 1)) ** 0.7) * (1 - P["taper"] * np.clip((t - 0.55) / 0.45, 0, 1) ** 1.3) * (0.30 + 0.70 * np.clip(np.minimum(t, 1 - t) / 0.14, 0, 1) ** 0.6)
    if P.get("uni"): th = P["th"] * (0.6 + 0.4 * np.sin(np.pi * t))
    img = Image.new("RGBA", (cv.w * K.SS, cv.h * K.SS), (0, 0, 0, 0))
    mask = cv.new(0)
    if P.get("dots"):
        dm = ImageDraw.Draw(mask)
        for k in range(14):
            tt = (k + 0.5) / 14; i = int(tt * (n - 1)); r_ = cv.m(0.0017 * (0.7 + 0.5 * np.sin(np.pi * tt)))
            px, py = cv.p(x[i], y[i]); dm.ellipse([px - r_, py - r_, px + r_, py + r_], fill=255)
    else:
        ImageDraw.Draw(mask).polygon(cv.pts(x, y + th / 2) + cv.pts(x[::-1], (y - th / 2)[::-1]), fill=255)
        mask = cv.blur(mask, 0.00040)
    hairs = cv.new(0); dh = ImageDraw.Draw(hairs)
    nh = 900 if P.get("feather") else 520
    for i in range(0 if P.get("dots") else nh):
        tt = rng.rand(); k = int(tt * (n - 1)); px = x[k] + rng.randn() * 0.0003; py = y[k] + (rng.rand() - 0.5) * th[k] * 0.9
        ang = math.atan2(np.gradient(y)[k], np.gradient(x)[k]) + (rng.rand() - 0.5) * (1.1 if P.get("feather") else 0.5) - 0.25
        L_ = (0.0050 if P.get("feather") else 0.0035) + rng.rand() * 0.004
        dh.line([cv.p(px, py), cv.p(px + math.cos(ang) * L_, py + math.sin(ang) * L_)], fill=int(90 + rng.rand() * 110), width=max(1, int(cv.m(0.00026))))
    hairs = cv.blur(hairs, 0.00008)
    solid = 90 if P.get("feather") else (225 if not P.get("dots") else 255)
    a = ImageChops.lighter(ImageChops.multiply(mask, hairs.point(lambda v: 150 + v // 3)), mask.point(lambda v: int(v * solid / 255))) if not P.get("dots") else mask
    if P.get("feather"): a = ImageChops.lighter(a, ImageChops.multiply(hairs, cv.blur(mask, 0.0012)).point(lambda v: min(255, v * 2)))
    if P.get("gap"):
        gm = cv.new(255); dg = ImageDraw.Draw(gm); i = int(P["gap"] * (n - 1)); p0 = cv.p(x[i] - 0.0006, y[i] - 0.01); p1 = cv.p(x[i] + 0.0006, y[i] + 0.01)
        dg.polygon([(p0[0], p0[1]), (p1[0], p0[1] + 0), (p1[0] + cv.m(0.0008), p1[1]), (p0[0] - cv.m(0.0008), p1[1])], fill=0)
        a = ImageChops.multiply(a, gm)
    rgb = Image.new("RGB", a.size, (255, 255, 255))
    if P.get("glitter") or P.get("rainbow"):
        w_, h_ = a.size; arr = np.ones((h_, w_, 3), np.float32)
        if P.get("rainbow"):
            import colorsys
            for xx in range(0, w_, 4):
                u = xx / w_; r_, g_, b_ = colorsys.hsv_to_rgb(u * 0.85, 0.7, 1.0); arr[:, xx:xx + 4] = (r_, g_, b_)
        else:
            sp = rng.rand(h_, w_) ; sp = np.asarray(Image.fromarray((sp * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2)), np.float32) / 255
            arr = np.where(sp[..., None] > 0.58, np.array([1.0, 0.92, 0.55]), np.array([0.85, 0.55, 0.85]))
        rgb = Image.fromarray((arr * 255).astype(np.uint8), "RGB")
    out = rgb.copy(); out.putalpha(a)
    out = out.resize((cv.w, cv.h), Image.LANCZOS).resize(BROW_C, Image.LANCZOS)
    return out


BROW_LIST = [("thick", "Reta grossa", "natural", "mf", None), ("arched", "Arqueada", "natural", "mf", None), ("thin", "Fina natural", "natural", "mf", None),
             ("soft", "Macia (boneca)", "glam", "f", None), ("ref", "Reta grossa com fios", "natural", "m", None),
             ("angular", "Angulada", "glam", "mf", None), ("thinstraight", "Reta fina", "natural", "mf", None), ("archhigh", "Arqueada alta", "glam", "f", None),
             ("gap", "Com falha (risquinho)", "glam", "mf", None), ("feathered", "Fios (feathered)", "glam", "mf", None), ("bushy", "Cerrada masculina", "natural", "m", None),
             ("short", "Curta reta", "natural", "mf", None), ("glitter", "Glitter", "fun", "mf", "rgb"), ("rainbow", "Arco-íris", "fun", "mf", "rgb"),
             ("dots", "De pontinhos", "fun", "mf", None), ("uni", "Monocelha divertida", "fun", "mf", None)]
BROW_DX = {"uni": -0.0200}   # a monocelha desloca o centro da camada para junto do meio do rosto (m, no lado +x)


# ------------------------------------------------------------------ bocas
def mouth_cell(style):
    """celula RGBA: R = labios cinza, G = cobertura, B = brilho, A = 255 normal / 190 segunda cor / 125 dentes"""
    cv = K.Cv("mouth"); rng = np.random.RandomState(11)
    P = dict(
        heart=dict(w=.050, up=.0075, lo=.0092, bow=.95, c=.0006, gl=.5),
        wide=dict(w=.066, up=.0042, lo=.0058, bow=.2, c=.0004, gl=.25),
        upperfull=dict(w=.048, up=.0095, lo=.0048, bow=.5, c=.0008, gl=.35),
        smile=dict(w=.052, up=.0048, lo=.0066, bow=.25, c=-.0016, gl=.35),
        pout=dict(w=.034, up=.0078, lo=.0105, bow=.6, c=.0004, gl=.6),
        bare=dict(w=.046, up=.0050, lo=.0068, bow=.30, c=.0009, gl=.10),
        twotone=dict(w=.048, up=.0060, lo=.0085, bow=.45, c=.0006, gl=.5, two=True),
        glitter=dict(w=.048, up=.0060, lo=.0085, bow=.45, c=.0006, gl=1.0, sparkle=True),
        bigsmile=dict(w=.062, up=.0045, lo=.0090, bow=.2, c=-.0022, gl=.3, open=.0085, teeth=True),
        gap=dict(w=.056, up=.0050, lo=.0078, bow=.2, c=-.0016, gl=.3, open=.0070, teeth=True, gaptooth=True),
        tongue=dict(w=.046, up=.0060, lo=.0085, bow=.4, c=-.0010, gl=.5, open=.0045, tongue=True),
    )[style]
    n = 200; t = np.linspace(0, 1, n); width = P["w"]; x = -width / 2 + width * t
    edge = np.sin(np.pi * t) ** 0.6; line_y = -P["c"] * (2 * t - 1) ** 2 * 0.9 + P["c"] * 0.25
    cupid = P["bow"] * (np.exp(-((t - 0.5) / 0.07) ** 2) * -1 + 0.9 * (np.exp(-((t - 0.36) / 0.09) ** 2) + np.exp(-((t - 0.64) / 0.09) ** 2)))
    up_y = line_y + P["up"] * edge + cupid * P["up"]
    op = P.get("open", 0.0)
    lo_y = line_y - op * np.sin(np.pi * t) ** 0.7 - P["lo"] * np.sin(np.pi * t) ** 0.75          # contorno externo do labio de baixo
    inner_lo = line_y - op * np.sin(np.pi * t) ** 0.7                                           # borda interna (abertura)
    S = (cv.w * K.SS, cv.h * K.SS)
    def poly(a_x, a_y, b_x, b_y):
        m = cv.new(0); ImageDraw.Draw(m).polygon(cv.pts(np.concatenate([a_x, b_x[::-1]]), np.concatenate([a_y, b_y[::-1]])), fill=255); return m
    upper = poly(x, up_y, x, line_y + 0.0002)
    lower = poly(x, inner_lo - 0.0002, x, lo_y)
    inside = poly(x, line_y - 0.0001, x, inner_lo) if op > 0 else cv.new(0)
    lips = ImageChops.lighter(upper, lower); area = ImageChops.lighter(lips, inside)
    area_s = cv.blur(area, 0.00028)
    yy, xx = np.mgrid[0:S[1], 0:S[0]].astype(np.float32)
    ux = (xx / S[0] - 0.5) * cv.W; uy = (0.5 - yy / S[1]) * cv.H
    ly = np.interp(ux, x, line_y)
    val = np.where(uy > ly, 0.72 + 0.10 * np.clip((uy - ly) / max(P["up"], 1e-4), 0, 1), 0.92 - 0.12 * np.clip((uy - ly) / -max(P["lo"], 1e-4), 0, 1) ** 2)
    val = np.where(np.abs(uy - ly) < 0.0004, 0.28, val) * (0.78 + 0.22 * np.clip(1 - (np.abs(ux) / (width / 2)) ** 3, 0, 1))
    cls = np.full((S[1], S[0]), 255, np.float32)
    ins = np.asarray(inside) > 100
    if op > 0:
        val = np.where(ins, 0.10, val)
        if P.get("teeth"):
            lim = np.interp(ux, x, inner_lo)
            tz = ins & (uy > line_y.min() * 0 + np.interp(ux, x, line_y) - op * 0.62) & (np.abs(ux) < width * 0.38)
            cls = np.where(tz, 125, cls); val = np.where(tz, 0.97, val)
            if P.get("gaptooth"): g_ = tz & (np.abs(ux) < 0.0007); val = np.where(g_, 0.12, val); cls = np.where(g_, 255, cls)
        if P.get("tongue"):
            tg = Image.new("L", S, 0); dt = ImageDraw.Draw(tg); cxp, cyp = cv.p(0.0, -P["lo"] - op * 0.4 - 0.004)
            dt.ellipse([cxp - cv.m(0.0085), cyp - cv.m(0.0075), cxp + cv.m(0.0085), cyp + cv.m(0.0105)], fill=255)
            tgm = np.asarray(tg.filter(ImageFilter.GaussianBlur(cv.m(0.0002)))) > 110
            area_s = ImageChops.lighter(area_s, tg.filter(ImageFilter.GaussianBlur(cv.m(0.0002))))
            cls = np.where(tgm, 190, cls); val = np.where(tgm, 0.9, val)
            val = np.where(tgm & (np.abs(ux) < 0.0004), 0.7, val)
    if P.get("two"):
        lw = np.asarray(lower) > 100; cls = np.where(lw, 190, cls)
    gl = cv.new(0); dgl = ImageDraw.Draw(gl)
    t2 = np.linspace(0.22, 0.78, 40); x2 = -width / 2 + width * t2; ly2 = np.interp(x2, x, inner_lo); lw2 = np.interp(x2, x, lo_y)
    dgl.line(cv.pts(x2, (ly2 + lw2) / 2 - P["lo"] * 0.05), fill=int(255 * P["gl"]), width=max(1, int(cv.m(P["lo"] * 0.28))))
    t3 = np.linspace(0.30, 0.70, 30); x3 = -width / 2 + width * t3
    dgl.line(cv.pts(x3, np.interp(x3, x, up_y) * 0.65 + np.interp(x3, x, line_y) * 0.35), fill=int(150 * P["gl"]), width=max(1, int(cv.m(P["up"] * 0.2))))
    gl = ImageChops.multiply(cv.blur(gl, 0.00045), lips)
    if P.get("sparkle"):
        sp = Image.new("L", S, 0); ds = ImageDraw.Draw(sp); la_ = np.asarray(lips) > 100; ys, xs_ = np.nonzero(la_)
        for i in rng.choice(len(xs_), min(260, len(xs_)), replace=False):
            r_ = cv.m(0.00045) * (0.6 + rng.rand()); ds.ellipse([xs_[i] - r_, ys[i] - r_, xs_[i] + r_, ys[i] + r_], fill=255)
        gl = ImageChops.lighter(gl, sp)
    R = Image.fromarray((np.clip(val, 0, 1) * 255).astype(np.uint8), "L").resize((cv.w, cv.h), Image.LANCZOS)
    G = area_s.resize((cv.w, cv.h), Image.LANCZOS); B = gl.resize((cv.w, cv.h), Image.LANCZOS)
    A = Image.fromarray(cls.astype(np.uint8), "L").resize((cv.w, cv.h), Image.NEAREST)
    return Image.merge("RGBA", (R, G, B, A)).resize(MOUTH_C, Image.LANCZOS)


MOUTH_LIST = [("natural", "Natural masculina", "natural", "m"), ("thin", "Fina", "natural", "m"), ("doll", "Boneca glossy", "glam", "m"), ("dollg", "Cheia glossy", "glam", "m"),
              ("ref", "Cheia natural", "natural", "m"), ("heart", "Coração", "glam", "m"), ("wide", "Larga", "natural", "m"), ("upperfull", "Lábio de cima cheio", "natural", "m"),
              ("smile", "Sorrisinho (cantos para cima)", "natural", "m"), ("pout", "Beicinho", "glam", "m"), ("bare", "Natural sem cor", "natural", "m"),
              ("twotone", "Duas cores", "fun", "mf"), ("glitter", "Glitter", "fun", "mf"), ("bigsmile", "Sorrisão", "fun", "mf"), ("gap", "Dentinho", "fun", "mf"), ("tongue", "Língua para fora", "fun", "mf")]


def atlas_parts():
    at = Image.new("RGBA", (ATLAS_W, ATLAS_H), (0, 0, 0, 0))
    def put(sheet, idx, img):
        y0, cols, rows, (cw, ch) = SHEETS[sheet]; c, r = idx % cols, idx // cols; at.paste(img, (c * cw, y0 + r * ch))
    for i, (id_, label, grp, g, rgb) in enumerate(BROW_LIST):
        if id_ in ("thick", "arched", "thin", "soft", "ref"): im = L(f"brow_{id_}").resize(BROW_C, Image.LANCZOS)
        else: im = brow_cell(id_)
        put("brow", i, im); add("brows", id_, label, grp, g, cell=i, rgb=bool(rgb), dx=BROW_DX.get(id_, 0.0))
    for i, (id_, label, grp, g) in enumerate(MOUTH_LIST):
        if id_ in ("natural", "thin", "doll", "dollg", "ref"):
            lips = np.asarray(L(f"mouth_{id_}_lips")); gl = np.asarray(L(f"mouth_{id_}_gloss"))[..., 3]
            im = Image.fromarray(np.stack([lips[..., 0], lips[..., 3], gl, np.full_like(gl, 255)], -1), "RGBA").resize(MOUTH_C, Image.LANCZOS)
        else: im = mouth_cell(id_)
        put("mouth", i, im); add("mouths", id_, label, grp, g, cell=i)
    for i, (id_, label, grp, g) in enumerate(LASH_LIST):
        put("lash", i, lash_cell(id_)); add("lashes", id_, label, grp, g, cell=i)
    at.save(os.path.join(OUT, "parts.png"), optimize=True)
    # classica
    cp = Image.new("RGBA", (1024, 3072), (0, 0, 0, 0))
    cp.paste(L("lash_classic"), (0, 0)); cp.paste(L("brow_classic"), (0, 1024)); cp.paste(L("mouth_classic_lips"), (0, 2048))
    cp.save(os.path.join(OUT, "classic_parts.png"), optimize=True)
    add("lashes", "classic", "Clássicos (tufos)", "natural", "f", cell=-1, hidden=True)
    add("brows", "classic", "Clássica (pintura original)", "natural", "f", cell=-1, rgb=False, dx=0.0, hidden=True)
    # tinta classica como celula normal do atlas (recorte do labio pintado: 0,09 x 0,052 m centrado na boca da boneca)
    cl = L("mouth_classic_lips"); k_ = 1024 / 0.22; cx_, cy_ = 512, (1.50 - 1.318) * k_
    box = (int(cx_ - 0.045 * k_), int(cy_ - 0.026 * k_), int(cx_ + 0.045 * k_), int(cy_ + 0.026 * k_))
    arr = np.asarray(cl.crop(box).resize(MOUTH_C, Image.LANCZOS)).astype(np.float32)
    ratio = arr[..., :3].mean(-1); al = arr[..., 3]
    gloss = np.clip((ratio / 255 - 0.78) * 4, 0, 1) * al
    cell = np.stack([ratio, al, gloss, np.full_like(al, 255)], -1).astype(np.uint8)
    put("mouth", 16, Image.fromarray(cell, "RGBA")); add("mouths", "classic", "Tinta sobre os lábios esculpidos", "natural", "f", cell=16)
    for f in ("classic_shade.png", "blush.png", "eye_classic_sclera.png", "eye_classic_iris.png"): shutil.copy(os.path.join(SRC, f), OUT)


# ------------------------------------------------------------------ atlas de rosto inteiro (nariz, sardas, contorno) e pintura
class Face:
    """celula de rosto: coordenadas do masculino (m) -> pixels da celula, com supersampling 3"""
    S = 3
    def __init__(self):
        self.w, self.h = FACE_CELL[0] * self.S, FACE_CELL[1] * self.S
        self.im = Image.new("L", (self.w, self.h), 0); self.d = ImageDraw.Draw(self.im)
    def p(self, x, y): return ((x - FACE_CAN["x0"]) / 0.2 * self.w, (FACE_CAN["y1"] - y) / 0.28 * self.h)
    def m(self, d): return d / 0.2 * self.w
    def ell(self, x, y, rx, ry, v=255):
        px, py = self.p(x, y); self.d.ellipse([px - self.m(rx), py - self.m(ry), px + self.m(rx), py + self.m(ry)], fill=v)
    def line(self, pts, w, v=255): self.d.line([self.p(*q) for q in pts], fill=v, width=max(1, int(self.m(w))))
    def poly(self, pts, v=255): self.d.polygon([self.p(*q) for q in pts], fill=v)
    def blur(self, r): self.im = self.im.filter(ImageFilter.GaussianBlur(self.m(r))); self.d = ImageDraw.Draw(self.im); return self
    def out(self): return self.im.resize(FACE_CELL, Image.LANCZOS)


EX, EYY, NY, MY = 0.0485, 1.5827, 1.5423, 1.5019


def sym(F, fn):
    for s in (1, -1): fn(s)


def nose_cell(style):
    F = Face(); rng = np.random.RandomState(21)
    if style == "fine":
        sym(F, lambda s: F.line([(s * 0.0065, EYY - 0.004), (s * 0.0085, NY + 0.006), (s * 0.0125, NY - 0.002)], 0.0018, 150)); F.ell(0, NY - 0.0035, 0.0085, 0.004, 110); F.blur(0.0015)
    elif style == "wide":
        sym(F, lambda s: F.line([(s * 0.009, EYY - 0.004), (s * 0.014, NY + 0.004), (s * 0.019, NY - 0.003)], 0.0028, 150)); F.ell(0, NY - 0.0035, 0.0145, 0.0052, 120); F.blur(0.0018)
    elif style == "upturned":
        F.ell(0, NY - 0.0045, 0.0105, 0.0042, 150); sym(F, lambda s: F.ell(s * 0.0065, NY - 0.0065, 0.0028, 0.0018, 200)); F.ell(0, NY + 0.0005, 0.005, 0.0035, 60); F.blur(0.0012)
    elif style == "tip":
        F.ell(0, NY - 0.0015, 0.0075, 0.0065, 130); F.ell(0, NY - 0.004, 0.0105, 0.0035, 160); sym(F, lambda s: F.line([(s * 0.0075, EYY - 0.006), (s * 0.0090, NY + 0.004)], 0.0016, 110)); F.blur(0.0013)
    elif style == "freck":
        for k in range(46):
            x = rng.randn() * 0.021; y = NY + 0.010 + rng.randn() * 0.007
            if abs(x) < 0.05: F.ell(x, y, 0.0009 + rng.rand() * 0.0007, 0.0009 + rng.rand() * 0.0006, int(150 + rng.rand() * 100))
        F.blur(0.0004)
    elif style == "blush":
        F.ell(0, NY - 0.0035, 0.0125, 0.0100, 200); sym(F, lambda s: F.ell(s * 0.028, NY + 0.006, 0.020, 0.0085, 150)); F.blur(0.0055)
    return F.out()


NOSE_LIST = [("fine", "Fino (contorno)", "natural", "mf"), ("wide", "Largo (contorno)", "natural", "mf"), ("upturned", "Arrebitado", "natural", "mf"),
             ("tip", "Ponta definida", "natural", "mf"), ("freck", "Sardinhas no nariz", "natural", "mf"), ("blush", "Rubor no nariz", "glam", "mf")]


def freck_cell(style):
    F = Face(); rng = np.random.RandomState(33)
    def dots(n, sx, sy, cy, r0, r1, cx=0.0):
        for k in range(n):
            x = cx + rng.randn() * sx; y = cy + rng.randn() * sy
            if abs(x) < 0.075 and abs(y - EYY) < 0.09: F.ell(x, y, r0 + rng.rand() * (r1 - r0), (r0 + rng.rand() * (r1 - r0)) * 0.9, int(120 + rng.rand() * 135))
    if style == "light": dots(48, 0.030, 0.012, NY + 0.010, 0.0007, 0.0013)
    elif style == "strong": dots(150, 0.036, 0.016, NY + 0.010, 0.0010, 0.0020)
    elif style == "cheeks": sym(F, lambda s: dots(34, 0.014, 0.010, NY + 0.006, 0.0009, 0.0017, s * 0.034))
    elif style == "moles":
        for (x, y, r) in [(0.032, 1.512, 0.0020), (-0.050, 1.560, 0.0014), (0.012, 1.468, 0.0016)]: F.ell(x, y, r, r)
    elif style == "beauty": F.ell(0.021, MY + 0.012, 0.0022, 0.0022)
    elif style == "moles2":
        for (x, y, r) in [(0.032, 1.512, 0.0020), (-0.050, 1.560, 0.0014), (0.012, 1.468, 0.0016), (-0.026, 1.640, 0.0013), (0.060, 1.545, 0.0012), (-0.012, 1.492, 0.0014)]: F.ell(x, y, r, r)
    elif style == "hearts":
        for k in range(16):
            x = rng.randn() * 0.026; y = NY + 0.011 + rng.randn() * 0.010; s = 0.0030
            if abs(x) > 0.060: continue
            F.ell(x - s * 0.45, y + s * 0.2, s * 0.55, s * 0.55); F.ell(x + s * 0.45, y + s * 0.2, s * 0.55, s * 0.55); F.poly([(x - s, y), (x + s, y), (x, y - s * 1.3)])
    elif style == "stars":
        for k in range(14):
            x = rng.randn() * 0.026; y = NY + 0.011 + rng.randn() * 0.010; s = 0.0034
            if abs(x) > 0.060: continue
            F.poly([(x + math.cos(-math.pi / 2 + j * math.pi / 5) * s * (1 if j % 2 == 0 else 0.45), y - math.sin(-math.pi / 2 + j * math.pi / 5) * s * (1 if j % 2 == 0 else 0.45)) for j in range(10)])
    return F.blur(0.0003).out()


FRECK_LIST = [("light", "Sardas leves", "natural", "mf"), ("strong", "Sardas fortes", "natural", "mf"), ("cheeks", "Sardas nas bochechas", "natural", "mf"),
              ("moles", "Pintas (3 posições)", "natural", "mf"), ("beauty", "Pinta ao lado da boca", "glam", "mf"), ("moles2", "Várias pintas", "natural", "mf"),
              ("hearts", "Sardas de coração", "fun", "mf"), ("stars", "Sardas de estrela", "fun", "mf")]


def contour_cell(style):
    F = Face(); rng = np.random.RandomState(5)
    if style == "contour":
        sym(F, lambda s: (F.line([(s * 0.060, 1.545), (s * 0.044, 1.515), (s * 0.034, 1.495)], 0.0075, 150), F.line([(s * 0.078, 1.570), (s * 0.072, 1.52), (s * 0.052, 1.468), (s * 0.02, 1.452)], 0.0055, 120), F.line([(s * 0.0085, EYY - 0.005), (s * 0.010, NY + 0.004)], 0.003, 110))); F.blur(0.0045)
    elif style == "highlight":
        sym(F, lambda s: (F.ell(s * 0.052, 1.560, 0.016, 0.0055, 180), F.ell(s * 0.008, 1.5700, 0.0035, 0.0045, 0))); F.line([(0, EYY - 0.004), (0, NY + 0.004)], 0.0035, 170); F.ell(0, MY + 0.011, 0.014, 0.0030, 140); F.ell(0, 1.4655, 0.010, 0.0042, 130); F.blur(0.0042)
    elif style == "lines":
        for yy, half in ((1.645, 0.040), (1.6595, 0.042), (1.674, 0.038)):
            sym(F, lambda s: F.line([(s * x_, yy + 0.0015 * math.sin(x_ / half * math.pi * 1.1)) for x_ in np.linspace(0.006, half, 14)], 0.0007, 150))
        sym(F, lambda s: [F.line([(s * 0.0675, 1.5835 + (k - 1) * 0.002), (s * (0.0675 + math.cos(a) * 0.010), 1.5835 + (k - 1) * 0.002 + math.sin(a) * 0.010)], 0.0007, 130) for k, a in enumerate((0.45, 0.0, -0.45))] + [F.line([(s * (0.0235 + 0.009 * t ** 1.1), 1.543 - 0.047 * t) for t in np.linspace(0, 1, 14)], 0.0008, 140)]); F.blur(0.0004)
    elif style == "bags":
        sym(F, lambda s: F.poly([(s * (EX + x_), EYY - 0.0075 - 0.012 * math.sin(math.pi * (x_ + 0.0165) / 0.034) ** 0.9) for x_ in np.linspace(-0.0165, 0.0175, 14)] + [(s * (EX + x_), EYY - 0.0075) for x_ in np.linspace(0.0175, -0.0165, 14)], 200)); F.blur(0.0034)
    elif style == "age":
        a = contour_cell("lines"); b = contour_cell("bags"); return ImageChops.lighter(a, b)
    elif style == "jaw":
        F.line([(-0.072, 1.545), (-0.070, 1.505), (-0.050, 1.468), (-0.020, 1.452), (0.020, 1.452), (0.050, 1.468), (0.070, 1.505), (0.072, 1.545)], 0.0075, 150)
        sym(F, lambda s: F.line([(s * 0.022, 1.42), (s * 0.030, 1.37)], 0.010, 120)); F.blur(0.0050)
    return F.out()


CONTOUR_LIST = [("contour", "Contorno do rosto", "glam", "mf"), ("highlight", "Iluminador", "glam", "mf"), ("lines", "Linhas de expressão", "natural", "mf"),
                ("bags", "Olheiras", "natural", "mf"), ("age", "Maduro (linhas + olheiras)", "natural", "mf"), ("jaw", "Mandíbula marcada", "natural", "m")]


def paint_cell(style):
    F = Face(); rng = np.random.RandomState(8)
    def star(x, y, s, v=255): F.poly([(x + math.cos(-math.pi / 2 + j * math.pi / 5) * s * (1 if j % 2 == 0 else 0.42), y - math.sin(-math.pi / 2 + j * math.pi / 5) * s * (1 if j % 2 == 0 else 0.42)) for j in range(10)], v)
    def heart(x, y, s, v=255): F.ell(x - s * 0.5, y + s * 0.25, s * 0.58, s * 0.58, v); F.ell(x + s * 0.5, y + s * 0.25, s * 0.58, s * 0.58, v); F.poly([(x - s * 1.02, y + 0.0), (x + s * 1.02, y + 0.0), (x, y - s * 1.35)], v)
    if style == "stars": sym(F, lambda s: (star(s * 0.062, 1.532, 0.0085), star(s * 0.050, 1.515, 0.0045), star(s * 0.074, 1.516, 0.0040)))
    elif style == "hearts": sym(F, lambda s: (heart(s * 0.062, 1.532, 0.0075), heart(s * 0.048, 1.514, 0.0042)))
    elif style == "dots": sym(F, lambda s: [F.ell(s * (0.050 + 0.011 * k), 1.526 + 0.0035 * ((k % 2) * 2 - 1), 0.0034, 0.0034) for k in range(3)])
    elif style == "bolt": sym(F, lambda s: F.poly([(s * 0.064, 1.560), (s * 0.052, 1.538), (s * 0.060, 1.538), (s * 0.050, 1.510), (s * 0.072, 1.542), (s * 0.063, 1.542), (s * 0.072, 1.560)]))
    elif style == "clown": F.ell(0, NY - 0.0035, 0.0112, 0.0105)
    elif style == "cat": F.poly([(-0.0075, NY + 0.0035), (0.0075, NY + 0.0035), (0, NY - 0.0055)]); F.line([(0, NY - 0.0055), (0, NY - 0.0125)], 0.0016); sym(F, lambda s: [F.line([(s * 0.012, NY - 0.0020 - 0.0035 * k + 0.002), (s * 0.045, NY + 0.0020 - 0.0090 * (k - 1) + 0.002)], 0.0013) for k in range(3)] + [F.ell(s * (0.011 + 0.006 * (k % 3)), NY - 0.012 - 0.0045 * (k // 3), 0.0011, 0.0011) for k in range(6)])
    elif style == "glitter":
        for k in range(26):
            x = rng.uniform(-0.082, 0.082); y = rng.uniform(1.495, 1.64)
            if abs(x) < 0.020 and y < 1.58: continue
            star(x, y, 0.0022 + rng.rand() * 0.0016, int(150 + rng.rand() * 105))
    elif style == "gem": star(0, 1.668, 0.0105); F.ell(0, 1.668, 0.0035, 0.0035, 0)
    elif style == "eyestars": sym(F, lambda s: (star(s * 0.083, 1.585, 0.0050), star(s * 0.090, 1.572, 0.0030), star(s * 0.0485, 1.552, 0.0030)))
    return F.blur(0.00018).out()


PAINT_LIST = [("stars", "Estrelas na bochecha", "fun", "mf", "#ffd45a"), ("hearts", "Corações na bochecha", "fun", "mf", "#ff6f9f"), ("dots", "Bolinhas", "fun", "mf", "#6fb8ff"),
              ("bolt", "Raio", "fun", "mf", "#ffdc3a"), ("clown", "Nariz de palhaço", "fun", "mf", "#e8252e"), ("cat", "Focinho de gatinho", "fun", "mf", "#4a3a3a"),
              ("glitter", "Adesivos de glitter", "fun", "mf", "#ffe08a"), ("gem", "Adesivo na testa", "fun", "mf", "#9be7ff"), ("eyestars", "Estrelas ao redor dos olhos", "fun", "mf", "#c79bff")]


def atlas_faces():
    def sheet(lst, fn, cat, defcolors):
        cells = []
        for i, it in enumerate(lst):
            cells.append(fn(it[0])); add(cat, it[0], it[1], it[2], it[3], cell=i, color=(it[4] if len(it) > 4 else defcolors.get(it[0], "#8a5a48")))
        return cells
    nose = sheet(NOSE_LIST, nose_cell, "nose", {"freck": "#a8704f", "blush": "#ee8a86"} | {k: "#9a6454" for k in ("fine", "wide", "upturned", "tip")})
    fr = sheet(FRECK_LIST, freck_cell, "freckles", {"light": "#a8704f", "strong": "#9a5e3c", "cheeks": "#a8704f", "moles": "#4a3228", "beauty": "#3a2a24", "moles2": "#4a3228", "hearts": "#e8607f", "stars": "#e8b43a"})
    ct = sheet(CONTOUR_LIST, contour_cell, "contour", {"contour": "#8a5a48", "highlight": "#fff0dc", "lines": "#7a5a4a", "bags": "#8a5a6a", "age": "#7a5a58", "jaw": "#7a5040"})
    pt = sheet(PAINT_LIST, paint_cell, "paint", {})
    W, H = FACE_CELL; A = Image.new("RGB", (W * 4, H * 4), (0, 0, 0)); P_ = Image.new("RGBA", (W * 4, H * 4), (255, 255, 255, 0))
    R = Image.new("L", A.size, 0); G = Image.new("L", A.size, 0); B = Image.new("L", A.size, 0)
    for lst, ch in ((nose, R), (fr, G), (ct, B)):
        for i, c in enumerate(lst): ch.paste(c, ((i % 4) * W, (i // 4) * H))
    Image.merge("RGB", (R, G, B)).save(os.path.join(OUT, "extras.png"), optimize=True)
    pa = Image.new("L", A.size, 0)
    for i, c in enumerate(pt): pa.paste(c, ((i % 4) * W, (i // 4) * H))
    P_.putalpha(pa); P_.save(os.path.join(OUT, "paint.png"), optimize=True)


# ------------------------------------------------------------------ barbas
BEARD_PX = 4000


def beard_gray(id_):
    k = K2.KB
    cv = K2.FCv("beard")
    if id_ in ("stubble", "mustache", "goatee", "full"):
        a = np.asarray(L(f"beard_{id_}"))[..., 3]; im = Image.fromarray(a, "L")
    else:
        if id_ == "thickstache":
            m = K2.poly(cv, [(x, y) for x, y in zip([0.0, 0.012, 0.026, 0.040, 0.046, 0.042, 0.030, 0.014, 0.0], [1.5320, 1.5325, 1.5260, 1.5150, 1.5040, 1.4975, 1.5085, 1.5140, 1.5145])] + [(-x, y) for x, y in zip([0.0, 0.012, 0.026, 0.040, 0.046, 0.042, 0.030, 0.014, 0.0][::-1], [1.5320, 1.5325, 1.5260, 1.5150, 1.5040, 1.4975, 1.5085, 1.5140, 1.5145][::-1])], 0.0006)
            m = ImageChops.subtract(m, K2.lip_cut(cv)); st = K2.strokes(cv, m, 1.1, 0.0022, 0.0006, 61, ang0=-1.2, spread=1.2); im = ImageChops.lighter(m.point(lambda v: int(v * 0.85)), ImageChops.multiply(st, m))
        elif id_ == "thinstache":
            m = Image.new("L", (cv.w, cv.h), 0); dd = ImageDraw.Draw(m)
            for s_ in (1, -1): dd.line([cv.p(s_ * 0.002, 1.5195), cv.p(s_ * 0.018, 1.5185), cv.p(s_ * 0.034, 1.5110), cv.p(s_ * 0.040, 1.5045)], fill=255, width=int(cv.m(0.0019)))
            m = m.filter(ImageFilter.GaussianBlur(cv.m(0.0004))); st = K2.strokes(cv, m, 1.0, 0.0018, 0.0004, 62, ang0=-1.1); im = ImageChops.lighter(m.point(lambda v: int(v * 0.9)), st)
        elif id_ == "longgoatee":
            right = [(0.0, 1.4905), (0.013, 1.4880), (0.020, 1.476), (0.022, 1.455), (0.017, 1.430), (0.0085, 1.405), (0.0, 1.400)]
            m = K2.poly(cv, right + [(-x, y) for x, y in right[::-1]], 0.0007); m = ImageChops.subtract(m, K2.lip_cut(cv)); st = K2.strokes(cv, m, 1.1, 0.0030, 0.0006, 63, ang0=-1.5); im = ImageChops.lighter(m.point(lambda v: int(v * 0.8)), ImageChops.multiply(st, m))
        elif id_ == "sideburns":
            m = Image.new("L", (cv.w, cv.h), 0)
            for s_ in (1, -1):
                pts = [(s_ * 0.0735, 1.6200), (s_ * 0.0830, 1.6200), (s_ * 0.0815, 1.5650), (s_ * 0.0795, 1.5300), (s_ * 0.0700, 1.5300), (s_ * 0.0715, 1.5650)]
                m = ImageChops.lighter(m, K2.poly(cv, pts, 0.0007))
            st = K2.strokes(cv, m, 1.0, 0.0024, 0.0006, 64); im = ImageChops.lighter(m.point(lambda v: int(v * 0.85)), ImageChops.multiply(st, m))
        elif id_ == "drawn":
            m = Image.new("L", (cv.w, cv.h), 0); dd = ImageDraw.Draw(m)
            pts = [(-0.0790, 1.575), (-0.0780, 1.540), (-0.0700, 1.500), (-0.0540, 1.470), (-0.0300, 1.4535), (0, 1.4500), (0.0300, 1.4535), (0.0540, 1.470), (0.0700, 1.500), (0.0780, 1.540), (0.0790, 1.575)]
            dd.line([cv.p(*q) for q in pts], fill=255, width=int(cv.m(0.0030)), joint="curve"); dd.line([cv.p(-0.02, 1.5195), cv.p(0, 1.5230), cv.p(0.02, 1.5195)], fill=255, width=int(cv.m(0.0022)))
            im = m.filter(ImageFilter.GaussianBlur(cv.m(0.0003)))
        elif id_ == "anchor":
            m = Image.new("L", (cv.w, cv.h), 0); dd = ImageDraw.Draw(m)
            for s_ in (1, -1): dd.line([cv.p(s_ * 0.002, 1.5190), cv.p(s_ * 0.020, 1.5185), cv.p(s_ * 0.036, 1.5120), cv.p(s_ * 0.039, 1.5000)], fill=255, width=int(cv.m(0.0030)))
            dd.line([cv.p(0, 1.4905), cv.p(0, 1.4560)], fill=255, width=int(cv.m(0.0042)))
            for s_ in (1, -1): dd.line([cv.p(s_ * 0.0007, 1.4585), cv.p(s_ * 0.025, 1.4570), cv.p(s_ * 0.032, 1.4640)], fill=255, width=int(cv.m(0.0028)))
            m = m.filter(ImageFilter.GaussianBlur(cv.m(0.0004))); st = K2.strokes(cv, m, 1.0, 0.0018, 0.0005, 65, ang0=-1.5); im = ImageChops.lighter(m.point(lambda v: int(v * 0.85)), st)
        elif id_ == "closed":
            a = np.asarray(L("beard_full"))[..., 3]; im = Image.fromarray(np.clip(a.astype(np.float32) * 1.35, 0, 255).astype(np.uint8), "L")
        else: raise KeyError(id_)
    out = im.resize((int(0.2 * BEARD_PX), int(0.17 * BEARD_PX)), Image.LANCZOS)
    out.save(os.path.join(OUT, f"beard_{id_}.png"), optimize=True)


BEARD_LIST = [("stubble", "Barba de 3 dias", "natural", "m"), ("full", "Barba cheia curta", "natural", "m"), ("closed", "Barba cerrada", "natural", "m"), ("mustache", "Bigode", "natural", "m"),
              ("thickstache", "Bigode grosso", "natural", "m"), ("thinstache", "Bigode fino", "glam", "m"), ("goatee", "Cavanhaque", "natural", "m"), ("longgoatee", "Cavanhaque longo", "glam", "m"),
              ("sideburns", "Costeletas", "natural", "m"), ("drawn", "Barba desenhada (contorno)", "glam", "m"), ("anchor", "Âncora", "glam", "m")]


def beards():
    for id_, label, grp, g in BEARD_LIST:
        beard_gray(id_); add("beards", id_, label, grp, g)


# ------------------------------------------------------------------ gerar TS
def main():
    eyes(); atlas_parts(); atlas_faces(); beards()
    layout = {"parts": {"w": ATLAS_W, "h": ATLAS_H, "sheets": {k: dict(y0=v[0], cols=v[1], rows=v[2], cw=v[3][0], ch=v[3][1]) for k, v in SHEETS.items()}},
              "face": {"cw": FACE_CELL[0], "ch": FACE_CELL[1], "cols": 4, "rows": 4, "can": FACE_CAN}}
    names = {"eyes": "KIT_EYES", "lashes": "KIT_LASHES", "brows": "KIT_BROWS", "mouths": "KIT_MOUTHS", "beards": "KIT_BEARDS", "nose": "KIT_NOSE", "freckles": "KIT_FRECKLES", "contour": "KIT_CONTOUR", "paint": "KIT_PAINT"}
    lines = ["// GERADO por tools/blender/male/make_styles.py: nao edite a mao.", "export type KitGroup = 'natural' | 'glam' | 'fun'",
             "/** g: m = so masculino, f = so feminino, mf = ambos */",
             "export interface KitStyle { id: string; label: string; group: KitGroup; g: 'm' | 'f' | 'mf'; cell?: number; hidden?: boolean; rgb?: boolean; dx?: number; color?: string; geom?: { a: number; hu: number; lift: number } }",
             "export const KIT_LAYOUT = " + json.dumps(layout) + " as const"]
    for cat, nm in names.items():
        items = [{k: v for k, v in it.items() if k not in ("defIris",) and v is not None} for it in CATALOG[cat]]
        lines.append(f"export const {nm}: KitStyle[] = " + json.dumps(items, ensure_ascii=False))
    open(GEN, "w", encoding="utf-8").write("\n".join(lines) + "\n")
    tot = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    print("styles ok:", {k: len(v) for k, v in CATALOG.items()}, "arquivos", len(os.listdir(OUT)), "total", tot // 1024, "KB")


if __name__ == "__main__":
    main()

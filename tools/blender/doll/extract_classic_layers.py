"""Extrai da PINTURA ORIGINAL da boneca (atlas do Meshy de doll_base.glb) as camadas do look "Classica", na projecao frontal (vRest) das outras camadas.
Usage: python tools/blender/doll/extract_classic_layers.py     (numpy + scipy + Pillow)
Saidas em public/assets/characters/male/face/ (kit compartilhado), todas 1024x1024 cobrindo x -0.11..0.11, y 1.28..1.50 (centro 0, 1.39; 0,22 m):
  eye_classic_sclera.png   RGBA  olho completo pintado (esclera + iris + pupila + brilho), cor absoluta (sRGB)
  eye_classic_iris.png     RGBA  so a iris: RGB = razao cor/cor media (recolorivel pelo tint; tint padrao = cor media)
  lash_classic.png         RGBA  cilios e delineado (tufos), cor absoluta (sRGB)
  brow_classic.png         RGBA  sobrancelha: RGB = razao, A = cobertura (tint padrao = cor media)
  mouth_classic_lips.png   RGBA  area dos labios (tinta): RGB = razao com o brilho pintado, A = mascara; tint padrao = cor media
  classic_shade.png        RGB   "sombreado da pele": razao (pele local / pele base) / 2 em cada canal (blush, bochechas, testa, rosado dos olhos)
  classic_defaults.json    cores medias (hex) para os presets
Metodo: reprojecao por triangulos (z-buffer) da UV original para a caixa frontal, super-amostragem 2x e filtro suave; separacao das camadas por
classificacao de cor (azul = iris, claro = esclera, escuro/claro fora do olho = cilios, tan = sobrancelha, vermelho = labios) e remocao de
mistura (unmix) contra a pele local inpintada.
"""
import os, sys, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from glbtool import Glb

REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
CH = os.path.join(REPO, "public", "assets", "characters")
OUT = os.path.join(REPO, "tools", "blender", "male", "kit_src")
N = 1024; SS = 2
DBG = r'C:/Users/user/AppData/Local/Temp/claude/shots/boneca_camadas2'
X0, X1, Y0, Y1 = -0.11, 0.11, 1.28, 1.50


def s2l(c): return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def l2s(c): c = np.clip(c, 0, 1); return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)
def lum(c): return c @ np.array([0.2126, 0.7152, 0.0722])


def project():
    g = Glb(os.path.join(CH, "doll_base.glb"))
    P, Nn, UV, IDX = g.mesh()
    atlas = g.image(1).resize((4096, 4096), Image.LANCZOS)
    A = s2l(np.asarray(atlas, np.float32) / 255.0)
    M = N * SS
    zb = np.full((M, M), -9.0, np.float32); uvb = np.zeros((M, M, 2), np.float32)
    sel = (P[IDX][:, :, 2] > -0.01).all(1) & (P[IDX][:, :, 1].max(1) > Y0 - 0.01) & (P[IDX][:, :, 1].min(1) < Y1 + 0.01)
    for t in np.nonzero(sel)[0]:
        v = IDX[t]; p = P[v]
        px = (p[:, 0] - X0) / (X1 - X0) * M; py = (Y1 - p[:, 1]) / (Y1 - Y0) * M
        x0, x1 = int(max(np.floor(px.min()), 0)), int(min(np.ceil(px.max()), M - 1)); y0, y1 = int(max(np.floor(py.min()), 0)), int(min(np.ceil(py.max()), M - 1))
        if x1 < x0 or y1 < y0: continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        d = (py[1] - py[2]) * (px[0] - px[2]) + (px[2] - px[1]) * (py[0] - py[2])
        if abs(d) < 1e-9: continue
        l0 = ((py[1] - py[2]) * (gx - px[2]) + (px[2] - px[1]) * (gy - py[2])) / d
        l1 = ((py[2] - py[0]) * (gx - px[2]) + (px[0] - px[2]) * (gy - py[2])) / d
        l2 = 1 - l0 - l1
        m = (l0 >= -1e-6) & (l1 >= -1e-6) & (l2 >= -1e-6)
        if not m.any(): continue
        z = l0 * p[0, 2] + l1 * p[1, 2] + l2 * p[2, 2]
        sub = zb[y0:y1 + 1, x0:x1 + 1]; win = m & (z > sub)
        if not win.any(): continue
        uv = (l0[..., None] * UV[v[0]] + l1[..., None] * UV[v[1]] + l2[..., None] * UV[v[2]])
        sub[win] = z[win]; uvb[y0:y1 + 1, x0:x1 + 1][win] = uv[win]
    cov = zb > -8
    # amostra o atlas (bilinear) onde ha cobertura; buracos preenchidos pelo vizinho mais proximo
    F = np.zeros((M, M, 3), np.float32)
    ys, xs = np.nonzero(cov)
    u = uvb[ys, xs, 0] * 4096 - 0.5; v = uvb[ys, xs, 1] * 4096 - 0.5
    for c in range(3): F[ys, xs, c] = ndi.map_coordinates(A[..., c], [v, u], order=1, mode="nearest")
    if not cov.all():
        idx = ndi.distance_transform_edt(~cov, return_distances=False, return_indices=True)
        F = F[idx[0], idx[1]]
    # super-amostragem: reduz com caixa e suaviza de leve
    F = F.reshape(N, SS, N, SS, 3).mean((1, 3))
    cov = cov.reshape(N, SS, N, SS).mean((1, 3))
    return F, cov


def nconv(img, w, sigma):
    num = ndi.gaussian_filter(img * w[..., None], (sigma, sigma, 0)); den = ndi.gaussian_filter(w, sigma)[..., None]
    return num / np.maximum(den, 1e-5)


def px(x, y): return ((x - X0) / (X1 - X0) * N, (Y1 - y) / (Y1 - Y0) * N)


def save_rgba(name, rgb_lin_or_ratio, alpha, srgb):
    a = np.clip(alpha, 0, 1)
    rgb = l2s(rgb_lin_or_ratio) if srgb else rgb_lin_or_ratio
    im = np.concatenate([np.clip(rgb, 0, 1), a[..., None]], -1)
    Image.fromarray((im * 255 + 0.5).astype(np.uint8), "RGBA").save(os.path.join(OUT, name + ".png"), optimize=True)


def main():
    F, cov = project()
    yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
    X = X0 + (xx + 0.5) / N * (X1 - X0); Y = Y1 - (yy + 0.5) / N * (Y1 - Y0)
    # ---- pele base (mediana da testa) e pele local (inpaint das feicoes)
    fore = (Y > 1.455) & (Y < 1.485) & (np.abs(X) < 0.04)
    S0 = np.median(F[fore], 0)
    Slow = ndi.gaussian_filter(F, (30, 30, 0))
    feat = np.zeros((N, N), bool)
    for _ in range(4):
        d = np.linalg.norm(F - Slow, axis=-1)
        feat = d > 0.075
        feat = ndi.binary_dilation(feat, iterations=2)
        Slow = nconv(F, (~feat).astype(np.float32), 14)
    Ssh = ndi.gaussian_filter(Slow, (6, 6, 0))
    # pele para o SOMBREADO: feicoes bem mais dilatadas (sem contaminacao escura/clara perto dos olhos e dos labios)
    feat2 = ndi.binary_dilation(feat, iterations=8)
    Ssh2 = ndi.gaussian_filter(nconv(F, (~feat2).astype(np.float32), 16), (6, 6, 0))
    ratio = Ssh2 / np.maximum(S0, 1e-4)
    ratio = np.clip(ratio, 0.88, 1.2)
    shade = np.clip(ratio / 2.0, 0, 1)
    Image.fromarray((shade * 255 + .5).astype(np.uint8)).save(os.path.join(OUT, "classic_shade.png"), optimize=True)
    dist = np.linalg.norm(F - Ssh, axis=-1)
    L = lum(F); Lsk = lum(Ssh)
    # ---- olhos (por lado)
    eye_rgb = np.zeros((N, N, 3), np.float32); eye_a = np.zeros((N, N), np.float32)
    iris_rgb = np.ones((N, N, 3), np.float32); iris_a = np.zeros((N, N), np.float32)
    blue = (F[..., 2] - F[..., 0] > 0.10) & (L > 0.04)
    white = (L > Lsk + 0.10) & ((F.max(-1) - F.min(-1)) < 0.22) & (dist > 0.05)
    avg_iris = np.zeros(3); n_i = 0
    ex = {}
    for side, (xa, xb) in (("L", (-0.105, -0.0)), ("R", (0.0, 0.105))):
        box = (X > xa) & (X < xb) & (Y > 1.352) & (Y < 1.435)
        bl = blue & box
        bl = ndi.binary_opening(bl, iterations=2)
        lab, n = ndi.label(bl)
        if n == 0: continue
        sizes = ndi.sum(bl, lab, range(1, n + 1)); k = 1 + int(np.argmax(sizes))
        core = lab == k
        cy, cx = ndi.center_of_mass(core)
        area = core.sum(); r_i = np.sqrt(area / np.pi) * 1.12
        disc = ((xx - cx) ** 2 + (yy - cy) ** 2) < r_i ** 2
        # olho completo = tudo que difere da pele dentro de uma elipse que inclui esclera, iris e a faixa preta do delineado (buracos preenchidos)
        rr1 = np.sqrt(((xx - cx) / (r_i * 2.55)) ** 2 + ((yy - (cy - 0.45 * r_i)) / (r_i * 2.4)) ** 2)
        em = (dist > 0.05) & (rr1 < 1.0)
        em = ndi.binary_closing(em | disc | (rr1 < 0.55), iterations=9)
        em = ndi.binary_fill_holes(em)
        em = ndi.binary_opening(em, iterations=2)
        lab2, n2 = ndi.label(em)
        if n2 > 1:
            sz = ndi.sum(em, lab2, range(1, n2 + 1)); em = lab2 == (1 + int(np.argmax(sz)))
        from scipy.spatial import ConvexHull
        from PIL import ImageDraw
        yy_, xx_ = np.nonzero(em); pts_ = np.stack([xx_, yy_], 1)
        hv = ConvexHull(pts_); hm = Image.new('L', (N, N), 0)
        ImageDraw.Draw(hm).polygon([tuple(pts_[i]) for i in hv.vertices], fill=255)
        em = np.asarray(hm) > 127          # olho = casco convexo (fecha o recorte irregular da esclera)
        a = ndi.gaussian_filter(em.astype(np.float32), 1.3)
        eye_a = np.maximum(eye_a, a)
        ex[side] = (cx, cy, r_i, em)
        # iris: disco (pupila e brilho inclusos) dentro do olho
        ia = ndi.gaussian_filter((disc & em).astype(np.float32), 1.2)
        iris_a = np.maximum(iris_a, ia)
        avg_iris += F[core].sum(0); n_i += core.sum()
    avg_iris = avg_iris / max(n_i, 1)
    Fs = np.clip(F + 0.9 * (F - ndi.gaussian_filter(F, (1.6, 1.6, 0))), 0, 1)       # unsharp mask
    Fs = np.clip((Fs - 0.5) * 1.12 + 0.5, 0, 1) * 0 + np.clip(Fs * 1.0, 0, 1)
    save_rgba("eye_classic_sclera", Fs, eye_a, True)
    iris_ratio = np.clip(Fs / np.maximum(avg_iris, 1e-3) / 1.35, 0, 1)
    save_rgba("eye_classic_iris", iris_ratio, iris_a, False)
    em_all = np.zeros((N, N), bool)
    for k, v in ex.items(): em_all |= v[3]
    em_soft = ndi.gaussian_filter(ndi.binary_dilation(em_all, iterations=2).astype(np.float32), 1.5)
    # ---- cilios/delineado REDESENHADOS (alta resolucao) sobre o olho extraido; posicao/forma guiadas pela pintura original:
    # delineado grosso afinando para dentro, cilios superiores volumosos que varrem para fora/cima (mais longos no canto externo, ponta clara),
    # cilios inferiores finos e visiveis.
    import math, random
    from PIL import ImageDraw, ImageFilter
    K = 2
    lay = Image.new("RGBA", (N * K, N * K), (0, 0, 0, 0)); dr = ImageDraw.Draw(lay)
    rnd = random.Random(5)
    for side, (cx, cy, r_i, em) in ex.items():
        os_ = -1.0 if cx < N / 2 else 1.0                       # lado externo no eixo x da imagem
        cols = np.nonzero(em.any(0))[0]
        top = np.array([np.nonzero(em[:, c])[0].min() for c in cols], float); bot = np.array([np.nonzero(em[:, c])[0].max() for c in cols], float)
        top = ndi.gaussian_filter1d(top, 3); bot = ndi.gaussian_filter1d(bot, 3)
        order = np.argsort(cols * os_)                         # t=0 canto interno -> t=1 canto externo
        cx_arr = cols[order].astype(float); top_a = top[order]; bot_a = bot[order]
        nlen = len(cx_arr)
        for i in range(nlen - 1):                                # delineado: espessura cresce para fora
            t = i / (nlen - 1)
            w = (4.0 + 14.0 * math.sin(math.pi * min(1, t * 0.95 + 0.04)) ** 0.7 * (0.55 + 0.6 * t)) * K
            dr.line([(cx_arr[i] * K, top_a[i] * K - w * 0.25), (cx_arr[i + 1] * K, top_a[i + 1] * K - w * 0.25)], fill=(14, 10, 11, 255), width=max(1, int(w)))
        # rabinho externo
        ex_x, ex_y = cx_arr[-1], top_a[-1]
        dr.line([(ex_x * K, ex_y * K), ((ex_x + os_ * 20) * K, (ex_y - 10) * K)], fill=(14, 10, 11, 255), width=int(5 * K))
        nl = 36
        for k in range(nl):
            t = 0.04 + 0.97 * k / (nl - 1); idx = min(int(t * (nlen - 1)), nlen - 1)
            bx, by = cx_arr[idx], top_a[idx] - 1
            ang = math.radians(78 - 62 * t + rnd.uniform(-6, 6))     # 90 = reto para cima; reduz para o lado externo
            L = r_i * (0.45 + 0.95 * t ** 1.2) * rnd.uniform(0.85, 1.15)
            wb = (8.5 + 6.0 * t) * K
            px, py = bx, by; segs = 9
            for sgm in range(segs):
                u0 = sgm / segs; u1 = (sgm + 1) / segs
                a0 = ang - 0.35 * u0 ** 1.5 * 1.0; a1 = ang - 0.35 * u1 ** 1.5
                x0 = bx + os_ * math.cos(a0) * L * u0 + 0; y0 = by - math.sin(a0) * L * u0
                x1 = bx + os_ * math.cos(a1) * L * u1; y1 = by - math.sin(a1) * L * u1
                tip = max(0, (u0 - 0.55) / 0.45)
                col = (int(14 + 150 * tip), int(10 + 120 * tip), int(11 + 100 * tip), 255)
                dr.line([(x0 * K, y0 * K), (x1 * K, y1 * K)], fill=col, width=max(1, int(wb * (1 - u0) ** 0.85)))
        nl2 = 20
        for k in range(nl2):
            t = 0.1 + 0.9 * k / (nl2 - 1); idx = min(int(t * (nlen - 1)), nlen - 1)
            bx, by = cx_arr[idx], bot_a[idx] + 1
            ang = math.radians(-80 + 40 * t + rnd.uniform(-8, 8))
            L = r_i * (0.16 + 0.2 * math.sin(math.pi * t)) * rnd.uniform(0.85, 1.15)
            dr.line([(bx * K, by * K), ((bx + os_ * math.cos(ang) * L * 0.55) * K, (by - math.sin(ang) * L) * K)], fill=(48, 30, 30, 235), width=int(1.8 * K))
    lay = lay.filter(ImageFilter.GaussianBlur(0.5 * K)).resize((N, N), Image.LANCZOS)
    arr_ = np.asarray(lay, np.float32) / 255.0
    la = arr_[..., 3]
    save_rgba("lash_classic", s2l(arr_[..., :3]), la, True)
    # ---- sobrancelhas: janela suave acima de cada olho; cobertura por unmix contra a cor media
    bwin = np.zeros((N, N), np.float32)
    for k, (cx, cy, r_i, em) in ex.items():
        rr = np.sqrt(((xx - cx) / (r_i * 2.9)) ** 2 + ((yy - (cy - r_i * 3.6)) / (r_i * 1.3)) ** 2)
        bwin = np.maximum(bwin, 1 - np.clip((rr - 0.8) / 0.2, 0, 1))
    cand = (bwin > 0.5) & (dist > 0.10) & (em_soft < 0.1) & (la < 0.2)
    Cb = np.median(F[cand], 0) if cand.any() else np.array([0.35, 0.25, 0.18])
    dv = Cb - Ssh
    alpha_b = np.clip(np.sum((F - Ssh) * dv, -1) / np.maximum(np.sum(dv * dv, -1), 1e-4), 0, 1) * bwin * (1 - em_soft) * (1 - np.clip(la * 2, 0, 1))
    alpha_b = ndi.gaussian_filter(np.clip(alpha_b * 2.3, 0, 1), 0.8)
    brow_ratio = np.clip(F / np.maximum(Cb, 1e-3) / 1.35, 0, 1)
    save_rgba("brow_classic", brow_ratio, alpha_b, False)
    # ---- labios (tinta sobre a area dos labios): janela eliptica + unmix contra a cor media
    mwin = 1 - np.clip((np.sqrt(((X - 0.0) / 0.040) ** 2 + ((Y - 1.318) / 0.020) ** 2) - 0.8) / 0.2, 0, 1)
    seed = (mwin > 0.5) & ((F[..., 0] - F[..., 1]) > (Ssh[..., 0] - Ssh[..., 1]) + 0.18) & (dist > 0.10)
    Cl = F[seed].mean(0)
    dl = Cl - Ssh
    al = np.clip(np.sum((F - Ssh) * dl, -1) / np.maximum(np.sum(dl * dl, -1), 1e-4), 0, 1.2)
    al = np.clip(al * 1.1, 0, 1) * mwin
    core = ndi.binary_fill_holes(ndi.binary_closing(al > 0.45, iterations=5))
    lip_a = np.maximum(al, ndi.gaussian_filter(core.astype(np.float32), 1.2) * mwin)
    lip_a = ndi.gaussian_filter(lip_a, 0.8)
    lip_ratio = np.clip(F / np.maximum(Cl, 1e-3) / 1.35, 0, 1)
    save_rgba("mouth_classic_lips", lip_ratio, lip_a, False)
    # camadas vazias (para os slots que o modo classico nao usa)
    blank = np.zeros((4, 4, 4), np.uint8)
    for nm in ("eye_classic_hi", "eye_classic_line", "mouth_classic_gloss"):
        Image.fromarray(blank, "RGBA").save(os.path.join(OUT, nm + ".png"))
    hexs = lambda c: "#%02x%02x%02x" % tuple((np.clip(l2s(np.array(c)), 0, 1) * 255 + .5).astype(int))
    info = {"iris": hexs(avg_iris), "brow": hexs(Cb), "lips": hexs(Cl), "skinBase": hexs(S0), "eyes": {k: [float(v[0]), float(v[1]), float(v[2])] for k, v in ex.items()}}
    json.dump(info, open(os.path.join(OUT, "classic_defaults.json"), "w"), indent=1)
    # depuracao: recomposicao (pele local x sombreado + olho + cilios) para conferir contra a original
    comp = Ssh.copy()
    comp = comp * (1 - np.clip(la, 0, 1)[..., None]) + F * np.clip(la, 0, 1)[..., None]
    comp = comp * (1 - eye_a[..., None]) + F * eye_a[..., None]
    comp = comp * (1 - alpha_b[..., None]) + Cb * brow_ratio * 1.35 * alpha_b[..., None]
    comp = comp * (1 - lip_a[..., None]) + Cl * lip_ratio * 1.35 * lip_a[..., None]
    dbg = np.concatenate([l2s(F), l2s(np.clip(comp, 0, 1))], 1)
    Image.fromarray((np.clip(dbg, 0, 1) * 255 + .5).astype(np.uint8)).save(r"C:\Users\user\AppData\Local\Temp\claude\shots\boneca_camadas2\_recomposicao.png")
    dm = np.concatenate([np.stack([eye_a, la, alpha_b], -1), np.stack([iris_a, em_soft, lip_a], -1)], 1)
    Image.fromarray((np.clip(dm, 0, 1) * 255).astype(np.uint8)).save(os.path.join(DBG, '_masks.png'))
    print(info)


if __name__ == "__main__":
    os.makedirs(r"C:\Users\user\AppData\Local\Temp\claude\shots\boneca_camadas2", exist_ok=True)
    main()

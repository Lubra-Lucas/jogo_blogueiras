"""Etapa 2: textura base + mascaras (convencao doll_mask*) do masculino, pintadas por geometria (o Meshy veio SEM textura).
Usage: blender -b --factory-startup -noaudio --python paint_male.py
  le .cache/male_1.blend (UV + landmarks.json), rasteriza o UV (posicao 3D por texel) e pinta:
    male_basecolor.png  pele = REF_SKIN, boxer = REF_SUIT (mesmas referencias do shader da boneca -> tingimento exato), olhos/sobrancelha/labios pintados
    male_mask.png   R pele, G boxer (base), B feicoes (olhos, sobrancelhas, labios)
    male_mask2.png  R labios (tingiveis), G linha do cabelo (vazio: careca)
    male_mask3.png  R iris, G sobrancelha, B cilios/delineado
    male_mask4.png  R unhas (vazio por enquanto), G posicao na unha
"""
import sys, os, zlib, struct
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mcommon import *

TEX = 2048
# mesmas referencias de dollMaterial.ts (linear)
REF_SKIN = np.array([0.844, 0.527, 0.456]); REF_SUIT = np.array([0.866, 0.337, 0.405])


def png_write(path, rgb8):
    h, w, c = rgb8.shape
    raw = b"".join(b"\x00" + rgb8[y].tobytes() for y in range(h))
    def chunk(t, d): return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    open(path, "wb").write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
                           + chunk(b"IDAT", zlib.compress(raw, 6)) + chunk(b"IEND", b""))


def lin2srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)


def rasterize(co, nr, tv, tl, uv, face_lab):
    """per-texel interpolated position, normal and face label. y of the image grows with v (glTF flips later; masks use the same UV)."""
    S = TEX
    pos = np.zeros((S, S, 3), np.float32); nrm = np.zeros((S, S, 3), np.float32)
    lab = np.zeros((S, S), np.int8) - 1
    for t in range(len(tv)):
        a, b, c = uv[tl[t, 0]] * S, uv[tl[t, 1]] * S, uv[tl[t, 2]] * S
        x0, x1 = int(max(np.floor(min(a[0], b[0], c[0])), 0)), int(min(np.ceil(max(a[0], b[0], c[0])), S - 1))
        y0, y1 = int(max(np.floor(min(a[1], b[1], c[1])), 0)), int(min(np.ceil(max(a[1], b[1], c[1])), S - 1))
        if x1 < x0 or y1 < y0: continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(d) < 1e-12: continue
        l0 = ((b[1] - c[1]) * (gx - c[0]) + (c[0] - b[0]) * (gy - c[1])) / d
        l1 = ((c[1] - a[1]) * (gx - c[0]) + (a[0] - c[0]) * (gy - c[1])) / d
        l2 = 1 - l0 - l1
        m = (l0 >= -1e-4) & (l1 >= -1e-4) & (l2 >= -1e-4)
        if not m.any(): continue
        ys, xs = np.nonzero(m); py, px = ys + y0, xs + x0
        w0, w1, w2 = l0[m][:, None], l1[m][:, None], l2[m][:, None]
        i0, i1, i2 = tv[t]
        pos[py, px] = co[i0] * w0 + co[i1] * w1 + co[i2] * w2
        nrm[py, px] = nr[i0] * w0 + nr[i1] * w1 + nr[i2] * w2
        lab[py, px] = face_lab[t]
    return pos, nrm, lab


def dilate(img, valid, it=int(os.environ.get("DIL","16"))):
    img = img.copy(); valid = valid.copy()
    for _ in range(it):
        acc = np.zeros_like(img); cnt = np.zeros(valid.shape, np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            v = np.roll(valid, (dy, dx), (0, 1)); im = np.roll(img, (dy, dx), (0, 1))
            acc += im * v[..., None]; cnt += v
        new = (~valid) & (cnt > 0)
        img[new] = acc[new] / cnt[new][:, None]; valid = valid | new
    return img, valid


def soft(d, edge):  # 1 inside (d<0), 0 outside, antialiased over `edge` metres
    return np.clip(0.5 - d / edge, 0, 1)


def stage_paint():
    t0 = time.time()
    bpy.ops.wm.open_mainfile(filepath=blend("male_1"))
    o = bpy.data.objects["body"]; me = o.data
    LM = json.load(open(os.path.join(CACHE, "landmarks.json")))
    co = getco(o); tv = tris(me); n = len(co)
    nr = vnormals(co, tv)
    nt = len(tv)
    tl = np.empty(nt * 3, np.int32); me.loop_triangles.foreach_get('loops', tl); tl = tl.reshape(-1, 3)
    uv = arr(me.uv_layers[0].uv, 'vector', 2, np.float32)
    # rotulo por triangulo: 0 pele, 1 boxer (faixa entre os dois lacos duros, so tronco/coxas, nunca bracos)
    lab = np.zeros(nt, np.int8)
    pos, nrm, tlab = rasterize(co, nr, tv, tl, uv, lab)
    valid = tlab >= 0
    log("texels cobertos", valid.mean())
    X, Y, Z = pos[..., 0], pos[..., 1], pos[..., 2]
    # boxer: entre as curvas do cos e da barra (medidas nos vincos da malha original), nunca nos bracos
    def circ(th, cur):
        t_ = np.array(cur["th"]); z_ = np.array(cur["z"])
        return np.interp(th, np.concatenate([t_ - 2 * math.pi, t_, t_ + 2 * math.pi]), np.tile(z_, 3))
    BX = LM["box"]
    zw = circ(np.arctan2(Y - BX["waist"]["cy"], X), BX["waist"])
    zh = np.where(X >= 0, circ(np.arctan2(Y - BX["hem1"]["cy"], X - BX["hem1"]["cx"]), BX["hem1"]),
                  circ(np.arctan2(Y - BX["hem-1"]["cy"], X - BX["hem-1"]["cx"]), BX["hem-1"]))
    boxer = ((Z < zw) & (Z > zh) & (np.abs(X) < 0.225) & valid).astype(np.float32)
    _b=(boxer>0)&(Z<0.745); log('boxer baixo', int(_b.sum()), 'Zmin', float(Z[_b].min()) if _b.any() else None, 'zh range', float(zh.min()), float(zh.max()), 'sample', pos[_b][::400].round(3).tolist())
    # ---- rosto: coordenadas de frente (x, z); so na frente da cabeca
    front = valid & (nrm[..., 1] < -0.12) & (Y < -0.03) & (Z > 1.35)
    ez, ex = LM["eye_z"], LM["eye_x"]
    feat = np.zeros_like(X); iris = np.zeros_like(X); lash = np.zeros_like(X); brow = np.zeros_like(X); lips = np.zeros_like(X)
    col_feat = np.zeros(X.shape + (3,), np.float32)       # cor linear das feicoes onde feat>0
    sclera = np.zeros_like(X); irisc = np.zeros(X.shape + (3,), np.float32)
    EW, EH = 0.0207, 0.0106            # meia-largura/meia-altura do olho (m): "um pouco maior" que o natural
    for sg in (1, -1):
        cx = sg * ex
        u = (X - cx) / EW; v = (Z - ez) / EH
        # amendoa: elipse com canto externo levemente mais alto
        v2 = v - 0.12 * np.sign(sg) * 0 + (u * sg) * 0.0
        shape = np.sqrt(u ** 2 + (v2 / (1 + 0.15 * (1 - np.abs(u)) ** 0)) ** 2)
        eye = soft((shape - 1.0) * EH, 0.0016) * front
        # leve inclinacao: canto externo para cima
        u_o = (X - cx) * sg                              # positivo para o lado de fora (x do personagem)
        sclera = np.maximum(sclera, eye)
        # iris: disco ligeiramente maior que o natural, cortado pelas palpebras
        ir = np.sqrt((X - cx) ** 2 + ((Z - (ez + 0.0008)) ) ** 2)
        R_IRIS = 0.0093
        iw = soft(ir - R_IRIS, 0.0012) * eye
        # gradiente: anel limbal escuro, centro mais claro, pupila
        g = np.clip(ir / R_IRIS, 0, 1)
        iris_tone = 0.85 - 0.55 * sstep((g - 0.55) / 0.45)       # claro no meio, escuro na borda
        pup = soft(ir - 0.0038, 0.0009)
        iris_tone = iris_tone * (1 - 0.92 * pup)
        # reflexo no canto superior
        hl = soft(np.sqrt(((X - cx) - 0.0035) ** 2 + ((Z - ez) - 0.0035) ** 2) - 0.0018, 0.0008) * iw
        irisc = np.where(iw[..., None] > 0.01, np.stack([0.20, 0.115, 0.07], -1)[None, None] * iris_tone[..., None] * 2.0, irisc)
        irisc = np.where((hl[..., None] > 0.2), np.array([0.95, 0.95, 0.95], np.float32)[None, None], irisc)
        iris = np.maximum(iris, iw * (1 - 0.7 * (hl > 0.2)))
        # delineado/cilios: linha escura no contorno da palpebra superior (so a metade de cima)
        ring = soft(np.abs((shape - 1.0) * EH) - 0.0016, 0.0007) * front * (v > -0.15)
        lash = np.maximum(lash, ring)
        # sobrancelha: arco grosso acima do olho
        bu = (X - (cx + sg * 0.004)) / 0.023
        by = (Z - (ez + 0.0215 + 0.006 * (1 - np.minimum(np.abs(bu), 1) ** 2) - sg * 0 + 0.004 * (bu * sg))) / 0.0036
        bd = np.sqrt(bu ** 2 + by ** 2)
        bw = soft((bd - 1.0) * 0.0036, 0.0010) * front * (1 - 0.35 * sstep(np.abs(bu)))
        brow = np.maximum(brow, bw)
    # boca: labios cheios mas discretos + linha da boca
    mz = LM["mouth_z"]
    mu = X / 0.0195; mv = (Z - mz) / 0.0102
    md = np.sqrt(mu ** 2 + (mv / (1 + 0.1 * np.abs(mu))) ** 2)
    lip = soft((md - 1.0) * 0.0105, 0.0014) * front
    upper = (Z - mz) > 0.0003 * 0
    mline = soft(np.abs(Z - mz + 0.0006 * (1 - np.clip(np.abs(X) / 0.02, 0, 1) ** 2)) - 0.0007, 0.0006) * front * (np.abs(X) < 0.0215)
    lips = lip
    # ---- composicao
    skin_c = REF_SKIN.astype(np.float32)[None, None]
    suit_c = REF_SUIT.astype(np.float32)[None, None]
    base = np.broadcast_to(skin_c, X.shape + (3,)).copy()
    base = base * (1 - boxer[..., None]) + suit_c * boxer[..., None]
    # cos da boxer um pouco mais escuro (elastico) e barra da perna mais clara (dobra)
    wb = (Z > zw - 0.040) & (boxer > 0)
    base[wb] *= 0.80
    # labios: tom natural de lábio (shader multiplica por uLips/REF_LIPS)
    lip_c = np.array([0.62, 0.29, 0.27], np.float32)[None, None]
    base = base * (1 - lips[..., None] * 0.85) + lip_c * lips[..., None] * 0.85
    base = base * (1 - mline[..., None] * 0.7) + np.array([0.18, 0.06, 0.06], np.float32)[None, None] * mline[..., None] * 0.7
    # olhos: esclera, iris, delineado
    scl = np.array([0.88, 0.86, 0.85], np.float32)[None, None]
    base = base * (1 - sclera[..., None]) + scl * sclera[..., None]
    base = np.where(iris[..., None] > 0.02, base * (1 - iris[..., None]) + irisc * iris[..., None], base)
    lc = np.array([0.035, 0.022, 0.02], np.float32)[None, None]
    base = base * (1 - lash[..., None]) + lc * lash[..., None]
    bc = np.array([0.075, 0.045, 0.03], np.float32)[None, None]
    base = base * (1 - brow[..., None] * 0.95) + bc * brow[..., None] * 0.95
    # ---- mascaras
    B = np.clip(np.maximum.reduce([sclera, lash, brow, lips, mline * 0.7]), 0, 1)
    G = boxer * (1 - B)
    Rr = np.clip(1 - G - B, 0, 1)
    mask = np.stack([Rr, G, B], -1)
    mask2 = np.stack([lips, np.zeros_like(lips), np.zeros_like(lips)], -1)
    mask3 = np.stack([iris, brow, lash], -1)
    mask4 = np.zeros_like(mask)
    # dilata nas emendas das ilhas
    outs = {}
    for name, im, srgb in (("male_basecolor", base, True), ("male_mask", mask, False), ("male_mask2", mask2, False),
                           ("male_mask3", mask3, False), ("male_mask4", mask4, False)):
        im, vd = dilate(im.astype(np.float32), valid)
        if name != "male_basecolor" and name != "male_mask4":
            pass
        im = np.where(vd[..., None], im, (np.array([0, 0, 0]) if not srgb else REF_SKIN)[None, None])
        enc = lin2srgb(im) if srgb else im
        # glTF/Blender UV origem embaixo-esquerda: linha 0 do PNG = topo => inverte
        img8 = (np.clip(enc, 0, 1)[::-1] * 255 + 0.5).astype(np.uint8)
        path = os.path.join(CACHE, name + ".png"); png_write(path, np.ascontiguousarray(img8)); outs[name] = path
    log("texturas escritas", {k: os.path.getsize(v) // 1024 for k, v in outs.items()}, "KB", f"{time.time()-t0:.0f}s")


if __name__ == "__main__":
    stage_paint()

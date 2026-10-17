"""Etapa 2: textura base LIMPA (so pele + boxer, sem olhos/sobrancelhas/boca) + mascaras do masculino.
Usage: blender -b --factory-startup -noaudio --python paint_male.py
As feicoes NAO sao pintadas: sao camadas em tempo real (src/game/character/maleFace.ts + maleMaterial.ts).
A textura do Meshy (src/male_meshy_tex.glb) so serve de fonte do sombreado suave: e amostrada por posicao 3D
(atributo srcpos do prepare_male.py), com as feicoes apagadas por inpaint no espaco UV.
Saidas (.cache): male_basecolor.png (pele = REF_SKIN, boxer = REF_SUIT, as mesmas referencias do dollMaterial.ts, x sombreado suave),
  male_mask.png (R pele, G boxer, B vazio), male_mask2/3/4.png vazias (compatibilidade com a convencao doll_mask*).
"""
import sys, os, zlib, struct
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mcommon import *

TEX = 2048
REF_SKIN = np.array([0.844, 0.527, 0.456]); REF_SUIT = np.array([0.866, 0.337, 0.405])
LUMW = np.array([0.2126, 0.7152, 0.0722], np.float32)


def png_write(path, rgb8):
    h, w, c = rgb8.shape
    raw = b"".join(b"\x00" + rgb8[y].tobytes() for y in range(h))
    def chunk(t, d): return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    open(path, "wb").write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
                           + chunk(b"IDAT", zlib.compress(raw, 6)) + chunk(b"IEND", b""))


def lin2srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)


def rasterize(co, nr, tv, tl, uv, extra):
    """posicao 3D, normal e atributo extra (srcpos) por texel"""
    S = TEX
    pos = np.zeros((S, S, 3), np.float32); nrm = np.zeros((S, S, 3), np.float32)
    lab = np.zeros((S, S), np.int8) - 1
    ex = np.zeros((S, S, 3), np.float32)
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
        ex[py, px] = extra[i0] * w0 + extra[i1] * w1 + extra[i2] * w2
        lab[py, px] = 0
    return pos, nrm, lab, ex


def dilate(img, valid, it=16):
    img = img.copy(); valid = valid.copy()
    for _ in range(it):
        acc = np.zeros_like(img); cnt = np.zeros(valid.shape, np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            v = np.roll(valid, (dy, dx), (0, 1)); im = np.roll(img, (dy, dx), (0, 1))
            acc += im * v[..., None]; cnt += v
        new = (~valid) & (cnt > 0)
        img[new] = acc[new] / cnt[new][:, None]; valid = valid | new
    return img, valid


def load_meshy_sampler():
    """importa o GLB texturizado do Meshy e devolve f(pontos_src Nx3) -> cor linear Nx3 (superficie mais proxima)"""
    import mathutils
    from mathutils.bvhtree import BVHTree
    from mathutils import interpolate
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, "src", "male_meshy_tex.glb"))
    ob = [x for x in bpy.data.objects if x not in before and x.type == 'MESH'][0]
    me = ob.data
    img = [n.image for n in me.materials[0].node_tree.nodes if n.type == 'TEX_IMAGE' and any(l.to_socket.name == 'Base Color' for oo in n.outputs for l in oo.links)][0]
    W, H = img.size
    px = np.empty(W * H * 4, np.float32); img.pixels.foreach_get(px); px = px.reshape(H, W, 4)[..., :3]
    px = np.where(px <= 0.04045, px / 12.92, ((px + 0.055) / 1.055) ** 2.4)      # sRGB -> linear
    bvh = BVHTree.FromObject(ob, bpy.context.evaluated_depsgraph_get())
    uvd = arr(me.uv_layers[0].uv, 'vector', 2)
    pv = [[me.vertices[i].co.copy() for i in p.vertices] for p in me.polygons]
    lo = [list(p.loop_indices) for p in me.polygons]

    def f(P):
        out = np.zeros((len(P), 3), np.float32)
        for k, q in enumerate(P):
            loc, nor, idx, dist = bvh.find_nearest(mathutils.Vector(q))
            if idx is None: continue
            w = interpolate.poly_3d_calc(pv[idx], loc)
            u = sum(uvd[lo[idx][j]] * w[j] for j in range(len(w)))
            out[k] = px[min(int((u[1] % 1.0) * H), H - 1), min(int((u[0] % 1.0) * W), W - 1)]
        return out
    return f


def fill_nan(M, ok, it=600):
    """preenche M onde ~ok com a media dos vizinhos validos (difusao ate cobrir)"""
    M = M.copy(); ok = ok.copy()
    for _ in range(it):
        if ok.all(): break
        acc = np.zeros_like(M); cnt = np.zeros(ok.shape, np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            v = np.roll(ok, (dy, dx), (0, 1)); acc += np.roll(M, (dy, dx), (0, 1)) * v[..., None]; cnt += v
        new = (~ok) & (cnt > 0); M[new] = acc[new] / cnt[new][:, None]; ok = ok | new
    return M


def blur(M, r, it=2):
    for _ in range(it):
        for ax in (0, 1):
            acc = np.zeros_like(M)
            for d in range(-r, r + 1): acc += np.roll(M, d, ax)
            M = acc / (2 * r + 1)
    return M


def stage_paint():
    t0 = time.time()
    bpy.ops.wm.open_mainfile(filepath=blend("male_1"))
    o = bpy.data.objects["body"]; me = o.data
    LM = json.load(open(os.path.join(CACHE, "landmarks.json")))
    co = getco(o); tv = tris(me); nt = len(tv)
    nr = vnormals(co, tv)
    srcpos = arr(me.attributes['srcpos'].data, 'vector', 3)
    tl = np.empty(nt * 3, np.int32); me.loop_triangles.foreach_get('loops', tl); tl = tl.reshape(-1, 3)
    uv = arr(me.uv_layers[0].uv, 'vector', 2, np.float32)
    pos, nrm, tlab, spos = rasterize(co, nr, tv, tl, uv, srcpos)
    valid = tlab >= 0
    log("texels cobertos", valid.mean())
    X, Y, Z = pos[..., 0], pos[..., 1], pos[..., 2]

    def circ(th, cur):
        t_ = np.array(cur["th"]); z_ = np.array(cur["z"])
        return np.interp(th, np.concatenate([t_ - 2 * math.pi, t_, t_ + 2 * math.pi]), np.tile(z_, 3))
    BX = LM["box"]
    zw = circ(np.arctan2(Y - BX["waist"]["cy"], X), BX["waist"])
    zh = np.where(X >= 0, circ(np.arctan2(Y - BX["hem1"]["cy"], X - BX["hem1"]["cx"]), BX["hem1"]),
                  circ(np.arctan2(Y - BX["hem-1"]["cy"], X - BX["hem-1"]["cx"]), BX["hem-1"]))
    boxer = ((Z < zw) & (Z > zh) & (np.abs(X) < 0.225) & valid).astype(np.float32)

    # ---- sombreado suave da textura do Meshy (1/4 da resolucao), feicoes apagadas
    f = load_meshy_sampler()
    q = 4; Sq = TEX // q
    vq = valid[q // 2::q, q // 2::q]; bq = boxer[q // 2::q, q // 2::q] > 0.5
    cols = f(spos[q // 2::q, q // 2::q][vq].astype(np.float64))
    C = np.zeros((Sq, Sq, 3), np.float32); C[vq] = cols
    lum = C @ LUMW
    shade = np.ones((Sq, Sq), np.float32)
    for grp in (vq & ~bq, vq & bq):
        if grp.sum() < 10: continue
        med = np.median(C[grp], axis=0); ml = float(med @ LUMW)
        d = np.linalg.norm(C - med, axis=-1)
        feat = grp & (d > 0.07)
        fe = feat.copy()
        for _ in range(3):
            fe = fe | np.roll(fe, 1, 0) | np.roll(fe, -1, 0) | np.roll(fe, 1, 1) | np.roll(fe, -1, 1)
        good = grp & ~fe
        sh = np.where(good, lum / max(ml, 1e-4), 1.0)
        sh = fill_nan(sh[..., None], good)[..., 0]
        shade = np.where(grp, sh, shade)
        log("grupo", int(grp.sum()), "texels apagados (feicoes/manchas)", int((grp & fe).sum()), "cor mediana", med.round(3).tolist())
    shade = np.clip(blur(shade, 3, 2), 0.93, 1.05)
    S_full = blur(np.kron(shade, np.ones((q, q), np.float32)), 4, 2)
    skin_c = REF_SKIN.astype(np.float32)[None, None]; suit_c = REF_SUIT.astype(np.float32)[None, None]
    base = (skin_c * (1 - boxer[..., None]) + suit_c * boxer[..., None]) * S_full[..., None]
    base[(Z > zw - 0.040) & (boxer > 0)] *= 0.80          # elastico do cos
    mask = np.stack([1 - boxer, boxer, np.zeros_like(boxer)], -1)   # B vazio: rosto = camadas em tempo real
    zero = np.zeros_like(mask)
    outs = {}
    for name, im, srgb in (("male_basecolor", base, True), ("male_mask", mask, False), ("male_mask2", zero, False),
                           ("male_mask3", zero, False), ("male_mask4", zero, False)):
        im, vd = dilate(im.astype(np.float32), valid)
        im = np.where(vd[..., None], im, (REF_SKIN if srgb else np.zeros(3))[None, None])
        enc = lin2srgb(im) if srgb else im
        img8 = (np.clip(enc, 0, 1)[::-1] * 255 + 0.5).astype(np.uint8)
        path = os.path.join(CACHE, name + ".png"); png_write(path, np.ascontiguousarray(img8)); outs[name] = path
    log("texturas escritas", {k: os.path.getsize(v) // 1024 for k, v in outs.items()}, "KB", f"{time.time()-t0:.0f}s")


if __name__ == "__main__":
    stage_paint()

"""Boneca "de camadas": gera public/assets/characters/doll_layers.glb (SEM sobrescrever doll_base.glb) e as mascaras doll_layers_mask*.png.
Usage: python tools/blender/doll/make_doll_layers.py        (Python 3 + numpy + scipy + Pillow; sem Blender)

O CORPO NAO MUDA (mesmos vertices, UV, pesos, esqueleto, 20 morphs, nos): so
 1. a regiao dos olhos e assentada sobre a pele (flatten_eyes.py): cilios/palpebras esculpidos em relevo deixam de existir (sem apagar faces);
 2. as texturas (base, normal, rugosidade/metal) perdem o rosto pintado: olhos, cilios, sobrancelhas, boca, blush (inpaint no espaco UV, regiao
    definida no espaco 3D por projecao frontal; o atlas do rosto e uma ilha minuscula ~190 px). Normal e rough/metal viram valores neutros na regiao;
 3. mascaras novas (R pele, G macacao, B = linha do cabelo (mask2.G original)): o rosto limpo e pele tingivel (as feicoes agora sao camadas em tempo real, ver maleFace.ts);
 4. 12 morphs de formato do rosto (f_*, em pares -/+) como alvos esparsos, na versao feminina.
Licoes do trabalho anterior (jb-wt-avatar/clean_texture.py): regiao 3D -> UV, pele base = mediana da testa, normal=(.5,.5,1) e rm=mediana na regiao.
"""
import os, sys, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
import scipy.sparse as sp

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from glbtool import Glb
from flatten_eyes import flatten

REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
CH = os.path.join(REPO, "public", "assets", "characters")
S = 2048


def sstep(t):
    t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)


def bell(r): return 1 - sstep(r)


# ------------------------------------------------------------------ texturas
def uv_positions(P, UV, IDX):
    """posicao 3D por texel (so triangulos da cabeca/rosto)"""
    face_v = (P[:, 1] > 1.2) & (P[:, 2] > -0.1)
    tri = np.nonzero(face_v[IDX].all(1))[0]
    pos = np.full((S, S, 3), np.nan, np.float32)
    for t in tri:
        v = IDX[t]; uv = UV[v] * S
        x0, y0 = np.floor(uv.min(0)).astype(int); x1, y1 = np.ceil(uv.max(0)).astype(int)
        if x1 - x0 > 400 or y1 - y0 > 400: continue
        xs, ys = np.meshgrid(np.arange(max(x0, 0), min(x1 + 1, S)), np.arange(max(y0, 0), min(y1 + 1, S)))
        px = xs + .5; py = ys + .5
        (ax, ay), (bx, by), (cx, cy) = uv
        d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
        if abs(d) < 1e-9: continue
        l1 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / d
        l2 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / d
        l3 = 1 - l1 - l2
        m = (l1 >= -.02) & (l2 >= -.02) & (l3 >= -.02)
        if not m.any(): continue
        p3 = l1[..., None] * P[v[0]] + l2[..., None] * P[v[1]] + l3[..., None] * P[v[2]]
        sub = pos[ys[0, 0]:ys[0, 0] + ys.shape[0], xs[0, 0]:xs[0, 0] + xs.shape[1]]
        sub[m] = p3[m]
    return pos


def clean_textures(g, P, UV, IDX):
    atlas = np.asarray(g.image(1).resize((S, S), Image.BILINEAR), np.float32) / 255.0
    nrm = np.asarray(g.image(0).resize((S, S), Image.BILINEAR), np.float32) / 255.0
    rm = np.asarray(g.image(2).resize((S, S), Image.BILINEAR), np.float32) / 255.0
    pos = uv_positions(P, UV, IDX)
    valid = ~np.isnan(pos[..., 0])
    X, Y, Z = pos[..., 0], pos[..., 1], pos[..., 2]
    with np.errstate(invalid="ignore"):
        # tela frontal 1024 (as mesmas de makeup/landmarks.ts: x -0.11..0.11, y 1.28..1.5)
        cx = (X + 0.11) / 0.22 * 1024; cy = (1 - (Y - 1.28) / 0.22) * 1024
        reg = valid & (Z > 0.0) & (Y > 1.22) & (np.abs(X) < 0.125)
        fore = valid & (cy > 110) & (cy < 185) & (cx > 300) & (cx < 720) & (Z > 0.04)
    base = np.median(atlas[fore], 0)
    print("pele base (forehead median)", base)
    w = (ndi.binary_dilation(reg, iterations=3) & ndi.binary_dilation(valid, iterations=2)).astype(np.float32)[..., None]
    a2 = atlas * (1 - w) + base[None, None, :] * w
    nflat = np.array([0.5, 0.5, 1.0], np.float32)
    rmed = np.median(rm[fore], 0)
    n2 = nrm * (1 - w) + nflat * w
    r2 = rm * (1 - w) + rmed * w
    return a2, n2, r2, w[..., 0]


def to_img(a): return Image.fromarray((np.clip(a, 0, 1) * 255 + .5).astype(np.uint8))


# ------------------------------------------------------------------ morphs femininos de formato do rosto
MORPH_GAIN = 1.6      # amplitude dos morphs femininos (primeira versao: 1.0 = pouco visivel)
TARGET_MM = {"f_jawWide": 9, "f_jawSoft": 7, "f_chinWide": 8, "f_chinPointed": 8, "f_cheekFull": 8, "f_cheekHollow": 6,
             "f_noseWide": 5, "f_noseNarrow": 4, "f_lipsFull": 5, "f_lipsThin": 3, "f_faceLong": 10, "f_faceShort": 9}
LABELS = {"f_jawWide": "Mandibula larga", "f_jawSoft": "Mandibula suave", "f_chinWide": "Queixo largo", "f_chinPointed": "Queixo pontudo",
          "f_cheekFull": "Bochechas cheias", "f_cheekHollow": "Bochechas fundas", "f_noseWide": "Nariz largo", "f_noseNarrow": "Nariz fino",
          "f_lipsFull": "Labios cheios", "f_lipsThin": "Labios finos", "f_faceLong": "Rosto longo", "f_faceShort": "Rosto curto"}


def face_morphs(P, N, IDX):
    key = np.round(P * 1e5).astype(np.int64)
    _, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True); inv = inv.ravel()
    U = P[first]; NU = N[first]; nU = len(U)
    t = inv[IDX]
    e = np.unique(np.sort(np.concatenate([t[:, [0, 1]], t[:, [1, 2]], t[:, [2, 0]]]), 1), axis=0)
    A = sp.coo_matrix((np.ones(len(e)), (e[:, 0], e[:, 1])), shape=(nU, nU)); A = (A + A.T).tocsr()
    deg = np.maximum(np.asarray(A.sum(1)).ravel(), 1)
    x, y, z = U[:, 0], U[:, 1], U[:, 2]; ax = np.abs(x); sg = np.sign(x); zero = np.zeros(nU)
    front = sstep((z - 0.0) / 0.05)

    def b3(cx, cy, cz, rx, ry, rz): return bell(np.sqrt(((ax - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2))
    def V(dx=0, dy=0, dz=0): return np.stack([dx + zero, dy + zero, dz + zero], 1)
    def sm(D, it=2):
        for _ in range(it): D = D + 0.5 * ((A @ D) / deg[:, None] - D)
        return D
    out = {}
    lower = sstep((1.375 - y) / 0.06) * sstep((y - 1.235) / 0.03) * front
    out["f_jawWide"] = V(dx=sg * sstep(ax / 0.04) * lower)
    out["f_jawSoft"] = -V(dx=sg * sstep(ax / 0.04) * lower) * 0.8
    chin = b3(0.0, 1.282, 0.100, 0.07, 0.055, 0.07)
    out["f_chinWide"] = V(dx=x * 0.3 * chin)
    out["f_chinPointed"] = V(dx=-x * 0.22 * chin, dy=-0.002 * chin, dz=0.001 * chin)      # mais fino e delicado, arredondado (sem bico)
    ck = b3(0.078, 1.348, 0.095, 0.045, 0.05, 0.05) * front
    out["f_cheekFull"] = NU * (0.012 * ck)[:, None]
    hl = b3(0.07, 1.335, 0.085, 0.04, 0.045, 0.05) * front
    out["f_cheekHollow"] = NU * (-0.009 * hl)[:, None]
    ala = b3(0.0, 1.352, 0.142, 0.03, 0.022, 0.03)
    out["f_noseWide"] = V(dx=sg * sstep(ax / 0.006) * ala * 0.006)
    out["f_noseNarrow"] = -V(dx=sg * sstep(ax / 0.006) * ala * 0.006)
    lp = b3(0.0, 1.318, 0.138, 0.034, 0.02, 0.03) * front
    out["f_lipsFull"] = NU * (0.006 * lp)[:, None]
    out["f_lipsThin"] = NU * (-0.004 * lp)[:, None]
    wf = front * sstep((y - 1.24) / 0.04) * (1 - sstep((y - 1.43) / 0.05))
    out["f_faceLong"] = V(dy=(y - 1.40) * 0.14 * wf)
    out["f_faceShort"] = V(dy=-(y - 1.40) * 0.12 * wf)
    for k in list(out):
        out[k] = sm(out[k], 14)
        pk = np.linalg.norm(out[k], axis=1).max()
        if pk > 1e-9: out[k] = out[k] * (TARGET_MM[k] * MORPH_GAIN / 1000.0 / pk)
    return {k: v[inv] for k, v in out.items()}


# ------------------------------------------------------------------ main
def main():
    g = Glb(os.path.join(CH, "doll_base.glb"))
    P, N, UV, IDX = g.mesh()
    prim = g.prim()
    # 1) olhos assentados na pele
    Pn, Nn, info = flatten(P, N, IDX)
    print("flatten:", info)
    g.set_acc(prim["attributes"]["POSITION"], Pn); g.set_acc(prim["attributes"]["NORMAL"], Nn)
    # 2) texturas limpas
    a2, n2, r2, w = clean_textures(g, P, UV, IDX)
    g.set_image(1, to_img(a2), 93); g.set_image(0, to_img(n2), 93); g.set_image(2, to_img(r2), 93)
    g.J["materials"][0]["doubleSided"] = False        # fitas viram faces coplanares; as invertidas ficam culladas
    # 3) mascaras (R pele, G macacao, B = linha do cabelo (mask2.G original)) alinhadas a doll_mask*.png
    m1 = np.asarray(Image.open(os.path.join(CH, "doll_mask.png")).convert("RGB").resize((S, S), Image.NEAREST), np.float32) / 255.0
    wm = (w > 0.5)[..., None]
    m = m1.copy()
    m[..., 0] = np.where(wm[..., 0], np.clip(m1[..., 0] + m1[..., 2], 0, 1), m1[..., 0]); m[..., 2] = np.where(wm[..., 0], 0, m1[..., 2])
    m[..., 1] = np.where(wm[..., 0], 0, m1[..., 1])
    m2 = np.asarray(Image.open(os.path.join(CH, "doll_mask2.png")).convert("RGB").resize((S, S), Image.NEAREST), np.float32) / 255.0
    m[..., 2] = m2[..., 1]                              # B = linha do cabelo pintada (base do couro cabeludo na cor do cabelo)
    to_img(m).save(os.path.join(CH, "doll_layers_mask.png"), optimize=True)
    for k in ("2", "3"):
        z = np.zeros((S, S, 3), np.uint8); Image.fromarray(z).save(os.path.join(CH, f"doll_layers_mask{k}.png"), optimize=True)
    # mask4 (unhas) segue a original
    Image.open(os.path.join(CH, "doll_mask4.png")).save(os.path.join(CH, "doll_layers_mask4.png"))
    # 4) morphs de formato (alvos esparsos)
    morphs = face_morphs(Pn, Nn, IDX)
    mesh = g.J["meshes"][0]
    names = list(mesh.get("extras", {}).get("targetNames", []))
    for k, D in morphs.items():
        idx = np.nonzero(np.linalg.norm(D, axis=1) > 2e-5)[0]
        acc = g.add_sparse_vec3(idx, D[idx])
        prim["targets"].append({"POSITION": acc}); names.append(k)
        if "weights" in mesh: mesh["weights"].append(0)
        print(f"  {k:14s} {len(idx):5d} verts  max {np.linalg.norm(D, axis=1).max() * 1000:.1f} mm")
    mesh.setdefault("extras", {})["targetNames"] = names
    out = os.path.join(CH, "doll_layers.glb")
    g.save(out)
    # metadados no formato do doll_base.json (+ morphs novos)
    meta = json.load(open(os.path.join(CH, "doll_base.json"), encoding="utf-8"))
    meta["source"] = "doll_base.glb + olhos assentados + rosto limpo (tools/blender/doll/make_doll_layers.py)"
    meta["files"] = {"body": "doll_layers.glb", "hair": meta["files"].get("hair"), "mask": "doll_layers_mask.png", "mask2": "doll_layers_mask2.png", "mask3": "doll_layers_mask3.png", "mask4": "doll_layers_mask4.png"}
    for k in LABELS:
        meta["morphs"].append({"name": k, "label": LABELS[k], "group": "Rosto", "min": 0, "max": 1, "targets": ["body"]})
    meta["sizesBytes"] = {"doll_layers.glb": os.path.getsize(out)}
    json.dump(meta, open(os.path.join(CH, "doll_layers.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print("ok", os.path.getsize(out) // 1024, "KB")


if __name__ == "__main__":
    main()

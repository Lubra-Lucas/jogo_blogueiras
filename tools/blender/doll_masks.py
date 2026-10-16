"""Mascaras de regiao da boneca, no espaco UV do atlas (1024x1024).
Uso: python tools/blender/doll_masks.py   (numpy + Pillow + scipy; sem Blender)
Le public/assets/characters/doll_base.glb (UV, pesos de osso) e o atlas basecolor do GLB e grava:
  doll_mask.png  R = pele nua (rosto, pescoco, maos, pes)   G = macacao pintado   B = feicoes que NAO tingem
                 (olhos, cilios, sobrancelhas, labios; labios tambem em doll_mask2.png)
  doll_mask2.png R = labios (tingiveis por lips.color)   G = linha do cabelo na borda do rosto (tingida com a cor do cabelo)
Classificacao: cor do atlas (matiz rosa do macacao x pele x escuro/azul/branco das feicoes) + geometria
(triangulos dominados pelo osso Head acima do pescoco = regiao do rosto). Depois limpa com blur/limiar.
"""
import io, json, struct, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as ndi

REPO = __file__.replace("\\", "/").rsplit("/tools/", 1)[0]
GLB = f"{REPO}/public/assets/characters/doll_base.glb"
OUT = f"{REPO}/public/assets/characters"
N = 1024
S = 2048  # resolucao de trabalho

b = open(GLB, "rb").read()
jl = struct.unpack_from("<I", b, 12)[0]
J = json.loads(b[20:20 + jl])
binoff = 20 + jl + 8
BIN = b[binoff:]
CT = {5121: np.uint8, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}


def acc(i):
    a = J["accessors"][i]; bv = J["bufferViews"][a["bufferView"]]
    dt = np.dtype(CT[a["componentType"]]); n = NC[a["type"]]
    stride = bv.get("byteStride", dt.itemsize * n)
    off = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    raw = np.frombuffer(BIN, np.uint8, count=stride * a["count"], offset=off).reshape(a["count"], stride)
    return raw[:, :dt.itemsize * n].copy().view(dt).reshape(a["count"], n)


prim = J["meshes"][0]["primitives"][0]
P = acc(prim["attributes"]["POSITION"]).astype(np.float64)
UV = acc(prim["attributes"]["TEXCOORD_0"]).astype(np.float64)
JT = acc(prim["attributes"]["JOINTS_0"]).astype(int)
WT = acc(prim["attributes"]["WEIGHTS_0"]).astype(np.float64)
if WT.max() > 1.5: WT /= 255.0 if CT[J["accessors"][prim["attributes"]["WEIGHTS_0"]]["componentType"]] == np.uint8 else 65535.0
IDX = acc(prim["indices"]).reshape(-1, 3).astype(int)
bones = [J["nodes"][i]["name"] for i in J["skins"][0]["joints"]]
head_ids = [i for i, n in enumerate(bones) if n.endswith("Head")]
img = J["images"][1]; bv = J["bufferViews"][img["bufferView"]]
atlas = np.asarray(Image.open(io.BytesIO(BIN[bv.get("byteOffset", 0):bv.get("byteOffset", 0) + bv["byteLength"]])).convert("RGB").resize((S, S), Image.BILINEAR), np.float32) / 255.0

# --- geometria: triangulos do rosto = peso do osso Head dominante e acima do pescoco
wh = np.zeros(len(P))
for k in range(4): wh += np.where(np.isin(JT[:, k], head_ids), WT[:, k], 0)
ymax = P[:, 1].max()
print("altura", ymax)
face_v = (wh > 0.6) & (P[:, 1] > ymax - 0.40)
face_t = face_v[IDX].all(1)
head_t = (wh[IDX].mean(1) > 0.5) & (P[IDX][:, :, 1].mean(1) > ymax - 0.40)  # tudo acima do pescoco: nunca macacao (calota da testa etc.)


def raster(tris, size=S):
    im = Image.new("L", (size, size), 0); d = ImageDraw.Draw(im)
    for t in tris:
        d.polygon([(UV[v, 0] * size, UV[v, 1] * size) for v in IDX[t]], fill=255)
    return np.asarray(im) > 0


cover = raster(range(len(IDX)))
face = raster(np.nonzero(face_t | head_t)[0])
head = face
# calota do couro cabeludo (y > 1.50 m): os UV dessas faces colapsam em poucos texels; viram 'cabelo' (tingidos com a cor do cabelo)
scalp_t = P[IDX][:, :, 1].mean(1) > 1.50
scalp = ndi.binary_dilation(raster(np.nonzero(scalp_t)[0]), iterations=10)
body_only = cover & ~face
cover_d = ndi.binary_dilation(cover, iterations=3)
face_d = ndi.binary_dilation(face, iterations=1) & cover_d

R, G, B = atlas[..., 0], atlas[..., 1], atlas[..., 2]
mx = atlas.max(-1); mn = atlas.min(-1)
sat = (mx - mn) / np.maximum(mx, 1e-4)
lum = atlas @ np.array([.299, .587, .114], np.float32)
bg = (B - G) / np.maximum(mx, 1e-4)  # >0 rosa-macacao, <0 pele
suit = np.clip((bg + 0.02) / 0.06, 0, 1)  # rampa suave
suit = suit * (~face_d) * (~head) * (sat > 0.18)

# --- feicoes (so dentro do rosto)
skin_lum = ndi.uniform_filter(np.where(face_d, lum, 0), 61) / np.maximum(ndi.uniform_filter(face_d.astype(np.float32), 61), 1e-3)
dark = (lum < 0.62 * skin_lum)                       # cilios, sobrancelhas, contorno, pupila
blue = (B > R + 0.02) & (sat > 0.2)                  # iris
white = (sat < 0.12) & (lum > 0.8)                   # esclera / brilho
lipsy = ((R - G) / np.maximum(R, 1e-4) > 0.30) & (R > 0.5) & (sat > 0.28)  # labios (vermelho saturado; blush e mais suave)
brow = ((G - B) / np.maximum(R, 1e-4) > 0.11) & (lum < 0.92 * skin_lum) & (sat > 0.2)  # sobrancelhas (oliva/tan)
# linha do cabelo: faixas tan pintadas na borda das ilhas do rosto (tingidas com a cor do cabelo, nao da pele)
edge = ndi.distance_transform_edt(face_d)
tan = ((G - B) / np.maximum(R, 1e-4) > 0.13) & (sat > 0.22)
hairline = face_d & tan & (edge < 14) & ~dark & (lum >= 0.86 * skin_lum)  # louro: mais claro que a sobrancelha
hairline = (ndi.binary_dilation(ndi.binary_closing(hairline, iterations=2), iterations=2) & face_d) | (scalp & cover_d)
brow &= ~hairline
feat = face_d & (dark | blue | white | brow) & ~hairline
lips = face_d & lipsy & ~brow
if "--debug" in sys.argv:
    print("face px", face.sum(), "feat", feat.sum(), "lips", lips.sum())

def clean(m, open_=1, close=2, blur=1.2):
    m = ndi.binary_closing(m, iterations=close)
    m = ndi.binary_opening(m, iterations=open_) if open_ else m
    return ndi.gaussian_filter(m.astype(np.float32), blur)

# labios: so componentes grandes e realmente vermelhos (o blush das macas e rosa mais suave)
red = (R - G) / np.maximum(R, 1e-4)
lab, nl = ndi.label(lips)
if nl:
    ids = range(1, nl + 1)
    sizes = ndi.sum(lips, lab, ids); mred = ndi.mean(red, lab, ids)
    print('lip comps', [(int(a), round(float(b),2)) for a, b in zip(sizes, mred) if a > 50])
    core = ndi.sum(red > 0.42, lab, ids)  # semente vermelha forte (histerese): o blush nunca chega a 0.42
    keep = [i + 1 for i in range(nl) if core[i] > 120]
    lips = np.isin(lab, keep)
featm = clean(feat, 0, 2, 1.0)
lipm = clean(lips, 1, 2, 1.5)
featm = np.maximum(featm, lipm)
hairm = ndi.gaussian_filter(hairline.astype(np.float32), 1.5)
featm *= (1 - hairm)  # labios nao tingem como pele
# sobrancelhas/cilios finos: dilatar um pouco para cobrir a borda antialias
featm = np.maximum(featm, ndi.gaussian_filter(ndi.binary_dilation(feat, iterations=1).astype(np.float32), 1.0))

suitm = ndi.gaussian_filter(suit.astype(np.float32), 1.5)
suitm = np.clip((suitm - 0.5) * 1.8 + 0.5, 0, 1)
suitm *= (1 - featm)
skinm = np.clip(1 - suitm - featm, 0, 1)
# fora do corpo: pele (inofensivo; evita borda escura por mipmap)
out = np.stack([skinm, suitm, featm], -1)
# preencher o vazio (fora do UV) com a cor da ilha mais proxima p/ evitar sangrar na borda
idx = ndi.distance_transform_edt(~cover_d, return_distances=False, return_indices=True)
out = out[idx[0], idx[1]]
lipf = lipm[idx[0], idx[1]]
hairf = hairm[idx[0], idx[1]]
im = Image.fromarray((np.clip(out, 0, 1) * 255 + .5).astype(np.uint8), "RGB").resize((N, N), Image.LANCZOS)
im.save(f"{OUT}/doll_mask.png", optimize=True)
m2 = np.stack([lipf, hairf, np.zeros_like(lipf)], -1)
Image.fromarray((np.clip(m2, 0, 1) * 255 + .5).astype(np.uint8), "RGB").resize((N, N), Image.LANCZOS).save(f"{OUT}/doll_mask2.png", optimize=True)
# previa: atlas com mascara sobreposta (R=pele azul, G=macacao verde, B=feicoes vermelho)
ov = atlas * 0.45
ov[..., 2] += out[..., 0] * 0.5; ov[..., 1] += out[..., 1] * 0.5; ov[..., 0] += out[..., 2] * 0.7
ov[..., 0] += lipf * 0.4; ov[..., 1] += lipf * 0.4; ov[..., 2] += hairf * 0.6; ov[..., 1] += hairf * 0.6
ov = np.where(cover[..., None], ov, 0)
Image.fromarray((np.clip(ov, 0, 1) * 255).astype(np.uint8)).save(f"{sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('-') else 'C:/Users/user/AppData/Local/Temp/claude/shots/gameC/mask_overlay.png'}")
if "--debug" in sys.argv:
    for yy in (1.40, 1.45, 1.48, 1.50, 1.52, 1.54, 1.56): print(yy, raster(np.nonzero(P[IDX][:, :, 1].mean(1) > yy)[0]).sum(), (P[IDX][:, :, 1].mean(1) > yy).sum())
if "--debug" in sys.argv:
    c = UV[IDX].mean(1); d = np.hypot(c[:, 0] - 0.6055, c[:, 1] - 0.477)
    for t in np.argsort(d)[:5]: print("tri", t, d[t], "y", P[IDX[t]][:, 1], "head w", wh[IDX[t]])
print("scalp px", scalp.sum(), "hairline px", hairline.sum(), "ymax tri", P[IDX][:,:,1].mean(1).max())
ys, xs = np.nonzero(face)
print("face bbox", xs.min() / S, xs.max() / S, ys.min() / S, ys.max() / S)

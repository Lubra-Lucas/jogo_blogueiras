"""Pontos de referencia 3D do rosto + mascara de feicoes (iris/sobrancelha/cilios) da boneca.
Uso: python tools/blender/face_landmarks.py [--debug]   (numpy + Pillow + scipy; sem Blender)

O atlas do Meshy e baixo (o rosto pintado ocupa ~190 px de 2048) e o UV e confuso, entao a maquiagem NAO e
desenhada no UV: ela e projetada de frente no espaco do modelo (plano XY da malha, +Z = frente) a partir de uma
tela 2D (canvas). Este script mede onde ficam olhos, sobrancelhas e boca no espaco da malha (posicoes
rasterizadas do UV -> 3D pelas coordenadas baricentricas, para cada cor pintada) e grava:
  public/assets/characters/doll_face.json   landmarks (metros, espaco da malha) + caixa da tela de projecao
  public/assets/characters/doll_mask3.png   R = iris (tingivel)  G = sobrancelha pintada  B = cilios/delineado pintado
O espaco da malha e o mesmo que o shader ve apos os morph targets (antes do skinning).
"""
import io, json, struct, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

REPO = __file__.replace("\\", "/").rsplit("/tools/", 1)[0]
GLB = f"{REPO}/public/assets/characters/doll_base.glb"
OUT = f"{REPO}/public/assets/characters"
DBG = "C:/Users/user/AppData/Local/Temp/claude/shots/custom"
S = 2048
b = open(GLB, "rb").read()
jl = struct.unpack_from("<I", b, 12)[0]
J = json.loads(b[20:20 + jl])
BIN = b[20 + jl + 8:]
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
IDX = acc(prim["indices"]).reshape(-1, 3).astype(int)
JT = acc(prim["attributes"]["JOINTS_0"]).astype(int)
WT = acc(prim["attributes"]["WEIGHTS_0"]).astype(np.float64)
if WT.max() > 1.5: WT /= 255.0
bones = [J["nodes"][i]["name"] for i in J["skins"][0]["joints"]]
head_ids = [i for i, n in enumerate(bones) if n.endswith("Head")]
img = J["images"][1]; bv = J["bufferViews"][img["bufferView"]]
atlas = np.asarray(Image.open(io.BytesIO(BIN[bv.get("byteOffset", 0):bv.get("byteOffset", 0) + bv["byteLength"]])).convert("RGB").resize((S, S), Image.BILINEAR), np.float32) / 255.0
wh = np.zeros(len(P))
for k in range(4): wh += np.where(np.isin(JT[:, k], head_ids), WT[:, k], 0)
ymax = P[:, 1].max()
print("altura", ymax, "x", P[:, 0].min(), P[:, 0].max(), "z", P[:, 2].min(), P[:, 2].max())
# triangulos do rosto: frente (normal +Z), cabeca, abaixo do couro cabeludo
fv = (wh > 0.5) & (P[:, 1] > ymax - 0.40)
ft = fv[IDX].all(1)
tri = np.nonzero(ft)[0]
pos = np.full((S, S, 3), np.nan, np.float32)
for t in tri:
    v = IDX[t]
    uv = UV[v] * S
    x0, y0 = np.floor(uv.min(0)).astype(int); x1, y1 = np.ceil(uv.max(0)).astype(int)
    if x1 - x0 > 400 or y1 - y0 > 400: continue
    xs, ys = np.meshgrid(np.arange(max(x0, 0), min(x1 + 1, S)), np.arange(max(y0, 0), min(y1 + 1, S)))
    px = xs + 0.5; py = ys + 0.5
    (ax, ay), (bx, by), (cx, cy) = uv
    d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
    if abs(d) < 1e-9: continue
    l1 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / d
    l2 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / d
    l3 = 1 - l1 - l2
    m = (l1 >= -0.02) & (l2 >= -0.02) & (l3 >= -0.02)
    if not m.any(): continue
    p3 = l1[..., None] * P[v[0]] + l2[..., None] * P[v[1]] + l3[..., None] * P[v[2]]
    sub = pos[ys[0, 0]:ys[0, 0] + ys.shape[0], xs[0, 0]:xs[0, 0] + xs.shape[1]]
    sub[m] = p3[m]
# a ilha principal do rosto: so pixels cuja posicao esta na frente (z > mediana)
valid = ~np.isnan(pos[..., 0])
print("pixels com posicao", valid.sum())
R, G, B = atlas[..., 0], atlas[..., 1], atlas[..., 2]
mx = atlas.max(-1); mn = atlas.min(-1); sat = (mx - mn) / np.maximum(mx, 1e-4)
lum = atlas @ np.array([.299, .587, .114], np.float32)
face_px = valid
skin_lum = ndi.uniform_filter(np.where(face_px, lum, 0), 61) / np.maximum(ndi.uniform_filter(face_px.astype(np.float32), 61), 1e-3)
dark = face_px & (lum < 0.62 * skin_lum)
blue = face_px & (B > R + 0.02) & (sat > 0.2)
brow = face_px & ((G - B) / np.maximum(R, 1e-4) > 0.11) & (lum < 0.92 * skin_lum) & (sat > 0.2)
brow &= (pos[..., 1] > 1.418)  # a pupila e marrom (parece sobrancelha): so acima da linha dos olhos
lips2 = np.asarray(Image.open(f"{OUT}/doll_mask2.png").resize((S, S)), np.float32)[..., 0] / 255 > 0.5
lips = face_px & lips2
front = np.zeros_like(valid)
zz = np.where(valid, pos[..., 2], -9)
front = valid & (zz > np.nanpercentile(pos[..., 2][valid], 55))

def stats(mask, name):
    m = mask & front
    lab, n = ndi.label(ndi.binary_closing(m, iterations=3))
    out = {}
    for side, sgn in (("l", 1), ("r", -1)):
        sel = m & ((pos[..., 0] * sgn) > 0.003)
        pts = pos[sel]
        if len(pts) < 5: print("sem pontos", name, side); continue
        out[side] = {"c": np.median(pts, 0).round(4).tolist(), "min": pts.min(0).round(4).tolist(), "max": pts.max(0).round(4).tolist(), "n": int(len(pts))}
    return out

# iris: azul + pupila (escuro cercado de azul)
iris_core = ndi.binary_closing(blue, iterations=2)
iris_fill = ndi.binary_fill_holes(iris_core) & face_px
res = {"iris": stats(iris_fill, "iris"), "brow": stats(brow, "brow"), "lips": stats(lips, "lips"), "dark": stats(dark & ~iris_fill, "dark")}
for k, v in res.items(): print(k, json.dumps(v))
# sobrancelha: pontos separados por lado (para pontas)
json.dump(res, open(f"{DBG}/face_raw.json", "w"), indent=1)

# mascara 3: R iris, G sobrancelha, B cilios/delineado (escuro fora da iris, perto da iris)
near_eye = ndi.binary_dilation(iris_fill, iterations=70)
tan = face_px & ((G - B) / np.maximum(R, 1e-4) > 0.13) & (sat > 0.22)
near_wide = ndi.binary_dilation(iris_fill, iterations=62) & (pos[..., 1] < 1.43)
lash = ((dark & near_eye) | (tan & near_wide)) & ~iris_fill & ~brow
ir = ndi.gaussian_filter(iris_fill.astype(np.float32), 1.2)
bw = ndi.gaussian_filter(ndi.binary_dilation(brow, iterations=1).astype(np.float32), 1.2)
lw = ndi.gaussian_filter(ndi.binary_dilation(lash, iterations=1).astype(np.float32), 1.0)
cover = np.zeros((S, S), bool)
m3 = np.stack([ir, bw, lw], -1)
# preenche o vazio com o vizinho (sem sangrar)
idx = ndi.distance_transform_edt(~face_px, return_distances=False, return_indices=True)
m3 = m3 * face_px[..., None]
Image.fromarray((np.clip(m3, 0, 1) * 255 + .5).astype(np.uint8)).resize((1024, 1024), Image.LANCZOS).save(f"{OUT}/doll_mask3.png", optimize=True)
ov = atlas * 0.5 + np.stack([m3[..., 1], m3[..., 0], m3[..., 2]], -1) * 0.6
Image.fromarray((np.clip(ov, 0, 1)[1050:1300, 40:300] * 255).astype(np.uint8)).resize((780, 750)).save(f"{DBG}/mask3_overlay.png")

# ---- tela de projecao frontal (debug e referencia): x in [-0.11,0.11], y in [1.28,1.50]
CX0, CX1, CY0, CY1, CN = -0.11, 0.11, 1.28, 1.50, 1024
def to_canvas(p):
    return ((p[..., 0] - CX0) / (CX1 - CX0) * CN, (1 - (p[..., 1] - CY0) / (CY1 - CY0)) * CN)
sel = valid & front
pu, pv = to_canvas(pos[sel])
iu = np.clip(pu.astype(int), 0, CN - 1); iv = np.clip(pv.astype(int), 0, CN - 1)
proj = np.zeros((CN, CN, 3), np.float32); hit = np.zeros((CN, CN), bool)
proj[iv, iu] = atlas[sel]; hit[iv, iu] = True
# fechar buracos (atlas 2048 e ~0.5 mm/px no rosto; tela e 0.21 mm/px)
for _ in range(1):
    pass
ind = ndi.distance_transform_edt(~hit, return_distances=False, return_indices=True)
near = ndi.distance_transform_edt(~hit) < 4
proj = np.where(near[..., None], proj[ind[0], ind[1]], 0)
Image.fromarray((proj * 255).astype(np.uint8)).save(f"{DBG}/face_front.png")
sw = {}
for nm, mk in (("iris", iris_fill), ("white", face_px & (sat < 0.12) & (lum > 0.8)), ("dark", dark), ("brow", brow), ("lips", lips)):
    m = np.zeros((CN, CN), np.float32)
    s2 = mk[sel]
    m[iv[s2], iu[s2]] = 1
    sw[nm] = np.where(near, m[ind[0], ind[1]], 0)
    ys, xs = np.nonzero(sw[nm] > 0.5)
    print(nm, "canvas bbox", xs.min(), xs.max(), ys.min(), ys.max())

# ---- mascara da tela frontal: R = labios, G = silhueta da pele do rosto, B = olho aberto (iris + esclera)
iris_c = sw["iris"] > 0.5
white_c = (sw["white"] > 0.5) & ndi.binary_dilation(iris_c, iterations=55)
eye = ndi.binary_closing(iris_c | white_c, iterations=8)
eye = ndi.binary_fill_holes(eye)
eye = ndi.binary_opening(eye, iterations=3)
lips_c = ndi.binary_fill_holes(ndi.binary_closing(sw["lips"] > 0.5, iterations=6))
hitc = ndi.binary_fill_holes(ndi.binary_closing(hit, iterations=6))
# o alcance da pele: nada acima do cabelo (y canvas < 90) nem fora da silhueta
sil = ndi.gaussian_filter(ndi.binary_erosion(hitc, iterations=3).astype(np.float32), 3)
fm = np.stack([ndi.gaussian_filter(lips_c.astype(np.float32), 1.2), sil, ndi.gaussian_filter(eye.astype(np.float32), 1.5)], -1)
Image.fromarray((np.clip(fm, 0, 1) * 255 + .5).astype(np.uint8)).save(f"{OUT}/doll_face_front.png", optimize=True)
dbg = proj * 0.6 + np.stack([fm[..., 0], fm[..., 2] * 0.8, fm[..., 1] * 0.25], -1) * 0.6
Image.fromarray((np.clip(dbg, 0, 1) * 255).astype(np.uint8)).save(f"{DBG}/face_front_masks.png")
json.dump({"box": {"x0": CX0, "x1": CX1, "y0": CY0, "y1": CY1, "size": CN}, "note": "tela frontal: u=(x-x0)/(x1-x0), v=1-(y-y0)/(y1-y0), espaco da malha em repouso; ver src/game/character/makeup/landmarks.ts"}, open(f"{OUT}/doll_face.json", "w"), indent=1)

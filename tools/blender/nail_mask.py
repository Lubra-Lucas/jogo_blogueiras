"""Mascara das unhas (pontas dos dedos das maos) no UV: public/assets/characters/doll_mask4.png (R = unhas, G = posicao ao longo da unha 0 base .. 1 ponta).
Uso: python tools/blender/nail_mask.py   (numpy + Pillow + scipy; sem Blender)
Criterio: vertices ponderados pelos ossos distais dos dedos (mixamorig:*HandIndex3/Middle3/Ring3/Pinky3/Thumb3);
dentro de cada dedo, so o trecho externo (t > ~0.35 ao longo do eixo mao -> ponta) vira "unha" (suave).
Os valores por vertice sao rasterizados no UV com interpolacao baricentrica. Nao existe UV dedicado de unha no
atlas do Meshy, entao a unha cobre a ponta do dedo toda (efeito de ponta pintada / francesinha).
"""
import json, struct
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

REPO = __file__.replace("\\", "/").rsplit("/tools/", 1)[0]
GLB = f"{REPO}/public/assets/characters/doll_base.glb"
OUT = f"{REPO}/public/assets/characters"
S = 2048
b = open(GLB, "rb").read()
jl = struct.unpack_from("<I", b, 12)[0]
J = json.loads(b[20:20 + jl]); BIN = b[20 + jl + 8:]
CT = {5121: np.uint8, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}
def acc(i):
    a = J["accessors"][i]; bv = J["bufferViews"][a["bufferView"]]
    dt = np.dtype(CT[a["componentType"]]); n = NC[a["type"]]
    stride = bv.get("byteStride", dt.itemsize * n); off = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    raw = np.frombuffer(BIN, np.uint8, count=stride * a["count"], offset=off).reshape(a["count"], stride)
    return raw[:, :dt.itemsize * n].copy().view(dt).reshape(a["count"], n)
prim = J["meshes"][0]["primitives"][0]
P = acc(prim["attributes"]["POSITION"]).astype(np.float64); UV = acc(prim["attributes"]["TEXCOORD_0"]).astype(np.float64)
JT = acc(prim["attributes"]["JOINTS_0"]).astype(int); WT = acc(prim["attributes"]["WEIGHTS_0"]).astype(np.float64)
if WT.max() > 1.5: WT /= 255.0
IDX = acc(prim["indices"]).reshape(-1, 3).astype(int)
names = [J["nodes"][i]["name"] for i in J["skins"][0]["joints"]]

def wsum(pred):
    w = np.zeros(len(P))
    for k in range(4):
        sel = np.array([pred(names[j]) for j in JT[:, k]])
        w += np.where(sel, WT[:, k], 0)
    return w

val = np.zeros(len(P))
tv = np.zeros(len(P))
for side in ("Left", "Right"):
    hand = wsum(lambda n: n.endswith(f"{side}Hand")) > 0.5
    hc = P[hand].mean(0)
    for f in ("Index", "Middle", "Ring", "Pinky", "Thumb"):
        w = wsum(lambda n, f=f: n.endswith(f"{side}Hand{f}3"))
        # dedo inteiro (ossos 1..3) para achar o eixo
        wf = wsum(lambda n, f=f: f"{side}Hand{f}" in n)
        cl = wf > 0.5
        if cl.sum() < 5: print("sem dedo", side, f); continue
        d = P[cl].mean(0) - hc; d /= np.linalg.norm(d)
        s = (P - hc) @ d
        lo, hi = s[cl].min(), s[cl].max()
        t = (s - lo) / max(hi - lo, 1e-6)
        val = np.maximum(val, np.clip((t - 0.5) / 0.1, 0, 1) * (wf > 0.3) * np.clip(w * 2, 0, 1) * (t < 1.02))
        tv = np.where(wf > 0.3, np.clip((t - 0.5) / 0.5, 0, 1), tv)
print("verts com unha", (val > 0.5).sum())
img = np.zeros((S, S), np.float32)
img2 = np.zeros((S, S), np.float32)
for tri in np.nonzero((val[IDX] > 0).any(1))[0]:
    v = IDX[tri]; uv = UV[v] * S
    x0, y0 = np.floor(uv.min(0)).astype(int); x1, y1 = np.ceil(uv.max(0)).astype(int)
    if x1 - x0 > 200 or y1 - y0 > 200: continue
    xs, ys = np.meshgrid(np.arange(max(x0, 0), min(x1 + 1, S)), np.arange(max(y0, 0), min(y1 + 1, S)))
    px, py = xs + 0.5, ys + 0.5
    (ax, ay), (bx, by), (cx, cy) = uv
    d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
    if abs(d) < 1e-9: continue
    l1 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / d
    l2 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / d
    l3 = 1 - l1 - l2
    m = (l1 >= -0.01) & (l2 >= -0.01) & (l3 >= -0.01)
    vv = l1 * val[v[0]] + l2 * val[v[1]] + l3 * val[v[2]]
    sub = img[ys[0, 0]:ys[0, 0] + ys.shape[0], xs[0, 0]:xs[0, 0] + xs.shape[1]]
    sub[m] = np.maximum(sub[m], vv[m])
    tt = l1 * tv[v[0]] + l2 * tv[v[1]] + l3 * tv[v[2]]
    sub2 = img2[ys[0, 0]:ys[0, 0] + ys.shape[0], xs[0, 0]:xs[0, 0] + xs.shape[1]]
    sub2[m & (vv > 0.05)] = tt[m & (vv > 0.05)]
img = ndi.gaussian_filter(img, 1.0)
img = np.clip((img - 0.35) * 2.2 + 0.0, 0, 1)
# preenche para nao sangrar (so o valor; fora dos UVs = 0)
out = np.stack([img, ndi.gaussian_filter(img2, 0.8) * (img > 0.02), np.zeros_like(img)], -1)
Image.fromarray((out * 255 + .5).astype(np.uint8)).resize((1024, 1024), Image.LANCZOS).save(f"{OUT}/doll_mask4.png", optimize=True)
atlas = Image.open("C:/Users/user/AppData/Local/Temp/claude/shots/custom/atlas1.png").convert("RGB")
ov = np.asarray(atlas, np.float32) / 255 * 0.5; ov[..., 0] += img * 0.9
Image.fromarray((np.clip(ov, 0, 1) * 255).astype(np.uint8)).save("C:/Users/user/AppData/Local/Temp/claude/shots/custom/nail_overlay.png")

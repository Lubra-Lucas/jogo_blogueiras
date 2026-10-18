"""Bob ruivo (Meshy): baseColor 4096 -> textura de LUMINANCIA 1024 (cinza, JPEG) + cor media/refLum (JSON).
O shader do cabelo (createHairMaterial) so usa a luminancia da textura e multiplica pela cor do jogo,
entao guardamos so luminancia (menor e tinge direito). Uso: python -I bob_tex.py  (sem Blender)."""
import struct, json, os, io, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src", "bob_ruivo_meshy.glb")
CACHE = os.path.join(HERE, "..", ".cache"); os.makedirs(CACHE, exist_ok=True)
SIZE = int(sys.argv[1]) if len(sys.argv) > 1 else 1024
d = open(SRC, "rb").read()
jl = struct.unpack("<I", d[12:16])[0]; j = json.loads(d[20:20 + jl]); bin0 = 20 + jl + 8
mat = j["materials"][0]; ti = mat["pbrMetallicRoughness"]["baseColorTexture"]["index"]
img = j["images"][j["textures"][ti]["source"]]; bv = j["bufferViews"][img["bufferView"]]
raw = d[bin0 + bv.get("byteOffset", 0): bin0 + bv.get("byteOffset", 0) + bv["byteLength"]]
im = Image.open(io.BytesIO(raw)).convert("RGB"); print("base", im.size)
a = np.asarray(im, np.float32) / 255.0
lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
L = lin @ np.array([0.2126, 0.7152, 0.0722], np.float32)
# vertices' UV -> media sobre o que a malha realmente usa
pr = j["meshes"][0]["primitives"][0]; acc = j["accessors"][pr["attributes"]["TEXCOORD_0"]]; bw = j["bufferViews"][acc["bufferView"]]
uv = np.frombuffer(d, np.float32, acc["count"] * 2, bin0 + bw.get("byteOffset", 0) + acc.get("byteOffset", 0)).reshape(-1, 2)
H, W = L.shape
px = np.clip((uv[:, 0] * W).astype(int), 0, W - 1); py = np.clip((uv[:, 1] * H).astype(int), 0, H - 1)
ref = float(L[py, px].mean()); rgb = lin[py, px].mean(0)
srgb = np.where(rgb <= 0.0031308, rgb * 12.92, 1.055 * rgb ** (1 / 2.4) - 0.055)
hexc = "#%02x%02x%02x" % tuple(int(round(float(x) * 255)) for x in srgb)
print("refLum", ref, "meanColor", hexc, "L pcts", np.percentile(L[py, px], [5, 50, 95]))
Lg = np.where(L <= 0.0031308, L * 12.92, 1.055 * np.maximum(L, 1e-9) ** (1 / 2.4) - 0.055)
g = Image.fromarray((np.clip(Lg, 0, 1) * 255 + 0.5).astype(np.uint8), "L").resize((SIZE, SIZE), Image.LANCZOS)
out = os.path.join(CACHE, "bob_lum.jpg"); g.convert("RGB").save(out, quality=82, optimize=True)
print(out, os.path.getsize(out) // 1024, "KB")
json.dump({"refLum": ref, "meanColorHex": hexc}, open(os.path.join(CACHE, "bob_tex.json"), "w"))

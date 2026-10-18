"""Encolhe um GLB de cabelo sem perder nada visivel (so recursos do glTF 2.0 core, sem extensoes):
  WEIGHTS_0 float32 x4 -> uint8 normalizado (soma 255) | TEXCOORD_0 float32 -> uint16 normalizado (so se estiver em [0,1])
e recompacta o buffer (descarta bufferViews sem uso). Uso: python glb_quantize.py <arquivo.glb>  (sem Blender)"""
import struct, json, sys
import numpy as np

CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


def main(path):
    d = open(path, "rb").read()
    jl = struct.unpack("<I", d[12:16])[0]; j = json.loads(d[20:20 + jl]); b0 = 20 + jl + 8
    blen = struct.unpack("<I", d[20 + jl:24 + jl])[0]; binary = d[b0:b0 + blen]
    out = []  # novos bufferViews: bytes

    def view_bytes(i):
        v = j["bufferViews"][i]; o = v.get("byteOffset", 0)
        return binary[o:o + v["byteLength"]], v

    newviews = []; remap = {}

    def add_view(data, target=None):
        pad = (-sum(len(x) for x in out)) % 4
        if pad: out.append(b"\0" * pad)
        off = sum(len(x) for x in out); out.append(bytes(data))
        nv = {"buffer": 0, "byteOffset": off, "byteLength": len(data)}
        if target: nv["target"] = target
        newviews.append(nv); return len(newviews) - 1

    def read_acc(a):
        v = j["bufferViews"][a["bufferView"]]; o = v.get("byteOffset", 0) + a.get("byteOffset", 0)
        n = NC[a["type"]]; dt = CT[a["componentType"]]
        return np.frombuffer(binary, dt, a["count"] * n, o).reshape(a["count"], n)

    mod = set()
    for m in j["meshes"]:
        for p in m["primitives"]:
            wi = p["attributes"].get("WEIGHTS_0")
            if wi is not None and j["accessors"][wi]["componentType"] == 5126:
                a = j["accessors"][wi]; W = read_acc(a).astype(np.float64)
                W = W / np.maximum(W.sum(1, keepdims=True), 1e-9); Q = np.round(W * 255).astype(np.int64)
                for i in np.where(Q.sum(1) != 255)[0]: Q[i, np.argmax(Q[i])] += 255 - Q[i].sum()
                nv = add_view(Q.astype(np.uint8).tobytes(), 34962)
                a.update({"bufferView": nv, "byteOffset": 0, "componentType": 5121, "normalized": True}); a.pop("min", None); a.pop("max", None); mod.add(wi)
            ti = p["attributes"].get("TEXCOORD_0")
            if ti is not None and j["accessors"][ti]["componentType"] == 5126:
                a = j["accessors"][ti]; U = read_acc(a)
                if U.min() >= 0 and U.max() <= 1:
                    nv = add_view(np.round(U.astype(np.float64) * 65535).astype(np.uint16).tobytes(), 34962)
                    a.update({"bufferView": nv, "byteOffset": 0, "componentType": 5123, "normalized": True}); a.pop("min", None); a.pop("max", None); mod.add(ti)
                else:
                    print("UV fora de [0,1]: mantido float")
    # copia o resto (bufferViews ainda referenciados) e remapeia
    used = set()
    for i, a in enumerate(j["accessors"]):
        if i in mod: continue
        if "bufferView" in a: used.add(a["bufferView"])
        s = a.get("sparse")
        if s: used.add(s["indices"]["bufferView"]); used.add(s["values"]["bufferView"])
    for im in j.get("images", []):
        if "bufferView" in im: used.add(im["bufferView"])
    for i in sorted(used):
        data, v = view_bytes(i); nv = {k: val for k, val in v.items() if k not in ("byteOffset", "byteLength")}
        pad = (-sum(len(x) for x in out)) % 4
        if pad: out.append(b"\0" * pad)
        nv["byteOffset"] = sum(len(x) for x in out); nv["byteLength"] = len(data); out.append(data)
        newviews.append(nv); remap[i] = len(newviews) - 1
    for i, a in enumerate(j["accessors"]):
        if i in mod: continue
        if "bufferView" in a: a["bufferView"] = remap[a["bufferView"]]
        s = a.get("sparse")
        if s: s["indices"]["bufferView"] = remap[s["indices"]["bufferView"]]; s["values"]["bufferView"] = remap[s["values"]["bufferView"]]
    for im in j.get("images", []):
        if "bufferView" in im: im["bufferView"] = remap[im["bufferView"]]
    pad = (-sum(len(x) for x in out)) % 4
    if pad: out.append(b"\0" * pad)
    nb = b"".join(out); j["bufferViews"] = newviews; j["buffers"] = [{"byteLength": len(nb)}]
    js = json.dumps(j, separators=(",", ":")).encode(); js += b" " * ((-len(js)) % 4)
    res = struct.pack("<4sII", b"glTF", 2, 12 + 8 + len(js) + 8 + len(nb)) + struct.pack("<I4s", len(js), b"JSON") + js + struct.pack("<I4s", len(nb), b"BIN\0") + nb
    open(path, "wb").write(res)
    print(path, len(d) // 1024, "KB ->", len(res) // 1024, "KB")


main(sys.argv[1])

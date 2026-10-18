"""Leitura/edicao de GLB sem Blender (numpy + Pillow), preservando nos/esqueleto/morphs exatamente como estao.
Edita bytes de bufferViews, adiciona bufferViews/acessores (inclusive esparsos) e regrava o BIN reempacotando com alinhamento de 4 bytes."""
import io, json, struct
import numpy as np
from PIL import Image

CT = {5121: np.uint8, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}


class Glb:
    def __init__(self, path):
        b = open(path, "rb").read()
        jl = struct.unpack_from("<I", b, 12)[0]
        self.J = json.loads(b[20:20 + jl])
        bin_ = b[20 + jl + 8:]
        self.views = []
        for bv in self.J["bufferViews"]:
            o = bv.get("byteOffset", 0)
            self.views.append(bytearray(bin_[o:o + bv["byteLength"]]))

    # ---- acessores densos (sem byteStride especial)
    def acc(self, i):
        a = self.J["accessors"][i]
        dt = np.dtype(CT[a["componentType"]]); n = NC[a["type"]]
        bv = self.J["bufferViews"][a["bufferView"]]
        stride = bv.get("byteStride", dt.itemsize * n)
        off = a.get("byteOffset", 0)
        raw = np.frombuffer(bytes(self.views[a["bufferView"]]), np.uint8)[off:off + stride * a["count"]].reshape(a["count"], stride)
        return raw[:, :dt.itemsize * n].copy().view(dt).reshape(a["count"], n)

    def set_acc(self, i, arr):
        a = self.J["accessors"][i]
        dt = np.dtype(CT[a["componentType"]]); n = NC[a["type"]]
        bv = self.J["bufferViews"][a["bufferView"]]
        assert "byteStride" not in bv
        off = a.get("byteOffset", 0)
        data = np.ascontiguousarray(arr.astype(dt).reshape(a["count"], n)).tobytes()
        self.views[a["bufferView"]][off:off + len(data)] = data
        if a["type"] == "VEC3" and a["componentType"] == 5126:
            a["min"] = [float(x) for x in arr.min(0)]; a["max"] = [float(x) for x in arr.max(0)]

    def image(self, k):
        bv = self.J["images"][k]["bufferView"]
        return Image.open(io.BytesIO(bytes(self.views[bv]))).convert("RGB")

    def set_image(self, k, im, quality=92):
        buf = io.BytesIO(); im.convert("RGB").save(buf, "JPEG", quality=quality, optimize=True)
        self.views[self.J["images"][k]["bufferView"]] = bytearray(buf.getvalue())

    def add_view(self, data, target=None):
        self.views.append(bytearray(data))
        bv = {"buffer": 0, "byteOffset": 0, "byteLength": len(data)}
        if target: bv["target"] = target
        self.J["bufferViews"].append(bv)
        return len(self.views) - 1

    def add_sparse_vec3(self, idx, vals):
        """acessor VEC3 float esparso (base zero) com os indices/valores dados"""
        idx = np.asarray(idx); vals = np.asarray(vals, np.float32)
        n = self.J["accessors"][self.J["meshes"][0]["primitives"][0]["attributes"]["POSITION"]]["count"]
        ict = (5123, np.uint16) if n < 65536 else (5125, np.uint32)
        order = np.argsort(idx); idx = idx[order]; vals = vals[order]
        vi = self.add_view(idx.astype(ict[1]).tobytes())
        vv = self.add_view(vals.tobytes())
        acc = {"componentType": 5126, "count": n, "type": "VEC3", "min": [float(x) for x in vals.min(0)] if len(vals) else [0, 0, 0],
               "max": [float(x) for x in vals.max(0)] if len(vals) else [0, 0, 0],
               "sparse": {"count": int(len(idx)), "indices": {"bufferView": vi, "componentType": ict[0]}, "values": {"bufferView": vv}}}
        self.J["accessors"].append(acc)
        return len(self.J["accessors"]) - 1

    def save(self, path):
        parts = []; off = 0
        for bv, data in zip(self.J["bufferViews"], self.views):
            pad = (-off) % 4
            if pad: parts.append(b"\x00" * pad); off += pad
            bv["byteOffset"] = off; bv["byteLength"] = len(data)
            parts.append(bytes(data)); off += len(data)
        pad = (-off) % 4
        if pad: parts.append(b"\x00" * pad); off += pad
        self.J["buffers"][0]["byteLength"] = off
        js = json.dumps(self.J, separators=(",", ":")).encode()
        js += b" " * ((-len(js)) % 4)
        binb = b"".join(parts)
        total = 12 + 8 + len(js) + 8 + len(binb)
        with open(path, "wb") as f:
            f.write(struct.pack("<III", 0x46546C67, 2, total))
            f.write(struct.pack("<II", len(js), 0x4E4F534A)); f.write(js)
            f.write(struct.pack("<II", len(binb), 0x004E4942)); f.write(binb)

    # ---- malha (primeira primitiva)
    def prim(self):
        return self.J["meshes"][0]["primitives"][0]

    def mesh(self):
        p = self.prim()
        P = self.acc(p["attributes"]["POSITION"]).astype(np.float64)
        N = self.acc(p["attributes"]["NORMAL"]).astype(np.float64)
        UV = self.acc(p["attributes"]["TEXCOORD_0"]).astype(np.float64)
        IDX = self.acc(p["indices"]).reshape(-1, 3).astype(np.int64)
        return P, N, UV, IDX

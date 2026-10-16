"""Biblioteca de roupas da boneca (Blender, headless).
Cada peca e' calculada em 21 "estados" do corpo (Basis + 20 shape keys a 1.0): a geometria e' uma funcao das posicoes do corpo
naquele estado (corte da malha + offset + suavizacao + casco convexo por anel + folga minima), entao os shape keys da roupa
sao os deltas estado - Basis. Pecas parametricas (saias) seguem o corpo por "translacao do ponto mais proximo" com queda por distancia.
"""
import bpy, os, sys, math, json
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
OUTDIR = os.path.join(REPO, "public", "assets", "garments")
SHOTS = r"C:\Users\user\AppData\Local\Temp\claude\shots\garments"
CHAR_BLEND = os.path.join(REPO, "tools", "blender", ".cache", "meshyB_4.blend")


def log(*a): print("[garm]", *a, flush=True)


def arr(coll, attr, dim, dtype=np.float64):
    a = np.empty(len(coll) * dim, dtype); coll.foreach_get(attr, a)
    return a.reshape(len(coll), dim) if dim > 1 else a


# ------------------------------------------------------------------ body
class Body:
    def __init__(self):
        bpy.ops.wm.open_mainfile(filepath=CHAR_BLEND)
        self.rig = bpy.data.objects["Armature"]; self.ob = bpy.data.objects["body_lo"]
        me = self.ob.data
        self.n = len(me.vertices)
        sk = me.shape_keys.key_blocks
        self.states = [k.name for k in sk]            # Basis first
        self.P = {k.name: arr(k.data, 'co', 3) for k in sk}
        self.polys = [tuple(p.vertices) for p in me.polygons]
        self.tris = tri_split(self.polys)
        self.bones = [b.name for b in self.rig.data.bones]
        self.bidx = {n: i for i, n in enumerate(self.bones)}
        self.vg2b = {g.index: self.bidx[g.name] for g in self.ob.vertex_groups if g.name in self.bidx}
        W = np.zeros((self.n, len(self.bones)))
        for v in me.vertices:
            for g in v.groups:
                if g.group in self.vg2b: W[v.index, self.vg2b[g.group]] = g.weight
        self.W = W
        self.P0 = self.P["Basis"]
        self.nrm = {k: vnormals(v, self.tris) for k, v in self.P.items()}
        self._bvh = {}

    def bvh(self, state):
        if state not in self._bvh:
            self._bvh[state] = BVHTree.FromPolygons([tuple(map(float, v)) for v in self.P[state]], [tuple(map(int, t)) for t in self.tris])
        return self._bvh[state]

    def group_mask(self, *subs, thr=0.5):
        cols = [i for i, n in enumerate(self.bones) if any(s in n for s in subs)]
        return self.W[:, cols].sum(1) >= thr


def vnormals(P, tris):
    fn = np.cross(P[tris[:, 1]] - P[tris[:, 0]], P[tris[:, 2]] - P[tris[:, 0]])
    acc = np.zeros_like(P)
    for k in range(3): np.add.at(acc, tris[:, k], fn)
    return acc / np.maximum(np.linalg.norm(acc, axis=1), 1e-12)[:, None]


def tri_split(polys):
    t = []
    for p in polys:
        for i in range(1, len(p) - 1): t.append((p[0], p[i], p[i + 1]))
    return np.array(t, np.int32)


class Graph:
    def __init__(self, n, polys):
        self.n = n
        s = set(); cnt = {}
        for p in polys:
            for i in range(len(p)):
                a, b = p[i], p[(i + 1) % len(p)]; k = (a, b) if a < b else (b, a)
                s.add(k); cnt[k] = cnt.get(k, 0) + 1
        self.E = np.array(sorted(s), np.int32).reshape(-1, 2)
        self.deg = np.bincount(self.E.ravel(), minlength=n).astype(float)
        self.bnd = np.zeros(n, bool)
        for (a, c), k in cnt.items():
            if k == 1: self.bnd[a] = self.bnd[c] = True

    def avg(self, X):
        acc = np.zeros_like(X)
        np.add.at(acc, self.E[:, 0], X[self.E[:, 1]]); np.add.at(acc, self.E[:, 1], X[self.E[:, 0]])
        d = np.maximum(self.deg, 1)
        out = acc / (d[:, None] if X.ndim > 1 else d)
        iso = self.deg == 0
        out[iso] = X[iso]
        return out

    def taubin(self, P, iters, lam=0.5, mu=-0.53, fixed=None):
        P = P.copy()
        for _ in range(iters):
            for f in (lam, mu):
                d = self.avg(P) - P
                if fixed is not None: d[fixed] = 0
                P += f * d
        return P

    def lap(self, X, iters, a=0.5):
        for _ in range(iters): X = (1 - a) * X + a * self.avg(X)
        return X


def hull2d(pts):
    P = sorted(map(tuple, pts))
    def cross(o, a, b): return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo = []
    for p in P:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    up = []
    for p in reversed(P):
        while len(up) >= 2 and cross(up[-2], up[-1], p) <= 0: up.pop()
        up.append(p)
    return np.array(lo[:-1] + up[:-1])


def hull_push(G, ring, w, strength=1.0):
    """per horizontal ring: push vertices radially outward (from the ring bbox centre) to the 2D convex hull of the ring"""
    out = G.copy()
    for r in np.unique(ring[w > 0]):
        idx = np.where(ring == r)[0]
        if len(idx) < 8: continue
        pts = G[idx, :2]; c = (pts.min(0) + pts.max(0)) / 2
        H = hull2d(pts)
        if len(H) < 3: continue
        A = H; B = np.roll(H, -1, 0)
        d = pts - c; e = B - A
        den = d[:, None, 0] * e[None, :, 1] - d[:, None, 1] * e[None, :, 0]
        ac = A[None] - c
        with np.errstate(all='ignore'):
            s = (ac[..., 0] * e[None, :, 1] - ac[..., 1] * e[None, :, 0]) / den
            u = (ac[..., 0] * d[:, None, 1] - ac[..., 1] * d[:, None, 0]) / den
        ok = (np.abs(den) > 1e-12) & (s > 0) & (u >= -1e-6) & (u <= 1 + 1e-6)
        s = np.where(ok, s, 0).max(1)
        k = np.clip(s, 1.0, 1.6)
        new = c + d * k[:, None]
        out[idx, :2] = pts + (new - pts) * (w[idx] * strength)[:, None]
    return out


def clearance(G, body, state, minc, iters=2):
    """push garment vertices outward (along the body normal at the nearest point) so signed distance >= minc"""
    bv = body.bvh(state); G = G.copy()
    for _ in range(iters):
        for i in range(len(G)):
            loc, nrm, fi, dist = bv.find_nearest(Vector(G[i]))
            if loc is None: continue
            n = np.array(nrm)
            sd = float(np.dot(G[i] - np.array(loc), n))
            if sd < minc: G[i] += n * (minc - sd)
    return G


def nearest_info(body, pts, state="Basis"):
    bv = body.bvh(state); P = body.P[state]; tris = body.tris
    fi = np.zeros(len(pts), np.int32); bc = np.zeros((len(pts), 3)); ds = np.zeros(len(pts))
    for i, p in enumerate(pts):
        loc, nrm, f, dist = bv.find_nearest(Vector(p))
        a, b, c = P[tris[f]]; l = np.array(loc)
        v0, v1, v2 = b - a, c - a, l - a
        d00, d01, d11 = v0 @ v0, v0 @ v1, v1 @ v1; d20, d21 = v2 @ v0, v2 @ v1
        den = d00 * d11 - d01 * d01 + 1e-18
        v = (d11 * d20 - d01 * d21) / den; w = (d00 * d21 - d01 * d20) / den
        fi[i] = f; bc[i] = (1 - v - w, v, w); ds[i] = dist
    return fi, bc, ds


def follow_body(body, pts, falloff=0.2, graph=None, smooth=8, region=None):
    """per-state positions: pts + falloff(dist) * (delta of the nearest body surface point)"""
    fi, bc, ds = nearest_info(body, pts)
    wgt = np.clip(1 - ds / falloff, 0, 1); wgt = wgt * wgt * (3 - 2 * wgt)
    if region is not None: wgt = wgt * region
    out = {}
    tv = body.tris[fi]
    for s in body.states:
        d = body.P[s] - body.P0
        dd = (d[tv] * bc[:, :, None]).sum(1) * wgt[:, None]
        if graph is not None and smooth: dd = graph.lap(dd, smooth)
        out[s] = pts + dd
    return out


def weights_smooth(g, W, iters=3):
    W = g.lap(W, iters, 0.5)
    W[W < 0.015] = 0
    idx = np.argsort(-W, axis=1)[:, 4:]
    np.put_along_axis(W, idx, 0, axis=1)
    s = W.sum(1, keepdims=True); s[s == 0] = 1
    return W / s


# ------------------------------------------------------------------ garment container
class Garment:
    def __init__(self, gid, body):
        self.id = gid; self.body = body; self.parts = []; self.mats = []

    def mat_index(self, name):
        if name not in self.mats: self.mats.append(name)
        return self.mats.index(name)

    def add(self, V, polys, mat, uv, W):
        """V: dict state->(n,3); mat: slot name (str) or per-poly list of names"""
        if isinstance(mat, str): mi = [self.mat_index(mat)] * len(polys)
        else: mi = [self.mat_index(m) for m in mat]
        self.parts.append(dict(V=V, polys=polys, mat=mi, uv=uv, W=W))

    def merged(self):
        states = self.body.states; off = 0
        V = {s: [] for s in states}; polys = []; mats = []; uvs = []; Ws = []
        for p in self.parts:
            n = len(p['V']["Basis"])
            for s in states: V[s].append(p['V'][s])
            polys += [tuple(i + off for i in q) for q in p['polys']]
            mats += list(p['mat']); uvs.append(p['uv']); Ws.append(p['W']); off += n
        return {s: np.concatenate(V[s]) for s in states}, polys, np.array(mats), np.concatenate(uvs), np.concatenate(Ws)

    def tri_count(self):
        return sum(len(tri_split(p['polys'])) for p in self.parts)


def cyl_uv(P, polys, center=(0, 0), scale=1.0):
    ang = np.arctan2(P[:, 0] - center[0], -(P[:, 1] - center[1]))
    out = []
    for p in polys:
        a = ang[list(p)].copy()
        if a.max() - a.min() > math.pi: a[a < 0] += 2 * math.pi
        for k, vi in enumerate(p): out.append((a[k] * 0.15 * scale, P[vi, 2] * scale))
    return np.array(out)


def planar_uv(P, polys, ax=(0, 2), scale=1.0):
    return np.array([(P[v, ax[0]] * scale, P[v, ax[1]] * scale) for p in polys for v in p])


# ------------------------------------------------------------------ materials
FINISHES = {
    "latex": dict(roughness=0.12, metallic=0.0, clearcoat=1.0, sheen=0.0),
    "satin": dict(roughness=0.38, metallic=0.0, clearcoat=0.0, sheen=1.0),
    "matte": dict(roughness=0.85, metallic=0.0, clearcoat=0.0, sheen=0.0),
    "tulle": dict(roughness=0.55, metallic=0.0, clearcoat=0.0, sheen=0.4, alpha=0.55),
    "lace": dict(roughness=0.7, metallic=0.0, clearcoat=0.0, sheen=0.2, alphaTexture="lace"),
    "glitter": dict(roughness=0.30, metallic=0.35, clearcoat=0.0, sheen=0.0, normalTexture="glitter"),
    "gold": dict(roughness=0.22, metallic=1.0, clearcoat=0.3, sheen=0.0),
    "pearl": dict(roughness=0.18, metallic=0.15, clearcoat=0.8, sheen=0.5),
}


def hex2lin(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c] + [1.0]


def make_material(name, hexcol, finish, tex_dir=None, double=True, pattern=None):
    f = FINISHES[finish]
    old = bpy.data.materials.get(name)
    if old is not None: bpy.data.materials.remove(old)
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; pb = [n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'][0]
    pb.inputs['Base Color'].default_value = hex2lin(hexcol)
    pb.inputs['Roughness'].default_value = f['roughness']; pb.inputs['Metallic'].default_value = f['metallic']
    for key, val in (('Coat Weight', f['clearcoat']), ('Sheen Weight', f['sheen'])):
        if key in pb.inputs: pb.inputs[key].default_value = val
    if 'Coat Roughness' in pb.inputs: pb.inputs['Coat Roughness'].default_value = 0.05
    if 'Sheen Roughness' in pb.inputs: pb.inputs['Sheen Roughness'].default_value = 0.45
    if 'alpha' in f: pb.inputs['Alpha'].default_value = f['alpha']
    if f.get('alphaTexture') and tex_dir:
        img = bpy.data.images.load(os.path.join(tex_dir, f['alphaTexture'] + ".png")); img.colorspace_settings.name = 'sRGB'
        tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = img
        mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'
        mix.inputs['Factor'].default_value = 1.0
        mix.inputs[7].default_value = hex2lin(hexcol)
        nt.links.new(tx.outputs['Color'], mix.inputs[6])
        nt.links.new(mix.outputs[2], pb.inputs['Base Color'])
        nt.links.new(tx.outputs['Alpha'], pb.inputs['Alpha'])
    if f.get('normalTexture') and tex_dir and os.environ.get('KEEP_TEX'):
        img = bpy.data.images.load(os.path.join(tex_dir, f['normalTexture'] + "_n.png")); img.colorspace_settings.name = 'Non-Color'
        tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = img
        nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = 1.0
        nt.links.new(tx.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], pb.inputs['Normal'])
    if pattern and tex_dir:   # estampa: textura x cor do slot (a cor do jogo continua tingindo)
        img = bpy.data.images.load(os.path.join(tex_dir, "pattern_" + pattern + ".jpg")); img.colorspace_settings.name = 'sRGB'
        tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = img; tx.extension = 'REPEAT'
        mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'
        mix.inputs['Factor'].default_value = 1.0
        mix.inputs[7].default_value = hex2lin(hexcol)
        nt.links.new(tx.outputs['Color'], mix.inputs[6]); nt.links.new(mix.outputs[2], pb.inputs['Base Color'])
    m.use_backface_culling = not double
    try: m.surface_render_method = 'BLENDED' if ('alpha' in f or f.get('alphaTexture')) else 'DITHERED'
    except Exception: pass
    return m


# ------------------------------------------------------------------ export
def to_blender(g, mat_specs, tex_dir):
    body = g.body; rig = body.rig
    V, polys, mats, uv, W = g.merged()
    me = bpy.data.meshes.new(g.id)
    me.from_pydata([tuple(map(float, v)) for v in V["Basis"]], [], [tuple(int(i) for i in p) for p in polys])
    me.update()
    ob = bpy.data.objects.new(g.id, me); bpy.context.scene.collection.objects.link(ob)
    for slot in g.mats:
        sp = mat_specs[slot]; hexc, fin = sp[0], sp[1]
        me.materials.append(make_material(slot, hexc, fin, tex_dir, pattern=(sp[2] if len(sp) > 2 else None)))
    me.polygons.foreach_set('material_index', mats.astype(np.int32))
    me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
    ul = me.uv_layers.new(name="UVMap"); ul.data.foreach_set('uv', uv.astype(np.float32).ravel())
    ob.shape_key_add(name="Basis", from_mix=False)
    for s in body.states[1:]:
        if np.abs(V[s] - V["Basis"]).max() < 1.5e-4: continue
        kb = ob.shape_key_add(name=s, from_mix=False)
        kb.data.foreach_set('co', V[s].astype(np.float32).ravel())
    used = np.where(W.max(0) > 0)[0]
    for bi in used:
        vgp = ob.vertex_groups.new(name=body.bones[bi])
        for i in np.where(W[:, bi] > 0)[0]: vgp.add([int(i)], float(W[i, bi]), 'REPLACE')
    ob.parent = rig
    md = ob.modifiers.new("Armature", 'ARMATURE'); md.object = rig
    return ob


def export_glb(ob, rig, path):
    for o in bpy.data.objects: o.select_set(False)
    ob.select_set(True); rig.select_set(True); bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format='GLB', export_yup=True, export_apply=False,
                              export_image_format='AUTO', export_materials='EXPORT', export_normals=True, export_skins=True,
                              export_def_bones=False, export_animations=False, export_morph=True, export_morph_normal=False,
                              export_try_sparse_sk=True, export_cameras=False, export_lights=False)
    return os.path.getsize(path)


def glb_json(path):
    import struct
    with open(path, "rb") as f:
        f.read(12); ln, tp = struct.unpack("<II", f.read(8)); return json.loads(f.read(ln))


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)

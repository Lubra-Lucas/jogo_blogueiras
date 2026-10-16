"""Sample doll_anims_core.glb on the CPU (no Blender animation system): node world matrices (glTF space) per clip/time."""
import json, struct, os, math
import numpy as np
from mathutils import Matrix, Vector, Quaternion

ANIM = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "public", "assets", "anims", "doll_anims_core.glb"))
_CACHE = {}


def _load(path=ANIM):
    if path in _CACHE: return _CACHE[path]
    with open(path, 'rb') as f:
        f.read(12); ln, _ = struct.unpack('<II', f.read(8)); js = json.loads(f.read(ln))
        ln2, _ = struct.unpack('<II', f.read(8)); binb = f.read(ln2)
    _CACHE[path] = (js, binb); return js, binb


def _acc(js, binb, i):
    a = js['accessors'][i]; bv = js['bufferViews'][a['bufferView']]
    n = {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4}[a['type']]
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    return np.frombuffer(binb, dtype=np.float32, count=a['count']*n, offset=off).reshape(a['count'], n)


def clips():
    js, _ = _load(); return [a['name'] for a in js['animations']]


def clip_duration(name):
    js, binb = _load()
    an = [a for a in js['animations'] if a['name'] == name][0]
    return max(float(_acc(js, binb, s['input'])[-1, 0]) for s in an['samplers'])


def world_at(name, t):
    """dict node name -> 4x4 Matrix (glTF world) at time t of clip `name` (looped)."""
    js, binb = _load(); nodes = js['nodes']
    an = [a for a in js['animations'] if a['name'] == name][0]
    dur = clip_duration(name); t = t % dur if dur > 0 else 0
    trs = {i: [Vector(n.get('translation', (0, 0, 0))), Quaternion((n.get('rotation', (0, 0, 0, 1))[3], *n.get('rotation', (0, 0, 0, 1))[:3])),
               Vector(n.get('scale', (1, 1, 1)))] for i, n in enumerate(nodes)}
    for ch in an['channels']:
        s = an['samplers'][ch['sampler']]; ts = _acc(js, binb, s['input'])[:, 0]; vs = _acc(js, binb, s['output'])
        k = int(np.searchsorted(ts, t, side='right') - 1); k = max(0, min(k, len(ts)-1)); k2 = min(k+1, len(ts)-1)
        f = 0.0 if k2 == k else float((t-ts[k])/(ts[k2]-ts[k]))
        path = ch['target']['path']; ni = ch['target']['node']
        if path == 'rotation':
            q1 = Quaternion((vs[k][3], *vs[k][:3])); q2 = Quaternion((vs[k2][3], *vs[k2][:3]))
            trs[ni][1] = q1.slerp(q2, f)
        elif path == 'translation': trs[ni][0] = Vector(vs[k]).lerp(Vector(vs[k2]), f)
        elif path == 'scale': trs[ni][2] = Vector(vs[k]).lerp(Vector(vs[k2]), f)
    parent = {c: p for p, n in enumerate(nodes) for c in n.get('children', [])}
    cache = {}
    def W(i):
        if i in cache: return cache[i]
        tt, q, sc = trs[i]
        M = Matrix.Translation(tt) @ q.to_matrix().to_4x4() @ Matrix.Diagonal((sc[0], sc[1], sc[2], 1))
        if 'matrix' in nodes[i] and not any(k in nodes[i] for k in ('translation', 'rotation')): M = Matrix([nodes[i]['matrix'][r::4] for r in range(4)])
        cache[i] = (W(parent[i]) @ M) if i in parent else M
        return cache[i]
    return {n.get('name'): W(i) for i, n in enumerate(nodes)}

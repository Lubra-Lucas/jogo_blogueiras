"""(Blender) Auto-interseccao da cabeca: conta pares de triangulos que se cruzam (sem vertice em comum) alem dos que ja cruzam em repouso.
Entrada: npz com U (m,3), T (t,3), deltas (K,m,3), W (C,K) pesos de cada teste. Saida: json com 'new' por teste.
Uso: blender -b --factory-startup -noaudio --python bl_overlap.py -- in.npz out.json"""
import sys, json
import numpy as np
from mathutils.bvhtree import BVHTree

a = sys.argv[sys.argv.index("--") + 1:]
d = np.load(a[0]); U = d["U"]; T = d["T"]; D = d["deltas"]; W = d["W"]
tv = [tuple(int(i) for i in t) for t in T]
share = None


CEN = U[np.array(T)].mean(1)
DMIN = 0.008          # pares a menos de 8 mm em repouso (vizinhos de 2o anel, fitas coplanares) so contam como dobra (ver flips/razao de area), nao como interseccao


def pairs(P):
    tree = BVHTree.FromPolygons([tuple(p) for p in P.tolist()], tv, epsilon=0.0)
    out = set()
    for i, j in tree.overlap(tree):
        if i < j and not (set(tv[i]) & set(tv[j])) and np.linalg.norm(CEN[i] - CEN[j]) > DMIN: out.add((i, j))
    return out


base = pairs(U)
res = []
for w in W:
    P = U + np.tensordot(w, D, axes=(0, 0))
    new = pairs(P) - base
    res.append(len(new))
json.dump({"base": len(base), "new": res}, open(a[1], "w"))
print("overlap base", len(base), "tests", len(res), "max new", max(res))

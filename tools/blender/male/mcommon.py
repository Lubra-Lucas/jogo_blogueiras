"""Shared helpers for the male-avatar pipeline (prepare_male.py / rig_male.py / render_male.py)."""
import bpy, os, sys, math, json, time
import numpy as np
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, ".cache")
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
PUB = os.path.join(REPO, "public", "assets", "characters", "male")
SRC = os.path.join(HERE, "src", "male_meshy.glb")
SHOTS = r"C:\Users\user\AppData\Local\Temp\claude\shots\masculino"
DOLL = os.path.join(REPO, "public", "assets", "characters", "doll_base.glb")
ANIMS = os.path.join(REPO, "public", "assets", "anims", "doll_anims_core.glb")
os.makedirs(CACHE, exist_ok=True); os.makedirs(PUB, exist_ok=True); os.makedirs(SHOTS, exist_ok=True)

TARGET_H = 1.75            # metres, bald head top
SRC_H = 0.9497             # height of the Meshy mesh (its own units)
SC = TARGET_H / SRC_H      # source units -> metres
SRC_ZMIN = -0.4749         # lowest point of the source mesh


def log(*a): print("[male]", *a, flush=True)
def blend(name): return os.path.join(CACHE, name + ".blend")


def arr(coll, attr, dim, dtype=np.float64):
    a = np.empty(len(coll) * dim, dtype); coll.foreach_get(attr, a)
    return a.reshape(len(coll), dim) if dim > 1 else a


def getco(o): return arr(o.data.vertices, 'co', 3)


def setco(o, P):
    o.data.vertices.foreach_set('co', np.asarray(P, np.float32).ravel()); o.data.update()


def tris(me):
    me.calc_loop_triangles()
    nt = len(me.loop_triangles)
    tv = np.empty(nt * 3, np.int32); me.loop_triangles.foreach_get('vertices', tv)
    return tv.reshape(-1, 3)


def edges_of(me):
    e = np.empty(len(me.edges) * 2, np.int32); me.edges.foreach_get('vertices', e)
    return e.reshape(-1, 2)


def select_only(o):
    for x in bpy.context.selected_objects: x.select_set(False)
    o.select_set(True); bpy.context.view_layer.objects.active = o


def vnormals(co, tv):
    fn = np.cross(co[tv[:, 1]] - co[tv[:, 0]], co[tv[:, 2]] - co[tv[:, 0]])
    acc = np.zeros_like(co)
    for k in range(3): np.add.at(acc, tv[:, k], fn)
    return acc / np.maximum(np.linalg.norm(acc, axis=1), 1e-12)[:, None]


def nbr_avg(P, e, deg):
    acc = np.zeros_like(P); np.add.at(acc, e[:, 0], P[e[:, 1]]); np.add.at(acc, e[:, 1], P[e[:, 0]])
    return acc / np.maximum(deg, 1)[:, None]


def degree(e, n):
    d = np.zeros(n); np.add.at(d, e[:, 0], 1); np.add.at(d, e[:, 1], 1); return d


def taubin(P, e, w, it=6, lam=0.5, mu=-0.53):
    """volume-preserving smoothing, per-vertex weight w in 0..1 (0 = pinned)"""
    deg = degree(e, len(P)); w = np.asarray(w)[:, None]
    for _ in range(it):
        P = P + lam * w * (nbr_avg(P, e, deg) - P)
        P = P + mu * w * (nbr_avg(P, e, deg) - P)
    return P


def laplace(P, e, w, it=6, lam=0.5):
    deg = degree(e, len(P)); w = np.asarray(w)[:, None]
    for _ in range(it): P = P + lam * w * (nbr_avg(P, e, deg) - P)
    return P


def sstep(t):
    t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)


def bell(r): return 1 - sstep(r)

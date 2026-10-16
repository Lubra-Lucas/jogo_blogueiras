"""Measure doll landmarks (Blender world coords: x right/left, -y = front, z up) -> landmarks.json"""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from jlib import *

clear_scene(); body = load_doll()
me = body.data
V0 = np.array([c.co[:] for c in me.vertices])
sk = me.shape_keys.key_blocks
def morph_pts(name, v=1.0):
    d = np.array([c.co[:] for c in sk[name].data]) - V0
    return V0 + d * v
Vb = morph_pts('bustBig')
Vs = morph_pts('shouldersNarrow'); Vf = morph_pts('faceThin')
res = {}
# front surface (min y) heightfield for torso region
def front_grid(V, zs, xs, win=0.008):
    G = np.full((len(zs), len(xs)), np.nan)
    for i, z in enumerate(zs):
        sel = V[np.abs(V[:, 2]-z) < win]
        for j, x in enumerate(xs):
            s = sel[np.abs(sel[:, 0]-x) < win]
            if len(s): G[i, j] = s[:, 1].min()
    return G
zs = np.arange(0.98, 1.30, 0.01); xs = np.arange(-0.16, 0.161, 0.01)
res['grid'] = {"zs": zs.round(3).tolist(), "xs": xs.round(3).tolist(),
               "front": np.nan_to_num(front_grid(V0, zs, xs), nan=9).round(4).tolist(),
               "front_bust": np.nan_to_num(front_grid(Vb, zs, xs), nan=9).round(4).tolist()}
# neck ellipses
neck = {}
for z in np.arange(1.20, 1.34, 0.01):
    for name, V in (("n", V0),):
        m = (np.abs(V[:, 2]-z) < 0.005) & (np.abs(V[:, 0]) < 0.06) & (V[:, 1] > -0.05) & (V[:, 1] < 0.06)
        p = V[m]
        if len(p): neck["%.2f" % z] = [p[:, 0].min(), p[:, 0].max(), p[:, 1].min(), p[:, 1].max()]
res['neck'] = {k: [round(float(x), 4) for x in v] for k, v in neck.items()}
# head sides at ear level: extent of x for y in [-0.04,0.03]
ear = {}
for z in np.arange(1.30, 1.46, 0.02):
    m = (np.abs(V0[:, 2]-z) < 0.006) & (np.abs(V0[:, 1]+0.01) < 0.03)
    p = V0[m]
    if len(p): ear["%.2f" % z] = [round(float(p[:, 0].min()), 4), round(float(p[:, 0].max()), 4)]
res['ear'] = ear
# head extent in y at z 1.36
for z in (1.34, 1.36, 1.40, 1.44):
    m = (np.abs(V0[:, 2]-z) < 0.006) & (np.abs(V0[:, 0]) < 0.02)
    p = V0[m]; print("head y at z", z, p[:, 1].min().round(3), p[:, 1].max().round(3))
# forearm/wrist radius along left arm axis
A = np.array([0.3672490417957306, 0.008024821989238262, 0.8674396872520447])  # LeftHand head (blender coords = gltf x,-z,y)
A = np.array([0.36725, 0.0, 0.0]);
arm_h = np.array([0.25416, 0.01118, 0.99304]); arm_t = np.array([0.36725, 0.00802, 0.86744])
ax = (arm_t-arm_h); L = np.linalg.norm(ax); ax /= L
for s in (0.0, 0.3, 0.6, 0.8, 1.0, 1.1, 1.2, 1.3):
    c = arm_h + ax*L*s
    d = V0 - c; t = d @ ax; m = np.abs(t) < 0.006
    r = np.linalg.norm(d[m] - np.outer(t[m], ax), axis=1)
    print("forearm s=%.1f pos=%s n=%d rmax=%.4f rmean=%.4f" % (s, c.round(3), m.sum(), r.max() if m.any() else -1, r.mean() if m.any() else -1))
json.dump(res, open(os.path.join(HERE, "landmarks.json"), "w"))
print("done")

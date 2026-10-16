import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from jlib import *
clear_scene(); body = load_doll()
V0 = np.array([c.co[:] for c in body.data.vertices])
def bl(n):
    p = bone_world_gltf("mixamorig:"+n).translation; return np.array([p[0], -p[2], p[1]])
H = bl("LeftHand"); M1 = bl("LeftHandMiddle1"); M2 = bl("LeftHandMiddle2"); M3 = bl("LeftHandMiddle3")
print("bones", H, M1, M2, M3, bl("LeftHandRing1"), bl("LeftHandRing2"), bl("LeftHandIndex1"), bl("LeftHandPinky1"), bl("LeftHandThumb1"))
ax = (bl("LeftHandMiddle3") - H); ax /= np.linalg.norm(ax)
dors = np.array([0.74, 0, 0.67]); dors -= ax*dors.dot(ax); dors /= np.linalg.norm(dors)
lat = np.cross(ax, dors)
sel = V0[(V0[:,0] > 0.36)]
d = sel - H; t = d@ax; u = d@dors; l = d@lat
print("hand extent t", t.min(), t.max())
for tt in (0.04, 0.06, 0.08, 0.10, 0.12):
    m = np.abs(t - tt) < 0.004
    pts = np.stack([l[m], u[m]], 1)
    order = np.argsort(pts[:,0])
    print("t=%.2f n=%d lat range %.3f..%.3f dors range %.3f..%.3f" % (tt, m.sum(), pts[:,0].min(), pts[:,0].max(), pts[:,1].min(), pts[:,1].max()))
    # histogram of lateral
    h, e = np.histogram(pts[:,0], bins=np.arange(-0.05, 0.06, 0.005))
    print("   lat hist", h.tolist())
for name in ("Index1","Middle1","Ring1","Pinky1"):
    p = bl("LeftHand"+name)-H; print(name, "t %.3f lat %.3f dors %.3f" % (p@ax, p@lat, p@dors))

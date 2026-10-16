import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from jlib import *
clear_scene(); body = load_doll()
V0 = np.array([c.co[:] for c in body.data.vertices])
for side, sg in (("Left", 1), ("Right", -1)):
    for b in ("Hand", "HandRing1", "HandRing2", "HandRing3", "HandIndex1", "HandMiddle1", "ForeArm"):
        M = bone_world_gltf("mixamorig:" + side + b)
        p = M.translation; print(side + b, "blender", (p[0], -p[2], p[1]))
H = bone_world_gltf("mixamorig:Head"); print("Head rot", H.to_euler())
arm_h = np.array([0.25416, 0.01118, 0.99304]); arm_t = np.array([0.36725, 0.00802, 0.86744])
ax = arm_t-arm_h; L = np.linalg.norm(ax); ax /= L
for s in (0.5, 0.8, 0.95, 1.0, 1.1):
    c = arm_h+ax*L*s; d = V0-c; t = d@ax; r = np.linalg.norm(d-np.outer(t, ax), axis=1)
    m = (np.abs(t) < 0.004) & (r < 0.07) & (d[:,0] > -0.0)
    print("s", s, "n", m.sum(), "r max %.4f mean %.4f" % (r[m].max(), r[m].mean()), "centroid", V0[m].mean(0).round(3))
# ring finger: verts near LeftHandRing1 head..Ring2 head
M1 = bone_world_gltf("mixamorig:LeftHandRing1"); M2 = bone_world_gltf("mixamorig:LeftHandRing2")
a = np.array(b2g.__call__(Vector((0,0,0))))  # dummy

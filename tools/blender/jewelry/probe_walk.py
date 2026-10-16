import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from jlib import *
from anim_lib import *
print(clips(), {c: round(clip_duration(c),2) for c in clips()})
nodes = glb_nodes()
Wb = {n['name']: None for n in nodes}
def bindW(name): return bone_world_gltf(name, nodes)
down = Vector((0,-1,0))
for bone in ("mixamorig:RightHand","mixamorig:RightForeArm","mixamorig:Spine2","mixamorig:Hips"):
    Rb = bindW(bone).to_3x3()
    acc = Vector(); poss=[]
    for clip in ("walk_normal","idle","desfile"):
        d = clip_duration(clip)
        for k in range(24):
            W = world_at(clip, d*k/24)
            Rt = W[bone].to_3x3(); Rd = Rt @ Rb.inverted()
            acc += Rd.inverted() @ down
            if clip=="walk_normal": poss.append(W[bone].translation.copy())
    acc.normalize(); print(bone, "bind-down dir (gltf)", acc[:], "bind pos", bindW(bone).translation[:])
    if bone.endswith("Hand"): 
        P=np.array([p[:] for p in poss]); print(" walk hand pos min", P.min(0).round(3), "max", P.max(0).round(3))
# hand tilt from vertical in walk
for clip in ("walk_normal","idle"):
    d=clip_duration(clip)
    for k in (0,6,12,18):
        W=world_at(clip,d*k/24); h=W["mixamorig:RightHand"].translation; f=W["mixamorig:RightHandMiddle3"].translation
        v=(f-h).normalized(); print(clip,k,"hand axis",v[:], "hip", W["mixamorig:Hips"].translation[:])

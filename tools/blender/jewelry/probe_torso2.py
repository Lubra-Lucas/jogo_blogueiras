import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from jlib import *
from mathutils.bvhtree import BVHTree
clear_scene(); body = load_doll(); me = body.data
V0 = np.array([c.co[:] for c in me.vertices]); sk = me.shape_keys.key_blocks
polys=[tuple(p.vertices) for p in me.polygons]
def tree(name=None, v=1.0):
    V = V0 if not name else V0 + (np.array([c.co[:] for c in sk[name].data]) - V0)*v
    return BVHTree.FromPolygons([tuple(x) for x in V], polys)
for name in (None,"waistThin","weightUp","hipsWide","buttBig"):
    T=tree(name); print("==",name)
    for z in (0.84,0.88,0.92,0.96,1.0,1.04,1.08,1.12,1.16,1.2):
        o=[]
        for y in (-0.02,0.0,0.02):
            h=T.ray_cast(Vector((0.25,y,z)),Vector((-1,0,0)),0.5)[0]; o.append(None if h is None else round(h.x,3))
        fr=T.ray_cast(Vector((0,-0.6,z)),Vector((0,1,0)),1.2)[0]; bk=T.ray_cast(Vector((0,0.6,z)),Vector((0,-1,0)),1.2)[0]
        print(" z",z,"halfw@y",o,"front",None if fr is None else round(fr.y,3),"back",None if bk is None else round(bk.y,3))
# feet/ankle
nodes=glb_nodes()
for b in ("LeftFoot","LeftLeg","LeftUpLeg","LeftToeBase"):
    print(b, bone_world_gltf("mixamorig:"+b,nodes).translation[:])
T=tree()
for z in (0.06,0.08,0.10,0.12,0.15):
    # slice vertices around left leg
    sel=V0[(np.abs(V0[:,2]-z)<0.01)&(V0[:,0]>0.05)&(V0[:,0]<0.25)]
    if len(sel): print("ankle z",z,"x",sel[:,0].min().round(3),sel[:,0].max().round(3),"y",sel[:,1].min().round(3),sel[:,1].max().round(3))

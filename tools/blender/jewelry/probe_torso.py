import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from jlib import *
from mathutils.bvhtree import BVHTree
clear_scene(); body = load_doll(); me = body.data
V0 = np.array([c.co[:] for c in me.vertices]); sk = me.shape_keys.key_blocks
polys=[tuple(p.vertices) for p in me.polygons]
def tree(name=None, v=1.0):
    V = V0 if not name else V0 + (np.array([c.co[:] for c in sk[name].data]) - V0)*v
    return BVHTree.FromPolygons([tuple(x) for x in V], polys)
def sect(T, z, c=(0,0.0)):
    out={}
    for nm,o,d in (("front",Vector((0,-0.6,z)),Vector((0,1,0))),("back",Vector((0,0.6,z)),Vector((0,-1,0))),("side",Vector((0.6,c[1],z)),Vector((-1,0,0)))):
        h=T.ray_cast(o,d,1.2)[0]; out[nm]=None if h is None else round(h.y if nm!="side" else h.x,3)
    return out
for name in (None,"waistThin","weightUp","hipsWide","buttBig","bustBig"):
    T=tree(name); print("==",name)
    for z in (0.72,0.80,0.88,0.94,1.00,1.04,1.08,1.12,1.16,1.20):
        print(" z",z,sect(T,z))
T=tree()
print("== legs (ankle/calf) at x=0.09 ")
for z in (0.04,0.08,0.12,0.16,0.2,0.3,0.4):
    r=[]
    for o,d in ((Vector((0.5,0.0,z)),Vector((-1,0,0))),(Vector((-0.5,0.0,z)),Vector((1,0,0)))):
        h=T.ray_cast(o,d,1.2)[0]; r.append(None if h is None else round(h.x,3))
    # ankle ellipse around leg centre x=0.09
    fr=T.ray_cast(Vector((0.09,-0.5,z)),Vector((0,1,0)),1.0)[0]; bk=T.ray_cast(Vector((0.09,0.5,z)),Vector((0,-1,0)),1.0)[0]
    print(" z",z,"x hits",r,"front/back at x=.09",None if fr is None else round(fr.y,3),None if bk is None else round(bk.y,3))

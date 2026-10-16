import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from jlib import *
from mathutils.bvhtree import BVHTree
clear_scene(); body = load_doll()
T = BVHTree.FromPolygons([tuple(c.co) for c in body.data.vertices], [tuple(p.vertices) for p in body.data.polygons])
def hit(o, d):
    r = T.ray_cast(o, d, 1.0); return r[0]
for z in (1.36,1.40,1.44,1.48,1.52,1.56,1.58,1.60):
    out=[]
    for name,o,d in (("front",Vector((0,-0.5,z)),Vector((0,1,0))),("back",Vector((0,0.5,z)),Vector((0,-1,0))),("left",Vector((0.5,-0.012,z)),Vector((-1,0,0)))):
        h=hit(o,d); out.append("%s=%s"%(name, None if h is None else round({'front':h.y,'back':h.y,'left':h.x}[name],3)))
    print("z",z," ".join(out))
# top
h=hit(Vector((0,-0.012,2.0)),Vector((0,0,-1))); print("top",h)
# x-width vs y at 1.44
for y in (-0.1,-0.05,0.0,0.05,0.08):
    h=hit(Vector((0.5,y,1.44)),Vector((-1,0,0))); print("y",y,"halfw",None if h is None else round(h.x,3))

"""Inside-skull test by ray parity (3 axes, majority) for hair verts, neutral pose. Reports count/depth/where."""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from jlib import *
import numpy as np
from mathutils.bvhtree import BVHTree
clear_scene(); body = load_doll()
bv=[tuple(body.matrix_world@v.co) for v in body.data.vertices]; skull=BVHTree.FromPolygons(bv,[tuple(p.vertices) for p in body.data.polygons])
def inside(p):
    votes=0
    for d in (Vector((0,0,1)),Vector((1,0,0)),Vector((0,1,0))):
        n=0; o=p.copy(); 
        for _ in range(12):
            r=skull.ray_cast(o,d)
            if r[0] is None: break
            n+=1; o=r[0]+d*1e-4
        votes+= n%2
    return votes>=2
for hair in ("hair_meshy_updo","hair_chestnutWaves","hair_caramelCurls","hair_platinumUndercut"):
    pre=set(bpy.data.objects.keys())
    bpy.ops.import_scene.gltf(filepath=os.path.join(REPO,"public","assets","characters",hair+".glb"))
    new=[bpy.data.objects[n] for n in set(bpy.data.objects.keys())-pre]
    for o in new:
        if o.type!='MESH' or not o.data.shape_keys: continue
        vs=[o.matrix_world@v.co for v in o.data.vertices]
        ins=[]
        for v in vs:
            if v[2]>1.28 and abs(v[0])<0.2 and -0.2<v[1]<0.2 and inside(v): ins.append(v)
        if ins:
            a=np.array([tuple(v) for v in ins]); 
            dep=[ (skull.find_nearest(v)[3]) for v in ins]
            print(hair,"inside",len(ins),"of",len(vs),"centroid",a.mean(0).round(3),"bbox",a.min(0).round(3),a.max(0).round(3),"maxdepth",round(max(dep),4),"p90",round(float(np.percentile(dep,90)),4))
        else: print(hair,"inside 0")
    for o in new: bpy.data.objects.remove(o)

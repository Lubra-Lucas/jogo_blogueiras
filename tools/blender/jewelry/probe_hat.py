import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from jlib import *
from mathutils.bvhtree import BVHTree
clear_scene(); body = load_doll()
skull = BVHTree.FromPolygons([tuple(c.co) for c in body.data.vertices], [tuple(p.vertices) for p in body.data.polygons])
HC = Vector((0, -0.012, 1.44))
def hd(az, el):
    az=math.radians(az); el=math.radians(el)
    return Vector((math.sin(az)*math.cos(el), -math.cos(az)*math.cos(el), math.sin(el)))
def radial(t, d):
    far = HC + d*0.8; r = t.ray_cast(far, -d, 0.8)
    return (far - r[0]).length if r[0] is not None else None
print("skull", {(az,el): round(0.8-radial(skull,hd(az,el)),3) for az in (0,90,180) for el in (0,30,60,90)})
for hair in ("hair_chestnutWaves", "hair_caramelCurls", "hair_platinumUndercut", "hair_meshy_updo"):
    pre = set(bpy.data.objects.keys())
    bpy.ops.import_scene.gltf(filepath=os.path.join(REPO, "public", "assets", "characters", hair + ".glb"))
    new = [bpy.data.objects[n] for n in set(bpy.data.objects.keys()) - pre]
    dg = bpy.context.evaluated_depsgraph_get(); vs=[]; ps=[]
    for o in new:
        if o.type!='MESH': continue
        m=o.evaluated_get(dg).to_mesh(); off=len(vs)
        vs+=[tuple(o.matrix_world@v.co) for v in m.vertices]; ps+=[tuple(i+off for i in p.vertices) for p in m.polygons]
    A=np.array(vs); print("==",hair,"bbox x",A[:,0].min().round(3),A[:,0].max().round(3),"y",A[:,1].min().round(3),A[:,1].max().round(3),"z",A[:,2].min().round(3),A[:,2].max().round(3))
    ht = BVHTree.FromPolygons(vs, ps)
    for el in (0,20,40,60,80,90):
        row=[]
        for az in (0,45,90,135,180):
            rs=radial(skull,hd(az,el)); rh=radial(ht,hd(az,el))
            row.append("%s:%s"%(round(0.8-rs,3) if rs else None, round(0.8-rh,3) if rh else None))
        print(" el",el,"  ".join(row), "(skullR:hairR at az 0,45,90,135,180)")
    for o in new: bpy.data.objects.remove(o)

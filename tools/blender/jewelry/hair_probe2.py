"""Penetration of each hair vs the (morphed) head for every face/body slider at full value (MORPH_MAX influence)."""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from jlib import *
from mathutils.bvhtree import BVHTree
MAXI = {"faceThin":2.2,"jawNarrow":2.5,"chinPointed":1.8,"cheekbonesHigh":1.2,"eyesBig":2,"browLift":3.8,"noseSmall":4.5,"noseNarrow":4.5,"lipsFull":1.9,"lipsWide":3.2,"shouldersNarrow":2.2,"weightUp":1.9,"bustBig":2.2}
clear_scene(); body = load_doll()
kb = body.data.shape_keys.key_blocks
hairs = {}
for hair in ("hair_meshy_updo","hair_chestnutWaves","hair_caramelCurls","hair_platinumUndercut"):
    pre = set(bpy.data.objects.keys())
    bpy.ops.import_scene.gltf(filepath=os.path.join(REPO,"public","assets","characters",hair+".glb"))
    new=[bpy.data.objects[n] for n in set(bpy.data.objects.keys())-pre]
    hairs[hair]=[o for o in new if o.type=='MESH' and o.data.shape_keys]
    for o in new:
        if o.type=='MESH' and not o.data.shape_keys: bpy.data.objects.remove(o)
def mesh_world(o):
    dg=bpy.context.evaluated_depsgraph_get(); e=o.evaluated_get(dg); m=e.to_mesh()
    vs=[o.matrix_world@v.co for v in m.vertices]; ps=[tuple(p.vertices) for p in m.polygons]; e.to_mesh_clear(); return vs,ps
def run(label, vals):
    for k in kb: 
        if k.name!='Basis': k.value=0
    for o in sum(hairs.values(),[]):
        for k in o.data.shape_keys.key_blocks:
            if k.name!='Basis': k.value=0
    for n,v in vals.items():
        if n in kb: kb[n].value=v
        for o in sum(hairs.values(),[]):
            if n in o.data.shape_keys.key_blocks: o.data.shape_keys.key_blocks[n].value=v
    bpy.context.view_layer.update()
    bv,bp=mesh_world(body); skull=BVHTree.FromPolygons([tuple(v) for v in bv],bp)
    out=[]
    for h,objs in hairs.items():
        pen=0;deep=0.0
        for o in objs:
            vs,_=mesh_world(o)
            for v in vs:
                if v[2]>1.36 or (v[2]>1.3 and abs(v[0])<0.14):
                    r=skull.find_nearest(v)
                    if r[0] is None: continue
                    s=(v-r[0]).dot(r[1])
                    if s<-0.004: pen+=1; deep=min(deep,s)
        out.append(f"{h[5:12]}:{pen}({deep:.3f})")
    print(f"{label:16s}", " ".join(out))
run("none",{})
for n,m in MAXI.items(): run(n, {n:m})
run("all face",{n:MAXI[n] for n in ("faceThin","jawNarrow","chinPointed","cheekbonesHigh")})

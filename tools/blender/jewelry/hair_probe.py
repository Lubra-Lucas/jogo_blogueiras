"""Probe hair GLBs vs the doll head: bbox, morphs, weights, penetration. blender -b --factory-startup --python hair_probe.py"""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from jlib import *
from mathutils.bvhtree import BVHTree
clear_scene(); body = load_doll()
print("BODY", body.name, [k for k in (body.data.shape_keys.key_blocks.keys() if body.data.shape_keys else [])])
bv = [tuple(body.matrix_world @ v.co) for v in body.data.vertices]
skull = BVHTree.FromPolygons(bv, [tuple(p.vertices) for p in body.data.polygons])
hv = [Vector(v) for v in bv if v[2] > 1.3]
print("HEAD verts", len(hv), "bbox", [round(min(v[i] for v in hv),3) for i in range(3)], [round(max(v[i] for v in hv),3) for i in range(3)])
for hair in (sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []) or ("hair_chestnutWaves","hair_caramelCurls","hair_platinumUndercut","hair_meshy_updo"):
    pre = set(bpy.data.objects.keys())
    bpy.ops.import_scene.gltf(filepath=os.path.join(REPO,"public","assets","characters",hair+".glb"))
    new=[bpy.data.objects[n] for n in set(bpy.data.objects.keys())-pre]
    for o in new:
        if o.type!='MESH': continue
        me=o.data; vs=[o.matrix_world@v.co for v in me.vertices]
        print(hair,o.name,"verts",len(vs),"bbox",[round(min(v[i] for v in vs),3) for i in range(3)],[round(max(v[i] for v in vs),3) for i in range(3)])
        print("  keys",list(me.shape_keys.key_blocks.keys()) if me.shape_keys else None)
        print("  vgroups",len(o.vertex_groups),[g.name.replace('mixamorig:','') for g in o.vertex_groups][:60])
        # dominant bone histogram
        from collections import Counter
        c=Counter()
        for v in me.vertices:
            if v.groups:
                g=max(v.groups,key=lambda x:x.weight); c[o.vertex_groups[g.group].name.replace('mixamorig:','')]+=1
        print("  dominant",dict(c))
        pen=0; mind=9; cnt=0
        for v in vs:
            if v[2]>1.3:
                r=skull.find_nearest(v)
                if r[0] is None: continue
                d=(v-r[0]); s=d.dot(r[1]); cnt+=1
                if s<0.0: pen+=1
                mind=min(mind,s)
        print("  head-region verts",cnt,"penetrating",pen,"min signed",round(mind,4))
    for o in new: bpy.data.objects.remove(o)

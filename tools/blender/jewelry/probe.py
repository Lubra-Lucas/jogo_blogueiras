import bpy, os, json, numpy as np
from mathutils import Vector
REPO=os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),"..","..",".."))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(REPO,"public/assets/characters/doll_base.glb"))
out={}
for o in bpy.data.objects:
    print(o.name,o.type,o.parent.name if o.parent else None, tuple(round(x,3) for x in o.matrix_world.translation))
    if o.type=='MESH':
        v=np.array([ (o.matrix_world@Vector(c.co))[:] for c in o.data.vertices])
        print(' verts',len(v),'min',v.min(0).round(3),'max',v.max(0).round(3), [k.name for k in o.data.shape_keys.key_blocks] if o.data.shape_keys else None)
    if o.type=='ARMATURE':
        for b in o.data.bones:
            if any(s in b.name for s in ('Head','Neck','Spine2','Hand','Spine1','Shoulder','ForeArm','LeftArm')) and 'Index' not in b.name and 'Thumb' not in b.name and 'Middle' not in b.name and 'Ring' not in b.name and 'Pinky' not in b.name:
                h=o.matrix_world@b.head_local; t=o.matrix_world@b.tail_local
                print('BONE',b.name,h[:],t[:])

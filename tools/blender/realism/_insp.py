import bpy,os
bpy.ops.wm.read_factory_settings(use_empty=True)
R="C:/Users/user/Documents/GitHub/jogo_blogueiras/public/assets/characters/"
bpy.ops.import_scene.gltf(filepath=R+"doll_base.glb")
for o in bpy.data.objects:
    print(o.type,o.name,tuple(round(x,3) for x in o.dimensions),tuple(round(x,3) for x in o.location),o.parent.name if o.parent else None)
    if o.type=='MESH':
        print("  mats",[m.name for m in o.data.materials],"verts",len(o.data.vertices),"vg",len(o.vertex_groups))
for a in bpy.data.armatures: print("arm",a.name,len(a.bones))
bpy.ops.import_scene.gltf(filepath=R+"hair_meshy_updo.glb")
for o in bpy.data.objects:
    if 'hair' in o.name.lower() or o.type=='MESH': print(o.type,o.name,tuple(round(x,3) for x in o.dimensions))

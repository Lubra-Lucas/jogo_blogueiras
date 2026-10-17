import bpy, sys
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=sys.argv[sys.argv.index("--")+1])
for o in bpy.data.objects:
    print("OBJ", o.name, o.type, tuple(round(x,3) for x in o.dimensions), tuple(o.scale), tuple(o.rotation_euler))
    if o.type=='MESH':
        m=o.data
        print(" verts",len(m.vertices),"polys",len(m.polygons),"uv",[u.name for u in m.uv_layers],"mats",[s.material.name if s.material else None for s in o.material_slots])
        ws=[o.matrix_world@v.co for v in m.vertices]
        print(" bbox", [round(min(w[i] for w in ws),3) for i in range(3)],[round(max(w[i] for w in ws),3) for i in range(3)])
for im in bpy.data.images: print("IMG",im.name,im.size[:])
for ma in bpy.data.materials:
    print("MAT",ma.name,[n.type for n in ma.node_tree.nodes] if ma.node_tree else None)

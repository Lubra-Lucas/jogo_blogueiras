import bpy, sys
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath=sys.argv[sys.argv.index("--")+1])
for o in bpy.data.objects:
    if o.type!='MESH': continue
    ws=[o.matrix_world@Vector(c) for c in o.bound_box]
    mn=[min(w[i] for w in ws) for i in range(3)]; mx=[max(w[i] for w in ws) for i in range(3)]
    print(o.name,"scale",tuple(o.scale),"min",[round(x,3) for x in mn],"max",[round(x,3) for x in mx], "mods",[m.name for m in o.modifiers], "parent",o.parent.name if o.parent else None)
h=bpy.data.objects['Human']
dg=bpy.context.evaluated_depsgraph_get()
ev=h.evaluated_get(dg).to_mesh()
print("eval verts",len(ev.vertices),"groups",[g.name for g in h.vertex_groups][:5])

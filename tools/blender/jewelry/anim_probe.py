import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from jlib import *
clear_scene(); body = load_doll()
arm = [o for o in bpy.data.objects if o.type=='ARMATURE'][0]
print("ARM", arm.name, [b.name for b in arm.data.bones][:6])
pre=set(bpy.data.objects.keys())
bpy.ops.import_scene.gltf(filepath=os.path.join(REPO,"public","assets","anims","doll_anims_core.glb"))
new=[bpy.data.objects[n] for n in set(bpy.data.objects.keys())-pre]
print("NEW",[(o.name,o.type) for o in new])
print("actions",[a.name for a in bpy.data.actions])

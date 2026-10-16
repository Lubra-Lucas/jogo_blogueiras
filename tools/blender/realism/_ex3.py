import bpy
R="C:/Users/user/Documents/GitHub/jogo_blogueiras/public/assets/"
bpy.ops.wm.read_factory_settings(use_empty=True)
for f in ("characters/doll_base.glb","characters/hair_meshy_updo.glb","garments/tee.glb","garments/aline.glb"):
    before=set(bpy.data.objects.keys())
    bpy.ops.import_scene.gltf(filepath=R+f)
    new=[bpy.data.objects[k] for k in bpy.data.objects.keys() if k not in before]
    print("==",f)
    for o in new:
        print(" ",o.type,o.name,tuple(round(x,3) for x in o.dimensions), o.parent.name if o.parent else None)
        if o.type=='MESH':
            for m in o.data.materials:
                nt=m.node_tree
                bs=[n for n in nt.nodes if n.type=='BSDF_PRINCIPLED'][0]
                tex=[n.image.name+str(n.image.size[:]) for n in nt.nodes if n.type=='TEX_IMAGE' and n.image]
                print("   mat",m.name,tuple(round(x,2) for x in bs.inputs[0].default_value),"rough",round(bs.inputs['Roughness'].default_value,2),tex, "attrs",list(o.data.attributes.keys())[:8])
import json
print(json.dumps(json.load(open(R+"characters/doll_face.json")))[:600])

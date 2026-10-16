import bpy, os, json, numpy as np
from mathutils import Vector
REPO=os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)),"..","..",".."))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(REPO,"public/assets/characters/doll_base.glb"))
o=bpy.data.objects['DollBody']
V=np.array([c.co[:] for c in o.data.vertices])
sk=o.data.shape_keys.key_blocks
B=np.array([c.co[:] for c in sk['bustBig'].data])
print("bust delta max",np.abs(B-V).max(0), "at z", V[np.abs(B-V).sum(1)>0.01][:,2].min(), V[np.abs(B-V).sum(1)>0.01][:,2].max())
# neck slices
for z in np.arange(1.14,1.30,0.02):
    m=(np.abs(V[:,2]-z)<0.006)&(np.abs(V[:,0])<0.12)&(V[:,1]>-0.15)
    p=V[m]
    if len(p): print("z%.2f"%z,"x[%.3f,%.3f] y[%.3f,%.3f] n%d"%(p[:,0].min(),p[:,0].max(),p[:,1].min(),p[:,1].max(),len(p)))
print("--head ears")
for z in np.arange(1.40,1.62,0.02):
    m=(np.abs(V[:,2]-z)<0.006)&(V[:,2]>1.3)&(np.abs(V[:,0])<0.2)
    p=V[m]
    if len(p): print("z%.2f"%z,"x[%.3f,%.3f] y[%.3f,%.3f]"%(p[:,0].min(),p[:,0].max(),p[:,1].min(),p[:,1].max()))
print("--wrist")
for x in np.arange(0.32,0.42,0.02):
    m=(np.abs(V[:,0]-x)<0.006)&(V[:,2]>0.75)&(V[:,2]<0.95)
    p=V[m]
    if len(p): print("x%.2f"%x,"y[%.3f,%.3f] z[%.3f,%.3f]"%(p[:,1].min(),p[:,1].max(),p[:,2].min(),p[:,2].max()))

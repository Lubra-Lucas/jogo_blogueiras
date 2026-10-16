import bpy, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from avatar_build import *
reset()
h, D = make_body()
HS = svc("humanservice").HumanService
for rel, t in (("eyes/high-poly/high-poly.mhclo","Eyes"),("eyebrows/eyebrow001/eyebrow001.mhclo","Eyebrows"),("eyelashes/eyelashes01/eyelashes01.mhclo","Eyelashes")):
    HS.add_mhclo_asset(os.path.join(D,rel), h, asset_type=t, subdiv_levels=0, material_type="MAKESKIN")
b = bake_mesh(h, "Body")
print("vgroups", [g.name for g in b.vertex_groups], "n", len(b.data.vertices))
me=b.data
def grp(name):
    gi=b.vertex_groups.get(name)
    if not gi: return []
    idx=gi.index
    return [v.index for v in me.vertices if any(g.group==idx and g.weight>.5 for g in v.groups)]
for n in ("scalp","lips","fingernails","toenails","ears"): print(n, len(grp(n)))
sc=grp("scalp"); P=[me.vertices[i].co for i in sc]
if P: print("scalp bbox", [round(min(p[i] for p in P),3) for i in range(3)],[round(max(p[i] for p in P),3) for i in range(3)])
V=[v.co for v in me.vertices]
for z in [0.1,0.4,0.6,0.8,0.9,1.0,1.05,1.1,1.2,1.3,1.35,1.4,1.45,1.5,1.55,1.6]:
    c=[p for p in V if abs(p.z-z)<0.01 and abs(p.x)<0.26]
    if c: print("z",z,"x",round(min(p.x for p in c),3),round(max(p.x for p in c),3),"y",round(min(p.y for p in c),3),round(max(p.y for p in c),3))
# arm: hand tip and shoulder
for z in (1.3,1.35,1.4):
    c=[p for p in V if abs(p.z-z)<0.01]
    print("full z",z,"x",round(min(p.x for p in c),3),round(max(p.x for p in c),3))
print("hand tip", max(V,key=lambda p:p.x))
for eo in ("Human.high-poly","Human.eyebrow001","Human.eyelashes01"): 
    o=bpy.data.objects[eo]; print(eo,len(o.data.vertices))

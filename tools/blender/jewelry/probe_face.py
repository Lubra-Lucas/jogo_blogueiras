import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from jlib import *
clear_scene(); body = load_doll(); me = body.data
V0 = np.array([c.co[:] for c in me.vertices]); sk = me.shape_keys.key_blocks
def mp(n, v=1.0): return V0 + (np.array([c.co[:] for c in sk[n].data]) - V0)*v
def front(V, x, z, w=0.011):
    m = (np.abs(V[:,0]-x)<w)&(np.abs(V[:,2]-z)<w)&(V[:,1]<0.03)
    return V[m][:,1].min() if m.any() else float('nan')
names = ['base','faceThin','eyesBig','cheekbonesHigh','noseSmall','noseNarrow','browLift','jawNarrow','chinPointed']
for n in names:
    V = V0 if n=='base' else mp(n)
    print("==", n)
    for z in (1.30,1.33,1.36,1.38,1.40,1.42,1.44,1.47,1.50):
        print("z%.2f"%z, " ".join("%7.4f"%front(V,x,z) for x in (0,0.02,0.04,0.06,0.08,0.10)))
    # head half-width at z with y in [-0.03,0.03]
    for z in (1.36,1.38,1.40):
        m=(np.abs(V[:,2]-z)<0.005)&(np.abs(V[:,1]+0.01)<0.03); print(" halfw z",z, V[m][:,0].max().round(4) if m.any() else None)

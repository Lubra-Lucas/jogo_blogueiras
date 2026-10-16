"""Build the jewelry collection -> public/assets/jewelry/*.glb + jewelry.json
blender -b --factory-startup -noaudio --python tools/blender/jewelry/build_jewelry.py -- [piece ids ...]
(no ids = all).  Every piece is modelled against the real doll geometry (BVH conform), then exported in
its own anchor frame; jewelry.json holds the anchor transform relative to the bone in the REST pose.
"""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from jlib import *
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []

clear_scene()
body = load_doll()
me = body.data
V0 = np.array([c.co[:] for c in me.vertices])
sk = me.shape_keys.key_blocks


def morph_pts(name):
    return V0 + (np.array([c.co[:] for c in sk[name].data]) - V0)


polys = [tuple(p.vertices) for p in me.polygons]
TREES = [BVHTree.FromPolygons([tuple(v) for v in V0], polys),
         BVHTree.FromPolygons([tuple(v) for v in morph_pts('bustBig')], polys)]
HEADTREE = TREES[0]


def conform(p, clear, trees=TREES, it=4):
    p = Vector(p)
    for _ in range(it):
        moved = False
        for t in trees:
            loc, n, i, d = t.find_nearest(p)
            if loc is None: continue
            if (p-loc).dot(n) < 0 or d < clear-1e-6:
                p = loc + n*clear; moved = True
        if not moved: break
    return p


def shrinkwrap(p_out, target, clear, trees=TREES):
    """ray from p_out toward target; hit surface (closest of trees) + normal*clear"""
    d = (Vector(target)-Vector(p_out)); L = d.length; d.normalize()
    best = None
    for t in trees:
        loc, n, i, dist = t.ray_cast(Vector(p_out), d, L*1.2)
        if loc is not None and (best is None or dist < best[2]): best = (loc, n, dist)
    if best is None: return Vector(target)
    return best[0] + best[1]*clear


def smooth_poly(pts, passes=3, closed=True, w=0.5):
    pts = [Vector(p) for p in pts]; n = len(pts)
    for _ in range(passes):
        new = []
        for i, p in enumerate(pts):
            if not closed and (i == 0 or i == n-1): new.append(p); continue
            a = pts[(i-1) % n]; b = pts[(i+1) % n]
            new.append(p*(1-w) + (a+b)*0.5*w)
        pts = new
    return pts


def frame(origin, normal, up=Vector((0, 0, 1))):
    """local axes: -Y -> outward normal (front), +Z -> up. Returns 4x4"""
    n = Vector(normal).normalized(); u = (up - n*up.dot(n)).normalized(); r = u.cross(n)
    R = Matrix(((r.x, -n.x, u.x), (r.y, -n.y, u.y), (r.z, -n.z, u.z)))
    return Matrix.Translation(origin) @ R.to_4x4()


def puffy(bm, pts, depth, M, inner=0.6):
    """inflated flat shape: outline pts (x,z) in local XZ, thickness along local Y (front = -Y)"""
    cx = sum(p[0] for p in pts)/len(pts); cz = sum(p[1] for p in pts)/len(pts)
    P = lambda x, z, y: bm.verts.new(M @ Vector((x, y, z)))
    mid = [P(x, z, 0) for x, z in pts]
    fr = [P(cx+(x-cx)*inner, cz+(z-cz)*inner, -depth*0.45) for x, z in pts]
    bk = [P(cx+(x-cx)*inner, cz+(z-cz)*inner, depth*0.45) for x, z in pts]
    cf = P(cx, cz, -depth/2); cb = P(cx, cz, depth/2)
    n = len(pts)
    for i in range(n):
        j = (i+1) % n
        bm.faces.new((mid[j], mid[i], fr[i], fr[j]))
        bm.faces.new((mid[i], mid[j], bk[j], bk[i]))
        bm.faces.new((fr[i], fr[j], cf))
        bm.faces.new((bk[j], bk[i], cb))


def heart_outline(s, n=20): return heart_pts(n, s)
def star_outline(R, r, k=5):
    return [((R if i % 2 == 0 else r)*math.cos(math.pi/2+math.pi*i/k), (R if i % 2 == 0 else r)*math.sin(math.pi/2+math.pi*i/k)) for i in range(2*k)]


def torus_bm(bm, c, R, r, M=None, seg=28, rseg=6):
    """ring in local XY plane, axis Z, transformed by M (4x4) about c"""
    MM = Matrix.Translation(Vector(c)) @ (M if M is not None else Matrix.Identity(4))
    pts = [MM @ Vector((R*math.cos(2*math.pi*i/seg), R*math.sin(2*math.pi*i/seg), 0)) for i in range(seg)]
    tube_closed(bm, pts, r, rseg)


def teardrop(bm, c, r, h, sides=6):
    gem_cut(bm, c, r, h, sides, up=Vector((0, 0, 1)))


def bail(bm, c, r=0.0022, tube=0.0007, M=None):
    torus_bm(bm, c, r, tube, M if M is not None else Matrix.Rotation(math.pi/2, 4, 'X'), seg=10, rseg=4)


def ring_band(bm, c, axis_rot, R, w, thick, seg=32):
    """flat-ish band (rectangular section) around local Z"""
    pts = []
    for i in range(seg):
        a = 2*math.pi*i/seg
        pts.append(Vector((R*math.cos(a), R*math.sin(a), 0)))
    rings = []
    for i in range(seg):
        a = 2*math.pi*i/seg; rad = Vector((math.cos(a), math.sin(a), 0)); z = Vector((0, 0, 1))
        ring = []
        for (ro, zo) in ((-thick/2, -w/2), (thick/2, -w/2), (thick/2, w/2), (-thick/2, w/2)):
            ring.append(bm.verts.new(Vector(c) + pts[i] + rad*ro + z*zo))
        rings.append(ring)
    for i in range(seg):
        for k in range(4):
            bm.faces.new((rings[i][k], rings[i][(k+1) % 4], rings[(i+1) % seg][(k+1) % 4], rings[(i+1) % seg][k]))


# ---------------------------------------------------------------- landmarks
NECK_C = Vector((0, 0.008, 1.262))      # neck centre at choker height
EAR_Z, EAR_X, EAR_Y = 1.375, 0.1015, -0.005   # earlobe point on the head side (head has no modelled ears)
HEAD_C = Vector((0, -0.012, 1.44))

PIECES = {}


def piece(id, label, slot, anchor, bone, notes="", tags=(), formality=0.5, rarity="comum", metal="gold",
          defaults=None, mlabels=None, mount=None, finger=None, extra=None, finish=None, canon=False):
    """tags: styles (romantico/y2k/gala/casual/goth/praia/rococo/esportivo); formality 0..1; rarity comum/raro/épico/lendário;
    defaults: per-slot default colours; mlabels: per-slot label overrides; mount: Blender-space dir used by hair_fit.py"""
    def deco(fn):
        PIECES[id] = dict(id=id, label=label, slot=slot, anchor=Vector(anchor), bone=bone, notes=notes, fn=fn, tags=list(tags),
                          formality=formality, rarity=rarity, metal=metal, defaults=defaults or {}, mlabels=mlabels or {},
                          mount=mount, finger=finger, extra=extra or {}, finish=finish or {}, canon=canon)
        return fn
    return deco


# ============================================================= 1 pearl choker
@piece("pearl_choker", "Gargantilha de perolas com coracao", "neck", NECK_C, "mixamorig:Neck",
       "pendant heart sits just below the pearls, clear of the throat (neck front y=-0.0195)")
def pearl_choker():
    P = Piece("pearl_choker")
    N = 28; rp = 0.0043
    for i in range(N):
        a = 2*math.pi*i/N
        p = NECK_C + Vector((0.0385*math.sin(a), -0.0340*math.cos(a), 0))
        p = conform(p, rp+0.0008, [TREES[0]])
        sphere(P['pearl'], p, rp, 8, 5)
    # thread (metal) hidden inside pearls
    thread = [conform(NECK_C + Vector((0.0385*math.sin(a), -0.0340*math.cos(a), 0)), rp+0.0008, [TREES[0]]) for a in [2*math.pi*i/56 for i in range(56)]]
    tube_closed(P['metal'], thread, 0.0010, 4)
    # heart pendant
    fy = -0.0352+NECK_C.y-0.0016
    c = Vector((0, fy-0.0006, NECK_C.z-0.0155))
    M = Matrix.Translation(c)
    puffy(P['metal'], heart_outline(0.0092), 0.0045, M, 0.55)
    puffy(P['gem'], heart_outline(0.0062), 0.0058, Matrix.Translation(c + Vector((0, -0.0004, 0.0008))), 0.5)
    bail(P['metal'], Vector((0, fy-0.0006, NECK_C.z-0.0055)), 0.0024, 0.0008)
    # little pearl accent above the heart + gem spacer
    gem_cut(P['gem'], Vector((0, fy-0.0014, NECK_C.z-0.0016)), 0.0032, 0.004, 6, up=Vector((0, -1, 0)))
    return P, [("mixamorig:Neck", NECK_C, Matrix.Identity(3))]


# ============================================================ 3 ribbon choker
@piece("ribbon_choker", "Gargantilha de fita com laco", "neck", NECK_C, "mixamorig:Neck",
       "satin band + bow; band centre-line is 1.4 mm off the skin")
def ribbon_choker():
    P = Piece("ribbon_choker")
    z0 = NECK_C.z - 0.001; w = 0.0095; th = 0.0020
    pts = [conform(NECK_C + Vector((0.0352*math.sin(a), -0.0300*math.cos(a), 0)), th/2+0.0007, [TREES[0]]) for a in [2*math.pi*i/48 for i in range(48)]]
    # band with rectangular section
    rings = []
    for i, p in enumerate(pts):
        rad = Vector((p.x, p.y-NECK_C.y, 0)).normalized()
        ring = []
        for (ro, zo) in ((-th/2, -w/2), (th/2, -w/2), (th/2, w/2), (-th/2, w/2)):
            ring.append(P['ribbon'].verts.new(p + rad*ro + Vector((0, 0, zo))))
        rings.append(ring)
    n = len(rings)
    for i in range(n):
        for k in range(4):
            P['ribbon'].faces.new((rings[i][k], rings[i][(k+1) % 4], rings[(i+1) % n][(k+1) % 4], rings[(i+1) % n][k]))
    fy = pts[0].y - th/2
    # bow at front
    c = Vector((0, fy-0.0045, NECK_C.z))
    wing = [(0.0, 0.0), (0.006, 0.0075), (0.0165, 0.0115), (0.0225, 0.0045), (0.0225, -0.0045), (0.0165, -0.0115), (0.006, -0.0075)]
    wingL = [(-x, z) for x, z in wing]
    ang = 0.12
    puffy(P['ribbon'], wing, 0.0042, Matrix.Translation(c+Vector((0.0015, 0.0, 0))) @ Matrix.Rotation(-ang, 4, 'Y'), 0.6)
    puffy(P['ribbon'], wingL, 0.0042, Matrix.Translation(c+Vector((-0.0015, 0.0, 0))) @ Matrix.Rotation(ang, 4, 'Y'), 0.6)
    # tails
    tail = [(-0.0025, 0.0), (0.0025, 0.0), (0.0055, -0.0125), (0.0, -0.0105), (-0.0055, -0.0125)]
    puffy(P['ribbon'], [(x+0.003, z-0.002) for x, z in tail], 0.0022, Matrix.Translation(c+Vector((0, 0.0012, 0))) @ Matrix.Rotation(-0.15, 4, 'Z'), 0.7)
    puffy(P['ribbon'], [(x-0.003, z-0.002) for x, z in tail], 0.0022, Matrix.Translation(c+Vector((0, 0.0012, 0))) @ Matrix.Rotation(0.15, 4, 'Z'), 0.7)
    sphere(P['ribbon'], c+Vector((0, -0.0006, 0)), 0.0042, 10, 6, (1.1, 0.8, 1.0))     # knot
    gem_cut(P['gem'], c+Vector((0, -0.0042, 0)), 0.0033, 0.004, 8, up=Vector((0, -1, 0)))
    # metal bezel ring around gem
    torus_bm(P['metal'], c+Vector((0, -0.0036, 0)), 0.0036, 0.0007, Matrix.Rotation(math.pi/2, 4, 'X'), 12, 4)
    return P, [("mixamorig:Neck", NECK_C, Matrix.Identity(3))]


# ================================================= 2 layered gold necklaces
LAYER_A = Vector((0, 0.0, 1.20))


def drape(z_front, z_back=1.236, n=72, power=4.0, clear=0.0030, yc=0.008):
    pts = []
    for i in range(n):
        th = 2*math.pi*i/n; c = math.cos(th); s = math.sin(th)
        f = ((1+c)/2)**power
        z = z_back + (z_front-z_back)*f
        out = Vector((0.26*s, yc-0.26*c, z)); tgt = Vector((0, yc, z))
        pts.append(shrinkwrap(out, tgt, clear))
    pts = smooth_poly(pts, 3)
    pts = [conform(p, clear) for p in pts]
    return pts


def front_pt(pts):
    return min(pts, key=lambda p: p.y if abs(p.x) < 0.01 else 9)


@piece("layered_gold", "Colares dourados em camadas", "neck", LAYER_A, "mixamorig:Spine2",
       "3 chains (front drop z=1.185/1.15/1.115) shrink-wrapped to the chest, clear of bustBig=1 by >=3 mm")
def layered_gold():
    P = Piece("layered_gold")
    specs = [(1.190, 0.0011, "round"), (1.152, 0.0013, "drop"), (1.118, 0.0015, "heart")]
    for k, (zf, r, kind) in enumerate(specs):
        pts = drape(zf, power=3.6+0.6*k, clear=r+0.0022+0.0004*k)
        tube_closed(P['metal'], pts, r, 5)
        # small beads on the chain
        for i in range(0, len(pts), 6):
            sphere(P['metal'], pts[i], r*1.55, 6, 4)
        fp = min(pts, key=lambda p: p.y + (0 if abs(p.x) < 0.006 else 9))
        loc, n, _, _ = TREES[0].find_nearest(fp)
        n = Vector((n.x*0.6, n.y, max(n.z, -0.2))).normalized()
        M = frame(fp + n*0.0012, n)

        # pendant (modelled in local frame hanging below origin)
        loc_bm = bmesh.new(); gem_bm = bmesh.new()
        if kind == "round":
            gem_cut(gem_bm, Vector((0, -0.0012, -0.0085)), 0.0058, 0.0068, 8, up=Vector((0, -1, 0)))
            torus_bm(loc_bm, Vector((0, -0.0008, -0.0085)), 0.0062, 0.0008, Matrix.Rotation(math.pi/2, 4, 'X'), 14, 4)
        elif kind == "drop":
            gem_cut(gem_bm, Vector((0, -0.001, -0.011)), 0.0048, 0.015, 8, up=Vector((0, 0, 1)))
            sphere(loc_bm, Vector((0, -0.001, -0.0045)), 0.0022, 8, 4)
        else:
            puffy(loc_bm, heart_outline(0.0100), 0.0042, Matrix.Translation(Vector((0, 0, -0.0115))), 0.55)
            puffy(gem_bm, heart_outline(0.0068), 0.0055, Matrix.Translation(Vector((0, -0.0004, -0.0108))), 0.5)
        for src, slot in ((loc_bm, 'metal'), (gem_bm, 'gem')):
            xf(src, M)
            tmp = bpy.data.meshes.new("t"); src.to_mesh(tmp); src.free(); P[slot].from_mesh(tmp); bpy.data.meshes.remove(tmp)
        bail(P['metal'], Vector((0, 0, 0)), 0.0022, 0.0007, M @ Matrix.Rotation(math.pi/2, 4, 'X') @ Matrix.Translation((0, 0, 0)))
    return P, [("mixamorig:Spine2", LAYER_A, Matrix.Identity(3))]


# =============================================================== EARRINGS
def ear_point(side): return Vector((side*EAR_X, EAR_Y, EAR_Z))


def both_ears(P, make):
    for side in (-1, 1):
        make(side, ear_point(side))


def ear_post(P, c, side):
    """small metal back/post tucked on the head"""
    sphere(P['metal'], c + Vector((side*0.0008, 0, 0)), 0.0030, 8, 4, (0.7, 1, 1))


@piece("pearl_studs", "Brincos de perola", "ears", (0, EAR_Y, EAR_Z), "mixamorig:Head",
       "head mesh has no modelled ears: studs sit on the head side at the lobe line, hidden by hair on most hairstyles")
def pearl_studs():
    P = Piece("pearl_studs")
    def make(side, c):
        ear_post(P, c, side)
        sphere(P['pearl'], c + Vector((side*0.0055, 0, 0)), 0.0062, 12, 8)
        sphere(P['metal'], c + Vector((side*0.0016, 0, 0)), 0.0034, 8, 4, (0.5, 1, 1))
    both_ears(P, make)
    return P, [("mixamorig:Head", Vector((0, EAR_Y, EAR_Z)), Matrix.Identity(3))]


def hoop_plane(side, tilt=0.35):
    # hoop in the sagittal (YZ) plane, flared outward by `tilt` rad
    return Matrix.Rotation(side*tilt, 4, 'Y') @ Matrix.Rotation(math.pi/2, 4, 'Y')


@piece("heart_hoops", "Argolas com coracao", "ears", (0, EAR_Y, EAR_Z), "mixamorig:Head",
       "hoops lie in the sagittal plane, flared 20 deg outward so the front view shows them")
def heart_hoops():
    P = Piece("heart_hoops")
    def make(side, c):
        ear_post(P, c, side)
        R = 0.0125
        Mh = Matrix.Rotation(side*0.35, 4, 'Z')   # flare
        ctr = c + Vector((side*0.0045, 0, -R))
        # hoop in YZ plane: ring axis along X
        MM = Mh @ Matrix.Rotation(math.pi/2, 4, 'Y')
        # rotate about the lobe point (c) so the top stays attached
        W = Matrix.Translation(c) @ Mh @ Matrix.Translation(Vector((side*0.0045, 0, -R)))
        torus_bm(P['metal'], Vector((0, 0, 0)), R, 0.0016, W @ Matrix.Rotation(math.pi/2, 4, 'Y'), 28, 6)
        hc = W @ Vector((0, 0, -R))
        # heart charm at the bottom, facing outward-forward
        Mc = W @ Matrix.Rotation(side*math.pi/2, 4, 'Z') @ Matrix.Translation((0, 0, -0.0 ))
        puffy(P['metal'], heart_outline(0.0088), 0.0032, Matrix.Translation(hc + Vector((0, 0, -0.0095))) @ Mh @ Matrix.Rotation(math.pi/2, 4, 'Z'), 0.55)
        puffy(P['gem'], heart_outline(0.0060), 0.0044, Matrix.Translation(hc + Vector((0, 0, -0.0092))) @ Mh @ Matrix.Rotation(math.pi/2, 4, 'Z'), 0.5)
    both_ears(P, make)
    return P, [("mixamorig:Head", Vector((0, EAR_Y, EAR_Z)), Matrix.Identity(3))]


@piece("big_hoops", "Argolas douradas grandes", "ears", (0, EAR_Y, EAR_Z), "mixamorig:Head",
       "R=3.2 cm hoops; bottom clears the shoulder trapezius by >2 cm (z=1.30 vs shoulder top 1.22)")
def big_hoops():
    P = Piece("big_hoops")
    def make(side, c):
        ear_post(P, c, side)
        R = 0.032
        Mh = Matrix.Rotation(side*0.30, 4, 'Z')
        W = Matrix.Translation(c) @ Mh @ Matrix.Translation(Vector((side*0.0045, 0, -R)))
        torus_bm(P['metal'], Vector((0, 0, 0)), R, 0.0030, W @ Matrix.Rotation(math.pi/2, 4, 'Y'), 40, 8)
        sphere(P['metal'], c + Vector((side*0.0045, 0, 0)), 0.0036, 8, 4)
    both_ears(P, make)
    return P, [("mixamorig:Head", Vector((0, EAR_Y, EAR_Z)), Matrix.Identity(3))]


@piece("chandelier_drops", "Brincos chandelier de cristal", "ears", (0, EAR_Y, EAR_Z), "mixamorig:Head",
       "3-tier crystal chandelier, 4.4 cm long")
def chandelier():
    P = Piece("chandelier_drops")
    def make(side, c):
        ear_post(P, c, side)
        q = c + Vector((side*0.0058, 0, 0))
        gem_cut(P['gem'], q, 0.0050, 0.006, 8, up=Vector((side, 0, 0)))         # stud gem
        torus_bm(P['metal'], q, 0.0055, 0.0007, Matrix.Rotation(math.pi/2, 4, 'Y'), 14, 4)
        base = q + Vector((side*0.001, 0, 0))
        # tier 1: metal bar + 3 gems
        tube_open(P['metal'], [base, base+Vector((0, 0, -0.008))], 0.0007, 4)
        t1 = base + Vector((0, 0, -0.009))
        tube_open(P['metal'], [t1+Vector((0, -0.0085, 0.0012)), t1+Vector((0, 0, -0.0016)), t1+Vector((0, 0.0085, 0.0012))], 0.0008, 4)
        for dy in (-0.0085, 0, 0.0085):
            gem_cut(P['gem'], t1+Vector((0, dy, -0.0042 if dy == 0 else -0.0025)), 0.0033, 0.005, 6, up=Vector((0, 0, 1)))
        # tier 2: 3 bigger drops
        t2 = t1 + Vector((0, 0, -0.012))
        tube_open(P['metal'], [t2+Vector((0, -0.0115, 0.0016)), t2+Vector((0, 0, -0.0016)), t2+Vector((0, 0.0115, 0.0016))], 0.0008, 4)
        tube_open(P['metal'], [t1+Vector((0, 0, -0.005)), t2+Vector((0, 0, 0))], 0.0006, 4)
        for dy, L in ((-0.0115, 0.016), (0, 0.021), (0.0115, 0.016)):
            gem_cut(P['gem'], t2+Vector((0, dy, -L*0.6-0.002 if dy else -L*0.6)), 0.0045, L, 6, up=Vector((0, 0, 1)))
        sphere(P['pearl'], t2+Vector((0, 0, -0.0007)), 0.0016, 6, 4)
    both_ears(P, make)
    return P, [("mixamorig:Head", Vector((0, EAR_Y, EAR_Z)), Matrix.Identity(3))]


# ================================================================== HEAD
def skull_hit(direction, origin=HEAD_C, off=0.0):
    d = Vector(direction).normalized()
    far = origin + d*0.4
    loc, n, _, _ = HEADTREE.ray_cast(far, -d, 0.4)
    return (loc + n*off, n) if loc is not None else (origin + d*0.11, d)


HAIR_OFF = 0.010   # assumed hair thickness: tiara/bow sit this far above the scalp


@piece("tiara", "Tiara de cristais", "head", HEAD_C, "mixamorig:Head",
       "band follows the scalp + 10 mm (hair thickness); see hairFit for per-hairstyle lift along mountDir")
def tiara():
    P = Piece("tiara")
    U = Vector((0, -0.62, 0.78)).normalized()   # band plane tilted towards the forehead
    X = Vector((1, 0, 0))
    N = 36
    base = []; nrm = []
    for i in range(N+1):
        a = math.radians(-74 + 148*i/N)
        d = X*math.sin(a) + U*math.cos(a)
        p, n = skull_hit(d, HEAD_C, HAIR_OFF)
        base.append(p); nrm.append(n)
    UP = Vector((0, -0.30, 1)).normalized()
    # flat band strip (metal) 7 mm wide, rectangular section
    w = 0.0075; th = 0.0022
    rings = []
    for p, n in zip(base, nrm):
        ring = []
        for (ro, zo) in ((-th/2, -w/2), (th/2, -w/2), (th/2, w/2), (-th/2, w/2)):
            ring.append(P['metal'].verts.new(p + n*ro + UP*zo))
        rings.append(ring)
    for i in range(N):
        for k in range(4):
            P['metal'].faces.new((rings[i][k], rings[i][(k+1) % 4], rings[i+1][(k+1) % 4], rings[i+1][k]))
    for ring in (rings[0], rings[-1]): P['metal'].faces.new(ring)
    # crown: scalloped arches + crystal spikes, tallest in the centre
    spikes = list(range(3, N-2, 3))
    prof = lambda t: 0.006 + 0.022*max(0.0, math.cos((t-0.5)*math.pi))**1.6
    for j, i in enumerate(spikes):
        t = i/N; h = prof(t)
        tip = base[i] + UP*(w/2 + h)
        gem_cut(P['gem'], base[i] + UP*(w/2 + h*0.5), 0.0036 + h*0.20, h*1.15, 6, up=UP)
        sphere(P['pearl'], tip + UP*(0.0022 + h*0.18), 0.0025 + h*0.05, 8, 5)
    for j in range(len(spikes)-1):
        i0, i1 = spikes[j], spikes[j+1]
        arch = []
        for k in range(7):
            u = k/6; i = i0 + (i1-i0)*u
            ia = int(math.floor(i)); ib = min(ia+1, N); f = i-ia
            pt = base[ia]*(1-f) + base[ib]*f
            hh = (prof(i0/N)*(1-u) + prof(i1/N)*u)*0.35 + 0.004*math.sin(math.pi*u)
            arch.append(pt + UP*(w/2 + hh))
        tube_open(P['metal'], arch, 0.0011, 4)
    # centre jewel in a bezel at the front
    ci = N//2
    cp = base[ci] + UP*(w/2 + 0.0185) + nrm[ci]*0.0035
    gem_cut(P['gem'], cp, 0.0115, 0.0165, 8, up=UP + nrm[ci]*0.9)
    torus_bm(P['metal'], cp - nrm[ci]*0.0008, 0.0122, 0.0016, Vector((0, 0, 1)).rotation_difference((UP + nrm[ci]*0.9).normalized()).to_matrix().to_4x4(), 16, 5)
    # pearls along the lower edge
    for i in range(1, N, 3):
        sphere(P['pearl'], base[i] - UP*(w/2+0.0015) + nrm[i]*0.0010, 0.0030, 8, 5)
    return P, [("mixamorig:Head", HEAD_C, Matrix.Identity(3))]


@piece("hair_bow", "Laco de cabelo", "head", HEAD_C, "mixamorig:Head",
       "bow sits on the right side of the crown, 10 mm above the scalp; mirror with scale.x=-1 for the left (winding is flipped automatically in three.js)")
def hair_bow():
    P = Piece("hair_bow")
    c, n = skull_hit(Vector((0.55, -0.35, 0.75)), HEAD_C, HAIR_OFF+0.0035)
    M0 = frame(c, n, up=Vector((0, 0.3, 1)))
    wing = [(0.0, 0.0), (0.005, 0.011), (0.020, 0.020), (0.034, 0.015), (0.038, 0.0), (0.034, -0.015), (0.020, -0.020), (0.005, -0.011)]
    wingL = [(-x, z) for x, z in wing]
    puffy(P['ribbon'], wing, 0.0085, M0 @ Matrix.Translation((0.001, 0, 0)) @ Matrix.Rotation(-0.10, 4, 'Z'), 0.5)
    puffy(P['ribbon'], wingL, 0.0085, M0 @ Matrix.Translation((-0.001, 0, 0)) @ Matrix.Rotation(0.10, 4, 'Z'), 0.5)
    tail = [(-0.004, 0.0), (0.004, 0.0), (0.009, -0.030), (0.0, -0.025), (-0.009, -0.030)]
    puffy(P['ribbon'], tail, 0.0035, M0 @ Matrix.Translation((0.007, 0.0008, -0.003)) @ Matrix.Rotation(0.22, 4, 'Y'), 0.7)
    puffy(P['ribbon'], tail, 0.0035, M0 @ Matrix.Translation((-0.007, 0.0008, -0.003)) @ Matrix.Rotation(-0.22, 4, 'Y'), 0.7)
    bm = bmesh.new(); sphere(bm, Vector((0, -0.002, 0)), 0.0085, 12, 8, (1.0, 0.8, 1.1)); xf(bm, M0)
    tmp = bpy.data.meshes.new("t"); bm.to_mesh(tmp); bm.free(); P['ribbon'].from_mesh(tmp); bpy.data.meshes.remove(tmp)
    g = bmesh.new(); gem_cut(g, Vector((0, -0.0105, 0)), 0.0058, 0.007, 8, up=Vector((0, -1, 0))); xf(g, M0)
    tmp = bpy.data.meshes.new("t"); g.to_mesh(tmp); g.free(); P['gem'].from_mesh(tmp); bpy.data.meshes.remove(tmp)
    m = bmesh.new(); torus_bm(m, Vector((0, -0.0095, 0)), 0.0062, 0.0011, Matrix.Rotation(math.pi/2, 4, 'X'), 14, 4)
    # clip: two bars behind the bow toward the scalp
    tube_open(m, [Vector((-0.012, 0.0085, -0.004)), Vector((0.012, 0.0085, -0.004))], 0.0012, 4)
    tube_open(m, [Vector((-0.012, 0.0085, 0.004)), Vector((0.012, 0.0085, 0.004))], 0.0012, 4)
    xf(m, M0)
    tmp = bpy.data.meshes.new("t"); m.to_mesh(tmp); m.free(); P['metal'].from_mesh(tmp); bpy.data.meshes.remove(tmp)
    return P, [("mixamorig:Head", HEAD_C, Matrix.Identity(3))]


@piece("star_pins", "Grampos de estrela", "head", HEAD_C, "mixamorig:Head",
       "3 star pins fanned on the left-front of the scalp (+10 mm hair offset)")
def star_pins():
    P = Piece("star_pins")
    spots = [(Vector((-0.50, -0.55, 0.70)), 0.0, 0.019), (Vector((-0.62, -0.40, 0.66)), 0.5, 0.015), (Vector((-0.40, -0.62, 0.62)), -0.4, 0.012)]
    for d, rot, R in spots:
        c, n = skull_hit(d, HEAD_C, HAIR_OFF+0.003)
        M0 = frame(c, n, up=Vector((0, 0, 1))) @ Matrix.Rotation(rot, 4, 'Y')
        m = bmesh.new(); g = bmesh.new()
        puffy(m, star_outline(R, R*0.46), R*0.32, Matrix.Identity(4), 0.0)
        gem_cut(g, Vector((0, -R*0.22, 0)), R*0.26, R*0.30, 6, up=Vector((0, -1, 0)))
        tube_open(m, [Vector((-R*1.1, R*0.3, 0)), Vector((R*0.5, R*0.3, 0))], 0.0010, 4)   # pin shaft behind star
        for bmx, slot in ((m, 'metal'), (g, 'gem')):
            xf(bmx, M0)
            tmp = bpy.data.meshes.new("t"); bmx.to_mesh(tmp); bmx.free(); P[slot].from_mesh(tmp); bpy.data.meshes.remove(tmp)
    return P, [("mixamorig:Head", HEAD_C, Matrix.Identity(3))]


# ================================================================ WRIST / FINGERS
ARM = {1: (Vector((0.25416, 0.01118, 0.99304)), Vector((0.36725, 0.00802, 0.86744))),
       -1: (Vector((-0.25416, 0.01118, 0.99304)), Vector((-0.36725, 0.00802, 0.86744)))}
WRIST_S = 0.88
WRIST_R = 0.0305  # inner radius


def limb_frame(side, point, axis):
    ax = axis.normalized()
    dors = Vector((side*0.74, 0, 0.67)); dors = (dors - ax*dors.dot(ax)).normalized()
    y = ax.cross(dors)
    return Matrix(((dors.x, y.x, ax.x), (dors.y, y.y, ax.y), (dors.z, y.z, ax.z)))


WRIST_CACHE = {}


def wrist_measure(s_pos):
    """centre + elliptical half-axes (dorsal, lateral) of the LEFT wrist/forearm slice, measured from the mesh."""
    if s_pos in WRIST_CACHE: return WRIST_CACHE[s_pos]
    h, t = ARM[1]; ax = (t-h).normalized()
    R = limb_frame(1, h, t-h); dors = R.col[0].to_3d(); lat = R.col[1].to_3d()
    c = h + (t-h)*s_pos
    Vn = V0[V0[:, 0] > 0.2]
    for _ in range(4):
        d = Vn - np.array(c[:]); tt = d @ np.array(ax[:])
        rad = np.linalg.norm(d - np.outer(tt, np.array(ax[:])), axis=1)
        m = (np.abs(tt) < 0.005) & (rad < 0.05)
        pts = Vn[m]
        c2 = Vector(pts.mean(0)); c = c + (c2 - (c + ax*(c2-c).dot(ax)))   # recentre in the slice plane only
    d = Vn - np.array(c[:]); tt = d @ np.array(ax[:])
    rad = np.linalg.norm(d - np.outer(tt, np.array(ax[:])), axis=1)
    m = (np.abs(tt) < 0.005) & (rad < 0.05)
    u = d[m] @ np.array(dors[:]); l = d[m] @ np.array(lat[:])
    res = (c, float(np.abs(u).max()), float(np.abs(l).max()))
    print('[wrist] s', s_pos, 'centre', c[:], 'half dorsal %.4f lateral %.4f n=%d' % (res[1], res[2], m.sum()))
    WRIST_CACHE[s_pos] = res
    return res


def wrist_attach(s_pos):
    out = []
    c, au, al = wrist_measure(s_pos)
    for side, nm in ((1, "Left"), (-1, "Right")):
        h, t = ARM[side]
        P0 = Vector((c.x*side, c.y, c.z))
        out.append(("mixamorig:%sHand" % nm, P0, limb_frame(side, P0, t-h)))
    return out


def ell(a, b, n, z=0.0, off=0.0):
    """ellipse points (x=dorsal, y=lateral) + outward unit normals"""
    pts = []; nr = []
    for i in range(n):
        th = 2*math.pi*i/n
        nn = Vector((math.cos(th)/a, math.sin(th)/b, 0)).normalized()
        pts.append(Vector((a*math.cos(th), b*math.sin(th), z)) + nn*off); nr.append(nn)
    return pts, nr


@piece("tennis_bracelet", "Pulseira tennis de cristais", "wrist", (0, 0, 0), "mixamorig:LeftHand",
       "ring axis = +Z of the piece; attachments for both wrists (hand bone rest position + forearm axis)")
def tennis():
    P = Piece("tennis_bracelet")
    c, au, al = wrist_measure(0.915)
    cl = 0.0020      # clearance to skin
    n = 22
    for z in (-0.0030, 0.0030):
        pts, nr = ell(au+cl, al+cl, 56, z, 0.0009)
        tube_closed(P['metal'], pts, 0.0009, 4)
    pts, nr = ell(au+cl, al+cl, n, 0, 0.0016)
    for p, nn in zip(pts, nr):
        gem_cut(P['gem'], p + nn*0.0012, 0.0038, 0.0040, 6, up=nn)
        sphere(P['metal'], p - nn*0.0004, 0.0030, 6, 4)
    sphere(P['metal'], Vector((-(au+cl+0.0028), 0, 0)), 0.0042, 8, 5, (0.6, 1.0, 1.4))
    return P, wrist_attach(0.915)


@piece("bangle_stack", "Pulseiras bangle empilhadas", "wrist", (0, 0, 0), "mixamorig:LeftHand",
       "5 stacked bangles; gem = small studs on the dorsal side")
def bangles():
    P = Piece("bangle_stack")
    c, au, al = wrist_measure(0.66)
    cl = 0.0034
    for k, (dz, r, fl) in enumerate(((-0.0150, 0.0024, 0), (-0.0075, 0.0030, 0), (0.0, 0.0019, 1), (0.0075, 0.0030, 0), (0.0150, 0.0024, 0))):
        pts, nr = ell(au+cl, al+cl, 40, dz)
        tube_closed(P['metal'], pts, r, 6)
        if fl:
            for i in range(0, 40, 3):
                sphere(P['pearl' if i % 6 == 0 else 'metal'], pts[i], 0.0030, 6, 4)
    for dz in (-0.0075, 0.0075):
        for da in (-0.5, 0.0, 0.5):
            th = da
            nn = Vector((math.cos(th)/(au+cl), math.sin(th)/(al+cl), 0)).normalized()
            p = Vector(((au+cl)*math.cos(th), (al+cl)*math.sin(th), dz))
            gem_cut(P['gem'], p + nn*0.0030, 0.0028, 0.003, 6, up=nn)
    return P, wrist_attach(0.66)


def hand_basis():
    def bl(n):
        p = bone_world_gltf("mixamorig:" + n).translation; return Vector((p[0], -p[2], p[1]))
    H = bl("LeftHand"); ax = (bl("LeftHandMiddle3") - H).normalized()
    dors = Vector((0.74, 0, 0.67)); dors = (dors - ax*dors.dot(ax)).normalized()
    return bl, H, ax, dors, ax.cross(dors)


def finger_info(side, name, t_slice=0.098):
    """finger centre/axis/radius measured from the MESH (bone chain sits inside the mitten webbing).
    Fingers = lateral clusters of a hand slice; ring/middle picked by rank (index=0). Computed on the left hand, mirrored for the right."""
    bl, H, ax, dors, lat = hand_basis()
    rank = {"Index": 0, "Middle": 1, "Ring": 2, "Pinky": 3}[name]
    sel = V0[V0[:, 0] > 0.36]
    d = sel - np.array(H[:]); t = d @ np.array(ax[:]); u = d @ np.array(dors[:]); l = d @ np.array(lat[:])
    m = np.abs(t - t_slice) < 0.004
    L = l[m]; U = u[m]; order = np.argsort(-L)
    clusters = []; cur = [order[0]]
    for i in order[1:]:
        if L[cur[-1]] - L[i] > 0.0035: clusters.append(cur); cur = [i]
        else: cur.append(i)
    clusters.append(cur)
    clusters = [c for c in clusters if len(c) >= 4]
    merged = [clusters[0]]
    for c in clusters[1:]:
        if abs(L[merged[-1]].mean() - L[c].mean()) < 0.014: merged[-1] = merged[-1] + c
        else: merged.append(c)
    clusters = merged
    print('[finger] slice', t_slice, 'clusters', [(len(c), round(float(L[c].mean()), 4)) for c in clusters])
    c = clusters[min(rank, len(clusters)-1)]
    lc = float(L[c].mean()); uc = float((U[c].min() + U[c].max())/2)
    width = float(L[c].max() - L[c].min()); height = float(U[c].max() - U[c].min())
    rad = min(max(0.25*(width + height), 0.0065), 0.011)
    fax = (bl("LeftHand%s3" % name) - bl("LeftHand%s1" % name)).normalized()
    mid = H + ax*t_slice + lat*lc + dors*uc
    print('[finger]', name, 'centre', mid[:], 'w', round(width, 4), 'h', round(height, 4), 'radius', round(rad, 4))
    if side == -1:
        mid = Vector((-mid.x, mid.y, mid.z)); fax = Vector((-fax.x, fax.y, fax.z))
    return mid, fax, rad


FINGER_R = {}


def ring_attach(name):
    out = []
    for side in (1, -1):
        nm = "Left" if side == 1 else "Right"
        mid, ax, rad = finger_info(side, name)
        FINGER_R[(side, name)] = rad
        dors = Vector((side*0.74, 0, 0.67)); dors = (dors - ax*dors.dot(ax)).normalized()
        y = ax.cross(dors)
        R = Matrix(((dors.x, y.x, ax.x), (dors.y, y.y, ax.y), (dors.z, y.z, ax.z)))
        out.append(("mixamorig:%sHand%s1" % (nm, name), mid, R))
    return out


@piece("heart_ring", "Anel de coracao", "finger", (0, 0, 0), "mixamorig:LeftHandRing1",
       "sized for the ring finger (inner radius = measured finger radius + 0.8 mm); ring axis = +Z, stone on +X (dorsal)")
def heart_ring():
    P = Piece("heart_ring")
    ra = ring_attach("Ring")
    rad = FINGER_R[(1, "Ring")]; Rr = rad + 0.0009
    ring_band(P['metal'], Vector((0, 0, 0)), None, Rr+0.0006, 0.0035, 0.0014, 24)
    c = Vector((Rr+0.0070, 0, 0))
    # heart stone laid on the finger back: heart plane = tangent (local YZ-ish), thickness along +X
    M = Matrix.Translation(c) @ Matrix.Rotation(-math.pi/2, 4, 'Z') @ Matrix.Rotation(0, 4, 'X')
    puffy(P['metal'], heart_outline(0.0072), 0.0030, M, 0.55)
    puffy(P['gem'], heart_outline(0.0056), 0.0046, Matrix.Translation(c + Vector((0.0004, 0, 0))) @ Matrix.Rotation(-math.pi/2, 4, 'Z'), 0.5)
    tube_open(P['metal'], [Vector((Rr+0.0006, 0, -0.0016)), Vector((Rr+0.0040, 0, -0.0012))], 0.0010, 4)
    tube_open(P['metal'], [Vector((Rr+0.0006, 0, 0.0016)), Vector((Rr+0.0040, 0, 0.0012))], 0.0010, 4)
    return P, ra


@piece("cocktail_ring", "Anel de coquetel", "finger", (0, 0, 0), "mixamorig:LeftHandMiddle1",
       "big crystal on the middle finger; ring axis = +Z, stone on +X (dorsal)")
def cocktail_ring():
    P = Piece("cocktail_ring")
    ra = ring_attach("Middle")
    rad = FINGER_R[(1, "Middle")]; Rr = rad + 0.0009
    ring_band(P['metal'], Vector((0, 0, 0)), None, Rr+0.0006, 0.0040, 0.0015, 24)
    c = Vector((Rr+0.0052, 0, 0))
    gem_cut(P['gem'], c, 0.0085, 0.0095, 8, up=Vector((1, 0, 0)))
    torus_bm(P['metal'], c - Vector((0.0006, 0, 0)), 0.0090, 0.0013, Matrix.Rotation(math.pi/2, 4, 'Y'), 16, 5)
    for k in range(8):
        a = 2*math.pi*k/8 + 0.39
        sphere(P['pearl'], c + Vector((-0.0012, 0.0118*math.cos(a), 0.0118*math.sin(a))), 0.0022, 6, 4)
    tube_open(P['metal'], [Vector((Rr+0.0006, 0, 0)), Vector((Rr+0.0035, 0, 0))], 0.0020, 5)
    return P, ra


# ============================================================ collection 2 (extra modules)
for _mod in ("pieces_helpers.py", "pieces_neck.py", "pieces_ears.py", "pieces_head.py", "pieces_hand.py",
             "acc_helpers.py", "pieces_hats.py", "pieces_glasses.py", "pieces_bags.py", "pieces_body.py"):
    _p = os.path.join(os.path.dirname(os.path.abspath(__file__)), _mod)
    if os.path.exists(_p): exec(compile(open(_p, encoding="utf-8").read(), _p, "exec"), globals())

# ================================================================== EXPORT
DEFAULT_PALETTE = {"metal": "#f2c14e", "gem": "#eaf2ff", "pearl": "#fdf3ee", "ribbon": "#1a1a1f"}
SLOT_INFO = {
    "metal": {"label": "Metal", "kind": "metal", "variants": METALS},
    "gem": {"label": "Cristal", "kind": "gem", "default": "#eaf2ff",
            "suggested": ["#eaf2ff", "#c1121f", "#2a4fb8", "#0f9d6b", "#8e5bd6", "#f2c14e", "#ff7fc0", "#2d2a30"]},
    "pearl": {"label": "Pérola", "kind": "pearl", "default": "#fdf3ee", "suggested": ["#fdf3ee", "#f1e3c8", "#e8e8f4", "#2d2a30", "#ffe4ee"]},
    "ribbon": {"label": "Fita de cetim", "kind": "satin", "default": "#1a1a1f", "suggested": ["#1a1a1f", "#f3ead7", "#14213d", "#6e1423", "#0f6b4f", "#c19a6b", "#ff5fa8"]},
}

MAT_DEFAULT = {"metal": dict(rough=0.14), "gem": dict(rough=0.03, alpha=0.0),
               "pearl": dict(rough=0.2, coat=1.0, coat_rough=0.05, sheen=1.0, sheen_rough=0.3, sheen_tint="#ffc8e6"),
               "ribbon": dict(rough=0.38, coat=0.0, coat_rough=0.1, sheen=1.0, sheen_rough=0.3, sheen_tint="#ffffff")}


def style_mats(mats, spec):
    pal = dict(DEFAULT_PALETTE); pal.update(spec['defaults']); pal["metal"] = METALS[spec['metal']]
    for sl, m in mats.items():
        b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = hexc(pal[sl])
        if sl == "gem": b.inputs["Emission Color"].default_value = hexc(pal[sl])
        f = dict(MAT_DEFAULT[sl]); f.update(spec['finish'].get(sl, {}))
        b.inputs["Roughness"].default_value = f.get("rough", 0.3)
        if sl in ("pearl", "ribbon"):
            b.inputs["Coat Weight"].default_value = f.get("coat", 0.0); b.inputs["Coat Roughness"].default_value = f.get("coat_rough", 0.1)
            b.inputs["Sheen Weight"].default_value = (1.0 if f.get("sheen", 1.0) >= 0.5 else 0.0); b.inputs["Sheen Roughness"].default_value = f.get("sheen_rough", 0.3)
            b.inputs["Sheen Tint"].default_value = hexc(f.get("sheen_tint", "#ffffff"))
        if sl == "gem":
            b.inputs["Transmission Weight"].default_value = f.get("transmission", 0.85)
            b.inputs["Emission Strength"].default_value = f.get("emission", 0.25)
        if sl == "metal": b.inputs["Metallic"].default_value = f.get("metallic", 1.0)


PLACEMENT_SLOTS = {
    "hat": {"bone": "mixamorig:Head", "max": 1, "note": "one per character; covering hats carry hairClip (squeeze hair into the ellipsoid), headbands/crowns carry hairMount (+hairFit.lift)"},
    "glasses": {"bone": "mixamorig:Head", "max": 1, "note": "sit on the face; no hair interaction; compatible with every hat"},
    "bag": {"bone": "mixamorig:RightHand | mixamorig:Spine2", "max": 1, "note": "hand bags: RightHand (bagSide R, carry hand); body bags: Spine2 (crossbody carry body, backpack carry back)"},
    "belt": {"bone": "mixamorig:Spine", "max": 1, "note": "waist ring at z~1.02, conformed to the morph envelope"},
    "scarf": {"bone": "mixamorig:Spine2", "max": 1, "note": "neck band + chest tails; hide choker/short neck pieces when worn"},
    "brooch": {"bone": "mixamorig:Spine2", "max": 1, "note": "left chest pin"},
    "ankle": {"bone": "mixamorig:LeftFoot + RightFoot", "max": 1, "note": "attachments for both ankles (mesh symmetric)"},
    "neck": {"max": 1, "note": "(existing) initial_necklace_a/l/m/s use Spine2 like the long necklaces"},
    "ears": {"max": 1, "note": "(existing) ear_climbers"}, "wrist": {"max": 2, "note": "(existing) sport_watch, friendship_bracelet"}}
report = {}
catalog = []
ids = argv or list(PIECES.keys())
jpath = os.path.join(OUT, "jewelry.json")
old = {}
if os.path.exists(jpath):
    try: old = {p["id"]: p for p in json.load(open(jpath, encoding="utf-8"))["pieces"]}
    except Exception: old = {}

mats = make_mats()
for pid in PIECES:
    if pid not in ids:
        if pid in old: catalog.append(old[pid])
        continue
    spec = PIECES[pid]
    Pc, attaches = spec['fn']()
    # localize: model coords -> anchor frame.  Anchor = first attachment's frame for limb pieces (already canonical),
    # world pieces: subtract anchor position.
    LIMB = spec['slot'] in ("wrist", "finger") or spec['canon']
    if LIMB:
        shift = Matrix.Identity(4)
    else:
        shift = Matrix.Translation(-spec['anchor'])
    for s in SLOTS: bmesh.ops.transform(Pc[s], matrix=shift, verts=Pc[s].verts)
    style_mats(mats, spec)
    ob = Pc.build(mats)
    ob.name = pid
    path = os.path.join(OUT, pid + ".glb")
    size = export_glb(ob, path)
    tris = tri_count(ob)
    placements = []
    for bone, P0, R in attaches:
        P_anchor = P0 if LIMB else spec['anchor']
        placements.append(attach_local(bone, P_anchor, R))
    entry = {
        "id": pid, "label": spec['label'], "slot": spec['slot'], "file": "jewelry/%s.glb" % pid,
        "bone": attaches[0][0], "attachments": placements, "triangles": tris, "bytes": size,
        "materials": {s: {"slot": s, "label": spec['mlabels'].get(s, SLOT_INFO[s]["label"]),
                          "default": METALS[spec['metal']] if s == "metal" else spec['defaults'].get(s, DEFAULT_PALETTE[s])} for s in Pc.slots},
        "defaultMetal": spec['metal'], "notes": spec['notes'],
        "tags": spec['tags'], "formality": spec['formality'], "rarity": spec['rarity'],
    }
    if spec['mount'] is not None: entry["hairMount"] = [round(x, 4) for x in Vector(spec['mount']).normalized()]
    if spec['finger']: entry["finger"] = spec['finger']
    if spec['extra']: entry.update(spec['extra'])
    if spec['finish']:
        for sl, f in spec['finish'].items():
            if sl in entry["materials"]: entry["materials"][sl]["finish"] = f
    catalog.append(entry)
    print("[jewelry]", pid, "tris", tris, "bytes", size, "slots", Pc.slots)
    bpy.data.objects.remove(ob)

for e in catalog:   # label/tag/default fixes for the first 14 pieces (accents, art direction palette)
    om = OLD_META.get(e["id"])
    if om:
        e["label"] = om["label"]; e["tags"] = om["tags"]; e["formality"] = om["formality"]; e["rarity"] = om["rarity"]
        for sl, col in om.get("defaults", {}).items():
            if sl in e["materials"]: e["materials"][sl]["default"] = col
        if om.get("metal"): e["defaultMetal"] = om["metal"]; e["materials"]["metal"]["default"] = METALS[om["metal"]]
order = list(PIECES.keys())
catalog.sort(key=lambda p: order.index(p["id"]) if p["id"] in order else 99)
doc = {
    "version": 1,
    "units": "meters", "axes": "glTF Y-up, +Z forward (same as doll_base.glb)",
    "pose": "attachments are in the doll REST pose (doll_base.glb bind pose): object.position/quaternion(xyzw)/scale relative to the named bone",
    "metals": METALS,
    "slots": SLOT_INFO,
    "bones": {"mixamorig:Head": "head/ears", "mixamorig:Neck": "chokers", "mixamorig:Spine2": "long necklaces", "mixamorig:*Hand": "wrists", "mixamorig:*Hand{Ring,Middle}1": "rings"},
    "placementSlots": PLACEMENT_SLOTS,
    "pieces": catalog,
}
try: doc["hairFit"] = json.load(open(jpath, encoding="utf-8"))["hairFit"]
except Exception: pass
json.dump(doc, open(jpath, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print("[jewelry] wrote", jpath)

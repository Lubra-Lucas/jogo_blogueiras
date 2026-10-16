"""Accessories round 3 - slot 'bag' (exec'd in build_jewelry.py namespace).
HAND bags (structured_handbag, clutch, mini_bag, heart_bag, straw_beach_bag, shopping_bag): RIGHT hand only (mixamorig:RightHand), canonical frame
 = Z up (hang direction opposite), X = bag width, -Y = bag front facing outward, origin = grip point on the palm.  The attachment rotation is
 baked from the walk/idle/desfile clips so the bag hangs plumb when the arm swings by the thigh (in the A-pose bind it looks tilted outward - expected).
BODY bags (crossbody_bag, mini_backpack): Spine2, geometry conformed to the torso (base + bustBig).
Material slots: ribbon = leather/fabric, pearl = trim/straps, metal = hardware, gem = clasp/emblem."""
from anim_lib import world_at, clip_duration

LEATHER = {"ribbon": dict(rough=0.32, coat=0.5, coat_rough=0.12, sheen=0.0), "pearl": dict(rough=0.4, coat=0.0, sheen=0.0)}
BAG_LAB = {"ribbon": "Couro / tecido", "pearl": "Alça / detalhe", "gem": "Fecho"}
_HANG = {}


def hang_dir(bone, weights=(("walk_normal", 0.5), ("idle", 0.3), ("desfile", 0.2))):
    """bind-pose world direction (Blender coords) the piece must hang along so it hangs plumb on average during the clips"""
    if bone in _HANG: return _HANG[bone]
    nodes = glb_nodes(); Rb = bone_world_gltf(bone, nodes).to_3x3(); acc = Vector((0, 0, 0))
    for clip, w in weights:
        d = clip_duration(clip)
        for k in range(24):
            Rt = world_at(clip, d*k/24)[bone].to_3x3(); Rd = Rt @ Rb.inverted()
            acc += (Rd.inverted() @ Vector((0, -1, 0)))*(w/24)
    g = acc.normalized(); _HANG[bone] = Vector((g.x, -g.z, g.y)); return _HANG[bone]


def right_grip():
    nodes = glb_nodes()
    def bl(n):
        p = bone_world_gltf("mixamorig:" + n, nodes).translation; return Vector((p[0], -p[2], p[1]))
    H = bl("RightHand"); ax = (bl("RightHandMiddle3") - H).normalized()
    _, _, _, dors, _ = hand_basis(); dR = Vector((-dors.x, dors.y, dors.z)); dR = (dR - ax*dR.dot(ax)).normalized()
    return H + ax*0.052 - dR*0.010


def hand_attach():
    D = hang_dir("mixamorig:RightHand"); u = -D
    o = Vector((-1, 0, 0)); o = (o - u*o.dot(u)).normalized()
    Yc = -o; Xc = Yc.cross(u).normalized(); Yc = u.cross(Xc).normalized()
    R = Matrix(((Xc.x, Yc.x, u.x), (Xc.y, Yc.y, u.y), (Xc.z, Yc.z, u.z)))
    return [("mixamorig:RightHand", right_grip(), R)]


def body_loft(P, slot, w, d, h, ztop, r=0.02, taper=0.0, belly=0.0, rows=5, bottom=0.0, n=3, cx=0.0, cy=0.0, rtop=None):
    zb = ztop - h; rings = []
    sizes = [(zb, 0.90), (zb + 0.006, 0.975)] + [(zb + h*(i/rows), 1.0) for i in range(1, rows+1)]
    for z, s in sizes:
        t = (z - zb)/h
        ww = w*(1 - taper*(1 - t))*s; dd = d*(1 + belly*math.sin(math.pi*t))*s
        rings.append(ring_rr(ww, dd, min(r, ww/2.5, dd/2.5) if rtop is None or t < 0.99 else rtop, z, cx, cy, n))
    bm = bmesh.new(); loft_body(bm, rings); commit_bm(P, slot, bm)


def arch(P, slot, p0, p1, height, r, rseg=6, apex=None, n=14, flat=0.0):
    p0 = Vector(p0); p1 = Vector(p1); top = apex if apex is not None else (p0 + p1)*0.5 + Vector((0, 0, height))
    c1 = p0 + (top - p0)*0.0 + Vector((0, 0, height*1.25)); c2 = p1 + Vector((0, 0, height*1.25))
    if apex is not None:
        pts = bez(p0, p0 + Vector((0, 0, height*1.1)), top + Vector((-(top.x - p0.x)*0.0, 0, 0)) + (p0 - top)*0.15 + Vector((0, 0, 0)), top, n//2)[:-1] + \
              bez(top, top + (p1 - top)*0.15, p1 + Vector((0, 0, height*1.1)), p1, n//2)
    else:
        pts = bez(p0, c1, c2, p1, n)
    tube_open(P[slot], pts, r, rseg)
    return pts


def tag(label, rarity="comum", **kw): return kw


def bag_piece(id, label, notes, tags, formality, rarity, defaults, mlabels=None, metal="gold", finish=None, canon=True, bone="mixamorig:RightHand", anchor=(0, 0, 0), extra=None):
    ex = {"bagSide": "R", "carry": "hand" if canon else "body"}
    if extra: ex.update(extra)
    return piece(id, label, "bag", anchor, bone, notes, tags=tags, formality=formality, rarity=rarity, defaults=defaults, mlabels=mlabels or BAG_LAB, metal=metal,
                 finish=finish or LEATHER, canon=canon, extra=ex)


# ============================================================ 1 structured top-handle bag
@bag_piece("structured_handbag", "Bolsa de mão estruturada", "rigid top-handle trapezoid bag (27x19x11 cm) with front flap, twist-lock and gold feet; right hand grips the handle",
           ["gala", "casual", "romantico"], 0.8, "raro", {"ribbon": "#1a1a1f", "pearl": "#1a1a1f", "gem": "#eaf2ff"})
def structured_handbag():
    P = Piece("structured_handbag"); zt = -0.082
    body_loft(P, 'ribbon', 0.270, 0.112, 0.185, zt, 0.018, 0.10, 0.0, 6)
    # flap + lock
    puffy(P['ribbon'], [(x, z + zt - 0.044) for x, z in rrect(0.236, 0.092, 0.016, 3)], 0.006, Matrix.Translation(Vector((0, -0.0585, 0))), 0.8)
    box(P['metal'], Vector((0, -0.066, zt - 0.082)), 0.030, 0.007, 0.022)
    gem_cut(P['gem'], Vector((0, -0.0715, zt - 0.082)), 0.0085, 0.008, 6, up=Vector((0, -1, 0)))
    for sx in (-1, 1):
        box(P['metal'], Vector((sx*0.062, -0.0615, zt - 0.003)), 0.014, 0.004, 0.010)
        box(P['metal'], Vector((sx*0.095, -0.0 + 0.0, zt - 0.178)), 0.014, 0.008, 0.004)
        sphere(P['metal'], Vector((sx*0.105, -0.036, zt - 0.186)), 0.0065, 6, 4)
        sphere(P['metal'], Vector((sx*0.105, 0.036, zt - 0.186)), 0.0065, 6, 4)
    # handle
    for hy in (-0.0, ):
        pts = bez(Vector((-0.062, 0, zt)), Vector((-0.070, 0, zt + 0.075)), Vector((0.070, 0, zt + 0.075)), Vector((0.062, 0, zt)), 14)
        pts = [Vector((p.x, p.y, min(p.z, 0.009))) for p in pts]
        tube_open(P['pearl'], pts, 0.0075, 6)
    return P, hand_attach()


# ============================================================ 2 party clutch with wrist chain
@bag_piece("clutch_bag", "Bolsa clutch", "metallic envelope clutch (24x13 cm) hanging from a short gold chain loop held in the hand; crystal clasp",
           ["gala", "romantico", "y2k"], 0.95, "raro", {"gem": "#c1121f", "pearl": "#fbf3e6", "ribbon": "#14213d"}, {"metal": "Metal", "gem": "Fecho", "pearl": "Pérolas", "ribbon": "Forro"},
           finish={"ribbon": dict(rough=0.4, coat=0.0, sheen=0.0), "pearl": dict(rough=0.2, coat=1.0, coat_rough=0.05, sheen=0.0)})
def clutch_bag():
    P = Piece("clutch_bag"); zt = -0.060
    body_loft(P, 'metal', 0.240, 0.032, 0.130, zt, 0.010, 0.0, 0.18, 5)
    flap = [(-0.121, 0.0), (0.121, 0.0), (0.0, -0.075)]
    puffy(P['metal'], [(x*1.0, z + zt) for x, z in flap], 0.006, Matrix.Translation(Vector((0, -0.0225, 0))), 0.7)
    gem_cut(P['gem'], Vector((0, -0.0305, zt - 0.070)), 0.0095, 0.009, 8, up=Vector((0, -1, 0)))
    torus_bm(P['metal'], Vector((0, -0.0285, zt - 0.070)), 0.0105, 0.0016, Matrix.Rotation(math.pi/2, 4, 'X'), 14, 4)
    for i in range(13):
        x = -0.110 + 0.22*i/12; sphere(P['pearl'], Vector((x, -0.0215, zt - 0.0015)), 0.0034, 6, 4)
    pts = bez(Vector((-0.115, 0, zt)), Vector((-0.09, 0, zt + 0.07)), Vector((0.09, 0, zt + 0.07)), Vector((0.115, 0, zt)), 16)
    pts = [Vector((p.x, p.y, min(p.z, 0.008))) for p in pts]
    chain_links(P['metal'], resample_n(pts, 20, False), 0.0085, 0.0055, 0.0011)
    return P, hand_attach()


# ============================================================ 3 mini bag
@bag_piece("mini_bag", "Mini bag", "tiny pastel top-handle bag (17x12 cm) with twist lock and a little bow charm",
           ["romantico", "y2k", "casual"], 0.5, "comum", {"ribbon": "#f4b6c8", "pearl": "#ffffff", "gem": "#ff5fa8"})
def mini_bag():
    P = Piece("mini_bag"); zt = -0.062
    body_loft(P, 'ribbon', 0.170, 0.072, 0.118, zt, 0.022, 0.06, 0.12, 5)
    puffy(P['ribbon'], [(x, z + zt - 0.030) for x, z in rrect(0.150, 0.058, 0.014, 3)], 0.005, Matrix.Translation(Vector((0, -0.0395, 0))), 0.8)
    box(P['metal'], Vector((0, -0.044, zt - 0.062)), 0.020, 0.005, 0.014)
    pts = bez(Vector((-0.045, 0, zt)), Vector((-0.050, 0, zt + 0.07)), Vector((0.050, 0, zt + 0.07)), Vector((0.045, 0, zt)), 12)
    tube_open(P['pearl'], [Vector((p.x, p.y, min(p.z, 0.007))) for p in pts], 0.0050, 6)
    L = Loc(); bow2(L, Matrix.Translation(Vector((0.075, -0.036, zt - 0.030))), 0.020, 'pearl', True, 0.3, False); L.commit(P)
    gem_cut(P['gem'], Vector((0.075, -0.048, zt - 0.030)), 0.0045, 0.005, 6, up=Vector((0, -1, 0)))
    return P, hand_attach()


# ============================================================ 4 heart bag
@bag_piece("heart_bag", "Bolsa coração", "puffy quilted heart bag (20 cm) with a short gold chain handle",
           ["romantico", "y2k"], 0.45, "raro", {"ribbon": "#b3122b", "pearl": "#fff3f7", "gem": "#eaf2ff"})
def heart_bag():
    P = Piece("heart_bag"); zt = -0.070
    cz = zt - 0.085
    puffy(P['ribbon'], heart_outline(0.105), 0.070, Matrix.Translation(Vector((0, 0, cz + 0.02))), 0.62)
    # quilting lines
    for k in (-1, 0, 1):
        tube_open(P['pearl'], [Vector((k*0.045 + j*0.012*k*0.0, -0.0345 + abs(k)*0.0, cz + 0.02 - 0.075 + 0.150*j/6)) for j in range(7)], 0.0008, 3)
    gem_cut(P['gem'], Vector((0, -0.0375, cz + 0.045)), 0.0075, 0.007, 6, up=Vector((0, -1, 0)))
    torus_bm(P['metal'], Vector((0, -0.0355, cz + 0.045)), 0.0085, 0.0014, Matrix.Rotation(math.pi/2, 4, 'X'), 12, 4)
    pts = bez(Vector((-0.045, 0, zt + 0.003)), Vector((-0.05, 0, zt + 0.085)), Vector((0.05, 0, zt + 0.085)), Vector((0.045, 0, zt + 0.003)), 16)
    chain_links(P['metal'], resample_n([Vector((p.x, p.y, min(p.z, 0.008))) for p in pts], 16, False), 0.0095, 0.006, 0.0012)
    return P, hand_attach()


# ============================================================ 5 straw beach bag
@bag_piece("straw_beach_bag", "Bolsa de praia de palha", "woven straw tote (38x30 cm) with leather-trim top, two rope handles and a ribbon tie",
           ["praia", "casual"], 0.15, "comum", {"ribbon": "#d9b36a", "pearl": "#8a5a2b", "gem": "#ff7fc0"}, {"ribbon": "Palha", "pearl": "Couro / alça", "gem": "Laço", "metal": "Metal"},
           finish={"ribbon": dict(rough=0.9, coat=0.0, sheen=0.0), "pearl": dict(rough=0.55, coat=0.0, sheen=0.0)})
def straw_beach_bag():
    P = Piece("straw_beach_bag"); zt = -0.150
    body_loft(P, 'ribbon', 0.380, 0.150, 0.280, zt, 0.04, 0.0, 0.12, 6, rtop=0.04)
    for i in range(1, 12):
        z = zt - 0.280*i/12; t = i/12
        s = 1.0 + 0.0
        tube_closed(P['ribbon'], ring_rr(0.384*(1 + 0.0), 0.153 + 0.020*math.sin(math.pi*(1-t)), 0.04, z, 0, 0, 3), 0.0020, 4) if False else None
    for i in range(1, 11):
        z = zt - 0.280*i/11
        dd = 0.150*(1 + 0.12*math.sin(math.pi*(1 - i/11)))
        tube_closed(P['ribbon'], ring_rr(0.386, dd + 0.004, 0.04, z, 0, 0, 3), 0.0021, 4)
    band = bmesh.new(); loft_body(band, [ring_rr(0.392, 0.158, 0.042, zt + 0.0, 0, 0, 3), ring_rr(0.392, 0.158, 0.042, zt - 0.040, 0, 0, 3)]); 
    bm2 = bmesh.new(); loft_rings(bm2, [ring_rr(0.392, 0.158, 0.042, zt + 0.004, 0, 0, 3), ring_rr(0.392, 0.158, 0.042, zt - 0.036, 0, 0, 3)], True, False, False, False)
    bm2.free(); band.free()
    tube_closed(P['pearl'], ring_rr(0.392, 0.158, 0.042, zt + 0.004, 0, 0, 3), 0.0035, 5)
    tube_closed(P['pearl'], ring_rr(0.392, 0.158, 0.042, zt - 0.030, 0, 0, 3), 0.0035, 5)
    for hy in (-0.060, 0.060):
        pts = bez(Vector((-0.115, hy, zt)), Vector((-0.100, hy*0.3, zt + 0.145)), Vector((0.100, hy*0.3, zt + 0.145)), Vector((0.115, hy, zt)), 16)
        pts = [Vector((p.x, p.y, min(p.z, 0.012))) for p in pts]
        tube_open(P['pearl'], pts, 0.0070, 6)
    L = Loc(); bow2(L, Matrix.Translation(Vector((0.13, -0.085, zt - 0.010))), 0.032, 'gem', True, 0.3, False); L.commit(P)
    return P, hand_attach()


# ============================================================ 6 shopping bag
@bag_piece("shopping_bag", "Sacola de compras", "glossy paper shopping bag (26x33x11 cm) with gold rope handles, heart emblem and a tuft of tissue paper",
           ["casual", "romantico", "y2k"], 0.2, "comum", {"ribbon": "#d9c3a0", "pearl": "#ffffff", "gem": "#c1121f"}, {"ribbon": "Papel", "pearl": "Papel de seda", "gem": "Emblema", "metal": "Corda"},
           finish={"ribbon": dict(rough=0.25, coat=0.6, coat_rough=0.1, sheen=0.0), "pearl": dict(rough=0.8, coat=0.0, sheen=0.0)})
def shopping_bag():
    P = Piece("shopping_bag"); zt = -0.075
    body_loft(P, 'ribbon', 0.260, 0.108, 0.330, zt, 0.006, 0.0, 0.0, 2, 1)
    puffy(P['gem'], heart_outline(0.040), 0.004, Matrix.Translation(Vector((0, -0.0545, zt - 0.145))), 0.5)
    for hy in (-0.034, 0.034):
        pts = bez(Vector((-0.050, hy, zt)), Vector((-0.045, hy*0.3, zt + 0.085)), Vector((0.045, hy*0.3, zt + 0.085)), Vector((0.050, hy, zt)), 14)
        tube_open(P['metal'], [Vector((p.x, p.y, min(p.z, 0.008))) for p in pts], 0.0034, 5)
        for sx in (-1, 1): sphere(P['metal'], Vector((sx*0.050, hy, zt + 0.001)), 0.0048, 6, 4)
    for k, (x, ang, hh) in enumerate(((-0.07, -0.30, 0.060), (-0.025, -0.10, 0.075), (0.02, 0.05, 0.068), (0.065, 0.28, 0.058), (0.0, 0.0, 0.050))):
        ol = [(px, pz + hh*0.5) for px, pz in leaf_outline(hh, 0.052, 8)]
        puffy(P['pearl'], ol, 0.0025, Matrix.Translation(Vector((x, -0.010 + 0.012*k*0.0 + (0.012 if k % 2 else -0.012), zt - 0.004))) @ Matrix.Rotation(ang, 4, 'Y'), 0.5)
    return P, hand_attach()


# ============================================================ torso helpers
def torso_pt(p, clear):
    loc, n, i, d = TREES[0].find_nearest(Vector(p))
    q = loc + n*clear
    return conform(q, clear)


def surf_top(x, y):
    h = TREES[0].ray_cast(Vector((x, y, 1.29)), Vector((0, 0, -1)), 0.6)
    return h[0].z if h[0] is not None else 1.25


def path_smooth(ctrl, n=40, closed=False):
    # Catmull-Rom through control points
    out = []
    m = len(ctrl)
    for i in range(m - 1):
        p0 = ctrl[max(i - 1, 0)]; p1 = ctrl[i]; p2 = ctrl[i + 1]; p3 = ctrl[min(i + 2, m - 1)]
        for k in range(n // (m - 1)):
            t = k/(n/(m - 1)); t2 = t*t; t3 = t2*t
            out.append(0.5*((2*p1) + (-p0 + p2)*t + (2*p0 - 5*p1 + 4*p2 - p3)*t2 + (-p0 + 3*p1 - 3*p2 + p3)*t3))
    out.append(ctrl[-1]); return out


def strap_on_body(P, slot, ctrl, w, th, clear=0.004):
    pts = [torso_pt(p, clear + th/2) for p in path_smooth(ctrl, 36)]
    pts = smooth_poly(pts, 3, False, 0.5)
    raw = [nrm_at(p)[0] for p in pts]
    nrm = []
    for i in range(len(pts)):
        acc = Vector((0, 0, 0))
        for j in range(max(0, i-3), min(len(pts), i+4)): acc += raw[j]
        nrm.append(acc.normalized())
    ups = []
    for i, p in enumerate(pts):
        t = (pts[min(i+1, len(pts)-1)] - pts[max(i-1, 0)]).normalized(); u = nrm[i].cross(t)
        ups.append(u.normalized() if u.length > 1e-6 else Vector((0, 0, 1)))
    for i in range(1, len(ups)):
        if ups[i].dot(ups[i-1]) < 0: ups[i] = -ups[i]
    strip(P[slot], pts, nrm, ups, w, th, False)
    return pts


# ============================================================ 7 crossbody
SP2 = Vector((0, 0.0, 1.094))


@bag_piece("crossbody_bag", "Bolsa tiracolo", "crossbody: strap over the RIGHT shoulder crossing chest and back (conformed to the torso incl. bustBig), small quilted bag on the LEFT hip; rigid on Spine2",
           ["casual", "romantico", "y2k"], 0.45, "comum", {"ribbon": "#a8743f", "pearl": "#a8743f", "gem": "#eaf2ff"}, canon=False, bone=BONE_SPINE2, anchor=SP2, extra={"carry": "body", "bagSide": "L-hip"})
def crossbody_bag():
    P = Piece("crossbody_bag")
    # bag on the left hip (azimuth 62 deg from the front toward +x), z 0.93
    ctr = Vector((0.0, -0.035, 0.0)); az = math.radians(62)
    d = Vector((math.sin(az), -math.cos(az), 0))
    hit = None
    for t in TREES:
        r = t.ray_cast(Vector((ctr.x, ctr.y, 0.915)) + d*0.5, -d, 0.8)
        if r[0] is not None and (hit is None or r[3] < hit[2]): hit = (r[0], r[1], r[3])
    S, n = hit[0], hit[1]
    n = Vector((n.x, n.y, 0)).normalized()
    up = Vector((0, 0, 1)); tang = up.cross(n).normalized()          # horizontal along the surface
    M = Matrix(((tang.x, -n.x, up.x, S.x + n.x*0.005), (tang.y, -n.y, up.y, S.y + n.y*0.005), (tang.z, -n.z, up.z, S.z + n.z*0.005), (0, 0, 0, 1)))
    # local frame: X = tang, -Y = outward normal, Z up ; back of the bag at y=0 plane
    L = Loc()
    bag = bmesh.new(); rings = []
    for z, s in ((-0.075, 0.90), (-0.069, 0.975), (-0.045, 1.0), (-0.0, 1.0), (0.045, 1.0), (0.069, 0.99), (0.075, 0.92)):
        rings.append(ring_rr(0.200*s, 0.058*s, 0.020, z, 0, -0.029, 3))
    loft_body(bag, rings); commit_bm(L, 'ribbon', bag)
    for k in (-2, -1, 0, 1, 2):          # quilting
        tube_open(L['pearl'], [Vector((k*0.036, -0.0585 + abs(k)*0.0, -0.060 + 0.120*j/8)) for j in range(9)], 0.0010, 3)
    puffy(L['ribbon'], [(x, z + 0.028) for x, z in rrect(0.186, 0.058, 0.016, 3)], 0.006, Matrix.Translation(Vector((0, -0.055, 0))), 0.8)
    box(L['metal'], Vector((0, -0.062, 0.002)), 0.034, 0.006, 0.020)
    gem_cut(L['gem'], Vector((0, -0.066, 0.002)), 0.0075, 0.007, 6, up=Vector((0, -1, 0)))
    for sx in (-1, 1): torus_bm(L['metal'], Vector((sx*0.100, -0.03, 0.072)), 0.0075, 0.0017, Matrix.Rotation(math.pi/2, 4, 'Y'), 10, 4)
    L.commit(P, M)
    topL = M @ Vector((-0.100, -0.030, 0.074)); topR = M @ Vector((0.100, -0.030, 0.074))      # strap eyelets (front / back)
    front_end, back_end = (topL, topR) if topL.y < topR.y else (topR, topL)
    # strap: front diagonal (shoulder -> hip front eyelet) + back diagonal + over the shoulder
    sx_ = -0.082; ys = -0.012
    zt_f = surf_top(sx_, -0.035) ; zt_b = surf_top(sx_, 0.035)
    ctrl_f = [Vector((sx_, 0.0, zt_f + 0.001)), Vector((-0.05, -0.075, 1.17)), Vector((0.0, -0.092, 1.075)), Vector((0.06, -0.093, 0.995)), front_end]
    ctrl_b = [Vector((sx_, 0.0, zt_f + 0.001)), Vector((-0.07, 0.055, 1.19)), Vector((-0.02, 0.058, 1.10)), Vector((0.05, 0.045, 1.0)), back_end]
    for ctrl in (ctrl_f, ctrl_b):
        pts = strap_on_body(P, 'pearl', ctrl, 0.026, 0.004, 0.0035)
    sphere(P['metal'], front_end + Vector((0, 0, 0)), 0.0045, 6, 4); sphere(P['metal'], back_end, 0.0045, 6, 4)
    return P, [(BONE_SPINE2, SP2, Matrix.Identity(3))]


# ============================================================ 8 mini backpack
@bag_piece("mini_backpack", "Mochila pequena", "mini backpack (18x22x8 cm) on the back, two shoulder straps over the shoulders and under the arms; rigid on Spine2",
           ["casual", "esportivo", "y2k"], 0.2, "comum", {"ribbon": "#566b3a", "pearl": "#3d4a2a", "gem": "#ffffff"}, {"ribbon": "Tecido", "pearl": "Alças", "gem": "Detalhe", "metal": "Zíperes"}, canon=False, bone=BONE_SPINE2, anchor=SP2,
           extra={"carry": "back"})
def mini_backpack():
    P = Piece("mini_backpack")
    yb = 0.0
    r = TREES[0].ray_cast(Vector((0, 0.5, 1.09)), Vector((0, -1, 0)), 0.8); yb = r[0].y
    r2 = TREES[0].ray_cast(Vector((0, 0.5, 1.15)), Vector((0, -1, 0)), 0.8); yb = max(yb, r2[0].y)
    y0 = yb + 0.006
    rings = []
    for z, s in ((0.985, 0.90), (0.992, 0.975), (1.03, 1.0), (1.10, 1.0), (1.17, 0.99), (1.198, 0.93)):
        rings.append(ring_rr(0.180*s, 0.080*s, 0.030, z, 0, y0 + 0.040, 3))
    bm = bmesh.new(); loft_body(bm, rings); commit_bm(P, 'ribbon', bm)
    # front pocket + zips + top loop
    pk = bmesh.new(); loft_body(pk, [ring_rr(0.130, 0.030, 0.014, 1.010, 0, y0 + 0.091, 3), ring_rr(0.140, 0.034, 0.016, 1.045, 0, y0 + 0.093, 3), ring_rr(0.130, 0.030, 0.014, 1.085, 0, y0 + 0.092, 3)]); commit_bm(P, 'pearl', pk)
    tube_open(P['metal'], [Vector((x, y0 + 0.1095, 1.085)) for x in [-0.055 + 0.11*i/8 for i in range(9)]], 0.0016, 4)
    sphere(P['metal'], Vector((0.057, y0 + 0.1095, 1.085)), 0.0042, 6, 4)
    gem_cut(P['gem'], Vector((0, y0 + 0.0905, 1.150)), 0.010, 0.006, 6, up=Vector((0, 1, 0)))
    arch(P, 'pearl', Vector((-0.020, y0 + 0.040, 1.196)), Vector((0.020, y0 + 0.040, 1.196)), 0.020, 0.0035)
    for sx in (-1, 1):
        ctrl = [Vector((sx*0.062, y0 + 0.040, 1.185)), Vector((sx*0.072, 0.045, 1.215)), Vector((sx*0.080, 0.0, 1.262)), Vector((sx*0.082, -0.060, 1.215)),
                Vector((sx*0.105, -0.075, 1.115)), Vector((sx*0.118, -0.020, 1.065)), Vector((sx*0.100, 0.060, 1.040)), Vector((sx*0.068, y0 + 0.040, 1.005))]
        strap_on_body(P, 'pearl', ctrl, 0.034, 0.007, 0.004)
        box(P['metal'], Vector((sx*0.100, 0.060, 1.040)), 0.016, 0.006, 0.010)
    return P, [(BONE_SPINE2, SP2, Matrix.Identity(3))]

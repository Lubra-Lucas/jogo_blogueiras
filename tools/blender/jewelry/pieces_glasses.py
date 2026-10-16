"""Accessories round 3 - slot 'glasses' (exec'd in build_jewelry.py namespace). Head bone, anchor = HEAD_C.
Measured doll face: eyes centred at x=+-0.0635, z~1.399 (measured on a close-up render); brow bump y=-0.129 (z1.44), nose bridge y=-0.124 (z1.40), nose tip y=-0.144 (z1.36),
cheek y=-0.108 at x=0.06.  The face morphs (faceThin, eyesBig, ...) do not move the front surface (<0.2 mm); faceThin pulls the temples in 7 mm
(arms then float 7 mm off the head, never clip).  Material slots: ribbon = acetate frame, metal = metal frame/hinges, gem = lenses, pearl = trim."""
EYE_X = 0.058; EYE_Z = 1.394
ACET = {"ribbon": dict(rough=0.22, coat=0.6, coat_rough=0.05, sheen=0.0)}
GL_LAB = {"ribbon": "Armação", "gem": "Lentes", "pearl": "Detalhe"}
GL_LAB_M = {"metal": "Metal", "gem": "Lentes", "ribbon": "Ponteira", "pearl": "Detalhe"}


def chaikin(pts, it=2):
    for _ in range(it):
        out = []
        n = len(pts)
        for i in range(n):
            a = Vector(pts[i]); b = Vector(pts[(i+1) % n])
            out += [a*0.75 + b*0.25, a*0.25 + b*0.75]
        pts = out
    return pts


def head_x(y, z):
    r = HEADTREE.ray_cast(Vector((0.4, y, z)), Vector((-1, 0, 0)), 0.6)
    return r[0].x if r[0] is not None else 0.1


def front_y(x, z):
    r = HEADTREE.ray_cast(Vector((x, -0.4, z)), Vector((0, 1, 0)), 0.6)
    return r[0].y if r[0] is not None else -0.12


def fit_Yg(pts3, clear=0.0075):
    """pts3 relative to the glasses origin (y=0 lens plane, z relative to EYE_Z) -> Yg so the frame clears the face by `clear`"""
    Yg = 9.0
    for p in pts3:
        if abs(p.x) > 0.096: continue
        Yg = min(Yg, front_y(p.x, EYE_Z + p.z) - clear - p.y)
    return Yg


def wrap_pt(x, z, cx, wrap):
    """lens-local (x,z) -> glasses frame: lens at cx rotated about vertical by wrap (outer edge goes back)"""
    return Vector((cx, 0, 0)) + Matrix.Rotation(wrap, 3, 'Z') @ Vector((x, 0, z))


def arm_path(hinge, zdrop=0.014, y_end=0.020, n=12, clear=0.0085):
    pts = []
    for i in range(n+1):
        t = i/n; y = hinge.y + (y_end - hinge.y)*t
        z = hinge.z - zdrop*max(0.0, (t - 0.78)/0.22)**1.5
        x = max(hinge.x*(1-t) + 0.105*t, head_x(y, z) + clear)
        pts.append(Vector((x, y, z)))
    return pts


def build_glasses(P, outline, cx=EYE_X, wrap=math.radians(9), frame='acetate', fw=0.0050, fd=0.0034, lens_depth=0.0016,
                  bridge_z=0.012, bridge='acetate', arm_slot='ribbon', arm_a=0.0030, arm_b=0.0016, hinge_z=0.006, extra=None, browline=False):
    """outline: lens-local closed (x, z) list (x outward from the nose, lens centre at 0,0)"""
    # nose notch: keep the lower inner part of the lens beside the nose (surface bulges to y=-0.138 at x<0.03)
    xmin = 0.0345 - cx
    pts2 = [Vector((max(x, xmin + (0.0 if z < -0.004 else -0.006)) if z < 0.004 else x, 0, z)) for x, z in outline]
    fp = []
    for sx in (1, -1):
        for p in pts2:
            q = wrap_pt(p.x, p.z, cx, wrap); fp.append(Vector((q.x*sx, q.y, q.z)))
    fp += [Vector((0, 0, bridge_z + 0.0035)), Vector((0.012, 0, bridge_z + 0.002)), Vector((-0.012, 0, bridge_z + 0.002))]
    Yg = fit_Yg(fp, 0.0085)
    T = Vector((0, Yg, EYE_Z))
    L = Loc()
    for sx in (1, -1):
        ring = [Vector((q.x*sx, q.y, q.z)) + T for q in (wrap_pt(p.x, p.z, cx, wrap) for p in pts2)]
        c3 = Vector((cx*sx, 0, 0)) + T
        Mlens = Matrix.Translation(c3) @ Matrix.Rotation(-sx*wrap, 4, 'Z')
        puffy(L['gem'], [(p.x*sx, p.z) for p in pts2] if sx == 1 else [(p.x*sx, p.z) for p in pts2][::-1], lens_depth, Mlens, 0.92)
        rad = [Vector((r.x - c3.x, 0, r.z - c3.z)).normalized() for r in ring]
        if frame == 'acetate':
            if browline:
                k0 = [i for i, p in enumerate(pts2) if p.z > -0.002]
                tube_e(L['ribbon'], [ring[i] for i in k0], [Vector((0, -1, 0))]*len(k0), [rad[i] for i in k0], fw, fd, 8, False)
                lo = [i for i, p in enumerate(pts2) if p.z <= -0.0005]
                tube_open(L['metal'], [ring[i] for i in lo], 0.0009, 4)
            else:
                tube_e(L['ribbon'], ring, [Vector((0, -1, 0))]*len(ring), rad, fw, fd, 8, True)
        else:
            tube_closed(L['metal'], ring, 0.0009 if frame == 'thin' else 0.0013, 5)
    L.commit(P)
    pin = wrap_pt(min(pts2, key=lambda p: p.x).x, 0, cx, wrap)
    b0 = Vector((-pin.x, Yg, EYE_Z + bridge_z)); b1 = Vector((pin.x, Yg, EYE_Z + bridge_z))
    mid = Vector((0, Yg, EYE_Z + bridge_z + 0.0035))
    arc = [b0*(1-t)**2 + mid*2*t*(1-t) + b1*t*t for t in [i/10 for i in range(11)]]
    if bridge == 'acetate':
        tube_e(P['ribbon'], arc, [Vector((0, -1, 0))]*len(arc), Vector((0, 0, 1)), 0.0028, fd, 6, False)
    else:
        tube_open(P['metal'], arc, 0.0011, 5)
    for sx in (1, -1):
        outer = max(pts2, key=lambda p: p.x)
        ph = wrap_pt(outer.x, hinge_z, cx, wrap); hinge = Vector((ph.x, Yg + ph.y + 0.001, EYE_Z + ph.z))
        path = [Vector((p.x*sx, p.y, p.z)) for p in arm_path(hinge)]
        dirs = [(path[min(i+1, len(path)-1)] - path[max(i-1, 0)]) for i in range(len(path))]
        nr = [Vector((d.y, -d.x, 0)).normalized()*(-1 if sx == 1 else 1) for d in dirs]
        if arm_slot == 'metal':
            tube_open(P['metal'], path, 0.0010, 4)
            tube_e(P['metal'], path[-4:], nr[-4:], Vector((0, 0, 1)), 0.0028, 0.0013, 6, False)
        else:
            tube_e(P[arm_slot], path, nr, Vector((0, 0, 1)), arm_a, arm_b, 6, False)
        sphere(P['metal'], Vector((hinge.x*sx, hinge.y, hinge.z)), 0.0021, 6, 4)
    if extra: extra(P, Yg, T)
    skull_clear(P, P.name, 1.30, 0.3)
    return Yg


def glasses_att(): return [(BONE_HEAD, HEAD_C, Matrix.Identity(3))]


def GPIECE(id, label, notes, tags, formality, rarity, defaults, mlabels=None, metal="gold", finish=None):
    return piece(id, label, "glasses", HEAD_C, BONE_HEAD, notes, tags=tags, formality=formality, rarity=rarity, defaults=defaults, mlabels=mlabels or GL_LAB,
                 metal=metal, finish=finish or ACET, extra={"faceFit": {"eyeX": 0.058, "eyeZ": 1.394, "note": "lens centres measured on the doll face; frame sits 7.5 mm off the brow/nose, no clipping at any face morph"}})


def cat_eye():
    p = [(-0.034, 0.010), (-0.033, -0.012), (-0.016, -0.026), (0.010, -0.027), (0.034, -0.012), (0.046, 0.012), (0.049, 0.026), (0.040, 0.027), (0.022, 0.020), (0.0, 0.016), (-0.022, 0.017)]
    return [(q.x, q.z) for q in chaikin([Vector((x, 0, z)) for x, z in p], 2)]


def aviator():
    out = []
    for i in range(36):
        t = 2*math.pi*i/36; s = math.sin(t); c = math.cos(t)
        w = 0.040*(1.0 + 0.18*s); h = 0.0310 if s > 0 else 0.036
        out.append((w*c + 0.002, h*s*(1.0 if s > 0 else 1.08) - 0.002))
    return out


def circle_o(r, n=32): return [(r*math.cos(2*math.pi*i/n), r*math.sin(2*math.pi*i/n)) for i in range(n)]


def heart_o(s=0.0385):
    pts = heart_pts(28, s)
    return [(x, y + 0.004) for x, y in pts][::-1]


def rect_brow():
    p = [(-0.034, 0.024), (-0.034, -0.020), (-0.028, -0.026), (0.034, -0.026), (0.042, -0.018), (0.043, 0.014), (0.036, 0.025), (0.0, 0.028)]
    return [(q.x, q.z) for q in chaikin([Vector((x, 0, z)) for x, z in p], 2)]


@GPIECE("cat_eye_sunglasses", "Óculos de sol gatinho", "acetate cat-eye frame with lifted outer corners, dark lenses, gold hinge studs",
        ["casual", "y2k", "romantico"], 0.5, "comum", {"ribbon": "#1a1a1f", "gem": "#2d2a30"})
def cat_eye_sunglasses():
    P = Piece("cat_eye_sunglasses")
    build_glasses(P, cat_eye(), cx=EYE_X + 0.003, wrap=math.radians(8), fw=0.0048, fd=0.0034, hinge_z=0.012)
    return P, glasses_att()


@GPIECE("aviator_sunglasses", "Óculos aviador", "thin gold wire aviator with double bridge bar and teardrop green-grey lenses",
        ["casual", "esportivo"], 0.4, "comum", {"gem": "#3d4a3f"}, GL_LAB_M, "gold")
def aviator_sunglasses():
    P = Piece("aviator_sunglasses")
    def extra(P, Yg, T):
        tube_open(P['metal'], [Vector((-0.013, Yg, EYE_Z + 0.0215)), Vector((0.013, Yg, EYE_Z + 0.0215))], 0.0009, 4)
    build_glasses(P, aviator(), cx=EYE_X, wrap=math.radians(8), frame='thin', bridge='metal', bridge_z=0.016, arm_slot='metal', hinge_z=0.014, extra=extra)
    return P, glasses_att()


@GPIECE("round_glasses", "Óculos redondo", "thin gold wire round frame, clear lenses, gold temples",
        ["casual", "romantico", "gala"], 0.6, "comum", {"gem": "#eaf2ff"}, GL_LAB_M, "gold")
def round_glasses():
    P = Piece("round_glasses")
    build_glasses(P, circle_o(0.0335), cx=EYE_X, wrap=math.radians(8), frame='thin', bridge='metal', bridge_z=0.008, arm_slot='metal', hinge_z=0.008)
    return P, glasses_att()


@GPIECE("heart_sunglasses", "Óculos de coração", "puffy acetate heart frames with rose lenses",
        ["romantico", "y2k"], 0.2, "raro", {"ribbon": "#ff7fb5", "gem": "#ffb3d1"})
def heart_sunglasses():
    P = Piece("heart_sunglasses")
    build_glasses(P, heart_o(0.0385), cx=EYE_X + 0.001, wrap=math.radians(8), fw=0.0050, fd=0.0036, bridge_z=0.014, hinge_z=0.012)
    return P, glasses_att()


@GPIECE("y2k_shield_glasses", "Óculos shield Y2K", "single wrap-around mirrored shield lens, rimless, metal top bar, hinge studs and tiny crystals",
        ["y2k", "esportivo"], 0.2, "raro", {"gem": "#7fb8ff", "pearl": "#eaf2ff"}, {"metal": "Metal", "gem": "Lente espelhada", "pearl": "Cristais"}, "silver")
def y2k_shield():
    P = Piece("y2k_shield_glasses")
    NX, NZ = 25, 5; k = 2.9
    xs = [-0.088 + 0.176*i/(NX-1) for i in range(NX)]
    Yg = 9.0
    for x in xs:
        for z in (-0.024, 0.0, 0.026):
            Yg = min(Yg, front_y(x, EYE_Z + z) - 0.0085 - k*x*x)
    grid = []
    for j in range(NZ):
        row = []
        for x in xs:
            zt = 0.027 - 0.003*abs(x)/0.088; zb = -0.024 + 0.014*math.exp(-(x/0.013)**2) + 0.002*abs(x)/0.088
            row.append(Vector((x, Yg + k*x*x, EYE_Z + zb + (zt - zb)*j/(NZ-1))))
        grid.append(row)
    slab(P['gem'], grid, Vector((0, 0.0022, 0)))
    tube_open(P['metal'], [Vector((x, Yg + k*x*x - 0.0006, EYE_Z + 0.0275 - 0.003*abs(x)/0.088)) for x in xs], 0.0012, 4)
    for sx in (1, -1):
        h = Vector((0.090, Yg + k*0.088**2 + 0.0015, EYE_Z + 0.020))
        sphere(P['metal'], Vector((sx*h.x, h.y, h.z)), 0.0030, 6, 4)
        path = [Vector((p.x*sx, p.y, p.z)) for p in arm_path(h, 0.016, 0.020, 12, 0.0040)]
        tube_open(P['metal'], path, 0.0012, 4)
        tube_e(P['metal'], path[-5:], [Vector((sx, 0, 0))]*5, Vector((0, 0, 1)), 0.0030, 0.0013, 6, False)
        for dz in (0.0, -0.007):
            gem_cut(P['pearl'], Vector((sx*0.078, Yg + k*0.078**2 - 0.0012, EYE_Z + 0.0195 + dz)), 0.0022, 0.0025, 6, up=Vector((0, -1, 0)))
    skull_clear(P, "y2k_shield", 1.30, 0.3)
    return P, glasses_att()


@GPIECE("elegant_optical_glasses", "Óculos de grau elegante", "browline optical frame: tortoise acetate brow bar, thin gold lower rim, clear lenses",
        ["gala", "casual", "romantico"], 0.7, "comum", {"ribbon": "#7a4a22", "gem": "#f4f8ff"}, {"metal": "Aro de metal", "gem": "Lentes", "ribbon": "Armação", "pearl": "Detalhe"}, "gold")
def elegant_optical():
    P = Piece("elegant_optical_glasses")
    build_glasses(P, rect_brow(), cx=EYE_X + 0.001, wrap=math.radians(8), fw=0.0046, fd=0.0032, bridge_z=0.016, hinge_z=0.014, browline=True)
    return P, glasses_att()

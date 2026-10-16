"""Collection 2 - earrings. One GLB on the Head bone holding both ears (right = mirror of left). Local frame per ear:
origin = lobe point, +X outward, -Y forward, -Z down."""
HEAD_BONE = "mixamorig:Head"
EAR_ANCHOR = (0, EAR_Y, EAR_Z)


def EAR_ATT(): return [(HEAD_BONE, Vector((0, EAR_Y, EAR_Z)), Matrix.Identity(3))]


def post(L, r=0.0030):
    sphere(L['metal'], Vector((0.0008, 0, 0)), r, 8, 4, (0.7, 1, 1))


def link(L, a, b, r=0.0007): tube_open(L['metal'], [Vector(a), Vector(b)], r, 4)


def ear_piece(pid, label, notes, tags, formality, rarity, build, metal="gold", defaults=None, mlabels=None, scale=1.35):
    @piece(pid, label, "ears", EAR_ANCHOR, HEAD_BONE, notes, tags=tags, formality=formality, rarity=rarity, metal=metal,
           defaults=defaults, mlabels=mlabels)
    def fn():
        P = Piece(pid)
        ears_pair(P, lambda L: (post(L), build(L)), scale)
        return P, EAR_ATT()
    return fn


def hoop(L, R, tube, flare=0.35, seg=24, rseg=6):
    Mh = Matrix.Rotation(flare, 4, 'Z')
    W = Mh @ Matrix.Translation(Vector((0.0045, 0, -R)))
    torus_bm(L['metal'], Vector((0, 0, 0)), R, tube, W @ Matrix.Rotation(math.pi/2, 4, 'Y'), seg, rseg)
    return W @ Vector((0, 0, -R)), Mh


# ------------------------------------------------------------------ 1 small hoops
def _small_hoops(L):
    hc, Mh = hoop(L, 0.0095, 0.0012, 0.30, 22, 5)
    sphere(L['pearl'], hc + Vector((0, 0, 0.0004)), 0.0030, 8, 5)
    for a in (-0.7, 0.7):
        q = Matrix.Rotation(a, 4, 'Y') @ Vector((0, 0, 0))
ear_piece("small_hoops", "Brincos de argola pequena", "huggie hoops with a pearl bead", ["casual", "esportivo", "y2k"], 0.2, "comum", _small_hoops)


# ------------------------------------------------------------------ 2 ear cuff (sits on the head side, chain to the lobe)
@piece("crystal_ear_cuff", "Ear cuff de cristais", "ears", EAR_ANCHOR, HEAD_BONE,
       "C-shaped cuff shrink-wrapped to the head side above the lobe + crystal chain to a lobe stud",
       tags=["gala", "y2k", "goth"], formality=0.6, rarity="raro", metal="silver", defaults={"gem": "#eaf2ff"})
def ear_cuff():
    P = Piece("crystal_ear_cuff"); O = ear_point(1)

    def one(L):
        post(L, 0.0028); sphere(L['gem'], Vector((0.0045, 0, 0)), 0.0034, 8, 5)
        zc = 1.408; yc = -0.004; R = 0.0165; pts = []; nn = []
        for i in range(13):
            a = math.radians(40 + 270*i/12)
            out = Vector((0.25, yc + R*math.cos(a), zc + R*math.sin(a))); tgt = Vector((0.0, out.y, out.z))
            p = shrinkwrap(out, tgt, 0.0030, [HEADTREE])
            pts.append(p - O)
        tube_open(L['metal'], pts, 0.0014, 5)
        for i in range(1, 12):
            n = Vector((1, 0, 0)); gem_cut(L['gem'], pts[i] + n*0.0016, 0.0030 if i % 2 else 0.0022, 0.0030, 6, up=n)
        # chain from the cuff bottom to the stud
        a, b = pts[0], Vector((0.0045, 0, 0.0))
        for k in range(5):
            t = k/4; sphere(L['metal'], a*(1-t) + b*t + Vector((0.002*math.sin(math.pi*t), 0, 0)), 0.0010, 5, 3)
        puffy(L['metal'], star_outline(0.0042, 0.0019), 0.0016, Matrix.Translation(Vector((0.0062, 0, -0.0125))) @ Matrix.Rotation(math.pi/2, 4, 'Z'), 0.5)
    ears_pair(P, one)
    return P, EAR_ATT()


# ------------------------------------------------------------------ 3 cherries
def _cherry(L):
    link(L, (0.004, 0, -0.001), (0.0055, 0, -0.011))
    J = Vector((0.0055, 0, -0.011))
    for cx in (0.0020, 0.0160):
        cp = Vector((cx, 0, -0.0275))
        tube_open(L['metal'], [J, Vector(((J.x+cx)/2 + (0.001 if cx > J.x else -0.001), 0, -0.018)), cp + Vector((0, 0, 0.0065))], 0.0006, 4)
        sphere(L['gem'], cp, 0.0072, 10, 6, (1, 1, 0.96))
        sphere(L['pearl'], cp + Vector((cx*0 + 0.0022, -0.0050, 0.0030)), 0.0013, 5, 3)   # specular dot
    puffy(L['ribbon'], leaf_outline(0.0105, 0.0050), 0.0014, Matrix.Translation(J + Vector((0.0045, 0, -0.0030))) @ Matrix.Rotation(-1.0, 4, 'Y'), 0.5)
ear_piece("cherry_earrings", "Brincos de cereja", "pair of cherries on stems with a leaf", ["romantico", "casual", "praia"], 0.15, "comum", _cherry,
          defaults={"gem": "#b3122b", "ribbon": "#4f7f45", "pearl": "#fff5ee"}, mlabels={"gem": "Cerejas", "ribbon": "Folha", "pearl": "Brilho"})


# ------------------------------------------------------------------ 4 butterfly
def _bfly(L):
    link(L, (0.004, 0, -0.001), (0.011, 0, -0.0075))
    butterfly(L, Matrix.Translation(Vector((0.0115, 0, -0.0150))), 0.0098, 'gem')
ear_piece("butterfly_earrings", "Brincos de borboleta", "gem-winged butterflies on a short link", ["y2k", "romantico", "praia"], 0.3, "comum", _bfly,
          defaults={"gem": "#8e5bd6"}, mlabels={"gem": "Asas"})


# ------------------------------------------------------------------ 5 bows
def _bow(L):
    link(L, (0.004, 0, -0.001), (0.011, 0, -0.0070))
    bow2(L, Matrix.Translation(Vector((0.0115, 0, -0.0145))), 0.0098, 'ribbon', True, 0.30, False)
    sphere(L['pearl'], Vector((0.0115, -0.0040, -0.0145)), 0.0022, 6, 4)
ear_piece("bow_earrings", "Brincos de laço", "satin bows with a pearl knot", ["romantico", "casual", "rococo"], 0.45, "comum", _bow,
          defaults={"ribbon": "#6e1423"})


# ------------------------------------------------------------------ 6 pearl drops
def _pdrop(L):
    sphere(L['pearl'], Vector((0.0050, 0, 0)), 0.0046, 8, 5)
    link(L, (0.0050, 0, -0.002), (0.0055, 0, -0.0105), 0.0008)
    cone(L['metal'], Vector((0.0055, 0, -0.0120)), Vector((0.0055, 0, -0.0098)), 0.0022, 6)
    sphere(L['pearl'], Vector((0.0055, 0, -0.0235)), 0.0075, 10, 7, (1, 1, 1.30))
ear_piece("pearl_drop_earrings", "Brincos de gota de pérola", "pearl stud + teardrop pearl", ["gala", "romantico", "rococo"], 0.85, "comum", _pdrop)


# ------------------------------------------------------------------ 7 dangling stars
def _stars(L):
    link(L, (0.004, 0, -0.001), (0.008, 0, -0.0080))
    puffy(L['metal'], star_outline(0.0072, 0.0033), 0.0024, Matrix.Translation(Vector((0.0080, 0, -0.0145))), 0.4)
    gem_cut(L['gem'], Vector((0.0080, -0.0020, -0.0146)), 0.0021, 0.0024, 6, up=Vector((0, -1, 0)))
    link(L, (0.0080, 0, -0.0200), (0.0145, 0, -0.0275), 0.0006)
    puffy(L['metal'], star_outline(0.0052, 0.0024), 0.0020, Matrix.Translation(Vector((0.0145, 0, -0.0320))), 0.4)
    gem_cut(L['gem'], Vector((0.0145, -0.0016, -0.0321)), 0.0015, 0.0018, 6, up=Vector((0, -1, 0)))
ear_piece("star_drop_earrings", "Brincos de estrela pendente", "two stars dangling at different heights", ["y2k", "casual", "romantico"], 0.35, "comum", _stars,
          defaults={"gem": "#eaf2ff"})


# ------------------------------------------------------------------ 8 gold fringe
def _fringe(L):
    link(L, (0.004, 0, -0.001), (0.004, 0, -0.0050), 0.0009)
    bar = [Vector((0.0015 + 0.0245*k/6, 0, -0.0070 - 0.0007*math.sin(math.pi*k/6)*(-1))) for k in range(7)]
    tube_open(L['metal'], bar, 0.0017, 5)
    for k in range(9):
        t = k/8; x = 0.0020 + 0.0225*t
        Ls = 0.034 + 0.020*math.sin(math.pi*t)
        tip = Vector((x + (t-0.5)*0.003, 0, -0.0075 - Ls))
        tube_open(L['metal'], [Vector((x, 0, -0.0075)), tip], 0.0006, 3)
        sphere(L['metal'], tip, 0.0013, 5, 3)
    for sx in (0.0015, 0.0260): sphere(L['gem'], Vector((sx, 0, -0.0070)), 0.0022, 6, 4)
ear_piece("fringe_earrings", "Brincos de franja dourada", "9-strand gold fringe with gem end-caps", ["gala", "praia", "y2k"], 0.6, "raro", _fringe,
          defaults={"gem": "#eaf2ff"})


# ------------------------------------------------------------------ 9 crystal hearts
def _cheart(L):
    sphere(L['gem'], Vector((0.0045, 0, 0)), 0.0030, 6, 4)
    link(L, (0.0045, 0, -0.002), (0.0090, 0, -0.0075))
    c = Vector((0.0095, 0, -0.0200))
    puffy(L['metal'], heart_outline(0.0125), 0.0034, Matrix.Translation(c), 0.55)
    puffy(L['gem'], heart_outline(0.0092), 0.0046, Matrix.Translation(c + Vector((0, -0.0004, 0.0003))), 0.5)
    bail(L['metal'], Vector((0.0095, 0, -0.0085)), 0.0017, 0.0006)
ear_piece("crystal_heart_earrings", "Brincos de coração de cristal", "gem-inlaid hearts", ["romantico", "gala", "y2k"], 0.6, "raro", _cheart,
          defaults={"gem": "#c1121f"}, metal="silver")


# ------------------------------------------------------------------ 10 flowers
def _flower(L):
    R = 0.0105
    flower(L, Matrix.Translation(Vector((0.0090, 0, 0))) @ Matrix.Rotation(math.pi/2, 4, 'Z'), R, 7, 0.0040, 0.30, 'pearl', 'gem', 3, 0.5)
    link(L, (0.0070, 0, -0.0050), (0.0080, 0, -0.0130), 0.0007)
    flower(L, Matrix.Translation(Vector((0.0085, 0, -0.0185))), 0.0058, 6, 0.0022, 0.32, 'pearl', 'gem', 3, 0.5)
    add_to(L, 'ribbon', lambda bm: puffy(bm, leaf_outline(0.0095, 0.0042), 0.0012, Matrix.Identity(4), 0.5),
           Matrix.Translation(Vector((0.0160, 0, -0.0180))) @ Matrix.Rotation(-0.9, 4, 'Y'))
ear_piece("flower_earrings", "Brincos de flor", "side-facing blossom stud + small dangling flower and leaf", ["romantico", "praia", "casual"], 0.3, "comum", _flower,
          defaults={"pearl": "#fbf6ea", "gem": "#f2b830", "ribbon": "#4f7f45"}, mlabels={"pearl": "Pétalas", "gem": "Miolo", "ribbon": "Folha"})


# ------------------------------------------------------------------ extra: moon + star
def _moon(L):
    link(L, (0.004, 0, -0.001), (0.008, 0, -0.0070))
    arc = []; rad = []
    for i in range(13):
        a = math.radians(-70 + 290*i/12)
        arc.append(Vector((0.0085 + 0.0090*math.sin(a), 0, -0.0170 - 0.0090*math.cos(a)))); rad.append(0.0006 + 0.0030*math.sin(math.pi*i/12))
    tube_open(L['metal'], arc, 0.002, 8, rad)
    puffy(L['metal'], star_outline(0.0040, 0.0018), 0.0016, Matrix.Translation(Vector((0.0098, 0, -0.0170))), 0.4)
    gem_cut(L['gem'], Vector((0.0098, -0.0016, -0.0170)), 0.0013, 0.0016, 6, up=Vector((0, -1, 0)))
ear_piece("moon_earrings", "Brincos de lua", "crescent moons with a small star", ["goth", "romantico", "casual"], 0.4, "comum", _moon,
          defaults={"gem": "#eaf2ff"}, metal="silver")

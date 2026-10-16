"""Accessories round 3 - belts, scarves, brooches, anklet, ear climbers, initial pendants, sport watch, friendship bracelet (exec'd in build_jewelry.py namespace)."""
BONE_SPINE = "mixamorig:Spine"
WAIST = Vector((0, -0.035, 1.02))
SATIN = {"ribbon": dict(rough=0.35, coat=0.0, sheen=1.0, sheen_rough=0.25, sheen_tint="#ffffff")}
LEATH = {"ribbon": dict(rough=0.38, coat=0.4, coat_rough=0.15, sheen=0.0)}


def ring_out(z, clear, n=64, yc=-0.035, trees=None, cx=0.0):
    """closed horizontal ring around the torso at height z (ray from the axis outwards, outermost of base+morph trees) + clear"""
    pts = []; nr = []
    for i in range(n):
        a = 2*math.pi*i/n; d = Vector((math.sin(a), -math.cos(a), 0))
        best = None
        for t in (trees or TREES):
            r = t.ray_cast(Vector((cx, yc, z)), d, 0.5)
            if r[0] is not None and (best is None or r[3] > best[2]): best = (r[0], r[1], r[3])
        if best is None: pts.append(Vector((cx, yc, z)) + d*0.1); nr.append(d); continue
        pts.append(best[0] + d*clear); nr.append(d)
    return pts, nr


def smooth_ring(pts, passes=2):
    return smooth_poly(pts, passes, True, 0.5)


def belt_att(): return [(BONE_SPINE, WAIST, Matrix.Identity(3))]


def belt_piece(id, label, notes, tags, formality, rarity, defaults, mlabels=None, metal="gold", finish=None):
    return piece(id, label, "belt", WAIST, BONE_SPINE, notes, tags=tags, formality=formality, rarity=rarity, defaults=defaults, mlabels=mlabels or {"ribbon": "Couro / cetim", "gem": "Cristal", "pearl": "Detalhe"},
                 metal=metal, finish=finish or LEATH, extra={"beltNote": "conformed to base+weightUp+hipsWide+buttBig+bustBig envelope (7-12 mm off the base waist at morph 0)"})


WAIST_TREES = None


def waist_trees():
    global WAIST_TREES
    if WAIST_TREES is None:
        WAIST_TREES = [TREES[0]]
        for nm in ("weightUp", "hipsWide", "buttBig"):
            WAIST_TREES.append(BVHTree.FromPolygons([tuple(v) for v in morph_pts(nm)], polys))
        WAIST_TREES.append(TREES[1])
    return WAIST_TREES


@belt_piece("thin_gold_belt", "Cinto fino dourado", "slim 9 mm gold waist belt with a rhombus buckle and a crystal", ["gala", "romantico", "casual"], 0.75, "comum", {"gem": "#eaf2ff"}, {"metal": "Metal", "gem": "Cristal", "ribbon": "Couro", "pearl": "Detalhe"})
def thin_gold_belt():
    P = Piece("thin_gold_belt")
    pts, nr = ring_out(1.02, 0.0045, 72, trees=waist_trees()); pts = smooth_ring(pts)
    nr = [Vector((p.x, p.y - WAIST.y, 0)).normalized() for p in pts]
    strip(P['metal'], pts, nr, [Vector((0, 0, 1))]*len(pts), 0.0095, 0.0024, True)
    f = min(pts, key=lambda p: p.y + (0 if abs(p.x) < 0.01 else 9))
    M = Matrix.Translation(f + Vector((0, -0.0030, 0)))
    puffy(P['metal'], [(0.0, 0.0115), (0.0165, 0.0), (0.0, -0.0115), (-0.0165, 0.0)], 0.0034, M, 0.55)
    gem_cut(P['gem'], f + Vector((0, -0.0058, 0)), 0.0048, 0.0046, 6, up=Vector((0, -1, 0)))
    return P, belt_att()


@belt_piece("chain_belt", "Cinto corrente", "two gold chains: a waist chain and a looser hip swag with a heart charm and pearls", ["y2k", "casual", "praia"], 0.4, "raro", {"gem": "#c1121f", "pearl": "#fbf3e6"}, {"metal": "Metal", "gem": "Coração", "pearl": "Pérolas", "ribbon": "Fita"})
def chain_belt():
    P = Piece("chain_belt")
    pts, nr = ring_out(1.025, 0.0042, 70, trees=waist_trees()); pts = smooth_ring(pts)
    chain_links(P['metal'], resample_n(pts, 40), 0.0150, 0.0085, 0.0014, 3, 6)
    # lower swag: z dips toward the front-left hip
    sw = []
    for i in range(72):
        a = 2*math.pi*i/72; dip = 0.050*max(0.0, math.cos(a - math.radians(-35)))**2
        z = 0.985 - dip
        d = Vector((math.sin(a), -math.cos(a), 0)); best = None
        for t in waist_trees():
            r = t.ray_cast(Vector((0, -0.035, z)), d, 0.5)
            if r[0] is not None and (best is None or r[3] > best[2]): best = (r[0], r[2], r[3])
        sw.append(best[0] + d*0.0052 if best else Vector((0, -0.035, z)) + d*0.1)
    sw = smooth_ring(sw)
    chain_links(P['metal'], resample_n(sw, 44), 0.0135, 0.0078, 0.0013, 3, 6)
    low = min(sw, key=lambda p: p.z + (0 if p.y < -0.05 else 9))
    n, _ = nrm_at(low)
    L = Loc(); puffy(L['metal'], heart_outline(0.0105), 0.0042, Matrix.Translation(Vector((0, 0, -0.0100))), 0.55)
    puffy(L['gem'], heart_outline(0.0070), 0.0055, Matrix.Translation(Vector((0, -0.0005, -0.0098))), 0.5)
    bail(L['metal'], Vector((0, 0, -0.0010)), 0.0024, 0.0007)
    L.commit(P, frame(low + n*0.001, Vector((n.x*0.6, n.y, 0)).normalized()))
    for i in range(0, 44, 5): sphere(P['pearl'], resample_n(sw, 44)[i][0] + Vector((0, 0, 0)), 0.0034, 6, 4)
    return P, belt_att()


@belt_piece("leather_belt", "Cinto de couro com fivela", "26 mm leather belt, gold rectangular buckle, keeper loop and a tail with punched holes", ["casual", "esportivo", "goth"], 0.35, "comum", {"ribbon": "#6b3f1f"}, finish=LEATH)
def leather_belt():
    P = Piece("leather_belt")
    pts, nr = ring_out(1.025, 0.0042, 72, trees=waist_trees()); pts = smooth_ring(pts)
    nr = [Vector((p.x, p.y - WAIST.y, 0)).normalized() for p in pts]
    strip(P['ribbon'], pts, nr, [Vector((0, 0, 1))]*len(pts), 0.0260, 0.0030, True)
    for p, n in zip(pts[::2], nr[::2]):       # stitching
        pass
    ia = min(range(len(pts)), key=lambda i: pts[i].y + (0 if abs(pts[i].x) < 0.01 else 9))
    f = pts[ia]
    # buckle: rectangular frame + prong, tail overlay to the left
    fb = f + Vector((0, -0.0040, 0))
    for dz in (-0.0155, 0.0155): box(P['metal'], fb + Vector((0, 0, dz)), 0.0400, 0.0034, 0.0042)
    for dx in (-0.0200, 0.0200): box(P['metal'], fb + Vector((dx, 0, 0)), 0.0042, 0.0034, 0.0360)
    box(P['metal'], fb + Vector((-0.002, -0.0010, 0)), 0.0030, 0.0030, 0.0300)
    tail = [pts[(ia + k) % len(pts)] for k in range(1, 7)]; tn = [Vector((p.x, p.y - WAIST.y, 0)).normalized() for p in tail]
    strip(P['ribbon'], [p + n*0.0034 for p, n in zip(tail, tn)], tn, [Vector((0, 0, 1))]*len(tail), 0.0230, 0.0030, False)
    for k in range(2, 6):
        q = tail[k] + tn[k]*0.0052; sphere(P['metal'], q, 0.0017, 5, 3)
    kp = [pts[(ia - 4) % len(pts)], pts[(ia - 3) % len(pts)]]; kn = [Vector((p.x, p.y - WAIST.y, 0)).normalized() for p in kp]
    strip(P['metal'], [p + n*0.0034 for p, n in zip(kp, kn)], kn, [Vector((0, 0, 1))]*2, 0.0275, 0.0020, False)
    return P, belt_att()


@belt_piece("satin_sash", "Faixa de cetim com laço", "46 mm satin sash with a side bow and two draped tails (conformed to the left hip)", ["gala", "romantico"], 0.8, "raro", {"ribbon": "#6e1423", "gem": "#eaf2ff"}, {"ribbon": "Cetim", "gem": "Cristal", "metal": "Metal", "pearl": "Detalhe"}, finish=SATIN)
def satin_sash():
    P = Piece("satin_sash")
    pts, nr = ring_out(1.03, 0.0042, 72, trees=waist_trees()); pts = smooth_ring(pts)
    nr = [Vector((p.x, p.y - WAIST.y, 0)).normalized() for p in pts]
    strip(P['ribbon'], pts, nr, [Vector((0, 0, 1))]*len(pts), 0.0460, 0.0030, True)
    # bow at the front-left (azimuth 50 deg)
    a = math.radians(50); d = Vector((math.sin(a), -math.cos(a), 0)); ik = min(range(len(pts)), key=lambda i: (nr[i] - d).length)
    k = pts[ik]; n = nr[ik]
    L = Loc(); bow2(L, Matrix.Identity(4), 0.062, 'ribbon', False, 0.34, False)
    L.commit(P, frame(k + n*0.0030, n))
    gem_cut(P['gem'], k + n*0.0170, 0.0055, 0.006, 6, up=n)
    for sgn, ang in ((1, 0.20), (-1, -0.10)):
        c0 = k + n*0.003
        ctrl = [Vector((c0.x, c0.y, c0.z - 0.012)), Vector((c0.x + sgn*0.010, c0.y, c0.z - 0.050)), Vector((c0.x + sgn*0.018, c0.y, c0.z - 0.095)), Vector((c0.x + sgn*0.022, c0.y, c0.z - 0.135))]
        strap_on_body(P, 'ribbon', ctrl, 0.030, 0.0030, 0.0034)
    return P, belt_att()


# ============================================================ scarves
def neck_rows(zs, clears, n=56, yc=0.008):
    rows = []
    for z, c in zip(zs, clears):
        row = []
        for i in range(n):
            a = 2*math.pi*i/n
            out = Vector((0.20*math.sin(a), yc - 0.20*math.cos(a), z)); tgt = Vector((0, yc, z))
            row.append(shrinkwrap(out, tgt, c, [TREES[0]]))
        rows.append(smooth_poly(row, 2, True, 0.5))
    return rows


def neck_band(P, slot, z0, h, th, rows=3, n=56, extra_clear=0.0, fn=None):
    zs = [z0 - h/2 + h*i/(rows-1) for i in range(rows)]
    outer = neck_rows(zs, [0.0035 + th + extra_clear]*rows, n); inner = neck_rows(zs, [0.0020 + extra_clear]*rows, n)
    bm = bmesh.new(); loft_rings(bm, outer + inner[::-1], True, True); commit_bm(P, slot, bm)
    return outer


SCARF_ATT = lambda: [(BONE_SPINE2, SP2, Matrix.Identity(3))]


def scarf_piece(id, label, notes, tags, formality, rarity, defaults, mlabels, finish):
    return piece(id, label, "scarf", SP2, BONE_SPINE2, notes, tags=tags, formality=formality, rarity=rarity, defaults=defaults, mlabels=mlabels, finish=finish,
                 extra={"scarfNote": "rigid on Spine2 (tails drape on the chest, conformed to base+bustBig); neck band clears the neck by 5 mm"})


@scarf_piece("silk_scarf", "Lenço de seda no pescoço", "folded silk scarf tied at the front-left with a small knot and two draped tails; polka-dot trim",
             ["romantico", "gala", "casual"], 0.65, "comum", {"ribbon": "#1f2d4a", "pearl": "#fff6ea"}, {"ribbon": "Seda", "pearl": "Bolinhas / borda", "gem": "Detalhe"}, SATIN)
def silk_scarf():
    P = Piece("silk_scarf")
    outer = neck_band(P, 'ribbon', 1.258, 0.034, 0.0030, 3, 56)
    mid = outer[1]
    # trim stripe on the upper edge + dots
    top = outer[2]
    tube_closed(P['pearl'], [p + (p - Vector((0, 0.008, p.z))).normalized()*0.0004 for p in top], 0.0012, 4)
    for i in range(0, 56, 4): sphere(P['pearl'], mid[i] + (mid[i] - Vector((0, 0.008, mid[i].z))).normalized()*0.0004, 0.0027, 6, 4, (1, 1, 0.5))
    a = math.radians(-38); ik = min(range(56), key=lambda i: abs(i*2*math.pi/56 - ((a + 2*math.pi) % (2*math.pi))))
    k = mid[ik]; n = (k - Vector((0, 0.008, k.z))).normalized()
    sphere(P['ribbon'], k + n*0.007, 0.0105, 10, 6, (1.2, 0.8, 0.9))
    for sgn in (1, -1):
        c0 = k + n*0.006
        ctrl = [Vector((c0.x, c0.y, c0.z - 0.005)), Vector((c0.x + sgn*0.014, c0.y - 0.020, c0.z - 0.040)), Vector((c0.x + sgn*0.020, c0.y - 0.040, c0.z - 0.080)), Vector((c0.x + sgn*0.026, c0.y - 0.045, c0.z - 0.125))]
        pts = strap_on_body(P, 'ribbon', ctrl, 0.036, 0.0030, 0.0050)
        for i in range(2, len(pts), 5): sphere(P['pearl'], pts[i] + nrm_at(pts[i])[0]*0.0020, 0.0024, 6, 4, (1, 1, 0.5))
    return P, SCARF_ATT()


@scarf_piece("short_scarf", "Cachecol curto", "chunky ribbed knit scarf wrapped twice around the neck with one short fringed tail on the chest",
             ["casual", "esportivo", "goth"], 0.2, "comum", {"ribbon": "#f1e6d6", "pearl": "#c1121f"}, {"ribbon": "Lã", "pearl": "Listras", "gem": "Detalhe"},
             {"ribbon": dict(rough=0.95, coat=0.0, sheen=0.0), "pearl": dict(rough=0.95, coat=0.0, sheen=0.0)})
def short_scarf():
    P = Piece("short_scarf")
    o1 = neck_band(P, 'ribbon', 1.248, 0.022, 0.0075, 3, 56)
    o2 = neck_band(P, 'ribbon', 1.272, 0.022, 0.0075, 3, 56, 0.0015)
    for row in (o1[1], o2[1]):
        tube_closed(P['pearl'], [p + (p - Vector((0, 0.008, p.z))).normalized()*0.0005 for p in row], 0.0018, 4)
    k = o1[1][int(56*0.88)]; n = (k - Vector((0, 0.008, k.z))).normalized()
    c0 = k + n*0.004
    ctrl = [Vector((c0.x, c0.y, c0.z - 0.004)), Vector((c0.x + 0.006, c0.y - 0.010, c0.z - 0.040)), Vector((c0.x + 0.010, c0.y - 0.020, c0.z - 0.085)), Vector((c0.x + 0.012, c0.y - 0.025, c0.z - 0.120))]
    pts = strap_on_body(P, 'ribbon', ctrl, 0.058, 0.0090, 0.0035)
    for i in (10, 20):
        q = pts[min(i, len(pts)-1)]; nn, _ = nrm_at(q)
        tube_open(P['pearl'], [q + nn*0.005 + Vector((-0.029, 0, 0)), q + nn*0.005 + Vector((0.029, 0, 0))], 0.0020, 4)
    for j in range(-5, 6):
        q = pts[-1]; nn, _ = nrm_at(q)
        tube_open(P['ribbon'], [q + nn*0.003 + Vector((j*0.0054, 0, 0.0)), q + nn*0.003 + Vector((j*0.0054, -0.003, -0.022))], 0.0012, 3)
    return P, SCARF_ATT()


# ============================================================ brooches (slot 'brooch', chest, Spine2)
def brooch_frame(x=0.072, z=1.145):
    p = None
    for t in TREES:
        r = t.ray_cast(Vector((x, -0.4, z)), Vector((0, 1, 0)), 0.8)
        if r[0] is not None and (p is None or r[0].y < p[0].y): p = (r[0], r[1])
    n = p[1]; c = p[0] + n*0.011
    return c, n


@piece("flower_brooch", "Broche de flor", "brooch", SP2, BONE_SPINE2, "pearl-petal flower pin with crystal centre and two gold leaves, pinned on the left chest (conformed to bustBig)",
       tags=["gala", "romantico"], formality=0.85, rarity="raro", defaults={"pearl": "#fbf3e6", "gem": "#eaf2ff"}, mlabels={"pearl": "Pétalas", "gem": "Cristal"})
def flower_brooch():
    P = Piece("flower_brooch")
    c, n = brooch_frame(0.075, 1.15)
    nn = Vector((n.x*0.7, n.y, max(n.z, -0.3))).normalized()
    L = Loc(); M = Matrix.Identity(4)
    flower(L, M, 0.0225, 7, 0.0105, 0.30, 'pearl', 'gem', 3, 0.5)
    flower(L, Matrix.Translation(Vector((0, -0.003, 0))) @ Matrix.Rotation(0.4, 4, 'Y'), 0.0130, 6, 0.0075, 0.30, 'pearl', 'gem', 2, 0.5)
    for sgn in (1, -1):
        add_to(L, 'metal', lambda bm: puffy(bm, leaf_outline(0.0230, 0.0085, 8), 0.0020, Matrix.Translation(Vector((sgn*0.0150, 0.0035, -0.0100))) @ Matrix.Rotation(sgn*0.9, 4, 'Y'), 0.5))
    for k in range(5):
        a = 2*math.pi*k/5; sphere(L['pearl'], Vector((0.0075*math.cos(a), -0.0090, 0.0075*math.sin(a))), 0.0018, 5, 3)
    L.commit(P, frame(c, nn))
    return P, [(BONE_SPINE2, SP2, Matrix.Identity(3))]


@piece("bow_brooch", "Broche de laço", "brooch", SP2, BONE_SPINE2, "satin bow pin with a crystal knot and a short pearl drop, left chest (conformed to bustBig)",
       tags=["romantico", "casual", "gala"], formality=0.6, rarity="comum", defaults={"ribbon": "#1a1a1f", "gem": "#eaf2ff", "pearl": "#fbf3e6"}, mlabels={"ribbon": "Cetim", "gem": "Cristal", "pearl": "Pérola"}, finish=SATIN)
def bow_brooch():
    P = Piece("bow_brooch")
    c, n = brooch_frame(0.075, 1.15)
    nn = Vector((n.x*0.7, n.y, max(n.z, -0.3))).normalized()
    L = Loc(); bow2(L, Matrix.Identity(4), 0.024, 'ribbon', True, 0.30, True)
    tube_open(L['metal'], [Vector((0, -0.004, 0.0)), Vector((0, -0.004, -0.0165))], 0.0007, 3)
    sphere(L['pearl'], Vector((0, -0.004, -0.0195)), 0.0036, 7, 4)
    L.commit(P, frame(c, nn))
    return P, [(BONE_SPINE2, SP2, Matrix.Identity(3))]


# ============================================================ anklet
def leg_ring(z0, clear, n=40):
    c0 = Vector((0.127, 0.0, z0)); pts = []
    for it in range(3):
        sl = []
        for i in range(n):
            a = 2*math.pi*i/n; d = Vector((math.cos(a), math.sin(a), 0))
            r = TREES[0].ray_cast(c0, d, 0.2)
            sl.append(r[0] if r[0] is not None else c0 + d*0.04)
        c0 = Vector((sum(p.x for p in sl)/n, sum(p.y for p in sl)/n, z0))
    return c0, [p + (p - c0).normalized()*clear for p in sl]


@piece("anklet", "Tornozeleira", "ankle", (0, 0, 0), "mixamorig:LeftFoot", "fine gold chain ring with a star charm and pearls, both ankles; symmetric about its own axis so left and right share the mesh",
       tags=["praia", "y2k", "romantico"], formality=0.3, rarity="comum", defaults={"gem": "#eaf2ff", "pearl": "#fbf3e6"}, canon=True)
def anklet():
    P = Piece("anklet")
    z0 = 0.205
    c0, ring = leg_ring(z0, 0.0035)
    loc = [p - c0 for p in ring]
    tube_closed(P['metal'], loc, 0.0010, 4)
    for i in range(0, len(loc), 4): sphere(P['pearl'] if i % 8 == 0 else P['metal'], loc[i], 0.0030 if i % 8 == 0 else 0.0020, 6, 4)
    front = min(loc, key=lambda p: p.y + (0 if abs(p.x) < 0.006 else 9))
    L = Loc()
    puffy(L['metal'], star_outline(0.0090, 0.0042), 0.0030, Matrix.Translation(Vector((0, -0.0040, -0.0120))), 0.45)
    gem_cut(L['gem'], Vector((0, -0.0063, -0.0122)), 0.0028, 0.0032, 6, up=Vector((0, -1, 0)))
    bail(L['metal'], Vector((0, -0.0040, -0.0035)), 0.0022, 0.0007)
    L.commit(P, Matrix.Translation(front + Vector((0, 0, 0))))
    cR = Vector((-c0.x, c0.y, c0.z))
    return P, [("mixamorig:LeftFoot", c0, Matrix.Identity(3)), ("mixamorig:RightFoot", cR, Matrix.Identity(3))]


# ============================================================ ear climbers
def climber(L):
    pts = [Vector((0.0012, -0.001 + 0.0006*i, -0.001 + 0.0057*i)) for i in range(0, 10)]
    pts = [Vector((p.x, p.y + 0.0010*math.sin(i*0.6), p.z)) for i, p in enumerate(pts)]
    tube_open(L['metal'], pts, 0.0008, 4)
    for i, p in enumerate(pts[1:], 1):
        if i % 2: gem_cut(L['gem'], p + Vector((0.0016, -0.0006, 0)), 0.0017 + 0.0004*(i % 3), 0.0020, 6, up=Vector((1, 0, 0)))
        else: puffy(L['metal'], star_outline(0.0030 + 0.0004*(i % 3), 0.0014), 0.0014, Matrix.Translation(p + Vector((0.0014, 0, 0))) @ Matrix.Rotation(math.pi/2, 4, 'Z'), 0.4)
    sphere(L['pearl'], Vector((0.0045, -0.001, -0.0030)), 0.0032, 7, 4)


ear_piece("ear_climbers", "Brincos ear climber", "star and crystal climbers crawling 5 cm up the side of the head from the lobe, pearl stud at the lobe (head has no ears; hidden by most hair)",
          ["y2k", "gala", "romantico"], 0.55, "raro", climber, "silver", {"gem": "#eaf2ff", "pearl": "#fbf3e6"}, None, 1.9)


# ============================================================ initial pendants
def initial_piece(ch, label_pt):
    pid = "initial_necklace_" + ch.lower()
    @piece(pid, "Colar com inicial %s" % ch, "neck", LAYER_A, BONE_SPINE2, "fine gold chain with a letter %s pendant (extruded font letter, 12 mm) + tiny crystal accent; letters A, L, M, S exist - see notes" % ch,
           tags=["casual", "romantico", "y2k"], formality=0.35, rarity="comum", defaults={"gem": "#eaf2ff"}, mlabels={"gem": "Cristal"})
    def fn():
        def b(L, pts):
            bmL = text_mesh(ch, 0.0125, 0.0022, 0.0003)
            xf(bmL, Matrix.Translation(Vector((0, -0.0006, -0.0165))))
            merge_bm(L['metal'], bmL); bmL.free()
            bail(L['metal'], Vector((0, 0, -0.0045)), 0.0020, 0.0006)
            gem_cut(L['gem'], Vector((0.0072, -0.0022, -0.0085)), 0.0017, 0.0019, 6, up=Vector((0, -1, 0)))
        return pendant_piece(pid, 1.178, b, 3.4, 0.0010, 5)
    return fn


for _ch in "ALMS": initial_piece(_ch, _ch)


# ============================================================ sport watch + friendship bracelet (wrist pieces, limb frame +X dorsal, +Y lateral, +Z to the hand)
@piece("sport_watch", "Relógio esportivo", "wrist", WR_ANCHOR, LHAND, "silicone-strap digital sport watch: rounded-square case, dark screen, two side buttons, buckle with a keeper",
       tags=["esportivo", "casual"], formality=0.1, rarity="comum", defaults={"ribbon": "#1a1a1f", "gem": "#1b2a49"}, mlabels={"ribbon": "Pulseira de silicone", "gem": "Tela", "metal": "Caixa"},
       metal="silver", finish={"ribbon": dict(rough=0.45, coat=0.0, sheen=0.0)})
def sport_watch():
    P = Piece("sport_watch")
    (pts, nr), a, b = ring_pts(0.905, 0.0028, 64)
    n = len(pts)
    strip(P['ribbon'], pts, [Vector((p.x/a**2, p.y/b**2, 0)).normalized() for p in pts], [Vector((0, 0, 1))]*n, 0.0200, 0.0030, True)
    for i in range(0, n, 3):
        p = pts[i]; nn = Vector((p.x/a**2, p.y/b**2, 0)).normalized()
        if i > n*0.55 and i < n*0.75: sphere(P['metal'], p + nn*0.0018, 0.0011, 5, 3)
    cx = a + 0.0046
    M = Matrix.Translation(Vector((cx, 0, 0))) @ Matrix.Rotation(math.pi/2, 4, 'Z')
    puffy(P['metal'], rrect(0.0300, 0.0300, 0.0075, 3), 0.0070, M, 0.95)
    puffy(P['gem'], rrect(0.0215, 0.0215, 0.0045, 3), 0.0076, M @ Matrix.Translation((0, -0.0004, 0)), 0.97)
    for dz in (-0.0070, 0.0070):
        box(P['metal'], Vector((cx - 0.0006, 0.0165, dz)), 0.0030, 0.0035, 0.0045)
    box(P['metal'], Vector((-(a + 0.0020), 0, 0)), 0.0042, 0.0140, 0.0150)
    for k in range(3): box(P['ribbon'], Vector((cx + 0.0043, 0, -0.0050 + 0.0050*k)), 0.0004, 0.0140 if k == 1 else 0.0100, 0.0010)
    return P, wrist_attach(0.905)


@piece("friendship_bracelet", "Pulseira de fita da amizade", "wrist", WR_ANCHOR, LHAND, "braided chevron thread bracelet (5 rows) tied with a knot and two tails, plus three small gold beads",
       tags=["praia", "casual", "y2k"], formality=0.05, rarity="comum", defaults={"ribbon": "#ff5fa8", "pearl": "#ffe36e", "gem": "#4fc3f7"}, mlabels={"ribbon": "Fio 1", "pearl": "Fio 2", "gem": "Fio 3"},
       finish={"ribbon": dict(rough=0.9, coat=0.0, sheen=0.0), "pearl": dict(rough=0.9, coat=0.0, sheen=0.0), "gem": dict(rough=0.9, transmission=0.0, emission=0.0)})
def friendship_bracelet():
    P = Piece("friendship_bracelet")
    (pts, nr), a, b = ring_pts(0.918, 0.0022, 72)
    rs = resample_n(pts, 36); slots = ['ribbon', 'pearl', 'gem']
    L_ = poly_len(pts)/36
    for i, (p, t) in enumerate(rs):
        n = Vector((p.x/a**2, p.y/b**2, 0)).normalized(); zax = Vector((0, 0, 1)); bx = t.normalized()
        R = Matrix(((bx.x, zax.x, n.x), (bx.y, zax.y, n.y), (bx.z, zax.z, n.z))).to_4x4()
        for r in range(5):
            dz = (r - 2)*0.0030
            col = (abs(r - 2) + (i // 2)) % 3        # chevron diagonal pattern
            box(P[slots[col]], p + Vector((0, 0, dz)), L_*0.96, 0.0030, 0.0020, R)
    k = rs[0][0]; n0 = Vector((k.x/a**2, k.y/b**2, 0)).normalized()
    sphere(P['ribbon'], k + n0*0.0022, 0.0042, 7, 4)
    for sgn, ln in ((1, 0.020), (-1, 0.015)):
        tube_open(P['pearl'] if sgn > 0 else P['gem'], [k + n0*0.002, k + n0*0.004 + Vector((0, sgn*0.006, -0.010)), k + n0*0.002 + Vector((0, sgn*0.011, -ln))], 0.0008, 3)
    for j in (9, 18, 27): sphere(P['metal'], rs[j][0] + Vector((rs[j][0].x/a**2, rs[j][0].y/b**2, 0)).normalized()*0.0028, 0.0030, 7, 4)
    return P, wrist_attach(0.918)

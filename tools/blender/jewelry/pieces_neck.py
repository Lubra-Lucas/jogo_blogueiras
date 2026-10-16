"""Collection 2 - necklaces (exec'd in build_jewelry.py namespace)."""
NECK_BONE = "mixamorig:Neck"; SPINE_BONE = "mixamorig:Spine2"


def NECK_ATT(): return [(NECK_BONE, NECK_C, Matrix.Identity(3))]
def CHEST_ATT(): return [(SPINE_BONE, LAYER_A, Matrix.Identity(3))]


# ============================================================== chokers
@piece("velvet_cameo_choker", "Gargantilha de veludo com camafeu", "neck", NECK_C, NECK_BONE,
       "velvet band + oval cameo (frame in metal, ivory face in pearl slot) on the throat",
       tags=["rococo", "romantico", "goth"], formality=0.75, rarity="raro",
       defaults={"ribbon": "#5b1226", "pearl": "#efe3cc", "gem": "#eaf2ff"}, mlabels={"ribbon": "Veludo", "pearl": "Camafeu"})
def velvet_cameo():
    P = Piece("velvet_cameo_choker")
    th = 0.0022; w = 0.0100
    pts = neck_loop(0.0358, 0.0308, NECK_C.z - 0.001, 48, clear=th/2 + 0.0007)
    strip(P['ribbon'], pts, radial(pts), Z, w, th, closed=True)
    fy = pts[0].y - th/2
    c = Vector((0, fy - 0.0040, NECK_C.z - 0.0015))
    L = Loc()
    puffy(L['metal'], oval_outline(0.0098, 0.0125, 18), 0.0045, Matrix.Translation(c), 0.8)
    puffy(L['pearl'], oval_outline(0.0078, 0.0105, 18), 0.0058, Matrix.Translation(c + Vector((0, -0.0004, 0))), 0.6)
    for k in range(18):
        a = 2*math.pi*k/18
        sphere(L['metal'], c + Vector((0.0106*math.cos(a), -0.0012, 0.0133*math.sin(a))), 0.0011, 6, 4)
    flower(L, Matrix.Translation(c + Vector((0, -0.0036, 0.0006))), 0.0050, 5, 0.0016, 0.32, 'metal', 'gem')
    L.commit(P)
    return P, NECK_ATT()


@piece("crystal_choker", "Choker de cristais", "neck", NECK_C, NECK_BONE,
       "single row of faceted crystals on a thread with a pear drop at the throat",
       tags=["gala", "romantico", "rococo"], formality=0.9, rarity="épico", metal="silver", defaults={"gem": "#eaf2ff"})
def crystal_choker():
    P = Piece("crystal_choker")
    pts = neck_loop(0.0372, 0.0322, NECK_C.z - 0.0015, 48, dip=0.002, pw=2, clear=0.0034)
    tube_closed(P['metal'], pts, 0.0009, 4)
    rs = resample_n(pts, 27)
    rad = radial([p for p, t in rs])
    for (p, t), n in zip(rs, rad):
        f = max(0.0, -n.y)                      # 1 at the front
        r = 0.0030 + 0.0016*f**1.5
        gem_cut(P['gem'], p + n*0.0006, r, r*1.1, 6, up=n)
        sphere(P['metal'], p - n*0.0006, r*0.72, 6, 4)
    fp = rs[0][0]
    L = Loc()
    c = fp + Vector((0, -0.0022, -0.0105))
    gem_cut(L['gem'], c + Vector((0, 0, -0.004)), 0.0052, 0.016, 8, up=Vector((0, 0, 1)))
    torus_bm(L['metal'], fp + Vector((0, -0.0016, -0.0036)), 0.0028, 0.0008, Matrix.Rotation(math.pi/2, 4, 'X'), 10, 4)
    sphere(L['metal'], fp + Vector((0, -0.0022, -0.0066)), 0.0017, 6, 4)
    L.commit(P)
    return P, NECK_ATT()


@piece("chunky_chain", "Colar de corrente grossa", "neck", NECK_C, NECK_BONE,
       "chunky curb-style links with a toggle clasp worn in front",
       tags=["y2k", "casual", "esportivo"], formality=0.25, rarity="comum", metal="gold")
def chunky_chain():
    P = Piece("chunky_chain")
    pts = neck_loop(0.0415, 0.0355, NECK_C.z - 0.004, 56, dip=0.007, pw=2, clear=0.0052)
    rs = resample_n(pts, 29)
    chain_links(P['metal'], rs, 0.0125, 0.0082, 0.0017, 4, 8)
    fp = rs[0][0]
    L = Loc()
    c = fp + Vector((0, -0.004, -0.0075))
    torus_bm(L['metal'], c + Vector((-0.0058, 0, 0)), 0.0068, 0.0017, Matrix.Rotation(math.pi/2, 4, 'X'), 18, 5)
    tube_open(L['metal'], [c + Vector((0.0015, 0, 0.0022)), c + Vector((0.0015, 0, -0.0105))], 0.0018, 5)
    sphere(L['metal'], c + Vector((0.0015, 0, 0.0024)), 0.0026, 6, 4); sphere(L['metal'], c + Vector((0.0015, 0, -0.0107)), 0.0026, 6, 4)
    L.commit(P)
    return P, NECK_ATT()


@piece("spike_choker", "Gargantilha de spikes", "neck", NECK_C, NECK_BONE,
       "soft-goth black band with rounded cone studs and a front O-ring",
       tags=["goth", "y2k"], formality=0.2, rarity="comum", metal="silver", defaults={"ribbon": "#15151a"}, mlabels={"ribbon": "Couro"})
def spike_choker():
    P = Piece("spike_choker")
    th = 0.0024; w = 0.0095
    pts = neck_loop(0.0358, 0.0308, NECK_C.z - 0.001, 48, clear=th/2 + 0.0007)
    rad = radial(pts)
    strip(P['ribbon'], pts, rad, Z, w, th, closed=True)
    rs = resample_n(pts, 16); rr = radial([p for p, t in rs])
    for (p, t), n in zip(rs, rr):
        if abs(math.atan2(n.x, -n.y)) < 0.18: continue          # keep the front for the ring
        b = p + n*(th/2)
        cone(P['metal'], b, b + n*0.0060, 0.0027, 6)
        sphere(P['metal'], b + n*0.0062, 0.0012, 6, 4)
    fy = pts[0].y - th/2
    torus_bm(P['metal'], Vector((0, fy - 0.0030, NECK_C.z - 0.001)), 0.0058, 0.0013, Matrix.Rotation(math.pi/2, 4, 'X'), 16, 5)
    box(P['metal'], Vector((0, fy - 0.0008, NECK_C.z - 0.001)), 0.0135, 0.0020, 0.0100)
    return P, NECK_ATT()


@piece("daisy_necklace", "Colar de margaridas", "neck", NECK_C, NECK_BONE,
       "9 daisies (petals = pearl slot, centre = gem) on a fine chain with leaves",
       tags=["praia", "romantico", "casual"], formality=0.2, rarity="comum", metal="gold",
       defaults={"pearl": "#fbf6ea", "gem": "#f2b830", "ribbon": "#4f7f45"}, mlabels={"pearl": "Pétalas", "gem": "Miolo", "ribbon": "Folhas"})
def daisy_necklace():
    P = Piece("daisy_necklace")
    pts = neck_loop(0.0392, 0.0338, NECK_C.z - 0.006, 56, dip=0.012, pw=2.2, clear=0.0030)
    tube_closed(P['metal'], pts, 0.0008, 4)
    L = Loc()
    N = 9
    for k in range(N):
        a = math.radians(-118 + 236*k/(N-1))
        q = min(pts, key=lambda p: (Vector((p.x, p.y - NECK_C.y, 0)).normalized() - Vector((math.sin(a), -math.cos(a), 0))).length)
        n, _ = nrm_at(q); n = Vector((n.x, n.y, max(n.z, -0.3))).normalized()
        R = 0.0074 - 0.0020*abs(a)/math.radians(118)
        M = frame(q + n*(R*0.18), n, up=Vector((0, 0, 1)))
        flower(L, M, R, 8, R*0.34, 0.30, 'pearl', 'gem', 3, 0.50)
        if k % 2 == 0 and k not in (0, N-1):
            for sg in (-1, 1):
                add_to(L, 'ribbon', lambda bm: puffy(bm, leaf_outline(R*1.5, R*0.7), R*0.12,
                       Matrix.Translation(Vector((sg*R*1.5, R*0.1, -R*0.3))) @ Matrix.Rotation(sg*1.1, 4, 'Y'), 0.5), M)
    L.commit(P)
    return P, NECK_ATT()


@piece("y2k_bead_necklace", "Colar Y2K de miçangas", "neck", NECK_C, NECK_BONE,
       "mixed beads on the 4 material slots (gem/pearl/ribbon/metal) + star charm",
       tags=["y2k", "praia", "casual"], formality=0.1, rarity="comum", metal="silver",
       defaults={"gem": "#2ec4b6", "pearl": "#f7f1e3", "ribbon": "#ff7a1a"}, mlabels={"gem": "Contas de vidro", "pearl": "Contas brancas", "ribbon": "Contas foscas"})
def y2k_beads():
    P = Piece("y2k_bead_necklace")
    pts = neck_loop(0.0400, 0.0345, NECK_C.z - 0.011, 56, dip=0.008, pw=2, clear=0.0050)
    tube_closed(P['metal'], pts, 0.0005, 3)
    rs = resample_n(pts, 33)
    kinds = ['gem', 'pearl', 'ribbon', 'metal', 'gem', 'ribbon', 'pearl', 'metal']
    for i, (p, t) in enumerate(rs):
        k = kinds[i % 8]
        if k == 'ribbon':
            tube_open(P['ribbon'], [p - t*0.0021, p + t*0.0021], 0.0046, 8)
        elif k == 'metal':
            sphere(P['metal'], p, 0.0027, 6, 4)
        elif k == 'gem':
            sphere(P['gem'], p, 0.0050, 8, 4, (1, 1, 1))
        else:
            sphere(P['pearl'], p, 0.0042, 8, 4)
    fp = rs[0][0]
    L = Loc()
    puffy(L['metal'], star_outline(0.0095, 0.0042), 0.0030, Matrix.Translation(fp + Vector((0, -0.0040, -0.0130))), 0.45)
    gem_cut(L['gem'], fp + Vector((0, -0.0066, -0.0131)), 0.0030, 0.0035, 6, up=Vector((0, -1, 0)))
    bail(L['metal'], fp + Vector((0, -0.0040, -0.0045)), 0.0022, 0.0006)
    L.commit(P)
    return P, NECK_ATT()


# ============================================================== chest-length (Spine2)
def pendant_piece(name, zf, build, power=3.6, r=0.0011, beads_every=6, k=1.35):
    P = Piece(name)
    pts = chest_chain(P, zf, power, r, None, beads_every)
    M, fp = front_frame(pts)
    L = Loc(); build(L, pts); L.commit(P, M @ Matrix.Diagonal((k, k, k, 1)))
    return P, CHEST_ATT()


@piece("heart_lock_necklace", "Corrente com cadeado de coração", "neck", LAYER_A, SPINE_BONE,
       "fine chain, heart padlock (keyhole = gem) and a tiny key charm",
       tags=["romantico", "y2k", "goth"], formality=0.4, rarity="raro", metal="silver", defaults={"gem": "#c1121f"}, mlabels={"gem": "Fechadura"})
def heart_lock():
    def b(L, pts):
        c = Vector((0, 0, -0.0150))
        puffy(L['metal'], heart_outline(0.0125), 0.0058, Matrix.Translation(c), 0.55)
        puffy(L['metal'], heart_outline(0.0088), 0.0070, Matrix.Translation(c + Vector((0, -0.0004, 0.0004))), 0.5)
        gem_cut(L['gem'], c + Vector((0, -0.0040, 0.0010)), 0.0024, 0.0030, 6, up=Vector((0, -1, 0)))
        box(L['gem'], c + Vector((0, -0.0038, -0.0036)), 0.0013, 0.0010, 0.0055)
        shackle = [Vector((0.0045*math.cos(a), 0, 0.0045*math.sin(a))) + Vector((0, 0, -0.0015)) for a in [math.pi*i/10 for i in range(11)]]
        tube_open(L['metal'], shackle, 0.0010, 5)
        bail(L['metal'], Vector((0, 0, 0.0016)), 0.0020, 0.0006)
        # key charm
        k0 = Vector((0.0125, -0.0010, -0.0145))
        torus_bm(L['metal'], k0 + Vector((0, 0, 0.0035)), 0.0036, 0.0009, Matrix.Rotation(math.pi/2, 4, 'X'), 12, 4)
        tube_open(L['metal'], [k0 + Vector((0, 0, 0.0003)), k0 + Vector((0, 0, -0.0100))], 0.0008, 4)
        for dz in (-0.0072, -0.0094): box(L['metal'], k0 + Vector((0.0018, 0, dz)), 0.0036, 0.0012, 0.0014)
        tube_open(L['metal'], [Vector((0.0045, 0, -0.0005)), k0 + Vector((0, 0, 0.0074))], 0.0006, 3)
    return pendant_piece("heart_lock_necklace", 1.172, b, 3.2)


@piece("butterfly_necklace", "Colar de borboleta", "neck", LAYER_A, SPINE_BONE,
       "dainty chain with a gem-winged butterfly",
       tags=["romantico", "y2k", "praia"], formality=0.35, rarity="comum", defaults={"gem": "#2a4fb8"}, mlabels={"gem": "Asas"})
def butterfly_necklace():
    def b(L, pts):
        butterfly(L, Matrix.Translation(Vector((0, 0, -0.0150))), 0.0125, 'gem')
        bail(L['metal'], Vector((0, 0, -0.0020)), 0.0020, 0.0006)
    return pendant_piece("butterfly_necklace", 1.185, b, 3.4)


@piece("moon_star_necklace", "Colar de lua e estrelas", "neck", LAYER_A, SPINE_BONE,
       "crescent moon + two dangling stars on a gold chain",
       tags=["romantico", "casual", "goth"], formality=0.4, rarity="comum", defaults={"gem": "#eaf2ff"})
def moon_star():
    def b(L, pts):
        # crescent: tapered swept tube along an arc
        arc = []; rad = []
        n = 14
        for i in range(n+1):
            a = math.radians(-70 + 290*i/n)
            arc.append(Vector((0.0105*math.sin(a + 0.0), 0, -0.0150 - 0.0105*math.cos(a)))); rad.append(0.0007 + 0.0036*math.sin(math.pi*i/n))
        tube_open(L['metal'], arc, 0.002, 8, rad)
        gem_cut(L['gem'], Vector((0.0011, -0.0036, -0.0130)), 0.0022, 0.0028, 6, up=Vector((0, -1, 0)))
        bail(L['metal'], Vector((0, 0, -0.0020)), 0.0020, 0.0006)
        tube_open(L['metal'], [Vector((0, 0, -0.0035)), Vector((0, 0, -0.0042))], 0.0006, 3)
        # stars
        for sx, dz, R in ((-0.0155, -0.0300, 0.0058), (0.0120, -0.0345, 0.0046)):
            puffy(L['metal'], star_outline(R, R*0.45), R*0.34, Matrix.Translation(Vector((sx, 0, dz))), 0.4)
            tube_open(L['metal'], [Vector((sx*0.55, 0, -0.0140)), Vector((sx, 0, dz + R))], 0.0005, 3)
        gem_cut(L['gem'], Vector((-0.0155, -0.0026, -0.0300)), 0.0020, 0.0024, 6, up=Vector((0, -1, 0)))
    return pendant_piece("moon_star_necklace", 1.185, b, 3.4)


@piece("star_necklace", "Colar de estrela", "neck", LAYER_A, SPINE_BONE,
       "big gem-centred star pendant, two small stars set in the chain",
       tags=["y2k", "casual", "romantico"], formality=0.3, rarity="comum", defaults={"gem": "#eaf2ff"})
def star_necklace():
    def b(L, pts):
        c = Vector((0, 0, -0.0170))
        puffy(L['metal'], star_outline(0.0150, 0.0066), 0.0058, Matrix.Translation(c), 0.4)
        gem_cut(L['gem'], c + Vector((0, -0.0040, -0.0004)), 0.0042, 0.0050, 6, up=Vector((0, -1, 0)))
        for k in range(5):
            a = math.pi/2 + 2*math.pi*k/5
            sphere(L['metal'], c + Vector((0.0112*math.cos(a), -0.0030, 0.0112*math.sin(a))), 0.0011, 6, 4)
        bail(L['metal'], Vector((0, 0, -0.0010)), 0.0022, 0.0007)
    P, att = pendant_piece("star_necklace", 1.180, b, 3.4)
    return P, att


@piece("bow_necklace", "Colar de laço", "neck", LAYER_A, SPINE_BONE,
       "satin bow pendant with a crystal knot",
       tags=["romantico", "casual"], formality=0.4, rarity="comum", defaults={"ribbon": "#14213d", "gem": "#eaf2ff"})
def bow_necklace():
    def b(L, pts):
        bow2(L, Matrix.Translation(Vector((0, 0, -0.0125))), 0.0125, 'ribbon', True, 0.30, True)
        bail(L['metal'], Vector((0, 0, -0.0010)), 0.0018, 0.0006)
    return pendant_piece("bow_necklace", 1.185, b, 3.4)


@piece("big_heart_necklace", "Colar com pingente de coração", "neck", LAYER_A, SPINE_BONE,
       "large puffy heart with gem inlay and a pavé edge",
       tags=["romantico", "gala"], formality=0.55, rarity="raro", defaults={"gem": "#c1121f"})
def big_heart():
    def b(L, pts):
        c = Vector((0, 0, -0.0215))
        puffy(L['metal'], heart_outline(0.0215), 0.0085, Matrix.Translation(c), 0.55)
        puffy(L['gem'], heart_outline(0.0148), 0.0100, Matrix.Translation(c + Vector((0, -0.0006, 0.0008))), 0.5)
        for (x, z) in heart_pts(22, 0.0200):
            sphere(L['metal'], c + Vector((x, -0.0030, z + 0.0004)), 0.0011, 6, 3)
        bail(L['metal'], Vector((0, 0, -0.0016)), 0.0024, 0.0008)
    return pendant_piece("big_heart_necklace", 1.150, b, 3.0, 0.0013, 6, 1.0)


# ---- long pearls
@piece("opera_pearls", "Colar de pérolas longo (opera)", "neck", LAYER_A, SPINE_BONE,
       "single rope that falls to z~1.10 over the chest; clear of bustBig=1 (shrink-wrapped to both meshes)",
       tags=["gala", "rococo", "romantico"], formality=0.9, rarity="épico", defaults={"pearl": "#fbf3e6"})
def opera_pearls():
    P = Piece("opera_pearls")
    pts = drape(1.098, power=2.6, clear=0.0066)
    pearl_loop(P, pts, 0.0058, 3, 8, 5, 0.0009)
    rs = resample_n(pts, 140)
    for i in (0, 4, 136):    # crystal rondelles near the front
        p, t = rs[i]; sphere(P['gem'], p, 0.0050, 8, 4, (1, 1, 0.8))
        torus_bm(P['metal'], p, 0.0052, 0.0008, Matrix.Rotation(math.pi/2, 4, 'X'), 12, 4)
    return P, CHEST_ATT()


@piece("double_pearls", "Colar de pérolas duplo", "neck", LAYER_A, SPINE_BONE,
       "two strands (z 1.215 and 1.172) joined by a gem clasp bar",
       tags=["gala", "romantico", "rococo"], formality=0.85, rarity="raro", defaults={"pearl": "#fbf3e6"})
def double_pearls():
    P = Piece("double_pearls")
    a = drape(1.205, power=3.2, clear=0.0042)
    b = drape(1.165, power=3.0, clear=0.0050)
    pearl_loop(P, a, 0.0038, 4, 7, 4, 0.0008)
    pearl_loop(P, b, 0.0044, 4, 7, 4, 0.0008)
    fa = front_pt(a); fb = front_pt(b)
    for f in (fa, fb):
        gem_cut(P['gem'], f + Vector((0, -0.0024, 0)), 0.0042, 0.0045, 6, up=Vector((0, -1, 0)))
        torus_bm(P['metal'], f + Vector((0, -0.0018, 0)), 0.0046, 0.0009, Matrix.Rotation(math.pi/2, 4, 'X'), 12, 4)
    tube_open(P['metal'], [fa + Vector((0, -0.0016, -0.0045)), fb + Vector((0, -0.0016, 0.0045))], 0.0007, 4)
    return P, CHEST_ATT()


@piece("bib_necklace", "Colar statement de pedras", "neck", LAYER_A, SPINE_BONE,
       "3-row gem bib collar, bottom row teardrops; shrink-wrapped to the chest (bustBig safe)",
       tags=["gala", "rococo"], formality=1.0, rarity="lendário", metal="gold", defaults={"gem": "#0f9d6b"})
def bib_necklace():
    P = Piece("bib_necklace")
    rows = [(1.222, 0.0041, 'round'), (1.198, 0.0049, 'round'), (1.170, 0.0058, 'drop')]
    for k, (zf, r, kind) in enumerate(rows):
        pts = drape(zf, power=2.8 + 0.2*k, clear=r*0.9 + 0.0030)
        tube_closed(P['metal'], pts, 0.0010, 3)
        ymid = pts_mid_y(pts)
        rs = resample_n(pts, int(poly_len(pts)/(2.6*r)))
        for p, t in rs:
            if p.y > ymid + 0.012: continue
            n, _ = nrm_at(p); n = Vector((n.x, n.y, max(n.z, -0.4))).normalized()
            if kind == 'drop':
                gem_cut(P['gem'], p + Vector((0, 0, -r*1.15)), r*0.80, r*2.5, 6, up=Vector((0, 0, 1)))
                sphere(P['metal'], p, r*0.5, 6, 4)
            else:
                gem_cut(P['gem'], p + n*0.0010, r, r*1.05, 6, up=n)
                sphere(P['metal'], p - n*0.0004, r*0.78, 6, 4)
    return P, CHEST_ATT()


# ---- rest of the "ear/head/wrist" pieces live in their own modules


# ============================================================== extra: shell necklace (praia)
def shell_outline(R, n=9):
    pts = [(0.0, 0.0)]
    for i in range(n+1):
        a = math.radians(18 + 144*i/n)
        r = R*(1.0 + 0.07*math.cos(i*math.pi))
        pts.append((r*math.cos(a), r*math.sin(a) - R*0.55))
    return pts[::-1][:-1] if False else pts


@piece("shell_necklace", "Colar de conchas", "neck", NECK_C, NECK_BONE,
       "tan cord with 5 scallop shells (pearl slot, gold ridges) and turquoise beads", tags=["praia", "casual", "y2k"], formality=0.05, rarity="comum",
       defaults={"pearl": "#f6e6d4", "gem": "#2ec4b6", "ribbon": "#b88a5a"}, mlabels={"pearl": "Conchas", "gem": "Contas", "ribbon": "Cordão"})
def shell_necklace():
    P = Piece("shell_necklace")
    pts = neck_loop(0.0398, 0.0342, NECK_C.z - 0.006, 56, dip=0.010, pw=2.0, clear=0.0030)
    tube_closed(P['ribbon'], pts, 0.0011, 4)
    rs = resample_n(pts, 32)
    L = Loc()
    for i, (p, t) in enumerate(rs):
        if i % 2 == 1 and abs(i-16) > 1: sphere(P['gem'], p, 0.0034, 6, 4) if i % 4 == 1 else sphere(P['metal'], p, 0.0020, 6, 4)
    for k, a in enumerate((-48, -24, 0, 24, 48)):
        ar = math.radians(a)
        q = min(pts, key=lambda p: (Vector((p.x, p.y - NECK_C.y, 0)).normalized() - Vector((math.sin(ar), -math.cos(ar), 0))).length)
        n, _ = nrm_at(q); n = Vector((n.x, n.y, max(n.z, -0.3))).normalized()
        R = 0.0105 if k == 2 else 0.0078
        M = frame(q + n*0.0020 + Vector((0, 0, -0.0005)), n, up=Vector((0, 0, 1)))
        pts_s = shell_outline(R)
        puffy(L['pearl'], [(x, z - R*0.0) for x, z in pts_s], R*0.30, Matrix.Translation(Vector((0, 0, -R*0.05))) @ Matrix.Identity(4), 0.5) if False else None
        sh = [(x, z) for x, z in pts_s]
        Ms = Matrix.Translation(Vector((0, 0, -0.0012)))
        puffy(L['pearl'], sh, R*0.30, Ms, 0.45)
        for j in range(5):
            aj = math.radians(36 + 108*j/4)
            tube_open(L['metal'], [Vector((0, -R*0.16, -0.0012 + 0.0004)), Vector((R*0.93*math.cos(aj), -R*0.16, -0.0012 + R*0.93*math.sin(aj) - R*0.55))], 0.0004, 3)
        L2 = Loc(); L2.b = L.b  # same buffers
        L.commit(P, M); L = Loc()
    return P, NECK_ATT()

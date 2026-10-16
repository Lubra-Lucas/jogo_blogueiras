"""Collection 2 - wrist + finger pieces (exec'd in build_jewelry.py namespace).
Limb frame: +X = dorsal, +Y = lateral, +Z = along the forearm towards the hand (see limb_frame / ring_attach)."""
LHAND = "mixamorig:LeftHand"
WR_ANCHOR = (0, 0, 0)


def ring_pts(s_pos, cl, n=56, z=0.0, off=0.0):
    c, au, al = wrist_measure(s_pos)
    return ell(au + cl, al + cl, n, z, off), au + cl, al + cl


def gravity_local():
    R = limb_frame(1, ARM[1][0], ARM[1][1] - ARM[1][0])
    return R.transposed() @ Vector((0, 0, -1))


# ------------------------------------------------------------------ 1 pearl bracelet
@piece("pearl_bracelet", "Pulseira de pérolas", "wrist", WR_ANCHOR, LHAND,
       "single strand of 5 mm pearls + gem clasp (ventral) and a crystal station (dorsal)", tags=["romantico", "gala", "rococo"], formality=0.75, rarity="comum",
       defaults={"pearl": "#fbf3e6", "gem": "#eaf2ff"})
def pearl_bracelet():
    P = Piece("pearl_bracelet")
    (pts, nr), a, b = ring_pts(0.912, 0.0030, 60)
    r = 0.0044
    n = int(poly_len(pts)/(2*r*1.03))
    rs = resample_n(pts, n)
    for i, (p, t) in enumerate(rs):
        if i == 0: continue
        sphere(P['pearl'], p, r, 8, 5)
    tube_closed(P['metal'], pts, 0.0008, 4)
    p0 = rs[0][0]; nn = Vector((1, 0, 0))
    gem_cut(P['gem'], p0 + nn*0.0014, 0.0050, 0.0050, 8, up=nn)
    torus_bm(P['metal'], p0 + nn*0.0004, 0.0054, 0.0011, Matrix.Rotation(math.pi/2, 4, 'Y'), 14, 4)
    pm = rs[n//2][0]
    box(P['metal'], pm, 0.0058, 0.0060, 0.0065)
    return P, wrist_attach(0.912)


# ------------------------------------------------------------------ 2 charm bracelet
def _ch_heart(L):
    puffy(L['metal'], heart_outline(0.0074), 0.0030, Matrix.Translation(Vector((0, 0, -0.0085))), 0.55)
    puffy(L['gem'], heart_outline(0.0050), 0.0042, Matrix.Translation(Vector((0, -0.0003, -0.0084))), 0.5)
def _ch_star(L):
    puffy(L['metal'], star_outline(0.0072, 0.0033), 0.0028, Matrix.Translation(Vector((0, 0, -0.0085))), 0.4)
    gem_cut(L['gem'], Vector((0, -0.0020, -0.0086)), 0.0020, 0.0024, 6, up=Vector((0, -1, 0)))
def _ch_bfly(L): butterfly(L, Matrix.Translation(Vector((0, 0, -0.0085))), 0.0078, 'gem', depth=0.34)
def _ch_bow(L): bow2(L, Matrix.Translation(Vector((0, 0, -0.0070))), 0.0070, 'ribbon', True, 0.30, False)
def _ch_flower(L):
    flower(L, Matrix.Translation(Vector((0, 0, -0.0085))), 0.0072, 6, 0.0028, 0.32, 'pearl', 'gem', 3, 0.5)
def _ch_key(L):
    torus_bm(L['metal'], Vector((0, 0, -0.0045)), 0.0028, 0.0008, Matrix.Rotation(math.pi/2, 4, 'X'), 10, 4)
    tube_open(L['metal'], [Vector((0, 0, -0.0072)), Vector((0, 0, -0.0150))], 0.0007, 4)
    for dz in (-0.0128, -0.0145): box(L['metal'], Vector((0.0014, 0, dz)), 0.0028, 0.0010, 0.0012)


@piece("charm_bracelet", "Pulseira de berloques", "wrist", WR_ANCHOR, LHAND,
       "link bracelet with 6 charms (heart, star, butterfly, bow, flower, key) hanging on the underside of the wrist (rest pose gravity)",
       tags=["y2k", "romantico", "casual"], formality=0.25, rarity="raro", defaults={"gem": "#c1121f", "ribbon": "#14213d", "pearl": "#fbf6ea"},
       mlabels={"gem": "Cristais"})
def charm_bracelet():
    P = Piece("charm_bracelet")
    (pts, nr), a, b = ring_pts(0.912, 0.0030, 56)
    rs = resample_n(pts, 36)
    chain_links(P['metal'], rs, 0.0078, 0.0046, 0.0007, 3, 6)
    g = gravity_local(); gp = Vector((g.x, g.y, 0)); gp = gp.normalized() if gp.length > 1e-4 else Vector((-1, 0, 0))
    th0 = math.atan2(gp.y*a, gp.x*b)
    charms = [_ch_heart, _ch_bow, _ch_star, _ch_flower, _ch_bfly, _ch_key]
    for k, fn in enumerate(charms):
        th = th0 + (k - 2.5)*0.27
        nn = Vector((math.cos(th)/a, math.sin(th)/b, 0)).normalized()
        p = Vector((a*math.cos(th), b*math.sin(th), 0)) + nn*0.0012
        d = (Vector((g.x, g.y, 0)).normalized()*1.0 + nn*0.35)
        d = (d - Vector((0, 0, 1))*d.dot(Vector((0, 0, 1)))).normalized()
        Zc = -d; Yc = -nn; Yc = (Yc - Zc*Yc.dot(Zc)).normalized(); Xc = Yc.cross(Zc)
        M = Matrix(((Xc.x, Yc.x, Zc.x, p.x), (Xc.y, Yc.y, Zc.y, p.y), (Xc.z, Yc.z, Zc.z, p.z), (0, 0, 0, 1)))
        L = Loc(); fn(L)
        torus_bm(L['metal'], Vector((0, 0, -0.0014)), 0.0020, 0.0006, Matrix.Rotation(math.pi/2, 4, 'X'), 8, 3)
        L.commit(P, M)
    return P, wrist_attach(0.912)


# ------------------------------------------------------------------ 3 watch
@piece("gold_watch", "Relógio dourado fofo", "wrist", WR_ANCHOR, LHAND,
       "link-strap wristwatch with a scalloped case, pearl dial and crystal bezel dots; face on the dorsal side, 10:10",
       tags=["gala", "casual", "romantico"], formality=0.7, rarity="raro", defaults={"pearl": "#fbf6ea", "gem": "#eaf2ff"}, mlabels={"pearl": "Mostrador"})
def gold_watch():
    P = Piece("gold_watch")
    (pts, nr), a, b = ring_pts(0.905, 0.0026, 64)
    rs = resample_n(pts, 30)
    # plates oriented along the local tangent
    for i, (p, t) in enumerate(rs):
        n = Vector((p.x/a**2, p.y/b**2, 0)).normalized()
        zax = Vector((0, 0, 1)); bx = t.normalized(); nx = n
        R = Matrix(((bx.x, zax.x, nx.x), (bx.y, zax.y, nx.y), (bx.z, zax.z, nx.z))).to_4x4()
        box(P['metal'], p, (poly_len(pts)/30)*0.90, 0.0105, 0.0022, R)
    # case on the dorsal side
    cx = a + 0.0050
    M = Matrix.Translation(Vector((cx, 0, 0))) @ Matrix.Rotation(math.pi/2, 4, 'Z')
    puffy(P['metal'], flower_outline(0.0148, 10, 2, 0.86), 0.0060, M, 0.92)
    puffy(P['pearl'], oval_outline(0.0112, 0.0112, 24), 0.0066, M @ Matrix.Translation((0, -0.0004, 0)), 0.97)
    for k in range(12):
        ang = 2*math.pi*k/12
        sphere(P['gem'], Vector((cx + 0.0036, 0.0124*math.cos(ang), 0.0124*math.sin(ang))), 0.0012, 6, 3)
    for k in (0, 3, 6, 9):
        ang = 2*math.pi*k/12
        sphere(P['metal'], Vector((cx + 0.0037, 0.0092*math.cos(ang), 0.0092*math.sin(ang))), 0.0011, 5, 3)
    for ang, L_ in ((math.radians(60), 0.0072), (math.radians(180), 0.0100)):   # hands (10:10)
        d = Vector((0, math.sin(ang), math.cos(ang)))
        tube_open(P['metal'], [Vector((cx + 0.0040, 0, 0)), Vector((cx + 0.0040, d.x*0 + d.y*L_, d.z*L_))], 0.0007, 4)
    sphere(P['metal'], Vector((cx + 0.0041, 0, 0)), 0.0018, 6, 4)
    sphere(P['metal'], Vector((cx - 0.0006, 0.0152, 0)), 0.0020, 6, 4, (0.8, 1.3, 1.0))   # crown button
    box(P['metal'], Vector((-(a + 0.0020), 0, 0)), 0.0050, 0.0075, 0.0130)               # clasp
    gem_cut(P['gem'], Vector((-(a + 0.0046), 0, 0)), 0.0030, 0.0030, 6, up=Vector((-1, 0, 0)))
    return P, wrist_attach(0.905)


# ------------------------------------------------------------------ 4 cuff
@piece("wide_cuff", "Bracelete largo", "wrist", WR_ANCHOR, LHAND,
       "open wide cuff (opening on the ventral side) with a raised centre band and 3 stones on the dorsal side",
       tags=["gala", "goth", "rococo"], formality=0.7, rarity="raro", metal="gold", defaults={"gem": "#0f9d6b"})
def wide_cuff():
    P = Piece("wide_cuff")
    c, au, al = wrist_measure(0.70)
    cl = 0.0030
    n = 34; pts = []; nrm = []
    for i in range(n+1):
        pass
    # opening centred at theta = pi (ventral): arc from -120..+120 deg around the dorsal point
    pts = []; nrm = []
    for i in range(n+1):
        th = math.radians(-125 + 250*i/n)
        pts.append(Vector(((au+cl)*math.cos(th), (al+cl)*math.sin(th), 0)))
        nrm.append(Vector((math.cos(th)/(au+cl), math.sin(th)/(al+cl), 0)).normalized())
    tube_e(P['metal'], pts, nrm, Vector((0, 0, 1)), 0.0135, 0.0022, 10, False)
    pts2 = [p + nn*0.0016 for p, nn in zip(pts, nrm)]
    tube_e(P['metal'], pts2, nrm, Vector((0, 0, 1)), 0.0055, 0.0020, 8, False)
    for th in (-0.42, 0.0, 0.42):
        nn = Vector((math.cos(th)/(au+cl), math.sin(th)/(al+cl), 0)).normalized()
        p = Vector(((au+cl)*math.cos(th), (al+cl)*math.sin(th), 0)) + nn*0.0030
        gem_cut(P['gem'], p + nn*0.0012, 0.0058 if th == 0 else 0.0045, 0.0050, 8, up=nn)
        torus_bm(P['metal'], p + nn*0.0004, 0.0063 if th == 0 else 0.0050, 0.0011, Vector((0, 0, 1)).rotation_difference(nn).to_matrix().to_4x4(), 14, 4)
    for sz in (-0.0120, 0.0120):                      # edge studs
        for th in [math.radians(x) for x in range(-110, 111, 22)]:
            nn = Vector((math.cos(th)/(au+cl), math.sin(th)/(al+cl), 0)).normalized()
            p = Vector(((au+cl)*math.cos(th), (al+cl)*math.sin(th), sz)) + nn*0.0018
            sphere(P['metal'], p, 0.0011, 5, 3)
    return P, wrist_attach(0.70)


# ------------------------------------------------------------------ 5 y2k beaded bracelet
@piece("y2k_bead_bracelet", "Pulseira de miçangas Y2K", "wrist", WR_ANCHOR, LHAND,
       "two stretch strands of mixed beads with star and heart beads", tags=["y2k", "praia", "casual"], formality=0.05, rarity="comum", metal="silver",
       defaults={"gem": "#2ec4b6", "pearl": "#f7f1e3", "ribbon": "#ff7a1a"}, mlabels={"gem": "Contas de vidro", "pearl": "Contas brancas", "ribbon": "Contas foscas"})
def y2k_bead_bracelet():
    P = Piece("y2k_bead_bracelet")
    for sz, off in ((-0.0036, 0), (0.0040, 3)):
        (pts, nr), a, b = ring_pts(0.915, 0.0034, 56, sz)
        tube_closed(P['metal'], pts, 0.0004, 3)
        rs = resample_n(pts, 22)
        kinds = ['gem', 'pearl', 'ribbon', 'metal', 'star', 'gem', 'ribbon', 'pearl', 'heart', 'metal']
        for i, (p, t) in enumerate(rs):
            k = kinds[(i + off) % 10]
            n = Vector((p.x/a**2, p.y/b**2, 0)).normalized()
            if k == 'gem': sphere(P['gem'], p, 0.0038, 8, 4)
            elif k == 'pearl': sphere(P['pearl'], p, 0.0034, 8, 4)
            elif k == 'ribbon': tube_open(P['ribbon'], [p - t*0.0018, p + t*0.0018], 0.0036, 8)
            elif k == 'metal': sphere(P['metal'], p, 0.0022, 6, 4)
            elif k == 'star':
                Lq = Loc(); puffy(Lq['metal'], star_outline(0.0056, 0.0026), 0.0026, Matrix.Identity(4), 0.4)
                Lq.commit(P, frame(p + n*0.0012, n, up=Vector((0, 0, 1))))
            else:
                Lq = Loc(); puffy(Lq['gem'], heart_outline(0.0056), 0.0034, Matrix.Identity(4), 0.5)
                Lq.commit(P, frame(p + n*0.0012, n, up=Vector((0, 0, 1))))
    return P, wrist_attach(0.915)


# ================================================================ rings
def _ring_base(P, name, w, thick, extra=0.0009):
    ra = ring_attach(name)
    rad = FINGER_R[(1, name)]; Rr = rad + extra
    ring_band(P['metal'], Vector((0, 0, 0)), None, Rr + 0.0006, w, thick, 24)
    return ra, Rr


def _flat_to_back(c):
    return Matrix.Translation(c) @ Matrix.Rotation(-math.pi/2, 4, 'Z')


@piece("pearl_ring", "Anel de pérola", "finger", WR_ANCHOR, "mixamorig:LeftHandIndex1",
       "gold band with a big pearl in a bezel cup and two crystal shoulders", tags=["gala", "romantico", "rococo"], formality=0.7, rarity="comum",
       finger="Index", defaults={"pearl": "#fbf3e6", "gem": "#eaf2ff"})
def pearl_ring():
    P = Piece("pearl_ring")
    ra, Rr = _ring_base(P, "Index", 0.0038, 0.0015)
    c = Vector((Rr + 0.0078, 0, 0))
    sphere(P['pearl'], c, 0.0074, 12, 8)
    cone(P['metal'], Vector((Rr + 0.0004, 0, 0)), c + Vector((-0.0030, 0, 0)), 0.0046, 8)
    torus_bm(P['metal'], c - Vector((0.0030, 0, 0)), 0.0058, 0.0010, Matrix.Rotation(math.pi/2, 4, 'Y'), 14, 4)
    for sz in (-0.0042, 0.0042):
        gem_cut(P['gem'], Vector((Rr + 0.0012, 0, sz*1.0)) + Vector((0.0004, 0.0, 0)), 0.0021, 0.0022, 6, up=Vector((1, 0, 0)))
    return P, ra


@piece("star_ring", "Anel de estrela", "finger", WR_ANCHOR, "mixamorig:LeftHandPinky1",
       "dainty star on a thin band, gem centre", tags=["y2k", "casual", "romantico"], formality=0.2, rarity="comum",
       finger="Pinky", defaults={"gem": "#eaf2ff"}, metal="gold")
def star_ring():
    P = Piece("star_ring")
    ra, Rr = _ring_base(P, "Pinky", 0.0030, 0.0012)
    c = Vector((Rr + 0.0050, 0, 0))
    M = _flat_to_back(c)
    puffy(P['metal'], star_outline(0.0068, 0.0030), 0.0030, M, 0.4)
    gem_cut(P['gem'], c + Vector((0.0014, 0, 0)), 0.0020, 0.0024, 6, up=Vector((1, 0, 0)))
    tube_open(P['metal'], [Vector((Rr + 0.0006, 0, 0)), Vector((Rr + 0.0030, 0, 0))], 0.0012, 4)
    return P, ra


@piece("solitaire_ring", "Anel solitário", "finger", WR_ANCHOR, "mixamorig:LeftHandRing1",
       "six-prong brilliant solitaire on a slim band", tags=["gala", "romantico"], formality=0.95, rarity="épico",
       finger="Ring", metal="silver", defaults={"gem": "#eaf2ff"})
def solitaire_ring():
    P = Piece("solitaire_ring")
    ra, Rr = _ring_base(P, "Ring", 0.0028, 0.0013)
    c = Vector((Rr + 0.0070, 0, 0))
    gem_cut(P['gem'], c, 0.0062, 0.0072, 10, up=Vector((1, 0, 0)))
    for k in range(6):
        a = 2*math.pi*k/6 + 0.3
        tube_open(P['metal'], [Vector((Rr + 0.0004, 0.0016*math.cos(a), 0.0016*math.sin(a))),
                               c + Vector((-0.0006, 0.0060*math.cos(a), 0.0060*math.sin(a))), c + Vector((0.0016, 0.0058*math.cos(a), 0.0058*math.sin(a)))], 0.0007, 4)
    for sz in (-0.0038, 0.0038):
        gem_cut(P['gem'], Vector((Rr + 0.0016, 0, sz)), 0.0016, 0.0017, 6, up=Vector((1, 0, 0)))
    return P, ra


@piece("stacked_ring", "Anel duplo empilhado", "finger", WR_ANCHOR, "mixamorig:LeftHandMiddle1",
       "two stacked bands: one plain, one pavé, joined by a bridge bar and a tiny heart", tags=["casual", "romantico", "y2k"], formality=0.35, rarity="comum",
       finger="Middle", defaults={"gem": "#eaf2ff"}, metal="rosegold")
def stacked_ring():
    P = Piece("stacked_ring")
    ra = ring_attach("Middle"); rad = FINGER_R[(1, "Middle")]; Rr = rad + 0.0009
    ring_band(P['metal'], Vector((0, 0, -0.0032)), None, Rr + 0.0006, 0.0026, 0.0013, 24)
    ring_band(P['metal'], Vector((0, 0, 0.0032)), None, Rr + 0.0006, 0.0026, 0.0014, 24)
    for k in range(9):
        a = math.radians(-70 + 140*k/8)
        p = Vector(((Rr + 0.0013)*math.cos(a), (Rr + 0.0013)*math.sin(a), 0.0032))
        gem_cut(P['gem'], p, 0.0016, 0.0017, 6, up=Vector((math.cos(a), math.sin(a), 0)))
    tube_open(P['metal'], [Vector((Rr + 0.0010, 0, -0.0032)), Vector((Rr + 0.0010, 0, 0.0032))], 0.0012, 4)
    M = _flat_to_back(Vector((Rr + 0.0048, 0, 0)))
    puffy(P['metal'], heart_outline(0.0050), 0.0026, M, 0.55)
    return P, ra


# ================================================================ hand chain
@piece("hand_chain", "Luva-pulseira delicada", "wrist", WR_ANCHOR, LHAND,
       "slave bracelet: fine wrist chain + 3 chains over the back of the hand ending in rings on index/middle/ring fingers",
       tags=["gala", "goth", "y2k"], formality=0.7, rarity="épico", metal="silver", defaults={"gem": "#eaf2ff"})
def hand_chain():
    P = Piece("hand_chain")
    s_pos = 0.93; c, au, al = wrist_measure(s_pos)
    cl = 0.0026
    h, t = ARM[1]; Rw = limb_frame(1, h, t - h); Wl = Matrix.Translation(c).to_4x4() @ Rw.to_4x4(); Wi = Wl.inverted()
    # wrist chain
    pts, nr = ell(au + cl, al + cl, 40, 0, 0.0)
    tube_closed(P['metal'], pts, 0.0008, 4)
    rs = resample_n(pts, 20)
    for p, tg in rs: sphere(P['metal'], p, 0.0016, 5, 3)
    d0 = Vector((au + cl + 0.0016, 0, 0))
    gem_cut(P['gem'], d0 + Vector((0.0016, 0, 0)), 0.0038, 0.0040, 6, up=Vector((1, 0, 0)))
    torus_bm(P['metal'], d0 + Vector((0.0006, 0, 0)), 0.0042, 0.0009, Matrix.Rotation(math.pi/2, 4, 'Y'), 12, 4)
    # finger rings + chains
    for k, name in enumerate(("Index", "Middle", "Ring")):
        mid, fax, rad = finger_info(1, name)
        dors = Vector((0.74, 0, 0.67)); dors = (dors - fax*dors.dot(fax)).normalized(); y = fax.cross(dors)
        Rf = Matrix(((dors.x, y.x, fax.x), (dors.y, y.y, fax.y), (dors.z, y.z, fax.z)))
        Wf = Matrix.Translation(mid) @ Rf.to_4x4()
        Lq = Loc()
        Rr = rad + 0.0009
        ring_band(Lq['metal'], Vector((0, 0, 0)), None, Rr + 0.0006, 0.0022, 0.0012, 20)
        gem_cut(Lq['gem'], Vector((Rr + 0.0030, 0, 0)), 0.0021, 0.0022, 6, up=Vector((1, 0, 0)))
        Lq.commit(P, Wi @ Wf)
        top_w = mid + dors*(Rr + 0.0016)
        start_w = c + Rw @ Vector((au + cl + 0.0016, (k-1)*0.0075, 0))
        pw = []
        for j in range(15):
            u = j/14
            q = start_w*(1-u) + top_w*u
            q = conform(q, 0.0030 + 0.0010*math.sin(math.pi*u), [TREES[0]])
            pw.append(Wi @ q)
        tube_open(P['metal'], pw, 0.0006, 3)
        for j in range(2, 14, 3): sphere(P['metal'], pw[j], 0.0013, 5, 3)
        if k == 1:
            mq = pw[7]
            nrm_l = Vector((1, 0, 0))
            puffy(P['metal'], star_outline(0.0055, 0.0025), 0.0022, Matrix.Translation(mq + Vector((0.0012, 0, 0))) @ Matrix.Rotation(math.pi/2, 4, 'Z'), 0.4)
    return P, wrist_attach(0.93)

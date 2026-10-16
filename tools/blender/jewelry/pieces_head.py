"""Collection 2 - head pieces (exec'd in build_jewelry.py namespace). Anchor = HEAD_C on the Head bone.
Every piece declares `mount` (Blender-space direction); hair_fit.py measures the hair thickness there -> jewelry.json hairFit.lift."""
HEAD_ATT = lambda: [("mixamorig:Head", HEAD_C, Matrix.Identity(3))]
UPV = Vector((0, -0.30, 1)).normalized()


def head_arc(U, a0, a1, N, off):
    X = Vector((1, 0, 0)); base = []; nrm = []
    for i in range(N+1):
        a = math.radians(a0 + (a1-a0)*i/N)
        p, n = skull_hit(X*math.sin(a) + U*math.cos(a), HEAD_C, off)
        base.append(p); nrm.append(n)
    return base, nrm


def head_ring(el, N, off, az0=0.0):
    base = []; nrm = []
    for i in range(N):
        p, n = skull_hit(head_dir(az0 + 360.0*i/N, el), HEAD_C, off)
        base.append(p); nrm.append(n)
    return base, nrm


def up_in_plane(n, ref=Vector((0, 0, 1))):
    u = ref - n*ref.dot(n); return u.normalized() if u.length > 1e-6 else Vector((0, 1, 0))


def mk(bm_fn, slot, P, M=None):
    bm = bmesh.new(); bm_fn(bm)
    if M is not None: xf(bm, M)
    tmp = bpy.data.meshes.new("t"); bm.to_mesh(tmp); bm.free(); P[slot].from_mesh(tmp); bpy.data.meshes.remove(tmp)


# ============================================================== 1 pearl tiara
@piece("pearl_tiara", "Tiara de pérolas", "head", HEAD_C, "mixamorig:Head",
       "thin band + pearl sprays rising from it; see hairFit", tags=["gala", "romantico", "rococo"], formality=0.95, rarity="épico",
       mount=(0, -0.62, 0.78), defaults={"gem": "#eaf2ff", "pearl": "#fbf3e6"}, metal="silver")
def pearl_tiara():
    P = Piece("pearl_tiara")
    U = Vector((0, -0.62, 0.78)).normalized(); N = 32
    base, nrm = head_arc(U, -72, 72, N, HAIR_OFF)
    w = 0.0050; th = 0.0018
    strip(P['metal'], base, nrm, UPV, w, th, False)
    prof = lambda t: 0.004 + 0.020*max(0.0, math.cos((t-0.5)*math.pi))**1.5
    for i in range(1, N, 1):
        t = i/N; h = prof(t); b = base[i] + UPV*(w/2)
        if i % 2 == 0:
            tip = b + UPV*h
            tube_open(P['metal'], [b, tip], 0.0007, 3)
            sphere(P['pearl'], tip + UPV*(0.0026 + h*0.10), 0.0030 + h*0.12, 8, 5)
        else:
            gem_cut(P['gem'], b + UPV*0.0016, 0.0020, 0.0022, 6, up=nrm[i])
    c = N//2
    cp = base[c] + UPV*(w/2 + 0.0055) + nrm[c]*0.0040
    sphere(P['pearl'], cp + UPV*0.0035, 0.0100, 12, 7)
    gem_cut(P['gem'], cp + UPV*0.0165, 0.0036, 0.0045, 6, up=UPV)
    for i in range(2, N-1, 2):
        sphere(P['pearl'], base[i] - UPV*(w/2 + 0.0014) + nrm[i]*0.0008, 0.0024, 6, 4)
    return P, HEAD_ATT()


# ============================================================== 2 queen crown
@piece("queen_crown", "Coroa de rainha", "head", HEAD_C, "mixamorig:Head",
       "closed circlet (el 38 deg) with 8 peaks, 4 arches meeting at an orb; ring follows the scalp+10mm",
       tags=["gala", "rococo"], formality=1.0, rarity="lendário", mount=head_dir(0, 50), defaults={"gem": "#c1121f"})
def queen_crown():
    P = Piece("queen_crown")
    N = 48
    base, nrm = head_ring(36, N, HAIR_OFF + 0.002)
    ups = [up_in_plane(n) for n in nrm]
    w = 0.0165; th = 0.0030
    strip(P['metal'], base, nrm, ups, w, th, True)
    # trims (pearl line + gems)
    for i in range(N):
        sphere(P['pearl'], base[i] + ups[i]*(-w/2 + 0.0016) + nrm[i]*0.0018, 0.0020, 6, 4) if i % 2 == 0 else None
    for i in range(0, N, 6):
        gem_cut(P['gem'], base[i] + nrm[i]*0.0022, 0.0048, 0.0052, 6, up=nrm[i])
        torus_bm(P['metal'], base[i] + nrm[i]*0.0014, 0.0054, 0.0008, Vector((0, 0, 1)).rotation_difference(nrm[i]).to_matrix().to_4x4(), 10, 4)
    tops = []
    for k in range(8):
        i = k*6; tall = (k % 2 == 0)
        b = base[i] + ups[i]*(w/2)
        h = 0.026 if tall else 0.015
        tip = b + ups[i]*h + nrm[i]*(-0.001)
        cone(P['metal'], b + ups[i]*(-0.002), tip, 0.0062 if tall else 0.0046, 6)
        sphere(P['pearl'], tip + ups[i]*0.0030, 0.0036 if tall else 0.0028, 8, 5)
        if tall: tops.append(tip + ups[i]*0.0010)
    # arches to the orb
    T, _ = skull_hit(Vector((0, -0.05, 1)), HEAD_C, HAIR_OFF + 0.040)
    for tp in tops:
        mid = (tp + T)*0.5 + Vector((0, 0, 0.012))
        arc = [(tp*(1-u)**2 + mid*2*u*(1-u) + T*u*u) for u in [k/10 for k in range(11)]]
        tube_open(P['metal'], arc, 0.0016, 5)
        sphere(P['pearl'], arc[5], 0.0025, 6, 4)
    sphere(P['metal'], T + Vector((0, 0, 0.003)), 0.0065, 10, 6)
    gem_cut(P['gem'], T + Vector((0, 0, 0.0095)), 0.0045, 0.006, 6, up=Z)
    return P, HEAD_ATT()


# ============================================================== 3 flower crown
@piece("flower_crown", "Coroa de flores", "head", HEAD_C, "mixamorig:Head",
       "vine ring (el 40 deg) with daisies, buds and leaves", tags=["praia", "romantico", "casual"], formality=0.2, rarity="comum",
       mount=(0, -0.45, 0.85), defaults={"pearl": "#fbf6ea", "gem": "#f2b830", "ribbon": "#4f7f45"},
       mlabels={"pearl": "Pétalas", "gem": "Miolo", "ribbon": "Folhas"})
def flower_crown():
    P = Piece("flower_crown")
    N = 44
    base, nrm = head_ring(40, N, HAIR_OFF + 0.0035)
    tube_closed(P['ribbon'], base, 0.0020, 4)
    L = Loc()
    for k in range(12):
        i = int(k*N/12); n = nrm[i]; up = up_in_plane(n)
        R = (0.0125, 0.0092, 0.0105)[k % 3] if k % 5 else 0.0150
        M = frame(base[i] + n*(R*0.2), n, up=up) @ Matrix.Rotation(k*0.7, 4, 'Y')
        flower(L, M, R, 6 if k % 2 else 7, R*0.34, 0.30, 'pearl', 'gem', 2, 0.5)
        j = (i + N//24 + 1) % N                      # bud / leaves between flowers
        M2 = frame(base[j], nrm[j], up=up_in_plane(nrm[j]))
        add_to(L, 'ribbon', lambda bm: puffy(bm, leaf_outline(0.017, 0.0075, 8), 0.0020, Matrix.Translation(Vector((0.0095, 0, 0.0))) @ Matrix.Rotation(1.2, 4, 'Y'), 0.5), M2)
        add_to(L, 'ribbon', lambda bm: puffy(bm, leaf_outline(0.017, 0.0075, 8), 0.0020, Matrix.Translation(Vector((-0.0095, 0, 0.0))) @ Matrix.Rotation(-1.2, 4, 'Y'), 0.5), M2)
        sphere(L['gem'], base[j] + nrm[j]*0.0050, 0.0038, 6, 4)
    L.commit(P)
    return P, HEAD_ATT()


# ============================================================== 4 padded headband
def band_over_head(P, slot, U, a0, a1, N, off, wid, thick, rseg=10):
    base, nrm = head_arc(U, a0, a1, N, off)
    Wd = Vector((1, 0, 0)).cross(U).normalized()
    tube_e(P[slot], base, nrm, Wd, wid, thick, rseg, False)
    return base, nrm, Wd


@piece("padded_headband", "Arco de cabelo acolchoado", "head", HEAD_C, "mixamorig:Head",
       "plush padded hairband from ear to ear, sits on the hair volume (hairFit)", tags=["casual", "romantico", "esportivo"], formality=0.3, rarity="comum",
       mount=head_dir(0, 58), defaults={"ribbon": "#1a1a1f", "gem": "#eaf2ff"}, mlabels={"ribbon": "Cetim acolchoado"})
def padded_headband():
    P = Piece("padded_headband")
    U = Vector((0, -0.22, 0.975)).normalized(); N = 40
    wid = [0.0085 + 0.0050*math.sin(math.pi*i/N) for i in range(N+1)]
    thk = [0.0050 + 0.0025*math.sin(math.pi*i/N) for i in range(N+1)]
    base, nrm = head_arc(U, -86, 86, N, HAIR_OFF + 0.0045)
    Wd = Vector((1, 0, 0)).cross(U).normalized()
    tube_e(P['ribbon'], base, nrm, Wd, wid, thk, 10, False)
    for i in (5, N-5):                             # little gem studs on the sides
        n = nrm[i]
        gem_cut(P['gem'], base[i] + n*(thk[i]+0.0004), 0.0036, 0.0040, 6, up=n)
        torus_bm(P['metal'], base[i] + n*(thk[i]-0.0003), 0.0040, 0.0007, Vector((0, 0, 1)).rotation_difference(n).to_matrix().to_4x4(), 10, 4)
    return P, HEAD_ATT()


# ============================================================== 5 pearl headband
@piece("pearl_headband", "Arco com pérolas", "head", HEAD_C, "mixamorig:Head",
       "thin metal hairband carrying a graduated row of pearls with crystal spacers", tags=["romantico", "gala", "rococo"], formality=0.8, rarity="raro",
       mount=head_dir(0, 58), defaults={"pearl": "#fbf3e6", "gem": "#eaf2ff"})
def pearl_headband():
    P = Piece("pearl_headband")
    U = Vector((0, -0.22, 0.975)).normalized(); N = 34
    base, nrm = head_arc(U, -84, 84, N, HAIR_OFF + 0.0040)
    tube_open(P['metal'], base, 0.0013, 4)
    for i in range(1, N):
        t = i/N; r = 0.0036 + 0.0034*math.cos((t-0.5)*math.pi)**1.6
        p = base[i] + nrm[i]*(r*0.55)
        if i % 2 == 1: sphere(P['pearl'], p, r, 9, 6)
        else: gem_cut(P['gem'], p, 0.0021, 0.0022, 6, up=nrm[i])
    return P, HEAD_ATT()


# ============================================================== 6 butterfly clips
@piece("butterfly_clips", "Presilhas de borboleta", "head", HEAD_C, "mixamorig:Head",
       "pair: two butterflies (big+small) clipped each side of the crown (right side = mirror)", tags=["y2k", "romantico", "praia"], formality=0.2, rarity="comum",
       mount=head_dir(58, 40), defaults={"gem": "#2a4fb8"}, metal="silver", mlabels={"gem": "Asas"})
def butterfly_clips():
    P = Piece("butterfly_clips")
    L = Loc()
    for az, el, s, rot in ((52, 44, 0.0185, 0.35), (72, 30, 0.0125, -0.5)):
        c, n = skull_hit(head_dir(az, el), HEAD_C, HAIR_OFF + 0.0035)
        M = frame(c, n, up=Vector((0.3, 0, 1))) @ Matrix.Rotation(rot, 4, 'Y')
        butterfly(L, M, s, 'gem', depth=0.34)
        add_to(L, 'metal', lambda bm: tube_open(bm, [Vector((-s*1.0, s*0.35, 0)), Vector((s*0.8, s*0.35, 0))], 0.0009, 4), M)
    L.mirror_copy = None
    L2 = Loc()
    for s_ in SLOTS:       # copy the right side into L2 before mirroring
        bmx = L.b[s_].copy(); L2.b[s_].free(); L2.b[s_] = bmx
    L2.mirror()
    L.commit(P); L2.commit(P)
    return P, HEAD_ATT()


# ============================================================== 7 claw clip
@piece("claw_clip", "Piranha de cabelo", "head", HEAD_C, "mixamorig:Head",
       "tortoiseshell claw clip on the back of the head (curved to the skull)", tags=["casual", "y2k", "esportivo"], formality=0.15, rarity="comum",
       mount=head_dir(180, 30), defaults={"gem": "#8a4b1f"}, metal="gold", mlabels={"gem": "Acetato"})
def claw_clip():
    P = Piece("claw_clip")
    c, n = skull_hit(head_dir(180, 26), HEAD_C, HAIR_OFF + 0.0075)
    M = frame(c, n, up=Vector((0, 0, 1)))
    L = Loc()
    sag = lambda x: 0.0095*(x/0.040)**2
    xs = [-0.042 + 0.084*k/12 for k in range(13)]
    for zc in (0.0165, -0.0165):
        pts = [Vector((x, sag(x), zc)) for x in xs]
        nr = [Vector((0, -1, 0))]*len(pts)
        tube_e(L['gem'], pts, nr, Vector((0, 0, 1)), 0.0095, 0.0052, 8, False)
    for k in range(10):
        x = -0.0378 + 0.0756*k/9
        for sgn, off in ((1, 0.0), (-1, 0.0038)):
            xx = x + (off if sgn < 0 else 0)
            cone(L['gem'], Vector((xx, sag(xx), sgn*0.0110)), Vector((xx, sag(xx) - 0.0005, sgn*0.0010)), 0.0027, 5)
    for sx in (-0.046, 0.046):
        sphere(L['metal'], Vector((sx, sag(sx) - 0.001, 0)), 0.0042, 8, 5, (1, 0.7, 1.6))
    tube_open(L['metal'], [Vector((-0.040, sag(0.04) + 0.0045, 0.0)), Vector((0.040, sag(0.04) + 0.0045, 0.0))], 0.0021, 6)
    for z in (0.0165, -0.0165): sphere(L['metal'], Vector((0, -0.0055, z)), 0.0030, 6, 4)
    L.commit(P, M)
    return P, HEAD_ATT()


# ============================================================== 8 giant bow
@piece("giant_bow", "Laço gigante", "head", HEAD_C, "mixamorig:Head",
       "oversized double-loop satin bow at the front of the crown with a crystal knot (comb behind)", tags=["romantico", "casual", "y2k"], formality=0.45, rarity="raro",
       mount=head_dir(10, 62), defaults={"ribbon": "#1a1a1f", "gem": "#eaf2ff"}, mlabels={"ribbon": "Cetim"})
def giant_bow():
    P = Piece("giant_bow")
    c, n = skull_hit(head_dir(10, 64), HEAD_C, HAIR_OFF + 0.012)
    M0 = frame(c, n, up=Vector((0, 0.35, 1)))
    L = Loc()
    bow2(L, Matrix.Translation(Vector((0, 0, 0.0))), 0.072, "ribbon", True, 0.30, False)
    # inner loops for volume
    for sx in (1, -1):
        puffy(L['ribbon'], [(sx*x*0.072*0.62, z*0.072*0.62) for x, z in [(0.0, 0.0), (0.15, 0.30), (0.55, 0.55), (0.92, 0.40), (1.0, 0.0), (0.92, -0.40), (0.55, -0.55), (0.15, -0.30)]],
              0.0060, Matrix.Translation(Vector((sx*0.004, -0.0065, 0.0))) @ Matrix.Rotation(-sx*0.10, 4, 'Z'), 0.6)
    sphere(L['ribbon'], Vector((0, -0.013, 0)), 0.0125, 12, 7, (1.0, 0.8, 1.15))
    gem_cut(L['gem'], Vector((0, -0.0225, 0)), 0.0075, 0.0095, 8, up=Vector((0, -1, 0)))
    torus_bm(L['metal'], Vector((0, -0.0200, 0)), 0.0080, 0.0014, Matrix.Rotation(math.pi/2, 4, 'X'), 16, 4)
    for z in (-0.007, 0.007): tube_open(L['metal'], [Vector((-0.020, 0.0115, z)), Vector((0.020, 0.0115, z))], 0.0014, 4)
    L.commit(P, M0)
    return P, HEAD_ATT()


# ============================================================== 9 pearl veil
@piece("pearl_veil", "Véu curto com pérolas", "head", HEAD_C, "mixamorig:Head",
       "birdcage-style net draped over the back of the crown, pearls on the lower edge, flower comb at the top",
       tags=["gala", "romantico", "rococo"], formality=0.95, rarity="épico", mount=head_dir(180, 52),
       defaults={"ribbon": "#f3ead7", "pearl": "#fbf3e6", "gem": "#eaf2ff"}, mlabels={"ribbon": "Tule"})
def pearl_veil():
    P = Piece("pearl_veil")
    NU, NV = 13, 9
    G = [[None]*NV for _ in range(NU)]
    for i in range(NU):
        u = -1 + 2*i/(NU-1)
        for j in range(NV):
            v = j/(NV-1)
            az = 180 + u*72*(0.78 + 0.22*v); el = 68 - v*78
            off = HAIR_OFF + 0.014 + 0.010*math.sin(math.pi*v*0.7)
            G[i][j], _ = skull_hit(head_dir(az, el), HEAD_C, off)
    for i in range(NU):
        tube_open(P['ribbon'], G[i], 0.0005, 3)
    for j in range(NV):
        tube_open(P['ribbon'], [G[i][j] for i in range(NU)], 0.0005, 3)
    for i in range(NU):
        sphere(P['pearl'], G[i][NV-1] + Vector((0, 0, -0.0022)), 0.0034, 7, 4)
        for j in (2, 5):
            if (i + j) % 2 == 0: sphere(P['pearl'], G[i][j], 0.0024, 6, 4)
    top = G[NU//2][0]
    n, _ = nrm_at(top, [HEADTREE])
    M = frame(top + n*0.003, n, up=Vector((0, 0, 1)))
    L = Loc()
    flower(L, Matrix.Identity(4), 0.0125, 6, 0.0040, 0.32, 'pearl', 'gem', 3, 0.5)
    for sx in (-1, 1): flower(L, Matrix.Translation(Vector((sx*0.0125, 0.001, -0.0035))), 0.0075, 6, 0.0030, 0.3, 'pearl', 'gem', 3, 0.5)
    L.commit(P, M)
    return P, HEAD_ATT()


# ============================================================== 10 star diadem
@piece("star_diadem", "Diadema de estrelas", "head", HEAD_C, "mixamorig:Head",
       "band with 7 stars (centre star biggest), thin connecting arches", tags=["y2k", "gala", "romantico"], formality=0.8, rarity="raro",
       mount=(0, -0.62, 0.78), metal="silver", defaults={"gem": "#eaf2ff"})
def star_diadem():
    P = Piece("star_diadem")
    U = Vector((0, -0.62, 0.78)).normalized(); N = 32
    base, nrm = head_arc(U, -72, 72, N, HAIR_OFF)
    w = 0.0060; th = 0.0020
    strip(P['metal'], base, nrm, UPV, w, th, False)
    idx = [4, 8, 12, 16, 20, 24, 28]
    sizes = [0.0095, 0.0125, 0.0160, 0.0230, 0.0160, 0.0125, 0.0095]
    for i, R in zip(idx, sizes):
        n = nrm[i]
        c = base[i] + UPV*(w/2 + R*0.95) + n*0.0016
        M = frame(c, (n*1.0 + UPV*0.55).normalized(), up=UPV)
        puffy(P['metal'], star_outline(R, R*0.46), R*0.30, M, 0.4)
        L = Loc(); gem_cut(L['gem'], Vector((0, -R*0.20, 0)), R*0.26, R*0.30, 6, up=Vector((0, -1, 0)))
        L.commit(P, M)
        tube_open(P['metal'], [base[i], c - UPV*R*0.7], 0.0008, 3)
    for a, b in zip(idx[:-1], idx[1:]):
        arc = []
        for k in range(7):
            u = k/6; i = a + (b-a)*u; ia = int(math.floor(i)); ib = min(ia+1, N); f = i-ia
            arc.append(base[ia]*(1-f) + base[ib]*f + UPV*(w/2 + 0.004 + 0.007*math.sin(math.pi*u)))
        tube_open(P['metal'], arc, 0.0008, 3)
        sphere(P['gem'], arc[3] + UPV*0.0005, 0.0022, 6, 4)
    return P, HEAD_ATT()


# ============================================================== extra: pearl hairpins
@piece("pearl_hairpins", "Grampos de pérola", "head", HEAD_C, "mixamorig:Head",
       "5 bobby-pin style grampos with pearl / flower heads fanned on the right-front of the scalp", tags=["romantico", "gala", "casual"], formality=0.7, rarity="comum",
       mount=head_dir(-45, 50), defaults={"pearl": "#fbf3e6", "gem": "#eaf2ff"})
def pearl_hairpins():
    P = Piece("pearl_hairpins")
    spots = [(-30, 56, 0.0), (-42, 50, 0.5), (-54, 44, -0.4), (-38, 64, 0.2), (-60, 58, 0.7)]
    for k, (az, el, rot) in enumerate(spots):
        c, n = skull_hit(head_dir(az, el), HEAD_C, HAIR_OFF + 0.003)
        M0 = frame(c, n, up=Vector((0, 0, 1))) @ Matrix.Rotation(rot, 4, 'Y')
        L = Loc()
        tube_open(L['metal'], [Vector((-0.020, 0.0025, 0)), Vector((0.006, 0.0025, 0))], 0.0009, 4)
        tube_open(L['metal'], [Vector((-0.020, 0.0025, 0.0030)), Vector((0.006, 0.0025, 0.0030))], 0.0009, 4)
        if k % 2 == 0:
            sphere(L['pearl'], Vector((0.008, -0.0030, 0.0015)), 0.0062, 10, 6)
            sphere(L['metal'], Vector((0.008, 0.0004, 0.0015)), 0.0030, 6, 4, (1, 0.6, 1))
        else:
            flower(L, Matrix.Translation(Vector((0.008, -0.0010, 0.0015))), 0.0085, 6, 0.0030, 0.32, 'pearl', 'gem', 2, 0.5)
        L.commit(P, M0)
    return P, HEAD_ATT()


# ============================================================== extra: boho head chain
@piece("head_chain", "Corrente de cabelo", "head", HEAD_C, "mixamorig:Head",
       "festival head chain: fine chain along the parting, side swags and a gem drop at the hairline", tags=["goth", "gala", "y2k"], formality=0.65, rarity="raro",
       mount=head_dir(0, 58), metal="gold", defaults={"gem": "#c1121f", "pearl": "#fbf3e6"})
def head_chain():
    P = Piece("head_chain")
    U = Vector((0, -0.30, 0.95)).normalized(); N = 30
    base, nrm = head_arc(U, -84, 84, N, HAIR_OFF + 0.0025)
    tube_open(P['metal'], base, 0.0008, 3)
    for i in range(0, N+1, 3): sphere(P['metal'], base[i], 0.0016, 5, 3)
    for i in (5, N-5):                                  # side swags to small gems
        sphere(P['pearl'], base[i] + nrm[i]*0.0026, 0.0030, 7, 4)
    c = N//2
    # centre drop towards the forehead hairline
    d0 = base[c]; fwd = Vector((0, -0.8, -0.6)).normalized()
    drop = [d0 + fwd*0.0016*0 + Vector((0, -0.0075*k, -0.0045*k)) for k in range(0, 5)]
    tube_open(P['metal'], drop, 0.0007, 3)
    g = drop[-1] + Vector((0, -0.0030, -0.0070))
    gem_cut(P['gem'], g, 0.0046, 0.0105, 8, up=Vector((0, 0, 1)))
    torus_bm(P['metal'], drop[-1] + Vector((0, -0.0012, -0.0016)), 0.0024, 0.0007, Matrix.Rotation(math.pi/2, 4, 'X'), 8, 3)
    sphere(P['metal'], d0 + nrm[c]*0.0020, 0.0042, 6, 4)
    return P, HEAD_ATT()

"""Accessories round 3 - slot 'hat' (exec'd in build_jewelry.py namespace). Anchor = HEAD_C on the Head bone (same as the head jewelry).
Covering hats declare `hairClip` (ellipsoid to squeeze the hair into); every hat also has hairMount (lift fallback, see hair_fit.py).
Material slots for hats: ribbon = main fabric / straw / felt, pearl = band / trim / cuff, gem = accents, metal = hardware."""
FELT = {"ribbon": dict(rough=0.82, sheen=0.0, sheen_rough=0.5), "pearl": dict(rough=0.5, coat=0.0, sheen=0.0, sheen_rough=0.4, sheen_tint="#ffffff")}
HAT_LAB = {"ribbon": "Tecido", "pearl": "Fita", "gem": "Detalhe"}
HAT_TOP = head_dir(0, 78)


def crown_specs(z0, d0, d1=None, n=6, fn=None, top=None, ztop=1.575, cap_n=5, sq=1.0):
    d1 = d0 if d1 is None else d1
    sp = []
    for i in range(n):
        z = z0 + (ztop - z0)*i/(n-1); t = (z - z0)/(ztop - z0); d = d0 + (d1 - d0)*t
        zz, a, b, cy = sk_ring(z, d); sp.append((zz, a, b, cy, fn))
    zl, al, bl, cyl, _ = sp[-1]
    zt = (1.60 + d1) if top is None else top
    for j in range(1, cap_n+1):
        phi = (math.pi/2)*j/cap_n; r = math.cos(phi) if j < cap_n else 0.0
        sp.append((zl + (zt - zl)*math.sin(phi)**sq, al*r, bl*r, cyl, fn))
    return sp


def brim_fn(amp, kind="sun"):
    def f(th):
        if kind == "sun": return 1.0, -amp*(0.55 + 0.45*math.cos(2*th))
        if kind == "cow": return 1.0, amp*math.cos(th)**2*1.0 - 0.5*amp*math.sin(th)**2*0.4
        if kind == "fedora": return 1.0, amp*math.sin(th)
        if kind == "bucket": return 1.0, -amp
        return 1.0, 0.0
    return f


def hat_piece(id, label, fn_, **kw):
    pass


def hat_att(): return [(BONE_HEAD, HEAD_C, Matrix.Identity(3))]


def band_shell(P, slot, z0, z1, d, thick=0.0022, n=2, N=40, fn=None):
    sp = []
    for i in range(n+1):
        z = z0 + (z1 - z0)*i/n; zz, a, b, cy = sk_ring(z, d); sp.append((zz, a, b, cy, fn))
    lathe_into(P, slot, sp, thick, N)


def on_hat(az, el, d, M_up=Vector((0, 0, 1))):
    """frame on the skull at a head direction, pushed out by d (hats sit d above the scalp)"""
    c, n = skull_hit(head_dir(az, el), HEAD_C, d)
    return c, n


# ============================================================ 1 sun hat
@piece("sun_hat", "Chapéu de aba larga", "hat", HEAD_C, BONE_HEAD,
       "wide floppy straw brim (r~0.27 m) with a satin band and side bow; covers the hair above z=1.47 (hairClip)",
       tags=["praia", "romantico", "casual"], formality=0.35, rarity="comum", mount=HAT_TOP,
       defaults={"ribbon": "#dcc08a", "pearl": "#f6efe3"}, mlabels=HAT_LAB, finish={"ribbon": dict(rough=0.9, sheen=0.0, sheen_rough=0.6), "pearl": dict(rough=0.4, coat=0.0, sheen=0.0, sheen_tint="#ffffff")},
       extra={"hairClip": hat_hairclip(1.47)})
def sun_hat():
    P = Piece("sun_hat")
    sp = []
    for d, z in ((0.150, 1.470), (0.125, 1.474), (0.095, 1.480), (0.060, 1.487), (0.034, 1.493)):
        zz, a, b, cy = sk_ring(1.49, d); sp.append((z, a, b, cy, brim_fn(0.034*(d/0.15)**1.6, "sun")))
    sp += crown_specs(1.50, 0.030, 0.034, 7, None, top=1.650)
    lathe_into(P, 'ribbon', sp, 0.0038, 48)
    band_shell(P, 'pearl', 1.497, 1.536, 0.0345, 0.0020, 2, 48)
    c, n = on_hat(75, 8, 0.0, None)
    c2, n2 = skull_hit(head_dir(72, 14), HEAD_C, 0.0)
    # bow on the left side of the band
    zz, a, b, cy = sk_ring(1.518, 0.0345)
    th = math.radians(18)
    pc = Vector((a*math.cos(th), cy + b*math.sin(th), 1.518)); nn = Vector((math.cos(th)/a, math.sin(th)/b, 0)).normalized()
    L = Loc(); bow2(L, Matrix.Identity(4), 0.034, 'pearl', True, 0.28, False); L.commit(P, frame(pc + nn*0.003, nn, up=Vector((0, 0, 1))) @ Matrix.Rotation(0.0, 4, 'Y'))
    skull_clear(P, "sun_hat", 1.46)
    return P, hat_att()


# ============================================================ 2 beret
@piece("beret", "Boina", "hat", HEAD_C, BONE_HEAD,
       "soft wool beret, tilted to the left, nub on top; covers the crown (hairClip)",
       tags=["casual", "romantico", "gala"], formality=0.5, rarity="comum", mount=HAT_TOP,
       defaults={"ribbon": "#7a1f33", "pearl": "#2b1d1f"}, mlabels={"ribbon": "Lã", "pearl": "Pompom / forro", "gem": "Detalhe"}, finish={"ribbon": dict(rough=0.95, sheen=0.0, sheen_rough=0.8)},
       extra={"hairClip": hat_hairclip(1.49)})
def beret():
    P = Piece("beret")
    cy = -0.0195
    tilt = lambda th: (1.0, -0.022*math.cos(th) + 0.008*math.sin(th))
    R = [(1.489, 0.121, 0.117), (1.500, 0.132, 0.127), (1.520, 0.158, 0.152), (1.548, 0.172, 0.164), (1.575, 0.158, 0.150), (1.600, 0.125, 0.119), (1.618, 0.080, 0.076), (1.628, 0.035, 0.033), (1.631, 0.0, 0.0)]
    sp = [(z, a, b, cy, tilt) for z, a, b in R]
    lathe_into(P, 'ribbon', sp, 0.0030, 48)
    sp2 = [(1.482, 0.1205, 0.1165, cy, tilt), (1.491, 0.1215, 0.1175, cy, tilt), (1.499, 0.1315, 0.1265, cy, tilt)]
    lathe_into(P, 'pearl', sp2, 0.0022, 48)
    bm = bmesh.new(); sphere(bm, Vector((0.0, cy + 0.0, 1.640)), 0.0075, 8, 5, (1, 1, 1.2)); tube_open(bm, [Vector((0, cy, 1.629)), Vector((0, cy, 1.642))], 0.0035, 5)
    commit_bm(P, 'pearl', bm, Matrix.Translation(Vector((0, 0, 0))))
    skull_clear(P, "beret", 1.46)
    return P, hat_att()


# ============================================================ 3 baseball cap
@piece("baseball_cap", "Boné", "hat", HEAD_C, BONE_HEAD,
       "6-panel cap, curved visor in front, button on top, little heart patch; hairClip covers the crown",
       tags=["esportivo", "casual", "y2k"], formality=0.12, rarity="comum", mount=HAT_TOP,
       defaults={"ribbon": "#1f2d4a", "pearl": "#1f2d4a", "gem": "#c1121f"}, mlabels={"ribbon": "Tecido", "pearl": "Aba / costura", "gem": "Emblema"},
       finish={"ribbon": dict(rough=0.75, sheen=0.0, sheen_rough=0.6), "pearl": dict(rough=0.6, coat=0.0, sheen=0.0, sheen_tint="#ffffff")},
       extra={"hairClip": hat_hairclip(1.485)})
def baseball_cap():
    P = Piece("baseball_cap")
    seam = lambda th: (1.0 + 0.0022*math.cos(6*(th - math.pi/2)), 0.0)
    sp = crown_specs(1.484, 0.0225, 0.0245, 7, seam, top=1.627, cap_n=5)
    lathe_into(P, 'ribbon', sp, 0.0030, 60)
    # panel seams (thin pearl tubes along the meridians) + button
    for k in range(6):
        th = math.pi/2 + k*math.pi/3 + math.pi/6
        pts = []
        for i in range(0, len(sp)-1):
            z, a, b, cyy, _ = sp[i]
            if a < 0.004: continue
            pts.append(Vector((a*math.cos(th), cyy + b*math.sin(th), z)))
        if len(pts) > 2: tube_open(P['pearl'], pts, 0.0011, 4)
    sphere(P['pearl'], Vector((0, -0.0195, sp[-1][0] + 0.002)), 0.0075, 8, 5, (1, 1, 0.8))
    # visor: slab from the front of the band
    z0 = 1.483; rows = []; cols = 13
    for r in range(7):
        d = 0.0175 + 0.087*r/6
        row = []
        for c in range(cols):
            th = -math.pi/2 + math.radians(-62 + 124*c/(cols-1))
            zz, a, b, cy = sk_ring(1.49, d)
            # ellipse arc flattened toward the front plane
            rad = 1.0 + 0.0
            p = Vector((a*math.cos(th), cy + b*math.sin(th), z0 + 0.003 - 0.016*(d/0.1)**1.5 - 0.004*math.sin((th + math.pi/2))**0))
            p.z -= 0.012*(abs(math.cos(th))**2)*(d/0.1)
            row.append(p)
        rows.append(row)
    slab(P['pearl'], rows, Vector((0, 0, -0.0042)))
    # heart patch on the front
    zz, a, b, cy = sk_ring(1.545, 0.0255)
    pc = Vector((0, cy - b, 1.545)); M = Matrix.Translation(pc) @ Matrix.Rotation(0, 4, 'Z')
    puffy(P['gem'], heart_outline(0.0125), 0.0035, M, 0.5)
    skull_clear(P, "baseball_cap", 1.46)
    return P, hat_att()


def slab(bm, grid, off):
    V = [[bm.verts.new(p) for p in row] for row in grid]; W = [[bm.verts.new(p + off) for p in row] for row in grid]
    m = len(V); n = len(V[0])
    for i in range(m-1):
        for k in range(n-1):
            bm.faces.new((V[i][k], V[i][k+1], V[i+1][k+1], V[i+1][k]))
            bm.faces.new((W[i][k], W[i+1][k], W[i+1][k+1], W[i][k+1]))
    for k in range(n-1):
        bm.faces.new((V[0][k], W[0][k], W[0][k+1], V[0][k+1])); bm.faces.new((V[m-1][k], V[m-1][k+1], W[m-1][k+1], W[m-1][k]))
    for i in range(m-1):
        bm.faces.new((V[i][0], V[i+1][0], W[i+1][0], W[i][0])); bm.faces.new((V[i][n-1], W[i][n-1], W[i+1][n-1], V[i+1][n-1]))


# ============================================================ 4 bucket hat
@piece("bucket_hat", "Chapéu bucket", "hat", HEAD_C, BONE_HEAD,
       "soft bucket hat with a short down-sloping brim, stitch ridges and two metal eyelets; hairClip covers the crown",
       tags=["casual", "y2k", "praia", "esportivo"], formality=0.12, rarity="comum", mount=HAT_TOP,
       defaults={"ribbon": "#c8b78c", "pearl": "#ffffff"}, mlabels={"ribbon": "Tecido", "pearl": "Costura", "gem": "Detalhe"},
       finish={"ribbon": dict(rough=0.85, sheen=0.0, sheen_rough=0.6)}, extra={"hairClip": hat_hairclip(1.47)})
def bucket_hat():
    P = Piece("bucket_hat")
    sp = []
    for d, z in ((0.075, 1.463), (0.055, 1.470), (0.036, 1.478), (0.024, 1.485)):
        zz, a, b, cy = sk_ring(1.485, d); sp.append((z, a, b, cy, None))
    ridge = lambda th: (1.0, 0.0)
    sp += crown_specs(1.49, 0.026, 0.040, 6, None, top=1.640, cap_n=4, sq=0.8)
    lathe_into(P, 'ribbon', sp, 0.0034, 48)
    # stitched ridges on the brim (thin tubes), eyelets
    for d, z in ((0.050, 1.4713), (0.065, 1.4672)):
        zz, a, b, cy = sk_ring(1.485, d)
        ring = [Vector((a*math.cos(2*math.pi*i/60), cy + b*math.sin(2*math.pi*i/60), z + 0.0021)) for i in range(60)]
        tube_closed(P['pearl'], ring, 0.0009, 4)
    for th in (math.radians(-22), math.radians(202)):
        zz, a, b, cy = sk_ring(1.525, 0.0275)
        nn = Vector((math.cos(th)/a, math.sin(th)/b, 0)).normalized(); pc = Vector((a*math.cos(th), cy + b*math.sin(th), 1.525))
        torus_bm(P['metal'], pc + nn*0.0012, 0.0050, 0.0013, Vector((0, 0, 1)).rotation_difference(nn).to_matrix().to_4x4(), 12, 4)
    skull_clear(P, "bucket_hat", 1.46)
    return P, hat_att()


# ============================================================ 5 fedora
@piece("fedora", "Chapéu fedora", "hat", HEAD_C, BONE_HEAD,
       "felt fedora: pinched crown with centre dent, snap brim, satin band with bow; hairClip covers the crown",
       tags=["gala", "casual", "goth"], formality=0.65, rarity="raro", mount=HAT_TOP,
       defaults={"ribbon": "#d2b48c", "pearl": "#2a1d17", "gem": "#f2c14e"}, mlabels={"ribbon": "Feltro", "pearl": "Fita", "gem": "Detalhe"},
       finish={"ribbon": dict(rough=0.85, sheen=0.0, sheen_rough=0.6), "pearl": dict(rough=0.35, coat=0.0, sheen=0.0, sheen_tint="#ffffff")}, extra={"hairClip": hat_hairclip(1.47)})
def fedora():
    P = Piece("fedora")
    sp = []
    for d, z in ((0.078, 1.4695), (0.058, 1.4745), (0.040, 1.4805), (0.026, 1.4865)):
        zz, a, b, cy = sk_ring(1.485, d); sp.append((z, a, b, cy, brim_fn(0.016*(d/0.078), "fedora")))
    pinch = lambda th: (1.0 - 0.07*max(0.0, -math.sin(th))**2 + 0.02*abs(math.cos(th))*0, 0.0)
    sp += crown_specs(1.492, 0.026, 0.050, 6, pinch, top=1.64, cap_n=1)[:-1]
    z1, a1, b1, cy1, _ = sp[-1]
    # dented top: plateau ridge then a trough in the middle
    sp += [(1.644, a1*0.62, b1*0.78, cy1, None), (1.640, a1*0.34, b1*0.62, cy1, None), (1.628, 0.012, b1*0.46, cy1, None), (1.621, 0.0, 0.0, cy1, None)]
    lathe_into(P, 'ribbon', sp, 0.0034, 48)
    band_shell(P, 'pearl', 1.497, 1.540, 0.0305, 0.0020, 2, 48)
    zz, a, b, cy = sk_ring(1.518, 0.0305); th = math.radians(10)
    pc = Vector((a*math.cos(th), cy + b*math.sin(th), 1.518)); nn = Vector((math.cos(th)/a, math.sin(th)/b, 0)).normalized()
    L = Loc(); bow2(L, Matrix.Identity(4), 0.022, 'pearl', True, 0.26, False); L.commit(P, frame(pc + nn*0.003, nn, up=Vector((0, 0, 1))))
    skull_clear(P, "fedora", 1.46)
    return P, hat_att()


# ============================================================ 6 cowboy hat (cute)
@piece("cowboy_hat", "Chapéu de cowboy fofo", "hat", HEAD_C, BONE_HEAD,
       "pastel felt cowboy hat: tall creased crown, brim curled up at the sides, band with a gold star concho; hairClip covers the crown",
       tags=["casual", "romantico", "y2k"], formality=0.3, rarity="raro", mount=HAT_TOP,
       defaults={"ribbon": "#b98a5a", "pearl": "#4a2f1b", "gem": "#c1121f"}, mlabels={"ribbon": "Feltro", "pearl": "Fita", "gem": "Detalhe"},
       finish={"ribbon": dict(rough=0.8, sheen=0.0, sheen_rough=0.6), "pearl": dict(rough=0.4, coat=0.0, sheen=0.0, sheen_tint="#ffffff")}, extra={"hairClip": hat_hairclip(1.47)})
def cowboy_hat():
    P = Piece("cowboy_hat")
    sp = []
    for d, z in ((0.125, 1.490), (0.100, 1.480), (0.074, 1.478), (0.050, 1.483), (0.030, 1.490)):
        zz, a, b, cy = sk_ring(1.485, d); sp.append((z, a, b, cy, brim_fn(0.040*(d/0.125)**1.5, "cow")))
    pinch = lambda th: (1.0 - 0.05*max(0.0, -math.sin(th))**2, 0.0)
    sp += crown_specs(1.495, 0.028, 0.062, 6, pinch, top=1.668, cap_n=1)[:-1]
    z1, a1, b1, cy1, _ = sp[-1]
    sp += [(1.671, a1*0.74, b1*0.82, cy1, None), (1.667, a1*0.44, b1*0.6, cy1, None), (1.654, 0.012, b1*0.38, cy1, None), (1.648, 0.0, 0.0, cy1, None)]
    lathe_into(P, 'ribbon', sp, 0.0034, 48)
    band_shell(P, 'pearl', 1.5, 1.538, 0.0295, 0.0020, 2, 48)
    zz, a, b, cy = sk_ring(1.518, 0.031)
    pc = Vector((0, cy - b, 1.518))
    puffy(P['metal'], star_outline(0.0165, 0.0074), 0.0034, Matrix.Translation(pc), 0.45)
    gem_cut(P['gem'], pc + Vector((0, -0.0028, 0)), 0.0042, 0.0045, 6, up=Vector((0, -1, 0)))
    skull_clear(P, "cowboy_hat", 1.46)
    return P, hat_att()


# ============================================================ 7 beanie
@piece("beanie", "Gorro de lã", "hat", HEAD_C, BONE_HEAD,
       "ribbed wool beanie with a folded cuff and a pompom; slouches a little to the back; hairClip covers the crown",
       tags=["casual", "esportivo", "goth"], formality=0.1, rarity="comum", mount=HAT_TOP,
       defaults={"ribbon": "#5d6b3f", "pearl": "#efe6d2"}, mlabels={"ribbon": "Lã", "pearl": "Barra / pompom", "gem": "Detalhe"},
       finish={"ribbon": dict(rough=0.95, sheen=0.0, sheen_rough=0.8), "pearl": dict(rough=0.95, coat=0.0, sheen=0.0, sheen_rough=0.8, sheen_tint="#ffffff")},
       extra={"hairClip": hat_hairclip(1.455)})
def beanie():
    P = Piece("beanie")
    rib = lambda th: (1.0 + 0.0035*math.cos(36*th), 0.0)
    sp = crown_specs(1.512, 0.026, 0.040, 7, rib, top=1.655, cap_n=5)
    lathe_into(P, 'ribbon', sp, 0.0034, 72)
    cuff = lambda th: (1.0 + 0.0030*math.cos(36*th), 0.0)
    cs = []
    for z, d in ((1.452, 0.0125), (1.455, 0.0215), (1.480, 0.0235), (1.510, 0.0225), (1.5135, 0.0185)):
        zz, a, b, cy = sk_ring(z + (0.0 if z > 1.455 else 0.0), d); cs.append((z, a, b, cy, cuff))
    lathe_into(P, 'pearl', cs, 0.0042, 72)
    zl = sp[-1][0]
    sphere(P['pearl'], Vector((0, sp[-1][3] + 0.004, zl + 0.030)), 0.033, 12, 8)
    tube_open(P['pearl'], [Vector((0, sp[-1][3] + 0.004, zl - 0.002)), Vector((0, sp[-1][3] + 0.004, zl + 0.012))], 0.006, 6)
    skull_clear(P, "beanie", 1.44)
    return P, hat_att()


# ============================================================ 8 feather tiara
FEATHER_FIN = dict(ribbon=dict(rough=0.6, sheen=0.0, sheen_rough=0.4))


@piece("feather_tiara", "Tiara de penas", "hat", HEAD_C, BONE_HEAD,
       "thin metal band over the front crown carrying a fan of 7 opaque feathers, pearls and a crystal; rides on the hair (hairFit lift)",
       tags=["gala", "romantico", "rococo"], formality=0.9, rarity="épico", mount=head_dir(0, 56), metal="gold",
       defaults={"ribbon": "#f6efe6", "gem": "#eaf2ff", "pearl": "#fbf3e6"}, mlabels={"ribbon": "Penas", "gem": "Cristal", "pearl": "Pérolas"}, finish=FEATHER_FIN)
def feather_tiara():
    P = Piece("feather_tiara")
    U = Vector((0, -0.62, 0.78)).normalized(); N = 26
    base, nrm = head_arc(U, -62, 62, N, HAIR_OFF + 0.0025)
    tube_open(P['metal'], base, 0.0018, 5)
    L = Loc()
    angs = (-48, -32, -16, 0, 16, 32, 48); lens = (0.064, 0.082, 0.098, 0.114, 0.098, 0.082, 0.064)
    for k, (ang, ln) in enumerate(zip(angs, lens)):
        t = 0.5 + ang/124.0*0.98; i = max(1, min(N-1, int(t*N)))
        c = base[i] + nrm[i]*0.004; n = nrm[i]
        outward = Vector((math.sin(math.radians(ang*0.0)), 0, 0))
        # feather plane: contains the local up (tilted sideways by ang) and the head normal
        M = frame(c, n, up=Vector((0, 0, 1))) @ Matrix.Rotation(-math.radians(ang)*0.85, 4, 'Y') @ Matrix.Rotation(math.radians(-14), 4, 'X')
        outline = leaf_outline(ln, ln*0.26, 12)
        outline = [(x, z + ln*0.5) for x, z in outline]
        puffy(L['ribbon'], outline, 0.0045, M, 0.55)
        add_to(L, 'metal', lambda bm: tube_open(bm, [Vector((0, 0, 0.002)), Vector((0, -0.0006, ln*0.9))], 0.0007, 3), M)
        # barb notches: small side leaflets
        for j in (0.30, 0.50, 0.70):
            for sx in (-1, 1):
                add_to(L, 'ribbon', lambda bm: tube_open(bm, [Vector((0, 0, ln*j)), Vector((sx*ln*0.12, -0.001, ln*(j + 0.10)))], 0.0007, 3), M)
        sphere(L['pearl'], c + Vector((0, 0, 0)) + n*0.001, 0.0034, 6, 4)
    L.commit(P)
    ci = N//2; cc = base[ci] + nrm[ci]*0.0045
    gem_cut(P['gem'], cc + nrm[ci]*0.003, 0.0075, 0.0085, 8, up=nrm[ci])
    torus_bm(P['metal'], cc + nrm[ci]*0.0012, 0.0086, 0.0013, Vector((0, 0, 1)).rotation_difference(nrm[ci]).to_matrix().to_4x4(), 14, 4)
    for i in range(2, N-1, 3):
        sphere(P['pearl'], base[i] + nrm[i]*0.0042, 0.0028, 6, 4)
    return P, hat_att()


# ============================================================ 9 fascinator with veil
@piece("fascinator", "Fascinator com véu", "hat", HEAD_C, BONE_HEAD,
       "pillbox base tilted on the upper-left front of the head, silk flower, feather and a short netted veil that stops above the brows (opaque mesh)",
       tags=["gala", "rococo", "romantico"], formality=0.95, rarity="épico", mount=head_dir(32, 52), metal="gold",
       defaults={"ribbon": "#14213d", "pearl": "#1a1a1f", "gem": "#eaf2ff"}, mlabels={"ribbon": "Base e flor", "pearl": "Véu e pluma", "gem": "Cristal"},
       finish={"ribbon": dict(rough=0.45, sheen=0.0), "pearl": dict(rough=0.55, coat=0.0, sheen=0.0, sheen_tint="#ffffff")})
def fascinator():
    P = Piece("fascinator")
    c, n = skull_hit(head_dir(34, 54), HEAD_C, HAIR_OFF + 0.004)
    M0 = frame(c, n, up=Vector((0.15, -0.1, 1)))
    L = Loc()
    # pillbox disc (flattened cylinder) -- local XZ plane, thickness along -Y
    rd = 0.043
    ring = lambda y, r: [Vector((r*math.cos(2*math.pi*i/20), y, r*math.sin(2*math.pi*i/20)*0.82)) for i in range(20)]
    bmx = bmesh.new()
    loft_rings(bmx, [ring(0.0, rd*0.9), ring(-0.004, rd*0.98), ring(-0.012, rd), ring(-0.020, rd*0.93), ring(-0.025, rd*0.6)], True, False, True, True)
    commit_bm(L, 'ribbon', bmx)
    # silk flower + bow knot on the base
    flower(L, Matrix.Translation(Vector((-0.010, -0.027, 0.006))) @ Matrix.Rotation(0.5, 4, 'Y'), 0.026, 7, 0.012, 0.28, 'ribbon', 'gem', 3, 0.5)
    # feather fan
    for ang, ln in ((-30, 0.085), (0, 0.10), (28, 0.078)):
        Mf = Matrix.Translation(Vector((0.012, -0.020, 0.005))) @ Matrix.Rotation(math.radians(ang), 4, 'Y') @ Matrix.Rotation(math.radians(-62), 4, 'X') @ Matrix.Rotation(math.radians(-20), 4, 'Z')
        ol = [(x, z + ln*0.5) for x, z in leaf_outline(ln, ln*0.24, 12)]
        puffy(L['pearl'], ol, 0.0035, Mf, 0.55)
    # net veil: grid draped from the base edge forward over the forehead (in the head frame, then transformed)
    NU, NV = 17, 9
    G = [[None]*NV for _ in range(NU)]
    for i in range(NU):
        u = -1 + 2*i/(NU-1)
        for j in range(NV):
            v = j/(NV-1)
            az = 34 + u*38; el = 54 - v*34 + (1 - abs(u))*(-6)*v
            G[i][j], _ = skull_hit(head_dir(az, el), HEAD_C, HAIR_OFF + 0.012 + 0.008*math.sin(math.pi*v*0.8))
    Mi = M0.inverted()
    bn = bmesh.new()
    for i in range(NU): tube_open(bn, [Mi @ p for p in G[i]], 0.0004, 3)
    for j in range(NV): tube_open(bn, [Mi @ G[i][j] for i in range(NU)], 0.0004, 3)
    for i in range(NU): sphere(bn, Mi @ (G[i][NV-1] + Vector((0, 0, -0.002))), 0.0022, 5, 3)
    commit_bm(L, 'pearl', bn)
    gem_cut(L['gem'], Vector((-0.010, -0.0395, 0.006)), 0.0045, 0.005, 6, up=Vector((0, -1, 0)))
    L.commit(P, M0)
    return P, hat_att()


# ============================================================ 10 big flower crown
@piece("big_flower_crown", "Coroa de flores grande", "hat", HEAD_C, BONE_HEAD,
       "oversized peonies and roses on a leafy ring around the crown (7 big blooms + buds + leaves); rides on the hair (hairFit lift)",
       tags=["romantico", "praia", "gala"], formality=0.5, rarity="raro", mount=(0, -0.45, 0.85),
       defaults={"pearl": "#fbf6ea", "gem": "#f2b830", "ribbon": "#4f7f45"}, mlabels={"pearl": "Pétalas", "gem": "Miolo", "ribbon": "Folhas"})
def big_flower_crown():
    P = Piece("big_flower_crown")
    N = 44
    base, nrm = head_ring(40, N, HAIR_OFF + 0.006)
    tube_closed(P['ribbon'], base, 0.0026, 5)
    L = Loc()
    sizes = (0.040, 0.030, 0.036, 0.028, 0.040, 0.030, 0.034)
    for k, R in enumerate(sizes):
        i = int(k*N/len(sizes)); n = nrm[i]; up = up_in_plane(n)
        M = frame(base[i] + n*(R*0.28), n, up=up) @ Matrix.Rotation(k*0.8, 4, 'Y')
        flower(L, M, R, 7 if k % 2 == 0 else 6, R*0.34, 0.26, 'pearl', 'gem', 2, 0.5)
        flower(L, M @ Matrix.Translation(Vector((0, -R*0.10, 0))) @ Matrix.Rotation(0.4, 4, 'Y'), R*0.58, 6, R*0.22, 0.34, 'pearl', 'gem', 2, 0.5)
        j = (i + N//(2*len(sizes)) + 1) % N
        M2 = frame(base[j], nrm[j], up=up_in_plane(nrm[j]))
        for sx in (1, -1):
            add_to(L, 'ribbon', lambda bm: puffy(bm, leaf_outline(0.026, 0.010, 8), 0.0022, Matrix.Translation(Vector((sx*0.0135, 0, 0.0))) @ Matrix.Rotation(sx*1.15, 4, 'Y'), 0.5), M2)
        sphere(L['gem'], base[j] + nrm[j]*0.0062, 0.0042, 6, 4)
    L.commit(P)
    return P, hat_att()


# ============================================================ 11 cat ears headband
@piece("cat_ears", "Orelhinhas de gato", "hat", HEAD_C, BONE_HEAD,
       "slim satin headband with two rounded cat ears (pink inner) and a tiny bell bow; rides on the hair (hairFit lift)",
       tags=["y2k", "casual", "romantico"], formality=0.1, rarity="comum", mount=head_dir(40, 66),
       defaults={"ribbon": "#1a1a1f", "pearl": "#ffb3cf", "gem": "#f2c14e"}, mlabels={"ribbon": "Orelhas", "pearl": "Interior", "gem": "Detalhe"},
       finish={"ribbon": dict(rough=0.55, sheen=0.0, sheen_rough=0.4), "pearl": dict(rough=0.6, coat=0.0, sheen=0.0, sheen_tint="#ffffff")})
def cat_ears():
    P = Piece("cat_ears")
    U = Vector((0, -0.22, 0.975)).normalized(); N = 36
    base, nrm = head_arc(U, -88, 88, N, HAIR_OFF + 0.004)
    Wd = Vector((1, 0, 0)).cross(U).normalized()
    tube_e(P['ribbon'], base, nrm, Wd, 0.0042, 0.0032, 8, False)
    L = Loc()
    tri = lambda w, h: [(-w/2, 0), (-w*0.42, h*0.28), (-w*0.14, h*0.80), (0, h), (w*0.14, h*0.80), (w*0.42, h*0.28), (w/2, 0)]
    for sx in (1, -1):
        i = int(N*(0.5 + sx*0.5*math.sin(math.radians(46))/math.sin(math.radians(88)))); i = max(1, min(N-1, i))
        c = base[i]; n = nrm[i]
        M = frame(c + n*0.001, n, up=Vector((sx*0.25, 0.05, 1))) @ Matrix.Rotation(sx*math.radians(10), 4, 'Y') @ Matrix.Rotation(math.radians(-8), 4, 'X')
        puffy(L['ribbon'], tri(0.070, 0.074), 0.016, M @ Matrix.Translation(Vector((0, 0.0, -0.002))), 0.35)
        puffy(L['pearl'], tri(0.044, 0.050), 0.018, M @ Matrix.Translation(Vector((0, -0.0035, 0.004))), 0.45)
    L.commit(P)
    ci = N//2
    zz = base[ci]
    return P, hat_att()

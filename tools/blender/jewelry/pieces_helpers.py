"""Collection 2 helpers (exec'd inside build_jewelry.py's namespace: jlib, conform, puffy, frame, torus_bm, ... are in scope)."""

# ------------------------------------------------------------------ metadata of the first 14 pieces
OLD_META = {
    "pearl_choker": dict(label="Gargantilha de pérolas com coração", tags=["romantico", "gala"], formality=0.7, rarity="comum", defaults={"gem": "#c1121f"}),
    "ribbon_choker": dict(label="Gargantilha de fita com laço", tags=["romantico", "goth", "casual"], formality=0.4, rarity="comum", defaults={"gem": "#eaf2ff", "ribbon": "#1a1a1f"}),
    "layered_gold": dict(label="Colares dourados em camadas", tags=["casual", "y2k"], formality=0.4, rarity="comum", defaults={"gem": "#eaf2ff"}),
    "pearl_studs": dict(label="Brincos de pérola", tags=["casual", "romantico", "gala"], formality=0.6, rarity="comum"),
    "heart_hoops": dict(label="Argolas com coração", tags=["y2k", "romantico"], formality=0.3, rarity="comum", defaults={"gem": "#c1121f"}),
    "big_hoops": dict(label="Argolas douradas grandes", tags=["casual", "y2k", "praia"], formality=0.3, rarity="comum"),
    "chandelier_drops": dict(label="Brincos chandelier de cristal", tags=["gala", "rococo"], formality=0.95, rarity="raro", defaults={"gem": "#eaf2ff"}),
    "tiara": dict(label="Tiara de cristais", tags=["gala", "romantico", "rococo"], formality=1.0, rarity="épico", defaults={"gem": "#eaf2ff"}),
    "hair_bow": dict(label="Laço de cabelo", tags=["romantico", "casual"], formality=0.4, rarity="comum", defaults={"ribbon": "#1a1a1f", "gem": "#eaf2ff"}),
    "star_pins": dict(label="Grampos de estrela", tags=["y2k", "casual"], formality=0.3, rarity="comum", defaults={"gem": "#eaf2ff"}),
    "tennis_bracelet": dict(label="Pulseira tênis de cristais", tags=["gala", "casual"], formality=0.8, rarity="raro", defaults={"gem": "#eaf2ff"}),
    "bangle_stack": dict(label="Pulseiras bangle empilhadas", tags=["casual", "praia", "y2k"], formality=0.3, rarity="comum", defaults={"gem": "#eaf2ff"}),
    "heart_ring": dict(label="Anel de coração", tags=["romantico", "casual"], formality=0.4, rarity="comum", defaults={"gem": "#c1121f"}),
    "cocktail_ring": dict(label="Anel de coquetel", tags=["gala", "rococo"], formality=0.9, rarity="raro", defaults={"gem": "#0f9d6b"}),
}

Z = Vector((0, 0, 1))


# ------------------------------------------------------------------ sub-meshes in a local frame
class Loc:
    """per-slot bmeshes built in a local frame, then committed into a Piece under a matrix (rotation/translation only)."""
    def __init__(self): self.b = {s: bmesh.new() for s in SLOTS}
    def __getitem__(self, s): return self.b[s]

    def mirror(self):
        for s in SLOTS:
            old = self.b[s]; self.b[s] = mirror_x_copy(old); old.free()
        return self

    def commit(self, P, M=None):
        M = M if M is not None else Matrix.Identity(4)
        for s in SLOTS:
            if len(self.b[s].verts):
                bmesh.ops.transform(self.b[s], matrix=M, verts=self.b[s].verts)
                tmp = bpy.data.meshes.new("t"); self.b[s].to_mesh(tmp); P[s].from_mesh(tmp); bpy.data.meshes.remove(tmp)
            self.b[s].free()


def ears_pair(P, fn, scale=1.0):
    """fn(L) builds the +X (doll-left) earring with the lobe at the origin, +X outward, -Y forward, +Z up; the right one is mirrored."""
    for side in (1, -1):
        L = Loc(); fn(L)
        if side == -1: L.mirror()
        L.commit(P, Matrix.Translation(ear_point(side)) @ Matrix.Diagonal((scale, scale, scale, 1)))


# ------------------------------------------------------------------ geometry
def cone(bm, base, tip, r, seg=6):
    base = Vector(base); tip = Vector(tip); ax = tip - base; a = ax.normalized()
    ref = Vector((0, 0, 1)) if abs(a.z) < 0.9 else Vector((1, 0, 0))
    x = a.cross(ref).normalized(); y = a.cross(x)
    ring = [bm.verts.new(base + (x*math.cos(2*math.pi*k/seg) + y*math.sin(2*math.pi*k/seg))*r) for k in range(seg)]
    t = bm.verts.new(tip)
    bm.faces.new(ring[::-1])
    for k in range(seg): bm.faces.new((ring[k], ring[(k+1) % seg], t))


def box(bm, c, sx, sy, sz, M=None):
    MM = Matrix.Translation(Vector(c)) @ (M if M is not None else Matrix.Identity(4)) @ Matrix.Diagonal((sx, sy, sz, 1))
    bmesh.ops.create_cube(bm, size=1.0, matrix=MM)


def strip(bm, pts, nrm, upv, w, th, closed=False, caps=True):
    """flat band with rectangular section: nrm = outward normal per point, upv = width direction (vector or list)."""
    rings = []
    for i, p in enumerate(pts):
        n = nrm[i]; u = upv[i] if isinstance(upv, list) else upv
        rings.append([bm.verts.new(p + n*ro + u*zo) for (ro, zo) in ((-th/2, -w/2), (th/2, -w/2), (th/2, w/2), (-th/2, w/2))])
    m = len(rings)
    for i in range(m if closed else m-1):
        for k in range(4):
            bm.faces.new((rings[i][k], rings[i][(k+1) % 4], rings[(i+1) % m][(k+1) % 4], rings[(i+1) % m][k]))
    if not closed and caps:
        for ring in (rings[0], rings[-1]): bm.faces.new(ring)


def tube_e(bm, pts, nrm, upv, a, b, rseg=8, closed=False, caps=True):
    """elliptical-section tube: half-size a along upv (width), b along nrm (thickness); a/b may be lists."""
    rings = []
    for i, p in enumerate(pts):
        n = nrm[i]; u = upv[i] if isinstance(upv, list) else upv
        aa = a[i] if isinstance(a, list) else a; bb = b[i] if isinstance(b, list) else b
        rings.append([bm.verts.new(p + u*(aa*math.cos(2*math.pi*k/rseg)) + n*(bb*math.sin(2*math.pi*k/rseg))) for k in range(rseg)])
    m = len(rings)
    for i in range(m if closed else m-1):
        for k in range(rseg):
            bm.faces.new((rings[i][k], rings[i][(k+1) % rseg], rings[(i+1) % m][(k+1) % rseg], rings[(i+1) % m][k]))
    if not closed and caps:
        for ring in (rings[0], rings[-1]): bm.faces.new(ring)


def poly_len(pts, closed=True):
    n = len(pts); return sum((pts[(i+1) % n] - pts[i]).length for i in range(n if closed else n-1))


def resample_n(pts, n, closed=True):
    """n points (point, tangent) equally spaced along the polyline."""
    P = [Vector(p) for p in pts]
    if closed: P = P + [P[0]]
    L = poly_len(P, False); step = L / (n if closed else max(n-1, 1))
    out = []; i = 0; acc = 0.0
    for k in range(n):
        target = k*step
        while i < len(P)-2 and acc + (P[i+1]-P[i]).length < target - 1e-12:
            acc += (P[i+1]-P[i]).length; i += 1
        seg = P[i+1]-P[i]; f = (target-acc)/seg.length if seg.length > 1e-9 else 0
        out.append((P[i] + seg*min(max(f, 0), 1), seg.normalized() if seg.length > 1e-9 else Vector((1, 0, 0))))
    return out


def beads(bm, rs, r, seg=8, rings=5, scale=(1, 1, 1)):
    for p, t in rs: sphere(bm, p, r, seg, rings, scale)


def chain_links(bm, rs, L, w, r, rseg=4, seg=8):
    for k, (p, t) in enumerate(rs):
        ref = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
        s = t.cross(ref).normalized(); u = t.cross(s).normalized(); v = s if k % 2 == 0 else u
        ring = [p + t*(L/2*math.cos(2*math.pi*i/seg)) + v*(w/2*math.sin(2*math.pi*i/seg)) for i in range(seg)]
        tube_closed(bm, ring, r, rseg)


def oval_outline(a, b, n=16): return [(a*math.cos(2*math.pi*i/n), b*math.sin(2*math.pi*i/n)) for i in range(n)]


def flower_outline(R, lobes=6, per=3, valley=0.55):
    n = lobes*per; out = []
    for i in range(n):
        th = 2*math.pi*i/n
        r = R*(valley + (1-valley)*abs(math.cos(lobes*th/2))**0.6)
        out.append((r*math.cos(th), r*math.sin(th)))
    return out


def flower(L, M, R, lobes=6, depth=None, center=0.30, petal='pearl', cslot='gem', per=3, valley=0.55):
    """flat flower facing local -Y (M places it): puffy petals + centre."""
    depth = depth or R*0.30
    puffy(L[petal], flower_outline(R, lobes, per, valley), depth, M, 0.45)
    bm = bmesh.new(); sphere(bm, Vector((0, -depth*0.55, 0)), R*center, 8, 4, (1, 0.6, 1)); xf(bm, M)
    tmp = bpy.data.meshes.new("t"); bm.to_mesh(tmp); bm.free(); L[cslot].from_mesh(tmp); bpy.data.meshes.remove(tmp)


def leaf_outline(l, w, n=10):
    return [((w/2)*math.sin(2*math.pi*i/n), (l/2)*math.cos(2*math.pi*i/n)) for i in range(n)]


def star2d(R, r, k=5): return star_outline(R, r, k)


def butterfly(L, M, s=1.0, wing='gem', frame_slot='metal', body_slot='metal', depth=0.30, inner=True, dih=0.18):
    """butterfly in local XZ plane facing -Y (half-span ~1.1*s). wings: metal frame + coloured inlay."""
    w = [(0.07, 0.04), (0.20, 0.50), (0.55, 0.90), (0.92, 0.98), (1.12, 0.72), (1.06, 0.34), (0.74, 0.10), (0.90, -0.20),
         (0.84, -0.62), (0.56, -0.88), (0.30, -0.68), (0.12, -0.30)]
    for sx in (1, -1):
        Mw = M @ Matrix.Rotation(sx*dih, 4, 'Z')
        pts = [(sx*x*s, z*s) for x, z in w]
        puffy(L[frame_slot], pts, depth*s, Mw, 0.55)
        if inner:
            cx = sx*0.55*s; cz = 0.1*s
            ip = [(cx + (x-cx)*0.62, cz + (z-cz)*0.62) for x, z in pts]
            puffy(L[wing], ip, depth*s*1.35, Mw, 0.4)
    bm = bmesh.new()
    sphere(bm, Vector((0, 0, 0)), 0.10*s, 8, 5, (1, 1.0, 5.2))
    xf(bm, M)
    tmp = bpy.data.meshes.new("t"); bm.to_mesh(tmp); bm.free(); L[body_slot].from_mesh(tmp); bpy.data.meshes.remove(tmp)
    m = bmesh.new()
    for sx in (1, -1):
        tube_open(m, [Vector((0, 0, 0.45*s)), Vector((sx*0.18*s, 0, 0.85*s)), Vector((sx*0.34*s, 0, 1.05*s))], 0.030*s, 4)
        sphere(m, Vector((sx*0.34*s, 0, 1.05*s)), 0.06*s, 5, 3)
    xf(m, M)
    tmp = bpy.data.meshes.new("t"); m.to_mesh(tmp); m.free(); L[body_slot].from_mesh(tmp); bpy.data.meshes.remove(tmp)


def bow2(L, M, s=1.0, slot='ribbon', tails=True, depth=0.20, knot_gem=None):
    """ribbon bow in local XZ plane facing -Y; wing span ~ +-1.0*s"""
    wing = [(0.0, 0.0), (0.15, 0.30), (0.55, 0.55), (0.92, 0.40), (1.0, 0.0), (0.92, -0.40), (0.55, -0.55), (0.15, -0.30)]
    for sx in (1, -1):
        puffy(L[slot], [(sx*x*s, z*s) for x, z in wing], depth*s, M @ Matrix.Translation((sx*0.03*s, 0, 0)) @ Matrix.Rotation(-sx*0.10, 4, 'Z'), 0.55)
    if tails:
        tail = [(-0.11, 0.0), (0.11, 0.0), (0.27, -0.82), (0.0, -0.68), (-0.27, -0.82)]
        for sx in (1, -1):
            puffy(L[slot], [(x*s + sx*0.17*s, z*s - 0.06*s) for x, z in tail], depth*0.5*s,
                  M @ Matrix.Translation((0, 0.01*s, 0)) @ Matrix.Rotation(-sx*0.20, 4, 'Z'), 0.7)
    bm = bmesh.new(); sphere(bm, Vector((0, -0.03*s, 0)), 0.24*s, 10, 6, (1.0, 0.85, 1.1)); xf(bm, M)
    tmp = bpy.data.meshes.new("t"); bm.to_mesh(tmp); bm.free(); L[slot].from_mesh(tmp); bpy.data.meshes.remove(tmp)
    if knot_gem:
        g = bmesh.new(); gem_cut(g, Vector((0, -0.26*s, 0)), 0.15*s, 0.18*s, 6, up=Vector((0, -1, 0))); xf(g, M)
        tmp = bpy.data.meshes.new("t"); g.to_mesh(tmp); g.free(); L['gem'].from_mesh(tmp); bpy.data.meshes.remove(tmp)


def add_to(L, slot, fn, M=None):
    """build with fn(bm) into a temp bmesh, transform by M, merge into L[slot]"""
    bm = bmesh.new(); fn(bm)
    if M is not None: xf(bm, M)
    tmp = bpy.data.meshes.new("t"); bm.to_mesh(tmp); bm.free(); L[slot].from_mesh(tmp); bpy.data.meshes.remove(tmp)


def nrm_at(p, trees=None):
    best = None
    for t in (trees or TREES):
        loc, n, i, d = t.find_nearest(Vector(p))
        if loc is not None and (best is None or d < best[0]): best = (d, n, loc)
    return best[1].copy(), best[2]


# ------------------------------------------------------------------ necklace paths
def neck_loop(rx, ry, z0, n=56, dip=0.0, pw=3.0, clear=0.003, yc=None):
    yc = NECK_C.y if yc is None else yc
    pts = []
    for i in range(n):
        a = 2*math.pi*i/n
        z = z0 - dip*(((1+math.cos(a))/2)**pw)
        pts.append(conform(Vector((rx*math.sin(a), yc - ry*math.cos(a), z)), clear, [TREES[0]]))
    return pts


def radial(pts, c=None):
    c = c or NECK_C
    return [Vector((p.x - c.x, p.y - c.y, 0)).normalized() for p in pts]


def chest_chain(P, zf, power=3.6, r=0.0011, clear=None, beads_every=6, bead_slot='metal'):
    pts = drape(zf, power=power, clear=clear or (r + 0.0026))
    tube_closed(P['metal'], pts, r, 5)
    if beads_every:
        for i in range(0, len(pts), beads_every): sphere(P[bead_slot], pts[i], r*1.5, 6, 4)
    return pts


def front_frame(pts, lift=0.0014):
    """frame at the front-most chain point, -Y = outward, +Z up; pendants hang along local -Z"""
    fp = min(pts, key=lambda p: p.y + (0 if abs(p.x) < 0.006 else 9))
    n, loc = nrm_at(fp)
    n = Vector((n.x*0.6, n.y, max(n.z, -0.2))).normalized()
    return frame(fp + n*lift, n), fp


def at_path(pts, x=None, pick=None):
    """chain point on the front half whose x is closest to `x`"""
    return min([p for p in pts if p.y < pts_mid_y(pts)], key=lambda p: abs(p.x - x))


def pts_mid_y(pts): return sum(p.y for p in pts)/len(pts)


def pearl_loop(P, pts, r, back_step=3, seg=8, rings=5, thread=0.0009, slot='pearl'):
    """pearls along a closed path; pearls only every `back_step`-th on the back half (threaded)."""
    rs = resample_n(pts, int(poly_len(pts)/(2*r*1.04)))
    ymid = pts_mid_y(pts)
    for i, (p, t) in enumerate(rs):
        if p.y > ymid + 0.01 and i % back_step: continue
        sphere(P[slot], p, r, seg, rings)
    tube_closed(P['metal'], pts, thread, 4)


def head_dir(az_deg, el_deg):
    """direction from the head centre: azimuth 0 = forward (-Y), +90 = doll-left (+X), 180 = back; elevation from horizon"""
    az = math.radians(az_deg); el = math.radians(el_deg)
    return Vector((math.sin(az)*math.cos(el), -math.cos(az)*math.cos(el), math.sin(el)))

"""Accessories round 3 - shared helpers (exec'd inside build_jewelry.py's namespace, after pieces_hand.py).
Skull sections, lathe shells (hats), lofts (bags), clearance checks, text meshes."""

Z = Vector((0, 0, 1))
BONE_HEAD = "mixamorig:Head"; BONE_SPINE2 = "mixamorig:Spine2"; BONE_SPINE1 = "mixamorig:Spine1"; BONE_HIPS = "mixamorig:Hips"
BONE_RHAND = "mixamorig:RightHand"; BONE_LHAND = "mixamorig:LeftHand"

# ---------------------------------------------------------------- skull cross-sections (measured with rays, base mesh)
_SKZ = [1.30, 1.36, 1.40, 1.44, 1.48, 1.52, 1.56, 1.58, 1.60]
_SKX = [0.059, 0.094, 0.108, 0.114, 0.110, 0.099, 0.075, 0.054, 0.0]
_SKF = [-0.123, -0.143, -0.124, -0.129, -0.117, -0.107, -0.086, -0.068, -0.012]
_SKB = [0.039, 0.077, 0.088, 0.090, 0.092, 0.075, 0.054, 0.037, -0.012]


def sk_sec(z):
    """(cy, rx, ry) of the skull cross-section at height z (ellipse approximation)."""
    zz = min(max(z, _SKZ[0]), _SKZ[-1])
    f = float(np.interp(zz, _SKZ, _SKF)); b = float(np.interp(zz, _SKZ, _SKB)); rx = float(np.interp(zz, _SKZ, _SKX))
    return (f + b)/2, rx, (b - f)/2


def sk_ring(z, d):
    cy, rx, ry = sk_sec(z)
    return z, rx + d, ry + d, cy


# ---------------------------------------------------------------- lathe shells
def rpts(spec, N):
    """spec = (z, a, b, cy[, fn]) -> N points; fn(theta)->(radial scale, dz)"""
    z, a, b, cy = spec[:4]; fn = spec[4] if len(spec) > 4 else None
    out = []
    for k in range(N):
        th = 2*math.pi*k/N
        s, dz = fn(th) if fn else (1.0, 0.0)
        out.append(Vector((a*s*math.cos(th), cy + b*s*math.sin(th), z + dz)))
    return out


def dome_specs(z0, zt, A, B, cy, n=7, p=2.0, fn=None):
    out = []
    for i in range(n+1):
        u = i/n; r = (1.0 - u**p)**(1.0/p) if u < 1 else 0.0
        out.append((z0 + (zt - z0)*u, A*r, B*r, cy, fn))
    return out


def loft_rings(bm, rings, closed_cols=True, closed_rows=False, cap_first=False, cap_last=False):
    """rings: list of lists of Vector (same length). faces between consecutive rings."""
    V = [[bm.verts.new(p) for p in ring] for ring in rings]
    n = len(V[0]); m = len(V)
    for i in range(m if closed_rows else m-1):
        i2 = (i+1) % m
        for k in range(n if closed_cols else n-1):
            k2 = (k+1) % n
            try: bm.faces.new((V[i][k], V[i][k2], V[i2][k2], V[i2][k]))
            except ValueError: pass
    if cap_first: bm.faces.new(V[0][::-1])
    if cap_last: bm.faces.new(V[-1])
    return V


def shell(bm, specs, thick, N=40, close_ends=True):
    """thin closed lathe shell. specs run from the OUTER start (e.g. brim tip / bottom edge) over the top; outward normal = (t_z, -t_rho)."""
    outer = [rpts(s, N) for s in specs]
    rho = [(s[1] + s[2])/2 for s in specs]; zz = [s[0] for s in specs]
    inner = []
    for i, s in enumerate(specs):
        i0 = max(i-1, 0); i1 = min(i+1, len(specs)-1)
        tr = rho[i1] - rho[i0]; tz = zz[i1] - zz[i0]; L = math.hypot(tr, tz) or 1.0
        nr, nz = tz/L, -tr/L
        a2 = max(s[1] - nr*thick, 0.0); b2 = max(s[2] - nr*thick, 0.0)
        inner.append(rpts((s[0] - nz*thick, a2, b2, s[3], s[4] if len(s) > 4 else None), N))
    rings = outer + inner[::-1]
    loft_rings(bm, rings, True, close_ends)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=2e-5)


def inside_head(p):
    """True if p is inside the head mesh (ray straight up leaves through a back-facing hit)"""
    loc, n, i, d = HEADTREE.ray_cast(Vector(p), Vector((0, 0, 1)), 0.5)
    return loc is not None and n.z > 0


def skull_clear(P, label, zmin=1.44, rmax=0.30, slots=None):
    """min signed distance (mm) of the piece's vertices (|x|<rmax, z>zmin) to the head mesh; negative = inside. Prints and returns it."""
    worst = 9.0
    for s in (slots or SLOTS):
        for v in P[s].verts:
            p = v.co
            if p.z < zmin or abs(p.x) > rmax: continue
            loc, n, i, d = HEADTREE.find_nearest(p)
            if loc is None: continue
            sd = -d if inside_head(p) else d
            if sd < worst: worst = sd; wp = p.copy()
    print("[clear] %s min skull clearance %.1f mm at %s" % (label, worst*1000, tuple(round(x, 3) for x in wp)))
    return worst


def commit_bm(P, slot, bm, M=None):
    if M is not None: xf(bm, M)
    tmp = bpy.data.meshes.new("t"); bm.to_mesh(tmp); bm.free(); P[slot].from_mesh(tmp); bpy.data.meshes.remove(tmp)


def lathe_into(P, slot, specs, thick, N=40):
    bm = bmesh.new(); shell(bm, specs, thick, N); commit_bm(P, slot, bm)


# ---------------------------------------------------------------- curves & lofts for bags
def bez(p0, p1, p2, p3, n=12):
    p0, p1, p2, p3 = [Vector(p) for p in (p0, p1, p2, p3)]
    out = []
    for i in range(n+1):
        t = i/n; u = 1 - t
        out.append(p0*u**3 + p1*3*u*u*t + p2*3*u*t*t + p3*t**3)
    return out


def rrect(w, h, r, n=3):
    """rounded rectangle outline (x,y), CCW starting at +x,-y corner side. r clipped."""
    r = min(r, w/2 - 1e-5, h/2 - 1e-5); pts = []
    for (cx, cy, a0) in ((w/2 - r, h/2 - r, 0), (-w/2 + r, h/2 - r, 90), (-w/2 + r, -h/2 + r, 180), (w/2 - r, -h/2 + r, 270)):
        for i in range(n+1):
            a = math.radians(a0 + 90*i/n); pts.append((cx + r*math.cos(a), cy + r*math.sin(a)))
    return pts


def ring_rr(w, d, r, z, cx=0.0, cy=0.0, n=3):
    return [Vector((cx + x, cy + y, z)) for x, y in rrect(w, d, r, n)]


def loft_body(bm, rings):
    loft_rings(bm, rings, True, False, True, True)


def poly_tube(bm, pts, r, rseg=6):
    tube_open(bm, [Vector(p) for p in pts], r, rseg)


def surf_ray(x, y_from, z, dirv=Vector((0, 1, 0)), trees=None, maxd=1.0):
    """first hit of a ray from (x, y_from, z) along dirv against the body trees (returns (loc, n) or (None, None))"""
    best = None
    for t in (trees or TREES):
        r = t.ray_cast(Vector((x, y_from, z)), dirv, maxd)
        if r[0] is not None and (best is None or r[3] < best[2]): best = (r[0], r[1], r[3])
    return (best[0], best[1]) if best else (None, None)


def on_body(p, clear, trees=None):
    """nearest body point + normal*clear (keeps outside every morph tree)"""
    return conform(Vector(p), clear, trees or TREES)


# ---------------------------------------------------------------- text -> mesh (initial pendants)
def text_mesh(ch, size, depth, bevel=0.0, font=None):
    """returns (verts, faces) of an extruded letter in the XZ plane (front = -Y), centred; triangles kept small."""
    cu = bpy.data.curves.new("txt", 'FONT'); cu.body = ch; cu.size = size; cu.extrude = depth/2; cu.bevel_depth = bevel
    cu.align_x = 'CENTER'; cu.align_y = 'CENTER'; cu.resolution_u = 2
    if font: cu.font = font
    ob = bpy.data.objects.new("txt", cu); bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    for o in bpy.context.selected_objects: o.select_set(False)
    ob.select_set(True)
    bpy.ops.object.convert(target='MESH')
    me = ob.data; bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    # blender text lies in XY plane facing +Z; rotate to XZ plane facing -Y
    bmesh.ops.transform(bm, matrix=Matrix.Rotation(math.pi/2, 4, 'X'), verts=bm.verts)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bpy.data.objects.remove(ob)
    return bm


def merge_bm(dst, src):
    tmp = bpy.data.meshes.new("t"); src.to_mesh(tmp); dst.from_mesh(tmp); bpy.data.meshes.remove(tmp)


def hat_hairclip(z_brim, ease=0.0, soft=0.02, extra=None):
    """hairClip block for jewelry.json.  Ellipsoid the hair must be squeezed into above the plane y = minY.
    Two equivalent descriptions: head-local (piece origin = head centre, glTF axes) and bind-space (doll rest pose, glTF world).
    Hair vertices (rest pose, before skinning) with y > minY and outside the ellipsoid are projected radially onto it; blend the
    projection in over `soft` metres below minY (smoothstep)."""
    r = [round(0.124 + ease, 4), round(0.172 + ease, 4), round(0.118 + ease, 4)]   # glTF x, y(up), z(front)
    d = {"center": [0.0, 0.0, 0.0075], "radii": r, "minY": round(z_brim - HEAD_C.z, 4), "soft": soft,
         "bind": {"center": [0.0, round(HEAD_C.z, 4), round(-HEAD_C.y + 0.0075, 4)], "radii": r, "minY": round(z_brim, 4)}}
    if extra: d.update(extra)
    return d

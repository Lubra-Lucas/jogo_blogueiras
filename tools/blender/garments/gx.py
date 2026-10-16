"""Geradores de segunda geracao: casca cortada do corpo (tops, calcas, bodies), saias tubulares, colarinhos, botoes, babados.
Segue as convencoes de garment_lib (estados = Basis + shape keys; folga minima; pesos do corpo)."""
import numpy as np, math
from collections import defaultdict
from garment_lib import *
from garment_extras import *
from skirts import *

YC = -0.02


class Info:
    def __init__(self, body):
        self.body = body; P = body.P0; self.P = P
        self.arm = np.zeros(body.n, bool); self.side = np.zeros(body.n, int); self.s = np.zeros(body.n); self.axes = {}
        for sgn, nm in ((1, "Left"), (-1, "Right")):
            b = body.rig.data.bones[f"mixamorig:{nm}Arm"]; h = np.array(b.head_local); t = np.array(b.tail_local)
            ln = np.linalg.norm(t - h); ax = (t - h) / ln; self.axes[sgn] = (h, ax, ln)
            m = body.group_mask(f"{nm}Arm", f"{nm}ForeArm", f"{nm}Hand", thr=0.5) & (np.sign(P[:, 0]) == sgn)
            self.arm |= m; self.side[m] = sgn; self.s[m] = ((P[m] - h) @ ax) / ln
        self.hand = body.group_mask("Hand", thr=0.5)
        self.head = body.group_mask("Head", "Neck", thr=0.5)
        self.foot = body.group_mask("Foot", "ToeBase", thr=0.5)
        self.shoulder = body.group_mask("Shoulder", thr=0.5)
        self.x, self.y, self.z = P[:, 0], P[:, 1], P[:, 2]


_INFO = {}
def info(body):
    if id(body) not in _INFO: _INFO.clear(); _INFO[id(body)] = Info(body)
    return _INFO[id(body)]


def components(tris, minsize=60):
    vt = defaultdict(list)
    for t, tr in enumerate(tris):
        for v in tr: vt[int(v)].append(t)
    seen = np.zeros(len(tris), bool); keep = []
    for t0 in range(len(tris)):
        if seen[t0]: continue
        st = [t0]; seen[t0] = True; cur = []
        while st:
            t = st.pop(); cur.append(t)
            for v in tris[t]:
                for u in vt[int(v)]:
                    if not seen[u]: seen[u] = True; st.append(u)
        if len(cur) >= minsize: keep += cur
    return tris[np.array(sorted(keep))]


# ---------------------------------------------------------------- selection helpers
def torso_sel(I, zb, zt=1.30, neck=None, sleeve=None, xs=None, wide=0.16):
    """vertex mask: torso region between zb(x,y) and zt; optional neckline ellipse (rx, ry_front, ry_back, yc, zmin);
    sleeve = None (sleeveless: arm verts out, shoulder verts with |x|>xs out) or s end along the arm"""
    x, y, z = I.x, I.y, I.z
    m = (z >= zb(x, y)) & (z <= zt) & ~I.head & ~I.foot & (np.abs(x) < wide)
    if sleeve is None:
        m &= ~I.arm
        if xs is not None: m &= ~((np.abs(x) > xs) & (z > 1.095))
    else:
        m &= ~(I.arm & ((I.s > sleeve) | I.hand))
        m |= (I.arm & (I.s <= sleeve) & ~I.hand & (z >= zb(x, y)))
    if neck is not None:
        rx, ryf, ryb, yc, zmin = neck
        ry = np.where(y < yc, ryf, ryb)
        hole = ((x / rx) ** 2 + ((y - yc) / ry) ** 2 < 1) & (z > zmin)
        m &= ~hole
    return m


def leg_sel(I, zb, zt):
    x, y, z = I.x, I.y, I.z
    return (z >= zb(x, y)) & (z <= zt(x, y)) & ~I.arm & ~I.head & ~I.foot


# ---------------------------------------------------------------- shell
class Res: pass


def _decimate(P, tris, target):
    ratio = max(0.12, target / len(tris))
    me = bpy.data.meshes.new("dec"); me.from_pydata([tuple(map(float, v)) for v in P], [], [tuple(int(i) for i in t) for t in tris]); me.update()
    ob = bpy.data.objects.new("dec", me); bpy.context.scene.collection.objects.link(ob)
    md = ob.modifiers.new("d", 'DECIMATE'); md.decimate_type = 'COLLAPSE'; md.ratio = ratio; md.use_collapse_triangulate = True
    dg = bpy.context.evaluated_depsgraph_get(); ev = ob.evaluated_get(dg); m2 = ev.to_mesh()
    nv = np.array([tuple(v.co) for v in m2.vertices]); nt = [tuple(p.vertices) for p in m2.polygons]
    ev.to_mesh_clear(); bpy.data.objects.remove(ob, do_unlink=True); bpy.data.meshes.remove(me)
    used = np.unique(np.array(nt)); remap = -np.ones(len(nv), np.int32); remap[used] = np.arange(len(used))
    return nv[used], [tuple(int(remap[i]) for i in t) for t in nt]


def shell(body, G, vsel, *, off=0.006, disp=None, hem=None, sleeve_end=None, hem_tol=0.03, hull=True, hull_z=(0.88, 0.95, 1.10, 1.15), clear=0.006,
          smooth=(12, 6, 2), mat="base", minsize=60, wsm=3, bsm=10, target=4800, holes=None, hem_flare=0.0, hem_ramp=0.085):
    """cut the selected body region (decimated to ~target tris), offset it and fit it on every morph state. returns Res."""
    I = info(body); tris = body.tris
    ft = components(tris[vsel[tris].all(1)], minsize)
    V0 = np.unique(ft); remap = -np.ones(body.n, np.int32); remap[V0] = np.arange(len(V0))
    lt = np.array([[remap[i] for i in t] for t in ft], np.int32)
    if target and len(lt) > target * 1.1:
        nv, nt = _decimate(body.P0[V0], lt, target)
        at = Attach(body.P0, tris, nv); tv = at.tris[at.fi]; bc = at.bc
        V = tv[np.arange(len(tv)), np.argmax(bc, 1)]
        W0 = (body.W[tv] * bc[:, :, None]).sum(1); W0 = W0 / np.maximum(W0.sum(1, keepdims=True), 1e-9)
        def surf(s):
            Ps = (body.P[s][tv] * bc[:, :, None]).sum(1); Ns = (body.nrm[s][tv] * bc[:, :, None]).sum(1)
            return Ps, Ns / np.maximum(np.linalg.norm(Ns, axis=1), 1e-9)[:, None]
        chg = {s: np.abs(body.P[s][tv] - body.P0[tv]).max() > 3e-5 for s in body.states}
        polys = nt; P0 = (body.P0[tv] * bc[:, :, None]).sum(1)
    else:
        V = V0; W0 = body.W[V].copy()
        surf = lambda s: (body.P[s][V], body.nrm[s][V])
        chg = {s: np.abs(body.P[s][V] - body.P0[V]).max() > 3e-5 for s in body.states}
        polys = [tuple(int(i) for i in t) for t in lt]; P0 = body.P0[V]
    n = len(V); g = Graph(n, polys)
    log("shell verts", n, "tris", len(polys), "changed states", sum(chg.values()))
    z0 = P0[:, 2]
    offv = np.full(n, float(off)) if np.isscalar(off) else off(P0, I, V)
    if hem_flare and hem is not None:   # barra levemente evasê: o top fica por cima do cos das saias/calcas (sem z-fighting)
        hz0 = (hem[0] if isinstance(hem, (list, tuple)) else hem)(P0[:, 0], P0[:, 1])
        offv = offv + hem_flare * smoothstep(hz0 + hem_ramp, hz0, P0[:, 2]) * (~I.arm[V])
    D = disp(P0, I, V) if disp is not None else None
    ring = np.round(z0 / 0.005).astype(int)
    ring = np.where(I.arm[V], -99999 - np.arange(n), ring)       # arms never take part in the bust hull
    zlo, zhi, zlo2, zhi2 = hull_z
    wh = smoothstep(zlo, zhi, z0) * (1 - smoothstep(zlo2, zhi2, z0)) * (~I.arm[V]) if hull else None
    sleeve_bnd = {}
    if sleeve_end is not None:
        for sgn in (1, -1):
            sleeve_bnd[sgn] = g.bnd & (I.side[V] == sgn) & (np.abs(I.s[V] - sleeve_end) < 0.15) & I.arm[V]
    hems = [] if hem is None else (list(hem) if isinstance(hem, (list, tuple)) else [hem])
    hem_b = [g.bnd & (np.abs(z0 - hf(P0[:, 0], P0[:, 1])) < hem_tol) & ~I.arm[V] for hf in hems]
    ecount = {}
    for p in polys:
        for i in range(len(p)):
            a, b = p[i], p[(i + 1) % len(p)]; k = (a, b) if a < b else (b, a); ecount[k] = ecount.get(k, 0) + 1
    bE = np.array([k for k, c in ecount.items() if c == 1], np.int32).reshape(-1, 2)
    bdeg = np.bincount(bE.ravel(), minlength=n).astype(float)
    def bsmooth(Gp, iters):
        for _ in range(iters):
            for f in (0.5, -0.53):
                acc = np.zeros_like(Gp)
                for k in range(3):
                    acc[:, k] = np.bincount(bE[:, 0], Gp[bE[:, 1], k], n) + np.bincount(bE[:, 1], Gp[bE[:, 0], k], n)
                d = np.where(bdeg[:, None] > 0, acc / np.maximum(bdeg, 1)[:, None] - Gp, 0)
                Gp = Gp + f * d
        return Gp
    states = {}
    for s in body.states:
        if s != "Basis" and not chg[s]:
            states[s] = states["Basis"]; continue
        Ps, Ns = surf(s)
        Gp = Ps + Ns * offv[:, None]
        if D is not None: Gp = Gp + D
        for hf, hb in zip(hems, hem_b): Gp[hb, 2] = hf(Gp[hb, 0], Gp[hb, 1])
        for sgn, m in sleeve_bnd.items():
            h, ax, ln = I.axes[sgn]; cur = ((Gp[m] - h) @ ax) / ln
            Gp[m] += np.outer(sleeve_end - cur, ax) * ln
        fixed = g.bnd
        if bsm: Gp = bsmooth(Gp, bsm)
        Gp = g.taubin(Gp, smooth[0], fixed=fixed)
        if hull: Gp = hull_push(Gp, ring, wh)
        Gp = g.taubin(Gp, smooth[1], fixed=fixed)
        Gp = clearance(Gp, body, s, clear, 2)
        Gp = g.taubin(Gp, smooth[2], fixed=fixed)
        Gp = clearance(Gp, body, s, clear, 1)
        for hf, hb in zip(hems, hem_b): Gp[hb, 2] = hf(Gp[hb, 0], Gp[hb, 1])
        states[s] = Gp
    base = states["Basis"]
    W = weights_smooth(g, W0, wsm)
    pa = np.array(polys, np.int32); cen = base[pa].mean(1)
    if holes is not None:
        keep = ~holes(cen)
        pa = pa[keep]; used = np.unique(pa); rm = -np.ones(n, np.int32); rm[used] = np.arange(len(used))
        pa = rm[pa].astype(np.int32); polys = [tuple(int(i) for i in t) for t in pa]
        states = {s_: (v[used]) for s_, v in states.items()}; W = W[used]; V = V[used]; base = states["Basis"]; n = len(used)
        g = Graph(n, polys); cen = base[pa].mean(1)
    r = Res(); r.states = states; r.polys = polys; r.W = W; r.base = base; r.g = g; r.V = V; r.pa = pa; r.cen = cen; r.arm_poly = I.arm[V][pa].any(1); r.vsel = vsel; r.n = n; r.I = I
    m = mat(cen, r) if callable(mat) else mat
    G.add(states, polys, m, cyl_uv(base, polys, (0, YC)), W)
    r.part = len(G.parts) - 1
    return r


# ---------------------------------------------------------------- surface details
def surface_pts(r, theta_deg, zs, yc=YC):
    th = math.radians(theta_deg); d = np.array([math.sin(th), -math.cos(th), 0.0])
    og = np.array([[0, yc, z] for z in zs])
    P = cast_surface(r.base, r.pa, og, [d] * len(zs))
    return P[~np.isnan(P[:, 0])]


def add_studs(G, body, r, pts, rad, h, mat):
    pts = np.asarray(pts)
    if len(pts) == 0: return
    at = Attach(r.base, r.pa, pts); Vs = {s: stud_verts(*at.eval(r.states[s]), rad, h) for s in body.states}
    pl = orient_polys(stud_polys(len(pts)), Vs["Basis"], np.repeat(at.eval(r.base)[1], 7, axis=0))
    G.add(Vs, pl, mat, planar_uv(Vs["Basis"], pl), np.repeat(r.W[at.weights_src()], 7, axis=0))


def add_ribbon(G, body, r, pts, prof, mat):
    pts = np.asarray(pts)
    if len(pts) < 3: return
    at = Attach(r.base, r.pa, pts); k = len(prof)
    Vs = {s: ribbon_verts(*at.eval(r.states[s]), prof) for s in body.states}
    pl = ribbon_polys(len(pts), k)
    pl = orient_polys(pl, Vs["Basis"], np.repeat(at.eval(r.base)[1], k, axis=0))
    G.add(Vs, pl, mat, planar_uv(Vs["Basis"], pl), np.repeat(r.W[at.weights_src()], k, axis=0))


def buttons(G, body, r, zs, rad=0.0032, h=0.004, mat="accent", theta=0):
    add_studs(G, body, r, surface_pts(r, theta, zs), rad, h, mat)


def front_placket(G, body, r, z0, z1, width=0.009, mat="trim", theta=0):
    pts = surface_pts(r, theta, np.arange(z0, z1, 0.012))
    add_ribbon(G, body, r, pts, [(-width, 0.0), (-width * 0.9, 0.0018), (width * 0.9, 0.0018), (width, 0.0)], mat)


# ---------------------------------------------------------------- tube skirts
def env_layer(body, z_top, z_hem, nth=96, rows=8, off=lambda t, th: 0.012, row_t=None, drop=1.0, hem_extra=None, zwave=None, scallop=None, mono=False):
    """layer whose radius follows the body envelope at each height (+off(t,th)); hem_extra(t,th) widens it"""
    th = np.arange(nth) * 2 * math.pi / nth
    ts = np.array(row_t) if row_t is not None else np.linspace(0, 1, rows)
    pts = []; tt = []; tth = []; prev = None
    for i, t in enumerate(ts):
        z = z_top + (z_hem - z_top) * (t ** drop)
        ev = env_at(envelope(body, max(z, 0.1), half=0.02), th)
        ev = np.maximum(np.maximum(np.roll(ev, 1), np.roll(ev, -1)), ev)
        if mono:
            ev = np.maximum(ev, 0.0)
            for _ in range(4): ev = (np.roll(ev, 1) + 2 * ev + np.roll(ev, -1)) / 4
            ev = np.max([ev, np.full(nth, ev.max() * 0.0)], axis=0)
        r = ev + off(t, th)
        if hem_extra is not None: r = r + hem_extra(t, th)
        if mono:
            if prev is not None: r = np.maximum(r, prev)
            prev = r.copy()
        zz = np.full(nth, z)
        if zwave is not None and t > 0.02: zz = zz + zwave[0] * np.sin(zwave[1] * th + zwave[2]) * t ** 2
        if scallop is not None and i == len(ts) - 1:
            s = (th * scallop[1] / (2 * math.pi)) % 1.0
            zz = zz - scallop[0] * np.sqrt(np.clip(1 - (2 * s - 1) ** 2, 0, 1))
        x = AX[0] + r * np.sin(th); y = AX[1] - r * np.cos(th)
        pts.append(np.stack([x, y, zz], 1)); tt.append(np.full(nth, t)); tth.append(th)
    P = np.concatenate(pts); t = np.concatenate(tt); thv = np.concatenate(tth)
    R = len(ts); polys = []
    for i in range(R - 1):
        for j in range(nth):
            polys.append((i * nth + j, i * nth + (j + 1) % nth, (i + 1) * nth + (j + 1) % nth, (i + 1) * nth + j))
    ref = np.stack([np.sin(thv), -np.cos(thv), np.zeros(len(P))], 1)
    return dict(P=P, t=t, th=thv, polys=orient_polys(polys, P, ref), n=len(P))


def waistband(G, body, z_top=0.886, z_bot=0.836, mat="trim", bulge=0.004):
    band = layer(body, z_top, z_bot, None, None, nth=80, rows=4, flare=1.0, drop=1.0, top_off=0.013, row_t=[0, 0.3, 0.7, 1.0],
                 extra_r=lambda t, th: bulge * np.sin(math.pi * t) + 0.0 * th)
    add_layer(G, body, band, mat, dict(lw=0.0, spine_top=0.45, spine_fade=0.9), falloff=0.3, clear=0.007)
    return len(G.parts) - 1


def add_bow_on(G, body, part_idx, theta, z, size, rr=0.02):
    bv, bp, bs = bow_local(size)
    r_band = float(env_at(envelope(body, z), np.array([theta % (2 * math.pi)]))[0]) + rr
    ax_, ay_ = AX[0] + r_band * math.sin(theta), AX[1] - r_band * math.cos(theta)
    out = np.array([math.sin(theta), -math.cos(theta)]); lat = np.array([math.cos(theta), math.sin(theta)])
    pts = np.stack([ax_ + bv[:, 0] * lat[0] + bv[:, 1] * out[0], ay_ + bv[:, 0] * lat[1] + bv[:, 1] * out[1], z + bv[:, 2]], 1)
    part = G.parts[part_idx]; bandS = part['V']; pa = tri_split(part['polys'])
    at = AttachF(bandS["Basis"], pa, pts)
    Vs = {s: at.eval(bandS[s]) for s in body.states}
    pl = orient_polys(bp, Vs["Basis"], Vs["Basis"] - Vs["Basis"].mean(0))
    G.add(Vs, pl, bs, planar_uv(Vs["Basis"], pl), part['W'][at.weights_src()])


def meta_of(gid, label, slot, slots, palette, finish, supported, covers, hides=(), tags=None, notes=None):
    d = dict(id=gid, label=label, slot=slot, slots=list(slots), palette=palette, finish=finish, finishesSupported=supported,
             covers=list(covers), hides=list(hides))
    if tags: d["tags"] = tags
    if notes: d["notes"] = notes
    return d

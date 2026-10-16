"""Acessorios de superficie: golas, babados, laços e tiras polares coladas na casca (seguem skin + morphs via AttachF)."""
import numpy as np, math
from gx import *


def polar_strip(G, body, part_idx, xy_fn, z_fn, mat, nth=64, rows=4, closed=True, nref=(0.5, 0.5), wmode="src", th0=0.0, th1=2 * math.pi):
    """strip surface: for angle th and t in 0..1  ->  xy_fn(th,t)=(x,y), z_fn(th,t)=z (rest pose); glued to part `part_idx`."""
    ths = th0 + (th1 - th0) * np.arange(nth if closed else nth) / (nth if closed else nth - 1)
    pts = []
    for t in np.linspace(0, 1, rows):
        x, y = xy_fn(ths, t); z = z_fn(ths, t)
        pts.append(np.stack([x, y, z], 1))
    P = np.concatenate(pts)
    part = G.parts[part_idx]; bandS = part['V']; pa = tri_split(part['polys'])
    at = AttachF(bandS["Basis"], pa, P)
    Vs = {s: at.eval(bandS[s]) for s in body.states}
    pl = []
    for i in range(rows - 1):
        for j in range(nth if closed else nth - 1):
            j2 = (j + 1) % nth
            pl.append((i * nth + j, i * nth + j2, (i + 1) * nth + j2, (i + 1) * nth + j))
    ref = np.concatenate([np.stack([nref[0] * np.sin(ths), -nref[0] * np.cos(ths), np.full(len(ths), nref[1])], 1)] * rows)
    pl = orient_polys(pl, Vs["Basis"], ref)
    G.add(Vs, pl, mat, planar_uv(Vs["Basis"], pl), part['W'][at.weights_src()])


def surf_z(r, x, y, ztop=1.5, default=None):
    """height of the shell surface above (x,y) (ray down); NaN -> default"""
    og = [np.array([xx, yy, ztop]) for xx, yy in zip(x, y)]
    P = cast_surface(r.base, r.pa, og, [np.array([0, 0, -1.0])] * len(og))
    z = P[:, 2]
    if default is not None: z = np.where(np.isnan(z), default, z)
    return z


def collar_flat(G, body, r, cx=0.0, cy=0.0, r0=(0.050, 0.055), r1=(0.105, 0.085), nth=64, rows=3, lift=0.003, front_gap=0.0, mat="trim", zdrop=0.0, back_ratio=1.0, ztop=1.4):
    """peter-pan / sailor style flat collar draped over the shell (rays down onto the surface)"""
    def xy(th, t):
        rx = r0[0] + (r1[0] - r0[0]) * t; ry = r0[1] + (r1[1] - r0[1]) * t
        return cx + rx * np.sin(th), cy - ry * np.cos(th)
    P = []
    for t in np.linspace(0, 1, rows):
        th = np.arange(nth) * 2 * math.pi / nth
        P.append(xy(th, t))
    zs = [surf_z(r, p[0], p[1], ztop, default=1.15) for p in P]
    def zf(th, t):
        i = int(round(t * (rows - 1))); return zs[i] + lift + zdrop * t
    polar_strip(G, body, r.part, xy, zf, mat, nth, rows, nref=(0.2, 0.8))


def frill_ring(G, body, r, z, rx, ry, cx=0.0, cy=0.0, width=0.03, drop=0.012, nth=72, rows=4, waves=14, amp=0.004, mat="trim", wave_z=0.004, ph=0.0, rim=0.0, up=0.0):
    """ruffle around the torso at height z: starts at the ellipse (rx, ry) and goes outwards/down"""
    def xy(th, t):
        k = (1 + (width / rx) * t) if np.isscalar(rx) else 1
        rr = (rx + width * t + amp * np.sin(waves * th + ph) * t); rr2 = (ry + width * t + amp * np.sin(waves * th + ph) * t)
        return cx + rr * np.sin(th), cy - rr2 * np.cos(th)
    def zf(th, t):
        return z - drop * t ** 1.3 + wave_z * np.sin(waves * th + ph + 1.0) * t + up * (1 - t)
    polar_strip(G, body, r.part, xy, zf, mat, nth, rows, nref=(0.7, 0.3))


def ruff_neck(G, body, r, cx=0.0, cy=0.0, base_r=(0.06, 0.06), layers=3, z0=1.17, spread=0.045, nth=96, waves=26, mat="trim", ztop=1.4):
    """elizabethan ruff: stacked wavy rings around the neck, bigger towards the bottom"""
    for L in range(layers):
        k = L / max(1, layers - 1)
        rr0 = base_r[0] + 0.012 * L; rr1 = rr0 + spread * (0.55 + 0.45 * k)
        zz = z0 - 0.012 * L
        def xy(th, t, rr0=rr0, rr1=rr1, L=L):
            rr = rr0 + (rr1 - rr0) * t + 0.008 * np.sin(waves * th + L * 1.3) * t
            return cx + rr * np.sin(th), cy - rr * (base_r[1] / base_r[0]) * np.cos(th)
        def zf(th, t, zz=zz, L=L):
            return zz + 0.014 * np.sin(1.0 * t * math.pi) - 0.012 * t + 0.007 * np.sin(waves * th + L * 1.3 + 1.6) * t
        polar_strip(G, body, r.part, xy, zf, mat, nth, 4, nref=(0.5, 0.5))


def tie_bow(G, body, r, z, size=1.3, mat_loop="accent", mat_knot="trim", y_front=None):
    """small bow glued on the front-centre surface of the shell at height z"""
    bv, bp, bs = bow_local(size)
    p = surface_pts(r, 0, [z])
    if len(p) == 0: return
    a = p[0]
    pts = np.stack([a[0] + bv[:, 0], a[1] - bv[:, 1] - 0.004, a[2] + bv[:, 2]], 1)
    part = G.parts[r.part]; pa = tri_split(part['polys'])
    at = AttachF(part['V']["Basis"], pa, pts)
    Vs = {s: at.eval(part['V'][s]) for s in body.states}
    pl = orient_polys(bp, Vs["Basis"], Vs["Basis"] - Vs["Basis"].mean(0))
    names = [mat_loop if n == "accent" else (mat_knot if n == "trim" else n) for n in bs]
    G.add(Vs, pl, names, planar_uv(Vs["Basis"], pl), part['W'][at.weights_src()])


def seam_line(G, body, r, theta, z0, z1, step=0.012, prof=((-0.0025, 0.0), (0.0, 0.002), (0.0025, 0.0)), mat="trim"):
    add_ribbon(G, body, r, surface_pts(r, theta, np.arange(z0, z1, step)), list(prof), mat)


def bust_trim(G, body, r, z, mat="trim", n=44, prof=((-0.0035, 0.0), (0.0, 0.003), (0.0035, 0.0))):
    """closed horizontal ribbon around the torso at height z (piping / belt line)"""
    pts = []
    for k in range(n):
        th = 2 * math.pi * k / n
        d = np.array([math.sin(th), -math.cos(th), 0.0])
        loc = cast_surface(r.base, r.pa, [np.array([0, YC, z])], [d])[0]
        if not np.isnan(loc[0]): pts.append(loc)
    pts = np.array(pts)
    if len(pts) < 8: return
    # close the loop
    pts = np.concatenate([pts, pts[:1]])
    add_ribbon(G, body, r, pts, list(prof), mat)


def belt(G, body, z=0.872, h=0.026, mat="trim", buckle=True, mat_b="accent", off=0.012):
    idx = waistband(G, body, z + h / 2, z - h / 2, mat, bulge=0.003)
    if buckle:
        bv, bp, bs = bow_local(0.5)
    return idx

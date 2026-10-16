"""Pernas (calcas/shorts), remendos (bolsos) e saias de familia plissada."""
import numpy as np, math
from gx2 import *

_LEG = {}


def leg_axis(body):
    if "a" not in _LEG:
        zs = []; xs = []; ys = []
        rig = body.rig.data.bones
        for nm in ("mixamorig:LeftUpLeg", "mixamorig:LeftLeg", "mixamorig:LeftFoot"):
            h = rig[nm].head_local; zs.append(h[2]); xs.append(h[0]); ys.append(h[1])
        h = rig["mixamorig:LeftFoot"].tail_local; zs.append(h[2]); xs.append(h[0]); ys.append(h[1])
        o = np.argsort(zs); _LEG["a"] = (np.array(zs)[o], np.array(xs)[o], np.array(ys)[o])
    return _LEG["a"]


def leg_flare(body, prof_z, prof_amp, inner=0.014, front=1.0):
    """displacement (rest pose) pushing each leg radially outwards from its axis; profile = amplitude (m) by height"""
    zs, xs, ys = leg_axis(body)
    pz = np.array(prof_z); pa = np.array(prof_amp); o = np.argsort(pz); pz = pz[o]; pa = pa[o]
    def f(P0, I, V):
        sg = np.where(P0[:, 0] >= 0, 1.0, -1.0)
        cx = np.interp(P0[:, 2], zs, xs) * sg; cy = np.interp(P0[:, 2], zs, ys)
        dx = P0[:, 0] - cx; dy = P0[:, 1] - cy
        rad = np.maximum(np.hypot(dx, dy), 1e-6)
        amp = np.interp(P0[:, 2], pz, pa)
        nx = P0[:, 0] + dx / rad * amp; ny = P0[:, 1] + dy / rad * amp * front
        nx = np.where(sg * nx < inner, sg * inner, nx)
        D = np.zeros_like(P0); D[:, 0] = nx - P0[:, 0]; D[:, 1] = ny - P0[:, 1]
        return D
    return f


def patch(G, body, r, origins, dirs, nx, ny, lift, mat, flat=True):
    """quad grid patch (pocket / flap) glued on the shell surface; origins = (ny*nx,3) points outside, dirs = ray direction"""
    pts = cast_surface(r.base, r.pa, list(origins), list(dirs))
    ok = ~np.isnan(pts[:, 0])
    if ok.sum() < nx * ny: return
    pts = pts - np.array(dirs) * lift
    at = Attach(r.base, r.pa, pts); Vs = {s: at.eval(r.states[s])[0] for s in body.states}
    pl = [(j * nx + i, j * nx + i + 1, (j + 1) * nx + i + 1, (j + 1) * nx + i) for j in range(ny - 1) for i in range(nx - 1)]
    pl = orient_polys(pl, Vs["Basis"], np.array(dirs))
    G.add(Vs, pl, mat, planar_uv(Vs["Basis"], pl), r.W[at.weights_src()])
    # rim: side walls from the patch border down to the surface
    return Vs


def pocket_side(G, body, r, sgn, zc, yc, w, h, lift=0.006, mat="base", x0=0.30):
    """rectangular patch pocket on the outer thigh (sgn=+1 left)"""
    nx, ny = 5, 5
    ys = np.linspace(yc - w / 2, yc + w / 2, nx); zs = np.linspace(zc - h / 2, zc + h / 2, ny)
    O = [np.array([sgn * x0, yy, zz]) for zz in zs for yy in ys]
    D = [np.array([-sgn, 0.0, 0.0])] * len(O)
    patch(G, body, r, O, D, nx, ny, lift, mat)


def pocket_front(G, body, r, xc, zc, w, h, lift=0.004, mat="base"):
    nx, ny = 5, 5
    xs = np.linspace(xc - w / 2, xc + w / 2, nx); zs = np.linspace(zc - h / 2, zc + h / 2, ny)
    O = [np.array([xx, -0.4, zz]) for zz in zs for xx in xs]
    D = [np.array([0.0, 1.0, 0.0])] * len(O)
    patch(G, body, r, O, D, nx, ny, lift, mat)


def pleat_skirt(G, body, z_top, z_hem, flare, nth=144, pleats=36, amp=0.010, rows=6, mat="base", off0=0.016, drop=1.0, hem_mat="base", falloff=0.24, lw=0.5, zwave=None):
    tri = lambda th: (np.abs(((th * pleats / (2 * math.pi)) % 1.0) - 0.5) * 2 - 0.5)
    L = env_layer(body, z_top, z_hem, nth=nth, rows=rows, drop=drop,
                  off=lambda t, th: off0 + flare * t ** 0.9 + amp * tri(th) * np.clip(t * 1.6, 0, 1), zwave=zwave)
    add_layer(G, body, L, mat, dict(lw=max(lw, 0.85), spine_top=0.2, spine_fade=0.25, wt=(0.0, 0.5)), falloff=falloff, clear=0.009)
    return L


def add_raw(G, body, P, t, polys, mat, lw=0.4, spine_top=0.2, spine_fade=0.2, falloff=0.25, clear=0.008, uvscale=1.0, wt=(0.1, 0.9)):
    """parametric surface (P rest positions, t = 0 top .. 1 hem per vertex) fitted like a skirt layer"""
    S, g = states_for(body, P, polys, falloff=falloff, clear=clear)
    W = weights_smooth(g, skirt_weights(body, P, t, lw=lw, spine_top=spine_top, spine_fade=spine_fade, wt=wt), 1)
    G.add(S, polys, mat, cyl_uv(P, polys, AX, uvscale), W)
    return S


def bow_on_part(G, body, part_idx, theta, z, radius, size):
    bv, bp, bs = bow_local(size)
    ax_, ay_ = AX[0] + radius * math.sin(theta), AX[1] - radius * math.cos(theta)
    out = np.array([math.sin(theta), -math.cos(theta)]); lat = np.array([math.cos(theta), math.sin(theta)])
    pts = np.stack([ax_ + bv[:, 0] * lat[0] + bv[:, 1] * out[0], ay_ + bv[:, 0] * lat[1] + bv[:, 1] * out[1], z + bv[:, 2]], 1)
    part = G.parts[part_idx]; pa = tri_split(part['polys'])
    at = AttachF(part['V']["Basis"], pa, pts)
    Vs = {s: at.eval(part['V'][s]) for s in body.states}
    pl = orient_polys(bp, Vs["Basis"], Vs["Basis"] - Vs["Basis"].mean(0))
    G.add(Vs, pl, bs, planar_uv(Vs["Basis"], pl), part['W'][at.weights_src()])


def add_layer_w(G, body, L, mat, lw=0.5, knee=0.0, falloff=0.25, clear=0.008, spine_top=0.2, spine_fade=0.25, wsm=1, slit=None, wt=(0.1, 0.9), only=None, train=0.0, split=0.16):
    """like add_layer but with leg-following weights: lw = share given to the thighs at the hem; knee = share of the thigh weight moved to the shin below z 0.58"""
    S, g = states_for(body, L['P'], L['polys'], falloff=falloff, clear=clear)
    W = skirt_weights(body, L['P'], L['t'], lw=lw, spine_top=spine_top, spine_fade=spine_fade, wt=wt, split=split)
    if knee > 0:
        z = L['P'][:, 2]; f = knee * smoothstep(0.58, 0.36, z)
        for nm in ("Left", "Right"):
            u = body.bidx[f"mixamorig:{nm}UpLeg"]; l = body.bidx[f"mixamorig:{nm}Leg"]
            mv = W[:, u] * f; W[:, u] -= mv; W[:, l] += mv
    if train > 0:   # cauda: o fundo de tras segue quadril + as duas pernas por igual (sem osso dominante), em vez de balancar como triangulo rigido
        back = np.clip(-np.cos(L['th']), 0, 1) ** 1.2 * smoothstep(0.35, 0.9, L['t']) * train
        hips = body.bidx["mixamorig:Hips"]; Lb = body.bidx["mixamorig:LeftUpLeg"]; Rb = body.bidx["mixamorig:RightUpLeg"]; Sp = body.bidx["mixamorig:Spine"]
        tgt = np.zeros_like(W); tgt[:, hips] = 0.45; tgt[:, Lb] = 0.25; tgt[:, Rb] = 0.25; tgt[:, Sp] = 0.05
        W = W * (1 - back[:, None]) + tgt * back[:, None]
        wsm = max(wsm, 4)
    W = weights_smooth(g, W, wsm)
    polys = L['polys']
    if slit is not None:   # (theta_center, half_width_rad, t_start): opening in the layer (back/side slit), wide enough for a full stride
        tc, hw, t0 = slit
        keep = []
        for q in polys:
            d = np.abs(((L['th'][list(q)] - tc + math.pi) % (2 * math.pi)) - math.pi).min()
            tt = L['t'][list(q)].mean()
            hwk = hw * np.clip((tt - t0) / max(1e-6, 1 - t0), 0, 1) + 0.0
            keep.append(not (tt > t0 and d < hwk))
        polys = [q for q, k in zip(polys, keep) if k]
    if only is not None:   # (theta_center, half_width): mantem so a faixa angular (ex.: painel frontal de avental)
        tc, hw = only
        polys = [q for q in polys if np.abs(((L['th'][list(q)] - tc + math.pi) % (2 * math.pi)) - math.pi).max() < hw]
    G.add(S, polys, mat, cyl_uv(L['P'], polys, AX, 1.0), W)
    return S

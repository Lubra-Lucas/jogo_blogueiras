"""Geradores parametricos de saia (camadas de revolucao em volta do quadril) + pesos + estados de morph"""
import numpy as np, math
from garment_lib import *
from garment_extras import orient_polys

AX = (0.0, -0.005)


def envelope(body, z, half=0.016, nb=96, state="Basis"):
    """polar envelope (radius per angle bin) of the lower body around z (arms/hands excluded)"""
    P = body.P[state]
    arm = body.group_mask("Arm", "Hand", "Shoulder", thr=0.4)
    m = (np.abs(P[:, 2] - z) < half) & ~arm
    dx = P[m, 0] - AX[0]; dy = P[m, 1] - AX[1]
    th = np.arctan2(dx, -dy) % (2 * math.pi); r = np.hypot(dx, dy)
    k = (th / (2 * math.pi) * nb).astype(int) % nb
    env = np.zeros(nb)
    np.maximum.at(env, k, r)
    for i in range(nb):
        if env[i] == 0:
            j = 1
            while env[(i + j) % nb] == 0 and env[(i - j) % nb] == 0 and j < nb: j += 1
            a, b = env[(i + j) % nb], env[(i - j) % nb]
            env[i] = max(a, b)
    for _ in range(2): env = np.maximum(env, 0.5 * (np.roll(env, 1) + np.roll(env, -1)))
    for _ in range(3): env = (np.roll(env, 1) + 2 * env + np.roll(env, -1)) / 4
    return env


def env_at(env, th):
    nb = len(env); f = (th / (2 * math.pi)) * nb
    i0 = np.floor(f).astype(int) % nb; w = f - np.floor(f)
    return env[i0] * (1 - w) + env[(i0 + 1) % nb] * w


def ellipse_r(th, rx, ry):
    return 1.0 / np.sqrt((np.sin(th) / rx) ** 2 + (np.cos(th) / ry) ** 2)


def layer(body, z_top, z_hem, rx, ry, nth=100, rows=5, flare=0.8, drop=1.2, top_off=0.012, ruffle=(0.0, 14), zwave=(0.0, 18, 0.0), scallop=(0.0, 20),
          row_t=None, extra_r=None, env_clear=0.012, r_top_arr=None, hem_arr=None):
    """returns dict(P, t, th, polys, rows, nth). th is the angle from the front (+x = left side)."""
    th = np.arange(nth) * 2 * math.pi / nth
    envt = env_at(envelope(body, z_top), th) if r_top_arr is None else r_top_arr
    ts = np.array(row_t) if row_t is not None else np.linspace(0, 1, rows)
    pts = []; tt = []; tth = []
    hem = hem_arr if hem_arr is not None else (ellipse_r(th, rx, ry) if rx else None)
    for i, t in enumerate(ts):
        z = z_top + (z_hem - z_top) * (t ** drop)
        r0 = envt + top_off
        r = r0 + ((hem - r0) * (t ** flare) if hem is not None else 0)
        if extra_r is not None: r = r + extra_r(t, th)
        z = z + np.zeros(nth)
        if t > 0.02:
            r = r * (1 + ruffle[0] * math.sin(0) + ruffle[0] * np.sin(ruffle[1] * th) * t ** 2)
            z = z + zwave[0] * np.sin(zwave[1] * th + zwave[2]) * t ** 2
        if scallop[0] > 0 and i == len(ts) - 1:
            s = (th * scallop[1] / (2 * math.pi)) % 1.0
            z = z - scallop[0] * np.sqrt(np.clip(1 - (2 * s - 1) ** 2, 0, 1))
        # keep out of the body
        zi = float(np.mean(z))
        if zi > 0.55:
            ev = env_at(envelope(body, zi), th) + env_clear
            r = np.maximum(r, ev)
        x = AX[0] + r * np.sin(th); y = AX[1] - r * np.cos(th)
        pts.append(np.stack([x, y, z], 1)); tt.append(np.full(nth, t)); tth.append(th)
    P = np.concatenate(pts); t = np.concatenate(tt); thv = np.concatenate(tth)
    polys = []
    R = len(ts)
    for i in range(R - 1):
        for j in range(nth):
            a = i * nth + j; b = i * nth + (j + 1) % nth; c = (i + 1) * nth + (j + 1) % nth; d = (i + 1) * nth + j
            polys.append((a, b, c, d))
    # outward normal reference
    ref = np.stack([np.sin(thv), -np.cos(thv), np.zeros(len(P))], 1)
    polys = orient_polys(polys, P, ref)
    return dict(P=P, t=t, th=thv, polys=polys, n=len(P))


def skirt_weights(body, P, t, lw=0.5, spine_top=0.35, spine_fade=0.3):
    W = np.zeros((len(P), len(body.bones)))
    hips = body.bidx["mixamorig:Hips"]; sp = body.bidx["mixamorig:Spine"]
    L = body.bidx["mixamorig:LeftUpLeg"]; R = body.bidx["mixamorig:RightUpLeg"]
    sl = np.clip(0.5 + P[:, 0] / 0.16, 0, 1)
    wl = lw * smoothstep(0.1, 0.9, t)
    ws = spine_top * (1 - smoothstep(0.0, spine_fade, t))
    W[:, L] = wl * sl; W[:, R] = wl * (1 - sl); W[:, sp] = ws
    W[:, hips] = 1 - W[:, L] - W[:, R] - W[:, sp]
    return W


def states_for(body, P, polys, falloff=0.22, smooth=6, clear=0.008, clear_dist=0.07):
    g = Graph(len(P), polys)
    out = follow_body(body, P, falloff=falloff, graph=g, smooth=smooth)
    fi, bc, ds = nearest_info(body, P)
    near = np.where(ds < clear_dist)[0]
    for s in body.states:
        G = out[s]
        # clearance only for near verts
        sub = clearance(G[near], body, s, clear, 2)
        G = G.copy(); G[near] = sub
        out[s] = G
    return out, g


def add_layer(G, body, L, mat, weights_kw, falloff=0.22, clear=0.008, uvscale=1.0):
    S, g = states_for(body, L['P'], L['polys'], falloff=falloff, clear=clear)
    W = skirt_weights(body, L['P'], L['t'], **weights_kw)
    W = weights_smooth(g, W, 1)
    G.add(S, L['polys'], mat, cyl_uv(L['P'], L['polys'], AX, uvscale), W)
    return S


def layer_radius_at(L, z):
    """radius per angle of a layer at height z (linear interpolation between rows)"""
    nth = int(round(L['n'] / (len(L['P']) // len(np.unique(L['t'])) if False else 1)))
    ts = np.unique(L['t']); R = len(ts); nth = L['n'] // R
    P = L['P'].reshape(R, nth, 3)
    zr = P[:, :, 2].mean(1); rr = np.hypot(P[:, :, 0] - AX[0], P[:, :, 1] - AX[1])
    order = np.argsort(zr)
    out = np.zeros(nth)
    for j in range(nth):
        out[j] = np.interp(z, zr[order], rr[order, j])
    return out

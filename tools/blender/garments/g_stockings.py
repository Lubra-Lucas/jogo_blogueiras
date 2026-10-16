"""6. Meias 7/8 (thigh-high) pastel semi-transparentes com barra de renda escalopada. Tubos parametricos medidos nas pernas do corpo."""
import numpy as np, math
from garment_lib import *
from garment_extras import smoothstep, orient_polys

NB = 28
Z_TOP = 0.705
Z_BOT = 0.125
LACE_H = 0.075


def leg_rings(body, state, sgn, zs):
    """ring centres and polar radii for the leg on side sgn (+x = left)"""
    P = body.P[state]
    nm = "Left" if sgn > 0 else "Right"
    m = body.group_mask(f"{nm}UpLeg", f"{nm}Leg", f"{nm}Foot", f"{nm}ToeBase", thr=0.45) & (np.sign(P[:, 0]) == sgn)
    Q = P[m]
    C = np.zeros((len(zs), 2)); R = np.zeros((len(zs), NB))
    for i, z in enumerate(zs):
        half = 0.011
        s = Q[np.abs(Q[:, 2] - z) < half]
        if len(s) < 6: s = Q[np.abs(Q[:, 2] - z) < 2 * half]
        # centre: mid of bbox (robust for the oval sections)
        c = (s[:, :2].min(0) + s[:, :2].max(0)) / 2
        d = s[:, :2] - c; th = np.arctan2(d[:, 0], -d[:, 1]) % (2 * math.pi); r = np.hypot(d[:, 0], d[:, 1])
        k = (th / (2 * math.pi) * NB).astype(int) % NB
        rr = np.zeros(NB); np.maximum.at(rr, k, r)
        for j in range(NB):
            if rr[j] == 0:
                a = 1
                while rr[(j + a) % NB] == 0 and rr[(j - a) % NB] == 0 and a < NB: a += 1
                rr[j] = max(rr[(j + a) % NB], rr[(j - a) % NB])
        for _ in range(2): rr = np.maximum(rr, 0.5 * (np.roll(rr, 1) + np.roll(rr, -1)))
        C[i] = c; R[i] = rr
    # smooth along the leg
    for _ in range(3):
        C[1:-1] = (C[:-2] + 2 * C[1:-1] + C[2:]) / 4
        R[1:-1] = (R[:-2] + 2 * R[1:-1] + R[2:]) / 4
    for _ in range(2): R = (np.roll(R, 1, 1) + 2 * R + np.roll(R, -1, 1)) / 4
    return C, R


def build(body):
    nr = int(round((Z_TOP - Z_BOT) / 0.0165)) + 1
    zs = np.linspace(Z_TOP, Z_BOT, nr)           # ring 0 at the top
    th = np.arange(NB) * 2 * math.pi / NB
    G = Garment("stockings", body)
    polys_leg = []
    for i in range(nr - 1):
        for j in range(NB):
            polys_leg.append((i * NB + j, i * NB + (j + 1) % NB, (i + 1) * NB + (j + 1) % NB, (i + 1) * NB + j))
    ring_ref = np.tile(np.stack([np.sin(th), -np.cos(th), np.zeros(NB)], 1), (nr, 1))
    S = {s: [] for s in body.states}
    for sgn in (1, -1):
        for s in body.states:
            C, R = leg_rings(body, s, sgn, zs)
            R = R + 0.0045
            P = np.zeros((nr, NB, 3))
            scal = 0.011 * np.sqrt(np.clip(1 - (2 * ((th * 14 / (2 * math.pi)) % 1) - 1) ** 2, 0, 1))
            for i in range(nr):
                P[i, :, 0] = C[i, 0] + R[i] * np.sin(th); P[i, :, 1] = C[i, 1] - R[i] * np.cos(th); P[i, :, 2] = zs[i]
            P[0, :, 2] += scal                      # scalloped lace edge
            S[s].append(P.reshape(-1, 3))
    n1 = nr * NB
    states = {}
    for s in body.states:
        A = np.concatenate(S[s])
        A = clearance(A, body, s, 0.003, 2) if s == "Basis" else A
        states[s] = A
    # polish: make sure every state keeps >= 3 mm clearance (cheap pass only where needed)
    for s in body.states:
        if s != "Basis": states[s] = clearance(states[s], body, s, 0.003, 1)
    polys = polys_leg + [tuple(i + n1 for i in p) for p in polys_leg]
    n = 2 * n1
    g = Graph(n, polys)
    base = states["Basis"]
    # weights from the nearest body surface point
    fi, bc, ds = nearest_info(body, base)
    tv = body.tris[fi]
    W = (body.W[tv] * bc[:, :, None]).sum(1)
    W = weights_smooth(g, W, 2)
    # materials: lace band on the top rows, sheer elsewhere
    ring_of_poly = np.array([p[0] // NB % nr for p in polys])
    lace_rows = int(round(LACE_H / 0.0165))
    mats = ["trim" if r < lace_rows else "base" for r in ring_of_poly]
    # uv: lace repeats every ~4 cm
    uv = []
    for p in polys:
        for v in p:
            leg = v // n1; i = (v % n1) // NB; j = v % NB
            uv.append(((j / NB) * (2 * math.pi * 0.06) / 0.05, zs[i] / 0.05))
    G.add(states, polys, mats, np.array(uv), W)
    mats_ = {"base": ("#ffd6e8", "tulle"), "trim": ("#ffffff", "lace")}
    meta = dict(id="stockings", label="Meias 7/8 com renda", slot="legwear", slots=["base", "trim"],
                palette={"base": "#ffd6e8", "trim": "#ffffff"}, finish={"base": "tulle", "trim": "lace"},
                finishesSupported={"base": ["tulle", "satin", "latex", "matte"], "trim": ["lace", "satin", "tulle"]},
                covers=["thighs", "knees", "calves", "ankles"], hides=[], notes="sheer (alpha blend), lace = alpha texture tex/lace.png; ends at the ankle (shoes go over the foot)")
    return G, mats_, meta

"""Achata e alisa a regiao dos olhos da boneca (cilios/contorno ESCULPIDOS em relevo) sobre a pele, por suavizacao (Laplaciano) restrita a regiao.
Nao apaga faces: a topologia e as bordas ficam intactas; vertices duplicados por costura de UV/normal sao soldados por posicao e movem juntos.
Uso como modulo: flatten(P, N, IDX) -> (P', N', info)"""
import numpy as np
import scipy.sparse as sp

EYE_C = (0.0655, 1.401)      # centro (|x|, y) da regiao de limpeza (m)
EYE_R = (0.060, 0.058)       # raios da regiao


def sstep(t):
    t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)


def region_weight(P):
    r = np.sqrt(((np.abs(P[:, 0]) - EYE_C[0]) / EYE_R[0]) ** 2 + ((P[:, 1] - EYE_C[1]) / EYE_R[1]) ** 2)
    w = 1 - sstep((r - 0.88) / 0.12)
    w[P[:, 2] < 0.03] = 0
    w = w * sstep((np.abs(P[:, 0]) - 0.012) / 0.02)       # nao toca a ponte do nariz entre os olhos
    return w


def poly_terms(u, v, deg=5):
    cols = []
    for i in range(deg + 1):
        for j in range(deg + 1 - i): cols.append((u ** i) * (v ** j))
    return np.stack(cols, 1)


def fit_surface(pts, deg=5, tol=0.0007, rounds=8):
    """z = f(u, v) robusto a pontos ALTOS (relevo dos cilios): reajusta descartando quem esta acima da superficie + tol"""
    u = (pts[:, 0] - EYE_C[0]) / EYE_R[0]; v = (pts[:, 1] - EYE_C[1]) / EYE_R[1]
    X = poly_terms(u, v, deg); z = pts[:, 2]
    keep = np.ones(len(z), bool)
    for _ in range(rounds):
        coef, *_ = np.linalg.lstsq(X[keep], z[keep], rcond=None)
        res = z - X @ coef
        keep = res < tol
        if keep.sum() < 40: break
    return coef


def eval_surface(coef, pts, deg=5):
    u = (pts[:, 0] - EYE_C[0]) / EYE_R[0]; v = (pts[:, 1] - EYE_C[1]) / EYE_R[1]
    return poly_terms(u, v, deg) @ coef


def flatten(P, N, IDX, deg=6, tol=0.0006):
    """Os cilios/pálpebras ESCULPIDOS sao relevo (fitas finas) soldado a malha. Em vez de apagar faces (que rompeu a borda na tentativa anterior):
    todo vertice da regiao e ASSENTADO sobre uma superficie de pele suave (regressao polinomial robusta aos pontos altos), com mistura suave na
    borda da regiao, e as normais viram as normais ANALITICAS dessa superficie. As fitas viram faces coplanares com a pele e com as mesmas
    normais, entao nao ha cacos, buracos nem relevo antigo; topologia intacta."""
    P = P.copy()
    wP = region_weight(P)
    Pn = P.copy(); Nn = N.copy()
    for sg in (1, -1):
        side = (np.sign(P[:, 0]) == sg) & (wP > 1e-4)
        pts = P[side].copy(); pts[:, 0] = np.abs(pts[:, 0])
        coef = fit_surface(pts, deg, tol)
        zr = eval_surface(coef, pts, deg)
        w = wP[side]
        Pn[side, 2] = P[side, 2] * (1 - w) + zr * w
        # normal analitica da superficie z = f(|x|, y)
        d = 1e-4
        px = pts.copy(); px[:, 0] += d; mx = pts.copy(); mx[:, 0] -= d
        py = pts.copy(); py[:, 1] += d; my = pts.copy(); my[:, 1] -= d
        dzdx = (eval_surface(coef, px, deg) - eval_surface(coef, mx, deg)) / (2 * d) * sg      # x real = sg*|x|
        dzdy = (eval_surface(coef, py, deg) - eval_surface(coef, my, deg)) / (2 * d)
        nrm = np.stack([-dzdx, -dzdy, np.ones_like(dzdx)], 1)
        nrm /= np.linalg.norm(nrm, axis=1)[:, None]
        n0 = N[side]
        Nn[side] = n0 * (1 - w[:, None]) + nrm * w[:, None]
    Nn /= np.maximum(np.linalg.norm(Nn, axis=1), 1e-12)[:, None]
    return Pn, Nn, {"region_verts": int((wP > 1e-4).sum()), "max_move_mm": float(np.linalg.norm(Pn - P, axis=1).max() * 1000), "mean_move_mm": float(np.linalg.norm(Pn - P, axis=1)[wP > 0.5].mean() * 1000)}


def drop_reversed(P0, Pn, Nn, IDX, wthr=0.3, dotmin=0.3):
    """Apos assentar a regiao, as fitas viram faces coplanares com a pele; as que ficaram INVERTIDAS (ou degeneradas) causariam z-fighting com
    sombra errada (material double-sided). Remove so essas faces (a face frontal da mesma fita continua cobrindo a area: sem buracos).
    Devolve (IDX filtrado, n_removidas, bordas_novas)."""
    w = region_weight(P0)
    tri = IDX
    inreg = (w[tri] > wthr).all(1)
    fn = np.cross(Pn[tri[:, 1]] - Pn[tri[:, 0]], Pn[tri[:, 2]] - Pn[tri[:, 0]])
    area = np.linalg.norm(fn, axis=1) * 0.5
    nav = Nn[tri].sum(1); nav /= np.maximum(np.linalg.norm(nav, axis=1), 1e-12)[:, None]
    dot = (fn / np.maximum(np.linalg.norm(fn, axis=1), 1e-18)[:, None] * nav).sum(1)
    drop = inreg & ((dot < dotmin) | (area < 1e-9))
    return IDX[~drop], int(drop.sum())


def boundary_edges(P, IDX, mask_fn=None):
    key = np.round(P * 1e5).astype(np.int64)
    _, inv = np.unique(key, axis=0, return_inverse=True); inv = inv.ravel()
    t = inv[IDX]
    ed = np.sort(np.concatenate([t[:, [0, 1]], t[:, [1, 2]], t[:, [2, 0]]]), 1)
    u, cnt = np.unique(ed, axis=0, return_counts=True)
    return u[cnt == 1], inv

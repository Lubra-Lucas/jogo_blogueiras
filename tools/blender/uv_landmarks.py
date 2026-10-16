"""
Pontos de referencia do rosto no espaco UV da malha do corpo (0..1), para o jogo desenhar maquiagem
na textura de pele (olhos, labios, blush, sombra, delineador).

O mapeamento UV do rosto do MakeHuman e "polar" (aneis em volta dos olhos e da boca), entao formas
desenhadas direto em UV ficariam distorcidas. Por isso as formas sao definidas em 3D (metros, na
vista frontal) e cada ponto e projetado na superficie do rosto (raio +Y) e convertido para UV por
interpolacao baricentrica. O jogo so preenche poligonos (com borda suave) nessas coordenadas UV.

Fontes dos dados:
  - Contorno dos olhos e linha dos labios: vertices de "costura" UV (vertices com mais de uma UV: a
    borda entre a ilha do rosto e as ilhas do interior da boca / das orbitas). E exatamente a linha
    das palpebras e dos labios.
  - Sobrancelhas: malha proxy de sobrancelha.
  - Resto (sombra, blush, asa do delineador, contorno dos labios): formas parametricas ancoradas nesses pontos.

Convencao: "l" = lado esquerdo da personagem (+X no Blender). UV com origem embaixo-esquerda (como no glTF/Blender);
no canvas do three.js (flipY=false em GLB) o jogo usa v' = 1 - v ao desenhar - ver README.
"""
import math

import numpy as np
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils import interpolate


class Surface:
    def __init__(self, obj):
        me = obj.data
        me.calc_loop_triangles()
        self.P = np.zeros(len(me.vertices) * 3)
        me.vertices.foreach_get("co", self.P)
        self.P = self.P.reshape(-1, 3)
        uv = np.zeros(len(me.loops) * 2)
        me.uv_layers.active.data.foreach_get("uv", uv)
        self.uv = uv.reshape(-1, 2)
        vi = np.zeros(len(me.loops), dtype=np.int64)
        me.loops.foreach_get("vertex_index", vi)
        self.loop_v = vi
        self.vuv = {}
        for l, v in enumerate(vi):
            self.vuv.setdefault(int(v), []).append(self.uv[l])
        self.tris = [(t.vertices[0], t.vertices[1], t.vertices[2]) for t in me.loop_triangles]
        self.tri_loops = [tuple(t.loops) for t in me.loop_triangles]
        verts = [Vector(p) for p in self.P]
        self.bvh = BVHTree.FromPolygons(verts, self.tris, all_triangles=True)
        self.ref_uv = None

    def uv_at(self, x, z):
        """UV do ponto da superficie em (x, z) visto de frente (raio +Y a partir de y=-1). None se falhar."""
        loc, nor, idx, dist = self.bvh.ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)))
        if loc is None:
            return None, None
        tri = self.tris[idx]
        w = interpolate.poly_3d_calc([Vector(self.P[i]) for i in tri], loc)
        uv = sum((np.array(self.uv[l]) * w[k] for k, l in enumerate(self.tri_loops[idx])), np.zeros(2))
        if self.ref_uv is not None and np.linalg.norm(uv - self.ref_uv) > 0.2:
            return None, None
        return uv, loc

    def face_uv_of_vertex(self, v):
        """UV do vertice na ilha do rosto (vertices de costura tem varias UVs; pega a mais proxima do nariz)."""
        c = self.vuv[int(v)]
        if self.ref_uv is None:
            return np.array(c[0])
        u = np.array(min(c, key=lambda u: np.linalg.norm(u - self.ref_uv)))
        if np.linalg.norm(u - self.ref_uv) > 0.2:  # vertice so existe fora da ilha: projeta
            uv, _ = self.uv_at(self.P[v, 0], self.P[v, 2])
            if uv is not None:
                return uv
        return u


def r4(a):
    return [round(float(x), 4) for x in a]


def smooth_curve(xs, ys, n):
    xs = np.asarray(xs)
    ys = np.asarray(ys)
    o = np.argsort(xs)
    xq = np.linspace(xs[o][0], xs[o][-1], n)
    return xq, np.interp(xq, xs[o], ys[o])


def compute(ctx):
    """Retorna dict `uvLandmarks` (ver docs/ARCHITECTURE.md)."""
    S = Surface(ctx.body)
    P = S.P
    # referencia: ponta do nariz -> define a ilha do rosto
    # ponto mais a frente (y minimo) do rosto na linha central
    face = np.nonzero((np.abs(P[:, 0]) < 0.004) & (P[:, 2] > 1.25) & (P[:, 2] < 1.5))[0]
    nt = face[np.argmin(P[face, 1])]
    S.ref_uv = np.array(S.vuv[int(nt)][0])
    nose_tip = P[nt]

    # --- vertices de costura (mais de uma UV) -------------------------------------------------
    seam = [v for v, l in S.vuv.items() if np.ptp(np.array(l), axis=0).max() > 1e-4 and P[v, 2] > 1.3 and P[v, 1] < -0.09]
    seam = np.array(seam)

    out = {"space": "uv", "origin": "bottom-left", "note": "UV 0..1 do mesh Body; v cresce para cima (glTF/Blender)."}
    # --- olhos -------------------------------------------------------------------------------
    eyes = {}
    for side, s in (("l", 1.0), ("r", -1.0)):
        sel = seam[(P[seam, 0] * s > 0.02) & (P[seam, 2] > 1.40) & (P[seam, 2] < 1.46)]
        pts = P[sel]
        c3 = pts.mean(0)
        inner = sel[np.argmin(np.abs(P[sel, 0]))]
        outer = sel[np.argmax(np.abs(P[sel, 0]))]
        ax = np.abs(P[sel, 0])
        # linha entre os cantos: acima = palpebra superior, abaixo = inferior
        pi, po = P[inner], P[outer]
        t = (P[sel, 0] - pi[0]) / (po[0] - pi[0])
        zline = pi[2] + t * (po[2] - pi[2])
        up = sel[P[sel, 2] >= zline]
        lo = sel[P[sel, 2] < zline]
        up = up[np.argsort(np.abs(P[up, 0]))]
        lo = lo[np.argsort(np.abs(P[lo, 0]))]
        # contorno completo (ordem anti-horaria no plano x,z)
        ang = np.arctan2(P[sel, 2] - c3[2], (P[sel, 0] - c3[0]) * s)
        loop = sel[np.argsort(ang)]
        uvc = lambda v: S.face_uv_of_vertex(v)
        uv_up = [uvc(v) for v in up]
        uv_lo = [uvc(v) for v in lo]
        uv_c = np.mean([uvc(v) for v in sel], axis=0)
        w3 = abs(po[0] - pi[0])
        wuv = np.linalg.norm(uvc(outer) - uvc(inner))
        # delineador: faixa fina sobre a borda da palpebra (espessura em metros, mapeada em 3D -> UV)
        # (o UV do rosto e muito anisotropico perto dos olhos, entao a espessura NAO pode ser em pixels)
        T = 0.0016
        liner_top = []
        for v in up:
            u, _ = S.uv_at(P[v, 0], P[v, 2] + T)
            liner_top.append(u if u is not None else uvc(v))
        liner_poly = list(uv_up) + liner_top[::-1]
        # asa (tamanho 1.0): triangulo a partir do canto externo, subindo e saindo; o jogo escala em torno de `outer`
        xo, zo = float(po[0]), float(po[2])
        def at(dx, dz):
            u, _ = S.uv_at(xo + s * dx, zo + dz)
            return u
        wing_pts = [at(-0.003, 0.0), at(0.0055, 0.0035), at(0.0125, 0.0082), at(0.0050, 0.0058), at(-0.003, T)]
        uv_wing = [w for w in wing_pts if w is not None]
        # sombra: da palpebra ate a dobra (poligono em 3D -> UV)
        ux = np.abs(P[up, 0])
        zup = P[up, 2]
        n = 14
        xq, zq = smooth_curve(ux, zup, n)
        top = []
        for k, (x, z) in enumerate(zip(xq, zq)):
            u = k / (n - 1)
            hgt = 0.004 + 0.016 * (math.sin(math.pi * min(1.0, max(0.0, u * 0.9 + 0.1))) ** 0.8)
            top.append((s * (x + 0.006 * u), z + hgt))
        top_uv = [S.uv_at(x, z)[0] for (x, z) in top[::-1]]
        shadow_poly = list(uv_up) + [u for u in top_uv if u is not None]
        eyes[side] = {
            "center": r4(uv_c), "inner": r4(uvc(inner)), "outer": r4(uvc(outer)),
            "contour": [r4(uvc(v)) for v in loop],
            "upperLid": [r4(u) for u in uv_up], "liner": [r4(u) for u in liner_poly], "lowerLid": [r4(u) for u in uv_lo],
            "wing": [r4(u) for u in uv_wing],
            "shadow": [r4(u) for u in shadow_poly],
            "widthMeters": round(float(w3), 4), "uvPerMeter": round(float(wuv / w3), 3),
            "center3d": r4(c3),
        }
        eyes[side]["_inner3"] = pi
        eyes[side]["_outer3"] = po
    out["eyes"] = {k: {kk: vv for kk, vv in v.items() if not kk.startswith("_")} for k, v in eyes.items()}

    # --- sobrancelhas ------------------------------------------------------------------------
    B = np.zeros(len(ctx.proxies["Eyebrows"][0].data.vertices) * 3)
    ctx.proxies["Eyebrows"][0].data.vertices.foreach_get("co", B)
    B = B.reshape(-1, 3)
    brows = {}
    for side, s in (("l", 1.0), ("r", -1.0)):
        Bs = B[B[:, 0] * s > 0.01]
        xs, zs = np.abs(Bs[:, 0]), Bs[:, 2]
        xq = np.linspace(xs.min(), xs.max(), 7)
        line = []
        for a, b in zip(xq[:-1], xq[1:]):
            m = (xs >= a) & (xs <= b)
            if m.any():
                uv, _ = S.uv_at(s * xs[m].mean(), zs[m].mean())
                if uv is not None:
                    line.append(r4(uv))
        uvc_, _ = S.uv_at(s * xs.mean(), zs.mean())
        brows[side] = {"center": r4(uvc_) if uvc_ is not None else None, "line": line}
    out["brows"] = brows

    # --- boca --------------------------------------------------------------------------------
    ms = seam[(np.abs(P[seam, 0]) < 0.05) & (P[seam, 2] > 1.32) & (P[seam, 2] < 1.352) & (P[seam, 1] < -0.115)]
    mp = P[ms]
    xs = mp[:, 0]
    left = ms[np.argmax(xs)]
    right = ms[np.argmin(xs)]
    order = ms[np.argsort(P[ms, 0])]
    uvc = S.face_uv_of_vertex
    slit_x = P[order, 0]
    slit_z = P[order, 2]
    hw = float(max(abs(xs.min()), abs(xs.max())))
    zc = float(np.interp(0.0, slit_x, slit_z))
    HU, HL = 0.0145, 0.0165

    def slit_z_at(x):
        return float(np.interp(x, slit_x, slit_z))
    upper, lower = [], []
    nn = 25
    for k in range(nn):
        u = -1 + 2 * k / (nn - 1)
        x = u * hw
        sh = max(0.0, 1 - u * u)
        bow = 1.0 - 0.22 * math.exp(-(x / 0.0045) ** 2) + 0.12 * math.exp(-((abs(x) - 0.0075) / 0.003) ** 2)
        upper.append((x, slit_z_at(x) + HU * sh ** 0.55 * bow))
        lower.append((x, slit_z_at(x) - HL * sh ** 0.7))
    # ordem: canto esquerdo -> borda superior (da esquerda p/ direita da personagem = x decrescente) -> canto direito -> inferior
    poly = [uvc(left)] + [S.uv_at(x, z)[0] for (x, z) in upper[::-1][1:-1] if S.uv_at(x, z)[0] is not None] \
        + [uvc(right)] + [S.uv_at(x, z)[0] for (x, z) in lower[1:-1] if S.uv_at(x, z)[0] is not None]
    bins = np.linspace(-hw, hw, 11)
    slit_uv = []
    for a_, b_ in zip(bins[:-1], bins[1:]):
        m_ = [v for v in order if a_ <= P[v, 0] <= b_]
        if m_:
            slit_uv.append(r4(np.mean([uvc(v) for v in m_], axis=0)))
    mouth = {
        "center": r4(np.mean(slit_uv, axis=0)),
        "cornerL": r4(uvc(left)), "cornerR": r4(uvc(right)),
        "slit": slit_uv,
        "outline": [r4(p) for p in poly],
        "upperLip": [r4(uvc(left))] + [r4(S.uv_at(x, z)[0]) for (x, z) in upper[::-1][1:-1] if S.uv_at(x, z)[0] is not None] + [r4(uvc(right))],
        "lowerLip": [r4(uvc(left))] + [r4(S.uv_at(x, z)[0]) for (x, z) in lower[::-1][1:-1] if S.uv_at(x, z)[0] is not None] + [r4(uvc(right))],
        "widthMeters": round(2 * hw, 4), "heightMeters": round(HU + HL, 4),
        "upperHeightMeters": HU, "lowerHeightMeters": HL,
    }
    # escala UV/m na boca
    wuv = np.linalg.norm(uvc(left) - uvc(right))
    mouth["uvPerMeter"] = round(float(wuv / (2 * hw)), 3)
    out["mouth"] = mouth

    # --- blush (elipses nas macas do rosto) ---------------------------------------------------
    eye_z = float(eyes["l"]["center3d"][2])
    blush = {}
    for side, s in (("l", 1.0), ("r", -1.0)):
        cx, cz = s * 0.064, eye_z - 0.047
        rx, rz = 0.027, 0.019
        poly = []
        for k in range(28):
            a = 2 * math.pi * k / 28
            # elipse inclinada (mais alta para fora)
            ex, ez = rx * math.cos(a), rz * math.sin(a)
            tilt = math.radians(14)
            x = cx + s * (ex * math.cos(tilt) - ez * math.sin(tilt))
            z = cz + (ex * math.sin(tilt) + ez * math.cos(tilt))
            uv, _ = S.uv_at(x, z)
            if uv is not None:
                poly.append(r4(uv))
        cu, _ = S.uv_at(cx, cz)
        blush[side] = {"center": r4(cu), "polygon": poly}
    out["blush"] = blush

    # --- nariz ---------------------------------------------------------------------------------
    nu, _ = S.uv_at(0.0, float(nose_tip[2]))
    out["noseTip"] = r4(nu if nu is not None else S.ref_uv)
    out["faceRefUv"] = r4(S.ref_uv)
    return out

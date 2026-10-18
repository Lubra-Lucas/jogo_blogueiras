"""Biblioteca dos morphs de formato do rosto (v2): geometria, landmarks por genero e definicao dos morphs.
Sem Blender (numpy + scipy). Coordenadas glTF: x lateral, y para cima, z para a frente. Deltas em metros sobre o repouso.
As camadas do rosto (olho, boca...) usam a posicao de REPOUSO (varying vRest = position, antes dos morphs), entao acompanham a superficie:
mover vertices na regiao do olho/boca move a camada junto; nenhum offset de camada e necessario."""
import numpy as np
import scipy.sparse as sp
from scipy.spatial import cKDTree


def sstep(t):
    t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)


def bell(r): return 1 - sstep(r)


# ------------------------------------------------------------------ landmarks (x, y; z e lido da superficie)
# eyeX/eyeY/browY/mouthY/noseY/chinY seguem DOLL_REF / MALE_REF (src/shared/faceLayers.ts)
LM = {
    "female": dict(eyeX=0.0585, eyeY=1.390, browY=1.434, mouthY=1.318, noseY=1.352, chinY=1.272, topY=1.60,
                   earX=0.112, earY=1.405, earZ=-0.015, earRy=0.042, earRz=0.05,
                   gonX=0.085, gonY=1.338, zygX=0.083, zygY=1.368, cheekX=0.078, cheekY=1.348,
                   fz0=0.0, fzw=0.05, neckY=1.232, neckZ=-0.008, neckTop=1.262,
                   skullY=1.47, skullZ=-0.012, mouthHalf=0.027, hairY=1.50, jawTop=1.337),
    "male": dict(eyeX=0.0485, eyeY=1.5827, browY=1.609, mouthY=1.5019, noseY=1.5423, chinY=1.4552, topY=1.75,
                 earX=0.108, earY=1.60, earZ=-0.03, earRy=0.062, earRz=0.065,
                 gonX=0.070, gonY=1.497, zygX=0.080, zygY=1.558, cheekX=0.070, cheekY=1.505,
                 fz0=-0.04, fzw=0.06, neckY=1.405, neckZ=-0.045, neckTop=1.46,
                 skullY=1.62, skullZ=-0.02, mouthHalf=0.025, hairY=1.66, jawTop=1.52),
}

# nome -> pico em mm (deslocamento maximo de um vertice com o morph em 1)
MM = {
    "f_jawAngular": 9, "f_jawV": 10, "f_chinForward": 12, "f_chinBack": 10, "f_chinCleft": 3.5, "f_browRidge": 8, "f_foreheadHigh": 10, "f_foreheadLow": 10,
    "f_cheekboneHigh": 7, "f_faceWide": 8, "f_noseLong": 11, "f_noseShort": 10, "f_noseBridge": 7.5, "f_noseUp": 11, "f_noseDown": 10, "f_noseTipRound": 8,
    "f_noseTipThin": 5, "f_nostrilWide": 6.5, "f_noseNarrow": 6, "f_lipsWide": 7, "f_lipsNarrow": 6, "f_lipUpperFull": 5, "f_lipLowerFull": 5,
    "f_mouthCornersUp": 6, "f_mouthCornersDown": 5, "f_mouthHigh": 6, "f_mouthLow": 6, "f_eyesApart": 7, "f_eyesClose": 6, "f_eyesHigh": 6, "f_eyesLow": 6,
    "f_eyeTiltUp": 6, "f_eyeTiltDown": 6, "f_earsSmall": 10, "f_earsBig": 13, "f_earsPointed": 14, "f_neckThick": 12, "f_neckThin": 9,
    "f_headRound": 9, "f_headLong": 9,
    "f_fun_chubbyCheeks": 26, "f_fun_longChin": 28, "f_fun_tinyFace": 14, "f_fun_bigEyesArea": 14, "f_fun_elfEars": 40, "f_fun_roundNose": 16,
    "f_fun_pout": 14, "f_fun_widejaw": 22, "f_fun_heartFace": 14, "f_fun_alienSoft": 20,
}
NO_GAIN = {"f_chinCleft", "f_lipUpperFull", "f_lipLowerFull", "f_noseTipThin", "f_nostrilWide"}

LABELS = {
    "f_jawAngular": "Mandibula angulosa", "f_jawV": "Mandibula em V", "f_chinForward": "Queixo para frente", "f_chinBack": "Queixo para tras",
    "f_chinCleft": "Covinha no queixo", "f_browRidge": "Relevo da sobrancelha", "f_foreheadHigh": "Testa alta", "f_foreheadLow": "Testa baixa",
    "f_cheekboneHigh": "Macas altas", "f_faceWide": "Rosto largo", "f_noseLong": "Nariz longo", "f_noseShort": "Nariz curto", "f_noseBridge": "Ponte do nariz",
    "f_noseUp": "Nariz arrebitado", "f_noseDown": "Ponta do nariz baixa", "f_noseTipRound": "Ponta do nariz redonda", "f_noseTipThin": "Ponta do nariz fina",
    "f_nostrilWide": "Narinas largas", "f_noseNarrow": "Nariz fino", "f_lipsWide": "Boca larga", "f_lipsNarrow": "Boca estreita",
    "f_lipUpperFull": "Labio superior cheio", "f_lipLowerFull": "Labio inferior cheio", "f_mouthCornersUp": "Cantos da boca para cima",
    "f_mouthCornersDown": "Cantos da boca para baixo", "f_mouthHigh": "Boca alta", "f_mouthLow": "Boca baixa", "f_eyesApart": "Olhos afastados",
    "f_eyesClose": "Olhos proximos", "f_eyesHigh": "Olhos altos", "f_eyesLow": "Olhos baixos", "f_eyeTiltUp": "Olhos puxados para cima",
    "f_eyeTiltDown": "Olhos caidos", "f_earsSmall": "Orelhas pequenas", "f_earsBig": "Orelhas grandes", "f_earsPointed": "Orelhas pontudas",
    "f_neckThick": "Pescoco grosso", "f_neckThin": "Pescoco fino", "f_headRound": "Cabeca redonda", "f_headLong": "Cabeca alongada",
    "f_fun_chubbyCheeks": "Bochechas de esquilo", "f_fun_longChin": "Queixao de desenho", "f_fun_tinyFace": "Rostinho miudo",
    "f_fun_bigEyesArea": "Orbitas enormes", "f_fun_elfEars": "Orelhas de elfo", "f_fun_roundNose": "Nariz de batatinha", "f_fun_pout": "Beicinho",
    "f_fun_widejaw": "Queixao de super-heroi", "f_fun_heartFace": "Rosto de coracao", "f_fun_alienSoft": "Testa alta e queixo fino",
}

# morphs a ACRESCENTAR em cada GLB (os que ja existem la ficam como estao)
FEMALE_NEW = [k for k in MM if k != "f_noseNarrow"]                 # f_noseNarrow ja existe na boneca
_MALE_PICK = {
    "f_noseShort", "f_noseUp", "f_noseDown", "f_noseTipRound", "f_noseTipThin", "f_nostrilWide", "f_noseNarrow", "f_lipsWide", "f_lipsNarrow",
    "f_lipUpperFull", "f_lipLowerFull", "f_mouthCornersUp", "f_mouthCornersDown", "f_mouthHigh", "f_mouthLow", "f_eyesApart", "f_eyesClose", "f_eyesHigh",
    "f_eyesLow", "f_eyeTiltUp", "f_eyeTiltDown", "f_earsPointed", "f_headRound", "f_headLong", "f_neckThin",
}
MALE_NEW = [k for k in MM if k in _MALE_PICK or k.startswith("f_fun_")]


class Head:
    def __init__(self, P, N, IDX, gender):
        self.gender = gender; self.L = LM[gender]
        key = np.round(P * 1e5).astype(np.int64)
        _, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True); inv = inv.ravel()
        self.inv = inv; self.U = P[first]; NU = N[first]
        self.NU = NU / np.maximum(np.linalg.norm(NU, axis=1, keepdims=True), 1e-9)
        n = len(self.U); self.n = n
        self.T = inv[IDX]                                         # triangulos nos indices soldados
        t = self.T
        e = np.unique(np.sort(np.concatenate([t[:, [0, 1]], t[:, [1, 2]], t[:, [2, 0]]]), 1), axis=0)
        A = sp.coo_matrix((np.ones(len(e)), (e[:, 0], e[:, 1])), shape=(n, n)); A = (A + A.T).tocsr()
        self.A = A; self.deg = np.maximum(np.asarray(A.sum(1)).ravel(), 1)
        self.x, self.y, self.z = self.U[:, 0], self.U[:, 1], self.U[:, 2]
        self.ax = np.abs(self.x); self.sg = np.sign(self.x); self.zero = np.zeros(n)

    def sm(self, D, it=14):
        for _ in range(it): D = D + 0.5 * ((self.A @ D) / self.deg[:, None] - D)
        return D

    def V(self, dx=0, dy=0, dz=0): return np.stack([dx + self.zero, dy + self.zero, dz + self.zero], 1)

    def b3(self, cx, cy, cz, rx, ry, rz):                           # sino elipsoidal (x espelhado)
        return bell(np.sqrt(((self.ax - cx) / rx) ** 2 + ((self.y - cy) / ry) ** 2 + ((self.z - cz) / rz) ** 2))

    def surf_z(self, x, y, r=0.008):
        """z da superficie FRONTAL em (x, y)"""
        for k in (1, 2, 4, 8):
            m = (np.abs(self.ax - abs(x)) < r * k) & (np.abs(self.y - y) < r * k)
            if m.any(): return float(self.z[m].max())
        return 0.0


def generate(h: Head, names):
    """Devolve {nome: delta (n,3) sobre os vertices soldados, ja suavizado e normalizado ao pico em mm}."""
    L = h.L; x, y, z, ax, sg = h.x, h.y, h.z, h.ax, h.sg
    V, b3, NU = h.V, h.b3, h.NU
    D = (L["eyeY"] - L["chinY"]) / 0.1275                           # escala relativa ao masculino
    front = sstep((z - L["fz0"]) / L["fzw"])
    sz = h.surf_z
    chinZ = sz(0.0, L["chinY"] + 0.012); mouthZ = sz(0.0, L["mouthY"]); noseZ = sz(0.0, L["noseY"]); browZ = sz(0.0, L["browY"])
    eyeZ = sz(L["eyeX"], L["eyeY"])
    out = {}
    N = lambda n: n in names
    rad = lambda v: v * D                                           # raio escalado ao tamanho do rosto

    # ---------------- mandibula / queixo
    lowerMask = sstep((L["jawTop"] + 0.015 - y) / 0.07) * sstep((y - (L["chinY"] - 0.055)) / 0.03) * front
    gon = b3(L["gonX"], L["gonY"], L["fz0"] + 0.04, rad(0.06), rad(0.056), rad(0.09))
    ch2 = b3(0.030, L["chinY"] + 0.007, chinZ - 0.005, rad(0.045), rad(0.04), rad(0.055))
    chin = b3(0.0, L["chinY"] + 0.011, chinZ, rad(0.065), rad(0.046), rad(0.065))
    if N("f_jawAngular"):
        out["f_jawAngular"] = V(dx=sg * (0.0085 * gon + 0.006 * ch2), dy=-0.007 * gon - 0.005 * ch2, dz=-0.004 * gon)
    if N("f_jawV"):
        vt = sstep((L["jawTop"] - y) / 0.075) * sstep((y - (L["chinY"] - 0.025)) / 0.03) * front
        out["f_jawV"] = V(dx=-x * 0.16 * vt, dz=0.004 * vt * (1 - sstep(ax / 0.06))) + V(dx=sg * 0.004 * b3(L["gonX"] + 0.002, L["gonY"], L["fz0"] + 0.04, rad(0.04), rad(0.03), rad(0.09)))
    if N("f_chinForward"): out["f_chinForward"] = V(dy=-0.002 * chin, dz=0.013 * chin)
    if N("f_chinBack"): out["f_chinBack"] = V(dz=-0.011 * chin)
    if N("f_chinCleft"):
        cl = b3(0.0, L["chinY"] + 0.013, chinZ + 0.004, 0.0075, rad(0.012), rad(0.03))
        out["f_chinCleft"] = NU * (-0.0035 * cl)[:, None]

    # ---------------- sobrancelha / testa
    if N("f_browRidge"):
        brow = b3(0.0, L["browY"], browZ, rad(0.075), rad(0.014), rad(0.05)) * front
        out["f_browRidge"] = V(dy=0.0015 * brow, dz=0.0105 * brow)
    fh = sstep((y - (L["browY"] - 0.029 * D)) / (0.04 * D)) * (1 - sstep((y - (L["browY"] + 0.003 * D)) / (0.022 * D))) * front
    if N("f_foreheadHigh"): out["f_foreheadHigh"] = V(dy=0.010 * fh, dz=0.006 * fh)
    if N("f_foreheadLow"): out["f_foreheadLow"] = V(dy=-0.010 * fh, dz=-0.002 * fh)

    # ---------------- macas / largura
    if N("f_cheekboneHigh"):
        zyg = b3(L["zygX"], L["zygY"], sz(L["zygX"], L["zygY"]), rad(0.04), rad(0.03), rad(0.06))
        out["f_cheekboneHigh"] = NU * (0.0075 * zyg)[:, None] + V(dy=0.0045 * zyg)
    ww = sstep((y - (L["chinY"] - 0.015)) / 0.06) * (1 - sstep((y - (L["browY"] + 0.036 * D)) / 0.045)) * sstep((z - (L["fz0"] - 0.08)) / 0.10)
    if N("f_faceWide"): out["f_faceWide"] = V(dx=x * 0.075 * ww)

    # ---------------- nariz
    nTip = b3(0.0, L["noseY"] + 0.0015, noseZ, rad(0.02), rad(0.025), rad(0.03))
    if N("f_noseLong"): out["f_noseLong"] = V(dy=-0.0085 * nTip, dz=0.005 * nTip)
    if N("f_noseShort"): out["f_noseShort"] = V(dy=0.0085 * nTip, dz=-0.005 * nTip)
    if N("f_noseUp"): out["f_noseUp"] = V(dy=0.008 * nTip, dz=-0.0025 * nTip)
    if N("f_noseDown"): out["f_noseDown"] = V(dy=-0.008 * nTip, dz=0.002 * nTip)
    if N("f_noseBridge"):
        by = L["noseY"] + 0.036 * D
        brg = b3(0.0, by, sz(0.0, by), 0.014, rad(0.03), rad(0.035))
        out["f_noseBridge"] = V(dz=0.0075 * brg)
    ala = b3(0.0, L["noseY"] - 0.006, noseZ - 0.008, rad(0.032), rad(0.022), rad(0.035))
    if N("f_noseNarrow"): out["f_noseNarrow"] = V(dx=-sg * 0.0065 * ala * sstep(ax / 0.006))
    if N("f_noseTipRound"):
        tw = b3(0.0, L["noseY"], noseZ, rad(0.026), rad(0.022), rad(0.03))
        out["f_noseTipRound"] = NU * (0.006 * tw)[:, None] + V(dx=sg * 0.002 * tw * sstep(ax / 0.005))
    if N("f_noseTipThin"):
        tw = b3(0.0, L["noseY"], noseZ, rad(0.026), rad(0.022), rad(0.03))
        out["f_noseTipThin"] = NU * (-0.003 * tw)[:, None] + V(dx=-sg * 0.0025 * tw * sstep(ax / 0.005))
    if N("f_nostrilWide"):
        ns = b3(0.015 * D, L["noseY"] - 0.011, noseZ - 0.012, rad(0.016), rad(0.012), rad(0.02))
        out["f_nostrilWide"] = V(dx=sg * 0.006 * ns, dy=0.0006 * ns) + NU * (0.0015 * ns)[:, None]
    if N("f_fun_roundNose"):
        bb = b3(0.0, L["noseY"] - 0.001, noseZ - 0.004, rad(0.034), rad(0.032), rad(0.04))
        out["f_fun_roundNose"] = NU * (0.014 * bb)[:, None] + V(dx=sg * 0.004 * bb * sstep(ax / 0.006), dz=0.004 * bb)

    # ---------------- boca (a boca em si e camada: so volume/posicao da superficie)
    my = L["mouthY"]
    mw = b3(0.0, my, mouthZ - 0.006, rad(0.062), rad(0.022), rad(0.05)) * front
    if N("f_lipsWide"): out["f_lipsWide"] = V(dx=x * 0.22 * mw)
    if N("f_lipsNarrow"): out["f_lipsNarrow"] = V(dx=-x * 0.19 * mw)
    if N("f_lipUpperFull"):
        up = b3(0.0, my + 0.008 * D, mouthZ, rad(0.03), rad(0.008), rad(0.03)) * front
        out["f_lipUpperFull"] = NU * (0.005 * up)[:, None] + V(dy=0.0008 * up)
    if N("f_lipLowerFull"):
        lo = b3(0.0, my - 0.009 * D, mouthZ - 0.002, rad(0.03), rad(0.009), rad(0.03)) * front
        out["f_lipLowerFull"] = NU * (0.005 * lo)[:, None] + V(dy=-0.0008 * lo)
    cx = L["mouthHalf"]
    if N("f_mouthCornersUp") or N("f_mouthCornersDown"):
        co = b3(cx, my, mouthZ - 0.012, rad(0.022), rad(0.014), rad(0.04)) * front
        if N("f_mouthCornersUp"): out["f_mouthCornersUp"] = V(dy=0.006 * co, dx=sg * 0.0012 * co, dz=0.0006 * co)
        if N("f_mouthCornersDown"): out["f_mouthCornersDown"] = V(dy=-0.005 * co, dx=-sg * 0.0008 * co)
    mh = b3(0.0, my, mouthZ - 0.01, rad(0.06), rad(0.02), rad(0.05)) * front
    if N("f_mouthHigh"): out["f_mouthHigh"] = V(dy=0.0065 * mh)
    if N("f_mouthLow"): out["f_mouthLow"] = V(dy=-0.0065 * mh)
    if N("f_fun_pout"):
        po = b3(0.0, my, mouthZ - 0.004, rad(0.04), rad(0.022), rad(0.04)) * front
        out["f_fun_pout"] = V(dz=0.014 * po, dx=-x * 0.12 * po) + NU * (0.004 * po)[:, None]

    # ---------------- olhos (regiao da orbita; as camadas acompanham)
    ex, ey = L["eyeX"], L["eyeY"]
    ob = b3(ex, ey, eyeZ - 0.005, rad(0.044), rad(0.032), rad(0.07)) * front
    if N("f_eyesApart"): out["f_eyesApart"] = V(dx=sg * 0.007 * ob)
    if N("f_eyesClose"): out["f_eyesClose"] = V(dx=-sg * 0.006 * ob)
    if N("f_eyesHigh"): out["f_eyesHigh"] = V(dy=0.006 * ob)
    if N("f_eyesLow"): out["f_eyesLow"] = V(dy=-0.006 * ob)
    if N("f_eyeTiltUp") or N("f_eyeTiltDown"):
        rx_ = ax - ex; ry_ = y - ey
        for nm_, s_ in (("f_eyeTiltUp", 1.0), ("f_eyeTiltDown", -1.0)):
            if N(nm_): out[nm_] = V(dx=sg * (-s_ * 0.2 * ry_) * ob, dy=s_ * 0.2 * rx_ * ob)
    if N("f_fun_bigEyesArea"):
        ob2 = b3(ex, ey, eyeZ - 0.005, rad(0.056), rad(0.046), rad(0.07)) * front
        out["f_fun_bigEyesArea"] = V(dx=sg * (ax - ex) * 0.42 * ob2, dy=(y - ey) * 0.42 * ob2, dz=0.004 * ob2)

    # ---------------- orelhas
    ear = ((ax > L["earX"] - 0.015) & (np.abs(y - L["earY"]) < L["earRy"] + 0.012) & (np.abs(z - L["earZ"]) < L["earRz"] + 0.012)).astype(float)
    ear = h.sm(ear[:, None], 1)[:, 0] * ear
    rel = np.stack([x - sg * L["earX"], y - L["earY"], z - L["earZ"]], 1)
    if N("f_earsBig"): out["f_earsBig"] = rel * 0.28 * ear[:, None] + V(dx=sg * 0.003) * ear[:, None]
    if N("f_earsSmall"): out["f_earsSmall"] = -rel * 0.22 * ear[:, None]
    upE = sstep((y - L["earY"] + 0.01) / (L["earRy"] * 1.2))
    if N("f_earsPointed"): out["f_earsPointed"] = V(dy=0.022 * upE * ear, dz=-0.006 * upE * ear, dx=sg * 0.002 * ear)
    if N("f_fun_elfEars"):
        e2 = ear * (0.35 + 0.65 * upE)
        out["f_fun_elfEars"] = V(dy=0.050 * upE * e2, dz=-0.012 * upE * e2, dx=sg * 0.014 * upE * e2) + rel * 0.2 * ear[:, None]

    # ---------------- pescoco
    nk = bell(np.abs(y - L["neckY"]) / 0.055) * (y < L["neckTop"])
    radv = np.stack([x, h.zero, z - L["neckZ"]], 1)
    if N("f_neckThick"): out["f_neckThick"] = radv * (0.16 * nk)[:, None]
    if N("f_neckThin"): out["f_neckThin"] = radv * (-0.12 * nk)[:, None]

    # ---------------- cranio
    skl = sstep((y - ey) / 0.05) * (1 - sstep((y - (L["topY"] - 0.035)) / 0.035))
    zc = L["skullZ"]
    if N("f_headRound"): out["f_headRound"] = V(dx=x * 0.06 * skl, dz=-(z - zc) * 0.05 * skl * sstep((L["fz0"] + 0.06 - z) / 0.1))
    if N("f_headLong"): out["f_headLong"] = V(dx=-x * 0.045 * skl, dz=(z - zc) * 0.07 * skl * sstep((zc + 0.02 - z) / 0.05))

    # ---------------- divertidos
    if N("f_fun_chubbyCheeks"):
        c1 = b3(L["cheekX"], L["cheekY"], sz(L["cheekX"], L["cheekY"]) - 0.01, rad(0.062), rad(0.058), rad(0.07)) * front
        out["f_fun_chubbyCheeks"] = NU * (0.02 * c1)[:, None] + V(dx=sg * 0.008 * c1)
    if N("f_fun_longChin"):
        c2 = b3(0.0, L["chinY"] + 0.004, chinZ - 0.005, rad(0.075), rad(0.042), rad(0.08)) * front
        out["f_fun_longChin"] = V(dy=-0.028 * c2, dz=0.012 * c2) + NU * (0.003 * c2)[:, None]
    if N("f_fun_tinyFace"):
        cy = 0.5 * (L["browY"] + L["mouthY"] - 0.005)
        fm = front * sstep((y - (L["chinY"] - 0.05)) / 0.05) * (1 - sstep((y - (L["browY"] + 0.02 * D)) / (0.05 * D))) * sstep((0.118 - ax) / 0.04)
        out["f_fun_tinyFace"] = V(dx=-x * 0.2 * fm, dy=-(y - cy) * 0.2 * fm)
    if N("f_fun_widejaw"):
        out["f_fun_widejaw"] = V(dx=sg * 0.02 * sstep(ax / 0.045) * lowerMask + x * 0.28 * chin, dz=0.008 * chin, dy=-0.004 * chin)
    if N("f_fun_heartFace"):
        upm = sstep((y - L["eyeY"] + 0.05 * D) / (0.05 * D)) * (1 - sstep((y - (L["browY"] + 0.05 * D)) / (0.06 * D))) * sstep((z - (L["fz0"] - 0.08)) / 0.1)
        vt2 = sstep((L["jawTop"] + 0.01 - y) / 0.075) * sstep((y - (L["chinY"] - 0.03)) / 0.03) * front
        out["f_fun_heartFace"] = V(dx=x * 0.11 * upm - x * 0.3 * vt2, dy=-0.006 * chin, dz=0.002 * chin)
    if N("f_fun_alienSoft"):
        ft = sstep((y - (L["browY"] - 0.02 * D)) / (0.04 * D)) * (1 - sstep((y - L["hairY"]) / (0.05 * D))) * front
        out["f_fun_alienSoft"] = V(dy=0.026 * ft, dz=0.010 * ft) + V(dx=-x * 0.22 * chin) + V(dx=-sg * 0.004 * gon)

    # ---------------- suaviza (Laplaciano largo) e normaliza o pico em mm
    res = {}
    for k, v in out.items():
        it = 18 if k.startswith("f_fun_") else (6 if k.startswith("f_neck") else 14)
        sup = np.linalg.norm(v, axis=1) > 1e-7                       # vertices-fonte do morph, antes de suavizar
        v = h.sm(v, it)
        if sup.sum() > 0 and sup.sum() < 0.5 * h.n:                    # o Laplaciano vaza pela topologia (ex.: ate o alto do cranio); corta a >30 mm da fonte (distancia 3D)
            dist = cKDTree(h.U[sup]).query(h.U, k=1)[0]
            v = v * (1 - sstep((dist - 0.008) / 0.022))[:, None]
        mm = MM[k] * (1.0 if (k in NO_GAIN or k.startswith("f_fun_")) else 1.3)
        pk = np.linalg.norm(v, axis=1).max()
        res[k] = v * (mm / 1000.0 / pk) if pk > 1e-9 else v
    return res

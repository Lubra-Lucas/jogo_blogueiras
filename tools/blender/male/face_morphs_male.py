"""Morphs de FORMATO do rosto masculino (prefixo f_). Deltas em metros sobre o repouso (coordenadas Blender: x esquerda/direita, y profundidade com a
frente em -y, z para cima). Medidas do modelo (1,75 m): queixo z~1,455, boca 1,502, nariz (ponta) 1,546 y=-0,111, olhos 1,583, sobrancelha 1,609,
testa/linha do cabelo ~1,66, topo 1,75; frente do rosto y~-0,10; mandibula (angulo) |x|~0,07 em z~1,50; orelhas |x|>0,093 z 1,54-1,66.
As camadas do rosto (maleMaterial.ts) usam a posicao de repouso SEM morph, entao acompanham a superficie: nenhum offset de camada e necessario
quando o morph move olhos/boca; so a ESCALA/posicao relativa por preset (olho e distancia) muda o visual.
"""
import numpy as np
from mcommon import sstep, bell, laplace

LABELS = {
    "f_maleBase": "Rosto masculino base", "f_jawWide": "Mandibula larga", "f_jawAngular": "Mandibula angulosa", "f_jawV": "Mandibula em V", "f_jawSoft": "Mandibula suave",
    "f_chinWide": "Queixo largo", "f_chinPointed": "Queixo pontudo", "f_chinForward": "Queixo para frente", "f_chinBack": "Queixo para tras",
    "f_chinCleft": "Covinha no queixo", "f_browRidge": "Relevo da sobrancelha", "f_foreheadHigh": "Testa alta", "f_foreheadLow": "Testa baixa",
    "f_cheekboneHigh": "Macas altas", "f_cheekFull": "Bochechas cheias", "f_cheekHollow": "Bochechas fundas", "f_faceLong": "Rosto longo",
    "f_faceShort": "Rosto curto", "f_faceWide": "Rosto largo", "f_noseWide": "Nariz largo", "f_noseLong": "Nariz longo", "f_noseBridge": "Ponte do nariz",
    "f_lipsFull": "Labios cheios", "f_lipsThin": "Labios finos", "f_neckThick": "Pescoco grosso", "f_adamsApple": "Pomo de adao",
    "f_earsSmall": "Orelhas pequenas", "f_earsBig": "Orelhas grandes",
}


TARGET_MM = {
    "f_jawWide": 11, "f_jawAngular": 9, "f_jawSoft": 7, "f_jawV": 10, "f_chinWide": 8, "f_chinPointed": 8, "f_chinForward": 12, "f_chinBack": 10, "f_chinCleft": 3.5,
    "f_browRidge": 8, "f_foreheadHigh": 10, "f_foreheadLow": 10, "f_cheekboneHigh": 7, "f_cheekFull": 9, "f_cheekHollow": 7, "f_faceLong": 12,
    "f_faceShort": 11, "f_faceWide": 8, "f_noseWide": 6, "f_noseLong": 8, "f_noseBridge": 6, "f_lipsFull": 5, "f_lipsThin": 3, "f_neckThick": 12,
    "f_adamsApple": 4, "f_earsSmall": 10, "f_earsBig": 13,
}


def compute(co, nrm, e):
    n = len(co)
    x, y, z = co[:, 0], co[:, 1], co[:, 2]
    ax = np.abs(x); sg = np.sign(x)
    zero = np.zeros(n)
    front = sstep((0.04 - y) / 0.06)                        # 1 na frente do rosto, 0 atras da cabeca
    head = (z > 1.40).astype(float)

    def b3(cx, cy, cz, rx, ry, rz):                         # sino elipsoidal (x espelhado)
        return bell(np.sqrt(((ax - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2))

    def sm(D, it=2): return laplace(D, e, np.ones(n), it, 0.5)
    def V(dx=0, dy=0, dz=0): return np.stack([dx + zero, dy + zero, dz + zero], 1)
    out = {}
    # ---- mandibula
    lower = sstep((1.535 - z) / 0.07) * sstep((z - 1.40) / 0.03) * front
    out["f_jawWide"] = V(dx=sg * 0.0125 * sstep(ax / 0.045) * lower)
    gon = b3(0.070, 0.00, 1.497, 0.060, 0.09, 0.056)
    ch2 = b3(0.030, -0.075, 1.462, 0.045, 0.055, 0.04)
    out["f_jawAngular"] = V(dx=sg * (0.0085 * gon + 0.006 * ch2), dy=0.004 * gon, dz=-0.007 * gon - 0.005 * ch2)
    # V: o queixo afunila de forma continua do angulo da mandibula (|x|~0,07) ate o centro; o angulo fica definido e o queixo estreito mas arredondado
    vt = sstep((1.52 - z) / 0.075) * sstep((z - 1.43) / 0.03) * front
    out["f_jawV"] = V(dx=-x * 0.16 * vt, dy=-0.004 * vt * (1 - sstep(ax / 0.06)), dz=0.0 * vt) + V(dx=sg * 0.004 * b3(0.072, 0.0, 1.50, 0.04, 0.09, 0.03))
    out["f_jawSoft"] = V(dx=-sg * 0.0075 * gon, dy=-0.002 * gon, dz=0.006 * gon)
    # ---- queixo
    chin = b3(0.0, -0.078, 1.466, 0.065, 0.065, 0.046)
    out["f_chinWide"] = V(dx=x * 0.24 * chin)
    out["f_chinPointed"] = V(dx=-x * 0.20 * chin, dy=-0.003 * chin, dz=-0.002 * chin)      # queixo mais fino e delicado (arredondado), nunca um bico
    out["f_chinForward"] = V(dy=-0.013 * chin, dz=-0.002 * chin)
    out["f_chinBack"] = V(dy=0.011 * chin)
    cl = b3(0.0, -0.082, 1.468, 0.0075, 0.03, 0.012)
    out["f_chinCleft"] = nrm * (-0.0035 * cl)[:, None]
    # ---- sobrancelha / testa
    brow = b3(0.0, -0.09, 1.608, 0.075, 0.05, 0.014) * front
    out["f_browRidge"] = V(dy=-0.0105 * brow, dz=0.0015 * brow)
    fh = sstep((z - 1.58) / 0.04) * (1 - sstep((z - 1.612) / 0.022)) * front      # nao sobe ate a linha do cabelo (o cabelo e rigido)
    out["f_foreheadHigh"] = V(dy=-0.006 * fh, dz=0.010 * fh)
    out["f_foreheadLow"] = V(dy=0.002 * fh, dz=-0.010 * fh)
    # ---- macas / bochechas
    zyg = b3(0.080, -0.060, 1.558, 0.04, 0.06, 0.03)
    out["f_cheekboneHigh"] = nrm * (0.0075 * zyg)[:, None] + V(dz=0.0045 * zyg)
    ck = b3(0.070, -0.055, 1.505, 0.045, 0.06, 0.04)
    out["f_cheekFull"] = nrm * (0.011 * ck)[:, None]
    hol = b3(0.064, -0.045, 1.487, 0.035, 0.06, 0.03)
    out["f_cheekHollow"] = nrm * (-0.0085 * hol)[:, None]
    # ---- proporcao do rosto
    zc = 1.55
    wf = front * sstep((z - 1.40) / 0.06) * (1 - sstep((z - 1.585) / 0.045))
    out["f_faceLong"] = V(dz=(z - zc) * 0.12 * wf)
    out["f_faceShort"] = V(dz=-(z - zc) * 0.11 * wf)
    ww = sstep((z - 1.44) / 0.06) * (1 - sstep((z - 1.60) / 0.045)) * sstep((0.12 - y) / 0.10)
    out["f_faceWide"] = V(dx=x * 0.075 * ww)
    # ---- nariz
    ala = b3(0.0, -0.100, 1.536, 0.032, 0.035, 0.022)
    out["f_noseWide"] = V(dx=sg * 0.0065 * ala * sstep(ax / 0.006))
    tip = b3(0.0, -0.108, 1.543, 0.02, 0.03, 0.025)
    out["f_noseLong"] = V(dy=-0.005 * tip, dz=-0.0085 * tip)
    brg = b3(0.0, -0.098, 1.578, 0.014, 0.035, 0.03)
    out["f_noseBridge"] = V(dy=-0.0075 * brg)
    # ---- labios (volume sutil; a boca em si e camada)
    lp = b3(0.0, -0.095, 1.500, 0.032, 0.035, 0.016) * front
    out["f_lipsFull"] = nrm * (0.0055 * lp)[:, None]
    out["f_lipsThin"] = nrm * (-0.0035 * lp)[:, None]
    # ---- pescoco
    nk = bell(np.abs(z - 1.405) / 0.055) * (z < 1.46)
    rad = np.stack([x, y - 0.045, zero], 1)
    out["f_neckThick"] = rad * (0.16 * nk)[:, None]
    ad = b3(0.0, -0.008, 1.408, 0.009, 0.014, 0.014)
    out["f_adamsApple"] = V(dy=-0.0045 * ad)
    # ---- orelhas
    ear = ((ax > 0.093) & (z > 1.53) & (z < 1.675) & (y > -0.035) & (y < 0.095)).astype(float)
    ear = laplace(ear[:, None], e, np.ones(n), 1, 0.5)[:, 0] * ear
    rel = np.stack([x - sg * 0.108, y - 0.03, z - 1.60], 1)       # relativo ao centro da orelha do mesmo lado
    out["f_earsBig"] = rel * 0.28 * ear[:, None] + V(dx=sg * 0.003) * ear[:, None]
    out["f_earsSmall"] = -rel * 0.22 * ear[:, None]
    # suaviza (a malha tem poucos poligonos) e depois NORMALIZA o pico de cada morph (mm) para o alvo abaixo
    for k in list(out):
        if k not in ("f_neckThick",):
            out[k] = sm(out[k], 14)
    for k, mm in TARGET_MM.items():
        mm = mm * (1.0 if k in ('f_chinCleft', 'f_adamsApple', 'f_lipsThin', 'f_lipsFull') else 1.35)
        pk = np.linalg.norm(out[k], axis=1).max()
        if pk > 1e-9: out[k] = out[k] * (mm / 1000.0 / pk)
    # ---- rosto masculino base (combinacao aplicada em 1 por padrao)
    out["f_maleBase"] = (0.55 * out["f_jawWide"] + 0.45 * out["f_chinWide"] + 0.35 * out["f_browRidge"] + 0.5 * out["f_cheekboneHigh"]
                         + 0.15 * out["f_faceWide"] + 0.3 * out["f_neckThick"] + 0.2 * out["f_jawAngular"])
    # nada abaixo do queixo/pescoco alto muda (exceto pescoco) e nada atras
    return out

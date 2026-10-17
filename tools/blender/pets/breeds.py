"""Racas de pets: parametros do corpo + extras (tufos, manchas) + pelagens (cores por slot) + precos.

Slots de cor: coat (pelo principal), coat2 (pontas/sela/manchas), coat3 (manchas/meias), belly (focinho, peito, barriga),
nose, eye, iris (so gatos), inner (dentro da orelha), tongue.
Os precos aqui sao so a TABELA de referencia; o jogo le public/assets/pets/pets.json.
"""
import math
from mathutils import Vector
from pet_lib import ellipsoid, sweep, band

V = Vector


# ------------------------------------------------------------------ caudas
def tail_curl(unit, zc, yH, bh):
    return [V((0, yH, zc + bh * 0.4)), V((0, yH + 0.07 * unit, zc + bh * 0.9)), V((0, yH + 0.055 * unit, zc + bh * 1.55)), V((0, yH - 0.03 * unit, zc + bh * 1.85))]


def tail_long(unit, zc, yH, bh):
    return [V((0, yH, zc + bh * 0.2)), V((0, yH + 0.1 * unit, zc + bh * 0.05)), V((0, yH + 0.2 * unit, zc + bh * 0.2)), V((0, yH + 0.28 * unit, zc + bh * 0.75))]


def tail_dach(unit, zc, yH, bh):
    return [V((0, yH, zc + bh * 0.1)), V((0, yH + 0.1 * unit, zc)), V((0, yH + 0.2 * unit, zc + bh * 0.3)), V((0, yH + 0.29 * unit, zc + bh * 0.8))]


def tail_pom(unit, zc, yH, bh):
    return [V((0, yH, zc + bh * 0.5)), V((0, yH + 0.035 * unit, zc + bh * 1.0)), V((0, yH + 0.05 * unit, zc + bh * 1.5)), V((0, yH + 0.055 * unit, zc + bh * 1.85))]


def tail_vira(unit, zc, yH, bh):
    return [V((0, yH, zc + bh * 0.3)), V((0, yH + 0.085 * unit, zc + bh * 0.5)), V((0, yH + 0.15 * unit, zc + bh * 1.0)), V((0, yH + 0.14 * unit, zc + bh * 1.6))]


def tail_plume(unit, zc, yH, bh):
    return [V((0, yH, zc + bh * 0.3)), V((0, yH + 0.1 * unit, zc + bh * 0.35)), V((0, yH + 0.2 * unit, zc + bh * 0.6)), V((0, yH + 0.26 * unit, zc + bh * 1.1))]


# ------------------------------------------------------------------ orelhas
EAR_PRICK = dict(bx=0.5, bz=0.74, mid=lambda h: V((0.6 * h, 0.03 * h, 1.28 * h)), tip=lambda h: V((0.66 * h, 0.04 * h, 1.78 * h)), w=0.44, t=0.15, profile=[1.0, 0.82, 0.3], inner=True)
EAR_PRICK_BIG = dict(bx=0.52, bz=0.72, mid=lambda h: V((0.74 * h, 0.0, 1.4 * h)), tip=lambda h: V((0.86 * h, 0.0, 1.95 * h)), w=0.55, t=0.14, profile=[1.0, 0.78, 0.22], inner=True)
EAR_PRICK_SMALL = dict(bx=0.66, bz=0.7, mid=lambda h: V((0.76 * h, 0.0, 1.0 * h)), tip=lambda h: V((0.8 * h, 0.0, 1.3 * h)), w=0.36, t=0.16, profile=[1.0, 0.9, 0.45], inner=True)
EAR_FLOP = dict(bx=0.78, bz=0.55, mid=lambda h: V((1.08 * h, 0.08 * h, 0.1 * h)), tip=lambda h: V((1.1 * h, 0.1 * h, -0.72 * h)), w=0.46, t=0.13, profile=[0.8, 1.0, 0.8])
EAR_LONG = dict(bx=0.8, bz=0.45, mid=lambda h: V((1.08 * h, 0.12 * h, -0.05 * h)), tip=lambda h: V((1.14 * h, 0.15 * h, -0.95 * h)), w=0.52, t=0.12, profile=[0.75, 1.0, 0.85])
EAR_FOLD = dict(bx=0.58, bz=0.72, mid=lambda h: V((0.82 * h, -0.04 * h, 1.18 * h)), tip=lambda h: V((1.02 * h, -0.2 * h, 0.82 * h)), w=0.44, t=0.14, profile=[1.0, 0.95, 0.5])
EAR_POODLE = dict(bx=0.8, bz=0.5, mid=lambda h: V((1.1 * h, 0.06 * h, 0.05 * h)), tip=lambda h: V((1.14 * h, 0.08 * h, -0.8 * h)), w=0.6, t=0.3, profile=[0.8, 1.0, 0.9])


# ------------------------------------------------------------------ extras por raca
def puffs_poodle(c):
    p, u, leg = c['parts'], c['unit'], c['leg']
    F, Hd, Hc, hr = c['F'], c['Hd'], c['Hc'], c['hr']
    m = 'coat'
    for side, sx in (('L', 1), ('R', -1)):
        # pompons nos tornozelos e nas coxas
        ellipsoid(p, V((sx * F['W'].x, F['W'].y, leg * 0.3)), (0.05 * u, 0.055 * u, 0.045 * u), m, f'F{side}_low', segs=10, rings=7)
        ellipsoid(p, V((sx * Hd['Hk'].x, Hd['Hk'].y, leg * 0.3)), (0.05 * u, 0.055 * u, 0.045 * u), m, f'B{side}_low', segs=10, rings=7)
        ellipsoid(p, V((sx * Hd['T'].x * 1.15, Hd['T'].y, leg * 0.92)), (0.06 * u, 0.08 * u, 0.075 * u), m, f'B{side}_up', segs=10, rings=7)
        ellipsoid(p, V((sx * F['T'].x * 1.15, F['T'].y, leg * 0.95)), (0.05 * u, 0.06 * u, 0.065 * u), m, f'F{side}_up', segs=10, rings=7)
        # orelhas de pelo cacheado
        ellipsoid(p, Hc + V((sx * hr * 1.15, hr * 0.08, -hr * 0.55)), (0.22 * hr, 0.4 * hr, 0.5 * hr), m, f'ear2{side}', segs=10, rings=7)
        ellipsoid(p, Hc + V((sx * hr * 1.1, hr * 0.06, -hr * 0.1)), (0.26 * hr, 0.42 * hr, 0.4 * hr), m, f'ear{side}', segs=10, rings=7)
    # topete e mane
    ellipsoid(p, Hc + V((0, hr * 0.05, hr * 0.78)), (0.62 * hr, 0.68 * hr, 0.55 * hr), m, 'head', segs=12, rings=8)
    ellipsoid(p, Hc + V((0, hr * 0.1, hr * 1.0)), (0.42 * hr, 0.45 * hr, 0.36 * hr), m, 'head', segs=10, rings=7)
    ellipsoid(p, c['N0'] + V((0, -0.03 * u, -0.01 * u)), (0.085 * u, 0.07 * u, 0.085 * u), m, 'chest', segs=10, rings=7)
    # pompom da cauda
    t3 = c['tail'][3]
    ellipsoid(p, t3 + V((0, 0.01 * u, 0.0)), (0.055 * u, 0.055 * u, 0.055 * u), m, 'tail3', segs=12, rings=8)


def extras_shiba(c):
    p, u, hr, Hc = c['parts'], c['unit'], c['hr'], c['Hc']
    # bochechas creme e peito (urajiro)
    for sx in (1, -1):
        ellipsoid(p, Hc + V((sx * hr * 0.62, -hr * 0.55, -hr * 0.28)), (hr * 0.36, hr * 0.4, hr * 0.34), 'belly', 'head', segs=10, rings=7)
    ellipsoid(p, c['N0'] + V((0, -0.035 * u, -0.045 * u)), (0.06 * u, 0.065 * u, 0.075 * u), 'belly', 'chest', segs=10, rings=7)
    ellipsoid(p, V((0, c['yC'] + 0.1 * u, c['zc'] - c['bh'] * 0.55)), (c['bw'] * 0.5, 0.11 * u, c['bh'] * 0.55), 'belly', 'chest', segs=10, rings=7)


def extras_vira(c):
    p, u, hr, Hc = c['parts'], c['unit'], c['hr'], c['Hc']
    # peito e focinho brancos (marca registrada do caramelo)
    ellipsoid(p, c['N0'] + V((0, -0.04 * u, -0.05 * u)), (0.062 * u, 0.075 * u, 0.085 * u), 'belly', 'chest', segs=10, rings=7)
    ellipsoid(p, V((0, c['yC'] + 0.09 * u, c['zc'] - c['bh'] * 0.5)), (c['bw'] * 0.48, 0.1 * u, c['bh'] * 0.55), 'belly', 'chest', segs=10, rings=7)
    ellipsoid(p, c['mz0'] + V((0, -c['sl'] * 0.2, -c['sr'] * 0.15)), (c['sr'] * 0.62, c['sl'] * 0.5, c['sr'] * 0.45), 'belly', 'head', segs=10, rings=7)


def extras_dach(c):
    p, u = c['parts'], c['unit']
    ellipsoid(p, c['N0'] + V((0, -0.03 * u, -0.04 * u)), (0.05 * u, 0.06 * u, 0.06 * u), 'belly', 'chest', segs=10, rings=7)


def extras_siamese(c):
    p, hr, Hc = c['parts'], c['hr'], c['Hc']
    # mascara escura em volta dos olhos e nariz
    ellipsoid(p, Hc + V((0, -hr * 0.78, -hr * 0.05)), (hr * 0.5, hr * 0.38, hr * 0.46), 'coat2', 'head', segs=12, rings=8)


def extras_persian(c):
    p, u, hr, Hc = c['parts'], c['unit'], c['hr'], c['Hc']
    # bochechas fofas e gola de pelo
    for sx in (1, -1):
        ellipsoid(p, Hc + V((sx * hr * 0.72, -hr * 0.42, -hr * 0.42)), (hr * 0.46, hr * 0.5, hr * 0.42), 'coat', 'head', segs=10, rings=7)
        ellipsoid(p, c['N0'] + V((sx * 0.07 * u, -0.01 * u, -0.045 * u)), (0.065 * u, 0.07 * u, 0.09 * u), 'coat', 'chest', segs=10, rings=7)
    ellipsoid(p, c['N0'] + V((0, -0.03 * u, -0.06 * u)), (0.08 * u, 0.07 * u, 0.1 * u), 'coat', 'chest', segs=10, rings=7)
    ellipsoid(p, Hc + V((0, hr * 0.12, hr * 0.6)), (hr * 0.8, hr * 0.7, hr * 0.38), 'coat', 'head', segs=12, rings=8)
    for side, sx in (('L', 1), ('R', -1)):
        ellipsoid(p, V((sx * c['Hd']['T'].x * 1.2, c['Hd']['T'].y + 0.01 * u, c['leg'] * 0.85)), (0.07 * u, 0.09 * u, 0.1 * u), 'coat', f'B{side}_up', segs=10, rings=7)
        ellipsoid(p, V((sx * c['F']['W'].x, c['F']['W'].y - 0.01 * u, c['leg'] * 0.14)), (0.05 * u, 0.06 * u, 0.04 * u), 'coat', f'F{side}_paw', segs=8, rings=6)


def extras_srd(c):
    p, u, hr, Hc = c['parts'], c['unit'], c['hr'], c['Hc']
    # focinho + peito brancos: o slot belly (frajola/tricolor)
    ellipsoid(p, c['mz0'] + V((0, -c['sl'] * 0.1, -c['sr'] * 0.1)), (c['sr'] * 0.72, c['sl'] * 0.9, c['sr'] * 0.6), 'belly', 'head', segs=10, rings=7)
    ellipsoid(p, c['N0'] + V((0, -0.03 * u, -0.05 * u)), (0.052 * u, 0.06 * u, 0.082 * u), 'belly', 'chest', segs=10, rings=7)
    ellipsoid(p, V((0, c['yC'] + 0.08 * u, c['zc'] - c['bh'] * 0.55)), (c['bw'] * 0.45, 0.09 * u, c['bh'] * 0.5), 'belly', 'chest', segs=10, rings=7)
    # fio branco na testa
    ellipsoid(p, Hc + V((0, -hr * 0.78, hr * 0.45)), (hr * 0.13, hr * 0.3, hr * 0.12), 'belly', 'head', segs=8, rings=6)


def extras_maltese(c):
    """Maltes: pelo longo e sedoso caindo ate o chao dos dois lados, orelhas com franjas longas,
    topete preso no alto da cabeca, bigode fofo e peito cheio."""
    p, u, hr, Hc, L, bw, bh, zc, leg = c['parts'], c['unit'], c['hr'], c['Hc'], c['L'], c['bw'], c['bh'], c['zc'], c['leg']
    m = 'coat'
    for sx in (1, -1):
        for y, bone in ((c['yC'] + L * 0.3, 'chest'), (c['yH'] - L * 0.3, 'hips')):
            # "saia" de pelo: cortina comprida e lisa que desce do dorso quase ate o chao
            ellipsoid(p, V((sx * bw * 0.62, y, zc - bh * 0.3 - leg * 0.22)), (bw * 0.52, L * 0.42, bh * 0.6 + leg * 0.4), m, bone, segs=14, rings=10)
        side = 'L' if sx > 0 else 'R'
        ellipsoid(p, Hc + V((sx * hr * 1.08, hr * 0.1, -hr * 0.75)), (0.28 * hr, 0.36 * hr, 0.8 * hr), m, f'ear2{side}', segs=10, rings=8)
        ellipsoid(p, c['mz0'] + V((sx * c['sr'] * 0.75, -c['sl'] * 0.25, -c['sr'] * 0.55)), (c['sr'] * 0.62, c['sr'] * 0.75, c['sr'] * 0.9), m, 'head', segs=10, rings=7)
    # coqueiro: mecha presa no alto da cabeca que sobe e abre em leque, com lacinho rosa (slot 'inner')
    base = Hc + V((0, hr * 0.12, hr * 0.86))
    ellipsoid(p, base + V((0, 0, hr * 0.12)), (0.15 * hr, 0.15 * hr, 0.24 * hr), m, 'head', segs=10, rings=7)
    top = base + V((0, 0, hr * 0.34))
    for k in range(7):
        phi = 360 * k / 7 + 10
        tilt = 62 if k % 2 else 48
        ln = hr * (0.34 if k % 2 else 0.4)
        rx, rz = math.radians(tilt), math.radians(phi)
        d = V((math.sin(rz) * math.sin(rx), -math.cos(rz) * math.sin(rx), math.cos(rx)))
        ellipsoid(p, top + d * ln * 0.75, (0.11 * hr, 0.13 * hr, ln), m, 'head', rot=(tilt, 0, phi), segs=10, rings=7)
    ellipsoid(p, top + V((0, 0, hr * 0.12)), (0.16 * hr, 0.16 * hr, 0.16 * hr), m, 'head', segs=10, rings=7)
    # lacinho rosa na base do coqueiro, virado para a frente
    bow = base + V((0, -hr * 0.12, hr * 0.14))
    for sx in (1, -1):
        ellipsoid(p, bow + V((sx * hr * 0.16, 0, 0)), (0.14 * hr, 0.06 * hr, 0.1 * hr), 'inner', 'head', rot=(0, sx * 18, 0), segs=10, rings=7)
        ellipsoid(p, bow + V((sx * hr * 0.06, -hr * 0.01, -hr * 0.12)), (0.04 * hr, 0.03 * hr, 0.09 * hr), 'inner', 'head', rot=(0, -sx * 20, 0), segs=8, rings=6)
    ellipsoid(p, bow + V((0, -hr * 0.02, 0)), (0.06 * hr, 0.06 * hr, 0.07 * hr), 'inner', 'head', segs=8, rings=6)
    for sx in (1, -1):
        ellipsoid(p, Hc + V((sx * hr * 0.62, hr * 0.05, hr * 0.42)), (0.34 * hr, 0.5 * hr, 0.4 * hr), m, 'head', segs=10, rings=7)
    ellipsoid(p, c['N0'] + V((0, -0.03 * u, -0.05 * u)), (0.07 * u, 0.065 * u, 0.09 * u), m, 'chest', segs=10, rings=7)
    t2 = c['tail'][2]
    ellipsoid(p, t2 + V((0, 0.0, 0.01 * u)), (0.045 * u, 0.07 * u, 0.05 * u), m, 'tail3', segs=10, rings=7)


def extras_cavalier(c):
    """Cavalier King: orelhas longas com franjas onduladas, peito e patas com franjas, cauda emplumada."""
    p, u, hr, Hc, F, Hd, leg = c['parts'], c['unit'], c['hr'], c['Hc'], c['F'], c['Hd'], c['leg']
    m = 'coat'
    for side, sx in (('L', 1), ('R', -1)):
        # franjas das orelhas: tres "ondas" empilhadas
        ellipsoid(p, Hc + V((sx * hr * 1.18, hr * 0.14, -hr * 0.3)), (0.32 * hr, 0.56 * hr, 0.56 * hr), m, f'ear{side}', segs=12, rings=8)
        ellipsoid(p, Hc + V((sx * hr * 1.24, hr * 0.18, -hr * 0.92)), (0.34 * hr, 0.62 * hr, 0.55 * hr), m, f'ear2{side}', segs=12, rings=8)
        ellipsoid(p, Hc + V((sx * hr * 1.26, hr * 0.2, -hr * 1.3)), (0.28 * hr, 0.5 * hr, 0.3 * hr), m, f'ear2{side}', segs=10, rings=7)
        ellipsoid(p, V((sx * F['E'].x, F['E'].y + 0.02 * u, leg * 0.62)), (0.022 * u, 0.035 * u, 0.06 * u), m, f'F{side}_up', segs=8, rings=6)
        ellipsoid(p, V((sx * Hd['T'].x * 1.1, Hd['T'].y + 0.02 * u, leg * 0.8)), (0.04 * u, 0.06 * u, 0.07 * u), m, f'B{side}_up', segs=8, rings=6)
    ellipsoid(p, c['N0'] + V((0, -0.03 * u, -0.055 * u)), (0.068 * u, 0.06 * u, 0.09 * u), m, 'chest', segs=10, rings=7)
    for i, bone in ((1, 'tail2'), (2, 'tail3')):
        t = c['tail'][i]
        ellipsoid(p, t + V((0, 0.005 * u, -0.018 * u)), (0.022 * u, 0.05 * u, 0.04 * u), m, bone, segs=8, rings=6)


def extras_golden(c):
    """Golden: juba no peito (tom mais claro), franjas atras das patas, cauda e orelhas fofas."""
    p, u, hr, Hc, F, Hd, leg = c['parts'], c['unit'], c['hr'], c['Hc'], c['F'], c['Hd'], c['leg']
    ellipsoid(p, c['N0'] + V((0, -0.035 * u, -0.06 * u)), (0.085 * u, 0.07 * u, 0.1 * u), 'belly', 'chest', segs=12, rings=8)
    ellipsoid(p, V((0, c['yC'] + 0.1 * u, c['zc'] - c['bh'] * 0.62)), (c['bw'] * 0.55, 0.12 * u, c['bh'] * 0.45), 'belly', 'chest', segs=10, rings=7)
    for side, sx in (('L', 1), ('R', -1)):
        ellipsoid(p, V((sx * F['E'].x, F['E'].y + 0.022 * u, leg * 0.6)), (0.024 * u, 0.035 * u, 0.065 * u), 'belly', f'F{side}_up', segs=8, rings=6)
        ellipsoid(p, V((sx * Hd['T'].x * 1.1, Hd['T'].y + 0.03 * u, leg * 0.78)), (0.045 * u, 0.065 * u, 0.08 * u), 'belly', f'B{side}_up', segs=8, rings=6)
        ellipsoid(p, Hc + V((sx * hr * 1.0, hr * 0.15, -hr * 0.05)), (0.2 * hr, 0.3 * hr, 0.34 * hr), 'coat', f'ear{side}', segs=8, rings=6)
    for i, bone in ((1, 'tail2'), (2, 'tail3')):
        t = c['tail'][i]
        ellipsoid(p, t + V((0, 0.006 * u, -0.022 * u)), (0.024 * u, 0.06 * u, 0.045 * u), 'belly', bone, segs=8, rings=6)


# ------------------------------------------------------------------ racas
DOG = dict(species='dog', cat_eyes=False)
CAT = dict(species='cat', cat_eyes=True)

COMMON = {'nose': '#1b1517', 'eye': '#171214', 'iris': '#7fa6c9', 'pupil': '#0b0b0d', 'glint': '#ffffff', 'inner': '#d9a6a0', 'tongue': '#d9788a'}


def colors(**kw):
    d = dict(COMMON)
    d.update(kw)
    return d


BREEDS = []

BREEDS.append(dict(
    id='poodle', label='Poodle', species='dog', scale=1.0,
    L=0.30, bh=0.105, bw=0.088, leg=0.17, hr=0.098, neck_f=0.05, neck_h=0.095, head_fwd=0.4, snout_l=0.105, snout_r=0.036, nose_r=0.5, eye_r=0.19,
    leg_r=0.021, paw=0.04, ear=EAR_POODLE, tail_fn=tail_pom, tail_r=[0.014, 0.012, 0.011, 0.01], neck_r=0.7,
    mats=dict(jaw='coat'), extras=puffs_poodle,
    colors=colors(coat='#f1ece2', coat2='#f1ece2', coat3='#f1ece2', belly='#f1ece2'),
    coats=[
        dict(id='creme', label='Creme', colors=dict(coat='#efe6d2', coat2='#efe6d2', coat3='#efe6d2', belly='#efe6d2'), tier='comum'),
        dict(id='damasco', label='Damasco', colors=dict(coat='#d19a63', coat2='#d19a63', coat3='#d19a63', belly='#d19a63'), tier='raro'),
        dict(id='preto', label='Preto', colors=dict(coat='#26242a', coat2='#26242a', coat3='#26242a', belly='#26242a', nose='#0c0b0d'), tier='comum'),
        dict(id='prata', label='Prata', colors=dict(coat='#a7a6ab', coat2='#a7a6ab', coat3='#a7a6ab', belly='#a7a6ab'), tier='raro'),
    ],
))

BREEDS.append(dict(
    id='shiba', label='Shiba', species='dog', scale=1.0,
    L=0.33, bh=0.115, bw=0.095, leg=0.16, hr=0.104, neck_f=0.05, neck_h=0.085, head_fwd=0.42, snout_l=0.075, snout_r=0.04, nose_r=0.5, eye_r=0.17,
    leg_r=0.024, paw=0.042, ear=EAR_PRICK, tail_fn=tail_curl, tail_r=[0.036, 0.034, 0.03, 0.022], head_w=1.05,
    mats=dict(sock='belly', tailtip='belly', muzzle='belly', jaw='belly'), sock_u=0.76, tip_u=1.3, brows='coat3', extras=extras_shiba,
    colors=colors(coat='#c6762f', coat2='#c6762f', coat3='#efe0c6', belly='#f2e6d0'),
    coats=[
        dict(id='vermelho', label='Vermelho', colors=dict(coat='#c6762f', coat3='#efe0c6', belly='#f2e6d0'), tier='comum'),
        dict(id='gergelim', label='Gergelim', colors=dict(coat='#8a5a38', coat3='#e7d6b8', belly='#efe2c8'), tier='comum'),
        dict(id='preto-fogo', label='Preto e fogo', colors=dict(coat='#211d1f', coat3='#b5733a', belly='#b5733a', nose='#0c0b0d'), tier='raro'),
        dict(id='creme', label='Creme', colors=dict(coat='#e8cf9f', coat3='#fbf3e3', belly='#fbf3e3'), tier='raro'),
    ],
))

BREEDS.append(dict(
    id='dachshund', label='Salsicha', species='dog', scale=1.0,
    L=0.52, bh=0.082, bw=0.072, leg=0.092, hr=0.085, neck_f=0.065, neck_h=0.06, head_fwd=0.4, snout_l=0.13, snout_r=0.03, nose_r=0.5, eye_r=0.18,
    leg_r=0.02, paw=0.04, ear=EAR_LONG, tail_fn=tail_dach, tail_r=[0.02, 0.016, 0.012, 0.009], neck_r=0.68, legx=0.7,
    mats=dict(sock='belly', jaw='belly', muzzle='belly'), sock_u=0.78, extras=extras_dach,
    colors=colors(coat='#8d4a23', coat2='#8d4a23', coat3='#8d4a23', belly='#a85e2c'),
    coats=[
        dict(id='ruivo', label='Ruivo', colors=dict(coat='#8d4a23', coat3='#8d4a23', belly='#a85e2c'), tier='comum'),
        dict(id='chocolate', label='Chocolate e fogo', colors=dict(coat='#3a2419', coat3='#3a2419', belly='#b06a35', nose='#0c0b0d'), tier='comum'),
        dict(id='creme', label='Creme', colors=dict(coat='#e3c795', coat3='#e3c795', belly='#efd9b2'), tier='raro'),
        dict(id='preto', label='Preto e fogo', colors=dict(coat='#1f1c1e', coat3='#1f1c1e', belly='#a8622c', nose='#0c0b0d'), tier='raro'),
    ],
))

BREEDS.append(dict(
    id='caramelo', label='Caramelo', species='dog', scale=1.0,
    L=0.36, bh=0.112, bw=0.092, leg=0.185, hr=0.1, neck_f=0.055, neck_h=0.09, head_fwd=0.42, snout_l=0.098, snout_r=0.038, nose_r=0.5, eye_r=0.18,
    leg_r=0.023, paw=0.044, ear=EAR_FOLD, tail_fn=tail_vira, tail_r=[0.026, 0.023, 0.018, 0.012],
    mats=dict(sock='belly', jaw='belly', muzzle='coat'), sock_u=0.8, extras=extras_vira,
    colors=colors(coat='#c98a45', coat2='#c98a45', coat3='#c98a45', belly='#f4e8d2'),
    coats=[
        dict(id='caramelo', label='Caramelo', colors=dict(coat='#c98a45', coat3='#c98a45', belly='#f4e8d2'), tier='comum'),
        dict(id='dourado', label='Dourado', colors=dict(coat='#b8742f', coat3='#b8742f', belly='#ecd9b6'), tier='comum'),
        dict(id='preto-branco', label='Preto e branco', colors=dict(coat='#222126', coat3='#222126', belly='#f3f0ea', nose='#0c0b0d'), tier='raro'),
    ],
))

BREEDS.append(dict(
    id='siames', anim=dict(sit=dict(hips=26)), label='Siamês', species='cat', scale=1.0, cat_eyes=True,
    L=0.32, bh=0.088, bw=0.07, leg=0.125, hr=0.092, neck_f=0.045, neck_h=0.085, head_fwd=0.36, snout_l=0.04, snout_r=0.026, nose_r=0.42, nose_dz=0.15, eye_r=0.19,
    leg_r=0.02, paw=0.035, ear=EAR_PRICK_BIG, tail_fn=tail_long, tail_r=[0.014, 0.012, 0.01, 0.008], neck_r=0.55, head_w=0.95, head_h=0.85,
    eye_dir=(0.5, -0.8, 0.22), muz_dz=0.35, muz_h=0.75, rear_ext=0.04, front_ext=0.04, legx=0.7,
    mats=dict(muzzle='coat2', jaw='coat2', ear='coat2', earin='inner', sock='coat2', tail='coat2', tailtip='coat2'), sock_u=0.45, tip_u=0.0, extras=extras_siamese,
    prof_w=[0.55, 0.85, 0.98, 1.0, 0.95, 0.88, 0.65], prof_h=[0.6, 0.9, 1.0, 1.0, 1.0, 0.95, 0.75],
    colors=colors(coat='#eadfc9', coat2='#4a3227', coat3='#eadfc9', belly='#eadfc9', iris='#79a9d6', nose='#3a2a28', inner='#c9928c'),
    coats=[
        dict(id='seal', label='Seal point', colors=dict(coat='#eadfc9', coat2='#4a3227', belly='#eadfc9', iris='#79a9d6', nose='#3a2a28'), tier='comum'),
        dict(id='blue', label='Blue point', colors=dict(coat='#e9e6e1', coat2='#6b7685', belly='#e9e6e1', iris='#6fa0d0', nose='#5b6068'), tier='raro'),
        dict(id='chocolate', label='Chocolate point', colors=dict(coat='#efe5d3', coat2='#80594a', belly='#efe5d3', iris='#7fa9cf', nose='#6c4a42'), tier='raro'),
    ],
))

BREEDS.append(dict(
    id='persa', anim=dict(sit=dict(hips=26)), label='Persa', species='cat', scale=1.0, cat_eyes=True,
    L=0.27, bh=0.105, bw=0.1, leg=0.1, hr=0.098, neck_f=0.025, neck_h=0.06, head_fwd=0.3, snout_l=0.02, snout_r=0.036, nose_r=0.38, nose_dz=0.35, eye_r=0.2,
    leg_r=0.026, paw=0.04, ear=EAR_PRICK_SMALL, tail_fn=tail_plume, tail_r=[0.03, 0.036, 0.04, 0.035], neck_r=0.8, head_w=1.1, head_h=0.95,
    eye_dir=(0.5, -0.78, 0.2), muz_dz=0.15, muz_h=0.9, rear_ext=0.06, front_ext=0.05, legx=0.62,
    extras=extras_persian,
    prof_w=[0.7, 0.95, 1.05, 1.05, 1.0, 0.95, 0.75], prof_h=[0.7, 0.98, 1.05, 1.05, 1.05, 1.0, 0.8],
    colors=colors(coat='#f0ece4', coat2='#f0ece4', coat3='#f0ece4', belly='#f0ece4', iris='#d08a3a', nose='#c98f8f', inner='#e0b0a8'),
    coats=[
        dict(id='branco', label='Branco', colors=dict(coat='#f0ece4', coat2='#f0ece4', coat3='#f0ece4', belly='#f0ece4', iris='#d08a3a', nose='#c98f8f'), tier='comum'),
        dict(id='cinza', label='Azul', colors=dict(coat='#8b95a3', coat2='#8b95a3', coat3='#8b95a3', belly='#8b95a3', iris='#d9923a', nose='#4d535c'), tier='raro'),
        dict(id='creme', label='Creme', colors=dict(coat='#e7bd84', coat2='#e7bd84', coat3='#e7bd84', belly='#e7bd84', iris='#c47f2f', nose='#c98f8f'), tier='comum'),
    ],
))

BREEDS.append(dict(
    id='srd', anim=dict(sit=dict(hips=26)), label='Vira-lata (gato)', species='cat', scale=1.0, cat_eyes=True,
    L=0.30, bh=0.09, bw=0.075, leg=0.115, hr=0.094, neck_f=0.04, neck_h=0.075, head_fwd=0.38, snout_l=0.035, snout_r=0.028, nose_r=0.42, nose_dz=0.2, eye_r=0.19,
    leg_r=0.021, paw=0.036, ear=EAR_PRICK, tail_fn=tail_long, tail_r=[0.017, 0.015, 0.013, 0.011], neck_r=0.6, head_w=1.0, head_h=0.88,
    eye_dir=(0.52, -0.8, 0.22), muz_dz=0.3, muz_h=0.8, rear_ext=0.04, front_ext=0.04, legx=0.68,
    mats=dict(torso='patch', head='patch', ear='coat', legU='patch', legL='patch', sock='belly', tail='patch', tailtip='belly'), sock_u=0.55, extras=extras_srd, tip_u=1.3,
    patch_freq=14.0, patch_th=(-0.2, 0.2), seed=(4.4, 1.9, 8.3),
    colors=colors(coat='#1c1b20', coat2='#1c1b20', coat3='#1c1b20', belly='#f5f2ec', iris='#c8b04a', nose='#c98f8f', inner='#d9a6a0'),
    coats=[
        dict(id='frajola', label='Frajola', colors=dict(coat='#1c1b20', coat2='#1c1b20', coat3='#1c1b20', belly='#f5f2ec', iris='#c4b24a', nose='#bf8a8a'), tier='comum'),
        dict(id='tricolor', label='Tricolor', colors=dict(coat='#f4f0e8', coat2='#d98a3b', coat3='#26252b', belly='#f4f0e8', iris='#b5a24a', nose='#d49a98'), tier='raro'),
        dict(id='laranja', label='Laranja', colors=dict(coat='#df9448', coat2='#c97a35', coat3='#e9ad6c', belly='#f5ead8', iris='#a9b04a', nose='#d49a98'), tier='comum'),
        dict(id='cinza', label='Cinza e branco', colors=dict(coat='#8f939b', coat2='#7b7f88', coat3='#a6a9b0', belly='#f3f1ec', iris='#b8b04a', nose='#c99a9a'), tier='comum'),
    ],
))

EAR_CAVALIER = dict(EAR_LONG, w=0.8, t=0.3, tip=lambda h: V((1.2 * h, 0.16 * h, -1.15 * h)), profile=[0.85, 1.0, 0.95])
EAR_MALTESE = dict(EAR_LONG, w=0.5, t=0.18)

BREEDS.append(dict(
    id='maltes', label='Maltês', species='dog', scale=1.0,
    L=0.27, bh=0.095, bw=0.082, leg=0.105, hr=0.096, neck_f=0.04, neck_h=0.08, head_fwd=0.38, snout_l=0.05, snout_r=0.031, nose_r=0.56, eye_r=0.21,
    eye_dir=(0.5, -0.8, 0.28), leg_r=0.02, paw=0.036, ear=EAR_MALTESE, tail_fn=tail_curl, tail_r=[0.022, 0.03, 0.034, 0.026], neck_r=0.78, head_w=1.02,
    mats=dict(jaw='coat'), extras=extras_maltese,
    colors=colors(coat='#f8f4ec', coat2='#f8f4ec', coat3='#f8f4ec', belly='#f8f4ec', nose='#151214', inner='#ff6fae'),
    coats=[
        dict(id='branco', label='Branco', colors=dict(coat='#f8f4ec', coat2='#f8f4ec', coat3='#f8f4ec', belly='#f8f4ec', inner='#ff6fae'), tier='comum'),
        dict(id='marfim', label='Marfim', colors=dict(coat='#f0e4cd', coat2='#f0e4cd', coat3='#f0e4cd', belly='#f0e4cd', inner='#ff6fae'), tier='raro'),
    ],
))

BREEDS.append(dict(
    id='cavalier', label='Cavalier King', species='dog', scale=1.0,
    L=0.33, bh=0.108, bw=0.09, leg=0.14, hr=0.103, neck_f=0.045, neck_h=0.08, head_fwd=0.38, snout_l=0.058, snout_r=0.037, nose_r=0.52, eye_r=0.23,
    eye_dir=(0.48, -0.82, 0.24), leg_r=0.022, paw=0.04, ear=EAR_CAVALIER, tail_fn=tail_plume, tail_r=[0.018, 0.022, 0.024, 0.018], neck_r=0.74, head_w=1.06, head_h=0.96,
    mats=dict(jaw='coat'), extras=extras_cavalier,
    colors=colors(coat='#a2391f', coat2='#a2391f', coat3='#a2391f', belly='#a2391f'),
    coats=[
        dict(id='rubi', label='Rubi', colors=dict(coat='#a2391f', coat2='#a2391f', coat3='#a2391f', belly='#a2391f'), tier='comum'),
        dict(id='rubi-intenso', label='Rubi intenso', colors=dict(coat='#7f2715', coat2='#7f2715', coat3='#7f2715', belly='#7f2715'), tier='raro'),
    ],
))

BREEDS.append(dict(
    id='golden', label='Golden Retriever', species='dog', scale=1.0,
    L=0.46, bh=0.14, bw=0.11, leg=0.25, hr=0.118, neck_f=0.07, neck_h=0.12, head_fwd=0.4, snout_l=0.12, snout_r=0.05, nose_r=0.48, eye_r=0.16,
    leg_r=0.029, paw=0.05, ear=EAR_FLOP, tail_fn=tail_plume, tail_r=[0.028, 0.03, 0.03, 0.022], neck_r=0.8, head_w=1.02, muz_h=0.95,
    mats=dict(jaw='coat'), extras=extras_golden,
    colors=colors(coat='#d9a04f', coat2='#d9a04f', coat3='#d9a04f', belly='#eccb8f'),
    coats=[
        dict(id='dourado', label='Dourado', colors=dict(coat='#d9a04f', coat2='#d9a04f', coat3='#d9a04f', belly='#eccb8f'), tier='comum'),
        dict(id='creme', label='Creme', colors=dict(coat='#ead1a0', coat2='#ead1a0', coat3='#ead1a0', belly='#f6e7c8'), tier='comum'),
        dict(id='vermelho', label='Vermelho', colors=dict(coat='#b8682c', coat2='#b8682c', coat3='#b8682c', belly='#d69a5c'), tier='raro'),
    ],
))

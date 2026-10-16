"""Monta um pet (malha + esqueleto) a partir de um `spec` de raca. Ver breeds.py."""
import math
from mathutils import Vector, noise
import pet_lib as P
from pet_lib import Parts, sweep, ellipsoid, band

V = Vector


def build_pet(spec):
    parts = Parts()
    S = spec
    L, bh, bw, leg = S['L'], S['bh'], S['bw'], S['leg']
    hr = S['hr']
    zc = leg + bh * 0.45
    yH, yC = L / 2, -L / 2
    unit = max(0.85, min(1.15, L / 0.35))

    # ------------------------------------------------------------ esqueleto (pontos-chave)
    xf, xh = bw * S.get('legx', 0.62), bw * S.get('legx', 0.62)
    yF, yHip = yC + 0.03 * unit, yH - 0.03 * unit
    paw = S.get('paw', 0.045) * unit
    F = dict(T=V((xf, yF, leg)), E=V((xf, yF + 0.012 * unit, leg * 0.56)), W=V((xf, yF, leg * 0.2)), Z=V((xf, yF - paw, 0)))
    Hd = dict(T=V((xh, yHip, leg + 0.01 * unit)), K=V((xh, yHip - 0.045 * unit, leg * 0.58)), Hk=V((xh, yHip + 0.035 * unit, leg * 0.24)), Z=V((xh, yHip - paw * 0.55, 0)))
    N0 = V((0, yC + 0.01, zc + bh * 0.25))
    Hn = N0 + V((0, -S['neck_f'] * unit, S['neck_h'] * unit))
    Hc = Hn + V((0, -hr * S.get('head_fwd', 0.45), hr * 0.2))
    sl = S['snout_l']
    sr = S['snout_r']
    ys = [yH, yH - L * 0.22, yC + L * 0.22, yC]
    tail_pts = [V(p) for p in S['tail_fn'](unit, zc, yH, bh)]

    bones = [('root', (0, 0, 0), (0, 0, 0.05), None),
             ('hips', (0, ys[0], zc), (0, ys[1], zc), 'root'),
             ('spine', (0, ys[1], zc), (0, ys[2], zc), 'hips'),
             ('chest', (0, ys[2], zc), tuple(N0), 'spine'),
             ('neck', tuple(N0), tuple(Hn), 'chest'),
             ('head', tuple(Hn), tuple(Hc + V((0, -hr * 0.6, 0))), 'neck'),
             ('jaw', tuple(Hc + V((0, -hr * 0.35, -hr * 0.5))), tuple(Hc + V((0, -hr * 0.35 - sl * 0.8, -hr * 0.55))), 'head')]
    for side, sx in (('L', 1), ('R', -1)):
        bones.append((f'FL_up'.replace('L', side), (sx * F['T'].x, F['T'].y, F['T'].z), (sx * F['E'].x, F['E'].y, F['E'].z), 'chest'))
        bones.append((f'FL_low'.replace('L', side), (sx * F['E'].x, F['E'].y, F['E'].z), (sx * F['W'].x, F['W'].y, F['W'].z), f'F{side}_up'))
        bones.append((f'FL_paw'.replace('L', side), (sx * F['W'].x, F['W'].y, F['W'].z), (sx * F['Z'].x, F['Z'].y, F['Z'].z + 0.01), f'F{side}_low'))
        bones.append((f'BL_up'.replace('L', side), (sx * Hd['T'].x, Hd['T'].y, Hd['T'].z), (sx * Hd['K'].x, Hd['K'].y, Hd['K'].z), 'hips'))
        bones.append((f'BL_low'.replace('L', side), (sx * Hd['K'].x, Hd['K'].y, Hd['K'].z), (sx * Hd['Hk'].x, Hd['Hk'].y, Hd['Hk'].z), f'B{side}_up'))
        bones.append((f'BL_paw'.replace('L', side), (sx * Hd['Hk'].x, Hd['Hk'].y, Hd['Hk'].z), (sx * Hd['Z'].x, Hd['Z'].y, Hd['Z'].z + 0.01), f'B{side}_low'))

    # orelhas (2 ossos cada)
    ear = S['ear']
    ear_base = V((hr * ear.get('bx', 0.55), 0.04 * hr, hr * ear.get('bz', 0.7)))
    ear_mid = ear['mid'](hr)
    ear_tip = ear['tip'](hr)
    for side, sx in (('L', 1), ('R', -1)):
        b, m, t = (V((sx * ear_base.x, ear_base.y, ear_base.z)) + Hc, V((sx * ear_mid.x, ear_mid.y, ear_mid.z)) + Hc, V((sx * ear_tip.x, ear_tip.y, ear_tip.z)) + Hc)
        bones.append((f'ear{side}', tuple(b), tuple(m), 'head'))
        bones.append((f'ear2{side}', tuple(m), tuple(t), f'ear{side}'))
    for i in range(3):
        bones.append((f'tail{i + 1}', tuple(tail_pts[i]), tuple(tail_pts[i + 1]), 'hips' if i == 0 else f'tail{i}'))

    # ------------------------------------------------------------ materiais por regiao
    mats = dict(torso='coat', head='coat', muzzle='coat', jaw='belly', ear='coat', earin='inner', neck='coat', legU='coat', legL='coat', sock='coat', tail='coat', tailtip='coat')
    mats.update(S.get('mats', {}))
    sock_u = S.get('sock_u', 0.72)
    tip_u = S.get('tip_u', 1.1)
    seed = Vector(S.get('seed', (3.1, 7.7, 1.3)))
    freq = S.get('patch_freq', 9.0)
    lo, hi = S.get('patch_th', (-0.2, 0.22))

    def patch(c, u):
        v = noise.noise(c * freq + seed)
        return 'coat3' if v < lo else ('coat2' if v > hi else 'coat')

    def mt(key, c=None):
        m = mats[key]
        return patch if m == 'patch' else m

    def leg_mat(c, u):
        if u is not None and u >= sock_u:
            m = mats['sock']
        else:
            m = mats['legU']
        return patch(c, u) if m == 'patch' else m

    def tail_mat(c, u):
        m = mats['tailtip'] if (u is not None and u >= tip_u) else mats['tail']
        return patch(c, u) if m == 'patch' else m

    # ------------------------------------------------------------ torso
    prof_w = S.get('prof_w', [0.55, 0.88, 1.0, 1.0, 0.98, 0.92, 0.68])
    prof_h = S.get('prof_h', [0.6, 0.92, 1.0, 1.0, 1.04, 1.0, 0.78])
    prof_dz = S.get('prof_dz', [0.05, 0.0, 0.0, 0.0, -0.06, -0.08, 0.0])
    ext0, ext1 = S.get('rear_ext', 0.05) * unit, S.get('front_ext', 0.05) * unit
    n = len(prof_w)
    path = [V((0, (yH + ext0) + ((yC - ext1) - (yH + ext0)) * i / (n - 1), zc + prof_dz[i] * bh)) for i in range(n)]
    hs_y, sc_y = ys[1] + L * 0.1, ys[2] - L * 0.05
    torso_w = lambda p, u: band(p.y, [hs_y, sc_y], ['hips', 'spine', 'chest'], L * 0.16)
    sweep(parts, path, [bw * w for w in prof_w], [bh * h for h in prof_h], mt('torso'), torso_w, segs=14, ref=(0, 0, 1), capk=0.5)

    # ------------------------------------------------------------ pescoco
    neck_mid = (N0 + Hn) / 2 + V((0, 0, 0))
    nr = S.get('neck_r', 0.72) * hr
    neck_w = lambda p, u: band(1 - (u or 0), [0.88, 0.14], ['chest', 'neck', 'head'], 0.12)
    sweep(parts, [N0 + V((0, L * 0.06, -bh * 0.1)), neck_mid, Hn + V((0, -hr * 0.2, 0))], [nr * 1.05, nr * 0.95, nr * 0.95], [nr * 1.05, nr * 0.95, nr * 0.9], mats['neck'], neck_w, segs=12, capk=0.3, cap0=False)

    # ------------------------------------------------------------ cabeca
    hx, hy, hz = hr * S.get('head_w', 0.98), hr, hr * S.get('head_h', 0.92)
    ellipsoid(parts, Hc, (hx, hy, hz), mt('head'), 'head', segs=14, rings=10)
    mz0 = Hc + V((0, -hy * 0.5, -hz * S.get('muz_dz', 0.28)))
    mz1 = mz0 + V((0, -sl, S.get('muz_up', -0.0) * hr))
    sweep(parts, [mz0, (mz0 + mz1) / 2, mz1], [sr * 1.05, sr * 0.95, sr * 0.82], [sr * S.get('muz_h', 0.85), sr * 0.8, sr * 0.7], mt('muzzle'), 'head', segs=12, capk=0.55, cap0=False, ref=(0, 0, 1))
    # focinho: bochechas
    for sx in (1, -1):
        ellipsoid(parts, mz0 + V((sx * sr * 0.55, 0.012 * unit, -sr * 0.1)), (sr * 0.62, sr * 0.8, sr * 0.55), mats['muzzle'], 'head', segs=10, rings=7)
    # nariz
    nz = S.get('nose_r', 0.5)
    ellipsoid(parts, mz1 + V((0, -sr * 0.5, sr * S.get('nose_dz', 0.1))), (sr * nz * 1.05, sr * 0.38, sr * nz * 0.72), 'nose', 'head', segs=10, rings=7)
    # mandibula + lingua
    jp = Hc + V((0, -hr * 0.35, -hr * 0.5))
    jl = sl * 0.82
    sweep(parts, [jp + V((0, 0.0, 0)), jp + V((0, -jl * 0.5, -0.003)), jp + V((0, -jl, 0.004))], [sr * 0.7, sr * 0.72, sr * 0.62], [sr * 0.36, sr * 0.34, sr * 0.3], mats['jaw'], 'jaw', segs=10, capk=0.5, cap0=False, ref=(0, 0, 1))
    ellipsoid(parts, jp + V((0, -jl * 0.5, 0.012)), (sr * 0.34, jl * 0.38, sr * 0.1), 'tongue', 'jaw', segs=8, rings=6)
    # olhos
    er = hr * S.get('eye_r', 0.2)
    d0 = V(S.get('eye_dir', (0.52, -0.78, 0.3))).normalized()
    for sx in (1, -1):
        d = V((d0.x * sx, d0.y, d0.z))
        c = Hc + V((d.x * hx, d.y * hy, d.z * hz)) * 0.97
        if S.get('cat_eyes'):
            ellipsoid(parts, c, (er, er * 0.92, er), 'iris', 'head', segs=12, rings=8)
            ellipsoid(parts, c + V((0, -er * 0.86, 0)), (er * 0.15, er * 0.16, er * 0.7), 'pupil', 'head', segs=8, rings=6)
        else:
            ellipsoid(parts, c, (er, er * 0.92, er), 'eye', 'head', segs=12, rings=8)
        ellipsoid(parts, c + V((-sx * er * 0.2, -er * 0.8, er * 0.42)), (er * 0.26, er * 0.12, er * 0.26), 'glint', 'head', segs=6, rings=4)
        if S.get('brows'):
            ellipsoid(parts, c + V((0, -er * 0.35, er * 1.25)), (er * 0.62, er * 0.45, er * 0.38), S['brows'], 'head', segs=8, rings=6)

    # ------------------------------------------------------------ orelhas
    ew = ear.get('w', 0.4) * hr
    et = ear.get('t', 0.14) * hr
    for side, sx in (('L', 1), ('R', -1)):
        b = V((sx * ear_base.x, ear_base.y, ear_base.z)) + Hc
        m = V((sx * ear_mid.x, ear_mid.y, ear_mid.z)) + Hc
        t = V((sx * ear_tip.x, ear_tip.y, ear_tip.z)) + Hc
        wfn = lambda p, u, side=side: band(1 - (u or 0), [0.88, 0.5], ['head', f'ear{side}', f'ear2{side}'], 0.1)
        path = [b, m, t] if not ear.get('curve') else [b, m, ear['curve'](sx, Hc, hr), t]
        k = len(path)
        widths = ear.get('profile', [1.0, 0.95, 0.55][:k] if k == 3 else [1.0, 0.95, 0.8, 0.5])
        sweep(parts, path, [ew * w for w in widths], [et * (1.1 if i == 0 else 0.9) for i in range(k)], mats['ear'], wfn, segs=10, capk=0.5, ref=ear.get('ref', (1, 0, 0)))
        if ear.get('inner'):
            ip = [pp + V((-sx * et * 0.7, -0.0, 0)) + V((0, -0.002, 0)) for pp in path]
            sweep(parts, ip, [ew * 0.58 * w for w in widths], [et * 0.55] * k, mats['earin'], wfn, segs=8, capk=0.4, ref=ear.get('ref', (1, 0, 0)), cap0=False)

    # ------------------------------------------------------------ pernas
    lr = S.get('leg_r', 0.028) * unit
    for side, sx in (('L', 1), ('R', -1)):
        fp = [V((sx * F[k].x, F[k].y, F[k].z)) for k in ('T', 'E', 'W')] + [V((sx * F['W'].x, F['W'].y - paw * 0.35, 0.012 * unit))]
        fp[0] = fp[0] + V((0, 0, bh * 0.2))
        sweep(parts, fp, [lr * 1.55, lr * 1.1, lr * 0.95, lr * 1.35], [lr * 1.3, lr * 1.0, lr * 0.9, lr * 1.05], leg_mat,
              lambda p, u, side=side: band(p.z, [leg * 0.95, F['E'].z, F['W'].z], ['chest', f'F{side}_up', f'F{side}_low', f'F{side}_paw'], leg * 0.07 + 0.004),
              segs=10, capk=0.5, ref=(1, 0, 0), cap0=False)
        hp = [V((sx * Hd[k].x, Hd[k].y, Hd[k].z)) for k in ('T', 'K', 'Hk')] + [V((sx * Hd['Z'].x, Hd['Z'].y, 0.012 * unit))]
        hp[0] = hp[0] + V((0, 0, bh * 0.25))
        sweep(parts, hp, [lr * 2.0, lr * 1.2, lr * 0.9, lr * 1.35], [lr * 1.55, lr * 1.0, lr * 0.85, lr * 1.05], leg_mat,
              lambda p, u, side=side: band(p.z, [leg * 0.95, Hd['K'].z, Hd['Hk'].z], ['hips', f'B{side}_up', f'B{side}_low', f'B{side}_paw'], leg * 0.07 + 0.004),
              segs=10, capk=0.5, ref=(1, 0, 0), cap0=False)

    # ------------------------------------------------------------ cauda
    tr = S.get('tail_r', [0.02, 0.016, 0.012, 0.01])
    tr = [t * unit for t in tr]
    sweep(parts, tail_pts, tr, tr, tail_mat, lambda p, u: band(1 - (u or 0), [0.67, 0.34], ['tail1', 'tail2', 'tail3'], 0.1), segs=9, capk=0.6, cap0=False, ref=(0, 0, 1))

    # ------------------------------------------------------------ extras da raca
    ctx = dict(parts=parts, S=S, L=L, bh=bh, bw=bw, leg=leg, hr=hr, zc=zc, yH=yH, yC=yC, unit=unit, Hc=Hc, Hn=Hn, N0=N0, mz0=mz0, mz1=mz1, sl=sl, sr=sr,
               F=F, Hd=Hd, tail=tail_pts, mats=mats, ear=(ear_base, ear_mid, ear_tip), hx=hx, hy=hy, hz=hz, er=er)
    if S.get('extras'):
        S['extras'](ctx)

    colors = dict(S['colors'])
    obj = P.build_mesh(parts, colors, S['id'])
    arm = P.make_armature(bones)
    return obj, arm, bones

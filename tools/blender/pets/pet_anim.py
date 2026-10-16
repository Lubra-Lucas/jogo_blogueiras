"""Animacoes procedurais dos pets: idle, walk, run, sit, lie, happy, eat. Todas em loop, 24 fps.

Convencao de angulos (ver pet_lib.Rig): p = pitch (positivo = frente/cima), y = giro em Z, r = rolagem.
"""
import math
import bpy
import pet_lib as P

TAU = 2 * math.pi
LEGS = ('FL', 'FR', 'BL', 'BR')


def S(t, ph=0.0, n=1):
    return math.sin(TAU * (n * t + ph))


def C(t, ph=0.0, n=1):
    return math.cos(TAU * (n * t + ph))


def bump(t, c, w):
    """pulso suave periodico em torno de c"""
    d = ((t - c + 0.5) % 1.0) - 0.5
    return math.exp(-(d / w) ** 2)


def ent(d, b, **kw):
    e = d.setdefault(b, {})
    for k, v in kw.items():
        e[k] = v if k == 'loc' else e.get(k, 0) + v
    return e


def idle(t, k):
    d = {}
    br = S(t)
    ent(d, 'spine', p=0.8 * br)
    ent(d, 'chest', p=1.2 * br)
    ent(d, 'neck', p=-0.6 * br)
    ent(d, 'head', p=-0.8 * br + 1.5 * S(t, 0.2), y=4 * S(t, 0.1))
    ent(d, 'tail1', y=10 * S(t, 0.0), p=2)
    ent(d, 'tail2', y=14 * S(t, 0.12))
    ent(d, 'tail3', y=18 * S(t, 0.25))
    tw = bump(t, 0.62, 0.035)
    ent(d, 'earL', r=-12 * tw, p=-6 * tw)
    ent(d, 'ear2L', p=-8 * tw)
    ent(d, 'earR', r=3 * tw)
    return d


def walk(t, k):
    d = {}
    A = k.get('walk_amp', 24)
    for lg, o in dict(FL=0.0, BR=0.0, FR=0.5, BL=0.5).items():
        s = S(t, o)
        c = C(t, o)
        front = lg[0] == 'F'
        ent(d, f'{lg}_up', p=A * s * (1 if front else 0.85))
        ent(d, f'{lg}_low', p=-A * 0.9 * max(0.0, c) - (4 if front else 8) * (1 - c) * 0.2)
        ent(d, f'{lg}_paw', p=A * 0.35 * max(0.0, c) - A * 0.25 * s)
    ent(d, 'root', loc=(0, 0, 0.008 * C(t, 0, 2)))
    ent(d, 'hips', y=3.5 * S(t, 0.0), r=1.2 * S(t))
    ent(d, 'spine', y=-4 * S(t, 0.0), p=1.5 * S(t, 0.1, 2))
    ent(d, 'chest', y=2 * S(t, 0.0))
    ent(d, 'neck', p=1.5 * S(t, 0.25, 2))
    ent(d, 'head', y=-2.5 * S(t, 0.0), p=1.2 * S(t, 0.4, 2))
    ent(d, 'tail1', y=9 * S(t, 0.1), p=6)
    ent(d, 'tail2', y=12 * S(t, 0.2))
    ent(d, 'tail3', y=14 * S(t, 0.3))
    ent(d, 'earL', p=-3 * S(t, 0.2, 2))
    ent(d, 'earR', p=-3 * S(t, 0.2, 2))
    return d


def run(t, k):
    d = {}
    A = k.get('run_amp', 42)
    for lg, o in dict(FL=0.0, FR=0.07, BL=0.5, BR=0.57).items():
        s = S(t, o)
        c = C(t, o)
        front = lg[0] == 'F'
        ent(d, f'{lg}_up', p=A * s * (1.0 if front else 1.1))
        ent(d, f'{lg}_low', p=-A * 1.15 * max(0.0, c) - 6 * (1 - c) * 0.2)
        ent(d, f'{lg}_paw', p=A * 0.4 * max(0.0, c) - A * 0.3 * s)
    ent(d, 'root', loc=(0, 0, 0.03 * abs(S(t, 0.0))))
    ent(d, 'hips', p=-5 * S(t, 0.15))
    ent(d, 'spine', p=10 * S(t, 0.25))
    ent(d, 'chest', p=5 * S(t, 0.3))
    ent(d, 'neck', p=-4 * S(t, 0.3) + 5)
    ent(d, 'head', p=-2 * S(t, 0.3) + 2)
    ent(d, 'tail1', p=14, y=6 * S(t, 0.1))
    ent(d, 'tail2', p=8, y=8 * S(t, 0.2))
    ent(d, 'tail3', p=6, y=10 * S(t, 0.3))
    ent(d, 'earL', p=-22, r=-6)
    ent(d, 'earR', p=-22, r=6)
    ent(d, 'ear2L', p=-10)
    ent(d, 'ear2R', p=-10)
    ent(d, 'jaw', p=-10 * (0.5 + 0.5 * S(t, 0.25, 2)))
    return d


def sit_pose(k):
    d = {}
    o = k.get('sit', {})
    hip, sp, ch = o.get('hips', 38), -4, -6
    ent(d, 'hips', p=hip)
    ent(d, 'spine', p=sp)
    ent(d, 'chest', p=ch)
    cum = hip + sp + ch
    ent(d, 'neck', p=-(cum) * 0.55 + 4)
    ent(d, 'head', p=-(cum) * 0.45 - 4)
    for side in 'LR':
        ent(d, f'F{side}_up', p=-cum)
        ent(d, f'B{side}_up', p=o.get('bup', 42))
        ent(d, f'B{side}_low', p=o.get('blow', -100))
        ent(d, f'B{side}_paw', p=o.get('bpaw', 105))
    ent(d, 'tail1', p=o.get('tail', -20))
    return d


def sit(t, k):
    d = sit_pose(k)
    br = S(t)
    ent(d, 'chest', p=1.0 * br)
    ent(d, 'head', p=-0.8 * br + 1.5 * S(t, 0.2), y=5 * S(t, 0.1))
    ent(d, 'tail1', y=8 * S(t, 0))
    ent(d, 'tail2', y=10 * S(t, 0.15))
    ent(d, 'tail3', y=12 * S(t, 0.3))
    tw = bump(t, 0.7, 0.035)
    ent(d, 'earL', r=-10 * tw)
    ent(d, 'earR', r=4 * tw)
    ent(d, 'root', loc=(0, 0, k.get('_sit_drop', 0.0)))
    return d


def lie_pose(k):
    d = {}
    o = k.get('lie', {})
    ent(d, 'hips', p=o.get('hips', 2))
    ent(d, 'chest', p=-2)
    ent(d, 'neck', p=o.get('neck', 14))
    ent(d, 'head', p=o.get('head', -12))
    for side in 'LR':
        ent(d, f'F{side}_up', p=o.get('fup', 78))
        ent(d, f'F{side}_low', p=o.get('flow', 12))
        ent(d, f'F{side}_paw', p=o.get('fpaw', -10))
        ent(d, f'B{side}_up', p=o.get('bup', 72))
        ent(d, f'B{side}_low', p=o.get('blow', -110))
        ent(d, f'B{side}_paw', p=o.get('bpaw', 108))
    ent(d, 'tail1', p=o.get('tail', -12))
    return d


def lie(t, k):
    d = lie_pose(k)
    br = S(t)
    ent(d, 'spine', p=0.6 * br)
    ent(d, 'chest', p=0.9 * br)
    ent(d, 'head', p=-0.6 * br, y=3 * S(t, 0.1))
    ent(d, 'tail1', y=6 * S(t, 0))
    ent(d, 'tail2', y=8 * S(t, 0.15))
    ent(d, 'tail3', y=10 * S(t, 0.3))
    tw = bump(t, 0.4, 0.04)
    ent(d, 'earL', r=-9 * tw)
    ent(d, 'root', loc=(0, 0, k.get('_lie_drop', 0.0)))
    return d


def happy(t, k):
    d = {}
    hop = abs(S(t, 0.0, 2))
    ent(d, 'root', loc=(0, 0, 0.055 * hop))
    ent(d, 'hips', p=-6 * hop, y=8 * S(t, 0.0, 4))
    ent(d, 'spine', p=8 * hop, y=-8 * S(t, 0.0, 4))
    ent(d, 'chest', p=5 * hop)
    ent(d, 'neck', p=6 * hop)
    ent(d, 'head', p=-4 * hop, r=6 * S(t, 0.0, 2), y=5 * S(t, 0.25, 4))
    for lg in LEGS:
        front = lg[0] == 'F'
        ent(d, f'{lg}_up', p=(26 if front else -14) * hop)
        ent(d, f'{lg}_low', p=(-30 if front else 18) * hop)
    for i, a in enumerate((26, 34, 40), start=1):
        ent(d, f'tail{i}', y=a * S(t, 0.1 * i, 4), p=(18 if i == 1 else 6))
    ent(d, 'earL', p=-14 * hop, r=-6)
    ent(d, 'earR', p=-14 * hop, r=6)
    ent(d, 'ear2L', p=-10 * hop)
    ent(d, 'ear2R', p=-10 * hop)
    ent(d, 'jaw', p=-14 * (0.6 + 0.4 * S(t, 0.2, 2)))
    return d


def eat(t, k):
    d = {}
    ch = 0.5 + 0.5 * S(t, 0.0, 3)
    ent(d, 'chest', p=-6)
    ent(d, 'spine', p=-3)
    ent(d, 'neck', p=-k.get('eat_neck', 36) - 4 * ch)
    ent(d, 'head', p=-k.get('eat_head', 20) + 3 * ch)
    ent(d, 'jaw', p=-16 * ch)
    ent(d, 'tail1', y=9 * S(t, 0.0), p=4)
    ent(d, 'tail2', y=12 * S(t, 0.15))
    ent(d, 'tail3', y=14 * S(t, 0.3))
    ent(d, 'earL', p=-4 * ch)
    ent(d, 'earR', p=-4 * ch)
    for side in 'LR':
        ent(d, f'F{side}_up', p=6)
        ent(d, f'F{side}_low', p=-6)
    return d


ACTIONS = [('idle', 48, idle), ('walk', 24, walk), ('run', 16, run), ('sit', 48, sit), ('lie', 60, lie), ('happy', 24, happy), ('eat', 36, eat)]


def fcurves_of(act):
    """compativel com acoes em camadas (Blender 4.4+) e antigas"""
    try:
        out = []
        for layer in act.layers:
            for strip in layer.strips:
                for cb in strip.channelbags:
                    out.extend(cb.fcurves)
        return out
    except AttributeError:
        return list(act.fcurves)


def create_actions(arm, rig, mesh, knobs=None):
    """Grava as acoes no NLA (uma trilha por clipe) para o exportador gerar uma animacao por nome."""
    k = dict(knobs or {})
    ad = arm.animation_data_create()
    # alturas de sentar/deitar: encosta o ponto mais baixo no chao
    for key, fn in (('_sit_drop', sit), ('_lie_drop', lie)):
        k[key] = 0.0
        rig.set_pose(fn(0.0, k))
        k[key] = -P.min_z(mesh)
    for name, n, fn in ACTIONS:
        act = bpy.data.actions.new(name)
        ad.action = act
        for f in range(n + 1):
            rig.key(f + 1, fn((f % n) / n, k))
        for fc in fcurves_of(act):
            for kp in fc.keyframe_points:
                kp.interpolation = 'BEZIER'
        tr = ad.nla_tracks.new()
        tr.name = name
        st = tr.strips.new(name, 1, act)
        st.name = name
        ad.action = None
    rig.set_pose({})

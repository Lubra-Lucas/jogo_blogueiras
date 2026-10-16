"""Escreve public/assets/pets/pets.json a partir de breeds.py."""
import json
import os
from breeds import BREEDS

ANIMS = ['idle', 'walk', 'run', 'sit', 'lie', 'happy', 'eat']

# Precos ficam em src/game/economy/prices.ts (PET_BREED_PRICE...). Aqui so as medidas para acessorios.


def meta(b):
    """pontos-chave em coordenadas do three (x, y=cima, z=frente); mesmas formulas de pet_build.build_pet"""
    L, bh, bw, leg, hr = b['L'], b['bh'], b['bw'], b['leg'], b['hr']
    unit = max(0.85, min(1.15, L / 0.35))
    zc = leg + bh * 0.45
    yC = -L / 2
    n0 = (0.0, yC + 0.01, zc + bh * 0.25)
    hn = (0.0, n0[1] - b['neck_f'] * unit, n0[2] + b['neck_h'] * unit)
    hc = (0.0, hn[1] - hr * b.get('head_fwd', 0.45), hn[2] + hr * 0.2)
    t = lambda p: [round(p[0], 4), round(p[2], 4), round(-p[1], 4)]
    return dict(hr=hr, L=L, bh=bh, bw=bw, zc=round(zc, 4), n0=t(n0), hn=t(hn), hc=t(hc), neckR=round(b.get('neck_r', 0.72) * hr, 4), height=round(hc[2] + hr * 1.0, 3))


def write_manifest(out):
    breeds = []
    for b in BREEDS:
        coats = []
        for c in b['coats']:
            cols = dict(b['colors'])
            cols.update(c['colors'])
            e = dict(id=c['id'], label=c['label'], tier=c['tier'], colors=cols)
            coats.append(e)
        breeds.append(dict(id=b['id'], label=b['label'], species=b['species'], file=b['id'] + '.glb', meta=meta(b), coats=coats))
    data = dict(version=1, anims=ANIMS, facing='+Z', note='Gerado por tools/blender/pets/build_pets.py. Cores por slot de material: coat, coat2, coat3, belly, nose, eye, iris, pupil, glint, inner, tongue.', breeds=breeds)
    with open(os.path.join(out, 'pets.json'), 'w', encoding='utf8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)

"""Empacota texturas do rosto/boneca para reduzir o numero de samplers por material (limite de 16 unidades de textura da GPU).
Rodar DEPOIS de make_styles.py (que apaga e recria a pasta do kit) e do que gera doll_layers_mask*.png.
  eyep_<id>.png      = esclera (sRGB, em cima) + iris/brilho/delineado (dados, embaixo)           [um sampler em vez de dois]
  face_atlas.png     = extras (RGB) | pintura (R) | blush (R = elipse) | sombreado classico 1024x512 (RGB)  [um sampler em vez de quatro]
  ../../doll_layers_masks.png = RGBA: R = peso pele (r/(r+g) da mascara 1), G = linha do cabelo, B = unha, A = 128+127*posicao da unha
Layout do atlas: manter igual a FACE_ATLAS em src/game/character/maleFace.ts."""
import os, sys
from PIL import Image
import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'public', 'assets', 'characters')
FACE = os.path.join(ROOT, 'male', 'face')
rm = []

def stack(top, bottom, out):
    a, b = Image.open(top).convert('RGBA'), Image.open(bottom).convert('RGBA')
    assert a.size == b.size, (top, a.size, b.size)
    im = Image.new('RGBA', (a.width, a.height * 2))
    im.paste(b, (0, a.height))  # iris embaixo (v 0..0.5)
    im.paste(a, (0, 0))  # esclera em cima (v 0.5..1)
    im.save(out, optimize=True)
    rm.extend([top, bottom])

ids = sorted(f[4:-11] for f in os.listdir(FACE) if f.startswith('eye_') and f.endswith('_sclera.png'))
for i in ids:
    iris = os.path.join(FACE, 'eye_classic_iris.png' if i == 'classic' else f'eyepk_{i}.png')
    stack(os.path.join(FACE, f'eye_{i}_sclera.png'), iris, os.path.join(FACE, f'eyep_{i}.png'))

W, H = 1024, 3976
ex = Image.open(os.path.join(FACE, 'extras.png')).convert('RGB')
pt = Image.open(os.path.join(FACE, 'paint.png')).convert('RGBA')
bl = Image.open(os.path.join(FACE, 'blush.png')).convert('RGBA')
sh = Image.open(os.path.join(FACE, 'classic_shade.png')).convert('RGB').resize((1024, 512), Image.LANCZOS)
assert ex.size == (1024, 1432) and pt.size == (1024, 1432) and bl.size == (800, 600)
atlas = Image.new('RGBA', (W, H), (0, 0, 0, 255))
atlas.paste(ex.convert('RGBA'), (0, 0))
p = np.zeros((1432, 1024, 4), np.uint8); p[..., 0] = np.array(pt)[..., 3]; p[..., 3] = 255
atlas.paste(Image.fromarray(p), (0, 1432))
b = np.zeros((600, 800, 4), np.uint8); b[..., 0] = np.array(bl)[..., 3]; b[..., 3] = 255
atlas.paste(Image.fromarray(b), (0, 2864))
atlas.paste(sh.convert('RGBA'), (0, 3464))
atlas.save(os.path.join(FACE, 'face_atlas.png'), optimize=True)
rm.extend(os.path.join(FACE, f) for f in ('extras.png', 'paint.png', 'blush.png', 'classic_shade.png'))

m = np.array(Image.open(os.path.join(ROOT, 'doll_layers_mask.png')).convert('RGB')).astype(np.float32)
n = np.array(Image.open(os.path.join(ROOT, 'doll_layers_mask2.png')).convert('RGB')).astype(np.float32)
assert m[..., 2].max() == 0
s = m[..., 0] + m[..., 1]
out = np.zeros(m.shape[:2] + (4,), np.uint8)
out[..., 0] = np.round(255 * np.where(s > 0, m[..., 0] / np.maximum(s, 1), 0)).astype(np.uint8)
out[..., 1] = n[..., 1]
out[..., 2] = n[..., 0]
out[..., 3] = (128 + np.round(n[..., 2] * 127 / 255)).astype(np.uint8)
Image.fromarray(out).save(os.path.join(ROOT, 'doll_layers_masks.png'), optimize=True)

if '--keep' not in sys.argv:
    for f in rm:
        if os.path.exists(f): os.remove(f)
print('ok', len(ids), 'olhos')

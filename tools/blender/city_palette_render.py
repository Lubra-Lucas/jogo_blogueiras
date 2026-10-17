"""
Foto de um trecho da cidade com as MESMAS paletas/materiais do jogo (para aprovar mudancas de cor antes de aplicar).

Uso:
  blender -b --factory-startup -noaudio -P tools/blender/city_palette_render.py -- --scene praca --out PNG [--w 1600 --h 1000]

Le as pecas e paletas de src/game/world/city/*.json (kitY2k, kitRomantic, propsPlus, propsMore, propsLite) e pinta cada slot
de material como o jogo faz em kit.tsx (slotColor + classes por/metal/glass/glow): porcelana com verniz, metal com leve
furta-cor (thin film), vidro perolado e brilho emissivo.
Cenas: 'praca' (Praca Central do Centro: fonte, vasos-orbe, banco, poste, quiosque com marquise, placa, predios).
"""
import json
import math
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
CITY_SRC = os.path.join(ROOT, 'src', 'game', 'world', 'city')
ASSETS = os.path.join(ROOT, 'public', 'assets', 'city')
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []


def opt(n, d=None):
    return args[args.index(n) + 1] if n in args else d


SCENE = opt('--scene', 'praca')
OUT = opt('--out', '/tmp/city_palette.png')
RW, RH = int(opt('--w', 1600)), int(opt('--h', 1000))

PAL, METALS, PIECES = {}, {}, {}
for f in ('kitY2k.json', 'kitRomantic.json', 'propsPlus.json', 'propsMore.json', 'propsLite.json'):
    p = os.path.join(CITY_SRC, f)
    if not os.path.exists(p):
        continue
    d = json.load(open(p))
    PAL.update(d.get('palettes', {}))
    METALS.update(d.get('metals', {}))
    PIECES.update(d.get('pieces', {}))


def lin(h, a=1.0):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    return tuple((x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c) + (a,)


def mix_hex(a, b, t):
    ca, cb = lin(a), lin(b)
    return tuple(ca[i] * (1 - t) + cb[i] * t for i in range(3)) + (1,)


def slot_color(slot, p, over):
    """igual a slotColor() de src/game/world/city/kit.tsx"""
    if over and slot in over:
        return lin(over[slot])
    if slot == 'trim':
        return lin(METALS[p['metal']]['color'])
    if slot == 'leaf':
        return lin(p.get('leaf', '#5f9a58'))
    if slot == 'water':
        return lin('#a8d4e0')
    if slot == 'glass':
        return mix_hex(p['glass'], '#ffffff', 0.55)
    if slot == 'seat':
        return lin(p.get('seat', p['base']))
    return lin(p.get(slot, p['base']))


CLS = dict(base='por', seat='por', accent='por', accent2='por', soft='por', deep='por', white='por', leaf='por',
           trim='metal', glass='glass', glow='glow', glow2='glow', water='water')


def make_mat(slot, pal_name, over):
    p = PAL[pal_name]
    cls = CLS.get(slot, 'por')
    m = bpy.data.materials.new(f'{pal_name}:{slot}')
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    col = slot_color(slot, p, over)
    b.inputs['Base Color'].default_value = col
    if cls == 'por':
        b.inputs['Roughness'].default_value = 0.18
        b.inputs['Coat Weight'].default_value = 1.0
        b.inputs['Coat Roughness'].default_value = 0.04
    elif cls == 'metal':
        b.inputs['Metallic'].default_value = 0.9
        b.inputs['Roughness'].default_value = 0.12
        b.inputs['Coat Weight'].default_value = 1.0
        b.inputs['Coat Roughness'].default_value = 0.03
        try:
            b.inputs['Thin Film Thickness'].default_value = 300
            b.inputs['Thin Film IOR'].default_value = 1.4
        except KeyError:
            pass
    elif cls == 'glass':
        b.inputs['Roughness'].default_value = 0.05
        b.inputs['Coat Weight'].default_value = 1.0
        b.inputs['Alpha'].default_value = 0.62
        try:
            b.inputs['Thin Film Thickness'].default_value = 500
            b.inputs['Thin Film IOR'].default_value = 1.5
        except KeyError:
            pass
        try:
            m.surface_render_method = 'BLENDED'
        except Exception:
            pass
    elif cls == 'glow':
        b.inputs['Emission Color'].default_value = col
        b.inputs['Emission Strength'].default_value = float(p.get('glow_str', 2.6))
    elif cls == 'water':
        b.inputs['Roughness'].default_value = 0.02
        b.inputs['Alpha'].default_value = 0.5
    return m


def place(piece, x, y, rot=0.0, s=1.0, pal='pearl', over=None, z=0.0):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(ASSETS, PIECES[piece]['file']))
    new = [o for o in bpy.data.objects if o not in before]
    e = bpy.data.objects.new('p_' + piece, None)
    bpy.context.collection.objects.link(e)
    for o in new:
        if o.parent is None:
            o.parent = e
        if o.type == 'MESH':
            for sl in o.material_slots:
                if sl.material:
                    slot = sl.material.name.split('.')[0]
                    sl.material = make_mat(slot, pal, over)
    e.location = (x, y, z)
    e.rotation_euler = (0, 0, math.radians(rot))
    e.scale = (s, s, s)
    return e


def scene_praca(v):
    """Praca Central como em centro.ts (fonte bubblegum, anel de vasos-orbe, quiosque com marquise, poste, banco, placa)."""
    place('plaza_centerpiece', 0, 0, 0, 1.25, v['plaza_pal'], v['plaza_over'])
    pals = ['mint', 'babyblue', 'lilac', 'butter']
    for i in range(8):
        a = (i + 0.5) / 8 * math.pi * 2
        place('planter_orb', math.cos(a) * 12, math.sin(a) * 12, 0, 1.25, pals[i % 4])
    place('bench_bubble', -6.5, -9.5, 15, 1, 'babyblue')
    place('bench_bubble', 9.5, -2.5, 80, 1, 'peach')
    place('lamp_futuristic', 5.5, -11, 200, 1, 'butter', {'glow': '#ffe2a8'})
    place('lamp_futuristic', -12, -4, 160, 1, 'butter', {'glow': '#ffe2a8'})
    place('kiosk_pod', -17, 7, 35, 0.8, 'peach')
    place('canopy_curved', -17, 7, 35, 1, 'peach')
    place('kiosk_pod', 18, 8, -35, 0.8, 'mint')
    place('canopy_curved', 18, 8, -35, 1, 'mint')
    place('holo_sign', 12.5, -8, -20, 1, 'butter')
    place('building_capsule_row', 0, 30, 0, 1.25, 'peach')
    place('building_bubble_tall', -15, 31, 0, 1.2, 'lilac')
    place('building_bubble', 15, 31, 0, 1.1, 'babyblue')
    place('building_bubble_wide', -31, 27, 20, 0.85, 'mint')
    place('building_bubble_wide', 31, 27, -20, 0.85, 'butter')
    return Vector((0, -30, 7.5)), Vector((0, 4, 2.4)), 30


def scene_rua(v):
    """Calcada do Centro com os objetos 'lite' de rua, cada um com a paleta padrao dele (propsLite.json)."""
    lite = json.load(open(os.path.join(CITY_SRC, 'propsLite.json')))['pieces']
    order = ['lite_photo_spot_frame', 'lite_mailbox_heart', 'lite_trash_bin_cute', 'lite_magazine_kiosk', 'lite_flower_cart',
             'lite_rose_arch', 'lite_macaron_stand', 'lite_phone_booth_capsule', 'lite_vending_pod', 'lite_bike_rack',
             'lite_wayfinding_post', 'lite_bubble_car_parked', 'lite_birdcage_lamp', 'lite_swan_boat']
    xs = [-14.5, -11.6, -9.4, -6.4, -2.4, 1.4, 4.8, 7.8, 10.4, 13.2, 15.8, -9.5, 0.5, 9.5]
    ys = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -5.5, -5.5, -5.5]
    for name, x, y in zip(order, xs, ys):
        place(name, x, y, 0, 1.0, lite[name].get('pal') or lite[name]['palette'])
    return Vector((0, -19, 5.2)), Vector((0, -1.5, 1.0)), 21


bpy.ops.wm.read_factory_settings(use_empty=True)
SC = bpy.context.scene
VARIANT = dict(plaza_pal=opt('--plaza-pal', 'bubblegum'),
               plaza_over=json.loads(opt('--plaza-over', '{"trim": "#f1d27a", "glow": "#ff9ccb", "glow2": "#8fdcff"}')))
cam_loc, cam_tgt, lens = {'praca': scene_praca, 'rua': scene_rua}[SCENE](VARIANT)

bpy.ops.mesh.primitive_plane_add(size=400)
fl = bpy.context.active_object
fm = bpy.data.materials.new('chao')
fm.use_nodes = True
fb = fm.node_tree.nodes['Principled BSDF']
fb.inputs['Base Color'].default_value = lin(opt('--floor', '#ddd3bd'))
fb.inputs['Roughness'].default_value = 0.4
fl.data.materials.append(fm)

w = bpy.data.worlds.new('w')
SC.world = w
w.use_nodes = True
bg = w.node_tree.nodes['Background']
bg.inputs[0].default_value = lin('#cfdbe8')
bg.inputs[1].default_value = 1.0
bpy.ops.object.light_add(type='SUN')
s = bpy.context.active_object
s.rotation_euler = (math.radians(52), math.radians(8), math.radians(-35))
s.data.energy = 4.2
s.data.angle = 0.12
s.data.color = lin('#fff1dc')[:3]

cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
SC.collection.objects.link(cam)
cam.location = cam_loc
cam.data.lens = lens
cam.rotation_euler = (cam_tgt - cam_loc).to_track_quat('-Z', 'Y').to_euler()
SC.camera = cam

SC.render.engine = 'BLENDER_EEVEE'
SC.render.resolution_x, SC.render.resolution_y = RW, RH
SC.render.filepath = OUT
SC.view_settings.view_transform = 'AgX'
try:
    SC.view_settings.look = 'AgX - Medium High Contrast'
except Exception:
    pass
SC.view_settings.exposure = -0.2
try:
    SC.eevee.taa_render_samples = 32
    SC.eevee.use_raytracing = True
except Exception:
    pass
bpy.ops.render.render(write_still=True)
print('RENDERED', OUT)

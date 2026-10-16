"""Builds the stylised toy cars.  Run:
  blender -b --factory-startup -noaudio --python tools/blender/vehicles/build_cars.py -- [--only compacto,suv] [--render]
Output: public/assets/vehicles/<id>.glb + vehicles.json ; previews in %TEMP%/claude/shots/cars/models
"""
import sys, os, json, struct, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, bmesh
from math import sin, cos, pi
from mathutils import Vector, Matrix, Quaternion
import vlib
from vlib import *
import importlib
import cars_specs


from vhelp import *


# ------------------------------------------------------------------ build one car
def build_car(spec):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = make_materials(spec['body'], spec.get('accent', '#e9dfc8'), spec.get('rim', '#c9ccd2'), spec.get('interior', '#7a5a45'))
    ctx = Ctx(); ctx.spec = spec
    sc = bpy.context.scene

    def mk(name, bm, link=True):
        me = bpy.data.meshes.new(name); bm.to_mesh(me)
        for m in MAT_ORDER: me.materials.append(mats[m])
        ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob); return ob

    tub = spec['tub'](); ctx.tub = tub
    ctx.cabin = spec['cabin']() if spec.get('cabin') else None
    ctx.acc = Acc()

    # ---- tub with cockpit
    bm = bmesh.new()
    cp = spec['cockpit']
    tub.loft(bm, extra=[cp['f0'], cp['f1']] + spec.get('tub_extra', []))
    cut_cockpit(bm, cp['f0'], cp['f1'], cp['xh'], cp['floor'], wall=cp.get('wall', 'interior'))
    tub_ob = mk('tub', bm); bm.free()
    # ---- wheel arch cutters
    hubs = spec['hubs']  # name -> (x, f, z, R, w)
    cb = bmesh.new()
    for name, (x, f, z, R, w) in hubs.items():
        sd = 1 if x > 0 else -1
        x_in = abs(x) - w / 2 - 0.03
        x_out = abs(x) + w / 2 + 0.30
        L = x_out - x_in
        M = Matrix.Translation(cv(sd * (x_in + x_out) / 2, f, z)) @ Quaternion((0, 1, 0), pi / 2).to_matrix().to_4x4()
        bmesh.ops.create_cone(cb, cap_ends=True, cap_tris=False, segments=20, radius1=R + spec.get('arch_gap', 0.05),
                              radius2=R + spec.get('arch_gap', 0.05), depth=L, matrix=M)
    for fc in cb.faces: fc.material_index = MI['tire']
    cut_ob = mk('cutter', cb); cb.free()
    mod = tub_ob.modifiers.new('arch', 'BOOLEAN'); mod.operation = 'DIFFERENCE'; mod.object = cut_ob; mod.solver = 'EXACT'
    dg = bpy.context.evaluated_depsgraph_get()
    ev = tub_ob.evaluated_get(dg)
    me_ev = ev.to_mesh()
    tub_bm = bmesh.new(); tub_bm.from_mesh(me_ev); ev.to_mesh_clear()
    # ---- cabin
    if ctx.cabin:
        cbm = bmesh.new()
        ctx.cabin.loft(cbm, matfn=spec['glass'](ctx), extra=spec.get('cabin_extra', []))
        add_bm(ctx.acc, cbm)
    # ---- decor / interior (car specific)
    spec['decor'](ctx)
    # ---- final body mesh
    body_bm = ctx.acc.bm
    me_t = bpy.data.meshes.new('_t'); tub_bm.to_mesh(me_t); body_bm.from_mesh(me_t); bpy.data.meshes.remove(me_t); tub_bm.free()
    smooth_by_angle(body_bm, spec.get('smooth', 50))
    body = mk('body', body_bm); body_bm.free()
    bpy.data.objects.remove(tub_ob); bpy.data.objects.remove(cut_ob)
    # ---- wheels
    wheel_objs = []
    for name, (x, f, z, R, w) in hubs.items():
        sd = 1 if x > 0 else -1
        ws = dict(spec['wheel'])
        if name.startswith('R') and 'wheel_rear' in spec: ws.update(spec['wheel_rear'])
        wb = build_wheel(sd, R, w, **ws)
        smooth_by_angle(wb, 55)
        emp = bpy.data.objects.new('wheel_' + name, None); emp.empty_display_type = 'PLAIN_AXES'
        sc.collection.objects.link(emp); emp.location = cv(x, f, z)
        mo = mk('wheel_%s_mesh' % name, wb); wb.free()
        mo.parent = emp; mo.location = (0, 0, 0)
        wheel_objs += [emp, mo]
    # ---- empties
    def empty(name, p):
        e = bpy.data.objects.new(name, None); e.empty_display_type = 'SPHERE'; e.empty_display_size = 0.05
        sc.collection.objects.link(e); e.location = cv(*p); return e
    sp = spec['seat']
    lh = spec['lamps']['head']; lt = spec['lamps']['tail']
    emps = [empty('seat', sp), empty('lamp_head_L', lh[0]), empty('lamp_head_R', lh[1]),
            empty('lamp_tail_L', lt[0]), empty('lamp_tail_R', lt[1])]
    # ---- export
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, spec['id'] + '.glb')
    for o in bpy.data.objects: o.select_set(False)
    for o in [body] + wheel_objs + emps: o.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True,
                              export_yup=True, export_materials='EXPORT', export_cameras=False, export_lights=False)
    return path


def glb_info(path):
    with open(path, 'rb') as f:
        f.read(12); ln, _ = struct.unpack('<II', f.read(8)); js = json.loads(f.read(ln))
    tris = 0
    for m in js['meshes']:
        for p in m['primitives']:
            tris += js['accessors'][p['indices']]['count'] // 3
    return js, tris


def check_and_json(spec, path):
    js, tris = glb_info(path)
    nodes = js['nodes']
    names = [n.get('name') for n in nodes]
    print('NODES', names)
    print('MESHTRIS', {n['name']: sum(js['accessors'][p['indices']]['count']//3 for p in js['meshes'][n['mesh']]['primitives']) for n in nodes if 'mesh' in n})
    print('MATS', [m['name'] + ':' + m.get('alphaMode', 'OPAQUE') for m in js['materials']])
    # bbox
    mn = [1e9] * 3; mx = [-1e9] * 3
    # accessor min/max of POSITION, composed with node translation (wheel meshes are children of empties)
    def walk(i, off):
        n = nodes[i]
        t = n.get('translation', [0, 0, 0]); o = [off[k] + t[k] for k in range(3)]
        if 'mesh' in n:
            for p in js['meshes'][n['mesh']]['primitives']:
                a = js['accessors'][p['attributes']['POSITION']]
                for k in range(3):
                    mn[k] = min(mn[k], a['min'][k] + o[k]); mx[k] = max(mx[k], a['max'][k] + o[k])
        for c in n.get('children', []): walk(c, o)
    for r in js['scenes'][0]['nodes']: walk(r, [0, 0, 0])
    hub = {}
    for n in nodes:
        if n.get('name', '').startswith('wheel_') and not n['name'].endswith('_mesh'):
            hub[n['name'][6:]] = [round(v, 3) for v in n['translation']]
            assert 'rotation' not in n or abs(n['rotation'][3] - 1) < 1e-6, n
    size = [round(mx[0] - mn[0], 3), round(mx[1] - mn[1], 3), round(mx[2] - mn[2], 3)]
    print('BBOX min', [round(v, 3) for v in mn], 'max', [round(v, 3) for v in mx], 'size', size, 'tris', tris)
    return js, tris, size, hub, mn, mx


def write_json(spec, path, tris, size, hub):
    jp = os.path.join(OUT_DIR, 'vehicles.json')
    data = {}
    if os.path.exists(jp):
        data = json.load(open(jp))
    R = spec['R']
    hubs = {k: [round(v[0], 3), round(v[2], 3), round(v[1], 3)] for k, v in spec['hubs'].items()}
    def g(p): return [round(p[0], 3), round(p[2], 3), round(p[1], 3)]
    data[spec['id']] = dict(
        name=spec['name'], file=spec['id'] + '.glb', tris=tris, bytes=os.path.getsize(path), size=size,
        wheelRadius=R, wheelbase=spec['wb'], track=spec['track'],
        hubs=hubs, seat=g(spec['seat']), headLamps=[g(p) for p in spec['lamps']['head']],
        tailLamps=[g(p) for p in spec['lamps']['tail']],
        colliders=[dict(center=g(c[0]), half=[round(c[1][0], 3), round(c[1][2], 3), round(c[1][1], 3)]) for c in spec['colliders']],
        bodyColor=spec['body'], accentColor=spec.get('accent'))
    json.dump(data, open(jp, 'w'), indent=1)


# ------------------------------------------------------------------ preview
def render_previews(spec, path, steer_test=False):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE'
    sc.render.resolution_x, sc.render.resolution_y = 900, 600
    try: sc.eevee.taa_render_samples = 32
    except Exception: pass
    sc.view_settings.view_transform = 'AgX'
    try: sc.view_settings.look = 'AgX - Medium High Contrast'
    except Exception: pass
    w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.62, 0.64, 0.68, 1); bg.inputs[1].default_value = 1.0
    # ground
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=30)
    me = bpy.data.meshes.new('g'); bm.to_mesh(me); g = bpy.data.objects.new('ground', me); sc.collection.objects.link(g)
    gm = bpy.data.materials.new('gm'); gm.use_nodes = True
    gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.55, 0.57, 0.56, 1)
    gm.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.9
    me.materials.append(gm)
    def area(name, loc, energy, size, tgt=(0, 0, 0.6)):
        d = bpy.data.lights.new(name, 'AREA'); d.energy = energy; d.size = size
        o = bpy.data.objects.new(name, d); sc.collection.objects.link(o); o.location = loc
        o.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    area('key', (-4, -5, 6), 1500, 5); area('fill', (6, -3, 3), 700, 6); area('rim', (2, 6, 4), 900, 4)
    area('top', (0, 0, 7), 600, 6)
    L = spec['L']; H = spec['H']
    def cam(loc, tgt, ortho=None, lens=55):
        d = bpy.data.cameras.new('c'); d.lens = lens
        if ortho: d.type = 'ORTHO'; d.ortho_scale = ortho
        o = bpy.data.objects.new('c', d); sc.collection.objects.link(o); o.location = loc
        o.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
        sc.camera = o
    D = L * 1.55
    tg = (0, 0, H * 0.4)
    views = {
        'front34': ((D * 0.72, -D * 0.78, H * 1.0 + 0.5), tg, None),
        'rear34': ((-D * 0.72, D * 0.78, H * 1.0 + 0.5), tg, None),
        'side': ((D * 1.6, 0, H * 0.5), tg, L * 1.18),
        'right': ((-D * 1.6, 0, H * 0.5), tg, L * 1.18),
        'top': ((0, 0, 14), (0, 0, 0), L * 1.12),
        'front': ((0.0, -D * 1.2, H * 0.6), tg, None),
    }
    outs = []
    os.makedirs(SHOT_DIR, exist_ok=True)
    for k, (loc, t, orth) in views.items():
        for o in [o for o in bpy.data.objects if o.type == 'CAMERA']: bpy.data.objects.remove(o)
        cam(loc, t, orth)
        p = os.path.join(SHOT_DIR, '%s_%s.png' % (spec['id'], k))
        sc.render.filepath = p; bpy.ops.render.render(write_still=True); outs.append(p)
    # steer test
    if steer_test:
        for o in bpy.data.objects:
            if o.name.startswith('wheel_FL') and not o.name.endswith('_mesh') and o.type == 'EMPTY':
                print('wheel empty', o.name, o.rotation_mode, tuple(o.location), tuple(o.rotation_euler), tuple(o.scale))
    # contact sheet
    import numpy as np
    imgs = [bpy.data.images.load(p) for p in outs]
    w_, h_ = imgs[0].size
    sheet = np.zeros((h_ * 2, w_ * 3, 4), dtype=np.float32)
    for i, im in enumerate(imgs):
        a = np.array(im.pixels[:], dtype=np.float32).reshape(h_, w_, 4)
        r, c = divmod(i, 3)
        sheet[(1 - r) * h_:(2 - r) * h_, c * w_:(c + 1) * w_] = a
    out = bpy.data.images.new('sheet', w_ * 3, h_ * 2, alpha=True)
    out.pixels = sheet.ravel().tolist()
    out.filepath_raw = os.path.join(SHOT_DIR, spec['id'] + '_sheet.png'); out.file_format = 'PNG'; out.save()


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    only = None
    if '--only' in argv: only = argv[argv.index('--only') + 1].split(',')
    do_render = '--render' in argv
    importlib.reload(cars_specs)
    for cid, fn in cars_specs.CARS.items():
        if only and cid not in only: continue
        spec = fn()
        print('=== BUILD', cid)
        path = build_car(spec)
        js, tris, size, hub, mn, mx = check_and_json(spec, path)
        write_json(spec, path, tris, size, hub)
        print('HUBS', hub)
        if do_render:
            render_previews(spec, path)


main()

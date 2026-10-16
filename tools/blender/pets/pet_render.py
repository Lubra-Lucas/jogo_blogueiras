"""Renders de conferencia dos pets (Eevee, estudio claro)."""
import math
import os
import bpy
from mathutils import Vector
import pet_anim as A


def studio(res=(560, 440)):
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE'
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.image_settings.file_format = 'PNG'
    sc.render.film_transparent = False
    try:
        sc.eevee.taa_render_samples = 24
    except Exception:
        pass
    try:
        sc.view_settings.view_transform = 'Standard'
    except Exception:
        pass
    w = bpy.data.worlds.new('w')
    sc.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bg.inputs[0].default_value = (0.35, 0.4, 0.46, 1)
    bg.inputs[1].default_value = 0.6
    # chao
    bpy.ops.mesh.primitive_plane_add(size=6, location=(0, 0, -0.001))
    fl = bpy.context.object
    m = bpy.data.materials.new('floor')
    m.use_nodes = True
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.42, 0.40, 0.38, 1)
    m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.9
    fl.data.materials.append(m)
    for loc, en, col in (((1.6, -2.2, 2.6), 190, (1, 0.96, 0.9)), ((-2.2, 1.2, 1.6), 60, (0.85, 0.9, 1.0)), ((0.2, 2.5, 2.0), 50, (1, 1, 1))):
        bpy.ops.object.light_add(type='AREA', location=loc)
        lt = bpy.context.object
        lt.data.energy = en
        lt.data.size = 2.0
        lt.data.color = col
        d = Vector((0, 0, 0.18)) - lt.location
        lt.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


def cam_at(loc, target=(0, 0, 0.2), lens=65):
    if 'cam' not in bpy.data.objects:
        c = bpy.data.cameras.new('cam')
        o = bpy.data.objects.new('cam', c)
        bpy.context.collection.objects.link(o)
    o = bpy.data.objects['cam']
    o.data.lens = lens
    o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.camera = o
    return o


def shots(spec, mesh, arm, rig, outdir, poses):
    os.makedirs(outdir, exist_ok=True)
    arm.animation_data.use_nla = False
    studio()
    k = dict(spec.get('anim') or {})
    # drops iguais aos usados nos clipes
    import pet_lib as P
    for key, fn in (('_sit_drop', A.sit), ('_lie_drop', A.lie)):
        k[key] = 0.0
        rig.set_pose(fn(0.0, k))
        k[key] = -P.min_z(mesh)
    fns = {n: f for n, _, f in A.ACTIONS}
    views = {'q': (1.15, -1.55, 0.62), 's': (2.0, 0.05, 0.38), 'f': (0.2, -1.9, 0.42)}
    for token in poses.split(','):
        name, tt = token.split(':')
        rig.set_pose(fns[name](float(tt), k))
        for vk, loc in views.items():
            if vk != 'q' and name not in ('idle', 'sit'):
                continue
            cam_at(loc, (0, -0.02, 0.2))
            bpy.context.scene.render.filepath = os.path.join(outdir, f"{spec['id']}_{name}_{vk}.png")
            bpy.ops.render.render(write_still=True)
    rig.set_pose({})

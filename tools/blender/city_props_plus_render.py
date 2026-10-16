"""
Renders de preview dos props plus (EEVEE, AgX).  Uso:
  blender -b -P tools/blender/city_props_plus_render.py -- group <nome> a,b,c [--out PNG] [--w 1200 --h 800]
  blender -b -P ... -- lineup [--out PNG]
  blender -b -P ... -- vignette centro|avenida|jardim [--out PNG]
Os GLB sao lidos de public/assets/city/props_plus (e kit/ para cenarios de fundo).
"""
import bpy
import os
import sys
import json
import math
from math import pi, radians
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
PP = os.path.join(ROOT, "public", "assets", "city", "props_plus")
KIT = os.path.join(ROOT, "public", "assets", "city", "kit")
OUTDIR = "C:/Users/user/AppData/Local/Temp/claude/shots/props/"
os.makedirs(OUTDIR, exist_ok=True)
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def opt(name, default=None):
    return args[args.index(name) + 1] if name in args else default


def lin(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    c = [(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c]
    return (c[0], c[1], c[2], 1.0)


bpy.ops.wm.read_factory_settings(use_empty=True)
SC = bpy.context.scene
RW, RH = int(opt("--w", 1200)), int(opt("--h", 800))
SAMPLES = int(opt("--samples", 32))


def put(path, loc=(0, 0, 0), rz=0.0, scale=1.0):
    before = set(bpy.data.objects.keys())
    bpy.ops.import_scene.gltf(filepath=path)
    new = [bpy.data.objects[n] for n in bpy.data.objects.keys() if n not in before]
    e = bpy.data.objects.new("root", None)
    SC.collection.objects.link(e)
    for o in new:
        if o.parent is None:
            o.parent = e
    e.location = Vector(loc)
    e.rotation_euler = (0, 0, rz)
    e.scale = (scale,) * 3
    bpy.context.view_layer.update()
    return e, new


def prop(name, loc=(0, 0, 0), rz=0.0, scale=1.0):
    return put(os.path.join(PP, name + ".glb"), loc, rz, scale)


def kitp(name, loc=(0, 0, 0), rz=0.0, scale=1.0):
    return put(os.path.join(KIT, name + ".glb"), loc, rz, scale)


def has(name):
    return os.path.exists(os.path.join(PP, name + ".glb"))


def bounds(objs):
    mn = Vector((1e9,) * 3)
    mx = Vector((-1e9,) * 3)
    for o in objs:
        if o.type != "MESH":
            continue
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            mn = Vector((min(mn.x, w.x), min(mn.y, w.y), min(mn.z, w.z)))
            mx = Vector((max(mx.x, w.x), max(mx.y, w.y), max(mx.z, w.z)))
    return mn, mx


def mat(name, color, rough=0.1, coat=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = lin(color)
    b.inputs["Roughness"].default_value = rough
    try:
        b.inputs["Coat Weight"].default_value = coat
        b.inputs["Coat Roughness"].default_value = 0.03
    except Exception:
        pass
    return m


def plane(size, loc, m):
    bpy.ops.mesh.primitive_plane_add(size=size, location=loc)
    p = bpy.context.active_object
    p.data.materials.append(m)
    return p


def world(top="#a9b8ee", mid="#ffdcd0", hor="#fff0dc", strength=0.8):
    w = bpy.data.worlds.new("w")
    SC.world = w
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs[1].default_value = -0.15
    mr.inputs[2].default_value = 0.9
    cr = nt.nodes.new("ShaderNodeValToRGB")
    cr.color_ramp.elements[0].position = 0.0
    cr.color_ramp.elements[0].color = lin(hor)
    cr.color_ramp.elements[1].position = 1.0
    cr.color_ramp.elements[1].color = lin(top)
    e = cr.color_ramp.elements.new(0.45)
    e.color = lin(mid)
    bg = nt.nodes.new("ShaderNodeBackground")
    bg.inputs[1].default_value = strength
    out = nt.nodes.new("ShaderNodeOutputWorld")
    nt.links.new(tc.outputs["Object"], sep.inputs[0])
    nt.links.new(sep.outputs[2], mr.inputs[0])
    nt.links.new(mr.outputs[0], cr.inputs[0])
    nt.links.new(cr.outputs[0], bg.inputs[0])
    nt.links.new(bg.outputs[0], out.inputs[0])


def sun(rot, color, strength, angle=0.08):
    bpy.ops.object.light_add(type="SUN")
    s = bpy.context.active_object
    s.rotation_euler = rot
    s.data.color = lin(color)[:3]
    s.data.energy = strength
    s.data.angle = angle


def area(loc, target, color, power, size):
    bpy.ops.object.light_add(type="AREA", location=loc)
    a = bpy.context.active_object
    a.data.color = lin(color)[:3]
    a.data.energy = power
    a.data.size = size
    a.visible_camera = False
    a.visible_glossy = False
    d = Vector(target) - Vector(loc)
    a.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def camera(loc, target, lens=35):
    bpy.ops.object.camera_add(location=loc)
    c = bpy.context.active_object
    c.data.lens = lens
    c.data.sensor_width = 36
    d = Vector(target) - Vector(loc)
    c.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    SC.camera = c
    return c


def setup_render(path, exposure=-0.6, bloom=0.25):
    SC.render.engine = "BLENDER_EEVEE"
    SC.render.resolution_x, SC.render.resolution_y = RW, RH
    SC.render.resolution_percentage = 100
    SC.render.filepath = path
    SC.render.image_settings.file_format = "PNG"
    SC.view_settings.view_transform = "AgX"
    try:
        SC.view_settings.look = "AgX - Medium High Contrast"
    except Exception:
        pass
    SC.view_settings.exposure = exposure
    e = SC.eevee
    for k, v in (("taa_render_samples", SAMPLES), ("use_raytracing", True), ("use_shadows", True)):
        try:
            setattr(e, k, v)
        except Exception:
            pass
    try:
        e.ray_tracing_method = "SCREEN"
    except Exception:
        pass
    try:
        nt = bpy.data.node_groups.new("comp", "CompositorNodeTree")
        SC.compositing_node_group = nt
        nt.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
        rl = nt.nodes.new("CompositorNodeRLayers")
        gl = nt.nodes.new("CompositorNodeGlare")
        out = nt.nodes.new("NodeGroupOutput")
        for k, v in (("Type", "Bloom"), ("Quality", "High"), ("Threshold", 0.8), ("Strength", bloom), ("Size", 0.6), ("Smoothness", 0.5)):
            try:
                gl.inputs[k].default_value = v
            except Exception:
                pass
        nt.links.new(rl.outputs["Image"], gl.inputs["Image"])
        nt.links.new(gl.outputs["Image"], out.inputs[0])
    except Exception as ex:
        print("glare fail", ex)


def std_lights(target=(0, 0, 2)):
    sun((radians(58), radians(8), radians(-35)), "#ffd2a0", 4.0, 0.12)
    area((-14, -16, 12), target, "#ffe6dc", 3500, 12)
    area((18, 12, 9), target, "#d6ddff", 2500, 12)


def render(path=None):
    if path:
        SC.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("RENDERED", SC.render.filepath)


# ------------------------------------------------------------------------------------------------
def scene_group(names, out, pad=.9, floor="#f0dccf"):
    world()
    plane(200, (0, 0, 0), mat("floor", floor, 0.06))
    placed = []
    x = 0.0
    for n in names:
        e, objs = prop(n, (0, 0, 0))
        mn, mx = bounds(objs)
        w = mx.x - mn.x
        x += w / 2 + (pad if placed else 0)
        e.location = Vector((x - (mn.x + mx.x) / 2, -(mn.y + mx.y) / 2, 0))
        bpy.context.view_layer.update()
        placed.append((e, objs))
        x += w / 2
    cx = x / 2
    allobjs = []
    for e, objs in placed:
        e.location.x -= cx
        allobjs += objs
    bpy.context.view_layer.update()
    mn, mx = bounds(allobjs)
    span = max(mx.x - mn.x, (mx.z - mn.z) * 1.7, 3)
    dist = span * 0.95 + 2.5
    ctr = Vector((0, (mn.y + mx.y) / 2, mx.z * .42))
    d = Vector((-.5, -1.0, .36)).normalized() * dist
    camera(ctr + d, ctr, 36)
    std_lights()
    setup_render(out)
    render()


def scene_lineup(out):
    info = json.load(open(os.path.join(PP, "props_plus.json")))["pieces"]
    fam_order = {"centro": 0, "avenida": 1, "jardim": 2}
    names = sorted(info.keys(), key=lambda n: (fam_order.get(info[n]["family"], 3), n))
    world()
    plane(400, (0, 0, 0), mat("floor", "#f6ece4", 0.12))
    cols = 6
    rows = (len(names) + cols - 1) // cols
    gap = 6.4
    for i, n in enumerate(names):
        r, c = divmod(i, cols)
        e, objs = prop(n, (0, 0, 0))
        mn, mx = bounds(objs)
        s = min(1.0, 4.8 / max(mx.x - mn.x, mx.y - mn.y, 1))
        e.scale = (s,) * 3
        tx, ty = (c - (cols - 1) / 2) * gap, -r * gap * 1.25
        e.location = Vector((tx - (mn.x + mx.x) / 2 * s, ty - (mn.y + mx.y) / 2 * s, 0))
    bpy.context.view_layer.update()
    ctr = Vector((0, -(rows - 1) * gap * .5 * 1.25, 1.2))
    d = Vector((0, -math.cos(radians(36)), math.sin(radians(36))))
    c = camera(ctr + d * 60, ctr, 40)
    c.data.type = "ORTHO"
    c.data.ortho_scale = gap * cols * 0.98
    std_lights()
    setup_render(out)
    render()


def tile_floor(color_a, color_b, n=6, s=2.0):
    ma, mb = mat("ta", color_a, 0.08), mat("tb", color_b, 0.08)
    plane(s * n * 2, (0, 0, 0), ma)
    for ix in range(-n, n):
        for iy in range(-n, n):
            if (ix + iy) % 2 == 0:
                p = plane(s, (ix * s + s / 2, iy * s + s / 2, 0.003), mb)


def scene_vignette(kind, out):
    if kind == "centro":
        world("#8a6fd0", "#ff9cc2", "#ffc9a0")
        tile_floor("#f7d6e6", "#fbe6f0")
        for i, x in enumerate((-8, -4, 0, 4, 8)):
            kitp("wall_window" if i % 2 == 0 else "wall_door", (x, 11, 0), pi)
            kitp("wall_window", (x, 11, 4), pi)
            kitp("cornice_scallop", (x, 11, 8), pi)
        for n, loc, rz in (("photo_spot_frame", (-1.0, 4.5, 0), 0.0), ("magazine_kiosk", (-7.0, 7.0, 0), radians(-20)),
                           ("wayfinding_post", (3.6, 1.6, 0), radians(-25)), ("trash_bin_cute", (5.8, 2.6, 0), -.5),
                           ("mailbox_heart", (7.0, 5.5, 0), -.9), ("bike_rack", (-4.5, 0.6, 0), .1),
                           ("phone_booth_capsule", (6.2, 8.0, 0), -.4), ("vending_pod", (-9.5, 9.0, 0), .5),
                           ("bubble_car_parked", (0.8, 9.0, 0), .6)):
            if has(n):
                prop(n, loc, rz)
        cam = ((1.0, -6.0, 1.6), (-1.0, 6.0, 1.7), 24)
    elif kind == "avenida":
        world("#9db8e8", "#ffd9c8", "#ffe9d0")
        tile_floor("#efe6da", "#f8f1e6")
        for i, x in enumerate((-8, -4, 0, 4, 8)):
            kitp("wall_window", (x, 11, 0), pi)
            kitp("wall_window", (x, 11, 4), pi)
            kitp("cornice_scallop", (x, 11, 8), pi)
        for n, loc, rz in (("cafe_table_set", (-2.2, 4.0, 0), .3), ("mannequin_display", (3.6, 7.0, 0), radians(12)),
                           ("palm_planter_lux", (-6.5, 8, 0), 0), ("palm_planter_lux", (7.5, 4.0, 0), 1.0),
                           ("cafe_table_set", (1.0, 8.2, 0), -.6)):
            if has(n):
                prop(n, loc, rz)
        cam = ((0.5, -5.5, 1.6), (0.5, 6.0, 1.8), 26)
    else:
        world("#9ed0f0", "#ffe3d0", "#fff1d8")
        plane(300, (0, 0, 0), mat("grass", "#b9e0a8", 0.35, 0.0))
        p = plane(60, (0, 20, 0.004), mat("path", "#fff0e6", 0.12))
        p.scale = (.1, 1, 1)
        for n, loc, rz in (("rose_arch", (0, 7, 0), 0), ("flower_cart", (-3.5, 3.5, 0), .5), ("macaron_stand", (3.4, 4.5, 0), -.4),
                           ("birdcage_lamp", (-2.4, 10.0, 0), 0), ("birdcage_lamp", (2.4, 10.0, 0), 0), ("swan_boat", (7.5, 11.0, 0), .5)):
            if has(n):
                prop(n, loc, rz)
        for x in (-7, 7):
            kitp("hedge_heart", (x, 3, 0))
        if os.path.exists(os.path.join(KIT, "gazebo.glb")):
            kitp("gazebo", (-8.0, 15.0, 0), 0)
        cam = ((0.0, -3.5, 1.6), (0.0, 8.0, 1.8), 26)
    sun((radians(62), radians(0), radians(-40)), "#ffd2a0", 4.0, 0.1)
    area((-12, -14, 10), (0, 6, 2), "#ffc0d8", 3500, 12)
    area((14, 14, 8), (0, 6, 2), "#d0c0ff", 2500, 12)
    camera(cam[0], cam[1], cam[2])
    setup_render(out)
    render()


mode = args[0] if args else "lineup"
if mode == "group":
    scene_group(args[2].split(","), opt("--out", OUTDIR + "group_%s.png" % args[1]))
elif mode == "lineup":
    RW, RH = int(opt("--w", 2000)), int(opt("--h", 1200))
    scene_lineup(opt("--out", OUTDIR + "props_lineup.png"))
elif mode == "vignette":
    RW, RH = int(opt("--w", 1600)), int(opt("--h", 900))
    scene_vignette(args[1], opt("--out", OUTDIR + "vignette_%s.png" % args[1]))

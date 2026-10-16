"""
Renders do kit Y2K (EEVEE). Uso:
  blender -b -P tools/blender/city_kit_y2k_render.py -- progress "NN_nome:pecaA,pecaB;..." | mock [--tag vN]
"""
import bpy
import os
import sys
import math
from math import pi, radians
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import city_kit as ck  # noqa
import city_kit_y2k as y2  # noqa

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
MODE = args[0] if args else "mock"
OUTDIR = "C:/Users/user/AppData/Local/Temp/claude/shots/cityE1/"
TAG = "v1"
BLOOM = 0.35
for i, a in enumerate(args):
    if a == "--tag":
        TAG = args[i + 1]
os.makedirs(OUTDIR, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
KIT = y2.build_all()
for o in KIT.values():
    o.hide_render = True
    o.hide_viewport = True
SC = bpy.context.scene


def put(name, loc=(0, 0, 0), rz=0.0, scale=1.0, pal=None):
    o = KIT[name].copy()
    o.hide_render = False
    o.hide_viewport = False
    SC.collection.objects.link(o)
    o.location = Vector(loc)
    o.rotation_euler = (0, 0, rz)
    o.scale = (scale,) * 3
    if pal:
        y2.recolor(o, pal)
    return o


def floor_mat(color="#f4a8c9", rough=0.06, coat=1.0):
    m = ck.make_mat("floor_" + color, color, rough=rough, coat=coat, coat_rough=0.02, sheen=0.3)
    return m


def plane(size, loc, mat):
    bpy.ops.mesh.primitive_plane_add(size=size, location=loc)
    p = bpy.context.active_object
    p.data.materials.append(mat)
    return p


def world(top="#9d84dc", mid="#ff9cc2", hor="#ffbf8f", strength=0.85):
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
    cr.color_ramp.elements[0].color = ck.lin(hor)
    cr.color_ramp.elements[1].position = 1.0
    cr.color_ramp.elements[1].color = ck.lin(top)
    e = cr.color_ramp.elements.new(0.45)
    e.color = ck.lin(mid)
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
    s.data.color = ck.lin(color)[:3]
    s.data.energy = strength
    s.data.angle = angle
    return s


def area(loc, target, color, power, size):
    bpy.ops.object.light_add(type="AREA", location=loc)
    a = bpy.context.active_object
    a.data.color = ck.lin(color)[:3]
    a.data.energy = power
    a.data.size = size
    a.visible_camera = False
    a.visible_glossy = False
    d = Vector(target) - Vector(loc)
    a.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    return a


def camera(loc, target, lens=35):
    bpy.ops.object.camera_add(location=loc)
    c = bpy.context.active_object
    c.data.lens = lens
    c.data.sensor_width = 36
    d = Vector(target) - Vector(loc)
    c.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    SC.camera = c
    return c


def setup_render(w, h, path, samples=96):
    SC.render.engine = "BLENDER_EEVEE"
    SC.render.resolution_x, SC.render.resolution_y = w, h
    SC.render.resolution_percentage = 100
    SC.render.filepath = path
    SC.render.image_settings.file_format = "PNG"
    SC.view_settings.view_transform = "AgX"
    try:
        SC.view_settings.look = "AgX - Medium High Contrast"
    except Exception:
        pass
    SC.view_settings.exposure = -0.6
    e = SC.eevee
    for k, v in (("taa_render_samples", samples), ("use_raytracing", True), ("use_shadows", True),
                 ("use_gtao", True), ("use_bloom", True), ("gtao_distance", 1.0)):
        try:
            setattr(e, k, v)
        except Exception:
            pass
    try:
        e.ray_tracing_method = "SCREEN"
    except Exception:
        pass
    # bloom via compositor glare (Blender 5: node group compositor)
    try:
        nt = bpy.data.node_groups.new("comp", "CompositorNodeTree")
        SC.compositing_node_group = nt
        nt.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
        rl = nt.nodes.new("CompositorNodeRLayers")
        gl = nt.nodes.new("CompositorNodeGlare")
        out = nt.nodes.new("NodeGroupOutput")
        for k, v in (("Type", "Bloom"), ("Quality", "High")):
            try:
                gl.inputs[k].default_value = v
            except Exception as ex:
                print("glare", k, ex)
        for k, v in (("Threshold", 0.8), ("Strength", BLOOM), ("Size", 0.6), ("Smoothness", 0.5)):
            try:
                gl.inputs[k].default_value = v
            except Exception as ex:
                print("glare", k, ex)
        nt.links.new(rl.outputs["Image"], gl.inputs["Image"])
        nt.links.new(gl.outputs["Image"], out.inputs[0])
        print("compositor glare ok")
    except Exception as ex:
        print("glare setup fail", ex)


def render():
    bpy.ops.render.render(write_still=True)



def y2k_world():
    world("#5a6ee0", "#e78ad8", "#ffc4ea", 0.9)


def scene_progress(groups):
    y2k_world()
    plane(160, (0, 0, 0), floor_mat("#9c8ad6", 0.04))
    sun((radians(60), radians(0), radians(-45)), "#fff0e0", 3.0, 0.1)
    area((-8, -14, 9), (0, 0, 1.5), "#ffb0e0", 3000, 12)
    area((14, 10, 8), (0, 0, 2), "#a8c8ff", 2500, 10)
    setup_render(900, 700, OUTDIR + "x.png", samples=24)
    SC.view_settings.exposure = -0.2
    for g in groups.split(";"):
        label, names = g.split(":")
        names = names.split(",")
        placed = []
        x = 0.0
        pals = ["bubblegum", "lilac", "babyblue", "mint"]
        for k, n in enumerate(names):
            (x0, x1), (y0, y1), (z0, z1) = ck.bbox(KIT[n])
            lift = 0.0
            x += (x1 - x0) / 2 + 0.8
            placed.append(put(n, (x, 0, lift), pal=pals[k % 4] if len(names) > 1 else None))
            x += (x1 - x0) / 2
        cx = x / 2 + 0.4
        for o in placed:
            o.location.x -= cx
        h = max(ck.bbox(KIT[n])[2][1] for n in names) + 1
        dist = max(x * 1.1, h * 2.2, 6)
        cam = camera((-dist * .45, -dist * 1.0, h * .55 + 1.5), (0, 0, h * .38), 38)
        SC.render.filepath = OUTDIR + "progress_%s.png" % label
        render()
        for o in placed:
            bpy.data.objects.remove(o)
        bpy.data.objects.remove(cam)
        print("RENDERED", SC.render.filepath)


def scene_mock():
    y2k_world()
    plane(200, (0, 0, 0), floor_mat("#9c8ad6", 0.04))
    # paving
    for ix in range(-7, 7):
        for iy in range(-4, 6):
            put("paving_y2k", (ix * 2 + 1, iy * 2 + 1, 0.001), pal="lilac" if (ix + iy) % 3 else "bubblegum")
    # fundo: torres e fileira capsula
    put("building_bubble", (-12, 16, 0), pal="bubblegum")
    put("building_bubble", (13, 17, 0), pal="babyblue")
    put("building_capsule_row", (-3.5, 10.6, 0), pal="lilac")
    put("building_capsule_row", (5.5, 12.5, 0), pal="mint")
    put("storefront_glass", (-3.5, 8.9, 0), pal="lilac") if False else None
    put("plaza_centerpiece", (0, 2.5, 0), pal="bubblegum")
    put("kiosk_pod", (-9.5, 1.0, 0), pal="mint")
    put("canopy_curved", (9.0, 3.5, 0), pal="babyblue")
    put("holo_sign", (11.0, 8.0, 0), pal="babyblue", rz=-0.5)
    put("holo_sign", (-7.0, 7.0, 0), pal="lilac", rz=0.4)
    put("floating_platform", (-5.3, -1.0, 0), pal="bubblegum")
    for x, y in ((-6.5, 5.5), (5.5, 6.5), (-8.0, -1.0), (8.0, -0.5)):
        put("lamp_futuristic", (x, y, 0), rz=pi if x > 0 else 0, pal="bubblegum")
    put("bench_bubble", (-2.0, -0.2, 0), rz=0.0, pal="lilac")
    put("bench_bubble", (3.0, -0.1, 0), rz=0.0, pal="mint")
    put("planter_orb", (-0.2, -3.2, 0), pal="bubblegum")
    put("planter_orb", (2.2, -3.3, 0), pal="babyblue")
    put("planter_orb", (-4.0, 3.5, 0), pal="mint")
    put("neon_strip_curve", (3.2, 2.5, 0.0), pal="bubblegum")
    # boneca para escala
    try:
        bpy.ops.import_scene.gltf(filepath=os.path.join(ck.ROOT, "public", "assets", "characters", "doll_base.glb"))
        for o in bpy.context.selected_objects:
            if o.parent is None:
                o.location = (1.0, -4.2, 0)
                o.rotation_euler = (0, 0, 0)
    except Exception as ex:
        print("doll import fail", ex)
    sun((radians(65), radians(0), radians(-55)), "#fff0e0", 3.0, 0.1)
    area((-6, -20, 12), (0, 0, 2), "#ffc0ea", 4000, 16)
    area((22, -8, 8), (4, 6, 3), "#a8c8ff", 3000, 12)
    camera((-3.0, -9.5, 1.6), (1.0, 8.0, 3.2), 23)
    setup_render(1600, 900, OUTDIR + "kit_y2k_plaza_%s.png" % TAG)
    SC.view_settings.exposure = -0.2


if MODE == "progress":
    scene_progress(args[1])
else:
    scene_mock()
    render()
    print("RENDERED", SC.render.filepath)

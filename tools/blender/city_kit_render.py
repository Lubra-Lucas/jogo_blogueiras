"""
Style board do kit da cidade (EEVEE). Uso:
  blender -b -P tools/blender/city_kit_render.py -- lineup|street|fountain [--outdir DIR] [--tag v1]
"""
import bpy
import os
import sys
import math
from math import pi, radians
from mathutils import Vector, Euler

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import city_kit as ck  # noqa

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
MODE = args[0] if args else "lineup"
OUTDIR = "C:/Users/user/AppData/Local/Temp/claude/shots/cityE1/"
TAG = "v1"
BLOOM = 0.28
for i, a in enumerate(args):
    if a == "--outdir":
        OUTDIR = args[i + 1]
    if a == "--tag":
        TAG = args[i + 1]
os.makedirs(OUTDIR, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
KIT = ck.build_all()
for o in KIT.values():
    o.hide_render = True
    o.hide_viewport = True
SC = bpy.context.scene


def put(name, loc=(0, 0, 0), rz=0.0, scale=1.0):
    o = KIT[name].copy()
    o.hide_render = False
    o.hide_viewport = False
    SC.collection.objects.link(o)
    o.location = Vector(loc)
    o.rotation_euler = (0, 0, rz)
    o.scale = (scale,) * 3
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


# ------------------------------------------------------------------------------------------------
def scene_lineup():
    world()
    fm = floor_mat()
    plane(160, (0, 0, 0), fm)
    lift = {"awning_striped": 0.8, "sign_frame": 1.0}
    rows = [
        (6.5, -12.0, 4.6, ["wall_plain", "wall_window", "wall_door", "wall_corner", "column_rococo", "arch_gate"]),
        (0.5, -12.0, 4.6, ["cornice_scallop", "roof_dome_small", "awning_striped", "balcony_curved", "sign_frame"]),
        (-5.5, -12.0, 4.0, ["lamp_post", "bench_tufted", "planter_round", "hedge_heart", "fence_segment", "balloon_heart"]),
    ]
    for y, x0, dx, names in rows:
        for k, n in enumerate(names):
            put(n, (x0 + k * dx, y, lift.get(n, 0)))
    put("fountain_center", (17.0, 2.5, 0))
    for a in range(2):
        for b in range(2):
            put("paving_tile", (12.0 + 2 * a, -6.0 + 2 * b, 0))
    sun((radians(58), radians(8), radians(-35)), "#ffc890", 4.0, 0.12)
    area((-18, -16, 14), (0, 0, 2), "#ff9ccc", 4500, 14)
    area((22, 14, 10), (0, 0, 2), "#c9a6ff", 3000, 14)
    camera((-5, -30, 10), (0.0, 1.0, 1.6), 30)
    setup_render(1600, 900, OUTDIR + "kit_lineup_%s.png" % TAG)
    SC.view_settings.exposure = -0.2


def scene_street():
    world()
    fm = floor_mat("#f7c6d9", 0.08)
    road = plane(120, (0, 0, -0.02), floor_mat("#e58db8", 0.1))
    # calcada de paving_tile
    for ix in range(-8, 8):
        for iy in range(-3, 0):
            put("paving_tile", (ix * 2 + 1, iy * 2 + 1 - 0.0, 0.0))
    for ix in range(-8, 8):
        put("paving_tile", (ix * 2 + 1, -1 + 4 - 2 + 0.0 - 0.0, 0)) if False else None
    Y0 = 0.0

    def facade(xs, floors, x_offset=0.0, rz=0.0, origin=(0, 0)):
        pass

    # edificio 1 (x -14..-6) : 2 modulos
    def b(x, y, kind, z=0.0, rz=0.0):
        return put(kind, (x, y, z), rz)

    # fachada frontal (plano y = Y0, frente -Y)
    # predio A  x: -14..-6
    b(-12, Y0, "wall_window"); b(-8, Y0, "wall_door")
    b(-12, Y0, "wall_window", 4); b(-8, Y0, "wall_door", 4)
    b(-12, Y0, "awning_striped", 2.8); b(-8, Y0, "awning_striped", 2.95)
    b(-8, Y0, "balcony_curved", 4.0)
    b(-12, Y0, "cornice_scallop", 8); b(-8, Y0, "cornice_scallop", 8)
    b(-10, Y0 + 1.4, "roof_dome_small", 8.4)
    # predio B  x: -6..6
    b(-4, Y0, "wall_window"); b(0, Y0, "wall_plain"); b(4, Y0, "wall_window")
    b(-4, Y0, "wall_window", 4); b(0, Y0, "wall_door", 4); b(4, Y0, "wall_window", 4)
    b(-4, Y0, "awning_striped", 2.8); b(4, Y0, "awning_striped", 2.8)
    b(0, Y0, "sign_frame", 1.9)
    b(0, Y0, "balcony_curved", 4.0)
    for x in (-4, 0, 4):
        b(x, Y0, "cornice_scallop", 8)
    b(0, Y0 + 1.4, "roof_dome_small", 8.4)
    # colunas entre predios
    b(-6, Y0 + 0.0, "column_rococo", 0)
    # quina e lateral (frente +X)
    b(7.4, Y0 + 0.2, "wall_corner", 0)
    b(7.4, Y0 + 0.2, "wall_corner", 4)
    for i, y in enumerate((2.6, 6.6)):
        k = "wall_window" if i == 0 else "wall_door"
        b(8.0, y, k, 0, rz=pi / 2)
        b(8.0, y, "wall_window" if i == 0 else "wall_window", 4, rz=pi / 2)
        b(8.0, y, "cornice_scallop", 8, rz=pi / 2)
    b(8.0, 2.6, "awning_striped", 2.8, rz=pi / 2)
    b(8.0, 6.6, "awning_striped", 2.95, rz=pi / 2)
    # mobiliario
    for x in (-10, -2, 6):
        put("lamp_post", (x, -2.4, 0))
    put("bench_tufted", (-6.6, -1.7, 0)); put("bench_tufted", (2.4, -1.7, 0))
    for x in (-12, -8, 4, -4, 0):
        pass
    put("planter_round", (-10.2, -1.2, 0)); put("planter_round", (-5.8, -1.2, 0), scale=0.9)
    put("planter_round", (6.0, -1.2, 0))
    put("hedge_heart", (-2.6, -1.4, 0)); put("hedge_heart", (1.8, -1.4, 0), scale=0.9)
    put("balloon_heart", (-9.4, -2.5, 0)); put("balloon_heart", (-1.4, -2.7, 0), scale=1.0)
    put("balloon_heart", (6.8, -2.6, 0), scale=1.0)
    put("fence_segment", (-5.0, -3.9, 0)); put("fence_segment", (-3.0, -3.9, 0)); put("fence_segment", (-1.0, -3.9, 0))
    sun((radians(70), radians(0), radians(-60)), "#ffd0a0", 3.2, 0.1)
    area((-6, -18, 12), (0, 0, 2), "#ff9ccc", 2500, 14)
    area((18, -10, 8), (4, 2, 3), "#cdb0ff", 1800, 10)
    camera((6.5, -13.0, 1.6), (-3.0, 2.0, 3.4), 21)
    setup_render(1600, 900, OUTDIR + "kit_street_mock_%s.png" % TAG)


def put_pal(name, pal, loc, rz=0.0, scale=1.0):
    o = put(name, loc, rz, scale)
    ck.recolor(o, pal, pal)
    return o


def scene_palettes():
    world()
    plane(160, (0, 0, -0.02), floor_mat("#f1dcd8", 0.3, 0.6))
    for ix in range(-9, 9):
        for iy in range(-3, 0):
            put_pal("paving_tile", "casa" if ix % 2 else "casa", (ix * 2 + 1, iy * 2 + 1, 0.0))
    Y0 = 0.0
    # (paleta, x0 centro do 1o modulo, tem porta?) 5 predios de 2 modulos (8 m) + coluna entre eles
    blds = [("cafe", -16), ("salao", -8), ("boutique", 0), ("joalheria", 8), ("estudio", 16)]
    for pal, xc in blds:
        a, b = xc - 2, xc + 2
        door_first = pal in ("cafe", "joalheria")
        g1, g2 = ("wall_door", "wall_window") if door_first else ("wall_window", "wall_door")
        for z, w1, w2 in ((0, g1, g2), (4, "wall_window", "wall_window" if pal != "salao" else "wall_door")):
            put_pal(w1, pal, (a, Y0, z)); put_pal(w2, pal, (b, Y0, z))
        for x in (a, b):
            put_pal("cornice_scallop", pal, (x, Y0, 8))
        put_pal("awning_striped", pal, (a, Y0, 2.95 if door_first else 2.8))
        put_pal("awning_striped", pal, (b, Y0, 2.8 if door_first else 2.95))
        put_pal("roof_dome_small", pal, (xc, Y0 + 1.4, 8.4))
        put_pal("sign_frame", pal, (xc, Y0, 3.55), scale=0.55) if False else None
        put_pal("balcony_curved", pal, (b if not door_first else a, Y0, 4.0))
        put_pal("column_rococo", pal, (xc - 4, Y0, 0))
        put_pal("lamp_post", pal, (xc - 2, -2.6, 0))
        put_pal("planter_round", pal, (xc + 1.2, -1.3, 0))
        put_pal("hedge_heart", pal, (xc - 1.2, -1.4, 0), scale=0.9)
        put_pal("bench_tufted", pal, (xc + 0.0, -1.7, 0)) if pal in ("salao", "estudio") else None
        put_pal("balloon_heart", pal, (xc + 2.6, -2.6, 0))
    put_pal("column_rococo", "casa", (20, Y0, 0))
    sun((radians(70), radians(0), radians(-60)), "#ffd0a0", 3.2, 0.1)
    area((-6, -22, 12), (0, 0, 2), "#fff0e8", 5000, 16)
    area((22, -12, 8), (4, 2, 3), "#e6dcff", 2000, 12)
    camera((3.0, -27.5, 1.7), (2.0, 2.0, 4.0), 24).data.shift_y = 0.1
    setup_render(1600, 900, OUTDIR + "kit_street_palettes_%s.png" % TAG)
    SC.view_settings.exposure = -0.3


def scene_fountain():
    world()
    plane(120, (0, 0, 0), floor_mat("#fff3ea", 0.06))
    put("fountain_center", (0, 0, 0))
    for a in (30, 150, 270):
        r = 5.2
        put("bench_tufted", (r * math.cos(radians(a)), r * math.sin(radians(a)), 0), rz=radians(a) - pi / 2 + pi)
    for a in (90, 210, 330):
        r = 5.4
        put("lamp_post", (r * math.cos(radians(a)), r * math.sin(radians(a)), 0))
    for a in (-30, 100, 200):
        r = 4.3
        put("planter_round", (r * math.cos(radians(a)), r * math.sin(radians(a)), 0))
    sun((radians(70), radians(0), radians(-50)), "#ffd2a4", 4.5, 0.1)
    area((-8, -14, 9), (0, 0, 1.5), "#ff9ccc", 3000, 12)
    area((14, 10, 8), (0, 0, 2), "#cdb0ff", 2000, 10)
    camera((-3.6, -8.8, 2.6), (0, 0, 1.9), 32)
    setup_render(1200, 900, OUTDIR + "kit_fountain_%s.png" % TAG)


def scene_progress(groups):
    """groups: 'NN_nome:peca1,peca2;...' -> progress_NN_nome.png (preview rapido por peca/lote)"""
    world()
    plane(160, (0, 0, 0), floor_mat())
    sun((radians(60), radians(0), radians(-45)), "#ffd0a0", 3.2, 0.1)
    area((-8, -14, 9), (0, 0, 1.5), "#ff9ccc", 3000, 12)
    area((14, 10, 8), (0, 0, 2), "#cdb0ff", 2000, 10)
    setup_render(900, 700, OUTDIR + "x.png", samples=24)
    keep = set(bpy.data.objects.keys())
    for g in groups.split(";"):
        label, names = g.split(":")
        names = names.split(",")
        placed = []
        x = 0.0
        for n in names:
            (x0, x1), (y0, y1), (z0, z1) = ck.bbox(KIT[n])
            lift = {"awning_striped": 0.8, "sign_frame": 1.0}.get(n, 0)
            x += (x1 - x0) / 2 + 0.6
            placed.append(put(n, (x, 0, lift)))
            x += (x1 - x0) / 2
        cx = x / 2 + 0.3
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


if MODE == "progress":
    scene_progress(args[1])
    sys.exit(0)
{"palettes": scene_palettes, "lineup": scene_lineup, "street": scene_street, "fountain": scene_fountain}[MODE]()
render()
print("RENDERED", SC.render.filepath)

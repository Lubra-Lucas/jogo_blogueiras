"""blender -b -P tools/blender/interiors/render.py -- <room> vig|line [tag] [outdir]"""
import sys, os, importlib, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from math import radians, pi
from mathutils import Vector
import lib
from lib import ck
from palettes import PALS

args = sys.argv[sys.argv.index("--") + 1:]
ROOM, MODE = args[0], args[1]
TAG = args[2] if len(args) > 2 else "v1"
OUTDIR = args[3] if len(args) > 3 else "C:/Users/user/AppData/Local/Temp/claude/shots/interiors/"
os.makedirs(OUTDIR, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
mods = {"shared": importlib.import_module("r_shared")}
if ROOM != "shared":
    mods[ROOM] = importlib.import_module("r_" + ROOM)
importlib.import_module("r_more")  # pecas extras
SC = bpy.context.scene
lib.build_mats(PALS[ROOM])
BUILT = {}
ONLY = set(a for a in args[5:]) if len(args) > 5 else None
for rm in mods:
    for rec in lib.REG.get(rm, []):
        if MODE == "line" and rm != ROOM:
            continue
        if ONLY and rec["name"] not in ONLY and MODE == "line":
            continue
        lib.build_mats(PALS[rec["pal"] or ROOM])
        ob = lib.finish(rec["name"], rec["fn"](), rec["budget"])
        ob.hide_render = True
        ob.hide_viewport = True
        BUILT[rm + "/" + rec["name"]] = (ob, rec)
        BUILT.setdefault(rec["name"], (ob, rec))
lib.build_mats(PALS[ROOM])
# materiais das copias: ob.data.materials ja aponta para os materiais do momento da construcao; recolore para a paleta da sala
M = lib.M
for ob, rec in BUILT.values():
    for i, m in enumerate(ob.data.materials):
        if m and m.name.split(".")[0] in M:
            ob.data.materials[i] = M[m.name.split(".")[0]]


def put(name, x=0, y=0, rz=0, z=0, s=1.0, rx=0):
    ob = BUILT[name][0].copy()
    ob.hide_render = False
    ob.hide_viewport = False
    SC.collection.objects.link(ob)
    ob.location = Vector((x, y, z))
    ob.rotation_euler = (rx, 0, rz)
    ob.scale = (s,) * 3
    return ob


def world(col, st):
    w = bpy.data.worlds.new("w")
    SC.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    bg.inputs[0].default_value = lib.lin(col)
    bg.inputs[1].default_value = st


def area(loc, target, color, power, size, shape="SQUARE"):
    bpy.ops.object.light_add(type="AREA", location=loc)
    a = bpy.context.active_object
    a.data.shape = shape
    a.data.color = lib.lin(color)[:3]
    a.data.energy = power
    a.data.size = size
    a.visible_camera = False
    a.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return a


def point(loc, color, power, r=.1):
    bpy.ops.object.light_add(type="POINT", location=loc)
    a = bpy.context.active_object
    a.data.color = lib.lin(color)[:3]
    a.data.energy = power
    a.data.shadow_soft_size = r
    return a


def camera(loc, target, lens=28):
    bpy.ops.object.camera_add(location=loc)
    c = bpy.context.active_object
    c.data.lens = lens
    c.data.sensor_width = 36
    c.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    SC.camera = c


def setup_render(w, h, path, samples=64, exposure=0.0, bloom=0.25):
    SC.render.engine = "BLENDER_EEVEE"
    SC.render.resolution_x, SC.render.resolution_y = w, h
    SC.render.filepath = path
    SC.render.image_settings.file_format = "PNG"
    SC.view_settings.view_transform = "AgX"
    try:
        SC.view_settings.look = "AgX - Medium High Contrast"
    except Exception:
        pass
    SC.view_settings.exposure = exposure
    e = SC.eevee
    for k, v in (("taa_render_samples", samples), ("use_raytracing", True), ("use_shadows", True), ("use_gtao", True)):
        try:
            setattr(e, k, v)
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


def plane(size, loc, mat):
    bpy.ops.mesh.primitive_plane_add(size=size, location=loc)
    p = bpy.context.active_object
    p.data.materials.append(mat)
    return p


mod = mods.get(ROOM)
LIGHT = getattr(mod, "LIGHT", "#ffd9b8")
if MODE == "vig":
    world(*getattr(mod, "WORLD", ("#8d7b8c", 0.8)))
    mods[ROOM].VIG(put)
    cam = getattr(mod, "CAM", ((2.6, -5.2, 1.6), (-0.3, 0.6, 1.1), 26))
    camera(*cam)
    area((0.5, -0.5, 3.1), (0, 0.5, 0), LIGHT, 900, 2.5)
    area((-2.5, -3.5, 2.4), (0, 0, 1), "#ffd0e0", 350, 3)
    area((3.5, -4.5, 2.0), (0, 0, 1), "#fff0e0", 300, 3)
    point((0, 0.5, 1.2), LIGHT, 120, .3)
    setup_render(1400, 1000, OUTDIR + "%s_vig_%s.png" % (ROOM, TAG), exposure=getattr(mod, "EXPO", -0.45))
else:
    world("#8d7b8c", 1.0)
    fm = ck.make_mat("lineup_floor", "#9a8fa6", rough=.35, coat=.3, coat_rough=.1)
    names = [n for n in BUILT if n.startswith(ROOM + "/")]
    names = [n for n in names if not ONLY or n.split("/")[1] in ONLY]
    rows, cur, curw = [], [], 0
    LIM = 10.0
    for n in names:
        ob = BUILT[n][0]
        (x0, x1), (y0, y1), (z0, z1) = lib.bounds(ob)
        w = max(x1 - x0, 0.6)
        if curw + w > LIM and cur:
            rows.append((cur, curw)); cur, curw = [], 0
        cur.append((n, w, z1 - z0)); curw += w + .5
    rows.append((cur, curw))
    y = 0
    maxw = max(r[1] for r in rows)
    for items, cw in rows:
        x = -cw / 2
        depth = 0
        for n, w, h in items:
            ob = BUILT[n][0]
            rec = BUILT[n][1]
            (x0, x1), (y0, y1), (z0, z1) = lib.bounds(ob)
            z = 2.7 - z1 if rec["mount"] == "ceiling" else 0
            put(n, x + w / 2 - (x0 + x1) / 2 + (0 if True else 0), y, 0, z)
            x += w + .5
            depth = max(depth, y1 - y0)
        y += 3.2 + depth * .3
    nrows = len(rows)
    plane(80, (0, 0, -.001), fm)
    cx, cy = 0, (y - 3.2) / 2
    dist = max(maxw / 1.0, (y - 3.2) * 1.3 + 5)
    camera((cx, cy - dist, 1.6 + dist * .3), (cx, cy, 1.1), 32)
    area((0, cy - 3, 9), (0, cy, 0.5), "#fff0e8", 2500, 14)
    area((-10, cy - 8, 6), (0, cy, 1), "#ffd0e0", 1200, 10)
    area((10, cy - 8, 6), (0, cy, 1), "#d8e0ff", 1000, 10)
    setup_render(1800, 1000 if nrows < 3 else 1200, OUTDIR + "%s_line_%s.png" % (ROOM, TAG), exposure=0.0)
bpy.ops.render.render(write_still=True)
print("rendered")

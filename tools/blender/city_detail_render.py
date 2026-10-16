"""
Folha de preview (EEVEE, AgX) de QUALQUER peca da cidade, para comparar antes/depois dos detalhes.
Uso:
  blender -b --factory-startup -noaudio -P tools/blender/city_detail_render.py -- kit_y2k/bench_bubble,kit/gazebo,props_more/lake_pier --out PNG [--w 1600 --h 900 --cols 4 --cell 6 --k 1 --rot 35 --tz 1]
Os nomes sao caminhos relativos a public/assets/city (sem .glb). Aceita "lod/lod_x" tambem.
"""
import bpy
import os
import sys
import math
from math import radians
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
BASE = os.path.join(ROOT, "public", "assets", "city")
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def opt(n, d=None):
    return args[args.index(n) + 1] if n in args else d


names = args[0].split(",")
OUT = opt("--out", "C:/Users/user/AppData/Local/Temp/claude/shots/citydetail/sheet.png")
RW, RH = int(opt("--w", 1600)), int(opt("--h", 900))
COLS = int(opt("--cols", 4))
FLOOR = opt("--floor", "#a7a59b")
ROT = radians(float(opt("--rot", 35)))
os.makedirs(os.path.dirname(OUT), exist_ok=True)


def lin(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    c = [(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c]
    return (c[0], c[1], c[2], 1.0)


bpy.ops.wm.read_factory_settings(use_empty=True)
SC = bpy.context.scene
roots = []
sizes = []
for n in names:
    before = set(bpy.data.objects.keys())
    bpy.ops.import_scene.gltf(filepath=os.path.join(BASE, n + ".glb"))
    new = [bpy.data.objects[k] for k in bpy.data.objects.keys() if k not in before]
    e = bpy.data.objects.new("root_" + n, None)
    SC.collection.objects.link(e)
    for o in new:
        if o.parent is None:
            o.parent = e
    e.rotation_euler = (0, 0, ROT)
    bpy.context.view_layer.update()
    mn = Vector((1e9,) * 3)
    mx = Vector((-1e9,) * 3)
    for o in new:
        if o.type == "MESH":
            for c in o.bound_box:
                w = o.matrix_world @ Vector(c)
                mn = Vector((min(mn.x, w.x), min(mn.y, w.y), min(mn.z, w.z)))
                mx = Vector((max(mx.x, w.x), max(mx.y, w.y), max(mx.z, w.z)))
    roots.append(e)
    sizes.append(max(mx.x - mn.x, mx.y - mn.y, mx.z - mn.z * 0, 1.0))
cell = float(opt("--cell", max(sizes) * 1.15))
rows = math.ceil(len(roots) / COLS)
cols = min(COLS, len(roots))
for i, e in enumerate(roots):
    r, c = divmod(i, COLS)
    e.location = ((c - (cols - 1) / 2) * cell, -(r - (rows - 1) / 2) * cell, 0)

bpy.ops.mesh.primitive_plane_add(size=400)
pl = bpy.context.active_object
m = bpy.data.materials.new("floor")
m.use_nodes = True
b = m.node_tree.nodes["Principled BSDF"]
b.inputs["Base Color"].default_value = lin(FLOOR)
b.inputs["Roughness"].default_value = 0.55
pl.data.materials.append(m)

w = bpy.data.worlds.new("w")
SC.world = w
w.use_nodes = True
bg = w.node_tree.nodes["Background"]
bg.inputs[0].default_value = lin("#cfdbe8")
bg.inputs[1].default_value = 1.0

bpy.ops.object.light_add(type="SUN")
s = bpy.context.active_object
s.rotation_euler = (radians(55), radians(10), radians(-40))
s.data.energy = 4.5
s.data.angle = 0.1
s.data.color = lin("#fff1dc")[:3]

W = cell * cols
H = cell * rows
dist = (max(W * 0.95, H * 1.5) + 4) * float(opt("--k", 1))
tgt = Vector((0, 0, float(opt("--tz", 1.0))))
loc = Vector((0, -dist * 1.05, dist * 0.62))
bpy.ops.object.camera_add(location=loc)
cam = bpy.context.active_object
cam.data.lens = 40
cam.rotation_euler = (tgt - loc).to_track_quat("-Z", "Y").to_euler()
SC.camera = cam

SC.render.engine = "BLENDER_EEVEE"
SC.render.resolution_x, SC.render.resolution_y = RW, RH
SC.render.filepath = OUT
SC.view_settings.view_transform = "AgX"
try:
    SC.view_settings.look = "AgX - Medium High Contrast"
except Exception:
    pass
SC.view_settings.exposure = -0.3
try:
    SC.eevee.taa_render_samples = 24
    SC.eevee.use_raytracing = True
except Exception:
    pass
bpy.ops.render.render(write_still=True)
print("RENDERED", OUT)

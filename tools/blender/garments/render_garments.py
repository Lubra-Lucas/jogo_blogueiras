"""Renders de teste das pecas: boneca (meshyB_4.blend) + GLBs de public/assets/garments reimportados e religados ao esqueleto.
blender -b --factory-startup -noaudio --python render_garments.py -- spec.json
spec: {"tag": "x", "items":[{"id":"corset","pal":{"base":"#ff7aa8"}}], "shots":[{"name":"front","azim":0,"focus":[0,0,0.9],"dist":2.6,"lens":60,
        "pose":"rest|walk","morphs":{"bustBig":1},"w":700,"h":1000}], "hair":true, "garments_dir":"..."}"""
import bpy, sys, os, math, json
from mathutils import Vector, Matrix, Quaternion

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
OUT = r"C:\Users\user\AppData\Local\Temp\claude\shots\garments"
spec = json.load(open(sys.argv[sys.argv.index("--") + 1]))
OUT = spec.get("out", OUT)
gdir = spec.get("garments_dir", os.path.join(REPO, "public", "assets", "garments"))
os.makedirs(OUT, exist_ok=True)


def hexc(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c]
    return (*lin, 1)


bpy.ops.wm.open_mainfile(filepath=os.path.join(REPO, "tools", "blender", ".cache", "meshyB_4.blend"))
rig = bpy.data.objects["Armature"]; body = bpy.data.objects["body_lo"]; hair = bpy.data.objects["hair_lo"]
hair.hide_render = not spec.get("hair", True)
rig.hide_render = True
garms = []
for it in spec["items"]:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(gdir, it["id"] + ".glb"))
    new = [o for o in bpy.data.objects if o not in before]
    for o in new:
        if o.type == 'MESH':
            mw = o.matrix_world.copy()
            o.parent = rig; o.matrix_parent_inverse = Matrix.Identity(4); o.matrix_world = mw if False else Matrix.Identity(4)
            for m in o.modifiers:
                if m.type == 'ARMATURE': m.object = rig
            garms.append(o)
            for slot in o.material_slots:
                nm = slot.material.name.split('.')[0]
                if nm in it.get("pal", {}):
                    mt = slot.material; col = hexc(it["pal"][nm])
                    if mt.node_tree:
                        pb = [n for n in mt.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'][0]
                        lk = pb.inputs['Base Color'].links
                        if lk and lk[0].from_node.type in ('MIX', 'MIX_RGB'):
                            n = lk[0].from_node
                            for s in n.inputs:
                                if s.type == 'RGBA' and not s.links: s.default_value = col
                        elif not lk:
                            pb.inputs['Base Color'].default_value = col
                        else:
                            pass
    for o in new:
        if o.type != 'MESH': bpy.data.objects.remove(o, do_unlink=True)

sc = bpy.context.scene
for eid in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):
    try: sc.render.engine = eid; break
    except TypeError: continue
sc.view_settings.view_transform = 'AgX'
try: sc.view_settings.look = 'AgX - Punchy'
except Exception: pass
sc.view_settings.exposure = spec.get('exposure', -0.4)
sc.render.film_transparent = False
wd = bpy.data.worlds.new("W"); sc.world = wd; wd.use_nodes = True
bg = wd.node_tree.nodes['Background']; bg.inputs[0].default_value = tuple(spec.get("bg", (0.93, 0.80, 0.90))) + (1,); bg.inputs[1].default_value = 1.1
cam_d = bpy.data.cameras.new("cam"); cam = bpy.data.objects.new("cam", cam_d); sc.collection.objects.link(cam); sc.camera = cam
ct = bpy.data.objects.new("ct", None); sc.collection.objects.link(ct)
tc = cam.constraints.new('TRACK_TO'); tc.target = ct; tc.track_axis = 'TRACK_NEGATIVE_Z'; tc.up_axis = 'UP_Y'
for name, off, e, s in (("key", (1.5, 1.0, 0.5), 450, 3), ("fill", (-2.0, 0.3, 0.0), 200, 4), ("rim", (0.0, 2.0, 2.0), 250, 3)):
    d = bpy.data.lights.new(name, 'AREA'); d.energy = e; d.size = s
    o = bpy.data.objects.new(name, d); sc.collection.objects.link(o); o.parent = cam; o.location = off


def rot_world(pb, axis, deg):
    """rotate pose bone about an armature-space axis"""
    R = Quaternion(axis, math.radians(deg)).to_matrix()
    B = pb.bone.matrix_local.to_3x3()
    L = B.inverted() @ R @ B
    pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = L.to_quaternion()


def set_pose(name):
    for pb in rig.pose.bones:
        pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
    P = rig.pose.bones
    if name == "walk":
        X = (1, 0, 0)
        rot_world(P["mixamorig:LeftUpLeg"], X, -30); rot_world(P["mixamorig:LeftLeg"], X, 12)
        rot_world(P["mixamorig:RightUpLeg"], X, 22); rot_world(P["mixamorig:RightLeg"], X, 38)
        rot_world(P["mixamorig:LeftArm"], X, 20); rot_world(P["mixamorig:RightArm"], X, -20)
    elif name == "sit":
        X = (1, 0, 0)
        for s in "LeftRight".replace("Right", " Right").split():
            rot_world(P[f"mixamorig:{s}UpLeg"], X, -80); rot_world(P[f"mixamorig:{s}Leg"], X, 80)
    bpy.context.view_layer.update()


def set_morphs(m):
    for ob in [body] + garms:
        sk = ob.data.shape_keys
        if not sk: continue
        for kb in sk.key_blocks:
            if kb.name != 'Basis': kb.value = m.get(kb.name, 0.0)


for sh in spec["shots"]:
    set_pose(sh.get("pose", "rest")); set_morphs(sh.get("morphs", {}))
    sc.render.resolution_x, sc.render.resolution_y = sh.get("w", 700), sh.get("h", 1000)
    cam_d.lens = sh.get("lens", 60); f = sh["focus"]; ct.location = f
    a = math.radians(sh.get("azim", 0)); dist = sh["dist"]
    cam.location = (f[0] + dist * math.sin(a), f[1] - dist * math.cos(a), f[2] + dist * sh.get("elev", 0.03))
    bpy.context.view_layer.update()
    sc.render.filepath = os.path.join(OUT, f"{spec['tag']}_{sh['name']}.png")
    bpy.ops.render.render(write_still=True)
    print("RENDERED", sc.render.filepath, flush=True)

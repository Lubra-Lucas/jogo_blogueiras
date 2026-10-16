"""Renderiza muitas roupas num so processo (poses walk + desfile) para contact sheets.
blender -b --factory-startup -noaudio --python render_all.py -- outdir id1 id2 ...   (gera outdir/<id>_walk.png e <id>_desf.png; opcional env MORPHS='{"bustBig":1}')"""
import bpy, sys, os, math, json
from mathutils import Matrix, Quaternion

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
args = sys.argv[sys.argv.index("--") + 1:]
OUT = args[0]; ids = args[1:]
os.makedirs(OUT, exist_ok=True)
gdir = os.path.join(REPO, "public", "assets", "garments")
morphs = json.loads(os.environ.get("MORPHS", "{}"))
bpy.ops.wm.open_mainfile(filepath=os.path.join(REPO, "tools", "blender", ".cache", "meshyB_4.blend"))
rig = bpy.data.objects["Armature"]; body = bpy.data.objects["body_lo"]; hair = bpy.data.objects["hair_lo"]
rig.hide_render = True
sc = bpy.context.scene
for eid in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):
    try: sc.render.engine = eid; break
    except TypeError: continue
sc.view_settings.view_transform = 'AgX'
try: sc.view_settings.look = 'AgX - Punchy'
except Exception: pass
sc.view_settings.exposure = -0.2
wd = bpy.data.worlds.new("W"); sc.world = wd; wd.use_nodes = True
bg = wd.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.62, 0.62, 0.64, 1); bg.inputs[1].default_value = 1.1
cam_d = bpy.data.cameras.new("cam"); cam = bpy.data.objects.new("cam", cam_d); sc.collection.objects.link(cam); sc.camera = cam
ct = bpy.data.objects.new("ct", None); sc.collection.objects.link(ct)
tc = cam.constraints.new('TRACK_TO'); tc.target = ct; tc.track_axis = 'TRACK_NEGATIVE_Z'; tc.up_axis = 'UP_Y'
for name, off, e, s in (("key", (1.5, 1.0, 0.5), 450, 3), ("fill", (-2.0, 0.3, 0.0), 200, 4), ("rim", (0.0, 2.0, 2.0), 250, 3)):
    d = bpy.data.lights.new(name, 'AREA'); d.energy = e; d.size = s
    o = bpy.data.objects.new(name, d); sc.collection.objects.link(o); o.parent = cam; o.location = off


def rot_world(pb, axis, deg):
    R = Quaternion(axis, math.radians(deg)).to_matrix(); B = pb.bone.matrix_local.to_3x3()
    pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (B.inverted() @ R @ B).to_quaternion()


def set_pose(name):
    for pb in rig.pose.bones:
        pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
    P = rig.pose.bones; X = (1, 0, 0); Z = (0, 0, 1)
    if name == "walk":
        rot_world(P["mixamorig:LeftUpLeg"], X, -30); rot_world(P["mixamorig:LeftLeg"], X, 12)
        rot_world(P["mixamorig:RightUpLeg"], X, 22); rot_world(P["mixamorig:RightLeg"], X, 38)
        rot_world(P["mixamorig:LeftArm"], X, 20); rot_world(P["mixamorig:RightArm"], X, -20)
    elif name == "desfile":
        rot_world(P["mixamorig:Hips"], Z, 10); rot_world(P["mixamorig:Spine1"], Z, -12)
        rot_world(P["mixamorig:LeftUpLeg"], X, -24); rot_world(P["mixamorig:LeftUpLeg"], Z, 8)
        rot_world(P["mixamorig:RightUpLeg"], X, 16); rot_world(P["mixamorig:RightLeg"], X, 20)
        rot_world(P["mixamorig:LeftArm"], X, 25); rot_world(P["mixamorig:RightArm"], X, -25); rot_world(P["mixamorig:RightForeArm"], X, -35)
    bpy.context.view_layer.update()


def shot(path, azim, pose, ob, focus=(0, 0, 0.78), dist=3.2):
    set_pose(pose)
    for o in (body, ob):
        sk = o.data.shape_keys
        if sk:
            for kb in sk.key_blocks:
                if kb.name != 'Basis': kb.value = morphs.get(kb.name, 0.0)
    sc.render.resolution_x, sc.render.resolution_y = 300, 480
    cam_d.lens = 60; ct.location = focus
    a = math.radians(azim)
    cam.location = (focus[0] + dist * math.sin(a), focus[1] - dist * math.cos(a), focus[2] + dist * 0.03)
    bpy.context.view_layer.update()
    sc.render.filepath = path; bpy.ops.render.render(write_still=True)


hair.hide_render = bool(os.environ.get('NOHAIR', '1') == '1')
try: sc.eevee.taa_render_samples = 10
except Exception: pass
for gid in ids:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(gdir, gid + ".glb"))
    new = [o for o in bpy.data.objects if o not in before]
    meshes = []
    for o in new:
        if o.type == 'MESH':
            o.parent = rig; o.matrix_parent_inverse = Matrix.Identity(4); o.matrix_world = Matrix.Identity(4)
            for m in o.modifiers:
                if m.type == 'ARMATURE': m.object = rig
            meshes.append(o)
    for o in new:
        if o.type != 'MESH': bpy.data.objects.remove(o, do_unlink=True)
    g = max(meshes, key=lambda o: len(o.data.vertices))
    shot(os.path.join(OUT, gid + "_walk.png"), 38, "walk", g)
    if os.environ.get("DESF"): shot(os.path.join(OUT, gid + "_desf.png"), -25, "desfile", g)
    for o in meshes: bpy.data.objects.remove(o, do_unlink=True)
    print("RENDERED", gid, flush=True)

"""Inspect + preview-render a GLB.
Usage: blender -b --factory-startup -noaudio --python inspect_model.py -- <glb> <outdir>
"""
import bpy, bmesh, sys, os, math
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
glb, outdir = argv[0], argv[1]
os.makedirs(outdir, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb)

print("=== OBJECTS ===")
for o in bpy.data.objects:
    print(f"  {o.type:10s} {o.name!r} parent={o.parent.name if o.parent else None} "
          f"loc={tuple(round(v, 3) for v in o.location)} "
          f"rot={tuple(round(math.degrees(v), 1) for v in o.rotation_euler)} "
          f"scale={tuple(round(v, 3) for v in o.scale)}")
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
print("meshes:", len(meshes), "-> single merged mesh" if len(meshes) == 1 else "-> separate parts")
print("armatures:", [o.name for o in bpy.data.objects if o.type == 'ARMATURE'])

allv = []
for o in meshes:
    me = o.data
    me.calc_loop_triangles()
    bm = bmesh.new()
    bm.from_mesh(me)
    nm = sum(1 for e in bm.edges if not e.is_manifold)
    bnd = sum(1 for e in bm.edges if e.is_boundary)
    seen = set()
    sizes = []
    for v in bm.verts:
        if v.index in seen:
            continue
        stack = [v]
        seen.add(v.index)
        n = 0
        while stack:
            c = stack.pop()
            n += 1
            for e in c.link_edges:
                w = e.other_vert(c)
                if w.index not in seen:
                    seen.add(w.index)
                    stack.append(w)
        sizes.append(n)
    sizes.sort(reverse=True)
    print(f"--- mesh {o.name}: verts={len(me.vertices)} tris={len(me.loop_triangles)} edges={len(me.edges)} "
          f"nonmanifold_edges={nm} boundary_edges={bnd} loose_parts={len(sizes)} largest_part_verts={sizes[:8]}")
    print(f"    uv_maps={[u.name for u in me.uv_layers]} "
          f"shape_keys={[k.name for k in me.shape_keys.key_blocks] if me.shape_keys else None} "
          f"vgroups={len(o.vertex_groups)} modifiers={[m.type for m in o.modifiers]} "
          f"color_attrs={[a.name for a in me.color_attributes]}")
    mw = o.matrix_world
    allv += [mw @ v.co for v in me.vertices]
    bm.free()

mn = Vector((min(v.x for v in allv), min(v.y for v in allv), min(v.z for v in allv)))
mx = Vector((max(v.x for v in allv), max(v.y for v in allv), max(v.z for v in allv)))
dim = mx - mn
H = dim.z
cx = (mn.x + mx.x) / 2
print("=== BBOX (Blender Z-up world; glTF Y-up is converted on import) ===")
print("min", tuple(round(v, 3) for v in mn), "max", tuple(round(v, 3) for v in mx))
print(f"height (Z) = {H:.3f} m | width X = {dim.x:.3f} | depth Y = {dim.y:.3f}")

print("=== POSE / ARM ESTIMATE ===")
for frac in [0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.3, 0.2, 0.1]:
    z = mn.z + frac * H
    sl = [v for v in allv if abs(v.z - z) < H * 0.01]
    if sl:
        print(f"  z={frac:.2f}H x-range [{min(v.x for v in sl) - cx:+.3f}, {max(v.x for v in sl) - cx:+.3f}] "
              f"y-range [{min(v.y for v in sl):+.3f},{max(v.y for v in sl):+.3f}] n={len(sl)}")
far = sorted(allv, key=lambda v: -abs(v.x - cx))[:30]
fx = sum(abs(v.x - cx) for v in far) / len(far)
fz = sum(v.z for v in far) / len(far)
shoulder_x, shoulder_z = 0.13 * H, mn.z + 0.78 * H
ang = math.degrees(math.atan2(fx - shoulder_x, shoulder_z - fz))
print(f"  hand tip approx |x|={fx:.3f} m, height={(fz - mn.z) / H:.2f}H")
print(f"  approx arm angle from vertical (shoulder->hand tip) = {ang:.1f} deg (relaxed ~0-10, A-pose ~30-45, T-pose ~90)")

print("=== MATERIALS / TEXTURES ===")
for m in bpy.data.materials:
    print(f"  material {m.name!r} users={m.users}")
    if m.use_nodes:
        for n in m.node_tree.nodes:
            if n.type == 'BSDF_PRINCIPLED':
                for k in ['Base Color', 'Metallic', 'Roughness', 'Normal', 'Emission Color', 'Alpha']:
                    s = n.inputs.get(k)
                    if s is None:
                        continue
                    if s.is_linked:
                        print(f"     {k}: linked from {s.links[0].from_node.name} ({s.links[0].from_node.type})")
                    else:
                        dv = s.default_value
                        print(f"     {k}: value={tuple(round(x, 3) for x in dv) if hasattr(dv, '__len__') else round(dv, 3)}")
            if n.type == 'TEX_IMAGE' and n.image:
                print(f"     image {n.image.name!r} {n.image.size[0]}x{n.image.size[1]} colorspace={n.image.colorspace_settings.name}")
print("images:", [(i.name, tuple(i.size)) for i in bpy.data.images])

# ---------------- render ----------------
sc = bpy.context.scene
for eid in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):
    try:
        sc.render.engine = eid
        break
    except TypeError:
        continue
print("render engine:", sc.render.engine)
sc.render.resolution_x, sc.render.resolution_y = 900, 1100
sc.view_settings.view_transform = 'AgX'
w = bpy.data.worlds.new("W")
sc.world = w
w.use_nodes = True
bg = w.node_tree.nodes['Background']
bg.inputs[0].default_value = (0.6, 0.6, 0.62, 1)
bg.inputs[1].default_value = 1.0

cam_d = bpy.data.cameras.new("cam")
cam = bpy.data.objects.new("cam", cam_d)
sc.collection.objects.link(cam)
sc.camera = cam
ct = bpy.data.objects.new("ct", None)
sc.collection.objects.link(ct)
tc = cam.constraints.new('TRACK_TO')
tc.target = ct
tc.track_axis = 'TRACK_NEGATIVE_Z'
tc.up_axis = 'UP_Y'


def mk(name, off, e, s):
    d = bpy.data.lights.new(name, 'AREA')
    d.energy = e
    d.size = s
    o = bpy.data.objects.new(name, d)
    sc.collection.objects.link(o)
    o.parent = cam
    o.location = off  # camera-local: lights follow the camera, aim along cam -Z
    return o


mk("key", (1.5, 1.0, 0.5), 400, 3)
mk("fill", (-2.0, 0.3, 0.0), 150, 4)
mk("rim", (0.0, 2.0, 2.0), 200, 3)

# model faces glTF +Z == Blender -Y. Camera at -Y looks at the front.
head_v = [v for v in allv if v.z > mn.z + 0.85 * H]
ycen = sum(v.y for v in head_v) / len(head_v)
print(f"head y-range [{min(v.y for v in head_v):.3f},{max(v.y for v in head_v):.3f}] (front assumed -Y)")


def shot(name, azim_deg, focus, dist, lens):
    cam_d.lens = lens
    ct.location = focus
    a = math.radians(azim_deg)
    cam.location = (focus.x + dist * math.sin(a), focus.y - dist * math.cos(a), focus.z + dist * 0.03)
    bpy.context.view_layer.update()
    sc.render.filepath = os.path.join(outdir, name)
    bpy.ops.render.render(write_still=True)
    print("rendered", sc.render.filepath)


# sensor fit AUTO -> horizontal fov on the wider side; for portrait it is vertical.
# vertical visible extent = dist * 36/lens (sensor 36 applied to larger dim = height)
body_c = Vector((cx, (mn.y + mx.y) / 2, mn.z + H * 0.5))
lens_b = 60
dist_full = (H * 1.12) * lens_b / 36.0
for n, a in [("front", 0), ("back", 180), ("side", 90), ("three_quarter", 35)]:
    shot(f"meshy_{n}.png", a, body_c, dist_full, lens_b)
face_c = Vector((cx, ycen, mn.z + 0.835 * H))
lens_f = 85
dist_face = (H * 0.17) * lens_f / 36.0
shot("meshy_face_front.png", 0, face_c, dist_face, lens_f)
shot("meshy_face_34.png", 35, face_c, dist_face, lens_f)

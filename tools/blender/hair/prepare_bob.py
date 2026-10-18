"""Bob ruivo com franja (Meshy, textura propria) -> public/assets/characters/hair_bobAuburn.glb
  python tools/blender/hair/bob_tex.py            (1x: textura de luminancia 1024 em tools/blender/.cache)
  blender -b --factory-startup -noaudio --python tools/blender/hair/prepare_bob.py -- [key=value ...]
  blender ... tools/blender/hair_fitbake.py -- hair_bobAuburn   (empurra para fora da cabeca/ombros + morphs do corpo)
  blender ... tools/blender/jewelry/hair_fit.py                 (hairFit.lift de tiaras/lacos)
Passos: escala/posicao na cabeca da doll_layers (largura 1.3x a cabeca, topo +1.2 cm), decimacao para ~TRIS, tampa
de couro cabeludo (fecha o furo da risca), pesos Head->Neck, textura de luminancia, export.
key=value: capf=0.02 (quanto da tampa vai a frente do topo) tris=8700 width=0.30 top=1.612 dy=-0.013 dz=0 pitch=0 cap=1 capr=0.075 lift=0.009
"""
import bpy, bmesh, sys, os, math
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
CACHE = os.path.join(HERE, "..", ".cache")
PUB = os.path.join(REPO, "public", "assets", "characters")
SRC = os.path.join(HERE, "src", "bob_ruivo_meshy.glb")
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OPT = dict(a.split("=", 1) for a in argv if "=" in a)
TRIS = int(OPT.get("tris", 8700)); WIDTH = float(OPT.get("width", 0.30)); TOP = float(OPT.get("top", 1.612))
DY = float(OPT.get("dy", -0.013)); DZ = float(OPT.get("dz", 0.0)); PITCH = math.radians(float(OPT.get("pitch", 0)))
HID = "bobAuburn"


def log(*a): print("[bob]", *a, flush=True)


def arr(coll, attr, dim):
    a = np.empty(len(coll) * dim, np.float64); coll.foreach_get(attr, a); return a.reshape(len(coll), dim)


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(PUB, "doll_layers.glb"))
body = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith("Doll")][0]
rig = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
for o in list(bpy.data.objects):
    if o.type == 'MESH' and o is not body: bpy.data.objects.remove(o)

bpy.ops.import_scene.gltf(filepath=SRC)
hair = [o for o in bpy.data.objects if o.name.startswith("output_unwrapped")][0]
me = hair.data
P = arr(me.vertices, 'co', 3)
# ---- escala/posicao: largura = WIDTH, topo = TOP, centro x=0, y = DY
s = WIDTH / (P[:, 0].max() - P[:, 0].min())
cx = (P[:, 0].max() + P[:, 0].min()) / 2; cy = (P[:, 1].max() + P[:, 1].min()) / 2
Q = (P - np.array([cx, cy, 0.0])) * s
if PITCH:
    c, sn = math.cos(PITCH), math.sin(PITCH); R = np.array([[1, 0, 0], [0, c, -sn], [0, sn, c]]); Q = Q @ R.T
Q[:, 2] += TOP - Q[:, 2].max() + DZ; Q[:, 1] += DY
me.vertices.foreach_set('co', Q.astype(np.float32).ravel()); me.update()
log("scale", round(s, 4), "bbox", Q.min(0).round(3), Q.max(0).round(3))

# ---- solda vertices coincidentes (o Meshy exporta quase tudo solto; as UV ficam nos cantos, entao o exporter so
# volta a dividir nas costuras reais): menos vertices = GLB menor e decimacao melhor
bm = bmesh.new(); bm.from_mesh(me); nv0 = len(bm.verts)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=float(OPT.get("weld", 1e-5))); bm.to_mesh(me); bm.free(); me.update()
log("weld verts", nv0, "->", len(me.vertices))

# ---- decimacao (UV preservado)
tri0 = len(me.polygons)
md = hair.modifiers.new("dec", 'DECIMATE'); md.decimate_type = 'COLLAPSE'; md.ratio = min(1.0, TRIS / tri0)
bpy.context.view_layer.objects.active = hair; bpy.ops.object.modifier_apply(modifier="dec")
me = hair.data
log("tris", tri0, "->", len(me.polygons))


def smooth_normals(me):
    me.calc_loop_triangles()
    co = arr(me.vertices, 'co', 3); tv = np.empty(len(me.loop_triangles) * 3, np.int64); me.loop_triangles.foreach_get('vertices', tv); tv = tv.reshape(-1, 3)
    fn = np.cross(co[tv[:, 1]] - co[tv[:, 0]], co[tv[:, 2]] - co[tv[:, 0]]); acc = np.zeros((len(co), 3))
    for k in range(3): np.add.at(acc, tv[:, k], fn)
    nrm = acc / np.maximum(np.linalg.norm(acc, axis=1), 1e-12)[:, None]
    for p in me.polygons: p.use_smooth = True
    me.normals_split_custom_set_from_vertices(nrm.tolist())


# ---- tampa do couro cabeludo: fecha o furo da risca (cupula LIFT acima do cranio, UV = raiz escura do cabelo)
if OPT.get("cap", "1") == "1":
    co = arr(me.vertices, 'co', 3)
    top_i = np.argsort(-co[:, 2])[:40]; ctr = co[top_i][:, :2].mean(0)
    uvd = arr(me.uv_layers[0].data, 'uv', 2)
    lv = np.empty(len(me.loops), np.int64); me.loops.foreach_get('vertex_index', lv)
    uv_root = uvd[np.isin(lv, top_i)].mean(0)
    CAPR = float(OPT.get("capr", 0.075)); LIFT = float(OPT.get("lift", 0.009)); CAPF = float(OPT.get("capf", 0.02))
    bm = bmesh.new(); bm.from_mesh(body.data); bm.verts.ensure_lookup_table(); bm.normal_update()
    keep = {v.index for v in bm.verts if v.co.z > 1.5 and v.co.y > ctr[1] - CAPF and math.hypot(v.co.x - ctr[0], v.co.y - ctr[1]) < CAPR}
    for f in list(bm.faces):
        if not all(v.index in keep for v in f.verts): bm.faces.remove(f)
    for v in list(bm.verts):
        if not v.link_faces: bm.verts.remove(v)
    for v in bm.verts: v.co = v.co + v.normal * LIFT
    cm = bpy.data.meshes.new("cap"); bm.to_mesh(cm); bm.free()
    cm.materials.clear()
    for ul in list(cm.uv_layers): cm.uv_layers.remove(ul)
    uvc = cm.uv_layers.new(name=me.uv_layers[0].name)
    for l in uvc.data: l.uv = uv_root
    cap = bpy.data.objects.new("cap", cm); bpy.context.scene.collection.objects.link(cap)
    log("cap tris", len(cm.polygons), "center", ctr.round(3), "uv", uv_root.round(3))
    dm = cap.modifiers.new("dec", 'DECIMATE'); dm.ratio = float(OPT.get("capratio", 0.2))
    bpy.context.view_layer.objects.active = cap; bpy.ops.object.modifier_apply(modifier="dec")
    log("cap tris after decimate", len(cap.data.polygons))
    for o in bpy.context.selected_objects: o.select_set(False)
    hair.select_set(True); cap.select_set(True); bpy.context.view_layer.objects.active = hair
    bpy.ops.object.join()
    hair = bpy.context.view_layer.objects.active; me = hair.data

smooth_normals(me)
hair.name = f"Hair_{HID}"; me.name = f"Hair_{HID}"
me.materials.clear()
mt = bpy.data.materials.new(f"hair_{HID}"); mt.use_nodes = True
bs = mt.node_tree.nodes['Principled BSDF']; bs.inputs['Roughness'].default_value = 0.4; bs.inputs['Metallic'].default_value = 0.0
img = bpy.data.images.load(os.path.join(CACHE, "bob_lum.jpg")); img.name = "hair_bobAuburn_basecolor"; img.pack()
tx = mt.node_tree.nodes.new('ShaderNodeTexImage'); tx.image = img
mt.node_tree.links.new(tx.outputs['Color'], bs.inputs['Base Color'])
mt.use_backface_culling = False
me.materials.append(mt)

# ---- pesos: Head acima de 1.30, mistura ate Neck em 1.19 (hair_fitbake refina)
CHAIN = [(1.30, "mixamorig:Head"), (1.19, "mixamorig:Neck"), (1.12, "mixamorig:Spine2")]
for c in list(rig.children):
    if c.type == 'MESH': bpy.data.objects.remove(c, do_unlink=True)
co = arr(me.vertices, 'co', 3); z = co[:, 2]; n = len(co)
zs = np.array([c[0] for c in CHAIN]); W = np.zeros((n, len(CHAIN)))
for i in range(n):
    if z[i] >= zs[0]: W[i, 0] = 1
    elif z[i] <= zs[-1]: W[i, -1] = 1
    else:
        k = int(np.searchsorted(-zs, -z[i], side='right')) - 1; f = (zs[k] - z[i]) / (zs[k] - zs[k + 1]); f = f * f * (3 - 2 * f)
        W[i, k] = 1 - f; W[i, k + 1] = f
for k, (_, nm) in enumerate(CHAIN):
    vg = hair.vertex_groups.new(name=nm)
    for i in np.where(W[:, k] > 1e-3)[0]: vg.add([int(i)], float(W[i, k]), 'REPLACE')
hair.parent = rig; hair.parent_type = 'OBJECT'
am = hair.modifiers.new("Armature", 'ARMATURE'); am.object = rig
hair.shape_key_add(name="Basis", from_mix=False)   # hair_fitbake exige shape keys (e o exporter so grava chaves nao nulas)
_k = hair.shape_key_add(name="faceThin", from_mix=False)
_c = arr(me.vertices, 'co', 3); _c[:, 0] *= 0.999; _k.data.foreach_set('co', _c.astype(np.float32).ravel())

for o in bpy.data.objects: o.select_set(False)
hair.select_set(True); rig.select_set(True); bpy.context.view_layer.objects.active = rig
path = os.path.join(PUB, f"hair_{HID}.glb")
bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format='GLB', export_yup=True, export_apply=False,
                          export_image_format='JPEG', export_jpeg_quality=82, export_materials='EXPORT', export_normals=True,
                          export_skins=True, export_def_bones=False, export_animations=False, export_morph=True,
                          export_morph_normal=False, export_try_sparse_sk=True, export_cameras=False, export_lights=False)
log("exported", os.path.getsize(path) // 1024, "KB", len(me.polygons), "tris")

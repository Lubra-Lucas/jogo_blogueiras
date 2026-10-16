"""Shared helpers for the jewelry collection (Blender 5.2, run with -b)."""
import bpy, bmesh, os, math, json
import numpy as np
from mathutils import Vector, Matrix, Euler

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
DOLL = os.path.join(REPO, "public", "assets", "characters", "doll_base.glb")
OUT = os.path.join(REPO, "public", "assets", "jewelry")
SHOTS = r"C:\Users\user\AppData\Local\Temp\claude\shots\jewelry"
os.makedirs(OUT, exist_ok=True); os.makedirs(SHOTS, exist_ok=True)


def hexc(h, a=1.0):
    h = h.lstrip('#'); r, g, b = [int(h[i:i+2], 16)/255 for i in (0, 2, 4)]
    f = lambda c: c/12.92 if c <= 0.04045 else ((c+0.055)/1.055)**2.4
    return (f(r), f(g), f(b), a)


METALS = {"gold": "#f2c14e", "rosegold": "#e8a090", "silver": "#d9dde6", "chrome": "#f4f6fb"}
SLOTS = ("metal", "gem", "pearl", "ribbon")


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


# ---- materials -----------------------------------------------------------
def _principled(name):
    m = bpy.data.materials.new(name); m.use_nodes = True
    return m, m.node_tree.nodes["Principled BSDF"]


def mat_metal(name="metal", color="#f2c14e", rough=0.14):
    m, b = _principled(name)
    b.inputs["Base Color"].default_value = hexc(color)
    b.inputs["Metallic"].default_value = 1.0
    b.inputs["Roughness"].default_value = rough
    return m


def mat_gem(name="gem", color="#ff7fc0"):
    m, b = _principled(name)
    b.inputs["Base Color"].default_value = hexc(color)
    b.inputs["Roughness"].default_value = 0.03
    b.inputs["IOR"].default_value = 2.2
    b.inputs["Transmission Weight"].default_value = 0.85
    b.inputs["Coat Weight"].default_value = 1.0
    b.inputs["Emission Color"].default_value = hexc(color)
    b.inputs["Emission Strength"].default_value = 0.25
    return m


def mat_pearl(name="pearl", color="#fdf3ee"):
    m, b = _principled(name)
    b.inputs["Base Color"].default_value = hexc(color)
    b.inputs["Roughness"].default_value = 0.2
    b.inputs["Coat Weight"].default_value = 1.0
    b.inputs["Coat Roughness"].default_value = 0.05
    b.inputs["Sheen Weight"].default_value = 1.0
    b.inputs["Sheen Tint"].default_value = hexc("#ffc8e6")
    return m


def mat_ribbon(name="ribbon", color="#ff5fa8"):
    m, b = _principled(name)
    b.inputs["Base Color"].default_value = hexc(color)
    b.inputs["Roughness"].default_value = 0.38
    b.inputs["Sheen Weight"].default_value = 1.0
    b.inputs["Sheen Roughness"].default_value = 0.3
    return m


def make_mats(metal="gold", gem="#ff7fc0", pearl="#fdf3ee", ribbon="#ff5fa8"):
    return {"metal": mat_metal("metal", METALS[metal]), "gem": mat_gem("gem", gem),
            "pearl": mat_pearl("pearl", pearl), "ribbon": mat_ribbon("ribbon", ribbon)}


# ---- geometry builders (all work on a bmesh) ------------------------------
def sphere(bm, c, r, seg=10, rings=6, scale=(1, 1, 1)):
    M = Matrix.Translation(Vector(c)) @ Matrix.Diagonal((scale[0]*r, scale[1]*r, scale[2]*r, 1))
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=1.0, matrix=M)


def _frames(pts, closed):
    """parallel-transport frames (no twist flips). returns list of (nx, ny)"""
    n = len(pts); out = []
    nx = None
    for i in range(n):
        if closed: t = (pts[(i+1) % n] - pts[(i-1) % n]).normalized()
        else: t = (pts[min(i+1, n-1)] - pts[max(i-1, 0)]).normalized()
        if nx is None:
            ref = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
            nx = t.cross(ref).normalized()
        else:
            nx = (nx - t*nx.dot(t))
            nx = nx.normalized() if nx.length > 1e-9 else t.cross(Vector((0, 0, 1))).normalized()
        out.append((nx, t.cross(nx).normalized()))
    return out


def tube_open(bm, pts, r, rseg=6, radii=None):
    """swept tube along an open polyline (list of Vector). Returns rings."""
    n = len(pts); rings = []
    fr = _frames(pts, False)
    for i, p in enumerate(pts):
        nx, ny = fr[i]; rr = radii[i] if radii else r
        rings.append([bm.verts.new(p + (nx*math.cos(2*math.pi*k/rseg) + ny*math.sin(2*math.pi*k/rseg))*rr) for k in range(rseg)])
    for i in range(n-1):
        for k in range(rseg):
            bm.faces.new((rings[i][k], rings[i][(k+1) % rseg], rings[i+1][(k+1) % rseg], rings[i+1][k]))
    for ring in (rings[0], rings[-1]):
        bm.faces.new(ring)
    return rings


def tube_closed(bm, pts, r, rseg=6):
    n = len(pts); rings = []
    fr = _frames(pts, True)
    for i, p in enumerate(pts):
        nx, ny = fr[i]
        rings.append([bm.verts.new(p + (nx*math.cos(2*math.pi*k/rseg) + ny*math.sin(2*math.pi*k/rseg))*r) for k in range(rseg)])
    for i in range(n):
        for k in range(rseg):
            bm.faces.new((rings[i][k], rings[i][(k+1) % rseg], rings[(i+1) % n][(k+1) % rseg], rings[(i+1) % n][k]))


def gem_cut(bm, c, r, h=None, sides=8, up=Vector((0, 0, 1))):
    """faceted brilliant (table, crown, girdle, pavilion tip). local +Z -> up."""
    h = h or r*0.9
    q = Vector((0, 0, 1)).rotation_difference(Vector(up).normalized()).to_matrix().to_4x4()
    M = Matrix.Translation(Vector(c)) @ q
    V = lambda x, y, z: bm.verts.new(M @ Vector((x, y, z)))
    top = [V(r*0.55*math.cos(2*math.pi*i/sides), r*0.55*math.sin(2*math.pi*i/sides), h*0.35) for i in range(sides)]
    gird = [V(r*math.cos(2*math.pi*i/sides), r*math.sin(2*math.pi*i/sides), 0) for i in range(sides)]
    tip = V(0, 0, -h*0.65)
    bm.faces.new(top)
    for i in range(sides):
        j = (i+1) % sides
        bm.faces.new((top[j], top[i], gird[i], gird[j]))
        bm.faces.new((gird[j], gird[i], tip))


def heart_pts(n=22, s=1.0):
    pts = []
    for i in range(n):
        t = 2*math.pi*i/n
        x = 16*math.sin(t)**3
        y = 13*math.cos(t) - 5*math.cos(2*t) - 2*math.cos(3*t) - math.cos(4*t)
        pts.append((x/17*s, y/17*s))
    return pts


def heart_solid(bm, c, s, depth, n=22, M=None):
    """puffy heart in local XZ plane (y = thickness axis). M optional extra matrix (4x4) about c."""
    c = Vector(c)
    pts = heart_pts(n, s)
    MM = Matrix.Translation(c) @ (M if M is not None else Matrix.Identity(4))
    P = lambda x, z, y: bm.verts.new(MM @ Vector((x, y, z)))
    cen = P(0, 0.05*s, -depth/2); cenb = P(0, 0.05*s, depth/2)
    mid = [P(x, y, 0) for x, y in pts]
    fr = [P(x*0.6, (y-0.05*s)*0.6+0.05*s, -depth*0.45) for x, y in pts]
    bk = [P(x*0.6, (y-0.05*s)*0.6+0.05*s, depth*0.45) for x, y in pts]
    for i in range(n):
        j = (i+1) % n
        bm.faces.new((mid[j], mid[i], fr[i], fr[j]))
        bm.faces.new((mid[i], mid[j], bk[j], bk[i]))
        bm.faces.new((fr[i], fr[j], cen)[::-1])
        bm.faces.new((bk[i], bk[j], cenb))


def star_solid(bm, c, R, r, depth, pts=5, M=None):
    c = Vector(c)
    MM = Matrix.Translation(c) @ (M if M is not None else Matrix.Identity(4))
    n = pts*2
    ring = []
    for i in range(n):
        a = math.pi/2 + math.pi*i/pts
        rr = R if i % 2 == 0 else r
        ring.append((rr*math.cos(a), rr*math.sin(a)))
    f = bm.verts.new(MM @ Vector((0, -depth/2, 0))); b = bm.verts.new(MM @ Vector((0, depth/2, 0)))
    mid = [bm.verts.new(MM @ Vector((x, 0, y))) for x, y in ring]
    for i in range(n):
        j = (i+1) % n
        bm.faces.new((mid[j], mid[i], f)); bm.faces.new((mid[i], mid[j], b))


def xf(bm, M):
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts)


def mirror_x_copy(bm):
    """returns a new bmesh = bm mirrored in X (faces re-wound)"""
    b2 = bm.copy()
    bmesh.ops.transform(b2, matrix=Matrix.Diagonal((-1, 1, 1, 1)), verts=b2.verts)
    bmesh.ops.reverse_faces(b2, faces=b2.faces[:])
    return b2


class Piece:
    """Collects bmeshes per slot and makes one mesh object."""
    def __init__(self, name):
        self.name = name; self.b = {s: bmesh.new() for s in SLOTS}

    def __getitem__(self, s): return self.b[s]

    def build(self, mats):
        slots = [s for s in SLOTS if len(self.b[s].faces)]
        bm = bmesh.new()
        for idx, s in enumerate(slots):
            tmp = bpy.data.meshes.new("t"); self.b[s].to_mesh(tmp)
            n0 = len(bm.faces); bm.from_mesh(tmp); bpy.data.meshes.remove(tmp)
            for f in bm.faces[n0:]: f.material_index = idx
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        me = bpy.data.meshes.new(self.name); bm.to_mesh(me); bm.free()
        ob = bpy.data.objects.new(self.name, me); bpy.context.scene.collection.objects.link(ob)
        for s in slots: me.materials.append(mats[s])
        for p in me.polygons: p.use_smooth = True
        self.slots = slots
        return ob


def tri_count(ob):
    me = ob.data; me.calc_loop_triangles(); return len(me.loop_triangles)


def export_glb(ob, path):
    for o in bpy.context.selected_objects: o.select_set(False)
    ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True,
                              export_apply=True, export_yup=True, export_materials='EXPORT',
                              export_cameras=False, export_lights=False)
    return os.path.getsize(path)


# ---- doll / render -------------------------------------------------------
def load_doll(morph=None, skin=True):
    bpy.ops.import_scene.gltf(filepath=DOLL)
    body = bpy.data.objects['DollBody']
    for o in list(bpy.data.objects):
        if o.name.startswith('Icosphere'): bpy.data.objects.remove(o)
    if morph:
        for k, v in morph.items(): body.data.shape_keys.key_blocks[k].value = v
    return body


def setup_render(w=1000, h=1200, samples=48):
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE'
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.image_settings.file_format = 'PNG'
    try: sc.eevee.taa_render_samples = samples
    except Exception: pass
    sc.view_settings.view_transform = 'AgX'
    try: sc.view_settings.look = 'AgX - Medium High Contrast'
    except Exception: pass
    w_ = bpy.data.worlds.new("W"); sc.world = w_; w_.use_nodes = True
    bg = w_.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.93, 0.78, 0.85, 1); bg.inputs[1].default_value = 1.2

    def area(name, loc, energy, size, color=(1, 1, 1), tgt=(0, 0, 1.3)):
        d = bpy.data.lights.new(name, 'AREA'); d.energy = energy; d.size = size; d.color = color
        o = bpy.data.objects.new(name, d); bpy.context.scene.collection.objects.link(o)
        o.location = loc
        o.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    area("key", (-1.2, -2.0, 2.2), 420, 2.5, (1, 0.96, 0.95))
    area("fill", (1.8, -1.6, 1.4), 160, 3.0, (1, 0.88, 0.95))
    area("rim", (0.5, 1.8, 2.0), 260, 1.5, (0.9, 0.92, 1))
    for i, loc in enumerate([(-0.5, -0.9, 1.8), (0.6, -0.8, 1.6), (0.0, -1.1, 1.0)]):
        d = bpy.data.lights.new("sp%d" % i, 'POINT'); d.energy = 40; d.shadow_soft_size = 0.01
        o = bpy.data.objects.new("sp%d" % i, d); bpy.context.scene.collection.objects.link(o); o.location = loc


def camera(loc, target, lens=85):
    d = bpy.data.cameras.new("cam"); d.lens = lens
    o = bpy.data.objects.new("cam", d); bpy.context.scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.camera = o; return o


def render(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return path


# ---- bone rest transforms straight from the GLB (glTF space, Y-up, +Z front) ----
def glb_nodes(path=DOLL):
    import struct
    with open(path, 'rb') as f:
        f.read(12); ln, _ = struct.unpack('<II', f.read(8)); js = json.loads(f.read(ln))
    return js['nodes']


def bone_world_gltf(name, nodes=None):
    """4x4 world rest matrix (mathutils) of node `name` (accepts 'mixamorig:X' or 'mixamorigX')."""
    nodes = nodes or glb_nodes()
    alt = name.replace(':', '')
    idx = {n.get('name'): i for i, n in enumerate(nodes)}
    i = idx.get(name, idx.get(alt))
    parent = {c: p for p, n in enumerate(nodes) for c in n.get('children', [])}
    chain = []
    while i is not None: chain.append(i); i = parent.get(i)
    M = Matrix.Identity(4)
    for k in reversed(chain):
        n = nodes[k]
        if 'matrix' in n:
            T = Matrix([n['matrix'][r::4] for r in range(4)])
        else:
            t = Vector(n.get('translation', (0, 0, 0)))
            from mathutils import Quaternion
            q = n.get('rotation', (0, 0, 0, 1)); q = Quaternion((q[3], q[0], q[1], q[2]))
            s = n.get('scale', (1, 1, 1))
            T = Matrix.Translation(t) @ q.to_matrix().to_4x4() @ Matrix.Diagonal((s[0], s[1], s[2], 1))
        M = M @ T
    return M


def b2g(v):  # blender world -> glTF world
    return Vector((v[0], v[2], -v[1]))


def b2g_m(R):  # 3x3 blender rotation -> glTF rotation
    C = Matrix(((1, 0, 0), (0, 0, 1), (0, -1, 0)))
    return C @ R @ C.transposed()


def attach_local(bone, P_blender, R_blender=None):
    """offset (pos, quat xyzw, scale) of an anchor at world P (blender) with orientation R (3x3, blender world)
    relative to bone rest. Returns dict."""
    R = R_blender if R_blender is not None else Matrix.Identity(3)
    W = Matrix.Translation(b2g(P_blender)) @ b2g_m(R).to_4x4()
    L = bone_world_gltf(bone).inverted() @ W
    t, q, s = L.decompose()
    return {"bone": bone, "position": [round(x, 5) for x in t], "quaternion": [round(q.x, 5), round(q.y, 5), round(q.z, 5), round(q.w, 5)],
            "scale": [round(x, 4) for x in s]}

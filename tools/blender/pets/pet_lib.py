"""Biblioteca de modelagem procedural dos pets (gatos e cachorros) — "vinil brilhante".

Tudo e feito em Python puro (listas de vertices) e entregue ao Blender no fim:
  - `sweep()`  : tubo com secao elipsoidal que segue um caminho (corpo, pernas, cauda, orelhas, focinho)
  - `ellipsoid()` : esfera achatada (cabeca, olhos, nariz, tufos de pelo)
  - cada peca recebe um material por NOME de slot (coat, coat2, coat3, belly, nose, eye, iris, ...);
    o jogo recolore por slot (cores de pelagem em public/assets/pets/pets.json).
Eixos do Blender: o pet olha para -Y (vira +Z no glTF), X e lateral, Z e para cima.
"""
import math
import bpy
import bmesh
from mathutils import Vector, Matrix, noise


# ---------------------------------------------------------------- pecas

class Parts:
    def __init__(self):
        self.verts = []   # Vector
        self.us = []      # parametro ao longo da peca (0..1) ou None
        self.weights = []  # dict bone -> w
        self.faces = []   # tuple de indices
        self.mats = []    # nome do slot por face

    def add(self, verts, us, faces, mat, wfn, face_us=None):
        base = len(self.verts)
        for v, u in zip(verts, us):
            self.verts.append(v)
            self.us.append(u)
            self.weights.append(wfn(v, u) if callable(wfn) else {wfn: 1.0})
        for fi, f in enumerate(faces):
            self.faces.append(tuple(base + i for i in f))
            c = sum((verts[i] for i in f), Vector()) / len(f)
            u = face_us[fi] if face_us else None
            self.mats.append(mat(c, u) if callable(mat) else mat)


def smooth(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def band(c, joints, bones, blend):
    """Pesos em cadeia: `joints` em ordem de c DECRESCENTE (use sinal para inverter). len(bones) = len(joints)+1."""
    s = [smooth((j + blend - c) / (2 * blend)) for j in joints]
    out = {}
    prev = 1.0
    for i, b in enumerate(bones):
        nxt = s[i] if i < len(s) else 0.0
        w = prev - nxt
        if w > 1e-4:
            out[b] = w
        prev = nxt
    return out


def sweep(parts, path, rx, rz, mat, wfn, segs=12, cap0=True, cap1=True, ref=(0, 0, 1), capk=0.55, ud=None):
    """Tubo ao longo de `path` (lista de Vector). rx/rz: raios (lista ou numero). Secao: rx ao longo de `s`, rz ao longo de `u`."""
    n = len(path)
    rx = rx if isinstance(rx, (list, tuple)) else [rx] * n
    rz = rz if isinstance(rz, (list, tuple)) else [rz] * n
    refv = Vector(ref)
    rings = []   # (center, s, u, rx, rz, uparam)
    for i, p in enumerate(path):
        t = (path[min(i + 1, n - 1)] - path[max(i - 1, 0)]).normalized()
        r = refv if abs(t.dot(refv)) < 0.9 else Vector((1, 0, 0))
        s = t.cross(r).normalized()
        u = s.cross(t).normalized()
        rings.append((p, s, u, rx[i], rz[i], i / max(1, n - 1)))
    full = []
    if cap0:
        p, s, u, a, b, _ = rings[0]
        t = (path[0] - path[1]).normalized()
        k = max(a, b)
        full.append((p + t * k * capk * 1.0, s, u, 0.0, 0.0, 0.0))
        full.append((p + t * k * capk * 0.62, s, u, a * 0.62, b * 0.62, 0.0))
    for r in rings:
        full.append(r)
    if cap1:
        p, s, u, a, b, _ = rings[-1]
        t = (path[-1] - path[-2]).normalized()
        k = max(a, b)
        full.append((p + t * k * capk * 0.62, s, u, a * 0.62, b * 0.62, 1.0))
        full.append((p + t * k * capk * 1.0, s, u, 0.0, 0.0, 1.0))
    verts, us, faces, fus = [], [], [], []
    idx = []
    for (p, s, u, a, b, up) in full:
        row = []
        if a == 0.0 and b == 0.0:
            verts.append(p)
            us.append(up)
            row = [len(verts) - 1] * segs
        else:
            for k in range(segs):
                ang = 2 * math.pi * k / segs
                verts.append(p + s * (math.cos(ang) * a) + u * (math.sin(ang) * b))
                us.append(up)
                row.append(len(verts) - 1)
        idx.append(row)
    for i in range(len(idx) - 1):
        for k in range(segs):
            a0, a1 = idx[i][k], idx[i][(k + 1) % segs]
            b0, b1 = idx[i + 1][k], idx[i + 1][(k + 1) % segs]
            if a0 == a1:
                f = (a0, b1, b0)
            elif b0 == b1:
                f = (a0, a1, b0)
            else:
                f = (a0, a1, b1, b0)
            faces.append(f)
            fus.append((us[a0] + us[b0]) / 2)
    parts.add(verts, us, faces, mat, wfn, fus)


def ellipsoid(parts, c, r, mat, wfn, rot=(0, 0, 0), segs=12, rings=8):
    """Elipsoide centrado em c com semi-eixos r=(x,y,z) e rotacao euler (graus)."""
    m = Matrix.Rotation(math.radians(rot[2]), 3, 'Z') @ Matrix.Rotation(math.radians(rot[1]), 3, 'Y') @ Matrix.Rotation(math.radians(rot[0]), 3, 'X')
    verts, us, faces = [], [], []
    verts.append(Vector(c) + m @ Vector((0, 0, r[2])))
    us.append(0.0)
    for j in range(1, rings):
        th = math.pi * j / rings
        for k in range(segs):
            ph = 2 * math.pi * k / segs
            v = Vector((math.sin(th) * math.cos(ph) * r[0], math.sin(th) * math.sin(ph) * r[1], math.cos(th) * r[2]))
            verts.append(Vector(c) + m @ v)
            us.append(j / rings)
    verts.append(Vector(c) + m @ Vector((0, 0, -r[2])))
    us.append(1.0)
    top, bot = 0, len(verts) - 1
    for k in range(segs):
        faces.append((top, 1 + (k + 1) % segs, 1 + k))
    for j in range(rings - 2):
        for k in range(segs):
            a = 1 + j * segs + k
            b = 1 + j * segs + (k + 1) % segs
            faces.append((a, b, b + segs, a + segs))
    last = 1 + (rings - 2) * segs
    for k in range(segs):
        faces.append((last + k, last + (k + 1) % segs, bot))
    parts.add(verts, us, faces, mat, wfn)


# ---------------------------------------------------------------- cena

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def rgb(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c]
    return (lin[0], lin[1], lin[2], 1.0)


MAT_STYLE = {
    # slot: (rough, sheen, coat, metal, emissive)
    'coat': (0.52, 0.5, 0.25), 'coat2': (0.52, 0.5, 0.25), 'coat3': (0.52, 0.5, 0.25), 'belly': (0.52, 0.5, 0.25),
    'nose': (0.28, 0.0, 0.6), 'eye': (0.08, 0.0, 1.0), 'iris': (0.15, 0.0, 1.0), 'pupil': (0.1, 0.0, 1.0),
    'glint': (0.2, 0.0, 0.0), 'inner': (0.6, 0.0, 0.0), 'tongue': (0.45, 0.0, 0.3), 'dark': (0.4, 0.0, 0.0),
}


def make_material(name, color):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    st = MAT_STYLE.get(name, (0.5, 0.0, 0.0))
    bsdf.inputs['Base Color'].default_value = rgb(color)
    bsdf.inputs['Roughness'].default_value = st[0]
    if 'Sheen Weight' in bsdf.inputs:
        bsdf.inputs['Sheen Weight'].default_value = st[1]
        bsdf.inputs['Sheen Roughness'].default_value = 0.5
    if 'Coat Weight' in bsdf.inputs:
        bsdf.inputs['Coat Weight'].default_value = st[2]
        bsdf.inputs['Coat Roughness'].default_value = 0.25
    if name == 'glint':
        bsdf.inputs['Emission Color'].default_value = (1, 1, 1, 1)
        bsdf.inputs['Emission Strength'].default_value = 1.0
    m.diffuse_color = rgb(color)
    return m


def build_mesh(parts, colors, name='pet'):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([tuple(v) for v in parts.verts], [], parts.faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    used = []
    for m in parts.mats:
        if m not in used:
            used.append(m)
    order = ['coat', 'coat2', 'coat3', 'belly', 'nose', 'eye', 'iris', 'pupil', 'glint', 'inner', 'tongue', 'dark']
    used.sort(key=lambda s: order.index(s) if s in order else 99)
    for m in used:
        mesh.materials.append(make_material(m, colors.get(m, '#808080')))
    for p, m in zip(mesh.polygons, parts.mats):
        p.material_index = used.index(m)
        p.use_smooth = True
    # normais para fora
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    # grupos de vertices
    for i, w in enumerate(parts.weights):
        top = sorted(w.items(), key=lambda kv: -kv[1])[:4]
        tot = sum(v for _, v in top) or 1.0
        for b, val in top:
            if val / tot < 0.02:
                continue
            vg = obj.vertex_groups.get(b) or obj.vertex_groups.new(name=b)
            vg.add([i], val / tot, 'REPLACE')
    return obj


def make_armature(bones):
    """bones: lista de (nome, head, tail, pai). Retorna o objeto armature."""
    arm = bpy.data.armatures.new('PetArmature')
    obj = bpy.data.objects.new('PetArmature', arm)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    eb = {}
    for name, head, tail, parent in bones:
        b = arm.edit_bones.new(name)
        b.head = Vector(head)
        b.tail = Vector(tail)
        if (b.tail - b.head).length < 0.005:
            b.tail = b.head + Vector((0, 0, 0.01))
        eb[name] = b
        if parent:
            b.parent = eb[parent]
    bpy.ops.object.mode_set(mode='OBJECT')
    return obj


# ---------------------------------------------------------------- animacao

class Rig:
    def __init__(self, arm_obj):
        self.arm = arm_obj
        self.R = {b.name: b.matrix_local.to_3x3() for b in arm_obj.data.bones}
        for pb in arm_obj.pose.bones:
            pb.rotation_mode = 'QUATERNION'

    def set_pose(self, pose):
        """pose: nome -> dict(p, y, r, loc). p = pitch (positivo = frente/cima), y = giro (Z), r = rolagem (Y), loc = (x,y,z) no espaco da armature."""
        for pb in self.arm.pose.bones:
            d = pose.get(pb.name)
            R = self.R[pb.name]
            if not d:
                pb.rotation_quaternion = (1, 0, 0, 0)
                pb.location = (0, 0, 0)
                continue
            rot = Matrix.Rotation(math.radians(d.get('y', 0)), 3, 'Z') @ Matrix.Rotation(math.radians(-d.get('p', 0)), 3, 'X') @ Matrix.Rotation(math.radians(d.get('r', 0)), 3, 'Y')
            local = R.inverted() @ rot @ R
            pb.rotation_quaternion = local.to_quaternion()
            loc = d.get('loc')
            pb.location = (R.inverted() @ Vector(loc)) if loc else (0, 0, 0)
        bpy.context.view_layer.update()

    def key(self, frame, pose):
        self.set_pose(pose)
        for pb in self.arm.pose.bones:
            pb.keyframe_insert('rotation_quaternion', frame=frame, group=pb.name)
            pb.keyframe_insert('location', frame=frame, group=pb.name)


def min_z(mesh_obj):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = mesh_obj.evaluated_get(dg)
    me = ev.to_mesh()
    z = min(v.co.z for v in me.vertices)
    ev.to_mesh_clear()
    return z

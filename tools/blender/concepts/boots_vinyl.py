"""Botas de vinil gloss (conceitos avulsos, ainda sem esqueleto) para aprovacao de design.

Modelos: 'cano-medio' (meia-panturrilha, como a referencia), 'cano-longo' (acima do joelho), 'botinha' (tornozelo, tira dupla).
Fivelas: 'prata' (quadrada, polida), 'coracao' (coracao cravejado de pedras), 'strass' (tira toda cravejada + fivela de cristal).
Cores: preta, branca, vermelha, azul. Escala do pe da boneca (~19,6 cm, bico para -Y, chao em z=0).

Uso: Blender -b --factory-startup -noaudio --python tools/blender/concepts/boots_vinyl.py -- --out DIR [--sheet grade|fivelas|lado]
"""
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OPT = dict(zip(argv[::2], argv[1::2]))
OUT = OPT.get('--out', '/tmp/boots')
SHEET = OPT.get('--sheet', 'grade')
os.makedirs(OUT, exist_ok=True)

COLORS = {'preta': '#0b0a0d', 'branca': '#c9c4bc', 'vermelha': '#7d0610', 'azul': '#0c2266'}


def lin(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c) + (1,)


# ------------------------------------------------------------------ materiais
def mat_vinyl(name, color):
    """Vinil/verniz: cor saturada, quase espelhado, com verniz por cima (reflexos longos como na referencia)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = lin(color)
    p.inputs['Roughness'].default_value = 0.14
    p.inputs['Coat Weight'].default_value = 0.85
    p.inputs['Coat Roughness'].default_value = 0.015
    p.inputs['Specular IOR Level'].default_value = 0.5
    return m


def mat_metal(name, color, rough=0.06):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = lin(color)
    p.inputs['Metallic'].default_value = 1.0
    p.inputs['Roughness'].default_value = rough
    return m


def mat_gem(name, color, glow=0.5):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = lin(color)
    p.inputs['Metallic'].default_value = 1.0
    p.inputs['Roughness'].default_value = 0.0
    p.inputs['Coat Weight'].default_value = 1.0
    p.inputs['Emission Color'].default_value = lin(color)
    p.inputs['Emission Strength'].default_value = glow
    return m


# ------------------------------------------------------------------ util
def obj_from(bm, name, mat=None, smooth=True, sub=0):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    if mat:
        ob.data.materials.append(mat)
    for p in ob.data.polygons:
        p.use_smooth = smooth
    if sub:
        m = ob.modifiers.new('sub', 'SUBSURF')
        m.levels = m.render_levels = sub
    return ob


def frame(t):
    z = t.normalized()
    x = Vector((1, 0, 0))
    x = (x - z * x.dot(z)).normalized()
    y = z.cross(x)
    return Matrix((x, y, z)).transposed()


def loft(name, sections, mat, segs=28, cap_start=True, sub=2):
    """sections: lista de (centro, tangente, rx, ry, dy_frente) -> tubo fechado no bico.
    rx = meia-largura (lateral), ry = meia-altura no plano da secao; dy_frente desloca a parte de cima (peito do pe)."""
    bm = bmesh.new()
    rings = []
    for c, t, rx, ry, k in sections:
        F = frame(t)
        ring = []
        for i in range(segs):
            a = 2 * math.pi * i / segs
            # secao de pe: mais achatada embaixo (sola) e arredondada em cima
            sy = math.sin(a)
            yy = ry * (sy if sy > 0 else sy * k)
            ring.append(bm.verts.new(c + F @ Vector((rx * math.cos(a), yy, 0))))
        rings.append(ring)
    for j in range(len(rings) - 1):
        a, b = rings[j], rings[j + 1]
        for i in range(segs):
            bm.faces.new((a[i], a[(i + 1) % segs], b[(i + 1) % segs], b[i]))
    if cap_start:
        ctr = bm.verts.new(sum((v.co for v in rings[0]), Vector()) / segs + (sections[0][1].normalized() * -0.004))
        for i in range(segs):
            bm.faces.new((rings[0][(i + 1) % segs], rings[0][i], ctr))
    return obj_from(bm, name, mat, sub=sub)


def bez(p0, p1, p2, t):
    return p0 * (1 - t) ** 2 + p1 * 2 * (1 - t) * t + p2 * t ** 2


# ------------------------------------------------------------------ bota
FOOT = dict(toe_y=-0.112, heel_y=0.085, plat=0.034, heel_h=0.150)


def sole_z(y):
    """Altura da parte de baixo do pe: plana sobre a plataforma na frente, sobe ate o salto atras."""
    P, Hh, H = FOOT['plat'], FOOT['heel_h'], FOOT['heel_y']
    if y <= -0.03:
        return P
    u = min(1.0, (y + 0.03) / (H - 0.008 + 0.03))
    return P + (Hh - P) * (u ** 1.35)


def ring_pts(c, X, Y, rx, ry, segs, flat=0.55, sq=2.4):
    """Anel em superelipse (mais 'quadrado' que elipse, como fôrma de sapato); embaixo achatado por `flat`."""
    out = []
    for i in range(segs):
        a = 2 * math.pi * i / segs
        ca, sa = math.cos(a), math.sin(a)
        ex = math.copysign(abs(ca) ** (2 / sq), ca)
        ey = math.copysign(abs(sa) ** (2 / sq), sa)
        if sa < 0:
            ey *= flat
        out.append(c + X * (rx * ex) + Y * (ry * ey))
    return out


def loft_rings(name, rings, mat, cap0=None, cap1=None, sub=2):
    bm = bmesh.new()
    vr = [[bm.verts.new(p) for p in r] for r in rings]
    n = len(rings[0])
    for a, b in zip(vr, vr[1:]):
        for i in range(n):
            bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    for ring, ctr, flip in ((vr[0], cap0, True), (vr[-1], cap1, False)):
        if ctr is None:
            continue
        cv = bm.verts.new(ctr)
        for i in range(n):
            f = (ring[(i + 1) % n], ring[i], cv) if flip else (ring[i], ring[(i + 1) % n], cv)
            bm.faces.new(f)
    return obj_from(bm, name, mat, sub=sub)


def shaft_profile(z, top):
    """(centro_y, meia-largura, meia-profundidade) do cano numa altura z."""
    def L(a, b, u):
        return a + (b - a) * max(0.0, min(1.0, u))
    if z < 0.19:   # calcanhar arredondado
        u = (z - FOOT['heel_h']) / 0.04
        r = 0.022 + 0.012 * math.sin(max(0, min(1, u)) * math.pi / 2)
        return 0.052, r * 0.95, r * 1.05
    if z < 0.30:
        return L(0.052, 0.05, (z - 0.19) / 0.11), L(0.034, 0.032, (z - 0.19) / 0.11), L(0.036, 0.034, (z - 0.19) / 0.11)
    if z < 0.42:
        u = (z - 0.30) / 0.12
        return L(0.05, 0.056, u), L(0.032, 0.045, u), L(0.034, 0.049, u)
    if z < 0.50:
        u = (z - 0.42) / 0.08
        return 0.056, L(0.045, 0.042, u), L(0.049, 0.044, u)
    u = (z - 0.50) / 0.2
    return 0.054, L(0.042, 0.056, u), L(0.044, 0.058, u)


def build_boot(model, color, buckle, x=0.0, rot=0.0):
    tops = {'cano-medio': 0.40, 'cano-longo': 0.66, 'botinha': 0.30, 'roqueira': 0.64, 'roqueira-media': 0.42}
    top = tops[model]
    rock = model.startswith('roqueira')
    # roqueira: plataforma alta e salto grosso (bloco), pe menos inclinado
    FOOT.update(plat=0.05, heel_h=0.125) if rock else FOOT.update(plat=0.034, heel_h=0.150)
    vinyl = mat_vinyl(f'vinil_{color}', COLORS[color])
    sole_col = '#0b0b0d' if color != 'branca' else '#e9e6e0'
    sole_mat = mat_vinyl('sola_' + color, sole_col)
    parts = []
    segs = 32
    T, H, P = FOOT['toe_y'], FOOT['heel_y'], FOOT['plat']
    # ---- peito do pe (gaspea): fatias de frente para tras, perpendiculares a Y
    rings = []
    ys = [T + (H + 0.002 - T) * (i / 22) ** 0.95 for i in range(23)]
    for y in ys:
        t = min(1.0, (y - T) / (0.045 - T))
        zb = sole_z(y)
        # linha do peito do pe: biqueira cheia, sobe forte ate o tornozelo; atras do tornozelo vira o calcanhar (coberto pelo cano)
        zt = P + 0.04 + (0.27 - P - 0.04) * (max(0.0, t - 0.1) / 0.9) ** 1.8
        if y > 0.045:
            zt = 0.27
        w = 0.021 + 0.023 * math.sin(min(1.0, t * 2.4) * math.pi / 2) - 0.008 * max(0.0, t - 0.5) / 0.5
        w *= 0.6 + 0.4 * min(1.0, t * 6)  # bico arredondado
        if y > 0.045:  # calcanhar: estreita e arredonda
            u = (y - 0.045) / (H + 0.002 - 0.045)
            w = 0.034 * math.sqrt(max(0.0, 1 - u ** 2.2)) + 0.004
        c = Vector((0, y, (zb + zt) / 2))
        rings.append(ring_pts(c, Vector((1, 0, 0)), Vector((0, 0, 1)), w, (zt - zb) / 2, segs, flat=1.0, sq=2.2))
    toe_tip = Vector((0, T - 0.004, P + 0.02))
    heel_back = Vector((0, H + 0.006, (sole_z(H) + 0.27) / 2))
    vamp = loft_rings('gaspea', rings, vinyl, cap0=toe_tip, cap1=heel_back)
    parts.append(vamp)
    # ---- cano: aneis horizontais do calcanhar ate o topo (fundo arredondado sobre o salto)
    zs = [0.2 + (top - 0.2) * (i / 20) ** 1.1 for i in range(21)]
    srings = []
    shaft_secs = []
    for z in zs:
        cy, rx, ry = shaft_profile(z, top)
        c = Vector((0, cy, z))
        srings.append(ring_pts(c, Vector((1, 0, 0)), Vector((0, 1, 0)), rx, ry, segs, flat=1.0, sq=2.1))
        shaft_secs.append((c, Vector((0, 0, 1)), rx, ry, 1.0))
    shaft = loft_rings('cano', srings, vinyl, cap0=Vector((0, 0.05, 0.19)), cap1=shaft_secs[-1][0] + Vector((0, 0, 0.001)))
    # funde gaspea + cano numa malha so (remesh por voxel) e suaviza a emenda do tornozelo
    for o in (vamp, shaft):
        bpy.context.view_layer.objects.active = o
        for m in list(o.modifiers):
            bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.ops.object.select_all(action='DESELECT')
    vamp.select_set(True)
    shaft.select_set(True)
    bpy.context.view_layer.objects.active = vamp
    bpy.ops.object.join()
    rm = vamp.modifiers.new('fundir', 'REMESH')
    rm.mode = 'VOXEL'
    rm.voxel_size = 0.0018
    rm.use_smooth_shade = True
    sm = vamp.modifiers.new('suave', 'CORRECTIVE_SMOOTH')
    sm.factor = 0.8
    sm.iterations = 12
    sm.smooth_type = 'LENGTH_WEIGHTED'
    sm.use_only_smooth = True
    parts.remove(vamp)
    parts.append(vamp)
    # bainha brilhante no topo do cano
    c_top, _, rx, ry, _ = shaft_secs[-1]
    bm = bmesh.new()
    vs = [bm.verts.new(p) for p in ring_pts(c_top, Vector((1, 0, 0)), Vector((0, 1, 0)), rx * 1.03, ry * 1.03, 40, flat=1.0, sq=2.1)]
    for i in range(40):
        bm.edges.new((vs[i], vs[(i + 1) % 40]))
    hem = obj_from(bm, 'bainha', vinyl)
    hem.modifiers.new('sk', 'SKIN')
    for v in hem.data.skin_vertices[0].data:
        v.radius = (0.0035, 0.0035)
    parts.append(hem)
    # vivo/costura: na lateral do cano e ao longo do pe (como na referencia)
    bm = bmesh.new()
    pts = [Vector((-r[int(segs / 2)].x * 1.01, 0, 0)) for r in []]
    line = [Vector((rings[k][segs // 2].x * 1.012, rings[k][segs // 2].y, rings[k][segs // 2].z)) for k in range(3, 15)]
    line += [Vector((srings[k][segs // 2].x * 1.012, srings[k][segs // 2].y, srings[k][segs // 2].z)) for k in range(2, len(srings))]
    vs = [bm.verts.new(p) for p in line]
    for a_, b_ in zip(vs, vs[1:]):
        bm.edges.new((a_, b_))
    seam = obj_from(bm, 'costura', vinyl)
    seam.modifiers.new('sk', 'SKIN')
    for v in seam.data.skin_vertices[0].data:
        v.radius = (0.0015, 0.0015)
    parts.append(seam)
    # ---- plataforma (frente) + sola do arco (segue exatamente sole_z) + salto agulha
    bm = bmesh.new()
    outline = []
    for i in range(40):
        a = 2 * math.pi * i / 40
        yy = -0.07 + 0.048 * math.sin(a)
        ww = 0.043 if math.sin(a) > -0.2 else 0.043 * (0.55 + 0.45 * (1 + math.sin(a)) / 0.8)
        outline.append(Vector((ww * math.cos(a), yy, 0)))
    f = bm.faces.new([bm.verts.new(v) for v in outline])
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    for v in ext['geom']:
        if isinstance(v, bmesh.types.BMVert):
            v.co.z += P
    plat = obj_from(bm, 'plataforma', sole_mat)
    bev = plat.modifiers.new('bev', 'BEVEL')
    bev.width = 0.006
    bev.segments = 4
    parts.append(plat)
    bm = bmesh.new()
    rows = []
    for i in range(13):
        u = i / 12
        y = -0.035 + (H + 0.003 - (-0.035)) * u
        zb = sole_z(y) - 0.002
        hw = 0.036 - 0.012 * u
        rows.append((bm.verts.new((-hw, y, zb)), bm.verts.new((hw, y, zb))))
    for a_, b_ in zip(rows, rows[1:]):
        bm.faces.new((a_[0], a_[1], b_[1], b_[0]))
    arch = obj_from(bm, 'sola_arco', sole_mat)
    sol = arch.modifiers.new('sol', 'SOLIDIFY')
    sol.thickness = 0.007
    parts.append(arch)
    hp_top = Vector((0, H - 0.014, FOOT['heel_h']))
    hp_bot = Vector((0, H + 0.004, 0.006)) if not rock else Vector((0, H - 0.006, 0.006))
    bm = bmesh.new()
    if rock:
        # salto bloco: grosso, levemente afunilado, quinas arredondadas
        bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=0.024, radius2=0.03, depth=(hp_top - hp_bot).length)
        bmesh.ops.scale(bm, vec=(1.0, 1.2, 1.0), verts=bm.verts)
    else:
        bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=0.0055, radius2=0.016, depth=(hp_top - hp_bot).length)
    heel = obj_from(bm, 'salto', vinyl)
    heel.matrix_world = Matrix.Translation((hp_top + hp_bot) / 2) @ (hp_top - hp_bot).to_track_quat('Z', 'Y').to_matrix().to_4x4()
    parts.append(heel)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=0.0062, radius2=0.0062, depth=0.008)
    cap = obj_from(bm, 'tampa', sole_mat)
    cap.location = Vector((0, H + 0.004, 0.004))
    parts.append(cap)
    # ---- tira(s) com fivela no tornozelo
    strap_z = [0.27] if model != 'botinha' else [0.235, 0.275]
    if rock:
        strap_z = [0.235 + 0.058 * k for k in range(20) if 0.235 + 0.058 * k < top - 0.035]
    for k, sz in enumerate(strap_z):
        parts += build_strap(shaft_secs, sz, color, 'rock' if rock else buckle, vinyl, flip=rock and k % 2 == 1)
    if rock:
        parts += lug_sole(sole_mat)
    root = bpy.data.objects.new('bota', None)
    bpy.context.collection.objects.link(root)
    for p in parts:
        if p.parent is None:
            p.parent = root
    root.location = (x, 0, 0)
    root.rotation_euler = (0, 0, rot)
    return root


def section_at(secs, z):
    best = min((s for s in secs if s[4] == 1.0), key=lambda s: abs(s[0].z - z))
    return best


def lug_sole(mat):
    """Sola tratorada: blocos de borracha em volta da base da plataforma."""
    out = []
    for i in range(26):
        a = 2 * math.pi * i / 26
        x = 0.045 * math.cos(a)
        y = -0.07 + 0.05 * math.sin(a)
        if math.sin(a) < -0.2:
            x *= 0.55 + 0.45 * (1 + math.sin(a)) / 0.8
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, vec=(0.009, 0.006, 0.012), verts=bm.verts)
        lug = obj_from(bm, 'trator', mat, smooth=False)
        bv = lug.modifiers.new('bev', 'BEVEL')
        bv.width = 0.0015
        bv.segments = 2
        lug.matrix_world = Matrix.Translation((x, y, 0.006)) @ Matrix.Rotation(a + math.pi / 2, 4, 'Z')
        out.append(lug)
    return out


def spikes(c, F, w, h, skip):
    """Pinos de aco (cones polidos) cravados na tira, menos onde fica a fivela."""
    steel = mat_metal('aco', '#cfd4db', 0.05)
    out = []
    n = 16
    for i in range(n):
        a = 2 * math.pi * i / n
        if any(abs(math.atan2(math.sin(a - s), math.cos(a - s))) < 0.42 for s in skip):
            continue
        p = c + F @ Vector((w * 1.19 * math.cos(a), h * 1.19 * math.sin(a), 0))
        nrm = (F @ Vector((math.cos(a), math.sin(a), 0))).normalized()
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=10, radius1=0.0042, radius2=0.0, depth=0.008)
        bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, 0.004))
        sp = obj_from(bm, 'pino', steel, smooth=True)
        sp.matrix_world = Matrix.Translation(p) @ nrm.to_track_quat('Z', 'Y').to_matrix().to_4x4()
        out.append(sp)
    return out


def build_strap(secs, z, color, buckle, vinyl, flip=False):
    c, t, w, h, k = section_at(secs, z)
    c = Vector((c.x, c.y, z))
    F = Matrix(((1, 0, 0), (0, 1, 0), (0, 0, 1)))
    out = []
    # tira: anel achatado um pouco maior que o cano
    bm = bmesh.new()
    segs = 40
    rings = []
    for (dz, s) in ((-0.007, 1.10), (0.007, 1.10), (0.007, 1.18), (-0.007, 1.18)):
        rings.append([bm.verts.new(c + F @ Vector((w * s * math.cos(a), h * s * math.sin(a), dz))) for a in [2 * math.pi * i / segs for i in range(segs)]])
    for q in range(4):
        a, b = rings[q], rings[(q + 1) % 4]
        for i in range(segs):
            bm.faces.new((a[i], a[(i + 1) % segs], b[(i + 1) % segs], b[i]))
    strap = obj_from(bm, 'tira', vinyl, sub=1)
    out.append(strap)
    # ponto da fivela: lateral externa (+X), na frente da tira
    ang = math.radians(-15 if not flip else 15)
    pos = c + F @ Vector((w * 1.2 * math.cos(ang), h * 1.2 * math.sin(ang), 0))
    nrm = (F @ Vector((math.cos(ang), math.sin(ang), 0))).normalized()
    rotm = nrm.to_track_quat('Z', 'Y').to_matrix().to_4x4()
    silver = mat_metal('prata', '#d9dde3')
    if buckle == 'prata':
        out += buckle_square(pos, rotm, silver)
    elif buckle == 'coracao':
        out += buckle_heart(pos, rotm, silver, color)
    elif buckle == 'rock':
        out += buckle_square(pos, rotm, silver)
        out += spikes(c, F, w, h, skip=[ang])
    elif buckle == 'strass':
        out += strass_row(c, F, w, h, color)
        out += buckle_square(pos, rotm, silver, crystal=True)
    # ilhoses na tira (detalhe da referencia)
    for da in (math.radians(20), math.radians(32)):
        p = c + F @ Vector((w * 1.19 * math.cos(da), h * 1.19 * math.sin(da), 0))
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=10, radius1=0.0022, radius2=0.0022, depth=0.0012)
        e = obj_from(bm, 'ilhos', silver)
        n2 = (F @ Vector((math.cos(da), math.sin(da), 0))).normalized()
        e.matrix_world = Matrix.Translation(p) @ n2.to_track_quat('Z', 'Y').to_matrix().to_4x4()
        out.append(e)
    return out


def place(ob, pos, rotm, local=(0, 0, 0)):
    ob.matrix_world = Matrix.Translation(pos) @ rotm @ Matrix.Translation(local)


def buckle_square(pos, rotm, metal, crystal=False):
    out = []
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(0.024, 0.026, 0.004), verts=bm.verts)
    fr = obj_from(bm, 'fivela', metal, smooth=False)
    wf = fr.modifiers.new('wire', 'WIREFRAME')
    wf.thickness = 0.0035
    wf.use_even_offset = True
    bv = fr.modifiers.new('bev', 'BEVEL')
    bv.width = 0.0008
    bv.segments = 2
    place(fr, pos, rotm, (0, 0, 0.002))
    out.append(fr)
    # pino central
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(0.0028, 0.022, 0.002), verts=bm.verts)
    pin = obj_from(bm, 'pino', metal, smooth=False)
    place(pin, pos, rotm, (0, 0, 0.004))
    out.append(pin)
    if crystal:
        gem = mat_gem('cristal', '#eef3ff', 0.6)
        for (ux, uy) in [(-0.011, -0.012), (0.011, -0.012), (-0.011, 0.012), (0.011, 0.012), (0, -0.013), (0, 0.013), (-0.012, 0), (0.012, 0)]:
            g = gem_obj(0.0028, gem)
            place(g, pos, rotm, (ux, uy, 0.0045))
            out.append(g)
    return out


def gem_obj(r, mat):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=r, radius2=r * 0.55, depth=r * 0.5)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, r * 0.25))
    tmp = bmesh.new()
    bmesh.ops.create_cone(tmp, cap_ends=True, segments=8, radius1=0.0, radius2=r, depth=r * 0.8)
    bmesh.ops.translate(tmp, verts=tmp.verts, vec=(0, 0, -r * 0.4))
    me = bpy.data.meshes.new('t')
    tmp.to_mesh(me)
    tmp.free()
    bm.from_mesh(me)
    bpy.data.meshes.remove(me)
    return obj_from(bm, 'pedra', mat, smooth=False)


def heart_outline(size, n=40):
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        x = 16 * math.sin(a) ** 3
        y = 13 * math.cos(a) - 5 * math.cos(2 * a) - 2 * math.cos(3 * a) - math.cos(4 * a)
        pts.append((x / 34 * size, y / 34 * size))
    return pts


def buckle_heart(pos, rotm, metal, color):
    """Coracao de pedras: moldura prata em coracao + pave de cristais (vermelho rubi na bota vermelha, cristal nas outras)."""
    out = []
    size = 0.05
    bm = bmesh.new()
    f = bm.faces.new([bm.verts.new((x, y, 0)) for x, y in heart_outline(size * 1.08)])
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    for v in ext['geom']:
        if isinstance(v, bmesh.types.BMVert):
            v.co.z += 0.003
    base = obj_from(bm, 'coracao_base', metal, smooth=False)
    bv = base.modifiers.new('bev', 'BEVEL')
    bv.width = 0.0008
    bv.segments = 3
    place(base, pos, rotm, (0, 0, 0.001))
    out.append(base)
    gem_col = {'vermelha': '#ff2a4a', 'azul': '#9ec8ff', 'preta': '#f2f5ff', 'branca': '#ff9fd0'}[color]
    gem = mat_gem('pedra_' + color, gem_col, 0.7)
    sc = size * 0.41
    r = size * 0.075
    step = r * 2.05
    y = -1.1 * sc
    row = 0
    while y < 1.3 * sc:
        x = -1.2 * sc + (step / 2 if row % 2 else 0)
        while x < 1.2 * sc:
            u, v = x / sc, (y + size * 0.03) / sc
            if (u * u + v * v - 1) ** 3 - u * u * v ** 3 <= -0.03:
                g = gem_obj(r, gem)
                place(g, pos, rotm, (x, y, 0.0045))
                out.append(g)
            x += step
        y += step * 0.87
        row += 1
    return out


def strass_row(c, F, w, h, color):
    gem = mat_gem('strass', '#f2f5ff', 0.6)
    out = []
    n = 34
    for i in range(n):
        a = 2 * math.pi * i / n
        p = c + F @ Vector((w * 1.19 * math.cos(a), h * 1.19 * math.sin(a), 0))
        nrm = (F @ Vector((math.cos(a), math.sin(a), 0))).normalized()
        g = gem_obj(0.0032, gem)
        g.matrix_world = Matrix.Translation(p) @ nrm.to_track_quat('Z', 'Y').to_matrix().to_4x4()
        out.append(g)
    return out


# ------------------------------------------------------------------ estudio
def studio(res, bg_top='#141317', bg_bot='#3a3640'):
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE'
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.view_settings.view_transform = 'AgX'
    try:
        sc.view_settings.look = 'AgX - Medium High Contrast'
        sc.eevee.taa_render_samples = 64
        sc.eevee.use_raytracing = True
    except Exception:
        pass
    w = bpy.data.worlds.new('w')
    sc.world = w
    w.use_nodes = True
    nt = w.node_tree
    bg = nt.nodes['Background']
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sp = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Generated'], sp.inputs[0])
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = lin(bg_bot)
    ramp.color_ramp.elements[1].color = lin(bg_top)
    nt.links.new(sp.outputs['Z'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = 0.5
    # piso espelhado escuro (palco)
    bpy.ops.mesh.primitive_plane_add(size=6)
    fl = bpy.context.object
    fm = bpy.data.materials.new('piso')
    fm.use_nodes = True
    pb = fm.node_tree.nodes['Principled BSDF']
    pb.inputs['Base Color'].default_value = lin('#1c1a1f')
    pb.inputs['Roughness'].default_value = 0.35
    fl.data.materials.append(fm)
    # luzes em tira (camarim): dao os reflexos longos do vinil
    for loc, size, en in (((0.7, -0.6, 0.7), (0.08, 1.4), 160), ((-0.8, -0.4, 0.6), (0.08, 1.2), 90), ((0.0, 0.9, 1.0), (1.4, 0.5), 80), ((0.5, -1.0, 0.3), (0.8, 0.8), 50), ((0.0, 0.0, 1.4), (1.0, 1.0), 60)):
        bpy.ops.object.light_add(type='AREA', location=loc)
        lt = bpy.context.object
        lt.data.shape = 'RECTANGLE'
        lt.data.size, lt.data.size_y = size
        lt.data.energy = en
        lt.rotation_euler = (Vector((0, 0, 0.25)) - lt.location).to_track_quat('-Z', 'Y').to_euler()


def camera(loc, tgt, lens=50):
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    bpy.context.collection.objects.link(cam)
    cam.location = loc
    cam.data.lens = lens
    cam.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.camera = cam


def render(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print('SALVO', path)


bpy.ops.wm.read_factory_settings(use_empty=True)
if SHEET == 'grade':
    # 3 modelos x 4 cores, fivela prata; perfil 3/4
    studio((1800, 1150))
    models = ['botinha', 'cano-medio', 'cano-longo']
    cols = list(COLORS)
    for r, mdl in enumerate(models):
        for c, col in enumerate(cols):
            b = build_boot(mdl, col, ['prata', 'coracao', 'strass', 'prata'][(c + r) % 4], x=(c - 1.5) * 0.17 + (r - 1) * 0.6 * 0, rot=math.radians(-30))
            b.location = ((c - 1.5) * 0.15 + (r - 1) * 0.66, r * 0.05, 0)
    camera((0.0, -1.85, 0.62), (0.0, 0.05, 0.22), 46)
    render(os.path.join(OUT, 'botas_grade.png'))
elif SHEET == 'fivelas':
    studio((1600, 900))
    for i, (bk, col) in enumerate((('prata', 'preta'), ('coracao', 'vermelha'), ('strass', 'azul'), ('coracao', 'branca'))):
        b = build_boot('cano-medio', col, bk, rot=math.radians(-75))
        b.location = ((i - 1.5) * 0.15, 0, 0)
    camera((0.06, -0.62, 0.36), (0.0, 0.0, 0.25), 60)
    render(os.path.join(OUT, 'botas_fivelas.png'))
elif SHEET == 'modelo':
    studio((1800, 1000))
    mdl = OPT.get('--modelo', 'cano-medio')
    bks = OPT.get('--fivelas', 'prata,coracao,strass,prata').split(',')
    for i, col in enumerate(COLORS):
        b = build_boot(mdl, col, bks[i], rot=math.radians(-58))
        b.location = ((i - 1.5) * 0.2, 0, 0)
    h = {'botinha': 0.17, 'cano-medio': 0.22, 'cano-longo': 0.36, 'roqueira': 0.35, 'roqueira-media': 0.23}[mdl]
    d = {'botinha': 1.05, 'cano-medio': 1.2, 'cano-longo': 1.9, 'roqueira': 1.85, 'roqueira-media': 1.25}[mdl]
    camera((0.08, -d, h + 0.16), (0.0, 0.0, h), 50)
    render(os.path.join(OUT, f'modelo_{mdl}.png'))
elif SHEET == 'lado':
    studio((1100, 1300))
    build_boot('cano-medio', OPT.get('--cor', 'preta'), OPT.get('--fivela', 'prata'), rot=0)
    camera((0.78, -0.18, 0.3), (0.0, -0.02, 0.2), 55)
    render(os.path.join(OUT, OPT.get('--nome', 'bota_lado') + '.png'))

"""Acessorios 3D dos pets (coleira, laco, sueter de trico, bandana), encaixados por raca.

Uso (renders de aprovacao):
  Blender -b --factory-startup -noaudio --python tools/blender/pets/pet_accessories.py -- \
      --breeds poodle,siames --out /tmp/pet_acc

Cada acessorio e montado a partir do `meta` da raca em public/assets/pets/pets.json
(n0/hn = base e topo do pescoco, neckR, hc/hr = centro e raio da cabeca, zc/L/bw/bh = tronco).
O meta esta em coordenadas do jogo (Y para cima, frente +Z); g2b() converte para o Blender (Z para cima, frente -Y).
"""
import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
PETS_DIR = os.path.join(ROOT, 'public', 'assets', 'pets')


def g2b(v):
    x, y, z = v
    return Vector((x, -z, y))


def hexcol(h, a=1.0):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c) + (a,)


# ------------------------------------------------------------------ materiais

def mat_basic(name, color, rough=0.18, metal=0.0, sheen=0.0, coat=1.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = hexcol(color)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    if sheen:
        p.inputs['Sheen Weight'].default_value = sheen
    if coat:
        p.inputs['Coat Weight'].default_value = coat
        p.inputs['Coat Roughness'].default_value = 0.04
    return m


def mat_knit(name, color, color2=None, stripes=0):
    """Trico: relevo em V (wave) + listras opcionais pelo comprimento (coordenada do objeto Y)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes['Principled BSDF']
    # ceramica esmaltada: o trico vira relevo esculpido sob um verniz brilhante (estilo do jogo)
    p.inputs['Roughness'].default_value = 0.3
    p.inputs['Coat Weight'].default_value = 1.0
    p.inputs['Coat Roughness'].default_value = 0.05
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Object'], sep.inputs[0])
    # pontos de trico: ondas em V ao redor do corpo
    wave = nt.nodes.new('ShaderNodeTexWave')
    wave.wave_type = 'BANDS'
    wave.bands_direction = 'X'
    wave.inputs['Scale'].default_value = 55
    wave.inputs['Distortion'].default_value = 2.0
    wave.inputs['Detail'].default_value = 1.0
    nt.links.new(tc.outputs['Object'], wave.inputs['Vector'])
    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.35
    bump.inputs['Distance'].default_value = 0.002
    nt.links.new(wave.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], p.inputs['Normal'])
    if stripes and color2:
        mix = nt.nodes.new('ShaderNodeMix')
        mix.data_type = 'RGBA'
        mix.inputs['A'].default_value = hexcol(color)
        mix.inputs['B'].default_value = hexcol(color2)
        mth = nt.nodes.new('ShaderNodeMath')
        mth.operation = 'MULTIPLY'
        mth.inputs[1].default_value = stripes
        nt.links.new(sep.outputs['Y'], mth.inputs[0])
        sn = nt.nodes.new('ShaderNodeMath')
        sn.operation = 'SINE'
        nt.links.new(mth.outputs[0], sn.inputs[0])
        gt = nt.nodes.new('ShaderNodeMath')
        gt.operation = 'GREATER_THAN'
        gt.inputs[1].default_value = 0.0
        nt.links.new(sn.outputs[0], gt.inputs[0])
        nt.links.new(gt.outputs[0], mix.inputs['Factor'])
        nt.links.new(mix.outputs['Result'], p.inputs['Base Color'])
    else:
        p.inputs['Base Color'].default_value = hexcol(color)
    return m


def mat_plaid(name, base, line1, line2):
    """Xadrez simples (bandana): duas grades de listras somadas em coordenadas de UV."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes['Principled BSDF']
    p.inputs['Roughness'].default_value = 0.22
    p.inputs['Coat Weight'].default_value = 1.0
    p.inputs['Coat Roughness'].default_value = 0.04
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['UV'], sep.inputs[0])

    def band(axis, freq, width):
        mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = freq
        nt.links.new(sep.outputs[axis], mul.inputs[0])
        fr = nt.nodes.new('ShaderNodeMath'); fr.operation = 'FRACT'
        nt.links.new(mul.outputs[0], fr.inputs[0])
        lt = nt.nodes.new('ShaderNodeMath'); lt.operation = 'LESS_THAN'; lt.inputs[1].default_value = width
        nt.links.new(fr.outputs[0], lt.inputs[0])
        return lt.outputs[0]

    def mx(fac, a, b):
        n = nt.nodes.new('ShaderNodeMix'); n.data_type = 'RGBA'
        nt.links.new(fac, n.inputs['Factor'])
        if isinstance(a, tuple):
            n.inputs['A'].default_value = a
        else:
            nt.links.new(a, n.inputs['A'])
        n.inputs['B'].default_value = b
        return n.outputs['Result']

    mx_ = nt.nodes.new('ShaderNodeMath'); mx_.operation = 'MAXIMUM'
    nt.links.new(band('X', 9, 0.28), mx_.inputs[0]); nt.links.new(band('Y', 9, 0.28), mx_.inputs[1])
    c = mx(mx_.outputs[0], hexcol(base), hexcol(line1, 1) if False else tuple(0.6 * a + 0.4 * b for a, b in zip(hexcol(base), hexcol(line1))))
    mx2 = nt.nodes.new('ShaderNodeMath'); mx2.operation = 'MAXIMUM'
    nt.links.new(band('X', 9, 0.06), mx2.inputs[0]); nt.links.new(band('Y', 9, 0.06), mx2.inputs[1])
    c = mx(mx2.outputs[0], c, hexcol(line2))
    nt.links.new(c, p.inputs['Base Color'])
    return m


# ------------------------------------------------------------------ util de malha

def new_obj(name, bm):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    return ob


def shade_smooth(ob, sub=1):
    for p in ob.data.polygons:
        p.use_smooth = True
    if sub:
        m = ob.modifiers.new('sub', 'SUBSURF')
        m.levels = sub
        m.render_levels = sub


def frame_from_axis(axis):
    """Matriz 3x3 com Z = eixo dado (anel perpendicular ao eixo)."""
    z = axis.normalized()
    up = Vector((0, 0, 1)) if abs(z.z) < 0.95 else Vector((0, 1, 0))
    x = up.cross(z).normalized()
    y = z.cross(x)
    return Matrix((x, y, z)).transposed()


def band_ring(r, width, thick, segs=48):
    """Faixa achatada (secao retangular arredondada pelo subsurf), centrada na origem, eixo Z."""
    bm = bmesh.new()
    rings = []
    prof = [(r, -width / 2), (r, width / 2), (r + thick, width / 2), (r + thick, -width / 2)]
    for i in range(segs):
        a = 2 * math.pi * i / segs
        ca, sa = math.cos(a), math.sin(a)
        rings.append([bm.verts.new((rr * ca, rr * sa, z)) for rr, z in prof])
    for i in range(segs):
        a, b = rings[i], rings[(i + 1) % segs]
        for k in range(4):
            bm.faces.new((a[k], a[(k + 1) % 4], b[(k + 1) % 4], b[k]))
    return bm


# ------------------------------------------------------------------ acessorios

def neck_frame(meta, t=0.55):
    n0 = g2b(meta['n0'])
    hn = g2b(meta['hn'])
    pos = n0.lerp(hn, t)
    return pos, frame_from_axis(hn - n0)


def build_collar(meta, color='#7a2332', name='coleira'):
    """Coleira de couro com pesponto, fivela dourada e pingente de coracao na frente."""
    pos, R = neck_frame(meta)
    nr = meta['neckR'] * 1.05
    hr = meta['hr']
    w = hr * 0.30
    t = hr * 0.07
    parts = []
    band = new_obj(name + '_band', band_ring(nr, w, t))
    band.data.materials.append(mat_basic('couro_' + color, color, rough=0.12))
    shade_smooth(band, 1)
    parts.append(band)
    # pesponto: dois aneis finos claros
    for dz in (-w * 0.32, w * 0.32):
        bm = bmesh.new()
        bmesh.ops.create_circle(bm, cap_ends=False, radius=nr + t * 1.02, segments=48)
        st = new_obj(name + '_stitch', bm)
        st.location.z = dz
        sk = st.modifiers.new('sk', 'SKIN')
        for v in st.data.skin_vertices[0].data:
            v.radius = (t * 0.07, t * 0.07)
        st.data.materials.append(mat_basic('linha_creme', '#e8d9b8', rough=0.2))
        shade_smooth(st, 0)
        parts.append(st)
    gold = mat_basic('ouro', '#e0b84a', rough=0.06, metal=1.0)
    # fivela na lateral (+X): moldura retangular
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    fv = new_obj(name + '_fivela', bm)
    fv.scale = (t * 1.6, w * 0.75, w * 1.25)
    fv.location = (nr + t * 0.9, 0, 0)
    sol = fv.modifiers.new('wire', 'WIREFRAME')
    sol.thickness = 0.18
    sol.use_even_offset = True
    fv.data.materials.append(gold)
    parts.append(fv)
    # argola e pingente de coracao embaixo (frente do pescoco)
    ang = -math.pi / 2  # -Y local = para baixo/frente apos o frame
    bm = bmesh.new()
    bmesh.ops.create_circle(bm, cap_ends=False, radius=w * 0.42, segments=20)
    ring = new_obj(name + '_argola', bm)
    sk = ring.modifiers.new('sk', 'SKIN')
    for v in ring.data.skin_vertices[0].data:
        v.radius = (t * 0.28, t * 0.28)
    ring.rotation_euler = (math.pi / 2, 0, 0)
    ring.location = (0, -(nr + t + w * 0.25), -w * 0.05)
    ring.data.materials.append(gold)
    shade_smooth(ring, 1)
    parts.append(ring)
    heart = build_heart(w * 0.9, t * 1.2, gold)
    heart.location = (0, -(nr + t + w * 0.95), -w * 0.1)
    heart.rotation_euler = (math.radians(90), 0, 0)
    parts.append(heart)
    return group(parts, name, pos, R)


def build_heart(size, depth, material):
    bm = bmesh.new()
    pts = []
    for i in range(48):
        a = 2 * math.pi * i / 48
        x = 16 * math.sin(a) ** 3
        y = 13 * math.cos(a) - 5 * math.cos(2 * a) - 2 * math.cos(3 * a) - math.cos(4 * a)
        pts.append(bm.verts.new((x / 34 * size, y / 34 * size, 0)))
    f = bm.faces.new(pts)
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    for v in ext['geom']:
        if isinstance(v, bmesh.types.BMVert):
            v.co.z += depth
    ob = new_obj('coracao', bm)
    bev = ob.modifiers.new('bev', 'BEVEL')
    bev.width = depth * 0.35
    bev.segments = 3
    ob.data.materials.append(material)
    shade_smooth(ob, 0)
    return ob


def build_bow(meta, color='#c96f86', name='laco'):
    """Laco de cetim: duas alcas curvas + no central + duas caudas com corte em V."""
    hr = meta['hr']
    satin = mat_basic('cetim_' + color, color, rough=0.1)
    parts = []
    s = hr * 0.95
    for sx in (1, -1):
        # alca: "almofada" em gota, presa no centro e cheia na ponta, com uma dobra no meio
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=14, radius=1.0)
        for v in bm.verts:
            x, y, z = v.co
            t = (x + 1) / 2                    # 0 no no, 1 na ponta
            pinch = 0.18 + 0.82 * math.sin(min(t, 1) * math.pi * 0.62) ** 0.8
            dent = 1 - 0.28 * math.exp(-((z / max(pinch, 1e-3)) ** 2) * 6) * t  # vinco central da dobra
            v.co = Vector((sx * t * s * 0.62, y * s * 0.16 * pinch * dent, z * s * 0.42 * pinch))
        loop = new_obj(name + '_alca', bm)
        loop.rotation_euler = (0, -sx * 0.22, sx * 0.12)
        loop.data.materials.append(satin)
        shade_smooth(loop, 1)
        parts.append(loop)
        # cauda: fita que cai em curva, com corte em V na ponta
        bm = bmesh.new()
        n = 8
        wv = s * 0.17
        L = s * 0.75
        rows = []
        for j in range(n + 1):
            f = j / n
            cx = sx * (s * 0.06 + L * 0.42 * f)
            cz = -L * f
            cy = s * 0.05 * math.sin(f * math.pi)
            if j < n:
                rows.append((bm.verts.new((cx - wv, cy, cz)), bm.verts.new((cx + wv, cy, cz))))
        tip = bm.verts.new((sx * (s * 0.06 + L * 0.42) , s * 0.0, -L * 0.82))
        for j in range(n - 1):
            a, b = rows[j], rows[j + 1]
            bm.faces.new((a[0], a[1], b[1], b[0]))
        last = rows[-1]
        # V: as duas pontas descem alem do centro
        e1 = bm.verts.new((last[0].co.x - sx * wv * 0.1, last[0].co.y, last[0].co.z - L / n * 1.4))
        e2 = bm.verts.new((last[1].co.x + sx * wv * 0.1, last[1].co.y, last[1].co.z - L / n * 1.4))
        bm.faces.new((last[0], last[1], e2, tip, e1))
        tail = new_obj(name + '_cauda', bm)
        sol = tail.modifiers.new('sol', 'SOLIDIFY')
        sol.thickness = s * 0.035
        tail.location.y = s * 0.03
        tail.data.materials.append(satin)
        shade_smooth(tail, 1)
        parts.append(tail)
    # no central (cilindro arredondado que "aperta" as alcas)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=1.0)
    knot = new_obj(name + '_no', bm)
    knot.scale = (s * 0.13, s * 0.15, s * 0.2)
    knot.data.materials.append(satin)
    shade_smooth(knot, 1)
    parts.append(knot)
    # posicao: alto da cabeca, levemente para o lado (mesma ideia do laco procedural do jogo)
    hc = Vector(meta['hc'])
    gpos = g2b((hc.x + hr * 0.42, hc.y + hr * 0.88, hc.z + hr * 0.42))  # alto da cabeca, a frente das orelhas
    R = Matrix.Rotation(-0.35, 3, 'Y')
    return group(parts, name, gpos, R)


def body_axis(meta):
    """Centro e comprimento do tronco no Blender (frente = -Y)."""
    return g2b((0, meta['zc'], 0)), meta['L'], meta['bw'], meta['bh']


def torso_shell(meta, pet_mesh, segs=40, rows=26):
    """Contorno do tronco para roupas, em secoes perpendiculares a uma "coluna" curva que vai do
    quadril, passa pelo peito e sobe pelo pescoco. Em cada secao mede o raio maximo da malha do pet
    por setor (sem pernas, cabeca e orelhas) e suaviza. Devolve um dict com P (centros), F (frames),
    R (raios por setor) e segs. Angulo -90 graus = parte de baixo da secao (peito na frente)."""
    c, L, bw, bh = body_axis(meta)
    n0 = g2b(meta['n0'])
    hn = g2b(meta['hn'])
    neck_axis = (hn - n0).normalized()
    dg = bpy.context.evaluated_depsgraph_get()
    ev = pet_mesh.evaluated_get(dg)
    me = ev.to_mesh()
    mw = pet_mesh.matrix_world
    pts = [mw @ v.co for v in me.vertices]
    ev.to_mesh_clear()
    zcut = c.z - bh * 0.95
    # coluna: Bezier quadratica quadril -> peito -> base do pescoco
    p0 = Vector((0, c.y + L * 0.30, c.z))
    p2 = n0 + neck_axis * meta['neckR'] * 0.35
    p1 = Vector((0, p2.y + meta['neckR'] * 0.2, c.z))
    P, F = [], []
    for j in range(rows + 1):
        t = 1 - j / rows  # j=0 na gola (frente), j=rows no quadril
        pt = p0 * (1 - t) ** 2 + p1 * 2 * (1 - t) * t + p2 * t ** 2
        tg = (p1 - p0) * 2 * (1 - t) + (p2 - p1) * 2 * t
        P.append(pt)
        F.append(frame_from_axis(tg))
    seglen = (p2 - p0).length / rows
    slab = seglen * 1.3
    R = [[0.0] * segs for _ in range(rows + 1)]
    for j in range(rows + 1):
        z = F[j].col[2]
        x = F[j].col[0]
        y = F[j].col[1]
        for p in pts:
            d = p - P[j]
            # pernas ficam de fora, mas o peito (no meio, |x| pequeno) pode descer mais
            if (p.z < zcut and abs(p.x) > bw * 0.55) or p.z < zcut - bh * 0.6 or abs(d.dot(z)) > slab:
                continue
            lx, ly = d.dot(x), d.dot(y)
            r = math.hypot(lx, ly)
            if r > bw * 2.2:  # orelhas caidas, focinho
                continue
            i = int(round((math.atan2(ly, lx) % (2 * math.pi)) / (2 * math.pi) * segs)) % segs
            R[j][i] = max(R[j][i], r)
        w = 1 - j / rows
        for i in range(segs):
            a = 2 * math.pi * i / segs
            base = math.hypot(bw * math.cos(a), bh * math.sin(a)) * 0.95
            R[j][i] = max(R[j][i], base * (1 - w ** 3) + meta['neckR'] * 1.1 * w ** 3)
    for _ in range(5):
        R = [[(R[j][(i - 1) % segs] + 2 * R[j][i] + R[j][(i + 1) % segs]) / 4 for i in range(segs)] for j in range(rows + 1)]
        R = [[(R[max(j - 1, 0)][i] + 2 * R[j][i] + R[min(j + 1, rows)][i]) / 4 for i in range(segs)] for j in range(rows + 1)]
    return {'P': P, 'F': F, 'R': R, 'segs': segs, 'rows': rows}


def shell_point(S, j, ang, extra=0.0):
    segs = S['segs']
    i = int(round((ang % (2 * math.pi)) / (2 * math.pi) * segs)) % segs
    r = S['R'][j][i] + extra
    return S['P'][j] + S['F'][j] @ Vector((r * math.cos(ang), r * math.sin(ang), 0))


def shell_normal(S, j, ang):
    return S['F'][j] @ Vector((math.cos(ang), math.sin(ang), 0))


def shell_mesh(name, S, gap):
    segs = S['segs']
    bm = bmesh.new()
    grid = []
    for j in range(S['rows'] + 1):
        grid.append([bm.verts.new(shell_point(S, j, 2 * math.pi * i / segs, gap)) for i in range(segs)])
    for j in range(len(grid) - 1):
        for i in range(segs):
            a, b = grid[j], grid[j + 1]
            bm.faces.new((a[i], a[(i + 1) % segs], b[(i + 1) % segs], b[i]))
    return new_obj(name, bm)


def rib_ring(name, S, j, gap, radius, material):
    segs = S['segs']
    bm = bmesh.new()
    ring = [bm.verts.new(shell_point(S, j, 2 * math.pi * i / segs, gap)) for i in range(segs)]
    for i in range(segs):
        bm.edges.new((ring[i], ring[(i + 1) % segs]))
    rb = new_obj(name, bm)
    rb.modifiers.new('sk', 'SKIN')
    for v in rb.data.skin_vertices[0].data:
        v.radius = (radius, radius)
    rb.data.materials.append(material)
    shade_smooth(rb, 1)
    return rb


def build_sweater(meta, pet_mesh, color='#c9a46c', color2='#efe6d4', stripes=0, name='sueter'):
    """Sueter de trico simples (tubo do tronco + gola e barra)."""
    S = torso_shell(meta, pet_mesh)
    gap = meta['hr'] * 0.07
    sw = shell_mesh(name, S, gap)
    sol = sw.modifiers.new('esp', 'SOLIDIFY')
    sol.thickness = meta['hr'] * 0.06
    sol.offset = 1.0
    sw.data.materials.append(mat_knit('trico_' + color, color, color2, stripes))
    shade_smooth(sw, 1)
    rib = mat_knit('canelado_' + color, color2 if stripes else color)
    return [sw, rib_ring(name + '_gola', S, 0, gap + meta['hr'] * 0.05, meta['hr'] * 0.1, rib),
            rib_ring(name + '_barra', S, S['rows'], gap + meta['hr'] * 0.05, meta['hr'] * 0.09, rib)]


def mat_pique(name, color):
    """Malha pique da polo em ceramica esmaltada: relevo de favo miudo sob verniz."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = hexcol(color)
    p.inputs['Roughness'].default_value = 0.28
    p.inputs['Coat Weight'].default_value = 1.0
    p.inputs['Coat Roughness'].default_value = 0.04
    tc = nt.nodes.new('ShaderNodeTexCoord')
    vor = nt.nodes.new('ShaderNodeTexVoronoi')
    vor.inputs['Scale'].default_value = 260
    nt.links.new(tc.outputs['Object'], vor.inputs['Vector'])
    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.18
    bump.inputs['Distance'].default_value = 0.001
    nt.links.new(vor.outputs['Distance'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], p.inputs['Normal'])
    return m


def build_polo(meta, pet_mesh, body='#f29bb5', trim='#2c5aa0', name='polo'):
    """Camisa polo: corpo rosa em pique, gola polo azul com abas, carcela com botoes de perola,
    mangas curtas com punho azul, barra azul e coracao bordado no peito."""
    hr = meta['hr']
    S = torso_shell(meta, pet_mesh)
    rows = S['rows']
    gap = hr * 0.1
    pique = mat_pique('pique_' + body, body)
    blue = mat_basic('polo_azul', trim, rough=0.16)
    pearl = mat_basic('perola', '#f6f1e7', rough=0.08)
    parts = []
    shirt = shell_mesh(name, S, gap)
    sol = shirt.modifiers.new('esp', 'SOLIDIFY')
    sol.thickness = hr * 0.05
    sol.offset = 1.0
    shirt.data.materials.append(pique)
    shade_smooth(shirt, 1)
    parts.append(shirt)
    # barra azul canelada
    parts.append(rib_ring(name + '_barra', S, rows, gap + hr * 0.05, hr * 0.085, blue))
    # gola: colarinho em pe (anel) + duas abas dobradas caindo sobre o peito
    parts.append(rib_ring(name + '_colarinho', S, 0, gap + hr * 0.06, hr * 0.09, blue))
    down = -math.pi / 2  # angulo do peito (parte de baixo/frente do tubo na regiao da gola)
    for sx in (1, -1):
        bm = bmesh.new()
        n = 6
        verts = []
        for k in range(n + 1):
            t = k / n
            ang = down + sx * (0.12 + 1.15 * t)
            top = shell_point(S, 0, ang, gap + hr * 0.14)
            j_tip = 3 if t < 0.5 else 2
            bot = shell_point(S, j_tip, down + sx * (0.08 + 0.75 * t), gap + hr * 0.1)
            if t == 0:
                bot = shell_point(S, 4, down + sx * 0.05, gap + hr * 0.1)  # ponta da aba
            verts.append((bm.verts.new(top), bm.verts.new(bot)))
        for k in range(n):
            a, b = verts[k], verts[k + 1]
            bm.faces.new((a[0], b[0], b[1], a[1]))
        flap = new_obj(name + '_aba', bm)
        s2 = flap.modifiers.new('esp', 'SOLIDIFY')
        s2.thickness = hr * 0.035
        flap.data.materials.append(blue)
        shade_smooth(flap, 1)
        parts.append(flap)
    # carcela + 2 botoes de perola descendo pelo peito
    for jj in (2, 4):
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=hr * 0.055)
        bt = new_obj(name + '_botao', bm)
        bt.scale.z = 0.6
        pos = shell_point(S, jj, down, gap + hr * 0.09)
        bt.location = pos
        bt.data.materials.append(pearl)
        shade_smooth(bt, 1)
        parts.append(bt)
    bm = bmesh.new()
    pts = [bm.verts.new(shell_point(S, jj, down, gap + hr * 0.035)) for jj in range(1, 6)]
    for a, b in zip(pts, pts[1:]):
        bm.edges.new((a, b))
    plk = new_obj(name + '_carcela', bm)
    plk.modifiers.new('sk', 'SKIN')
    for v in plk.data.skin_vertices[0].data:
        v.radius = (hr * 0.07, hr * 0.02)
    plk.data.materials.append(pique)
    shade_smooth(plk, 1)
    parts.append(plk)
    # coracao bordado no lado esquerdo do peito
    heart = build_heart(hr * 0.35, hr * 0.03, blue)
    hp = shell_point(S, 6, math.radians(215), gap + hr * 0.07)
    heart.location = hp
    nrm = shell_normal(S, 6, math.radians(215))
    heart.rotation_euler = nrm.to_track_quat('Z', 'Y').to_euler()
    parts.append(heart)
    # mangas curtas nas patas da frente
    arm = pet_mesh.find_armature()
    if arm:
        for bn in ('FL_up', 'FR_up'):
            b = arm.data.bones.get(bn)
            if not b:
                continue
            h = arm.matrix_world @ b.head_local
            t = arm.matrix_world @ b.tail_local
            axis = (t - h)
            leg_r = meta['bw'] * 0.42
            # raio real da perna perto do ombro
            sl_top = h - axis * 0.05
            sl_bot = h + axis * 0.5
            bm = bmesh.new()
            ring_top, ring_bot = [], []
            Rm = frame_from_axis(axis)
            for i in range(20):
                a = 2 * math.pi * i / 20
                d = Rm @ Vector((math.cos(a), math.sin(a), 0))
                ring_top.append(bm.verts.new(sl_top + d * (leg_r * 2.1)))
                ring_bot.append(bm.verts.new(sl_bot + d * (leg_r * 1.4)))
            for i in range(20):
                bm.faces.new((ring_top[i], ring_top[(i + 1) % 20], ring_bot[(i + 1) % 20], ring_bot[i]))
            sl = new_obj(name + '_manga', bm)
            s3 = sl.modifiers.new('esp', 'SOLIDIFY')
            s3.thickness = hr * 0.04
            sl.data.materials.append(pique)
            shade_smooth(sl, 1)
            parts.append(sl)
            bm = bmesh.new()
            cuff = []
            for i in range(20):
                a = 2 * math.pi * i / 20
                d = Rm @ Vector((math.cos(a), math.sin(a), 0))
                cuff.append(bm.verts.new(sl_bot + d * (leg_r * 1.45)))
            for i in range(20):
                bm.edges.new((cuff[i], cuff[(i + 1) % 20]))
            cf = new_obj(name + '_punho', bm)
            cf.modifiers.new('sk', 'SKIN')
            for v in cf.data.skin_vertices[0].data:
                v.radius = (hr * 0.06, hr * 0.06)
            cf.data.materials.append(blue)
            shade_smooth(cf, 1)
            parts.append(cf)
    return parts


def mat_crystal(name, tint='#ffffff'):
    """Strass: faceta espelhada (metal polido) + leve brilho proprio, para cintilar no jogo sem raytracing."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = hexcol(tint)
    p.inputs['Metallic'].default_value = 1.0
    p.inputs['Roughness'].default_value = 0.02
    p.inputs['Coat Weight'].default_value = 1.0
    p.inputs['Coat Roughness'].default_value = 0.0
    p.inputs['Emission Color'].default_value = hexcol(tint)
    p.inputs['Emission Strength'].default_value = 0.9
    return m


def build_gem(radius, material, setting):
    """Pedra lapidada (facetada, sombreamento chato) num engaste dourado."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=radius, radius2=radius * 0.55, depth=radius * 0.45)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, radius * 0.2))
    bm2 = bmesh.new()
    bmesh.ops.create_cone(bm2, cap_ends=True, segments=8, radius1=0.0, radius2=radius, depth=radius * 0.8)
    bmesh.ops.translate(bm2, verts=bm2.verts, vec=(0, 0, -radius * 0.42))
    me2 = bpy.data.meshes.new('pav')
    bm2.to_mesh(me2)
    bm2.free()
    bm.from_mesh(me2)
    bpy.data.meshes.remove(me2)
    g = new_obj('pedra', bm)
    g.data.materials.append(material)
    for f in g.data.polygons:
        f.use_smooth = False
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=radius * 1.12, radius2=radius * 1.12, depth=radius * 0.35)
    st = new_obj('engaste', bm)
    st.location.z = -radius * 0.05
    st.data.materials.append(setting)
    shade_smooth(st, 0)
    st.parent = g
    return g, st


def build_rhinestone_collar(meta, band='#f3c6d3', name='coleira-strass'):
    """Coleira cravejada: tira esmaltada coberta de pedras lapidadas em engastes dourados,
    alternando tamanhos, e um pingente de coracao de cristal na frente."""
    pos, Rf = neck_frame(meta)
    nr = meta['neckR'] * 1.05
    hr = meta['hr']
    w = hr * 0.30
    t = hr * 0.06
    parts = []
    strap = new_obj(name + '_tira', band_ring(nr, w, t))
    strap.data.materials.append(mat_basic('tira_' + band, band, rough=0.08))
    shade_smooth(strap, 1)
    parts.append(strap)
    gold = mat_basic('ouro', '#e0b84a', rough=0.06, metal=1.0)
    clear = mat_crystal('cristal', '#f2f5ff')
    pink = mat_crystal('cristal_rosa', '#ff8fb8')
    n = 18
    for i in range(n):
        a = 2 * math.pi * i / n
        big = i % 2 == 0
        r = w * (0.5 if big else 0.36)
        g, st = build_gem(r, clear if big else pink, gold)
        d = Vector((math.cos(a), math.sin(a), 0))
        g.location = d * (nr + t + r * 0.1)
        g.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
        parts += [g, st]
    # pingente: coracao de cristal pendurado na frente (-Y local = frente/baixo)
    bm = bmesh.new()
    bmesh.ops.create_circle(bm, cap_ends=False, radius=w * 0.3, segments=16)
    ring = new_obj(name + '_argola', bm)
    ring.modifiers.new('sk', 'SKIN')
    for v in ring.data.skin_vertices[0].data:
        v.radius = (t * 0.3, t * 0.3)
    ring.rotation_euler = (math.pi / 2, 0, 0)
    ring.location = (0, -(nr + t + w * 0.32), -w * 0.1)
    ring.data.materials.append(gold)
    shade_smooth(ring, 1)
    parts.append(ring)
    heart = build_pave_heart(w * 1.5, t * 1.4, gold)
    heart.location = (0, -(nr + t + w * 1.25), -w * 0.15)
    heart.rotation_euler = (math.radians(90), 0, 0)
    parts.append(heart)
    return group(parts, name, pos, Rf)


def mat_neon(name, color, strength):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = hexcol(color)
    p.inputs['Roughness'].default_value = 0.05
    p.inputs['Coat Weight'].default_value = 1.0
    p.inputs['Coat Roughness'].default_value = 0.0
    p.inputs['Emission Color'].default_value = hexcol(color)
    p.inputs['Emission Strength'].default_value = strength
    return m


def build_pave_heart(size, depth, setting):
    """Coracao pink neon cravejado: base esmaltada que brilha + pedrinhas lapidadas (pave) por cima,
    com contorno de engaste dourado."""
    glow = mat_neon('neon_pink', '#ff0a78', 1.1)
    stones = mat_neon('pave_pink', '#ff1f8f', 0.7)
    base = build_heart(size, depth, glow)
    # contorno dourado (o mesmo desenho do coracao, um pouco maior, atras)
    rim = build_heart(size * 1.12, depth * 0.6, setting)
    rim.parent = base
    rim.location.z = -depth * 0.25
    # pave: pedrinhas numa grade hexagonal dentro do coracao implicito (x^2+y^2-1)^3 - x^2 y^3 <= 0
    # (o coracao de build_heart tem ~0,94*size de largura; sc ajusta a escala do implicito a ele)
    sc = size * 0.41
    r = size * 0.07
    step = r * 2.1
    row = 0
    y = -1.1 * sc
    while y < 1.3 * sc:
        x = -1.2 * sc + (step / 2 if row % 2 else 0)
        while x < 1.2 * sc:
            u, v = x / sc, (y + size * 0.03) / sc
            if (u * u + v * v - 1) ** 3 - u * u * v ** 3 <= -0.03:
                g, st = build_gem(r, stones, setting)
                g.parent = base
                g.location = (x, y, depth + r * 0.15)
                st.hide_render = True
            x += step
        y += step * 0.87
        row += 1
    return base


def build_bandana(meta, base='#1f3556', line1='#efe6d4', line2='#b8453f', name='bandana'):
    """Bandana xadrez dobrada em triangulo, amarrada no pescoco com a ponta para a frente/baixo."""
    pos, R = neck_frame(meta, 0.35)
    nr = meta['neckR'] * 1.08
    hr = meta['hr']
    mat = mat_plaid('xadrez', base, line1, line2)
    parts = []
    # faixa no pescoco
    b = new_obj(name + '_faixa', band_ring(nr, hr * 0.22, hr * 0.03))
    b.data.materials.append(mat)
    shade_smooth(b, 1)
    parts.append(b)
    # triangulo: pano subdividido que cai pela frente (-Y local do frame = baixo)
    bm = bmesh.new()
    W = nr * 2.1
    H = nr * 1.7
    n = 10
    verts = {}
    uv_of = {}
    for j in range(n + 1):
        frac = j / n
        half = W / 2 * (1 - frac)
        cnt = max(1, int(round(n * (1 - frac))))
        for i in range(cnt + 1):
            u = (i / cnt) if cnt else 0.5
            x = -half + 2 * half * u
            ang = x / nr  # enrola em volta do pescoco
            px = nr * math.sin(ang)
            py = -nr * math.cos(ang) * 1.04 - H * frac * 0.55
            pz = -H * frac * 0.8
            verts[(j, i)] = bm.verts.new((px, py, pz))
            uv_of[(j, i)] = (0.5 + x / W, frac)
    for j in range(n):
        cnt = max(1, int(round(n * (1 - j / n))))
        cnt2 = max(1, int(round(n * (1 - (j + 1) / n))))
        for i in range(cnt):
            a, bb = verts[(j, i)], verts[(j, i + 1)]
            i2 = min(int(round(i * cnt2 / cnt)), cnt2)
            i3 = min(int(round((i + 1) * cnt2 / cnt)), cnt2)
            c1, c2 = verts[(j + 1, i2)], verts[(j + 1, i3)]
            if c1 is c2:
                bm.faces.new((a, bb, c1))
            else:
                bm.faces.new((a, bb, c2, c1))
    uvl = bm.loops.layers.uv.new('UVMap')
    inv = {v: k for k, v in verts.items()}
    for f in bm.faces:
        for lp in f.loops:
            lp[uvl].uv = uv_of[inv[lp.vert]]
    tri = new_obj(name + '_pano', bm)
    sol = tri.modifiers.new('sol', 'SOLIDIFY')
    sol.thickness = hr * 0.025
    tri.data.materials.append(mat)
    shade_smooth(tri, 1)
    parts.append(tri)
    # no lateral
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=hr * 0.12)
    k = new_obj(name + '_no', bm)
    k.location = (nr * 1.02, 0, 0)
    k.data.materials.append(mat_basic('bandana_no', base, rough=0.2))
    shade_smooth(k, 1)
    parts.append(k)
    return group(parts, name, pos, R)


def group(parts, name, pos, R):
    root = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(root)
    for p in parts:
        p.parent = root
    root.matrix_world = Matrix.Translation(pos) @ R.to_4x4()
    return [root] + parts


# ------------------------------------------------------------------ pet + render

def load_pet(breed, coat_id=None):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(PETS_DIR, breed['file']))
    new = [o for o in bpy.data.objects if o not in before]
    for o in new:
        if o.type == 'MESH' and o.name.lower().startswith('icosphere'):
            bpy.data.objects.remove(o)
    mesh = next(o for o in bpy.data.objects if o.type == 'MESH' and o.name == breed['id'])
    arm = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)
    coat = next((c for c in breed['coats'] if c['id'] == coat_id), breed['coats'][0])
    cols = coat['colors']
    for slot in mesh.material_slots:
        m = slot.material
        if not m:
            continue
        m.use_nodes = True
        p = m.node_tree.nodes.get('Principled BSDF')
        key = m.name.split('.')[0]
        if p and key in cols:
            p.inputs['Base Color'].default_value = hexcol(cols[key])
            # o pet tambem e ceramica esmaltada, como no jogo
            p.inputs['Roughness'].default_value = 0.12 if key in ('eye', 'nose', 'glint') else 0.32
            p.inputs['Coat Weight'].default_value = 0.6
            p.inputs['Coat Roughness'].default_value = 0.06
    if arm and arm.animation_data:
        arm.animation_data.action = bpy.data.actions.get('idle')
        bpy.context.scene.frame_set(1)
    return mesh, arm


def studio(res):
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE'
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.image_settings.file_format = 'PNG'
    try:
        sc.eevee.taa_render_samples = 48
    except Exception:
        pass
    sc.view_settings.view_transform = 'AgX'
    try:
        sc.view_settings.look = 'AgX - Punchy'
    except Exception:
        pass
    try:
        sc.eevee.use_raytracing = True
    except Exception:
        pass
    w = bpy.data.worlds.new('w')
    sc.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bg.inputs[0].default_value = hexcol('#e9e3dc')
    bg.inputs[1].default_value = 0.9
    # gradiente vertical claro/escuro: da contraste aos reflexos de ceramica, metal e strass
    nt = w.node_tree
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Generated'], sep.inputs[0])
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.45
    ramp.color_ramp.elements[0].color = hexcol('#7d7570')
    ramp.color_ramp.elements[1].position = 0.62
    ramp.color_ramp.elements[1].color = hexcol('#fbf7f2')
    nt.links.new(sep.outputs['Z'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], bg.inputs[0])
    bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 0, 0))
    fl = bpy.context.object
    fl.data.materials.append(mat_basic('chao', '#d8d0c6', rough=0.95))
    for loc, en, col in (((1.2, -1.8, 1.9), 140, '#fff4e6'), ((-1.8, -0.6, 1.2), 55, '#e6eeff'), ((0.2, 1.6, 1.4), 60, '#ffffff')):
        bpy.ops.object.light_add(type='AREA', location=loc)
        lt = bpy.context.object
        lt.data.energy = en
        lt.data.size = 1.6
        lt.data.color = hexcol(col)[:3]
        lt.rotation_euler = (Vector((0, -0.1, 0.22)) - lt.location).to_track_quat('-Z', 'Y').to_euler()


def camera(target, dist, yaw_deg, pitch_deg, lens=70):
    cam = bpy.data.objects.get('cam')
    if not cam:
        cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
        bpy.context.collection.objects.link(cam)
    cam.data.lens = lens
    yaw, pitch = math.radians(yaw_deg), math.radians(pitch_deg)
    off = Vector((math.sin(yaw) * math.cos(pitch), -math.cos(yaw) * math.cos(pitch), math.sin(pitch))) * dist
    cam.location = Vector(target) + off
    cam.rotation_euler = (Vector(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.camera = cam


def render(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print('SALVO', path)


ACCS = {
    'nada': lambda meta, mesh: [],
    'coleira': lambda meta, mesh: build_collar(meta),
    'coleira-strass': lambda meta, mesh: build_rhinestone_collar(meta),
    'polo': lambda meta, mesh: build_polo(meta, mesh),
    'laco': lambda meta, mesh: build_bow(meta),
    'sueter': lambda meta, mesh: build_sweater(meta, mesh, color='#2f4a3a', color2='#efe6d4', stripes=0),
    'sueter-listrado': lambda meta, mesh: build_sweater(meta, mesh, color='#1f3556', color2='#efe6d4', stripes=260),
    'bandana': lambda meta, mesh: build_bandana(meta),
}


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    args = dict(zip(argv[::2], argv[1::2]))
    breeds = args.get('--breeds', 'poodle').split(',')
    accs = args.get('--accs', ','.join(ACCS)).split(',')
    out = args.get('--out', '/tmp/pet_acc')
    coat = args.get('--coat')
    os.makedirs(out, exist_ok=True)
    data = json.load(open(os.path.join(PETS_DIR, 'pets.json')))
    by_id = {b['id']: b for b in data['breeds']}
    for bid in breeds:
        for acc in accs:
            bpy.ops.wm.read_factory_settings(use_empty=True)
            breed = by_id[bid]
            meta = breed['meta']
            mesh, arm = load_pet(breed, coat)
            studio((900, 900))
            made = ACCS[acc](meta, mesh)
            tgt = g2b((0, meta['height'] * 0.55, meta['L'] * 0.25))
            d = meta['height'] * 3.1
            camera(tgt, d, 35, 14)
            render(os.path.join(out, f'{bid}_{acc}_34.png'))
            if acc in ('laco',):
                camera(g2b(meta['hc']), meta['hr'] * 7, 20, 22, lens=85)
            elif acc == 'coleira-strass':
                camera(g2b(meta['n0']) + Vector((0, -meta['neckR'], 0)), meta['hr'] * 6.5, 0, 8, lens=85)
            elif acc in ('coleira', 'bandana'):
                camera(g2b(meta['hn']), meta['hr'] * 6.5, 0, 6, lens=85)
            elif acc == 'nada':
                camera(g2b(meta['hc']), meta['hr'] * 6.5, 15, 10, lens=85)
            else:
                camera(tgt, d, 90, 10)
            render(os.path.join(out, f'{bid}_{acc}_detalhe.png'))


if __name__ == '__main__':
    main()

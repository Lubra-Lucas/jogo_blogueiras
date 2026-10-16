"""ESTUDO: poste de rua (lamp_post) ultrarrealista vs versao atual do jogo.
Uso: blender -b --factory-startup -noaudio --python item_lamp.py -- <game|real> <saida.png> [samples] [cpu]
Nao toca em nada do jogo: so le public/assets/city/kit/lamp_post.glb.
"""
import bpy, bmesh, math, os, sys, random
from math import pi, cos, sin
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

A = args()
MODE, OUT = A[0], A[1]
SAMPLES = int(A[2]) if len(A) > 2 else 256
GPU = not (len(A) > 3 and A[3] == "cpu")
REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
random.seed(7)
reset()
sc = bpy.context.scene


def link(o):
    sc.collection.objects.link(o)
    return o


# ------------------------------------------------------------------ geometria
def lathe(profile, n=96, flute=None, name="lathe"):
    """profile = [(r,z)...]; flute=(count, depth, z0, z1) modula o raio (caneluras)."""
    bm = bmesh.new()
    rings = []
    for (r, z) in profile:
        if r < 1e-5:
            ring = [bm.verts.new((0, 0, z))]
        else:
            ring = []
            for i in range(n):
                a = 2 * pi * i / n
                rr = r
                if flute:
                    cnt, dep, z0, z1 = flute
                    w = max(0.0, min(1.0, (z - z0) / .05, (z1 - z) / .05))
                    rr = r - dep * w * (0.5 + 0.5 * cos(cnt * a))
                ring.append(bm.verts.new((rr * cos(a), rr * sin(a), z)))
        rings.append(ring)
    for k in range(len(rings) - 1):
        a, b = rings[k], rings[k + 1]
        for i in range(n):
            j = (i + 1) % n
            if len(a) == 1 and len(b) == 1:
                continue
            if len(a) == 1:
                bm.faces.new((a[0], b[j], b[i]))
            elif len(b) == 1:
                bm.faces.new((a[i], a[j], b[0]))
            else:
                bm.faces.new((a[i], a[j], b[j], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    link(o)
    return o


def smooth(o, ang=38, bevel=0.0035):
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    if bevel:
        m = o.modifiers.new("bv", "BEVEL")
        m.width = bevel
        m.segments = 2
        m.limit_method = "ANGLE"
        m.angle_limit = math.radians(25)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(ang))
    o.select_set(False)


def sphere(r, loc, scale=(1, 1, 1), seg=64, name="sph"):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=r)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    link(o)
    o.location = loc
    o.scale = scale
    for p in me.polygons:
        p.use_smooth = True
    return o


def box(size, loc, bevel=.015, name="box"):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    link(o)
    o.scale = size
    o.location = loc
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.transform_apply(scale=True)
    o.select_set(False)
    m = o.modifiers.new("bv", "BEVEL")
    m.width = bevel
    m.segments = 4
    m.limit_method = "ANGLE"
    for p in me.polygons:
        p.use_smooth = True
    return o


def curve_tube(pts, rad0, rad1, bevel_depth, res=8, name="arm"):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = bevel_depth
    cu.bevel_resolution = res
    cu.use_fill_caps = True
    sp = cu.splines.new("POLY")
    sp.points.add(len(pts) - 1)
    for i, p in enumerate(pts):
        sp.points[i].co = (p[0], p[1], p[2], 1)
        t = i / (len(pts) - 1)
        sp.points[i].radius = rad0 + (rad1 - rad0) * (t ** 0.9)
    o = bpy.data.objects.new(name, cu)
    link(o)
    return o


def spiral(cx, cz, r0, r1, a0, turns, n=90, ccw=True):
    out = []
    for i in range(n + 1):
        t = i / n
        a = a0 + (1 if ccw else -1) * turns * 2 * pi * t
        r = r0 + (r1 - r0) * t
        out.append((cx + r * cos(a), 0, cz + r * sin(a)))
    return out


# ------------------------------------------------------------------ materiais
def mul(nb, a, b=None, v=None, clamp=False):
    n = nb.add("ShaderNodeMath", operation="MULTIPLY", use_clamp=clamp)
    nb.link(a[0], a[1], n, 0)
    if b is not None:
        nb.link(b[0], b[1], n, 1)
    else:
        n.inputs[1].default_value = v
    return (n, 0)


def edge_wear(nb, radius=.006, gain=18.0):
    """mascara de borda: 1 onde a normal com bevel diverge da normal real."""
    bv = nb.add("ShaderNodeBevel", inputs={"Radius": radius})
    geo = nb.add("ShaderNodeNewGeometry")
    dot = nb.add("ShaderNodeVectorMath", operation="DOT_PRODUCT")
    nb.link(bv, "Normal", dot, 0)
    nb.link(geo, "Normal", dot, 1)
    inv = nb.add("ShaderNodeMath", operation="SUBTRACT", inputs={0: 1.0})
    nb.link(dot, "Value", inv, 1)
    return mul(nb, (inv, 0), v=gain, clamp=True)


def mat_iron():
    m = new_mat("cast_iron_worn")
    nb = NB(m)
    tc = nb.add("ShaderNodeTexCoord")

    def noise(scale, det=8, rough=.6):
        n = nb.add("ShaderNodeTexNoise", inputs={"Scale": scale, "Detail": det, "Roughness": rough})
        nb.link(tc, "Object", n, "Vector")
        return n

    n1, n2, n3, n4, n5 = noise(2.2), noise(40, 10, .7), noise(18, 6), noise(7), noise(9, 7)
    patch = color_ramp(nb, n1.outputs[0], [(0.52, (0, 0, 0, 1)), (0.62, (1, 1, 1, 1))])
    flake = color_ramp(nb, n2.outputs[0], [(0.45, (0, 0, 0, 1)), (0.6, (1, 1, 1, 1))])
    peel = mul(nb, (patch, 0), (flake, 0), clamp=True)
    wear = edge_wear(nb)
    wear_n = mul(nb, (n3, 0), v=2.2, clamp=True)
    wear_m = mul(nb, wear, wear_n, clamp=True)
    bare = nb.add("ShaderNodeMath", operation="MAXIMUM", use_clamp=True)
    nb.link(*wear_m, bare, 0); nb.link(*peel, bare, 1)
    rustv = color_ramp(nb, n4.outputs[0], [(0.4, (0, 0, 0, 1)), (0.6, (1, 1, 1, 1))])
    rust = mul(nb, (bare, 0), (rustv, 0), clamp=True)
    pcol = nb.add("ShaderNodeMix", data_type="RGBA")
    pcol.inputs[6].default_value = srgb("#0f1a15"); pcol.inputs[7].default_value = srgb("#070d0a")
    nb.link(n3, 0, pcol, 0)
    rustc = nb.add("ShaderNodeMix", data_type="RGBA")
    rustc.inputs[6].default_value = srgb("#5c3217"); rustc.inputs[7].default_value = srgb("#8a4e22")
    nb.link(n4, 0, rustc, 0)
    c1 = nb.add("ShaderNodeMix", data_type="RGBA"); c1.inputs[7].default_value = srgb("#4a4744")
    nb.link(bare, 0, c1, 0); nb.link(pcol, 2, c1, 6)
    c2 = nb.add("ShaderNodeMix", data_type="RGBA")
    nb.link(*rust, c2, 0); nb.link(c1, 2, c2, 6); nb.link(rustc, 2, c2, 7)
    # sujeira: mais embaixo e em faces voltadas pra cima
    geo = nb.add("ShaderNodeNewGeometry")
    sep = nb.add("ShaderNodeSeparateXYZ"); nb.link(geo, "Normal", sep, 0)
    sepz = nb.add("ShaderNodeSeparateXYZ"); nb.link(tc, "Object", sepz, 0)
    low = nb.add("ShaderNodeMapRange", inputs={1: 0.1, 2: 1.4, 3: 0.55, 4: 0.0}, use_clamp=True)
    nb.link(sepz, "Z", low, 0)
    n5s = mul(nb, (n5, 0), v=1.6)
    dm = mul(nb, (low, 0), n5s, clamp=True)
    up = mul(nb, (sep, "Z"), v=.12, clamp=True)
    dm2 = nb.add("ShaderNodeMath", operation="ADD", use_clamp=True)
    nb.link(*dm, dm2, 0); nb.link(*up, dm2, 1)
    c3 = nb.add("ShaderNodeMix", data_type="RGBA"); c3.inputs[7].default_value = srgb("#3a352c")
    nb.link(dm2, 0, c3, 0); nb.link(c2, 2, c3, 6)
    # rugosidade
    r_p = nb.add("ShaderNodeMath", operation="ADD", inputs={1: .2}); nb.link(n3, 0, r_p, 0)
    rr = nb.add("ShaderNodeMix", data_type="FLOAT"); rr.inputs[3].default_value = .5
    nb.link(bare, 0, rr, 0); nb.link(r_p, 0, rr, 2)
    rr2 = nb.add("ShaderNodeMix", data_type="FLOAT"); rr2.inputs[3].default_value = .85
    nb.link(*rust, rr2, 0); nb.link(rr, 0, rr2, 2)
    sub = mul(nb, (dm2, 0), v=.8)
    rr3 = nb.add("ShaderNodeMath", operation="MAXIMUM", use_clamp=True)
    nb.link(rr2, 0, rr3, 0); nb.link(*sub, rr3, 1)
    inv_rust = nb.add("ShaderNodeMath", operation="SUBTRACT", inputs={0: 1.0}); nb.link(*rust, inv_rust, 1)
    mtb = mul(nb, (bare, 0), (inv_rust, 0), clamp=True)
    # bump: grao de fundicao + riscos
    b1 = noise(260, 3, .7)
    b2 = noise(35, 6, .7)
    mp2 = nb.add("ShaderNodeMapping"); mp2.inputs["Scale"].default_value = (500, 500, 6)
    nb.link(tc, "Object", mp2, "Vector")
    b3 = nb.add("ShaderNodeTexNoise", inputs={"Scale": 1.0, "Detail": 2, "Roughness": .5})
    nb.link(mp2, 0, b3, "Vector")
    scr = color_ramp(nb, b3.outputs[0], [(0.58, (0, 0, 0, 1)), (0.63, (1, 1, 1, 1))])
    h1 = mul(nb, (b1, 0), v=.5)
    h2 = nb.add("ShaderNodeMath", operation="ADD"); nb.link(*h1, h2, 0); nb.link(b2, 0, h2, 1)
    h3 = nb.add("ShaderNodeMath", operation="ADD"); nb.link(h2, 0, h3, 0); nb.link(scr, 0, h3, 1)
    bump = nb.add("ShaderNodeBump", inputs={"Strength": .6, "Distance": .006})
    nb.link(h3, 0, bump, "Height")
    bsdf = nb.add("ShaderNodeBsdfPrincipled")
    nb.link(c3, 2, bsdf, "Base Color")
    nb.link(rr3, 0, bsdf, "Roughness")
    nb.link(*mtb, bsdf, "Metallic")
    nb.link(bump, "Normal", bsdf, "Normal")
    nb.out(bsdf)
    return m


def mat_brass():
    m = new_mat("aged_brass")
    nb = NB(m)
    tc = nb.add("ShaderNodeTexCoord")
    n1 = nb.add("ShaderNodeTexNoise", inputs={"Scale": 14, "Detail": 8, "Roughness": .6})
    nb.link(tc, "Object", n1, "Vector")
    n2 = nb.add("ShaderNodeTexNoise", inputs={"Scale": 160, "Detail": 4})
    nb.link(tc, "Object", n2, "Vector")
    col = color_ramp(nb, n1.outputs[0], [(0.35, srgb("#7a5a22")), (0.55, srgb("#a8812f")), (0.7, srgb("#4a3b1b"))])
    vd = color_ramp(nb, n1.outputs[0], [(0.62, (0, 0, 0, 1)), (0.74, (1, 1, 1, 1))])
    mx = nb.add("ShaderNodeMix", data_type="RGBA"); mx.inputs[7].default_value = srgb("#3f6b57")
    nb.link(vd, 0, mx, 0); nb.link(col, 0, mx, 6)
    rg = nb.add("ShaderNodeMath", operation="MULTIPLY_ADD", inputs={1: .35, 2: .28})
    nb.link(n2, 0, rg, 0)
    mt = nb.add("ShaderNodeMath", operation="SUBTRACT", inputs={0: 1.0})
    nb.link(vd, 0, mt, 1)
    bump = nb.add("ShaderNodeBump", inputs={"Strength": .15, "Distance": .002})
    nb.link(n2, 0, bump, "Height")
    b = nb.add("ShaderNodeBsdfPrincipled")
    nb.link(mx, 2, b, "Base Color"); nb.link(rg, 0, b, "Roughness"); nb.link(mt, 0, b, "Metallic")
    nb.link(bump, "Normal", b, "Normal")
    nb.out(b)
    return m


def mat_glass():
    m = new_mat("opal_glass")
    nb = NB(m)
    b = nb.add("ShaderNodeBsdfPrincipled", inputs={"Roughness": .12, "IOR": 1.5})
    b.inputs["Base Color"].default_value = srgb("#c9c3b8")
    b.inputs["Subsurface Weight"].default_value = .6
    b.inputs["Subsurface Radius"].default_value = (.25, .2, .15)
    b.inputs["Subsurface Scale"].default_value = .08
    b.inputs["Emission Color"].default_value = srgb("#ffd9a0")
    b.inputs["Emission Strength"].default_value = 0.22
    b.inputs["Transmission Weight"].default_value = .25
    nb.out(b)
    return m


def mat_stone():
    m = new_mat("weathered_concrete")
    nb = NB(m)
    tc = nb.add("ShaderNodeTexCoord")

    def noise(scale, det=8, rough=.6):
        n = nb.add("ShaderNodeTexNoise", inputs={"Scale": scale, "Detail": det, "Roughness": rough})
        nb.link(tc, "Object", n, "Vector")
        return n

    n1, n2, n3 = noise(5, 9), noise(90, 8, .75), noise(11, 8)
    vor = nb.add("ShaderNodeTexVoronoi", inputs={"Scale": 140, "Randomness": 1.0}, feature="DISTANCE_TO_EDGE")
    nb.link(tc, "Object", vor, "Vector")
    pits = color_ramp(nb, vor.outputs[0], [(0.0, (1, 1, 1, 1)), (0.07, (0, 0, 0, 1))])
    base = color_ramp(nb, n1.outputs[0], [(0.35, srgb("#8d8a82")), (0.6, srgb("#a8a499")), (0.75, srgb("#7b776d"))])
    mixp = nb.add("ShaderNodeMix", data_type="RGBA"); mixp.inputs[7].default_value = srgb("#3c3a35")
    pm = mul(nb, (pits, 0), v=.7)
    nb.link(*pm, mixp, 0); nb.link(base, 0, mixp, 6)
    geo = nb.add("ShaderNodeNewGeometry")
    sep = nb.add("ShaderNodeSeparateXYZ"); nb.link(geo, "Normal", sep, 0)
    sepp = nb.add("ShaderNodeSeparateXYZ"); nb.link(tc, "Object", sepp, 0)
    upm = nb.add("ShaderNodeMapRange", inputs={1: .2, 2: .95, 3: 0, 4: 1}, use_clamp=True)
    nb.link(sep, "Z", upm, 0)
    edgeb = nb.add("ShaderNodeMapRange", inputs={1: -.02, 2: .1, 3: 1, 4: 0}, use_clamp=True)
    # (object coords: plinto tem origem em z=.09; base fica em z=-.09)
    off = nb.add("ShaderNodeMath", operation="ADD", inputs={1: .09}); nb.link(sepp, "Z", off, 0)
    nb.link(off, 0, edgeb, 0)
    m1 = nb.add("ShaderNodeMath", operation="ADD", use_clamp=True)
    nb.link(upm, 0, m1, 0); nb.link(edgeb, 0, m1, 1)
    nm = nb.add("ShaderNodeMath", operation="MULTIPLY_ADD", inputs={1: 2.4, 2: -0.95})
    nb.link(n3, 0, nm, 0)
    moss_m = mul(nb, (m1, 0), (nm, 0), clamp=True)
    moss_hard = color_ramp(nb, moss_m[0].outputs[0], [(0.02, (0, 0, 0, 1)), (0.3, (1, 1, 1, 1))])
    mc = color_ramp(nb, n2.outputs[0], [(0.3, srgb("#2f4a1a")), (0.6, srgb("#587a2c"))])
    mix2 = nb.add("ShaderNodeMix", data_type="RGBA")
    nb.link(moss_hard, 0, mix2, 0); nb.link(mixp, 2, mix2, 6); nb.link(mc, 0, mix2, 7)
    rg = nb.add("ShaderNodeMath", operation="MULTIPLY_ADD", inputs={1: .25, 2: .65}); nb.link(n2, 0, rg, 0)
    rmoss = nb.add("ShaderNodeMix", data_type="FLOAT"); rmoss.inputs[3].default_value = .95
    nb.link(moss_hard, 0, rmoss, 0); nb.link(rg, 0, rmoss, 2)
    hh2 = nb.add("ShaderNodeMath", operation="MULTIPLY_ADD", inputs={1: -1.0}); nb.link(pits, 0, hh2, 0)
    hh3 = nb.add("ShaderNodeMath", operation="ADD"); nb.link(n2, 0, hh3, 0); nb.link(hh2, 0, hh3, 1)
    bump = nb.add("ShaderNodeBump", inputs={"Strength": .6, "Distance": .01})
    nb.link(hh3, 0, bump, "Height")
    b = nb.add("ShaderNodeBsdfPrincipled", inputs={"Specular IOR Level": .3})
    nb.link(mix2, 2, b, "Base Color"); nb.link(rmoss, 0, b, "Roughness"); nb.link(bump, "Normal", b, "Normal")
    nb.out(b)
    return m


def mat_paving():
    m = new_mat("paving_slabs")
    nb = NB(m)
    tc = nb.add("ShaderNodeTexCoord")
    mp = nb.add("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1 / .6, 1 / .6, 1 / .6)
    nb.link(tc, "Object", mp, "Vector")
    br = nb.add("ShaderNodeTexBrick", inputs={"Scale": 1.0, "Mortar Size": .018, "Mortar Smooth": .1, "Bias": 0,
                                               "Brick Width": 1.0, "Row Height": 1.0}, offset=0.0, squash=1.0)
    br.inputs["Color1"].default_value = srgb("#8f8b82")
    br.inputs["Color2"].default_value = srgb("#6e6a62")
    br.inputs["Mortar"].default_value = srgb("#2f2c27")
    nb.link(mp, 0, br, "Vector")

    def noise(scale, det=8, rough=.6):
        n = nb.add("ShaderNodeTexNoise", inputs={"Scale": scale, "Detail": det, "Roughness": rough})
        nb.link(tc, "Object", n, "Vector")
        return n

    n1, n2, n3 = noise(3), noise(120, 8, .7), noise(25)
    dirt = color_ramp(nb, n1.outputs[0], [(0.35, srgb("#ffffff")), (0.7, srgb("#8f8a7c"))])
    mulc = nb.add("ShaderNodeMix", data_type="RGBA", blend_type="MULTIPLY"); mulc.inputs[0].default_value = 1.0
    nb.link(br, "Color", mulc, 6); nb.link(dirt, 0, mulc, 7)
    jm = nb.add("ShaderNodeMath", operation="SUBTRACT", inputs={0: 1.0}); nb.link(br, "Fac", jm, 0); jm.operation = "ADD"; jm.inputs[1].default_value = 0.0
    jbig = color_ramp(nb, jm.outputs[0], [(0.0, (0, 0, 0, 1)), (0.5, (1, 1, 1, 1))])
    mm = mul(nb, (n3, 0), v=3.0, clamp=True)
    moss = mul(nb, (jbig, 0), mm, clamp=True)
    mcol = nb.add("ShaderNodeMix", data_type="RGBA"); mcol.inputs[7].default_value = srgb("#3d5a22")
    nb.link(*moss, mcol, 0); nb.link(mulc, 2, mcol, 6)
    hj = color_ramp(nb, br.outputs[1], [(0.0, (0, 0, 0, 1)), (0.7, (1, 1, 1, 1))])
    hh = mul(nb, (n2, 0), v=.15)
    hs = nb.add("ShaderNodeMath", operation="ADD"); nb.link(hj, 0, hs, 0); nb.link(*hh, hs, 1)
    bump = nb.add("ShaderNodeBump", inputs={"Strength": 1.0, "Distance": .02}); nb.link(hs, 0, bump, "Height")
    rg = nb.add("ShaderNodeMath", operation="MULTIPLY_ADD", inputs={1: .2, 2: .7}); nb.link(n2, 0, rg, 0)
    geo = nb.add("ShaderNodeNewGeometry")
    dst = nb.add("ShaderNodeVectorMath", operation="LENGTH"); nb.link(geo, "Position", dst, 0)
    gm = nb.add("ShaderNodeMapRange", inputs={1: 16, 2: 30, 3: 0, 4: 1}, use_clamp=True); nb.link(dst, "Value", gm, 0)
    gcol = color_ramp(nb, n3.outputs[0], [(0.3, srgb("#34481f")), (0.7, srgb("#566f2e"))])
    fin = nb.add("ShaderNodeMix", data_type="RGBA"); nb.link(gm, 0, fin, 0); nb.link(mcol, 2, fin, 6); nb.link(gcol, 0, fin, 7)
    b = nb.add("ShaderNodeBsdfPrincipled", inputs={"Specular IOR Level": .35})
    nb.link(fin, 2, b, "Base Color"); nb.link(rg, 0, b, "Roughness"); nb.link(bump, "Normal", b, "Normal")
    nb.out(b)
    return m


def mat_game_ground():
    m = new_mat("flat_ground")
    nb = NB(m)
    b = nb.add("ShaderNodeBsdfPrincipled", inputs={"Roughness": .9})
    b.inputs["Base Color"].default_value = srgb("#8d877e")
    nb.out(b)
    return m


# ------------------------------------------------------------------ cena
def ground(mat, size=120):
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=size / 2)
    me = bpy.data.meshes.new("ground")
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new("ground", me); link(o)
    me.materials.append(mat)
    return o



def mat_brick():
    m = new_mat("old_brick")
    nb = NB(m)
    tc = nb.add("ShaderNodeTexCoord")
    mp = nb.add("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1 / .22, 1 / .22, 1 / .22)
    nb.link(tc, "Object", mp, "Vector")
    br = nb.add("ShaderNodeTexBrick", inputs={"Scale": 1.0, "Mortar Size": .02, "Mortar Smooth": .1, "Bias": 0,
                                               "Brick Width": 2.0, "Row Height": 0.6}, offset=0.5, squash=1.0)
    br.inputs["Color1"].default_value = srgb("#8a4a36"); br.inputs["Color2"].default_value = srgb("#a8664a")
    br.inputs["Mortar"].default_value = srgb("#a39a8a")
    nb.link(mp, 0, br, "Vector")
    n = nb.add("ShaderNodeTexNoise", inputs={"Scale": 60, "Detail": 8}); nb.link(tc, "Object", n, "Vector")
    hj = color_ramp(nb, br.outputs[1], [(0.0, (0, 0, 0, 1)), (0.6, (1, 1, 1, 1))])
    bump = nb.add("ShaderNodeBump", inputs={"Strength": .8, "Distance": .03}); nb.link(hj, 0, bump, "Height")
    b = nb.add("ShaderNodeBsdfPrincipled", inputs={"Roughness": .85})
    nb.link(br, "Color", b, "Base Color"); nb.link(bump, "Normal", b, "Normal")
    nb.out(b)
    return m


def mat_leaves():
    m = new_mat("foliage")
    nb = NB(m)
    tc = nb.add("ShaderNodeTexCoord")
    n = nb.add("ShaderNodeTexNoise", inputs={"Scale": .5, "Detail": 6}); nb.link(tc, "Object", n, "Vector")
    v = nb.add("ShaderNodeTexNoise", inputs={"Scale": 9.0, "Detail": 10, "Roughness": .8}); nb.link(tc, "Object", v, "Vector")
    c1 = color_ramp(nb, n.outputs[0], [(0.3, srgb("#1c3314")), (0.6, srgb("#3a5a20")), (0.8, srgb("#5f7a2c"))])
    mx = nb.add("ShaderNodeMix", data_type="RGBA", blend_type="MULTIPLY"); mx.inputs[0].default_value = 1.0
    c2 = color_ramp(nb, v.outputs[0], [(0.25, srgb("#505050")), (0.7, srgb("#d0d0d0"))])
    nb.link(c1, 0, mx, 6); nb.link(c2, 0, mx, 7)
    lp = nb.add("ShaderNodeLightPath")
    am = nb.add("ShaderNodeMapRange", inputs={1: 40, 2: 250, 3: 0, 4: .5}, use_clamp=True); nb.link(lp, "Ray Length", am, 0)
    hz = nb.add("ShaderNodeMix", data_type="RGBA"); hz.inputs[7].default_value = srgb("#9db6cc")
    nb.link(am, 0, hz, 0); nb.link(mx, 2, hz, 6)
    b = nb.add("ShaderNodeBsdfPrincipled", inputs={"Roughness": .6})
    nb.link(hz, 2, b, "Base Color"); nb.out(b)
    return m


def blob(r, loc, scale, mat, strength=1.8, tex_size=3.0, name="tree"):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=5, radius=r)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); link(o)
    o.location = loc; o.scale = scale
    for p in me.polygons:
        p.use_smooth = True
    t = bpy.data.textures.new(name + "_t", "CLOUDS")
    t.noise_scale = tex_size; t.noise_depth = 4
    d = o.modifiers.new("disp", "DISPLACE"); d.texture = t; d.strength = strength; d.mid_level = .4
    me.materials.append(mat)
    return o


def backdrop():
    lv = mat_leaves()
    # copas distantes (desfocadas) + sebe baixa
    for i, x in enumerate(range(-60, 61, 9)):
        blob(2.2, (x + 2, 18, .85), (2.6, 1, .75), lv, strength=.5, tex_size=.8, name="hedge%d" % i)


def build_real():
    iron, brass, glass, stone = mat_iron(), mat_brass(), mat_glass(), mat_stone()
    ground(mat_paving())
    pl = box((.95, .95, .2), (0, 0, .09), bevel=.02, name="plinth")
    pl.data.materials.append(stone)
    z0 = .19  # topo do plinto
    prof = [(0, z0), (.40, z0), (.405, z0 + .03), (.385, z0 + .05), (.385, z0 + .10), (.36, z0 + .13), (.355, z0 + .16),
            (.33, z0 + .19), (.29, z0 + .30), (.25, z0 + .45), (.215, z0 + .62), (.19, z0 + .80), (.178, z0 + .92),
            (.2, z0 + .94), (.225, z0 + .97), (.225, z0 + 1.01), (.19, z0 + 1.03), (.15, z0 + 1.06), (.115, z0 + 1.10),
            (.1, z0 + 1.16), (.092, z0 + 1.4)]
    zt = 3.52
    for i in range(1, 21):
        t = i / 20
        prof.append((.092 - .03 * t, z0 + 1.4 + (zt - z0 - 1.4) * t))
    prof += [(.058, zt + .02), (.0, zt + .02)]
    body = lathe(prof, n=120, flute=(14, .034, z0 + .30, z0 + .88), name="iron_body")
    body.data.materials.append(iron); smooth(body)

    # placa de acesso + parafusos de ancoragem (detalhe de poste real)
    plate = box((.17, .03, .34), (0, -.228, z0 + .42), bevel=.006, name="hatch")
    plate.rotation_euler = (-0.085, 0, 0)
    plate.data.materials.append(iron)
    for sx, sy in ((.44, 0), (-.44, 0), (0, .44), (0, -.44)):
        bolt = lathe([(0, z0), (.05, z0), (.05, z0 + .012), (.032, z0 + .014), (.032, z0 + .05), (.0, z0 + .05)], n=6, name="bolt")
        bolt.location = (sx, sy, 0); bolt.data.materials.append(iron); smooth(bolt, 60, .0015)

    def brass_part(p, n=64, name="brass", ang=45, bev=.002):
        o = lathe(p, n=n, name=name); o.data.materials.append(brass); smooth(o, ang, bev)
        return o

    for z, r in ((1.45, .13), (2.18, .115), (3.0, .105)):
        h = .09
        brass_part([(0, z - h), (r * .9, z - h), (r, z - h * .5), (r * 1.08, z), (r, z + h * .5), (r * .9, z + h), (0, z + h)], name="ring")
    brass_part([(0, 2.34), (.12, 2.34), (.15, 2.37), (.16, 2.42), (.15, 2.48), (.12, 2.52), (0, 2.52)], name="collar")
    brass_part([(0, 3.5), (.12, 3.5), (.2, 3.52), (.25, 3.57), (.26, 3.62), (.22, 3.66), (.19, 3.69), (0, 3.69)], n=96, name="cup", bev=.003)
    g = sphere(.34, (0, 0, 3.99), (1, 1, 1.06), seg=96, name="globe_top"); g.data.materials.append(glass)
    brass_part([(0, 4.29), (.2, 4.28), (.25, 4.30), (.26, 4.34), (.2, 4.38), (.14, 4.44), (.09, 4.52), (.06, 4.56), (.075, 4.6), (.05, 4.66), (0, 4.68)], n=96, name="cap", bev=.003)
    for sg in (-1, 1):
        pts = spiral(sg * .5, 2.45, .5, .1, pi if sg > 0 else 0, 1.25, n=120, ccw=(sg > 0))
        a = curve_tube(pts, 1.0, .45, .042, name="arm")
        a.data.materials.append(iron)
        bl = sphere(.034, pts[-1], seg=24, name="knob"); bl.data.materials.append(brass)
        e = curve_tube([(sg * (.02 + .3 * (i / 40)), 0, 2.05 + .27 * (i / 40) ** 1.6) for i in range(41)], .8, .5, .03, name="brace")
        e.data.materials.append(iron)
        gz = 2.53
        cp = brass_part([(0, gz - .2), (.04, gz - .2), (.075, gz - .17), (.11, gz - .13), (.115, gz - .12), (0, gz - .12)], n=48, name="cup2")
        cp.location = (sg * .5, 0, 0)
        gg = sphere(.17, (sg * .5, 0, gz), seg=64, name="globe_small"); gg.data.materials.append(glass)


def build_game():
    ground(mat_game_ground())
    bpy.ops.import_scene.gltf(filepath=os.path.join(REPO, "public", "assets", "city", "kit", "lamp_post.glb"))


backdrop()
if MODE == "real":
    build_real()
else:
    build_game()

# mesmo ceu/luz/camera para as duas versoes
sky(sun_elev=24, sun_rot=140, strength=0.8, sun_size=0.8)
camera((-2.2, -9.6, 1.55), (0.0, 0, 2.3), lens=55, fstop=5.6, focus=10.0)
setup_cycles(SAMPLES, res=(1100, 1500), gpu=GPU, exposure=-0.9, look="AgX - Medium High Contrast")
render(OUT)

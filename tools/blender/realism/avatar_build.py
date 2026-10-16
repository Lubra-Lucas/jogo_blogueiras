"""Constroi o avatar ULTRARREALISTA (MPFB/MakeHuman CC0 + materiais/cabelo/roupa proprios).
Importado por render_avatar.py. Nada aqui toca no jogo.
Eixos: Z para cima, rosto voltado para -Y (igual a doll importada do GLB).
"""
import bpy, bmesh, os, math, random, importlib
from math import pi, sin, cos
from mathutils import Vector, Matrix
from common import *

random.seed(11)
_base = None


def mpfb():
    global _base
    if _base is None:
        import addon_utils
        for m in addon_utils.modules():
            if "mpfb" in m.__name__.lower():
                addon_utils.enable(m.__name__, default_set=True)
                _base = m.__name__
    return _base


def svc(name):
    return importlib.import_module(mpfb() + ".services." + name)


def link(o):
    bpy.context.scene.collection.objects.link(o)
    return o


# ---------------------------------------------------------------- corpo
def make_body():
    HS = svc("humanservice").HumanService
    LS = svc("locationservice").LocationService
    TS = svc("targetservice").TargetService
    md = TS.get_default_macro_info_dict()
    # mulher jovem adulta, esbelta, proporcoes realistas
    md.update(gender=0.0, age=0.5, muscle=0.38, weight=0.40, proportions=0.62, height=0.52, cupsize=0.45, firmness=0.6)
    md["race"] = {"asian": 0.0, "caucasian": 1.0, "african": 0.0}
    h = HS.create_human(mask_helpers=True, detailed_helpers=False, extra_vertex_groups=True, feet_on_ground=True,
                        scale=0.1, macro_detail_dict=md)
    D = LS.get_user_data()
    return h, D


def bake_mesh(obj, name):
    """Copia a malha avaliada (shape keys + mask aplicados) para um objeto limpo."""
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(obj.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    o = bpy.data.objects.new(name, me)
    link(o)
    return o  # new_from_object ja traz os grupos de vertice


# ---------------------------------------------------------------- helpers de curvas (cabelo/cilios/sobrancelha)
def make_curves(name, strands, radius, mat, tip_taper=0.35, extra_attrs=None):
    """strands: lista de listas de Vector. radius: float. Afina a ponta."""
    cu = bpy.data.hair_curves.new(name)
    sizes = [len(s) for s in strands]
    cu.add_curves(sizes)
    pos = []
    rad = []
    for s in strands:
        n = len(s)
        for i, p in enumerate(s):
            pos.extend((p.x, p.y, p.z))
            t = i / max(1, n - 1)
            rad.append(radius * (1.0 - (1.0 - tip_taper) * t ** 1.5))
    cu.points.foreach_set("position", pos)
    if "radius" not in cu.attributes:
        cu.attributes.new("radius", "FLOAT", "POINT")
    cu.attributes["radius"].data.foreach_set("value", rad)
    if extra_attrs:
        for k, vals in extra_attrs.items():
            a = cu.attributes.new(k, "FLOAT", "CURVE")
            a.data.foreach_set("value", vals)
    o = bpy.data.objects.new(name, cu)
    link(o)
    if mat:
        cu.materials.append(mat)
    return o


def smooth_poly(pts, sub=3):
    """Catmull-Rom simples para suavizar uma polilinha."""
    out = []
    n = len(pts)
    for i in range(n - 1):
        p0 = pts[max(0, i - 1)]; p1 = pts[i]; p2 = pts[i + 1]; p3 = pts[min(n - 1, i + 2)]
        for k in range(sub):
            t = k / sub
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(pts[-1])
    return out


# ---------------------------------------------------------------- materiais
def mat_skin(body, D):
    m = new_mat("skin_sss")
    nb = NB(m)
    tc = nb.add("ShaderNodeTexCoord")
    tex = nb.add("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(os.path.join(D, "skins", "young_caucasian_female", "young_lightskinned_female_diffuse.png"))
    nb.link(tc, "UV", tex, "Vector")
    # tom: clareia e aproxima da porcelana da doll (#efcdbd) sem perder a variacao da textura
    tint = nb.add("ShaderNodeMix", data_type="RGBA", blend_type="MULTIPLY")
    tint.inputs[0].default_value = 1.0; tint.inputs[7].default_value = srgb("#fff0e8")
    nb.link(tex, 0, tint, 6)
    # variacao de cor de baixa frequencia (rubor/veias/sardas leves)
    nz = nb.add("ShaderNodeTexNoise", inputs={"Scale": 18, "Detail": 6, "Roughness": .6})
    nb.link(tc, "Object", nz, "Vector")
    var = nb.add("ShaderNodeMix", data_type="RGBA", blend_type="OVERLAY")
    var.inputs[7].default_value = srgb("#e8b8a8")
    fac = nb.add("ShaderNodeMath", operation="MULTIPLY", inputs={1: .22}); nb.link(nz, 0, fac, 0)
    nb.link(fac, 0, var, 0); nb.link(tint, 2, var, 6)
    # labios / unhas por grupos de vertice
    lips = nb.add("ShaderNodeAttribute", attribute_name="lips")
    nails = nb.add("ShaderNodeAttribute", attribute_name="fingernails")
    toen = nb.add("ShaderNodeAttribute", attribute_name="toenails")
    nl = nb.add("ShaderNodeMath", operation="ADD", use_clamp=True); nb.link(nails, "Fac", nl, 0); nb.link(toen, "Fac", nl, 1)
    lipc = nb.add("ShaderNodeMix", data_type="RGBA"); lipc.inputs[7].default_value = srgb("#c4616c")
    lm = nb.add("ShaderNodeMath", operation="MULTIPLY", use_clamp=True, inputs={1: .8}); nb.link(lips, "Fac", lm, 0)
    nb.link(lm, 0, lipc, 0); nb.link(var, 2, lipc, 6)
    nailc = nb.add("ShaderNodeMix", data_type="RGBA"); nailc.inputs[7].default_value = srgb("#e8a9b4")
    nb.link(nl, 0, nailc, 0); nb.link(lipc, 2, nailc, 6)
    # poros: voronoi (celula) + ruido fino -> bump; rugas finas
    vor = nb.add("ShaderNodeTexVoronoi", inputs={"Scale": 1500, "Randomness": 1.0}, feature="DISTANCE_TO_EDGE")
    nb.link(tc, "Object", vor, "Vector")
    pores = color_ramp(nb, vor.outputs[0], [(0.0, (1, 1, 1, 1)), (0.12, (0, 0, 0, 1))])
    vor2 = nb.add("ShaderNodeTexVoronoi", inputs={"Scale": 160, "Randomness": 1.0}, feature="DISTANCE_TO_EDGE")
    nb.link(tc, "Object", vor2, "Vector")
    fine = color_ramp(nb, vor2.outputs[0], [(0.0, (1, 1, 1, 1)), (0.06, (0, 0, 0, 1))])
    n2 = nb.add("ShaderNodeTexNoise", inputs={"Scale": 700, "Detail": 3, "Roughness": .6}); nb.link(tc, "Object", n2, "Vector")
    h1 = nb.add("ShaderNodeMath", operation="MULTIPLY", inputs={1: -.6}); nb.link(pores, 0, h1, 0)
    h2 = nb.add("ShaderNodeMath", operation="MULTIPLY_ADD", inputs={1: .25, 2: 0}); nb.link(n2, 0, h2, 0)
    h3 = nb.add("ShaderNodeMath", operation="MULTIPLY", inputs={1: -.25}); nb.link(fine, 0, h3, 0)
    s1 = nb.add("ShaderNodeMath", operation="ADD"); nb.link(h1, 0, s1, 0); nb.link(h2, 0, s1, 1)
    s2 = nb.add("ShaderNodeMath", operation="ADD"); nb.link(s1, 0, s2, 0); nb.link(h3, 0, s2, 1)
    bump = nb.add("ShaderNodeBump", inputs={"Strength": .22, "Distance": .0009}); nb.link(s2, 0, bump, "Height")
    # rugosidade variavel (oleosidade na zona T, labios mais lisos)
    rg = nb.add("ShaderNodeMath", operation="MULTIPLY_ADD", inputs={1: .16, 2: .38}); nb.link(n2, 0, rg, 0)
    rg2 = nb.add("ShaderNodeMix", data_type="FLOAT"); rg2.inputs[3].default_value = .22
    nb.link(lips, "Fac", rg2, 0); nb.link(rg, 0, rg2, 2)
    b = nb.add("ShaderNodeBsdfPrincipled")
    nb.link(nailc, 2, b, "Base Color")
    nb.link(rg2, 0, b, "Roughness")
    b.inputs["Subsurface Weight"].default_value = 0.75
    b.inputs["Subsurface Scale"].default_value = 0.012
    b.inputs["Subsurface Radius"].default_value = (1.0, 0.32, 0.18)
    b.subsurface_method = "RANDOM_WALK_SKIN"
    b.inputs["Specular IOR Level"].default_value = 0.5
    b.inputs["Sheen Weight"].default_value = 0.25  # penugem
    b.inputs["Sheen Roughness"].default_value = 0.5
    b.inputs["Coat Weight"].default_value = 0.0
    nb.link(bump, "Normal", b, "Normal")
    nb.out(b)
    return m


def mat_eye_parts():
    # ---- esclera
    sc = new_mat("sclera"); nb = NB(sc)
    tc = nb.add("ShaderNodeTexCoord")
    n1 = nb.add("ShaderNodeTexNoise", inputs={"Scale": 60, "Detail": 8, "Roughness": .7}); nb.link(tc, "Object", n1, "Vector")
    vein = color_ramp(nb, n1.outputs[0], [(0.62, (0, 0, 0, 1)), (0.8, (1, 1, 1, 1))])
    col = nb.add("ShaderNodeMix", data_type="RGBA"); col.inputs[6].default_value = srgb("#ece6df"); col.inputs[7].default_value = srgb("#c98d82")
    vm = nb.add("ShaderNodeMath", operation="MULTIPLY", inputs={1: .35}); nb.link(vein, 0, vm, 0); nb.link(vm, 0, col, 0)
    b = nb.add("ShaderNodeBsdfPrincipled", inputs={"Roughness": .28})
    nb.link(col, 2, b, "Base Color")
    b.inputs["Subsurface Weight"].default_value = .35; b.inputs["Subsurface Scale"].default_value = .004
    b.inputs["Coat Weight"].default_value = 1.0; b.inputs["Coat Roughness"].default_value = .02
    nb.out(b)
    # ---- iris + pupila (coordenadas locais do globo; frente = -Y)
    ir = new_mat("iris"); nb = NB(ir)
    tc = nb.add("ShaderNodeTexCoord")
    sep = nb.add("ShaderNodeSeparateXYZ"); nb.link(tc, "Object", sep, 0)
    # theta = distancia radial no plano XZ (mm); phi = angulo
    rad = nb.add("ShaderNodeVectorMath", operation="LENGTH")
    comb = nb.add("ShaderNodeCombineXYZ"); nb.link(sep, "X", comb, 0); nb.link(sep, "Z", comb, 2)
    nb.link(comb, 0, rad, 0)
    r = rad.outputs["Value"]
    ph = nb.add("ShaderNodeMath", operation="ARCTAN2"); nb.link(sep, "Z", ph, 0); nb.link(sep, "X", ph, 1)
    # fibras radiais: ruido em (phi*k, r)
    ph2 = nb.add("ShaderNodeMath", operation="MULTIPLY", inputs={1: 40}); nb.link(ph, 0, ph2, 0)
    rr = nb.add("ShaderNodeMath", operation="MULTIPLY", inputs={1: 120}); nb.link(rad, "Value", rr, 0)
    cv = nb.add("ShaderNodeCombineXYZ"); nb.link(ph2, 0, cv, 0); nb.link(rr, 0, cv, 1)
    fib = nb.add("ShaderNodeTexNoise", inputs={"Scale": 1.0, "Detail": 6, "Roughness": .65, "Distortion": .2}); nb.link(cv, 0, fib, "Vector")
    cv2 = nb.add("ShaderNodeCombineXYZ"); nb.link(ph2, 0, cv2, 0); nb.link(rr, 0, cv2, 1)
    cv2.inputs[2].default_value = 20.0
    fib2 = nb.add("ShaderNodeTexNoise", inputs={"Scale": .4, "Detail": 3}); nb.link(cv2, 0, fib2, "Vector")
    # mapas de raio: pupila < .0020; colarete .0036; iris ate .0060; limbo .0054->.0060
    t = lambda a, b_: nb.add("ShaderNodeMapRange", inputs={1: a, 2: b_, 3: 0, 4: 1}, use_clamp=True)
    # cor: interno (castanho-dourado) -> externo (azul acinzentado, como a doll)
    mixr = nb.add("ShaderNodeMapRange", inputs={1: .0026, 2: .0072, 3: 0, 4: 1}, use_clamp=True); nb.link(r, 0, mixr, 0)
    ramp = color_ramp(nb, mixr.outputs[0], [(0.0, srgb("#8a6a3c")), (0.28, srgb("#9a8a5a")), (0.45, srgb("#6f8fa0")), (0.8, srgb("#4f7896")), (1.0, srgb("#2c4558"))])
    # fibras claras/escuras modulam a cor
    fm = nb.add("ShaderNodeMix", data_type="RGBA", blend_type="OVERLAY"); fm.inputs[0].default_value = .85
    nb.link(ramp, 0, fm, 6)
    fcol = color_ramp(nb, fib.outputs[0], [(0.3, srgb("#6a6a6a")), (0.7, srgb("#c8c8c8"))])
    nb.link(fcol, 0, fm, 7)
    # pupila (preto) e anel limbal (escurece borda)
    pup = nb.add("ShaderNodeMapRange", inputs={1: .0026, 2: .0031, 3: 0, 4: 1}, use_clamp=True); nb.link(r, 0, pup, 0)
    pc = nb.add("ShaderNodeMix", data_type="RGBA"); pc.inputs[6].default_value = (0.0, 0.0, 0.0, 1)
    nb.link(pup, 0, pc, 0); nb.link(fm, 2, pc, 7)
    # fora do iris -> esclera (pelo mix com mascara na criacao do objeto: aqui so iris)
    b = nb.add("ShaderNodeBsdfPrincipled", inputs={"Roughness": .22})
    nb.link(pc, 2, b, "Base Color")
    b.inputs["Subsurface Weight"].default_value = .2; b.inputs["Subsurface Scale"].default_value = .002
    bump = nb.add("ShaderNodeBump", inputs={"Strength": .6, "Distance": .0004}); nb.link(fib, 0, bump, "Height")
    nb.link(bump, "Normal", b, "Normal")
    # mascara iris vs esclera: raio < .0062
    msk = nb.add("ShaderNodeMapRange", inputs={1: .0071, 2: .0076, 3: 1, 4: 0}, use_clamp=True); nb.link(r, 0, msk, 0)
    # so a frente (y<0)
    ys = nb.add("ShaderNodeMath", operation="LESS_THAN", inputs={1: 0.0}); nb.link(sep, "Y", ys, 0)
    mm = nb.add("ShaderNodeMath", operation="MULTIPLY"); nb.link(msk, 0, mm, 0); nb.link(ys, 0, mm, 1)
    scl = nb.add("ShaderNodeBsdfPrincipled", inputs={"Roughness": .28})
    scl.inputs["Base Color"].default_value = srgb("#ece6df")
    scl.inputs["Coat Weight"].default_value = 1.0; scl.inputs["Coat Roughness"].default_value = .02
    mx = nb.add("ShaderNodeMixShader"); nb.link(mm, 0, mx, 0); nb.link(scl, 0, mx, 1); nb.link(b, 0, mx, 2)
    nb.out(mx)
    # ---- cornea: vidro fino (sombra passa)
    co = new_mat("cornea"); nb = NB(co)
    gl = nb.add("ShaderNodeBsdfGlass", inputs={"Roughness": .0, "IOR": 1.376})
    gl.inputs["Color"].default_value = (1, 1, 1, 1)
    tr = nb.add("ShaderNodeBsdfTransparent")
    lp = nb.add("ShaderNodeLightPath")
    mx = nb.add("ShaderNodeMixShader"); nb.link(lp, "Is Shadow Ray", mx, 0); nb.link(gl, 0, mx, 1); nb.link(tr, 0, mx, 2)
    nb.out(mx)
    return sc, ir, co


def build_eyes(body):
    """Globo (iris+esclera num material) + cornea. Centro/raio medidos no mesh do MPFB."""
    sc, ir, co = mat_eye_parts()
    me = body.data
    objs = []
    # posicao dos olhos a partir do asset fitted (olho esquerdo/direito): bbox por lado
    eye_src = bpy.data.objects.get("Human.high-poly")
    ws = [eye_src.matrix_world @ v.co for v in eye_src.data.vertices]
    out = []
    for sgn in (-1, 1):
        pts = [p for p in ws if p.x * sgn > 0]
        mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
        mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
        c = (mn + mx) / 2
        out.append((c, (mx.z - mn.z) / 2, (mx.x - mn.x) / 2))
    return out, ir, co, sc


def add_eyeballs(centers, ir, co, R=0.0138):
    objs = []
    for (c, rz, rx) in centers:
        # globo (r real 11.8 mm) levemente recuado; iris coberto pela cornea
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=96, v_segments=64, radius=R)
        me = bpy.data.meshes.new("eyeball"); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new("eyeball", me); link(o)
        o.location = c + Vector((0, 0.0042, -0.0004))
        for p in me.polygons: p.use_smooth = True
        me.materials.append(ir)
        # cornea
        rc = 0.0090
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=64, v_segments=32, radius=rc)
        me2 = bpy.data.meshes.new("cornea"); bm.to_mesh(me2); bm.free()
        o2 = bpy.data.objects.new("cornea", me2); link(o2)
        o2.location = o.location + Vector((0, -(R + 0.0006 - rc), 0))
        for p in me2.polygons: p.use_smooth = True
        me2.materials.append(co)
        objs += [o, o2]
    return objs


# ---------------------------------------------------------------- cilios e sobrancelhas
def lashes_from_asset(lash_obj, centers, mat):
    """Cilios em fios: raizes = vertices da malha de cilios do MPFB mais proximos do globo; direcao para fora e curvada."""
    strands = []
    ws = [lash_obj.matrix_world @ v.co for v in lash_obj.data.vertices]
    for (c, rz, rx) in centers:
        sgn = 1 if c.x > 0 else -1
        pts = [p for p in ws if p.x * sgn > 0 and abs(p.x - c.x) < 0.03]
        # raiz = pontos com menor distancia ao centro do olho (borda da palpebra)
        pts.sort(key=lambda p: ((p.x - c.x) ** 2 + (p.z - c.z) ** 2))
        k = max(8, int(len(pts) * 0.45))
        roots = pts[:k]
        for p in roots:
            for _ in range(3):
                q = p + Vector((random.uniform(-.0004, .0004), random.uniform(-.0004, .0004), random.uniform(-.0004, .0004)))
                ang = math.atan2(q.z - c.z, q.x - c.x)
                up = (q.z - c.z) > -0.002
                L = random.uniform(.0085, .0125) if up else random.uniform(.004, .006)
                # direcao: radial no plano XZ + frente (-Y) + curva para cima
                rad = Vector((cos(ang), 0, sin(ang)))
                if up:
                    d0 = rad * 0.55 + Vector((0, -0.75, 0.25))
                    d1 = rad * 0.35 + Vector((0, -0.45, 0.95))
                else:
                    d0 = rad * 0.7 + Vector((0, -0.7, -0.15))
                    d1 = rad * 0.5 + Vector((0, -0.55, -0.6))
                pl = [q]
                n = 6
                for i in range(1, n + 1):
                    t = i / n
                    d = (d0 * (1 - t) + d1 * t).normalized()
                    pl.append(pl[-1] + d * (L / n))
                strands.append(pl)
    return make_curves("lashes", strands, 0.00009, mat, tip_taper=0.3)


def brows_from_asset(brow_obj, mat, color_dark=True):
    ws = [brow_obj.matrix_world @ v.co for v in brow_obj.data.vertices]
    me = brow_obj.data
    me.calc_loop_triangles()
    tris = [[brow_obj.matrix_world @ me.vertices[i].co for i in t.vertices] for t in me.loop_triangles]
    strands = []
    for sgn in (-1, 1):
        side = [t for t in tris if (t[0].x + t[1].x + t[2].x) * sgn > 0]
        if not side:
            continue
        xs = [p.x * sgn for t in side for p in t]
        xmin, xmax = min(xs), max(xs)
        # linha media do supercilio: por faixa de x
        nb_ = 12
        cl = []
        for i in range(nb_ + 1):
            xi = xmin + (xmax - xmin) * i / nb_
            near = [p for t in side for p in t if abs(p.x * sgn - xi) < (xmax - xmin) / nb_ * 0.8]
            if near:
                cl.append(Vector((sgn * xi, sum(p.y for p in near) / len(near), sum(p.z for p in near) / len(near))))
        areas = []
        for t in side:
            areas.append(((t[1] - t[0]).cross(t[2] - t[0])).length / 2)
        tot = sum(areas)
        for _ in range(520):
            r_ = random.uniform(0, tot); acc = 0
            for t, a in zip(side, areas):
                acc += a
                if acc >= r_:
                    break
            u, v = random.random(), random.random()
            if u + v > 1: u, v = 1 - u, 1 - v
            p = t[0] + (t[1] - t[0]) * u + (t[2] - t[0]) * v
            nrm = ((t[1] - t[0]).cross(t[2] - t[0])).normalized()
            if nrm.y > 0: nrm = -nrm
            tpos = (abs(p.x) - xmin) / max(1e-6, (xmax - xmin))
            lat = Vector((sgn, 0, 0))
            up = Vector((0, 0, 1))
            # medial: pelos para cima; meio: lateral+cima; cauda: lateral+baixo
            w_up = 0.95 * (1 - tpos) ** 1.5 + 0.18 * (1 - abs(tpos - .4))
            w_dn = -0.55 * max(0, tpos - .65) / .35
            d = (lat * (0.35 + 0.65 * tpos) + up * (w_up + w_dn) + (-nrm) * 0).normalized()
            L = random.uniform(.0065, .0105) * (1.0 if tpos < .75 else .8)
            pl = [p - nrm * 0.0003]
            cur = d
            for i in range(1, 5):
                cur = (cur + nrm * 0.22).normalized()
                pl.append(pl[-1] + cur * (L / 4))
            strands.append(pl)
    return make_curves("brows", strands, 0.00011, mat, tip_taper=0.25)


def mat_hair_strand(name, base, dark_root=None, tip=None, rough=0.32, rand_var=0.18, melanin=None):
    m = new_mat(name)
    nb = NB(m)
    hi = nb.add("ShaderNodeHairInfo")
    # cor com variacao por fio
    mix = nb.add("ShaderNodeMix", data_type="RGBA")
    mix.inputs[6].default_value = base
    mix.inputs[7].default_value = tip if tip else base
    nb.link(hi, "Random", mix, 0)
    # raiz mais escura ao longo do comprimento
    if dark_root:
        gr = nb.add("ShaderNodeMapRange", inputs={1: 0.0, 2: 0.45, 3: 1, 4: 0}, use_clamp=True)
        nb.link(hi, "Intercept", gr, 0)
        rm = nb.add("ShaderNodeMix", data_type="RGBA"); rm.inputs[7].default_value = dark_root
        nb.link(gr, 0, rm, 0); nb.link(mix, 2, rm, 6)
        col = rm
    else:
        col = mix
    b = nb.add("ShaderNodeBsdfHairPrincipled", parametrization="COLOR")
    try:
        b.model = "CHIANG"
    except Exception:
        pass
    nb.link(col, 2, b, "Color")
    b.inputs["Roughness"].default_value = rough
    b.inputs["Radial Roughness"].default_value = .45
    b.inputs["Coat"].default_value = 0.12
    b.inputs["IOR"].default_value = 1.55
    b.inputs["Random Roughness"].default_value = .15
    nb.out(b)
    return m

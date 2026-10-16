"""
Renders de preview (EEVEE) da personagem base: iluminacao de estudio de 3 pontos, fundo rosa/lilas,
roupa de preview (top + short feitos a partir da propria malha; nunca nua) e cabelo MakeHuman.
Chamado por build_character.py com --render.
"""
import os
import math

import bpy
import numpy as np
from mathutils import Vector

import build_character as bc

SHOTS_DEFAULT = ["face_front", "face_34", "body_front", "body_side", "morphs_face", "morphs_body"]


# --------------------------------------------------------------------------------------
# roupa de preview feita da propria malha
# --------------------------------------------------------------------------------------
def make_garment(ctx, name, zr, xlim, seed_pt, offset, mat, hull=False):
    """Roupa de preview: recorte por planos (bordas retas) da propria malha, com offset ao longo da normal.
    As shape keys do corpo vao junto (bmesh interpola as camadas de shape key)."""
    import bmesh
    body = ctx.body
    me = body.data.copy()
    me.name = name
    bm = bmesh.new()
    bm.from_mesh(me)

    def cut(co, no, inner, outer):
        geom = list(bm.verts) + list(bm.edges) + list(bm.faces)
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co, plane_no=no, clear_inner=inner, clear_outer=outer)

    cut((0, 0, zr[0]), (0, 0, 1), True, False)
    cut((0, 0, zr[1]), (0, 0, 1), False, True)
    if xlim:
        cut((xlim, 0, 0), (1, 0, 0), False, True)
        cut((-xlim, 0, 0), (-1, 0, 0), False, True)
    bm.faces.ensure_lookup_table()
    seed = Vector(seed_pt)
    f0 = min(bm.faces, key=lambda f: (f.calc_center_median() - seed).length)
    seen = {f0.index}
    stack = [f0]
    while stack:
        f = stack.pop()
        for e in f.edges:
            for lf in e.link_faces:
                if lf.index not in seen:
                    seen.add(lf.index)
                    stack.append(lf)
    dele = [f for f in bm.faces if f.index not in seen]
    bmesh.ops.delete(bm, geom=dele, context="FACES")
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context="VERTS")
    bm.normal_update()
    layers = list(bm.verts.layers.shape.values())
    for v in bm.verts:
        d = v.normal * offset
        v.co += d
        for ly in layers:
            v[ly] += d
    if hull:
        fit_garment_shapes(bm, layers, body, offset)
    bm.to_mesh(me)
    bm.free()
    me.update()
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    for g in body.vertex_groups:
        obj.vertex_groups.new(name=g.name)
    obj.parent = ctx.rig
    mod = obj.modifiers.new("Armature", "ARMATURE")
    mod.object = ctx.rig
    me.materials.clear()
    me.materials.append(mat)
    for poly in me.polygons:
        poly.use_smooth = True
    if me.shape_keys:
        for kb in me.shape_keys.key_blocks:
            if kb.name != "Basis":
                kb.value = 0.0
    return obj


def convex_hull(pts):
    """Casco convexo 2D (cadeia monotona); devolve vertices em ordem anti-horaria."""
    P = sorted(map(tuple, pts))
    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo = []
    for p in P:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0:
            lo.pop()
        lo.append(p)
    up = []
    for p in reversed(P):
        while len(up) >= 2 and cross(up[-2], up[-1], p) <= 0:
            up.pop()
        up.append(p)
    return np.array(lo[:-1] + up[:-1])


def ray_hull_t(c, d, H):
    """Menor t>0 em que o raio c + t*d cruza o casco H (poligono convexo contendo c)."""
    best = None
    n = len(H)
    for i in range(n):
        a, b = H[i], H[(i + 1) % n]
        e = b - a
        den = d[0] * e[1] - d[1] * e[0]
        if abs(den) < 1e-12:
            continue
        t = ((a[0] - c[0]) * e[1] - (a[1] - c[1]) * e[0]) / den
        u = ((a[0] - c[0]) * d[1] - (a[1] - c[1]) * d[0]) / den
        if t > 0 and -1e-9 <= u <= 1 + 1e-9 and (best is None or t > best):
            best = t  # interseccao mais distante = borda do casco
    return best


def fit_garment_shapes(bm, layers, body, min_off, smooth_iters=12, hull_iters=30):
    """Top tubular liso, calculado SEPARADAMENTE para a forma base e para a forma final de cada morph (valor 1):
      1. Taubin leve (borda fixa; o corpo ja e liso - suavizar demais achata o seio e o afastamento forma um calombo);
      2. afasta do CORPO NA MESMA FORMA (shape key do corpo = 1) ate >= `min_off` por um campo suave;
      3. casco convexo por anel horizontal (faixas de 6 mm), so na frente e so para fora -> ponte sobre o vao dos seios.
    O delta de cada morph e (forma do morph ja processada) - (base processada): a roupa nunca copia o "bico" do corpo."""
    from mathutils.bvhtree import BVHTree
    bm.verts.ensure_lookup_table()
    n = len(bm.verts)
    base = np.array([v.co for v in bm.verts])
    bins = np.round(base[:, 2] / 0.006).astype(int)
    groups = [np.nonzero(bins == b_)[0] for b_ in np.unique(bins)]
    nbr = [[] for _ in range(n)]
    boundary = np.zeros(n, dtype=bool)
    ea, eb = [], []
    for e in bm.edges:
        a_, b_ = e.verts[0].index, e.verts[1].index
        nbr[a_].append(b_)
        nbr[b_].append(a_)
        ea.append(a_)
        eb.append(b_)
        if len(e.link_faces) == 1:
            boundary[a_] = boundary[b_] = True
    ea, eb = np.array(ea), np.array(eb)
    deg = np.maximum(np.bincount(np.concatenate([ea, eb]), minlength=n).astype(np.float64), 1.0)

    def avg(x):
        if x.ndim == 1:
            return (np.bincount(ea, weights=x[eb], minlength=n) + np.bincount(eb, weights=x[ea], minlength=n)) / deg
        return np.stack([avg(x[:, k]) for k in range(x.shape[1])], axis=1)

    def dilate(x):
        out = x.copy()
        np.maximum.at(out, ea, x[eb])
        np.maximum.at(out, eb, x[ea])
        return out

    def taubin(S):
        for i in range(smooth_iters):
            k = 0.6 if i % 2 == 0 else -0.63
            S = np.where(boundary[:, None], S, S + k * (avg(S) - S))
        return S

    def push_out(S, bvh):
        for _ in range(3):
            sd = np.zeros(n)
            nor = np.zeros((n, 3))
            for i in range(n):
                loc, nr, _, _ = bvh.find_nearest(Vector(S[i]))
                sd[i] = (Vector(S[i]) - loc).dot(nr)
                nor[i] = nr
            deficit = np.maximum(0.0, min_off - sd)
            if deficit.max() < 5e-4:
                break
            dd = deficit
            for _k in range(7):
                dd = dilate(dd)
            dd = np.where(dd > 0, dd + 0.003, 0.0)
            for _k in range(24):
                dd = np.maximum(avg(dd), 0.5 * dd)
            dd = np.maximum(dd, deficit)
            nn = nor
            for _k in range(8):
                nn = avg(nn)
            nn = nn / np.maximum(np.linalg.norm(nn, axis=1), 1e-9)[:, None]
            S = S + nn * dd[:, None]
        return S

    def hull(S):
        out = S.copy()
        cents = np.zeros((n, 2))
        for idx in groups:
            pts = S[idx, :2]
            c = pts.mean(0)
            cents[idx] = c
            if len(idx) < 6:
                continue
            H = convex_hull(pts)
            for i in idx:
                d = S[i, :2] - c
                L = np.hypot(*d)
                if L < 1e-9:
                    continue
                t = ray_hull_t(c, d / L, H)
                if t is not None and t > L:
                    out[i, :2] = c + d / L * t
        dr = np.hypot(*(out[:, :2] - cents).T) - np.hypot(*(S[:, :2] - cents).T)
        wf = np.clip((cents[:, 1] - S[:, 1] - 0.02) / 0.05, 0.0, 1.0)  # so a frente (lados/costas perto dos bracos ficam)
        ds = np.maximum(dr, 0.0) * wf * wf * (3 - 2 * wf)
        for _ in range(hull_iters):
            ds = np.where(boundary, ds, ds + 0.5 * (avg(ds) - ds))
        ds = np.maximum(ds, 0.0)
        d0 = S[:, :2] - cents
        L0 = np.maximum(np.hypot(*d0.T), 1e-9)
        res = S.copy()
        res[:, :2] = S[:, :2] + d0 / L0[:, None] * ds[:, None]
        return res

    sk = body.data.shape_keys

    def body_bvh(name):
        if sk:
            for kb in sk.key_blocks:
                kb.value = 1.0 if (kb.name == name and name != "Basis") else 0.0
        dg = bpy.context.evaluated_depsgraph_get()
        dg.update()
        return BVHTree.FromObject(body, dg)

    names = list(bm.verts.layers.shape.keys())
    results = {}
    for name, l in zip(names, layers):
        bvh = body_bvh(name)
        S = np.array([v[l] for v in bm.verts])
        results[name] = hull(push_out(taubin(S), bvh))
    body_bvh("Basis")
    for i, v in enumerate(bm.verts):
        v.co = Vector(results["Basis"][i])
        for name, l in zip(names, layers):
            v[l] = Vector(results[name][i])


def ellipse_mask(P, c, radius, power=1.0):
    d = (P - np.array(c)) / np.array(radius)
    return bc.smoothstep(1.0 - np.sqrt((d ** 2).sum(1))) ** power


def apply_preview_makeup(ctx):
    """Maquiagem so para o preview (batom, sombra, blush) via cor de vertice multiplicada na pele.
    O jogo aplica a propria maquiagem; isto so ajuda a avaliar a forma do rosto."""
    st = ctx.style
    pv = st.get("preview", {})
    body = ctx.body
    P = bc.get_coords(body)
    lm = bc.landmarks(ctx.P0, ctx.groups)
    k = ctx.frozen[0]
    lips = lm["lips"]
    col = np.zeros((len(P), 4))
    col[:, :3] = 1.0

    def paint(mask, rgb, strength):
        a = np.clip(mask * strength, 0, 1)[:, None]
        col[:, :3] = col[:, :3] * (1 - a) + np.array(rgb)[None, :] * a
        col[:, 3] = 1.0

    mouth_w = pv.get("mouth_halfwidth", 0.036)
    paint(ellipse_mask(P, lips + np.array([0, -0.01, 0.0]), [mouth_w, 0.05, 0.020], 0.6), pv.get("lip_color", [0.78, 0.18, 0.28]), 0.9)
    for sgn in (1, -1):
        e = lm["eye_l"] * np.array([sgn, 1, 1])
        paint(ellipse_mask(P, e + np.array([sgn * 0.006, -0.02, 0.008]), [0.034, 0.05, 0.026], 0.8), pv.get("shadow_color", [0.42, 0.22, 0.24]), 0.65)
        paint(ellipse_mask(P, e + np.array([sgn * 0.008, -0.01, -0.045 * k]), [0.05, 0.05, 0.03], 1.0), pv.get("blush_color", [0.95, 0.42, 0.45]), 0.4)
        # delineador: faixa escura sobre a linha dos cilios + asa externa
        lid = lm["lid_u"] * np.array([sgn, 1, 1])
        paint(ellipse_mask(P, lid + np.array([0, -0.02, 0.004]), [0.034, 0.04, 0.010], 0.7), [0.12, 0.06, 0.06], 0.85)
        paint(ellipse_mask(P, lid + np.array([sgn * 0.03, -0.02, 0.009]), [0.016, 0.04, 0.008], 0.7), [0.12, 0.06, 0.06], 0.8)
    me = body.data
    attr = me.color_attributes.new(name="Makeup", type="FLOAT_COLOR", domain="POINT")
    attr.data.foreach_set("color", col.ravel())
    nt = ctx.skin_mat.node_tree
    bsdf = [n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"][0]
    link = [l for l in nt.links if l.to_socket == bsdf.inputs["Base Color"]][0]
    src = link.from_socket
    va = nt.nodes.new("ShaderNodeVertexColor")
    va.layer_name = "Makeup"
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.blend_type = "MULTIPLY"
    mix.inputs["Factor"].default_value = 1.0
    nt.links.new(src, mix.inputs["A"])
    nt.links.new(va.outputs["Color"], mix.inputs["B"])
    nt.links.new(mix.outputs["Result"], bsdf.inputs["Base Color"])


def satin(name, color, rough=0.28):
    m = bc.make_material(name, None, base_color=color, roughness=rough, specular=0.6)
    return m


def build_outfit(ctx):
    st = ctx.style
    pv = st.get("preview", {})
    pz = float(bc.landmarks(ctx.P0, ctx.groups)["pelvis"][2])
    top_z = [pz + v for v in pv.get("top_off", [0.225, 0.375])]
    sh_z = [pz + v for v in pv.get("shorts_off", [-0.15, 0.085])]
    mid_top = (top_z[0] + top_z[1]) / 2
    top = make_garment(ctx, "OutfitTop", top_z, pv.get("top_xlim", 0.175), (0.0, -0.08, mid_top), 0.006,
                       satin("OutfitTop", tuple(pv.get("top_color", [0.93, 0.90, 0.94, 1.0]))), hull=True)
    shorts = make_garment(ctx, "OutfitShorts", sh_z, None, (0.0, -0.08, sh_z[1] - 0.02), 0.005,
                          satin("OutfitShorts", tuple(pv.get("shorts_color", [0.78, 0.55, 0.78, 1.0])), 0.4))
    return [top, shorts]


# --------------------------------------------------------------------------------------
# cena
# --------------------------------------------------------------------------------------
def setup_scene(ctx, args):
    scene = bpy.context.scene
    engines = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items]
    eng = "BLENDER_EEVEE" if "BLENDER_EEVEE" in engines else "BLENDER_EEVEE_NEXT"
    scene.render.engine = eng
    bc.log("engine", eng, engines)
    scene.render.resolution_x = 900
    scene.render.resolution_y = 1100
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    try:
        scene.eevee.taa_render_samples = 96
        scene.eevee.use_raytracing = True
    except Exception as e:
        bc.log("eevee opts", e)
    scene.view_settings.view_transform = "AgX"
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except Exception:
        pass
    scene.view_settings.exposure = -0.25

    # mundo: rosa/lilas pastel (gradiente vertical)
    world = bpy.data.worlds.new("StudioWorld")
    scene.world = world
    try:
        world.use_nodes = True
    except Exception:
        pass
    nt = world.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    mapn = nt.nodes.new("ShaderNodeMapRange")
    nt.links.new(tc.outputs["Window"], sep.inputs["Vector"])
    nt.links.new(sep.outputs["Y"], mapn.inputs["Value"])
    mapn.inputs["From Min"].default_value = 0.0
    mapn.inputs["From Max"].default_value = 1.0
    nt.links.new(mapn.outputs["Result"], ramp.inputs["Fac"])
    ramp.color_ramp.elements[0].color = (0.92, 0.55, 0.78, 1.0)   # rosa (embaixo)
    ramp.color_ramp.elements[1].color = (0.80, 0.68, 0.96, 1.0)   # lilas (em cima)
    nt.links.new(ramp.outputs["Color"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = 1.0
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])

    # camera
    cam_data = bpy.data.cameras.new("Cam")
    cam = bpy.data.objects.new("Cam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    ctx.cam = cam

    # luzes (3 pontos, suaves): posicionadas relativas ao alvo em update_lights
    ctx.lights = {}
    for nm, energy, color, size in (("key", 260.0, (1.0, 0.96, 0.92), 1.6),
                                    ("fill", 90.0, (0.92, 0.88, 1.0), 2.4),
                                    ("rim", 220.0, (1.0, 0.75, 0.9), 1.2)):
        ld = bpy.data.lights.new(nm, "AREA")
        ld.energy = energy
        ld.color = color
        ld.size = size
        lo = bpy.data.objects.new(nm, ld)
        scene.collection.objects.link(lo)
        ctx.lights[nm] = lo
    # chao suave (recebe sombra suave)
    return scene


def aim(obj, target):
    d = Vector(target) - obj.location
    obj.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def frame(ctx, target, height, lens, yaw_deg, pitch_deg=0.0):
    """Posiciona a camera olhando para `target`, enquadrando `height` metros na vertical."""
    cam = ctx.cam
    cam.data.lens = lens
    cam.data.sensor_fit = "VERTICAL"
    cam.data.sensor_height = 36.0
    dist = height * lens / 36.0
    yaw = math.radians(yaw_deg)
    pitch = math.radians(pitch_deg)
    t = Vector(target)
    # personagem olha para -Y; yaw 0 => camera em -Y
    cam.location = t + Vector((math.sin(yaw) * math.cos(pitch) * dist, -math.cos(yaw) * math.cos(pitch) * dist,
                               math.sin(pitch) * dist))
    aim(cam, t)
    cam.data.clip_start = 0.05
    cam.data.clip_end = 20.0
    # luzes relativas a camera
    right = Vector((math.cos(yaw), math.sin(yaw), 0.0))
    fwd = Vector((-math.sin(yaw), math.cos(yaw), 0.0))  # da camera para o alvo
    L = ctx.lights
    L["key"].location = t - fwd * dist * 0.9 - right * dist * 0.7 + Vector((0, 0, dist * 0.55))
    L["fill"].location = t - fwd * dist * 0.8 + right * dist * 0.9 + Vector((0, 0, dist * 0.1))
    L["rim"].location = t + fwd * dist * 0.9 + right * dist * 0.6 + Vector((0, 0, dist * 0.6))
    for lo in L.values():
        aim(lo, t)
    # energia proporcional ao quadrado da distancia
    k = (dist / 2.0) ** 2
    L["key"].data.energy = 190.0 * k
    L["fill"].data.energy = 80.0 * k
    L["rim"].data.energy = 170.0 * k
    for lo in L.values():
        lo.data.size = max(0.8, dist * 0.9)


def render(path):
    scene = bpy.context.scene
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    bc.log("render", path)


def set_morphs(ctx, values):
    """values: {nome: valor}; aplica em todos os objetos que possuem a chave."""
    for o in ctx.render_objs:
        sks = o.data.shape_keys
        if not sks:
            continue
        for kb in sks.key_blocks:
            if kb.name == "Basis":
                continue
            kb.value = float(values.get(kb.name, 0.0))


def stitch(paths, out):
    imgs = [bpy.data.images.load(p) for p in paths]
    w, h = imgs[0].size
    arrs = []
    for im in imgs:
        a = np.zeros(w * h * 4, dtype=np.float32)
        im.pixels.foreach_get(a)
        arrs.append(a.reshape(h, w, 4))
    full = np.concatenate(arrs, axis=1)
    res = bpy.data.images.new("stitch", full.shape[1], full.shape[0], alpha=False)
    res.pixels.foreach_set(full.ravel())
    res.filepath_raw = out
    res.file_format = "PNG"
    res.save()
    for im in imgs:
        bpy.data.images.remove(im)
    bpy.data.images.remove(res)


def run(ctx, args):
    scene = setup_scene(ctx, args)
    outfit = getattr(ctx, 'outfit', None) or build_outfit(ctx)
    ctx.render_objs = [ctx.body, ctx.proxies["Eyes"][0], ctx.proxies["Eyelashes"][0], ctx.proxies["Eyebrows"][0]] + outfit
    if "Hair" in ctx.proxies:
        ctx.render_objs.append(ctx.proxies["Hair"][0])
        if args.get("nohair"):
            ctx.proxies["Hair"][0].hide_render = True
    # subsurface leve na pele so para o preview
    skin = ctx.skin_mat
    for n in skin.node_tree.nodes:
        if n.type == "BSDF_PRINCIPLED":
            for key, val in (("Subsurface Weight", 0.12), ("Subsurface Scale", 0.01)):
                if key in n.inputs:
                    n.inputs[key].default_value = val
            if "Subsurface Radius" in n.inputs:
                n.inputs["Subsurface Radius"].default_value = (1.0, 0.35, 0.25)

    if args.get("nooutfit"):
        for o in outfit:
            o.hide_render = True
    apply_preview_makeup(ctx)
    st = ctx.style
    H = st["target_height_m"]
    P = bc.get_coords(ctx.body)
    top = P[:, 2].max()
    lm = bc.landmarks(ctx.P0, ctx.groups)
    eye_z = float(lm["eye_l"][2])
    head_h = ctx.head_height
    tag = args.get("tag") or "r"
    pdir = args["preview_dir"]
    os.makedirs(pdir, exist_ok=True)
    wanted = args["shots"].split(",") if args.get("shots") else SHOTS_DEFAULT
    out = {}

    def shot(name, target, height, lens, yaw, pitch=0.0):
        frame(ctx, target, height, lens, yaw, pitch)
        p = os.path.join(pdir, "%s_%s.png" % (tag, name))
        render(p)
        out[name] = p
        return p

    face_c = (0.0, -0.02, eye_z - head_h * 0.08)
    set_morphs(ctx, {})
    for nm, zc, hh, yaw in (("chest_front", 0.30, 0.55, 0), ("chest_side", 0.30, 0.55, 90),
                            ("pelvis_front", -0.03, 0.55, 0), ("pelvis_side", -0.03, 0.55, 90), ("pelvis_back", -0.03, 0.55, 180)):
        if nm in wanted:
            pzz = float(lm["pelvis"][2])
            shot(nm, (0.0, 0.0, pzz + zc), hh, 50, yaw)
    if "face_front" in wanted:
        shot("face_front", face_c, head_h * 1.75, 85, 0)
    if "face_34" in wanted:
        shot("face_34", face_c, head_h * 1.75, 85, 32)
    if "body_front" in wanted:
        shot("body_front", (0.0, 0.0, H * 0.52), H * 1.12, 50, 0)
    if "body_side" in wanted:
        shot("body_side", (0.0, 0.0, H * 0.52), H * 1.12, 50, 90)
    if "morphs_face" in wanted:
        a = shot("morphs_face_0", face_c, head_h * 1.75, 85, 20)
        set_morphs(ctx, {"lipsFull": 1.0, "eyesBig": 1.0, "noseSmall": 1.0, "waistThin": 1.0, "cheekbonesHigh": 1.0})
        b = shot("morphs_face_1", face_c, head_h * 1.75, 85, 20)
        stitch([a, b], os.path.join(pdir, "%s_morphs_face.png" % tag))
        set_morphs(ctx, {})
    if "morphs_body" in wanted:
        a = shot("morphs_body_0", (0.0, 0.0, H * 0.52), H * 1.12, 50, 25)
        set_morphs(ctx, {"waistThin": 1.0, "hipsWide": 1.0, "bustBig": 1.0, "lipsFull": 1.0, "eyesBig": 1.0, "noseSmall": 1.0})
        b = shot("morphs_body_1", (0.0, 0.0, H * 0.52), H * 1.12, 50, 25)
        stitch([a, b], os.path.join(pdir, "%s_morphs_body.png" % tag))
        set_morphs(ctx, {})
    return out

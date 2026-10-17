"""Etapa 1 do avatar masculino: Meshy male_meshy.glb (malha branca, sem textura) -> corpo limpo/escalado/suavizado + UV.
Usage: blender -b --factory-startup -noaudio --python prepare_male.py
Saida: .cache/male_1.blend (objeto 'body', Z-up, de frente para -Y do Blender == +Z glTF, pe em z=0, 1,75 m)
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mcommon import *
import bmesh

# landmarks (unidades originais do Meshy, antes da escala) medidos na analise/renders
Z_WAIST, Z_HEM = 0.0875, -0.0645     # lacos duros da boxer (cos e barra da perna)
EYE_Z, EYE_X = 0.392, 0.024
LMZ_CROTCH = 0.83     # m: abaixo disso = perna


def stage_prepare():
    t0 = time.time()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=SRC)
    o = bpy.data.objects["mesh_node"]; o.name = "body"; me = o.data; me.name = "body"
    # limpeza: tira as 4 pecas soltas dos olhos (escondidas dentro das orbitas) e solda emendas
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=4e-4)
    bm.verts.ensure_lookup_table()
    seen = set(); comps = []
    for v in bm.verts:
        if v.index in seen: continue
        stack = [v]; seen.add(v.index); comp = [v]
        while stack:
            c = stack.pop()
            for ed in c.link_edges:
                w = ed.other_vert(c)
                if w.index not in seen: seen.add(w.index); stack.append(w); comp.append(w)
        comps.append(comp)
    small = [v for c in comps if len(c) < 500 for v in c]
    log("componentes", sorted(len(c) for c in comps), "-> removendo", len(small), "verts de pecas soltas")
    bmesh.ops.delete(bm, geom=small, context='VERTS')
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context='VERTS')
    bnd = [e for e in bm.edges if e.is_boundary]
    log("arestas de borda depois da solda:", len(bnd))
    if bnd:
        bmesh.ops.holes_fill(bm, edges=bnd, sides=40)
        bmesh.ops.triangulate(bm, faces=bm.faces)
        log("arestas de borda depois de fechar buracos pequenos:", sum(1 for e in bm.edges if e.is_boundary))
    bm.to_mesh(me); bm.free()
    select_only(o); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.fill_holes(sides=60); bpy.ops.object.mode_set(mode='OBJECT')
    bm = bmesh.new(); bm.from_mesh(me); log("bordas apos fill_holes:", sum(1 for e in bm.edges if e.is_boundary)); bm.free()
    co = getco(o); tv = tris(me); e = edges_of(me); n = len(co)
    sp = me.attributes.new('srcpos', 'FLOAT_VECTOR', 'POINT'); sp.data.foreach_set('vector', co.astype(np.float32).ravel())
    # ---- bordas da boxer: os dois lacos duros (cos e barra) NAO sao horizontais; mede os pontos dos vincos e ajusta curvas z(theta)
    bm = bmesh.new(); bm.from_mesh(me)
    pts = []
    for ed in bm.edges:
        if len(ed.link_faces) != 2: continue
        a_, b_ = ed.verts
        if abs(a_.co.z - b_.co.z) > 0.012 or math.degrees(ed.calc_face_angle(0)) < 35: continue
        m_ = (a_.co + b_.co) / 2
        if abs(m_.x) < 0.2: pts.append((m_.x, m_.y, m_.z))
    bm.free(); pts = np.array(pts)

    def ring_curve(P_, cx, cy, nb, mode='min'):
        th = np.arctan2(P_[:, 1] - cy, P_[:, 0] - cx)
        bins = np.linspace(-math.pi, math.pi, nb + 1); zs = np.full(nb, np.nan)
        for i in range(nb):
            m_ = (th >= bins[i]) & (th < bins[i + 1])
            if m_.sum(): zs[i] = (np.percentile(P_[m_, 2], 12) - 0.002) if mode == 'min' else (np.percentile(P_[m_, 2], 88) + 0.002)
        ok = ~np.isnan(zs); cth = (bins[:-1] + bins[1:]) / 2
        zs = np.interp(cth, np.concatenate([cth[ok] - 2 * math.pi, cth[ok], cth[ok] + 2 * math.pi]), np.tile(zs[ok], 3))
        pass
        for _ in range(2): zs = (np.roll(zs, 1) + 2 * zs + np.roll(zs, -1)) / 4
        return cth, zs
    wp = pts[np.abs(pts[:, 2] - Z_WAIST) < 0.02]
    curves = {"waist": ring_curve(wp, 0.0, float(wp[:, 1].mean()), 48, "max")}
    for sg in (1, -1):
        hp = pts[(np.abs(pts[:, 2] - Z_HEM) < 0.02) & (np.sign(pts[:, 0]) == sg)]
        curves["hem%d" % sg] = ring_curve(hp, float(hp[:, 0].mean()), float(hp[:, 1].mean()), 36) + (float(hp[:, 0].mean()), float(hp[:, 1].mean()))
        log("barra", sg, "pts", len(hp), "z", curves["hem%d" % sg][1].min(), curves["hem%d" % sg][1].max())
    log("cos pts", len(wp), "z", curves["waist"][1].min(), curves["waist"][1].max(), "centro y", wp[:, 1].mean())
    box_json = {"waist": {"cy": float(wp[:, 1].mean()), "th": curves["waist"][0].tolist(), "z": ((curves["waist"][1] - SRC_ZMIN)).tolist()}}
    for sg in (1, -1):
        c_ = curves["hem%d" % sg]
        box_json["hem%d" % sg] = {"cx": c_[2], "cy": c_[3], "th": c_[0].tolist(), "z": (c_[1] - SRC_ZMIN).tolist()}
    x, y, z = co[:, 0], co[:, 1], co[:, 2]            # ainda em unidades Meshy

    # boxer: so superficie lisa entre os dois lacos (nada marcado na frente)
    torso_x = np.abs(x) < 0.125
    w_box = sstep((z - (Z_HEM + 0.004)) / 0.012) * (1 - sstep((z - (Z_WAIST - 0.012)) / 0.01)) * torso_x
    P = taubin(co, e, w_box, it=14)
    # virilha da frente: tira qualquer relevo
    gr = bell(np.sqrt((x / 0.075) ** 2 + ((z - (-0.015)) / 0.075) ** 2)) * (y < 0.02) * torso_x
    P = laplace(P, e, gr * 0.9, it=20, lam=0.6)
    # peito liso (sem peitoral marcado)
    ch = bell(np.abs(z - 0.17) / 0.085) * (np.abs(x) < 0.12) * (y < 0.03)
    P = taubin(P, e, ch, it=16)
    ab = bell(np.abs(z - 0.04) / 0.07) * (np.abs(x) < 0.12)
    P = taubin(P, e, ab * 0.8, it=6)
    # rosto: suaviza as facetas e as orbitas
    face = bell(np.sqrt(((np.abs(x)) / 0.075) ** 2 + ((z - 0.375) / 0.085) ** 2)) * (y < 0.0)
    P = taubin(P, e, face * 0.9, it=10)
    eyes = np.zeros(n)
    for sg in (1, -1):
        eyes = np.maximum(eyes, bell(np.sqrt(((x - sg * EYE_X) / 0.028) ** 2 + ((z - EYE_Z) / 0.020) ** 2)) * (y < -0.02))
    P = laplace(P, e, eyes * 0.9, it=14, lam=0.6)
    # boca/queixo lisos: os labios agora sao camadas em tempo real, entao a malha nao pode ter relevo de labio/vinco de bochecha
    mo = bell(np.sqrt((x / 0.065) ** 2 + ((z - 0.352) / 0.042) ** 2)) * (y < 0.0)
    P = taubin(P, e, mo * 0.95, it=40)
    jaw = bell(np.sqrt((x / 0.09) ** 2 + ((z - 0.338) / 0.05) ** 2)) * (y < 0.03)
    P = taubin(P, e, jaw * 0.85, it=22)
    # cabeca um pouco maior (visual "boneca", sem exagero): escala em torno da base do pescoco
    HS, PIV = 1.12, np.array([0.0, 0.007, 0.300])
    def head_xf(Q):
        f = sstep((Q[:, 2] - 0.300) / 0.05)[:, None]
        return PIV + (Q - PIV) * (1 + (HS - 1) * f)
    P = head_xf(P)
    sc = TARGET_H / (P[:, 2].max() - P[:, 2].min()); zmin = P[:, 2].min()
    def to_m(Q): return (Q - np.array([0, 0, zmin])) * sc
    P = to_m(P)
    setco(o, P)
    # landmarks do rosto (metros) para a pintura das mascaras/textura
    L = {"eye_z": EYE_Z, "eye_x": EYE_X, "brow_z": 0.405, "mouth_z": 0.352, "chin_z": 0.330, "nose_z": 0.372}
    lm = {}
    for k, zz in (("eye", EYE_Z), ("brow", 0.405), ("mouth", 0.352), ("chin", 0.330), ("nose", 0.372)):
        q = to_m(head_xf(np.array([[EYE_X, 0.0, zz]])))[0]; lm[k + "_z"] = float(q[2]); lm[k + "_x"] = float(q[0])
    lm["z_waist"] = float(to_m(np.array([[0, 0, Z_WAIST]]))[0, 2]); lm["z_hem"] = float(to_m(np.array([[0, 0, Z_HEM]]))[0, 2])
    for k in box_json:
        d = box_json[k]; d["z"] = [float((zz + SRC_ZMIN - zmin) * sc) for zz in d["z"]]
        d["cy"] = float((d["cy"]) * sc)
        if "cx" in d: d["cx"] = float(d["cx"] * sc)
    lm["box"] = box_json
    lm["scale"] = float(sc); lm["head_scale"] = HS
    json.dump(lm, open(os.path.join(CACHE, "landmarks.json"), "w"), indent=1)
    log("altura final", P[:, 2].max(), "z min", P[:, 2].min(), "x max", P[:, 0].max(), "landmarks", lm)
    for p in me.polygons: p.use_smooth = True
    select_only(o)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(40))
    # ---- UV: projecao em caixa POR PARTE do corpo (sem dobras; smart_project dobrava frente/costas das pernas)
    cur = arr(me.vertices, 'co', 3); tv_ = tris(me); nr_ = vnormals(cur, tv_)
    n_ = len(cur)
    S0 = np.array([0.20, 0.0, 1.40])
    Lm = cur[(cur[:, 0] > 0.3) & (cur[:, 2] > 0.6)]
    tip = Lm[np.argmax(np.linalg.norm(Lm - S0, axis=1))]
    ad = (tip - S0) / np.linalg.norm(tip - S0); alen = np.linalg.norm(tip - S0)
    part = np.zeros(n_, np.int32)           # 0 torso+pescoco, 1 cabeca, 2/3 braco L/R, 4/5 mao L/R, 6/7 perna L/R, 8/9 pe L/R
    for sg, (ia, ih, il, ifoot) in ((1, (2, 4, 6, 8)), (-1, (3, 5, 7, 9))):
        q = cur.copy(); q[:, 0] *= sg
        t_ = (q - S0) @ ad; dd = np.linalg.norm((q - S0) - np.outer(t_, ad), axis=1)
        isarm = (dd < 0.085) & (q[:, 0] > 0.17) & (t_ > -0.02) & (t_ < alen + 0.02)
        part[isarm] = ia; part[isarm & (t_ > 0.72 * alen)] = ih
        leg = (cur[:, 0] * sg > -0.005) & (cur[:, 2] < LMZ_CROTCH) & ~isarm
        part[leg] = il; part[leg & (cur[:, 2] < 0.085)] = ifoot
    part[(cur[:, 2] > 1.43) & (part == 0)] = 1
    # resolve faces: majority part of its vertices; dominant axis from face normal
    pv = np.array([list(p.vertices) for p in me.polygons]); lp = np.array([p.loop_start for p in me.polygons])
    fpart = np.array([np.bincount(part[v], minlength=10).argmax() for v in pv])
    fn = np.cross(cur[pv[:, 1]] - cur[pv[:, 0]], cur[pv[:, 2]] - cur[pv[:, 0]]); fn /= np.maximum(np.linalg.norm(fn, axis=1), 1e-12)[:, None]
    ax = np.abs(fn).argmax(1); sgn = (np.take_along_axis(fn, ax[:, None], 1)[:, 0] > 0).astype(int)
    # arms/hands hang sideways: avoid z-dominant (top) faces being separate pieces -> keep, they are small
    uvl = (me.uv_layers[0] if len(me.uv_layers) else me.uv_layers.new(name='UVMap')).uv
    uv = np.zeros((len(me.loops), 2), np.float32)
    lv = np.empty(len(me.loops), np.int32); me.loops.foreach_get('vertex_index', lv)
    k = 0.5
    for pi in range(len(pv)):
        axis = ax[pi]; kk = k * (2.4 if (fpart[pi] == 1 and axis == 1 and sgn[pi] == 0) else 1.0)
        # offset keeps each (part,axis,sign) group in its own area before packing (packing re-places islands anyway)
        for j in range(len(pv[pi])):
            li = lp[pi] + j; c_ = cur[lv[li]]
            if axis == 0: uu, vv = c_[1] * (1 if sgn[pi] else -1), c_[2]
            elif axis == 1: uu, vv = c_[0] * (-1 if sgn[pi] else 1), c_[2]
            else: uu, vv = c_[0], c_[1] * (1 if sgn[pi] else -1)
            uv[li] = (uu * kk, vv * kk)
    uvl.foreach_set('vector', uv.ravel())
    log("partes (verts)", np.bincount(part, minlength=10).tolist())
    select_only(o); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.pack_islands(margin=0.012, rotate=False, shape_method='CONCAVE')
    bpy.ops.object.mode_set(mode='OBJECT')
    json.dump({"part": part.tolist()}, open(os.path.join(CACHE, "parts.json"), "w"))
    bpy.ops.wm.save_as_mainfile(filepath=blend("male_1"))
    log(f"prepare ok {time.time()-t0:.0f}s")


if __name__ == "__main__":
    stage_prepare()

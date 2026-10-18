"""3 cabelos curtos masculinos no estilo "boneca de vinil" (mechas lisas esculpidas e glossy; sem fios), gerados a partir do cranio do masculino.
Usage: blender -b --factory-startup -noaudio --python make_hair_male.py [-- buzz quiff sidepart]
Entrada: .cache/male_4.blend (corpo rigado, repouso). Saida: public/assets/characters/male/hair_<id>.glb
- Casca sobre o couro cabeludo (acima de uma linha do cabelo definida por (x, y)), subdividida e suavizada; espessura/volume por estilo + sulcos (ridges) para as mechas.
- Cor de vertice (COLOR_0) = sombreamento dos sulcos/raiz; o material do jogo multiplica pelo tint do cabelo.
- Presos ao osso Head (peso 100%), com o mesmo esqueleto de 52 ossos (o jogo religa ao esqueleto do personagem, como nos cabelos da boneca).
- Nao atravessa o cranio: depois de esculpir, cada vertice e empurrado para fora ate ter folga minima da superficie do corpo (BVH).
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mcommon import *
import bmesh
from mathutils.bvhtree import BVHTree
import mathutils

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
STYLES = argv or ["buzz", "quiff", "sidepart"]


def hairline(x, y):
    """z da linha do cabelo em funcao de (x, y): testa com entradas nas temporas, acima das orelhas, nuca baixa"""
    ax = np.abs(x)
    front = 1.653 - 0.030 * (ax / 0.09) ** 2 - 0.012 * np.clip((ax - 0.07) / 0.03, 0, 1)
    back = 1.572 + 0.075 * (ax / 0.115) ** 2.2
    t = sstep((y + 0.045) / 0.09)
    return front * (1 - t) + back * t


def build_shell(co, tv):
    z0 = hairline(co[:, 0], co[:, 1])
    inside = co[:, 2] > 1.545          # regiao larga; o recorte fino pela linha do cabelo e feito depois da subdivisao
    fs = inside[tv].all(1)
    tri = tv[fs]
    used = np.unique(tri)
    remap = -np.ones(len(co), int); remap[used] = np.arange(len(used))
    me = bpy.data.meshes.new("hair"); me.from_pydata([tuple(c) for c in co[used]], [], [tuple(remap[t]) for t in tri]); me.update()
    return me


def sculpt(style, P, N, h):
    """devolve (deslocamento vetorial Nx3, sombreamento 0..1 por vertice)"""
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    r = sstep(h / 0.014)
    shade = np.ones(len(P))
    off = np.zeros_like(P)
    if style == "buzz":
        th = 0.0016 + 0.0020 * r + 0.0015 * sstep((z - 1.66) / 0.06)
        off = N * th[:, None]
        shade = 0.52 + 0.48 * sstep(h / 0.045)                      # raiz mais escura (raspado)
    elif style == "quiff":
        m = np.exp(-(((y + 0.062) / 0.062) ** 2 + (x / 0.062) ** 2 + ((z - 1.693) / 0.05) ** 2))
        crown = np.exp(-(((y - 0.01) / 0.07) ** 2 + (x / 0.08) ** 2))
        th = 0.0042 + 0.0030 * r + 0.026 * m + 0.004 * crown * sstep((z - 1.70) / 0.04)
        # mechas lisas que correm da frente para tras: sulcos ao longo de y, espacados em x
        ph = 2 * np.pi * (x / 0.0105 + 0.35 * np.sin((y + 0.08) * 22))
        ridge = 0.5 + 0.5 * np.sin(ph)
        env = sstep(h / 0.02) * (0.4 + 0.6 * sstep((z - 1.65) / 0.04))
        th = th + 0.0016 * ridge * env
        off = N * th[:, None] + np.stack([np.zeros_like(x), -0.020 * m, 0.016 * m], 1) * r[:, None]
        shade = (0.60 + 0.40 * sstep(h / 0.05)) * (0.86 + 0.14 * ridge)
        # laterais baixas (degrade): mais finas
        side = sstep((np.abs(x) - 0.06) / 0.04) * (1 - sstep((z - 1.64) / 0.05))
        off = off - N * (0.0024 * side)[:, None]
    elif style == "sidepart":
        part_x = 0.032
        d = x - part_x                                              # + = lado pequeno (esquerda do personagem), - = lado grande
        big = sstep(-d / 0.02)
        top = sstep((z - 1.64) / 0.04)
        th = 0.0055 + 0.0028 * r + (0.0105 * big + 0.0030) * top
        # mechas lisas que saem da risca varrendo para o lado grande: sulcos diagonais
        u = -d + 0.28 * (y + 0.07)
        ridge = 0.5 + 0.5 * np.sin(2 * np.pi * (u / 0.0115) + 1.2 * np.sin(y * 18))
        th = th + 0.0020 * ridge * sstep(h / 0.02) * top * (0.55 + 0.45 * big)
        # sulco da risca
        groove = np.exp(-((d / 0.0032) ** 2)) * sstep((y + 0.098) / 0.02) * (1 - sstep((y - 0.04) / 0.06))
        th = th - 0.0036 * groove * top
        off = N * th[:, None] + np.stack([np.zeros_like(x), -0.006 * big * top, 0.004 * big * top], 1) * r[:, None]
        shade = (0.62 + 0.38 * sstep(h / 0.05)) * (0.84 + 0.16 * ridge) * (1 - 0.35 * groove)
    return off, np.clip(shade, 0, 1)


def make(style):
    bpy.ops.wm.open_mainfile(filepath=blend("male_4"))
    body, rig = bpy.data.objects["body"], bpy.data.objects["Armature"]
    co = getco(body); tv = tris(body.data)
    me = build_shell(co, tv)
    ob = bpy.data.objects.new("Hair_" + style, me); bpy.context.scene.collection.objects.link(ob)
    # subdivide para ter resolucao para os sulcos (suave) e relaxa mantendo a borda
    bm = bmesh.new(); bm.from_mesh(me)
    for _ in range(2):
        bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=1, use_grid_fill=True)
        bmesh.ops.triangulate(bm, faces=bm.faces[:])
    # recorte fino pela linha do cabelo (bordas lisas, ~2 mm de degrau)
    bm.verts.ensure_lookup_table()
    above = {v.index: v.co.z > hairline(v.co.x, v.co.y) for v in bm.verts}
    kill = [f for f in bm.faces if not all(above[v.index] for v in f.verts)]
    bmesh.ops.delete(bm, geom=kill, context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.to_mesh(me); bm.free(); me.update()
    P = getco(ob); t2 = tris(me); e = edges_of(me); n = len(P)
    bnd = np.zeros(n)
    cnt = {}
    for a, b in e: pass
    # vertices de borda (arestas com uma so face): ficam presos (peso 0 no relaxamento)
    ec = {}
    for tri in t2:
        for k in range(3):
            a_, b_ = sorted((int(tri[k]), int(tri[(k + 1) % 3]))); ec[(a_, b_)] = ec.get((a_, b_), 0) + 1
    for (a_, b_), c in ec.items():
        if c == 1: bnd[a_] = bnd[b_] = 1
    free = 1 - bnd
    # alisa a borda (linha do cabelo) ao longo dela mesma: tira o serrilhado da subdivisao
    badj = {}
    for (a_, b_), c in ec.items():
        if c == 1: badj.setdefault(a_, []).append(b_); badj.setdefault(b_, []).append(a_)
    for _ in range(10):
        Q_ = P.copy()
        for v_, nb in badj.items(): Q_[v_] = 0.5 * P[v_] + 0.5 * np.mean([P[k_] for k_ in nb], axis=0)
        P = Q_
    P = taubin(P, e, free * 0.9, it=8)
    Nrm = vnormals(P, t2)
    h = P[:, 2] - hairline(P[:, 0], P[:, 1])
    off, shade = sculpt(style, P, Nrm, h)
    P2 = P + off
    # folga minima do cranio (BVH do corpo): nunca atravessa
    bvh = BVHTree.FromObject(body, bpy.context.evaluated_depsgraph_get())
    for i in range(n):
        loc, nor, idx, dist = bvh.find_nearest(mathutils.Vector(P2[i]))
        if loc is None: continue
        v = mathutils.Vector(P2[i]) - loc
        sd = v.dot(nor)
        need = 0.0012 if bnd[i] < 0.5 else 0.0006
        if sd < need:
            P2[i] = np.array(loc + nor * need)
    P2 = laplace(P2, e, free * 0.25, 2, 0.5)                       # alisa o resultado (sem recolar no cranio)
    # reaplica a folga apos o alisamento
    for i in range(n):
        loc, nor, idx, dist = bvh.find_nearest(mathutils.Vector(P2[i]))
        v = mathutils.Vector(P2[i]) - loc
        need = 0.0010 if bnd[i] < 0.5 else 0.0005
        if v.dot(nor) < need: P2[i] = np.array(loc + nor * need)
    # a borda (linha do cabelo) fica sobre o couro cabeludo: alisa ao longo dela e recoloca a folga minima
    for _ in range(6):
        Q_ = P2.copy()
        for v_, nb in badj.items(): Q_[v_] = 0.5 * P2[v_] + 0.5 * np.mean([P2[k_] for k_ in nb], axis=0)
        P2 = Q_
    for i in np.nonzero(bnd > 0.5)[0]:
        loc, nor, idx, dist = bvh.find_nearest(mathutils.Vector(P2[i]))
        v = mathutils.Vector(P2[i]) - loc
        if v.dot(nor) < 0.0006: P2[i] = np.array(loc + nor * 0.0006)
    setco(ob, P2)
    for p in me.polygons: p.use_smooth = True
    ca = me.color_attributes.new("Col", 'FLOAT_COLOR', 'POINT')
    rgba = np.stack([shade, shade, shade, np.ones(n)], 1).astype(np.float32)
    ca.data.foreach_set('color', rgba.ravel())
    me.color_attributes.active_color = ca
    # peso 100% Head
    vg = ob.vertex_groups.new(name="mixamorig:Head"); vg.add(list(range(n)), 1.0, 'REPLACE')
    mod = ob.modifiers.new("Armature", 'ARMATURE'); mod.object = rig
    ob.parent = rig
    mat = bpy.data.materials.new("hair"); mat.use_nodes = True
    ob.data.materials.append(mat)
    # exporta so o cabelo + armature
    for o in bpy.data.objects: o.select_set(False)
    ob.select_set(True); rig.select_set(True); bpy.context.view_layer.objects.active = rig
    path = os.path.join(PUB, f"hair_{style}.glb")
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format='GLB', export_yup=True, export_apply=False,
                              export_materials='EXPORT', export_normals=True, export_skins=True, export_def_bones=False, export_animations=False,
                              export_morph=False, export_vertex_color='ACTIVE', export_cameras=False, export_lights=False)
    log(f"hair_{style}.glb", os.path.getsize(path) // 1024, "KB", len(me.polygons), "tris; min folga ok; z max", float(P2[:, 2].max()))


if __name__ == "__main__":
    for s_ in STYLES: make(s_)

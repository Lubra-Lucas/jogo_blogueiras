"""Estudio comum (luz de estudio suave + fundo infinito + cameras) para doll e avatar realista."""
import bpy, math
from mathutils import Vector
from common import *

SHOTS = {
    # (alvo, distancia, lente, altura relativa da camera, res, fstop)
    "portrait": dict(res=(1100, 1400)),
    "full": dict(res=(1100, 1700)),
    "eyes": dict(res=(1400, 800)),
}


def backdrop(color=(0.62, 0.60, 0.58)):
    bm_verts = []
    import bmesh
    bm = bmesh.new()
    # cyclorama: chao + parede curva
    prof = [(-12, 0), (0.0, 0)]
    import math as m
    R = 1.2
    for i in range(0, 13):
        a = (i / 12) * (m.pi / 2)
        prof.append((R * m.sin(a), R * (1 - m.cos(a))))
    prof += [(R, 5.5)]
    # profile (y, z) -> extruir em x
    ring = []
    for (y, z) in prof:
        ring.append([bm.verts.new((x, 1.6 + y, z)) for x in (-6, 6)])
    for a, b in zip(ring[:-1], ring[1:]):
        bm.faces.new((a[0], a[1], b[1], b[0]))
    me = bpy.data.meshes.new("cyc"); bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    o = bpy.data.objects.new("cyc", me)
    bpy.context.scene.collection.objects.link(o)
    mt = new_mat("cyc"); nb = NB(mt)
    b = nb.add("ShaderNodeBsdfPrincipled", inputs={"Roughness": .9})
    b.inputs["Base Color"].default_value = (color[0], color[1], color[2], 1)
    nb.out(b); me.materials.append(mt)
    return o


def studio_lights(scale=1.0, target=(0, 0, 1.3)):
    t = Vector(target)
    # key: softbox grande a 40deg esquerda-frente, um pouco acima
    area_light(t + Vector((-1.8, -2.4, 0.9)), t, 1.6, 95 * scale, color=(1.0, .96, .92), shape="SQUARE")
    # fill: direita, mais fraca e maior
    area_light(t + Vector((2.2, -2.0, 0.3)), t, 2.2, 28 * scale, color=(.92, .95, 1.0), shape="SQUARE")
    # rim: atras-esquerda para destacar contorno do cabelo
    area_light(t + Vector((1.4, 1.5, 1.0)), t, 1.0, 70 * scale, color=(1, .97, .92), shape="SQUARE")
    # topo suave
    area_light(t + Vector((0, -0.5, 2.6)), t, 1.5, 16 * scale, shape="SQUARE")
    w = bpy.data.worlds.new("w"); bpy.context.scene.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (.5, .5, .52, 1)
    w.node_tree.nodes["Background"].inputs[1].default_value = .06


def shot_camera(shot, eye_z, scale=1.0):
    """eye_z: altura do olho do modelo. scale: relacao do tamanho da cabeca (doll ~1.25x) para equalizar o enquadramento."""
    for o in [o for o in bpy.data.objects if o.type == "CAMERA"]:
        bpy.data.objects.remove(o)
    if shot == "portrait":
        d = 1.95 * scale
        tgt = (0, -0.02, eye_z - 0.095 * scale)
        return camera((0.12, -d, eye_z - 0.03), tgt, lens=110, fstop=4.0, focus=d), tgt
    if shot == "eyes":
        d = 0.62 * scale
        tgt = (0, -0.12, eye_z - 0.005)
        return camera((0.05, -0.12 - d, eye_z + 0.01), tgt, lens=120, fstop=5.6, focus=d), tgt
    d = 4.0 * scale
    tgt = (0, 0, 0.86 * scale)
    return camera((0.0, -d, 0.95), tgt, lens=70, fstop=None), tgt

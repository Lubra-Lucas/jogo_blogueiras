"""Exporta os acessorios aprovados dos pets para o jogo (formato combinado com a integracao).

Uso: Blender -b --factory-startup -noaudio --python tools/blender/pets/pet_accessories_export.py -- [--only coleira-strass,bandana-xadrez,laco-cetim,polo-rosa]

Saida em public/assets/pets/acc/:
- Pecas rigidas (sem esqueleto, um no raiz; +Y para cima, +Z para a frente do pet, origem no ponto de encaixe):
    coleira-strass.glb, bandana-xadrez.glb: centro do aro na origem, eixo do aro em +Z, raio interno = 1,0,
        pingente/ponta pendurado em -Y (o jogo escala por neckR*1.04);
    laco-cetim.glb: base na origem, tamanho total ~1,0 (o jogo escala por hr*0,5 e prende no osso head).
- Peca que deforma: polo-rosa/<raca>.glb por raca de cao, com skin no esqueleto da propria raca (mesmos nomes de osso).
- acc.json: id, label, slot, cor padrao, preco sugerido e arquivos.
Materiais tingiveis terminam em `_tint`; os demais (strass, perolas, ouro, neon) mantem a cor.
"""
import json
import math
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import pet_accessories as A  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OUT = os.path.join(ROOT, 'public', 'assets', 'pets', 'acc')
DOGS = ['poodle', 'shiba', 'dachshund', 'caramelo', 'maltes', 'cavalier', 'golden']

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ONLY = argv[argv.index('--only') + 1].split(',') if '--only' in argv else None


def want(i):
    return ONLY is None or i in ONLY


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)


def apply_all(objs):
    """Aplica modificadores e transforma em malha final (bake de skin/solidify/subsurf/wireframe)."""
    out = []
    bpy.context.view_layer.update()
    for o in objs:
        if o.type != 'MESH':
            continue
        bpy.ops.object.select_all(action='DESELECT')
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.convert(target='MESH')
        out.append(bpy.context.view_layer.objects.active)
    # solta dos pais mantendo a posicao no mundo (o join/transform_apply nao herda o pai)
    bpy.ops.object.select_all(action='DESELECT')
    for o in out:
        o.select_set(True)
    bpy.context.view_layer.objects.active = out[0]
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    return out


def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    ob.data.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return ob


def rename_mats(ob, rule):
    for s in ob.material_slots:
        if s.material:
            s.material.name = rule(s.material.name)


def export(path, objs):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format='GLB', export_yup=True,
                              export_apply=True, export_materials='EXPORT', export_normals=True,
                              export_skins=True, export_animations=False, export_cameras=False, export_lights=False)
    tris = sum(len(p.vertices) - 2 for o in objs if o.type == 'MESH' for p in o.data.polygons)
    print(f'EXPORT {os.path.relpath(path, ROOT)} {os.path.getsize(path) // 1024} KB {tris} tris')
    return tris


# ------------------------------------------------------------------ rigidas (meta normalizado)
# Eixo do aro = frente do pet. No jogo (Y para cima, frente +Z) => n0=(0,0,0), hn=(0,0,1): o aro fica com eixo +Z
# e o 'baixo' local do frame (pingente) cai em -Y. neckR tal que o raio interno do aro seja 1,0.
def norm_meta(inner=1.0):
    neck = inner / 1.05
    return dict(n0=[0, 0, 0], hn=[0, 0, 1], neckR=neck, hr=neck * 1.43, hc=[0, 0, 0], zc=0, L=1, bw=1, bh=1, height=1)


def recenter(root):
    """Leva o ponto de encaixe para a origem: o grupo nasce em n0.lerp(hn, t); zera a posicao do raiz."""
    root.location = (0, 0, 0)
    bpy.context.view_layer.update()


def export_collar():
    reset()
    made = A.build_rhinestone_collar(norm_meta())
    root = made[0]
    recenter(root)
    meshes = apply_all([o for o in made[1:]])
    ob = join(meshes, 'coleira_strass')

    def rule(n):
        n = n.split('.')[0]
        return 'tira_tint' if n.startswith('tira_') else n
    rename_mats(ob, rule)
    return export(os.path.join(OUT, 'coleira-strass.glb'), [ob])


def bake_plaid(ob, size=256):
    """O xadrez e procedural; o glTF precisa de imagem: assa a cor do pano numa textura pequena."""
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 1
    img = bpy.data.images.new('bandana_xadrez', size, size)
    for s in ob.material_slots:
        m = s.material
        if not m or not m.name.startswith('xadrez'):
            continue
        tn = m.node_tree.nodes.new('ShaderNodeTexImage')
        tn.image = img
        m.node_tree.nodes.active = tn
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'}, use_clear=True, margin=4)
    img.filepath_raw = os.path.join(OUT, '_tmp_xadrez.png')
    img.file_format = 'PNG'
    img.save()
    img.pack()
    # material final: so a imagem assada na cor + verniz (some a cadeia procedural)
    for s in ob.material_slots:
        m = s.material
        if not m or not m.name.startswith('xadrez'):
            continue
        nt = m.node_tree
        p = nt.nodes['Principled BSDF']
        for l in list(p.inputs['Base Color'].links):
            nt.links.remove(l)
        tn = [n for n in nt.nodes if n.type == 'TEX_IMAGE'][0]
        nt.links.new(tn.outputs['Color'], p.inputs['Base Color'])
    os.remove(os.path.join(OUT, '_tmp_xadrez.png'))


def export_bandana():
    reset()
    made = A.build_bandana(norm_meta())
    root = made[0]
    recenter(root)
    meshes = apply_all(made[1:])
    pano = [o for o in meshes if 'pano' in o.name][0]
    bake_plaid(pano)
    ob = join(meshes, 'bandana_xadrez')
    rename_mats(ob, lambda n: n.split('.')[0])
    return export(os.path.join(OUT, 'bandana-xadrez.glb'), [ob])


def export_bow():
    reset()
    meta = dict(norm_meta(), hr=1.0, hc=[0, 0, 0])
    made = A.build_bow(meta)
    root = made[0]
    root.location = (0, 0, 0)
    root.rotation_euler = (0, 0, 0)
    bpy.context.view_layer.update()
    meshes = apply_all(made[1:])
    ob = join(meshes, 'laco_cetim')
    # normaliza: base (ponto mais baixo) na origem e tamanho total ~1,0
    pts = [v.co for v in ob.data.vertices]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    size = max(mx - mn)
    ctr = Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
    for v in ob.data.vertices:
        v.co = (v.co - ctr) / size
    rename_mats(ob, lambda n: 'cetim_tint' if n.startswith('cetim') else n.split('.')[0])
    decimate(ob, 0.3)
    return export(os.path.join(OUT, 'laco-cetim.glb'), [ob])


def decimate(ob, ratio):
    """Mais leve para o jogo (peca pequena na tela)."""
    d = ob.modifiers.new('leve', 'DECIMATE')
    d.ratio = ratio
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier='leve')


# ------------------------------------------------------------------ polo (skin por raca)
def export_polo(breed_id, breeds):
    reset()
    breed = breeds[breed_id]
    mesh, arm = A.load_pet(breed)
    if arm and arm.animation_data:
        arm.animation_data.action = None
    for pb in arm.pose.bones:
        pb.matrix_basis.identity()
    bpy.context.view_layer.update()
    # versao de jogo: molde com menos fatias e sem subdivisao (o sombreamento suave cuida das curvas)
    orig = A.torso_shell
    A.torso_shell = lambda m, pm, segs=24, rows=14: orig(m, pm, segs, rows)
    try:
        made = A.build_polo(breed['meta'], mesh)
    finally:
        A.torso_shell = orig
    for o in made:
        for md in list(o.modifiers):
            if md.type == 'SUBSURF':
                o.modifiers.remove(md)
            elif md.type == 'BEVEL':
                md.segments = 1
    meshes = apply_all(made)
    ob = join(meshes, f'polo_{breed_id}')
    bpy.ops.object.shade_smooth()
    decimate(ob, 0.7)
    # pesos de pele: copiados da malha do pet (face mais proxima, interpolado)
    dt = ob.modifiers.new('pesos', 'DATA_TRANSFER')
    dt.object = mesh
    dt.use_vert_data = True
    dt.data_types_verts = {'VGROUP_WEIGHTS'}
    dt.vert_mapping = 'POLYINTERP_NEAREST'
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.datalayout_transfer(modifier='pesos')
    bpy.ops.object.modifier_apply(modifier='pesos')
    # limita a 4 influencias e normaliza (padrao do glTF)
    bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
    bpy.ops.object.vertex_group_normalize_all(lock_active=False)
    ob.parent = arm
    am = ob.modifiers.new('Armature', 'ARMATURE')
    am.object = arm

    def rule(n):
        n = n.split('.')[0]
        return 'polo_corpo_tint' if n.startswith('pique_') else n
    rename_mats(ob, rule)
    # so o esqueleto + a polo (sem a malha do pet)
    bpy.data.objects.remove(mesh)
    return export(os.path.join(OUT, 'polo-rosa', breed_id + '.glb'), [ob, arm])


def main():
    data = json.load(open(os.path.join(A.PETS_DIR, 'pets.json')))
    breeds = {b['id']: b for b in data['breeds']}
    manifest = []
    if want('coleira-strass'):
        export_collar()
    if want('bandana-xadrez'):
        export_bandana()
    if want('laco-cetim'):
        export_bow()
    polo_files = {}
    if want('polo-rosa'):
        for d in DOGS:
            if d in breeds:
                export_polo(d, breeds)
                polo_files[d] = f'acc/polo-rosa/{d}.glb'
    manifest = [
        dict(id='petacc.coleira-strass', label='Coleira de strass com coração neon', slot='collar', color='#f3c6d3', price=650,
             kind='rigid', file='acc/coleira-strass.glb', mount='neck', scale='neckR*1.04',
             tint='tira_tint', note='pedras, ouro e coração pink neon (emissivo) mantêm a cor'),
        dict(id='petacc.bandana-xadrez', label='Bandana xadrez', slot='collar', color='#1f3556', price=220,
             kind='rigid', file='acc/bandana-xadrez.glb', mount='neck', scale='neckR*1.04',
             tint=None, note='xadrez em textura; sem slot tingível'),
        dict(id='petacc.laco-cetim', label='Laço de cetim', slot='bow', color='#c96f86', price=180,
             kind='rigid', file='acc/laco-cetim.glb', mount='head', scale='hr*0.5', tint='cetim_tint'),
        dict(id='petacc.polo-rosa', label='Camisa polo rosa', slot='outfit', color='#f29bb5', price=480,
             kind='skinned', files=polo_files, tint='polo_corpo_tint', note='gola, punhos e barra azuis, botões de pérola'),
    ]
    p = os.path.join(OUT, 'acc.json')
    old = json.load(open(p)) if os.path.exists(p) else {}
    if ONLY and old.get('items'):
        keep = {i['id']: i for i in old['items']}
        for m in manifest:
            keep[m['id']] = m
        manifest = list(keep.values())
    json.dump(dict(version=1, units='normalizado (rigidas) / metros (skinned)', up='+Y', front='+Z', items=manifest),
              open(p, 'w'), ensure_ascii=False, indent=1)
    print('MANIFEST', os.path.relpath(p, ROOT))


main()

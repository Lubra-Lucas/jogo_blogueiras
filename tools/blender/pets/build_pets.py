"""Gera os GLBs dos pets (malha + esqueleto + 7 animacoes) e o manifest pets.json.

Uso:
  blender -b --factory-startup -noaudio --python tools/blender/pets/build_pets.py -- [racas|all] [--out DIR] [--shots DIR] [--poses idle:0,sit:0,...]

  racas : ids separados por virgula (poodle,shiba,dachshund,caramelo,siames,persa,srd) ou all
  --out : pasta de saida dos GLB (padrao public/assets/pets)
  --shots : se dado, renderiza PNG de conferencia de cada raca (poses)
Saida: <out>/<raca>.glb e <out>/pets.json (racas, pelagens, precos, animacoes).
"""
import os
import sys
import json

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bpy  # noqa: E402
import pet_lib as P  # noqa: E402
import pet_anim as A  # noqa: E402
from pet_build import build_pet  # noqa: E402
from breeds import BREEDS  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))


def parse():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    opts = {'breeds': 'all', 'out': os.path.join(ROOT, 'public', 'assets', 'pets'), 'shots': None, 'noexport': False, 'poses': 'idle:0,walk:0.1,sit:0,lie:0,happy:0.12,eat:0.3'}
    i = 0
    pos = []
    while i < len(argv):
        if argv[i] == '--noexport':
            opts['noexport'] = True
            i += 1
        elif argv[i] in ('--out', '--shots', '--poses'):
            opts[argv[i][2:]] = argv[i + 1]
            i += 2
        else:
            pos.append(argv[i])
            i += 1
    if pos:
        opts['breeds'] = pos[0]
    return opts


def assemble(spec):
    P.clear_scene()
    mesh, arm, bones = build_pet(spec)
    mesh.parent = arm
    mod = mesh.modifiers.new('Armature', 'ARMATURE')
    mod.object = arm
    rig = P.Rig(arm)
    A.create_actions(arm, rig, mesh, spec.get('anim'))
    return mesh, arm, rig


def export(spec, mesh, arm, out):
    bpy.ops.object.select_all(action='DESELECT')
    mesh.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    path = os.path.join(out, spec['id'] + '.glb')
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format='GLB', export_yup=True, export_apply=False,
                              export_materials='EXPORT', export_normals=True, export_skins=True, export_def_bones=False,
                              export_animations=True, export_animation_mode='NLA_TRACKS', export_force_sampling=True,
                              export_optimize_animation_size=True, export_cameras=False, export_lights=False,
                              export_image_format='NONE')
    return os.path.getsize(path)


def main():
    opts = parse()
    os.makedirs(opts['out'], exist_ok=True)
    ids = [b['id'] for b in BREEDS] if opts['breeds'] == 'all' else opts['breeds'].split(',')
    manifest_breeds = []
    for spec in BREEDS:
        if spec['id'] not in ids:
            continue
        mesh, arm, rig = assemble(spec)
        tris = sum(len(p.vertices) - 2 for p in mesh.data.polygons)
        size = 0 if opts['noexport'] else export(spec, mesh, arm, opts['out'])
        print(f"[pets] {spec['id']}: {tris} tris, {len(arm.data.bones)} ossos, {len(mesh.data.materials)} materiais, {size // 1024} KB")
        if opts['shots']:
            import pet_render as R
            R.shots(spec, mesh, arm, rig, opts['shots'], opts['poses'])
    # manifest (sempre com todas as racas)
    from manifest import write_manifest
    write_manifest(opts['out'])


main()

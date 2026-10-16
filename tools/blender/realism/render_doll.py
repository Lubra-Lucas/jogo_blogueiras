"""Renderiza a doll ATUAL do jogo (GLB) no estudio. Uso: ... -- <portrait|full> <saida.png> [samples]"""
import bpy, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
from studio import *
A = args(); SHOT, OUT = A[0], A[1]; SAMPLES = int(A[2]) if len(A) > 2 else 128
REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
R = os.path.join(REPO, "public", "assets")
reset()
for f, tint in (("characters/doll_base.glb", None), ("characters/hair_meshy_updo.glb", None), ("garments/tee.glb", None), ("garments/aline.glb", None)):
    bpy.ops.import_scene.gltf(filepath=os.path.join(R, f))
for o in list(bpy.data.objects):
    if o.name.startswith("Icosphere"):
        bpy.data.objects.remove(o)
# cor de pele padrao do jogo (#efcdbd): multiplica a textura base
for m in bpy.data.materials:
    nt = m.node_tree
    bs = [n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"][0]
    if m.name == "doll":
        bs.inputs["Base Color"].default_value = srgb("#f6ddd0")
        nb = NB(m)
        tex = [n for n in nt.nodes if n.type == "TEX_IMAGE"][0]
        mix = nb.add("ShaderNodeMix", data_type="RGBA", blend_type="MULTIPLY")
        mix.inputs[0].default_value = 1.0
        mix.inputs[7].default_value = srgb("#f8e4d8")
        nb.link(tex, 0, mix, 6)
        nt.links.new(mix.outputs[2], bs.inputs["Base Color"])
    elif m.name == "base":
        bs.inputs["Base Color"].default_value = srgb("#f4f1ea")
    elif m.name == "base.001":
        bs.inputs["Base Color"].default_value = srgb("#c8a4ff")
    elif m.name == "accent":
        bs.inputs["Base Color"].default_value = srgb("#ff7ab8")
backdrop()
studio_lights(target=(0, 0, 1.3 if SHOT == "portrait" else 0.9))
eye_z = 1.40
shot_camera(SHOT, eye_z, scale=(1.3 if SHOT == 'portrait' else 1.04))
setup_cycles(SAMPLES, res=SHOTS[SHOT]["res"], exposure=0.0, look="AgX - Base Contrast")
render(OUT)

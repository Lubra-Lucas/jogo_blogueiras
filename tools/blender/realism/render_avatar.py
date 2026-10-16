"""Renderiza o AVATAR ULTRARREALISTA. Uso:
blender -b --factory-startup -noaudio --python render_avatar.py -- <portrait|full> <saida.png> [samples] [quick]
(MPFB/MakeHuman CC0 + materiais procedurais + cabelo/cilios/sobrancelhas em curves + roupa propria)
"""
import bpy, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
from studio import *
from avatar_build import *
from avatar_parts import *

A = args()
SHOT, OUT = A[0], A[1]
SAMPLES = int(A[2]) if len(A) > 2 else 128
QUICK = len(A) > 3 and A[3] == "quick"
T0 = time.time()


def tick(m):
    print("[%5.1fs] %s" % (time.time() - T0, m), flush=True)


def mat_cotton():
    m = new_mat("cotton_jersey")
    nb = NB(m)
    tc = nb.add("ShaderNodeTexCoord")
    mp = nb.add("ShaderNodeMapping")
    nb.link(tc, "Object", mp, "Vector")
    w1 = nb.add("ShaderNodeTexWave", inputs={"Scale": 520, "Distortion": 1.5, "Detail": 1}, wave_type="BANDS", bands_direction="X", wave_profile="SAW")
    nb.link(mp, 0, w1, "Vector")
    w2 = nb.add("ShaderNodeTexWave", inputs={"Scale": 380, "Distortion": 1.0, "Detail": 1}, wave_type="BANDS", bands_direction="Z", wave_profile="SIN")
    nb.link(mp, 0, w2, "Vector")
    nf = nb.add("ShaderNodeTexNoise", inputs={"Scale": 900, "Detail": 4, "Roughness": .7})
    nb.link(tc, "Object", nf, "Vector")
    nl = nb.add("ShaderNodeTexNoise", inputs={"Scale": 6, "Detail": 5})
    nb.link(tc, "Object", nl, "Vector")
    m1 = nb.add("ShaderNodeMath", operation="MULTIPLY"); nb.link(w1, 0, m1, 0); nb.link(w2, 0, m1, 1)
    m2 = nb.add("ShaderNodeMath", operation="MULTIPLY_ADD", inputs={1: .35}); nb.link(nf, 0, m2, 0); nb.link(m1, 0, m2, 2)
    bump = nb.add("ShaderNodeBump", inputs={"Strength": .55, "Distance": .0008}); nb.link(m2, 0, bump, "Height")
    col = nb.add("ShaderNodeMix", data_type="RGBA", blend_type="MULTIPLY"); col.inputs[0].default_value = .5
    col.inputs[6].default_value = srgb("#f1eee6"); nb.link(nl, "Color", col, 7)
    b = nb.add("ShaderNodeBsdfPrincipled", inputs={"Roughness": .82})
    nb.link(col, 2, b, "Base Color")
    b.inputs["Sheen Weight"].default_value = .8; b.inputs["Sheen Roughness"].default_value = .4
    b.inputs["Subsurface Weight"].default_value = .12; b.inputs["Subsurface Scale"].default_value = .004
    nb.link(bump, "Normal", b, "Normal")
    nb.out(b)
    return m


def mat_satin():
    m = new_mat("satin_lilac")
    nb = NB(m)
    tc = nb.add("ShaderNodeTexCoord")
    w1 = nb.add("ShaderNodeTexWave", inputs={"Scale": 1400, "Distortion": .4, "Detail": 0}, wave_type="BANDS", bands_direction="X", wave_profile="SIN")
    nb.link(tc, "Object", w1, "Vector")
    w2 = nb.add("ShaderNodeTexWave", inputs={"Scale": 1400, "Distortion": .4, "Detail": 0}, wave_type="BANDS", bands_direction="Y", wave_profile="SIN")
    nb.link(tc, "Object", w2, "Vector")
    ad = nb.add("ShaderNodeMath", operation="ADD"); nb.link(w1, 0, ad, 0); nb.link(w2, 0, ad, 1)
    nl = nb.add("ShaderNodeTexNoise", inputs={"Scale": 3, "Detail": 4}); nb.link(tc, "Object", nl, "Vector")
    col = nb.add("ShaderNodeMix", data_type="RGBA", blend_type="MULTIPLY"); col.inputs[0].default_value = .35
    col.inputs[6].default_value = srgb("#b79cf0"); nb.link(nl, "Color", col, 7)
    bump = nb.add("ShaderNodeBump", inputs={"Strength": .25, "Distance": .0004}); nb.link(ad, 0, bump, "Height")
    b = nb.add("ShaderNodeBsdfPrincipled", inputs={"Roughness": .3})
    nb.link(col, 2, b, "Base Color")
    b.inputs["Anisotropic"].default_value = .6
    b.inputs["Sheen Weight"].default_value = .5; b.inputs["Sheen Roughness"].default_value = .3
    b.inputs["Specular IOR Level"].default_value = .7
    nb.link(bump, "Normal", b, "Normal")
    nb.out(b)
    return m


reset()
tick("start")
import tempfile
CACHE = os.path.join(os.environ.get("REALISM_CACHE", os.path.join(tempfile.gettempdir(), "realism_cache")), "avatar_base.blend")
os.makedirs(os.path.dirname(CACHE), exist_ok=True)
if os.path.exists(CACHE):
    with bpy.data.libraries.load(CACHE) as (src, dst):
        dst.objects = list(src.objects)
        dst.materials = []
    for o in dst.objects:
        link(o)
    objs = {o.name: o for o in bpy.data.objects}
    body = objs["Body"]; eye_asset = objs["A_eyes"]; brow_asset = objs["A_brows"]; lash_asset = objs["A_lashes"]
    D = os.path.join(os.environ.get("APPDATA", ""), "Blender Foundation", "Blender", "5.2", "extensions", ".user", "blender_org", "mpfb", "data")
    tick("cache loaded")
else:
    h, D = make_body()
    HS = svc("humanservice").HumanService
    for rel, t in (("eyes/high-poly/high-poly.mhclo", "Eyes"), ("eyebrows/eyebrow002/eyebrow002.mhclo", "Eyebrows"),
                   ("eyelashes/eyelashes02/eyelashes02.mhclo", "Eyelashes")):
        HS.add_mhclo_asset(os.path.join(D, rel), h, asset_type=t, subdiv_levels=0, material_type="MAKESKIN")
    tick("mpfb human + assets")
    eye_asset = [o for o in bpy.data.objects if o.name.endswith("high-poly")][0]
    brow_asset = [o for o in bpy.data.objects if "eyebrow" in o.name][0]
    lash_asset = [o for o in bpy.data.objects if "eyelashes" in o.name][0]
    body = bake_mesh(h, "Body")
    # congela os assets na posicao do mundo e desparenta
    for o, nm in ((eye_asset, "A_eyes"), (brow_asset, "A_brows"), (lash_asset, "A_lashes")):
        me = o.data.copy(); me.transform(o.matrix_world)
        n = bpy.data.objects.new(nm, me); link(n)
        o.name = nm + "_old"
    eye_asset = bpy.data.objects["A_eyes"]; brow_asset = bpy.data.objects["A_brows"]; lash_asset = bpy.data.objects["A_lashes"]
    keep = {body, eye_asset, brow_asset, lash_asset}
    bpy.data.libraries.write(CACHE, keep, fake_user=True)
    tick("cache written")
body.data.materials.clear()
body.data.materials.append(mat_skin(body, D))
for p in body.data.polygons:
    p.use_smooth = True
# subdivisao leve na renderizacao (pele suave) sem mudar a topologia base
sd = body.modifiers.new("sub", "SUBSURF"); sd.levels = 1; sd.render_levels = 1
tick("body")

# olhos reais: globo + cornea refrativa
eye_centers = []
ws = [eye_asset.matrix_world @ v.co for v in eye_asset.data.vertices]
for sg in (-1, 1):
    pts = [p for p in ws if p.x * sg > 0]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    eye_centers.append(((mn + mx) / 2, (mx.z - mn.z) / 2, (mx.x - mn.x) / 2))
print("EYES", [(tuple(round(v, 4) for v in c), round(rz, 4), round(rx, 4)) for c, rz, rx in eye_centers])
sc_m, ir_m, co_m = mat_eye_parts()
eyes = add_eyeballs(eye_centers, ir_m, co_m)
mat_lash = mat_hair_strand("lash_mat", srgb("#1d130e"), rough=.35)
mat_brow = mat_hair_strand("brow_mat", srgb("#241a10"), tip=srgb("#3a2a18"), rough=.4)
lashes = lashes_from_asset(lash_asset, eye_centers, mat_lash)
brows = brows_from_asset(brow_asset, mat_brow)
tick("eyes/lashes/brows")

# cabelo loiro em coque (mechas claras = fios com 'Random' alto)
m_hair = new_mat("blonde_hair")
nb = NB(m_hair)
hi = nb.add("ShaderNodeHairInfo")
cr = color_ramp(nb, hi.outputs["Random"], [(0.0, srgb("#8d6a39")), (0.5, srgb("#b98f55")), (0.78, srgb("#d4b075")), (1.0, srgb("#e9d3a0"))])
gr = nb.add("ShaderNodeMapRange", inputs={1: 0.0, 2: 0.22, 3: 0.8, 4: 0}, use_clamp=True); nb.link(hi, "Intercept", gr, 0)
rm = nb.add("ShaderNodeMix", data_type="RGBA"); rm.inputs[7].default_value = srgb("#8b7448"); nb.link(gr, 0, rm, 0); nb.link(cr, 0, rm, 6)
bh = nb.add("ShaderNodeBsdfHairPrincipled", parametrization="COLOR")
nb.link(rm, 2, bh, "Color")
bh.inputs["Roughness"].default_value = .3; bh.inputs["Radial Roughness"].default_value = .45
bh.inputs["Coat"].default_value = .15; bh.inputs["IOR"].default_value = 1.55; bh.inputs["Random Roughness"].default_value = .12
nb.out(bh)
hair_objs, hinfo = build_hair(body, m_hair, n_strands=(1500 if QUICK else 5200))
tick("hair")

# roupa
tee = make_tee(body, mat_cotton())
skirt_parts = make_skirt(body, mat_satin())
tick("clothes")

# limpar auxiliares
for o in list(bpy.data.objects):
    if o.name.startswith(("Human", "Cube", "Camera", "Light")) or o.name.endswith("_old") or o in (eye_asset, brow_asset, lash_asset):
        bpy.data.objects.remove(o)

eye_z = eye_centers[0][0].z
backdrop()
setup_cycles(SAMPLES, res=SHOTS[SHOT.split(",")[0]]["res"], exposure=0.0, look="AgX - Base Contrast")
sc_ = bpy.context.scene.cycles
sc_.max_bounces = 6; sc_.diffuse_bounces = 3; sc_.glossy_bounces = 3; sc_.transmission_bounces = 6; sc_.transparent_max_bounces = 4
sc_.adaptive_threshold = 0.02; sc_.adaptive_min_samples = 16
tick("scene ready")
for shot in SHOT.split(","):
    tgt_z = 1.30 if shot != "full" else 0.9
    for l in [o for o in bpy.data.objects if o.type == "LIGHT"]:
        bpy.data.objects.remove(l)
    studio_lights(target=(0, 0, tgt_z))
    shot_camera(shot, eye_z)
    bpy.context.scene.render.resolution_x, bpy.context.scene.render.resolution_y = SHOTS[shot]["res"]
    out = OUT if "," not in SHOT else OUT.replace(".png", "_%s.png" % shot)
    render(out)
    tick("done " + shot)

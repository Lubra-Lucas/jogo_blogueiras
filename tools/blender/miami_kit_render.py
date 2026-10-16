"""
Previa do kit de Miami: monta as pecas lado a lado com paletas e renderiza (EEVEE). So para revisar a arte.
Uso: blender -b --factory-startup -noaudio --python tools/blender/miami_kit_render.py -- <grupo> <saida.png>
Grupos: buildings | beach | airport
"""
import bpy
import os
import sys
from math import pi, radians
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import city_kit as ck  # noqa
import miami_kit as mk  # noqa

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
GROUP = argv[0] if argv else "buildings"
OUTP = argv[1] if len(argv) > 1 else "C:/Users/user/AppData/Local/Temp/claude/shots/miami/kit_%s.png" % GROUP

LAYOUT = {
    "buildings": [("deco_hotel_a", "mint"), ("deco_hotel_b", "peach"), ("deco_hotel_c", "cream"), ("deco_tower", "sky"), ("deco_shop", "lemon"), ("deco_hotel_a", "aqua")],
    "beach": [("palm_royal", "nat"), ("palm_coconut", "nat"), ("lifeguard_tower", "lg_yellow"), ("lifeguard_tower", "lg_turq"), ("umbrella", "mint"), ("lounger", "peach"),
              ("beach_bar", "nat"), ("cabana", "white"), ("surf_rack", "sky"), ("icecream_cart", "mint"), ("kiosk_deco", "peach"), ("lamp_deco", "cream"), ("bench_deco", "cream"),
              ("planter_deco", "white"), ("vball_net", "white"), ("shrub", "nat")],
    "airport": [("airport_terminal", "white"), ("checkin_counter", "white"), ("airplane_deco", "white"), ("pier_head", "white"), ("pier_deck", "white"), ("sign_hotel", "white"), ("sign_beach", "white")],
}


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    ck.M.clear()
    ck.M.update(mk.setup_mats("mint"))
    fns = {n: (f, l) for n, f, l in mk.PIECES}
    cache = {}
    items = LAYOUT[GROUP]
    x = 0.0
    pos = []
    for name, pal in items:
        ob = mk.finish(name, fns[name][0]())
        bb = [Vector(c) for c in ob.bound_box]
        w = max(c.x for c in bb) - min(c.x for c in bb)
        cx = (max(c.x for c in bb) + min(c.x for c in bb)) / 2
        ob.location.x = x + w / 2 - cx
        x += w + 2.2
        mats = cache.setdefault(pal, mk.setup_mats(pal, "@" + pal))
        ob.data = ob.data.copy()
        for i, m in enumerate(ob.data.materials):
            if m and m.name.split("@")[0] in mats:
                ob.data.materials[i] = mats[m.name.split("@")[0]]
        pos.append((ob.location.x, w))
    total = x
    # chao
    bpy.ops.mesh.primitive_plane_add(size=total * 3, location=(total / 2, 0, -0.01))
    g = bpy.context.object
    gm = ck._mk("ground", "#e9dcb8", rough=0.9, coat=0.0)
    g.data.materials.append(gm)
    # luz + ceu
    bpy.ops.object.light_add(type="SUN", location=(0, 0, 30))
    sun = bpy.context.object
    sun.data.energy = 4.0
    sun.rotation_euler = (radians(50), radians(8), radians(-120))
    w = bpy.data.worlds.new("w")
    bpy.context.scene.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    bg.inputs[0].default_value = ck.lin("#bfe4f5")
    bg.inputs[1].default_value = 1.1
    # camera: frente (-Y) olhando +Y, levemente de cima e de lado
    span = total
    bpy.ops.object.camera_add(location=(span / 2 + span * 0.12, -span * 0.62 - 12, span * 0.18 + 5))
    cam = bpy.context.object
    cam.data.lens = 38 if GROUP != "beach" else 42
    d = Vector((span / 2, 0, 3.2)) - cam.location
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = cam
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_EEVEE"
    sc.render.resolution_x, sc.render.resolution_y = 2000, 760
    sc.render.filepath = OUTP
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.exposure = -0.2
    os.makedirs(os.path.dirname(OUTP), exist_ok=True)
    bpy.ops.render.render(write_still=True)
    print("RENDERED", OUTP)


main()

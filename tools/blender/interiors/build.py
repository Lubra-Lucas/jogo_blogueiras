"""blender -b -P tools/blender/interiors/build.py -- <room> [piece ...]   (room: shared casa cafe salao boutique joalheria estudio palco)"""
import sys, os, importlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import lib
args = sys.argv[sys.argv.index("--") + 1:]
room, only = args[0], set(args[1:])
bpy.ops.wm.read_factory_settings(use_empty=True)
importlib.import_module("r_" + room)
infos = lib.export_room(room, only or None)
lib.update_json(room, infos)
print("TOTAL", sum(i["tris"] for i in infos.values()), "KB", sum(i["bytes"] for i in infos.values()) // 1024)

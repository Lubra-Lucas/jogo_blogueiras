import bpy, addon_utils, importlib, os, sys
for m in addon_utils.modules():
    if 'mpfb' in m.__name__.lower(): addon_utils.enable(m.__name__, default_set=True); base=m.__name__
HS = importlib.import_module(base + ".services.humanservice").HumanService
LS = importlib.import_module(base + ".services.locationservice").LocationService
TS = importlib.import_module(base + ".services.targetservice").TargetService
md = TS.get_default_macro_info_dict()
md.update(gender=0.0, age=0.5, muscle=0.4, weight=0.42, proportions=0.6, height=0.5, cupsize=0.5, firmness=0.6)
md["race"] = {"asian":0.0,"caucasian":1.0,"african":0.0}
h = HS.create_human(mask_helpers=True, detailed_helpers=False, extra_vertex_groups=True, feet_on_ground=True, scale=0.1, macro_detail_dict=md)
print("HUMAN", h.name, len(h.data.vertices), tuple(h.dimensions), [vg.name for vg in h.vertex_groups][:200])
print("shape keys", len(h.data.shape_keys.key_blocks))
D = LS.get_user_data()
mats=[m.name for m in h.data.materials]; print("mats",mats)
for rel in ("eyes/high-poly/high-poly.mhclo","eyebrows/eyebrow001/eyebrow001.mhclo","eyelashes/eyelashes01/eyelashes01.mhclo"):
    o = HS.add_mhclo_asset(os.path.join(D,rel), h, asset_type=("Eyes" if "eyes" in rel else "Eyebrows" if "brow" in rel else "Eyelashes"), subdiv_levels=0, material_type="MAKESKIN")
    print("asset", o.name, len(o.data.vertices), tuple(o.dimensions), [m.name for m in o.data.materials], [ (round(x,3)) for x in o.location])
for o in bpy.data.objects: print(o.name,o.type)
bpy.ops.wm.save_as_mainfile(filepath=os.environ.get("TMP_OUT","C:/tmp_h.blend"))

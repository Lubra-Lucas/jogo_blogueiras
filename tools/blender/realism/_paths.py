import bpy, addon_utils, importlib, os
for m in addon_utils.modules():
    if 'mpfb' in m.__name__.lower(): addon_utils.enable(m.__name__, default_set=True); base=m.__name__
LS = importlib.import_module(base + ".services.locationservice").LocationService
print("BASE",base)
print("user", LS.get_user_data()); print("sys", LS.get_mpfb_data()); print("user_home",LS.get_user_home() if hasattr(LS,'get_user_home') else '')
for d in (LS.get_user_data(), LS.get_mpfb_data()):
    for r,ds,fs in os.walk(d):
        if r.count(os.sep)-d.count(os.sep)<=2: print(r, len(fs), ds[:12])

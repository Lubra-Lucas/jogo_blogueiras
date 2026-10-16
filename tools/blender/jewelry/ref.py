import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from jlib import *
clear_scene(); body = load_doll(); setup_render(900, 900, 24)
for tgt, loc, name in [((0, 0, 1.42), (-0.6, -0.9, 1.55), "ref_34"), ((0, 0, 1.42), (1.0, 0, 1.45), "ref_side"), ((0, 0, 1.15), (0, -1.2, 1.3), "ref_neck")]:
    camera(loc, tgt, 85); render(os.path.join(SHOTS, name + ".png"))

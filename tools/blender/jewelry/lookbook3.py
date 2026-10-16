"""6 complete looks with the round-3 accessories -> shots/acc3/lookbook3.png  (python lookbook3.py; needs jewelry built + hair_fit)
top row: walk pose (walk_normal clip), bottom row: head 3/4 close-up."""
import subprocess, os
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
BL = r"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
SH = os.environ.get("JEWEL_SHOTS", r"C:\Users\user\AppData\Local\Temp\claude\shots\acc3")
SETS = [
 ("Praia", "sun_hat,cat_eye_sunglasses,shell_necklace,straw_beach_bag,friendship_bracelet,anklet,flower_earrings", ["--hair", "hair_caramelCurls", "--metal", "gold"], "walk_normal:0.30", "", "tank,denim_shorts", "full34"),
 ("Gala", "feather_tiara,satin_sash,clutch_bag,flower_brooch,chandelier_drops,tennis_bracelet,anklet", ["--hair", "hair_meshy_updo", "--metal", "gold"], "walk_normal:0.62", "", "slip_dress", "full34"),
 ("Y2K", "bucket_hat,y2k_shield_glasses,heart_bag,chain_belt,butterfly_earrings,y2k_bead_bracelet,anklet", ["--hair", "hair_platinumUndercut", "--metal", "silver"], "walk_normal:0.05", "", "cami_top,cargo,chunky_sneakers", "full34"),
 ("Chique de rua", "beret,elegant_optical_glasses,silk_scarf,leather_belt,structured_handbag,gold_watch,pearl_studs", ["--hair", "hair_chestnutWaves", "--metal", "gold"], "walk_normal:0.85", "structured_handbag:ribbon=~6b3f1f;pearl=~6b3f1f", "tee,skinny_jeans,loafers", "full34"),
 ("Esportiva", "baseball_cap,aviator_sunglasses,mini_backpack,sport_watch,small_hoops,initial_necklace_l", ["--hair", "hair_caramelCurls", "--metal", "gold"], "walk_normal:0.45", "", "cropped_sweatshirt,cycling_shorts,chunky_sneakers", "full34"),
 ("Cowgirl", "cowboy_hat,heart_sunglasses,crossbody_bag,thin_gold_belt,friendship_bracelet,ear_climbers,bow_brooch", ["--hair", "hair_platinumUndercut", "--metal", "gold"], "walk_normal:0.20", "", "plaid_shirt,denim_skirt,cowboy_boots", "full34"),
]
jobs = []
for i, s in enumerate(SETS):
    jobs.append((i, "top")); jobs.append((i, "face"))


def run(j):
    i, kind = j; n, pcs, extra, pose, cols, garm, cam = SETS[i]; name = "_lb3_%d_%s" % (i, kind)
    cmd = ["", "-b"]; cmd[0] = BL; cmd = cmd[:]+[]
    cmd = [BL, "-b", "--factory-startup", "-noaudio", "--python", os.path.join(HERE, "render_jewelry.py"), "--", "--pieces", pcs, "--out", name, "--samples", "40"] + extra
    if cols: cmd += ["--cols", cols]
    cmd += ["--garments", garm]
    if kind == "top": cmd += ["--cam", cam, "--size", "700,1000", "--pose", pose]
    else: cmd += ["--cam", "hat34", "--size", "700,700"]
    subprocess.run(cmd, capture_output=True, env=dict(os.environ, JEWEL_SHOTS=SH))
    return os.path.join(SH, name + ".png")


with ThreadPoolExecutor(4) as ex: paths = list(ex.map(run, jobs))
W = 700; sheet = Image.new("RGB", (W*6, 1000 + 700), (150, 152, 158)); d = ImageDraw.Draw(sheet)
for k, p in enumerate(paths):
    i = k//2
    try: sheet.paste(Image.open(p).convert("RGB"), (i*W, 0 if k % 2 == 0 else 1000))
    except Exception as e: print("missing", p)
for i, s in enumerate(SETS): d.text((i*W + 14, 12), s[0], fill=(255, 255, 255))
sheet.save(os.path.join(SH, "lookbook3.png")); print("ok")
for p in paths:
    try: os.remove(p)
    except Exception: pass

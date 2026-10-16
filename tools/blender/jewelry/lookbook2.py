"""5 themed sets -> shots/jewelry2/lookbook2.png  (python lookbook2.py; needs jewelry built)"""
import subprocess, os
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
BL = r"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
SH = r"C:\Users\user\AppData\Local\Temp\claude\shots\jewelry2"
SETS = [
 ("Princesa", "pearl_tiara,double_pearls,pearl_drop_earrings,pearl_bracelet,pearl_ring", ["--hair", "hair_chestnutWaves", "--metal", "gold"]),
 ("Y2K", "y2k_bead_necklace,butterfly_earrings,butterfly_clips,y2k_bead_bracelet,star_ring", ["--hair", "hair_caramelCurls", "--metal", "silver"]),
 ("Gala", "queen_crown,bib_necklace,chandelier_drops,wide_cuff,cocktail_ring", ["--hair", "hair_meshy_updo", "--metal", "gold", "--gem", "#0f9d6b"]),
 ("Goth fofo", "spike_choker,moon_earrings,giant_bow,hand_chain,star_ring", ["--hair", "hair_platinumUndercut", "--metal", "silver"]),
 ("Praia", "flower_crown,shell_necklace,flower_earrings,y2k_bead_bracelet,gold_watch", ["--hair", "hair_caramelCurls", "--metal", "gold"]),
]
jobs = []
for i, (n, pcs, extra) in enumerate(SETS):
    jobs.append((i, "top", pcs, extra, "setshot", "700,900")); jobs.append((i, "hand", pcs, extra, "hand", "700,520"))


def run(j):
    i, kind, pcs, extra, cam, size = j; name = "_lb_%d_%s" % (i, kind)
    subprocess.run([BL, "-b", "--factory-startup", "-noaudio", "--python", os.path.join(HERE, "render_jewelry.py"), "--", "--pieces", pcs, "--cam", cam,
                    "--out", name, "--size", size, "--samples", "40"] + (extra if kind == "top" else [x for x in extra if x != "--hair" and not x.startswith("hair_")]), capture_output=True)
    return os.path.join(SH, name + ".png")


with ThreadPoolExecutor(4) as ex: paths = list(ex.map(run, jobs))
W, H1, H2 = 700, 900, 520
sheet = Image.new("RGB", (W*5, H1+H2), (150, 152, 158)); d = ImageDraw.Draw(sheet)
for k, p in enumerate(paths):
    i = k//2; im = Image.open(p).convert("RGB")
    sheet.paste(im, (i*W, 0 if k % 2 == 0 else H1))
for i, (n, pcs, _) in enumerate(SETS): d.text((i*W+14, 12), n, fill=(255, 255, 255))
sheet.save(os.path.join(SH, "lookbook2.png")); print("ok")
for p in paths: os.remove(p)

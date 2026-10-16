"""Contact sheet: python contact.py OUT.png COLS "pid:cam[:k=v,k=v]" ...  (renders in parallel, tiles with Pillow)
keys: pieces (a+b), metal, hair, bust, gem, ribbon, pearl, label, size. cam names from render_jewelry.py"""
import sys, os, subprocess, tempfile
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageDraw
BL = r"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
HERE = os.path.dirname(os.path.abspath(__file__))
SH = r"C:\Users\user\AppData\Local\Temp\claude\shots\jewelry2"; os.makedirs(SH, exist_ok=True)
out, cols = sys.argv[1], int(sys.argv[2]); items = sys.argv[3:]


def job(a):
    i, it = a
    parts = it.split(":"); pid, cam = parts[0], parts[1]
    kv = dict(x.split("=", 1) for x in parts[2].split(",")) if len(parts) > 2 else {}
    name = "_tmp_%s_%d" % (os.path.basename(out)[:-4], i)
    cmd = [BL, "-b", "--factory-startup", "-noaudio", "--python", os.path.join(HERE, "render_jewelry.py"), "--", "--pieces", kv.get("pieces", pid).replace("+", ","),
           "--cam", cam, "--out", name, "--size", kv.get("size", "700,700"), "--samples", "32"]
    for k in ("metal", "hair", "bust", "morph", "gem", "ribbon", "pearl", "metals"):
        if k in kv: cmd += ["--" + k, kv[k].replace("~", "#")]
    subprocess.run(cmd, capture_output=True)
    return os.path.join(SH, name + ".png"), kv.get("label", pid)


with ThreadPoolExecutor(4) as ex: res = list(ex.map(job, enumerate(items)))
ims = []
for p, lab in res:
    try: ims.append((Image.open(p).convert("RGB"), lab))
    except Exception as e: print("missing", p, lab)
if ims:
    w, h = ims[0][0].size; rows = (len(ims)+cols-1)//cols
    sheet = Image.new("RGB", (w*cols, h*rows), (150, 152, 158))
    for k, (im, lab) in enumerate(ims):
        sheet.paste(im, ((k % cols)*w, (k//cols)*h)); ImageDraw.Draw(sheet).text(((k % cols)*w+10, (k//cols)*h+8), lab, fill=(255, 255, 255))
    sheet.save(os.path.join(SH, out)); print(os.path.join(SH, out))
for p, _ in res:
    try: os.remove(p)
    except Exception: pass

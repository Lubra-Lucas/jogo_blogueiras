"""Contact sheet: python contact.py OUT.png COLS "pid:cam[:k=v,k=v]" ...  (renders in parallel, tiles with Pillow)
keys: pieces (a+b), metal, hair, bust, morph, gem, ribbon, pearl, metals, pose (clip@time), cols (id@slot=~hex;slot=~hex+id2@...), label, size.
cam names from render_jewelry.py.  Output dir: env JEWEL_SHOTS (default shots/jewelry2)."""
import sys, os, subprocess, tempfile
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageDraw
BL = r"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
HERE = os.path.dirname(os.path.abspath(__file__))
SH = os.environ.get("JEWEL_SHOTS", r"C:\Users\user\AppData\Local\Temp\claude\shots\jewelry2"); os.makedirs(SH, exist_ok=True)
out, cols = sys.argv[1], int(sys.argv[2]); items = sys.argv[3:]


def job(a):
    i, it = a
    parts = it.split(":"); pid, cam = parts[0], parts[1]
    kv = dict(x.split("=", 1) for x in parts[2].split(",")) if len(parts) > 2 else {}
    name = "_tmp_%s_%d" % (os.path.basename(out)[:-4], i)
    cmd = [BL, "-b", "--factory-startup", "-noaudio", "--python", os.path.join(HERE, "render_jewelry.py"), "--", "--pieces", kv.get("pieces", pid).replace("+", ","),
           "--cam", cam, "--out", name, "--size", kv.get("size", "700,700").replace("/", ","), "--samples", "32"]
    for k in ("metal", "hair", "bust", "morph", "gem", "ribbon", "pearl", "metals", "pose", "cols", "garments"):
        if k in kv:
            v = kv[k].replace("~", "#")
            if k == "pose": v = v.replace("@", ":")
            if k == "cols": v = v.replace("@", ":").replace("+", ",")
            if k == "garments": v = v.replace("+", ",").replace("@", ":")
            cmd += ["--" + k, v]
    r = subprocess.run(cmd, capture_output=True, text=True, env=dict(os.environ, JEWEL_SHOTS=SH))
    if not os.path.exists(os.path.join(SH, name + ".png")): print("RENDER FAIL", it, (r.stdout + r.stderr)[-800:])
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

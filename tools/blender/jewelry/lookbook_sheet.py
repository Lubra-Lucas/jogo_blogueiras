"""Contact sheet from lb_*.png renders (system python + Pillow)."""
from PIL import Image, ImageDraw
import os
S = r"C:\Users\user\AppData\Local\Temp\claude\shots\jewelry"
names = [("lb_1_gold.png", "Princesa dourada"), ("lb_2_rosegold.png", "Kawaii ouro rose"), ("lb_3_chrome.png", "Glam cromado gelo")]
W, H = 600, 700
sheet = Image.new("RGB", (W*3, H + 190), (236, 205, 222))
for i, (n, label) in enumerate(names):
    im = Image.open(os.path.join(S, n)).convert("RGB")
    top = im.crop((230, 40, 790, 560)).resize((W, int(W*520/560)))
    sheet.paste(top, (i*W, 0))
    hand = im.crop((20, 690, 200, 840)).resize((300, 250)); hand2 = im.crop((700, 690, 880, 840)).resize((300, 250))
    sheet.paste(hand.crop((0, 0, 300, 190)), (i*W, H-120+0)); sheet.paste(hand2.crop((0, 0, 300, 190)), (i*W+300, H-120))
    d = ImageDraw.Draw(sheet); d.text((i*W+12, 10), label, fill=(80, 30, 60))
sheet.save(os.path.join(S, "jewelry_lookbook.png"))

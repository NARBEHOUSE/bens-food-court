"""sheet.py <out.png> <cell height> <image>... : a labelled contact sheet (one row per 5 images)."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
out, h, files = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
ims = [Image.open(f).convert('RGB') for f in files]
cells = [im.resize((round(im.width * h / im.height), h), Image.LANCZOS) for im in ims]
cols = min(5, len(cells)); rows = (len(cells) + cols - 1) // cols
cw = max(c.width for c in cells); lab = 22
sheet = Image.new('RGB', (cols * cw, rows * (h + lab)), (60, 60, 64))
d = ImageDraw.Draw(sheet)
try: font = ImageFont.truetype('arial.ttf', 16)
except Exception: font = ImageFont.load_default()
for k, (c, f) in enumerate(zip(cells, files)):
    x, y = (k % cols) * cw, (k // cols) * (h + lab)
    sheet.paste(c, (x + (cw - c.width) // 2, y + lab))
    d.text((x + 6, y + 3), Path(f).parent.name + '/' + Path(f).stem, fill=(255, 255, 255), font=font)
sheet.save(out)
print(out, sheet.size)

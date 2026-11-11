"""crop_stores.py <court.png> <out dir> <boxes.json>: cut each storefront out of the court picture as a reference
image for the counter-scene jobs (write_counters.py). boxes.json maps store id -> [x0, y0, x1, y1] in percent of the
picture (the `store` boxes of packs/court/court.js layout). Each crop is padded by 2% and saved as <out dir>/<id>.png."""
import json
import sys
from pathlib import Path
from PIL import Image

src, out, boxes = Path(sys.argv[1]), Path(sys.argv[2]), json.loads(Path(sys.argv[3]).read_text())
out.mkdir(parents=True, exist_ok=True)
im = Image.open(src).convert('RGB')
w, h = im.size
for sid, (x0, y0, x1, y1) in boxes.items():
    pad = 2
    box = (max(0, round((x0 - pad) / 100 * w)), max(0, round((y0 - pad) / 100 * h)),
           min(w, round((x1 + pad) / 100 * w)), min(h, round((y1 + pad) / 100 * h)))
    crop = im.crop(box)
    crop.save(out / f'{sid}.png')
    print(sid, box, crop.size)

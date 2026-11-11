"""paste_back.py <orig.png> <edited.png> <out.png> <sheet.png> x0,y0,x1,y1 [...]   (boxes in percent of the picture)
Aligns the edited picture to the original (ECC affine, the boxes masked out), then pastes back ONLY the pixels inside
the boxes that the edit really changed (a cleaned, feathered difference mask), so everything else stays the original.
Run with the ComfyUI venv python (numpy, cv2, scipy). Used 2026-11-09 for art-source/jobs/write_queue_fixes.py: an
image edit changes a whole picture slightly, so only the boxed people are pasted back and the measured lines never move."""
import sys
import numpy as np, cv2
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
orig, edited, out, sheet = sys.argv[1:5]
boxes = [tuple(float(v) for v in b.split(',')) for b in sys.argv[5:]]
O = np.asarray(Image.open(orig).convert('RGB')).astype(np.float32)
E = Image.open(edited).convert('RGB')
H, W = O.shape[:2]
if E.size != (W, H):
    print('edited size', E.size, '-> resized to', (W, H)); E = E.resize((W, H), Image.LANCZOS)
E = np.asarray(E).astype(np.float32)
R = np.zeros((H, W), bool)
for x0, y0, x1, y1 in boxes:
    R[int(H*(y0-1)/100):int(H*(y1+1)/100), int(W*(x0-1)/100):int(W*(x1+1)/100)] = True
outside = ~ndi.binary_dilation(R, iterations=20)
g = lambda a: cv2.cvtColor(a.astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32) / 255
before = np.abs(O - E)[outside].mean()
warp = np.eye(2, 3, dtype=np.float32)
try:
    s = 0.5
    _, warp = cv2.findTransformECC(cv2.resize(g(O), None, fx=s, fy=s), cv2.resize(g(E), None, fx=s, fy=s), warp,
                                   cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6),
                                   cv2.resize(outside.astype(np.uint8), None, fx=s, fy=s, interpolation=cv2.INTER_NEAREST), 5)
    warp[:, 2] /= s
except cv2.error as e:
    print('ECC failed, no alignment:', e)
Ea = cv2.warpAffine(E, warp, (W, H), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REFLECT)
after = np.abs(O - Ea)[outside].mean()
print(f'warp {np.round(warp, 4).tolist()}  mean |diff| outside the boxes: before {before:.1f}, after {after:.1f}')
d = np.abs(cv2.GaussianBlur(O, (5, 5), 0) - cv2.GaussianBlur(Ea, (5, 5), 0)).max(axis=2)
m = (d > 40) & R
m = ndi.binary_closing(m, structure=np.ones((9, 9)), iterations=2)
m = ndi.binary_fill_holes(m)
lab, n = ndi.label(m)
if n:
    sizes = ndi.sum(m, lab, range(1, n+1)); m = np.isin(lab, 1 + np.flatnonzero(sizes >= 400))
m = ndi.binary_dilation(m, iterations=6) & R
a = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 3)[..., None]
Out = O * (1 - a) + Ea * a
Image.fromarray(np.clip(Out, 0, 255).astype(np.uint8)).save(out)
print('changed pixels', int(m.sum()), f'({100*m.mean():.2f}% of the picture)')
ys, xs = np.nonzero(R); y0, y1 = max(0, ys.min()-60), min(H, ys.max()+60); x0, x1 = max(0, xs.min()-60), min(W, xs.max()+60)
tiles = [O, Ea, Out, np.dstack([m*255]*3).astype(np.float32)]
crops = [Image.fromarray(np.clip(t[y0:y1, x0:x1], 0, 255).astype(np.uint8)) for t in tiles]
k = 2 if (x1-x0) < 500 else 1
crops = [c.resize((c.width*k, c.height*k), Image.NEAREST) for c in crops]
S = Image.new('RGB', (sum(c.width for c in crops)+30, crops[0].height+18), (25, 25, 25)); dr = ImageDraw.Draw(S); x = 0
for lbl, c in zip(['original', 'edited (aligned)', 'RESULT', 'pasted mask'], crops):
    S.paste(c, (x, 18)); dr.text((x+4, 3), lbl, fill=(255, 255, 0)); x += c.width + 10
S.save(sheet); print('sheet', S.size)

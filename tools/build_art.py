"""Ben's Food Court - turn the raw generated art into the game's images (FOODCOURT-BUILD.md 3, 5.2, 6.2; docs/api/cast.md).

Reads the raw art in art-source/ (never loaded by the game) and writes, cutting people and props out with BiRefNet
and taking the white paper back out of their edges:
  art-source/cast/<id>/<pose>.png         -> packs/cast/art/cast/<id>/<pose>.webp      768 x 1152, the whole canvas, so
                                             every pose of a character is the same size (a pose swap never jumps)
  art-source/backdrops/{counter,grill,board}.png -> packs/diner/art/backdrops/<name>.webp     1536 x 1024, sharp
  art-source/backdrops/<pack>-<name>.png  -> packs/<pack>/art/backdrops/<name>.webp    1536 x 1024, sharp
  art-source/backdrops/court.png          -> packs/court/art/court.webp                1536 x 1024, sharp, no blur
  art-source/props/{shutter,grandOpening,goldSign,progressBoard}.png -> packs/court/art/props/<name>.webp
  art-source/props/<pack>-<name>.png      -> packs/<pack>/art/props/<name>.webp  (a restaurant's own version of a prop)
  art-source/props/<name>.png (the rest)  -> packs/shared/art/props/<name>.webp  (register, bell, back5, spatula, ...)
  art-source/court-food/<pack>-<name>.png -> packs/court/art/food/<pack>-<name>.webp  the food on the court's tables:
                                             already transparent (tools/food-frames.cjs <pack> courtfood renders it on
                                             the CPU, keyed twice), so no cut-out: cropped, at most 256 px, q90
and the manifests, so the game only ever asks for a picture that exists:
  packs/cast/art/manifest.js     BBArt.cast   = { people: { <folder>: [poses] }, castSize, extent }
                                 extent: { <folder>: { <pose>: [x0, x1, top] } }, the figure above the hips (what
                                 shows over the counter), as fractions of the canvas (stage.js places Mitch by it)
  packs/shared/art/manifest.js   BBArt.shared = { props: [names] }
  packs/court/art/manifest.js    BBArt.court  = { picture, pictureSize, props, food: { <pack>-<name>: [w, h] } }
  packs/<pack>/art/manifest.js   BBArt[pack]  = { backdrops, props, backdropSize, counter? }  (every pack with art, the
                                 diner too: its old { cast, castSize } and packs/diner/art/{cast,props} copies went in
                                 phase 3, 2026-11-10; the cast is packs/cast/art, the props packs/shared/art)
  The court's six shoppers left with crowd-cast (2026-11-10: the court's crowd is the game's own customers), and their
  art went to archives/games/2026-11-10/BENSFOODCOURT-removed; a shopper<N> folder in art-source/cast is skipped.
  `counter` is the counter picture's own layout, copied from art-source/backdrops/<picture>.layout.json beside it
  (counter.layout.json for the diner, <pack>-counter.layout.json): { queue: [x0, x1], heads, feet, eyes, horizon,
  sign: [x0, y0, x1, y1] | null }, fractions of the picture (docs/api/page.md 7). Measured by hand: a picture newer
  than its layout file is reported, so a redrawn picture is measured again in that one place.

Run it with the ComfyUI python that has torch and BiRefNet (the GPU is used only to cut out; BB_CUTOUT=cpu cuts out on
the CPU instead, in float32: slower, about 10 s a picture, and the GPU is never touched):
  "%USERPROFILE%/Documents/WSD-Art-Tools/ComfyUI/.venv/Scripts/python.exe" tools/build_art.py [ids...] [--dry] [--force]
  ids      only these cast folders; backdrops and props are still brought up to date
  --dry    list what would be built and what is still missing; write nothing
  --force  rebuild outputs even when they are newer than their source
Incremental: an output newer than its source is skipped. A source that cannot be read yet (still being written) is
reported and skipped, and the next run picks it up.
"""
import importlib.util
import json
import re
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image

GAME = Path(__file__).resolve().parent.parent
SRC = GAME / 'art-source'
PACKS_DIR = GAME / 'packs'
MODEL = Path.home() / 'Documents' / 'WSD-Art-Tools' / 'ComfyUI' / 'models' / 'RMBG' / 'BiRefNet'

PACKS = ('smoothie', 'burrito', 'pizza', 'diner', 'cafe', 'sushi', 'icecream')     # spec 2.1, in scan order
DINER_BACKDROPS = ('counter', 'grill', 'board')         # the unprefixed backdrop sources are the diner's (spec 5.2)
COURT_PROPS = ('shutter', 'grandOpening', 'goldSign', 'progressBoard')
CAST_SIZE = (768, 1152)          # every pose canvas, from 1024 x 1536 (a figure about half the screen high stays sharp)
BACKDROP_SIZE = (1536, 1024)
PICTURE_SIZE = (1536, 1024)      # the court
PROP_MAX = 640
# cast 80 (was 88 until 2026-11-10): 19% smaller, no difference at the size a figure is drawn (up to about a window
# high) nor at 2x; at 75 skin and hair texture visibly smoothed. Backdrops stay 86: they are drawn larger than 1:1.
QUALITY = {'cast': 80, 'prop': 90, 'backdrop': 86, 'court': 90, 'food': 90}
FOOD_MAX = 256                   # a court food picture's longest side (it is drawn about 40 px wide on a 1080 p court)
CPU = __import__('os').environ.get('BB_CUTOUT', '').lower() == 'cpu'
# The poses the game asks for (spec 2.2), for the "still to draw" report only; the manifests list what exists.
CUSTOMER_POSES = ('neutral', 'talking', 'waiting', 'happy', 'delighted', 'annoyed', 'angry', 'disgusted', 'shocked',
                  'laughing')
MANAGER_POSES = ('neutral', 'talking', 'pointing', 'thumbsUp', 'shocked', 'disgusted', 'facepalm', 'laughing',
                 'worried', 'shrug')

NAME = re.compile(r'^[a-z][A-Za-z0-9]*$')                     # a pose or prop name: neutral, thumbsUp, back5
FOLDER = re.compile(r'^[a-z][a-z0-9]*(-[a-z][a-z0-9]*)?$')    # a cast folder: marge, mitch-burger
SHOPPER = re.compile(r'^shopper\d+$')                         # the old court shoppers (no longer built)
PREFIXED = re.compile(r'^([a-z]+)-([a-z][A-Za-z0-9]*)$')      # pizza-oven

CAST_OUT = PACKS_DIR / 'cast' / 'art'
SHARED_OUT = PACKS_DIR / 'shared' / 'art'
COURT_OUT = PACKS_DIR / 'court' / 'art'


# ── cutting out ───────────────────────────────────────────────────────────────────────────────────────────────────────
class Matte:
    """BiRefNet, loaded once on first use (a run with nothing new to cut never touches the GPU)."""
    model = None

    @classmethod
    def get(cls):
        if cls.model is None:
            import torch  # noqa: F401  (BiRefNet needs it imported)
            for name, file in (('BiRefNet_config', 'BiRefNet_config.py'), ('birefnet', 'birefnet.py')):
                spec = importlib.util.spec_from_file_location(name, MODEL / file)
                module = importlib.util.module_from_spec(spec)
                sys.modules[name] = module
                spec.loader.exec_module(module)
            from safetensors.torch import load_file
            model = sys.modules['birefnet'].BiRefNet(sys.modules['BiRefNet_config'].BiRefNetConfig())
            model.load_state_dict(load_file(str(MODEL / 'BiRefNet-general.safetensors')))
            cls.model = model.eval().float() if CPU else model.eval().half().cuda()
        return cls.model


def matte(image):
    """Alpha for a figure on white: pad to a square, run at 1024, crop back; white the model is unsure of is paper."""
    import torch
    from torchvision import transforms
    prep = transforms.Compose([transforms.ToTensor(), transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])])
    w, h = image.size
    side = max(w, h)
    square = Image.new('RGB', (side, side), 'white')
    square.paste(image, ((side - w) // 2, (side - h) // 2))
    with torch.no_grad():
        x = prep(square.resize((1024, 1024), Image.BICUBIC)).unsqueeze(0)
        pred = Matte.get()(x if CPU else x.cuda().half())[-1].float().sigmoid()
    mask = Image.fromarray((pred[0, 0].cpu().numpy() * 255).astype('uint8')).resize((side, side), Image.BICUBIC)
    mask = np.asarray(mask.crop(((side - w) // 2, (side - h) // 2, (side - w) // 2 + w, (side - h) // 2 + h))).astype(np.float32)
    rgb = np.asarray(image).astype(np.int16)
    paper = (rgb.min(axis=2) >= 244) & (rgb.max(axis=2) - rgb.min(axis=2) <= 8) & (mask < 230)
    mask[paper] = 0
    return mask


def defringe(rgb, alpha):
    """Edge pixels were blended with white paper: take the white back out so no light halo shows on dark scenes."""
    a = (alpha / 255.0)[..., None]
    out = rgb.astype(np.float32)
    soft = (a > 0.02) & (a < 0.98)
    fixed = (out - (1 - a) * 255.0) / np.maximum(a, 0.02)
    out = np.where(soft, np.clip(fixed, 0, 255), out)
    return out.astype(np.uint8)


def cutout(image):
    alpha = matte(image)
    rgb = defringe(np.asarray(image), alpha)
    return Image.fromarray(np.dstack([rgb, alpha.clip(0, 255).astype(np.uint8)]), 'RGBA')


def crop_to_figure(rgba, threshold=8):
    """Crop to what is really there (alpha above a faint threshold, so a stray speck never widens the box)."""
    solid = rgba.getchannel('A').point(lambda v: 255 if v > threshold else 0)
    return rgba.crop(solid.getbbox() or (0, 0, rgba.width, rgba.height))


# ── the jobs ──────────────────────────────────────────────────────────────────────────────────────────────────────────
def make_cast(image):
    return cutout(image).resize(CAST_SIZE, Image.LANCZOS)


def make_prop(image):
    rgba = crop_to_figure(cutout(image))
    rgba.thumbnail((PROP_MAX, PROP_MAX), Image.LANCZOS)
    return rgba


def make_food(image):
    """Already cut out (rendered over two keys): crop to the food and shrink."""
    rgba = crop_to_figure(image)
    rgba.thumbnail((FOOD_MAX, FOOD_MAX), Image.LANCZOS)
    return rgba


def make_backdrop(image):
    return image if image.size == BACKDROP_SIZE else image.resize(BACKDROP_SIZE, Image.LANCZOS)


def make_court(image):
    return image if image.size == PICTURE_SIZE else image.resize(PICTURE_SIZE, Image.LANCZOS)


MAKERS = {'cast': make_cast, 'prop': make_prop, 'backdrop': make_backdrop, 'court': make_court,
          'food': make_food}


def plan(names):
    """Every (kind, source, output) the art-source folders call for, plus warnings for files that fit no rule."""
    jobs, warn = [], []
    cast_root = SRC / 'cast'
    for folder in sorted(p for p in cast_root.iterdir() if p.is_dir()) if cast_root.exists() else []:
        fid = folder.name
        if names and fid not in names:
            continue
        if SHOPPER.match(fid):
            warn.append(f'{folder.relative_to(GAME)}: the shoppers left the court (crowd-cast, 2026-11-10); skipped')
            continue
        if not FOLDER.match(fid):
            warn.append(f'{folder.relative_to(GAME)}: not a cast id; skipped')
            continue
        for src in sorted(folder.glob('*.png')):
            if NAME.match(src.stem):
                jobs.append(('cast', src, CAST_OUT / 'cast' / fid / (src.stem + '.webp')))
            else:
                warn.append(f'{src.relative_to(GAME)}: not a pose name; skipped')
    for src in sorted((SRC / 'backdrops').glob('*.png')):
        stem, m = src.stem, PREFIXED.match(src.stem)
        if stem in DINER_BACKDROPS:
            jobs.append(('backdrop', src, PACKS_DIR / 'diner' / 'art' / 'backdrops' / (stem + '.webp')))
        elif stem == 'court':
            jobs.append(('court', src, COURT_OUT / 'court.webp'))
        elif m and m.group(1) in PACKS:
            jobs.append(('backdrop', src, PACKS_DIR / m.group(1) / 'art' / 'backdrops' / (m.group(2) + '.webp')))
        else:
            warn.append(f'{src.relative_to(GAME)}: no restaurant prefix (<pack>-<name>); skipped')
    for src in sorted((SRC / 'props').glob('*.png')):
        stem, m = src.stem, PREFIXED.match(src.stem)
        if stem in COURT_PROPS:
            jobs.append(('prop', src, COURT_OUT / 'props' / (stem + '.webp')))
        elif m and m.group(1) in PACKS:
            jobs.append(('prop', src, PACKS_DIR / m.group(1) / 'art' / 'props' / (m.group(2) + '.webp')))
        elif NAME.match(stem):
            jobs.append(('prop', src, SHARED_OUT / 'props' / (stem + '.webp')))
        else:
            warn.append(f'{src.relative_to(GAME)}: not a prop name; skipped')
    for src in sorted((SRC / 'court-food').glob('*.png')):
        m = PREFIXED.match(src.stem)
        if m and m.group(1) in PACKS:
            jobs.append(('food', src, COURT_OUT / 'food' / (src.stem + '.webp')))
        else:
            warn.append(f'{src.relative_to(GAME)}: not <pack>-<name>; skipped')
    return jobs, warn


def save_webp(out, dst, quality):
    """Write next to the old picture, then swap it in, so the game never finds a half-written one. OneDrive or a viewer
    can hold the old file for a moment on Windows: wait a little, then write it in place."""
    dst.parent.mkdir(parents=True, exist_ok=True)
    tmp = dst.with_name(dst.stem + '.tmp.webp')
    out.save(tmp, 'WEBP', quality=quality, method=6)
    for attempt in range(6):
        try:
            tmp.replace(dst)
            return
        except PermissionError:
            time.sleep(0.5 * (attempt + 1))
    out.save(dst, 'WEBP', quality=quality, method=6)
    tmp.unlink(missing_ok=True)


def stale(src, dst, force):
    return force or not dst.exists() or src.stat().st_mtime > dst.stat().st_mtime


def build(jobs, force, dry):
    made, failed = [], []
    for kind, src, dst in jobs:
        if not stale(src, dst, force):
            continue
        if dry:
            made.append((kind, src, dst))
            continue
        try:
            with Image.open(src) as im:
                image = im.convert('RGBA' if kind == 'food' else 'RGB')   # loads the whole file: a half-written one fails here
        except Exception as e:                     # noqa: BLE001  (any unreadable source waits for the next run)
            failed.append(f'{src.relative_to(GAME)}: unreadable ({e}); skipped, the next run tries again')
            continue
        out = MAKERS[kind](image)
        save_webp(out, dst, QUALITY[kind])
        made.append((kind, src, dst))
        print(f'{kind:8} {dst.relative_to(GAME)}  {out.size[0]}x{out.size[1]}  {dst.stat().st_size // 1024} KB', flush=True)
    return made, failed


# ── manifests ─────────────────────────────────────────────────────────────────────────────────────────────────────────
def stems(folder):
    return sorted(p.stem for p in folder.glob('*.webp') if not p.stem.endswith('.tmp')) if folder.exists() else []


def folders(root):
    return {d.name: stems(d) for d in sorted(root.iterdir()) if d.is_dir()} if root.exists() else {}


def write_manifest(path, key, data, note):
    js = (f'/** Built by tools/build_art.py: {note} (the game never asks for a missing one). */\n'
          '(function (root, data) {\n'
          "  if (typeof module === 'object' && module.exports) module.exports = data;\n"
          f'  else ((root.BBArt = root.BBArt || {{}}).{key} = data);\n'
          "})(typeof window === 'undefined' ? globalThis : window, " + json.dumps(data, indent=2) + ');\n')
    if path.exists() and path.read_text(encoding='utf-8') == js:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(js, encoding='utf-8')
    return True


LAYOUT_KEYS = ('queue', 'heads', 'feet', 'eyes', 'horizon', 'sign')


def counter_layout(pid, warn):
    """The pack's counter picture's own layout (its .layout.json beside the picture), the numbers only; None if none."""
    stem = 'counter' if pid == 'diner' else pid + '-counter'
    src, pic = SRC / 'backdrops' / (stem + '.layout.json'), SRC / 'backdrops' / (stem + '.png')
    if not src.exists():
        if pic.exists():
            warn.append(f'{pic.relative_to(GAME)}: no {src.name} beside it (the page falls back to stage.js PIC)')
        return None
    try:
        raw = json.loads(src.read_text(encoding='utf-8'))
    except (OSError, ValueError) as e:
        warn.append(f'{src.relative_to(GAME)}: unreadable ({e}); left out of the manifest')
        return None
    if pic.exists() and pic.stat().st_mtime > src.stat().st_mtime:
        warn.append(f'{pic.relative_to(GAME)} is newer than {src.name}: measure the picture again')
    return {k: raw[k] for k in LAYOUT_KEYS if k in raw}


HIPS = 0.56                      # a pose canvas's hips (docs/api/page.md 7): the counter hides the figure below them


def extents(root):
    """{ folder: { pose: [x0, x1, top] } }: where each pose's figure is above the hips (what shows over the counter),
    its left and right edge and the top of its head, as fractions of the canvas (stage.js places Mitch by them)."""
    out = {}
    for d in sorted(root.iterdir()) if root.exists() else []:
        if not d.is_dir():
            continue
        poses = {}
        for p in sorted(d.glob('*.webp')):
            if p.stem.endswith('.tmp'):
                continue
            with Image.open(p) as im:
                a = np.asarray(im.convert('RGBA').getchannel('A'))
            h, w = a.shape
            ys, xs = np.nonzero(a[: int(round(HIPS * h))] > 24)
            if len(xs):
                poses[p.stem] = [round(xs.min() / w, 3), round((xs.max() + 1) / w, 3), round(ys.min() / h, 3)]
        if poses:
            out[d.name] = poses
    return out


def manifests(warn=None):
    warn = [] if warn is None else warn
    written = []
    cast = {'people': folders(CAST_OUT / 'cast'), 'castSize': list(CAST_SIZE), 'extent': extents(CAST_OUT / 'cast')}
    if write_manifest(CAST_OUT / 'manifest.js', 'cast', cast, 'every character and uniform, and their poses'):
        written.append('cast')
    if write_manifest(SHARED_OUT / 'manifest.js', 'shared', {'props': stems(SHARED_OUT / 'props')}, 'the shared props'):
        written.append('shared')
    food = {}
    for p in sorted((COURT_OUT / 'food').glob('*.webp')) if (COURT_OUT / 'food').exists() else []:
        if not p.stem.endswith('.tmp'):
            with Image.open(p) as im:
                food[p.stem] = list(im.size)
    court = {'picture': (COURT_OUT / 'court.webp').exists(), 'pictureSize': list(PICTURE_SIZE),
             'props': stems(COURT_OUT / 'props'), 'food': food}
    if write_manifest(COURT_OUT / 'manifest.js', 'court', court, 'the court picture, its props and the food on its tables'):
        written.append('court')
    for pid in PACKS:
        art = PACKS_DIR / pid / 'art'
        data = {'backdrops': stems(art / 'backdrops'), 'props': stems(art / 'props'), 'backdropSize': list(BACKDROP_SIZE)}
        if not data['backdrops'] and not data['props']:
            continue
        else:
            note = f"the {pid} pack's backdrops and its own props"
        layout = counter_layout(pid, warn) if 'counter' in data['backdrops'] else None
        if layout:
            data['counter'] = layout
            note += ', and its counter picture\'s layout'
        if write_manifest(art / 'manifest.js', pid, data, note):
            written.append(pid)
    return written


def report(warn):
    """What is still to draw in art-source (spec 2.2), so a re-run after the art arrives shows what changed."""
    root = SRC / 'cast'
    drawn = {d.name: sorted(p.stem for p in d.glob('*.png')) for d in sorted(root.iterdir())
             if d.is_dir() and FOLDER.match(d.name) and not SHOPPER.match(d.name)} if root.exists() else {}
    missing = []
    for fid, have in drawn.items():
        want = MANAGER_POSES if fid == 'mitch' or fid.startswith('mitch-') else CUSTOMER_POSES
        lack = [p for p in want if p not in have]
        if lack:
            missing.append(f'{fid} ({len(want) - len(lack)}/{len(want)}): no {", ".join(lack)}')
    for fid, have in drawn.items():
        if not (fid == 'mitch' or fid.startswith('mitch-')) and 'eating' not in have:
            missing.append(f'{fid}: no eating (the court seats them in happy instead)')
    if 'mitch' in drawn and 'promoted' not in drawn['mitch']:
        missing.append('mitch: no promoted')
    for w in warn:
        print('warning:', w)
    print('still to draw in art-source/cast:' if missing else 'art-source/cast has every pose of every character and uniform.')
    for m in missing:
        print('  ' + m)


def main():
    args = sys.argv[1:]
    dry, force = '--dry' in args, '--force' in args
    names = {a for a in args if not a.startswith('--')}
    jobs, warn = plan(names)
    made, failed = build(jobs, force, dry)
    if dry:
        for kind, src, dst in made:
            print(f'would build {kind:8} {src.relative_to(GAME)} -> {dst.relative_to(GAME)}')
        print(f'{len(made)} to build of {len(jobs)}.')
        report(warn)
        return
    written = manifests(warn)
    for f in failed:
        print('skipped:', f)
    print(f'built {len(made)} of {len(jobs)} ({len(jobs) - len(made) - len(failed)} up to date); '
          f'manifests rewritten: {", ".join(written) or "none (unchanged)"}')
    report(warn)


if __name__ == '__main__':
    main()

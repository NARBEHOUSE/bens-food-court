"""Ben's Food Court - apply the script review (voice-source/script-fixes.json) to the pack scripts.

  python tools/script-apply.py [--dry]

Inputs: voice-source/script-audit.json (the flagged lines, from the 2026-11-14 audit), voice-source/script-fixes.json
(Bryan's decisions: use = the suggestion, edit = his wording, keep = unchanged), voice-source/pilot20/audit-map.json
(node tools/script-map.cjs: each clip's source line) and voice-source/pilot20/clips-all.json (who says each clip).
How a fix lands (js/core/script.js candidates(): a speaker with 2+ own lines for a moment uses only those):
  - a speaker's own line: its text is replaced;
  - a line with blanks ({name}...): the filled-in value in the new wording is turned back into the blank;
  - a 'customer' line every speaker of it was flagged for: replaced for everyone;
  - a 'customer' line flagged only for some speakers (doesn't suit them): those speakers get their own copies of that
    moment's customer lines, the flagged one replaced, so nobody else's lines change.
Anything it cannot place is listed for a hand fix. The template fix (js/core/court.js) is separate.
"""
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

G = Path(__file__).resolve().parent.parent
VS = G / 'voice-source'
DRY = '--dry' in sys.argv
audit = json.loads((VS / 'script-audit.json').read_text(encoding='utf-8'))
fixes = json.loads((VS / 'script-fixes.json').read_text(encoding='utf-8'))
amap = {m['clip']: m for m in json.loads((VS / 'pilot20' / 'audit-map.json').read_text(encoding='utf-8'))}
allclips = json.loads((VS / 'pilot20' / 'clips-all.json').read_text(encoding='utf-8'))
src = {}   # file -> text


def text_of(f):
    if f not in src:
        src[f] = (G / f).read_text(encoding='utf-8')
    return src[f]


def q(s):
    return "'" + s.replace('\\', '\\\\') + "'" if "'" not in s else json.dumps(s, ensure_ascii=False)


def line_re(lid, who):
    return re.compile(r"^(  \{ id: '" + re.escape(lid) + r"', who: '" + re.escape(who) + r"', moment: '[^']+', (?:[a-z]+: [^,]+, )*?text: )"
                      r"('(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\")(.*)$", re.M)


def retemplate(template, filled, new):
    """The new wording with the blank's filled-in value turned back into {blank}; None if it can't be placed."""
    names = re.findall(r'\{(\w+)\}', template)
    if not names:
        return new
    pat = '^' + re.sub(r'\\\{(\w+)\\\}', '(.+?)', re.escape(template)) + '$'
    m = re.match(pat, filled)
    if not m:
        return None
    out = new
    for name, val in zip(names, m.groups()):
        if val not in out:
            return None
        out = out.replace(val, '{' + name + '}', 1)
    return out


done, hand, added = [], [], []
for item in audit:
    key = item['clips'][0] if item['clips'][0] in fixes else None
    d = fixes.get(key) if key else None
    if not d or d.get('st') not in ('use', 'edit'):
        continue
    new = (d['text'] if d['st'] == 'edit' else item['suggestion']).strip()
    # the item's clips, by source line
    lines = defaultdict(list)
    for c in item['clips']:
        m = amap[c]
        lines[(m['file'], m['line']['id'], m['line']['who'])].append(m)
    for (f, lid, who), ms in lines.items():
        line = ms[0]['line']
        newt = retemplate(line['text'], item['text'], new) if '{' in line['text'] else new
        if newt is None:
            hand.append((item['clips'][0], 'blank not found in the new wording', line['text'], new))
            continue
        body = text_of(f)
        rx = line_re(lid, who)
        hits = list(rx.finditer(body))
        if len(hits) != 1:
            hand.append((item['clips'][0], f'{len(hits)} matches for {who}/{lid} in {f}', line['text'], new))
            continue
        h = hits[0]
        if who != 'customer':
            src[f] = body[:h.start(2)] + q(newt) + body[h.end(2):]
            done.append((f, who, lid, line['text'], newt))
            continue
        pack = ms[0]['pack']
        voicing = {c['speaker'] for c in allclips if c['pack'] == pack and re.search(r':customer\.' + re.escape(lid) + r'(\.|$)', c['clip'])}
        flagged = {m['speaker'] for m in ms}
        # A shared line that doesn't make sense doesn't for anyone (the reviewers each had a group of speakers, so a
        # shared line was flagged per group): fixed for everyone. Only "doesn't suit who says it" is per speaker.
        if flagged >= voicing or item['type'] != 'doesnt-fit-moment':
            prev = [x for x in done if x[0] == f and x[1] == 'customer' and x[2] == lid]
            if prev and prev[-1][4] != newt:
                hand.append((item['clips'][0], 'CLASH: this shared line already has another new wording', prev[-1][4], newt))
                continue
            src[f] = body[:h.start(2)] + q(newt) + body[h.end(2):]
            done.append((f, 'customer', lid, line['text'], newt))
            continue
        # only some speakers: their own copies of this moment's customer lines, the flagged one replaced
        sibs = [l for l in re.finditer(r"^  \{ id: '([^']+)', who: 'customer', moment: '" + re.escape(line['moment']) + r"', .*$", body, re.M)]
        if len(sibs) < 2:
            hand.append((item['clips'][0], 'only one customer line for this moment: an own copy would not replace it', line['text'], new))
            continue
        block = []
        for spk in sorted(flagged):
            if re.search(r"^  \{ id: '[^']+', who: '" + spk + r"', moment: '" + re.escape(line['moment']) + "'", body, re.M):
                # own lines already (copies made for a sibling line earlier in this run, or the pack's own): fix that copy
                own = list(line_re(lid, spk).finditer(body))
                if len(own) == 1:
                    o = own[0]
                    body = body[:o.start(2)] + q(newt) + body[o.end(2):]
                    src[f] = body
                    done.append((f, spk, lid, line['text'], newt))
                else:
                    hand.append((item['clips'][0], f'{spk} has own lines for {line["moment"]} but no {lid}', line['text'], new))
                continue
            for s in sibs:
                raw = s.group(0).replace("who: 'customer'", f"who: '{spk}'", 1)
                if s.group(1) == lid:
                    m2 = line_re(lid, spk).match(raw)
                    raw = raw[:m2.start(2)] + q(newt) + raw[m2.end(2):]
                block.append(raw)
            added.append((f, spk, line['moment'], newt))
        if block:
            end = sibs[-1].end()
            note = f"  /* {', '.join(sorted(flagged))}: own copies of the customer lines (script review 2026-11-14: the shared line didn't suit them) */"
            src[f] = body[:end] + '\n' + note + '\n' + '\n'.join(block) + body[end:]

print(f'{len(done)} lines rewritten, {len(added)} speaker copies added, {len(hand)} need a hand fix')
for h in hand:
    print('  HAND:', h[0], '|', h[1], '|', h[2][:70], '->', h[3][:70])
if not DRY:
    for f, body in src.items():
        (G / f).write_text(body, encoding='utf-8', newline='')
    (VS / 'script-applied.json').write_text(json.dumps({'rewritten': done, 'copies': added, 'hand': hand}, indent=1, ensure_ascii=False), encoding='utf-8')

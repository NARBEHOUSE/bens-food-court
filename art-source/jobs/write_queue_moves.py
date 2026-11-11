"""write_queue_moves.py - jobs that move a counter picture's painted queue LEFT (phase 3 art-polish, 2026-11-10).
The Pizza Parlor's queue reached 84.5% across and the Sushi Bar's 87.8%, so at 4:3 (and the sushi at 16:9) Mitch had
to talk from off the right edge. Each job edits ONE picture (attached) so its queue stands between about 55% and 76%
across and saves to backdrops/candidates/<name>-move.png; tools/paste_back.py then pastes back only the changed region
into the original, and the picture's .layout.json is measured again.
Painted extras take the archetype named here; never a cast member's job or look (the pizza's red-tracksuit man looked
like Bev and its balloon like Pam's party, so those two are swapped; everyone else is the same person)."""
import pathlib, sys
HERE = pathlib.Path(__file__).parent
AVOID = ("Nobody may look like the game's own characters: no beards, no trucker caps, no plaid or flannel shirts, "
         "no hard hats or safety vests, no lunchboxes, no skateboards, no beanies, no hoodies, no grandmas with glasses "
         "and cardigans, no flat caps with moustaches, no aprons over bowling shirts, no tracksuits, no sweater vests, "
         "no surfers, no scrubs, no party crowns or balloons, no whistles.")
JOBS = {
    'pizza-counter': {
        'people': [
            ("FIRST in line", "the little boy in the blue-and-white baseball cap, white pizza T-shirt, blue shorts, red "
             "sneakers and green backpack. Keep him exactly, BUT take away his red smiley balloon: he holds a small "
             "green toy dinosaur in that hand instead", "about 55% to 60% across"),
            ("SECOND", "the woman with the high red-brown hair bun, sunglasses on her head, yellow top, cream wide "
             "trousers and shopping bags, checking her watch. Keep her exactly", "about 61% to 68% across"),
            ("LAST", "REPLACE the man in the red tracksuit with a tall thin clean-shaven tourist with short grey hair and "
             "NO hat: a light-blue short-sleeved button shirt, khaki shorts, brown sandals with white socks, a camera "
             "on a strap round his neck, squinting at an unfolded paper mall map held up in both hands",
             "about 69% to 76% across"),
        ],
        'feet': "their feet on the same floor line as now (about 72% to 75% of the picture height) and the same height "
                "as now (the head tops between about 45% and 49% of the picture height)",
        'fill': "Where the people used to stand (between about 76% and 86% across), paint in what is behind them so it "
                "continues naturally: the tiled floor, the planters, the cafe tables and the stall fronts behind. The "
                "four red stools at the front (about 21-28%, 33-41%, 46-53% and 81-87% across) stay EXACTLY where they "
                "are, unchanged, and nobody stands in front of a stool.",
        'boxes': '49,36,87,77',
    },
    'sushi-counter': {
        'people': [
            ("FIRST in line", "the businessman with glasses, short dark hair, a navy suit and a brown briefcase, "
             "straightening his tie. Keep him exactly", "about 55% to 60% across"),
            ("SECOND", "the young couple sharing a purple umbrella (the man in a yellow jacket with a green backpack, the "
             "woman in a pink coat with pigtails). Keep them exactly", "about 61% to 70% across"),
            ("LAST", "the teenager in the backwards blue baseball cap, cream jacket and purple backpack taking a selfie "
             "with a phone held up. Keep them exactly", "about 71% to 76% across"),
        ],
        'feet': "standing on the floor at the same depth and the same size as now (the head tops at about 40% to 43% of "
                "the picture height and the umbrella top at about 37%), behind the red booths so their legs are hidden "
                "from about 55% of the picture height down, just as now",
        'fill': "Where the people used to stand (between about 76% and 89% across), paint in what is behind them so it "
                "continues naturally: the pizza stall with its brick oven, the windows and the floor behind. The sushi "
                "counter, its glass case, the soy sauce bottles, the blue stools and the cherry blossom on the right "
                "stay EXACTLY as they are.",
        'boxes': '53,33,90,57',
    },
}
def job(name, J):
    lines = [
        "Use case: edit an existing 2D cartoon background painting for a game (the attached image).",
        "Task: move the people waiting in the queue to the LEFT, closer together, so the whole queue stands between "
        "about 55% and 76% across the picture, and keep EVERYTHING ELSE in the picture exactly as it is: the same size "
        "(1536 x 1024), framing, perspective, colours, outlines, lighting, the floor tiles, the furniture, the plants, "
        "the sign and every stall. Do not move, crop, zoom, re-frame, restyle or re-colour anything else.",
    ]
    for i, (where, who, at) in enumerate(J['people'], 1):
        lines.append(f"Person {i} ({where}): {who}. New spot: {at}.")
    lines += [
        f"All of them: {J['feet']}; facing the viewer or the menu as now, small and SHARP and in focus like the rest of "
        "the picture. They may overlap each other a little, like a real queue.",
        J['fill'],
        "Nobody stands anywhere right of 77% across, and nobody new is added.",
        AVOID,
        "Style: exactly the picture's own style: an original TV-cartoon look with clean dark outlines, flat bright "
        "colours and simple hard-edged shading. No text. No border.",
        f"Save the edited picture as art-source/backdrops/candidates/{name}-move.png (1536 x 1024). Reply with the "
        "saved path. If saving into the project fails, reply with the path of the generated file.",
    ]
    return '\n'.join(lines) + '\n'
if __name__ == "__main__" and "--nudge" not in sys.argv[1:]:
    import sys
    only = sys.argv[1:]
    tsv = []
    for name, J in JOBS.items():
        if only and name not in only: continue
        jn = f'move-queue-{name}'
        (HERE / f'{jn}.txt').write_text(job(name, J), encoding='utf-8', newline='\n')
        tsv.append(f'{jn}\tart-source/backdrops/{name}.png')
        print(jn, 'paste_back boxes:', J['boxes'])
    (HERE / 'wave-p3-queue.tsv').write_text('\n'.join(tsv) + '\n', encoding='utf-8', newline='\n')

# Second pass (same day): measured, the pizza's queue ended at 76.6% and the sushi's at 76.9%, so at 4:3 Mitch's widest
# poses (pointing, used by the tutorial with a customer there; the sushi's shrug) still went off the right edge. These
# edit the moved pictures again: only the LAST person steps a little further left, so the queue ends by about 74%.
NUDGE = {
    'pizza-counter': ("the tall tourist with grey hair in the light-blue shirt and khaki shorts holding up an unfolded "
                      "mall map (the LAST person in the queue, now about 69% to 76.6% across)",
                      "about 35 pixels to the LEFT, so the right edge of his map and hands is at about 74% across; he "
                      "may stand a little behind the woman with the shopping bags and overlap her a little",
                      "the tiled floor and the smoothie stall with its stools behind him"),
    'sushi-counter': ("the teenager in the backwards blue cap and cream jacket taking a selfie with a phone held up (the "
                      "LAST person in the queue, now about 71% to 76.9% across)",
                      "about 45 pixels to the LEFT, so the phone and hand end at about 74% across; they may stand a "
                      "little behind the woman in the pink coat and overlap her a little",
                      "the planter with flowers, the floor, the windows and the pizza stall behind them"),
}
def nudge(name, who, how, behind):
    return '\n'.join([
        "Use case: edit an existing 2D cartoon background painting for a game (the attached image).",
        f"Task: move ONLY {who} {how}. Keep this person exactly the same (same look, size, pose, outfit and floor line) "
        "and keep EVERYTHING ELSE in the picture exactly as it is: the same size (1536 x 1024), framing, perspective, "
        "colours, outlines, lighting, the other people, the furniture, the plants and every stall. Do not move, crop, "
        "zoom, re-frame, restyle or re-colour anything else.",
        f"Where the person used to stand, paint in what is behind them so it continues naturally: {behind}.",
        "Nobody stands anywhere right of 74.5% across, and nobody new is added.",
        "Style: exactly the picture's own style. No text. No border.",
        f"Save the edited picture as art-source/backdrops/candidates/{name}-nudge.png (1536 x 1024). Reply with the saved "
        "path. If saving into the project fails, reply with the path of the generated file.",
    ]) + '\n'
if __name__ == '__main__' and '--nudge' in sys.argv:
    tsv = []
    for name, (who, how, behind) in NUDGE.items():
        (HERE / f'nudge-queue-{name}.txt').write_text(nudge(name, who, how, behind), encoding='utf-8', newline='\n')
        tsv.append(f'nudge-queue-{name}\tart-source/backdrops/{name}.png')
    (HERE / 'wave-p3-nudge.tsv').write_text('\n'.join(tsv) + '\n', encoding='utf-8', newline='\n')
    print('\n'.join(tsv))

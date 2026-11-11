"""write_queue_fixes.py - jobs that repaint painted queue figures that look like cast members (2026-11-09).
The counter pictures' queue prompts asked for "a trucker", "a construction worker", "a teenager with a skateboard" and
"a grandma": the image model drew Gus, Rita, Tasha and a Marge look-alike, so a served regular could stand next to
their own twin. Each job edits ONE picture (attached) and saves to backdrops/candidates/<name>-fix.png; only the
target boxes are then pasted back into the original (tools: scratchpad composite), so the measured lines never move."""
import pathlib
HERE = pathlib.Path(__file__).parent
AVOID = ("They must look NOTHING like the game's own characters: no beards, no trucker caps, no plaid or flannel shirts, "
         "no hard hats or safety vests, no lunchboxes, no skateboards, no beanies, no hoodies, no grandmas with glasses "
         "and cardigans, no flat caps with moustaches, no aprons over bowling shirts, no tracksuits, no sweater vests, "
         "no surfers, no scrubs, no party crowns or balloons.")
JOBS = {
    'counter': [("the bearded man in the red-and-white trucker cap and red plaid shirt, arms crossed, the FIRST person in "
                 "the queue (left of the woman with the stroller; about 51% to 61% across, head top at about 49% of the "
                 "picture height, feet at about 76%)",
                 "a cheerful clean-shaven mail carrier with short dark curly hair and NO hat, a pale blue short-sleeved "
                 "uniform shirt, navy shorts, white socks and black shoes, a brown letter satchel across the body, "
                 "holding a small wrapped parcel under one arm")],
    'burrito-counter': [("the construction worker in the yellow hard hat and orange safety vest holding a lunchbox, the "
                         "FIRST person in the queue (left of the woman in the sun hat; about 57% to 66% across, head top "
                         "at about 47% of the picture height, feet at about 67%)",
                         "a young woman florist with a high red ponytail and NO hat, a green apron over a white T-shirt, "
                         "rolled-up jeans and white sneakers, hugging a big bunch of sunflowers")],
    'icecream-counter': [("the grey-haired grandma with glasses in the pink top AND her white poodle (the middle of the "
                          "queue; about 63% to 71% across, head top at about 55% of the picture height, feet at about "
                          "72%)",
                          "a tall bald clean-shaven man in a white tennis outfit (polo shirt and shorts, a white "
                          "sweatband on one wrist) holding a tennis racket and a tube of tennis balls; no dog"),
                         ("the teenager in the purple cap and yellow jacket with headphones and a skateboard (the LAST "
                          "person in the queue; about 74% to 81% across, head top at about 53% of the picture height, "
                          "feet at about 72%)",
                          "a teenage girl in a red marching-band uniform jacket with gold buttons, white trousers and a "
                          "tall red band hat with a white plume, holding a shiny trumpet; no skateboard, no headphones")],
    # added after the first three: the smoothie queue's grandma (Marge-like) and blond surfer teen (Breeze-like)
    'smoothie-counter': [("the grandma in the straw sun hat and pink floral blouse with glasses and a yellow basket bag "
                          "(the middle of the queue; about 67% to 73% across, head top at about 53% of the picture "
                          "height, feet at about 71%)",
                          "a woman park ranger with dark brown skin and short black hair, in a khaki-green ranger "
                          "uniform with a wide flat-brimmed ranger hat, a walkie-talkie on her belt, holding a clipboard"),
                         ("the blond teenager in the white cap, headphones, white T-shirt, flowered board shorts and "
                          "flip-flops (the LAST person in the queue; about 75% to 80% across, head top at about 51% of "
                          "the picture height, feet at about 71%)",
                          "a teenage boy with short black hair and NO hat, a bright blue T-shirt with a small rocket "
                          "on it, jeans and red sneakers, holding a model rocket; no headphones, no board shorts, no "
                          "flip-flops")],
}
def job(name, swaps):
    lines = [
        "Use case: edit an existing 2D cartoon background painting for a game (the attached image).",
        f"Task: repaint ONLY {'these people' if len(swaps) > 1 else 'this one person'} and keep EVERYTHING ELSE in the "
        "picture exactly as it is: the same size (1536 x 1024), framing, perspective, colours, outlines, lighting, the "
        "other people, the floor tiles, the furniture, the plants and every stall. Do not move, crop, zoom, re-frame, "
        "restyle or re-colour anything else.",
    ]
    for i, (old, new) in enumerate(swaps, 1):
        lines.append(f"Change {i}: replace {old} with {new}. Same spot, same height and the same floor line as the person "
                     "being replaced, facing the viewer, small and SHARP and in focus like the rest of the picture.")
    lines += [
        AVOID,
        "Style: exactly the picture's own style: an original TV-cartoon look with clean dark outlines, flat bright "
        "colours and simple hard-edged shading. No text. No border.",
        f"Save the edited picture as art-source/backdrops/candidates/{name}-fix.png (1536 x 1024). Reply with the saved "
        "path. If saving into the project fails, reply with the path of the generated file.",
    ]
    return '\n'.join(lines) + '\n'
if __name__ == '__main__':
    import sys
    only = sys.argv[1:]
    tsv = []
    for name, swaps in JOBS.items():
        if only and name not in only: continue
        jn = f'fix-queue-{name}'
        (HERE / f'{jn}.txt').write_text(job(name, swaps), encoding='utf-8', newline='\n')
        tsv.append(f'{jn}\tart-source/backdrops/{name}.png')
    (HERE / ('wave-fc13.tsv' if only else 'wave-fc12.tsv')).write_text('\n'.join(tsv) + '\n', encoding='utf-8', newline='\n')
    print('\n'.join(tsv))

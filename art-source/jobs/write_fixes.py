"""Fixes from the pose review (2026-11-08): three poses redrawn, and Kai's glasses and scarf changed in all ten
pictures (round glasses with a maroon-and-gold scarf read too close to a famous boy wizard; his scarf now copies
Reginald's, which is the joke anyway)."""
import write_prompts as wp

jobs = []
SAME_SIZE = (" Draw the character at EXACTLY the same size as in the attached neutral model: the same head size and "
             "height, the planted foot on the same floor line near the bottom of the picture.")
wp.write('fix-reginald-delighted', wp.pose_prompt('reginald', ['delighted'], {'delighted': wp.POSES['delighted'] + SAME_SIZE}))
jobs.append(('fix-reginald-delighted', 'art-source/cast/reginald/neutral.png'))
wp.write('fix-pam-delighted', wp.pose_prompt('pam', ['delighted'], {'delighted': (
    "DELIGHTED: overjoyed, both arms up in celebration but the balloon bunch held out to the SIDE at shoulder height "
    "(not overhead), eyes squeezed shut with joy, mouth wide open, one foot kicked up. Every balloon inside the frame."
    + SAME_SIZE)}))
jobs.append(('fix-pam-delighted', 'art-source/cast/pam/neutral.png'))
text = wp.uniform_pose_prompt('mitch-burrito', ['worried']).replace(
    "Nothing else changes.", "Nothing else changes. The green apron covers his tie: only the knot of the red tie shows "
    "at the collar, exactly as in image 1.")
wp.write('fix-mitch-burrito-worried', text)
jobs.append(('fix-mitch-burrito-worried', 'art-source/cast/mitch-burrito/neutral.png art-source/cast/mitch/worried.png'))

KAI = ['neutral', 'talking', 'waiting', 'happy', 'delighted', 'annoyed', 'angry', 'disgusted', 'shocked', 'laughing']
for a, b in zip(KAI[0::2], KAI[1::2]):
    name = f'fix-kai-{a}-{b}'
    wp.write(name, f"""Use case: an edit of two existing pictures of a 2D game character
Attached images 1 and 2 are KAI, a ten-year-old food reviewer, in two poses. Attached image 3 is REGINALD, the critic
he copies. Redraw images 1 and 2 EXACTLY as they are (the same pose, expression, hands, framing, size, position on the
canvas, outline weight, colours and shading), changing ONLY two things:
1. His glasses become rectangular glasses with thick dark frames (not round).
2. His scarf takes the stripe pattern of Reginald's scarf in image 3: wide cream stripes between plum and gold stripes.
Plain pure white background. No text.
Save the redrawn image 1 as art-source/cast/kai/{a}.png and the redrawn image 2 as art-source/cast/kai/{b}.png
(1024 x 1536 each), replacing the old ones.
Reply with the saved paths. If saving into the project fails, reply with the paths of the generated files.""")
    jobs.append((name, f'art-source/cast/kai/{a}.png art-source/cast/kai/{b}.png art-source/cast/reginald/neutral.png'))

wp.CAST['kai'] = wp.CAST['kai'].replace('big round glasses', 'rectangular glasses with thick dark frames').replace(
    "a small striped scarf copied from Reginald's", "a small scarf copied from Reginald's (wide cream stripes between plum and gold)")
for n, r in jobs:
    print(f'{n}\t{r}')

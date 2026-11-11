"""Tasha's annoyed and angry poses, reworded: the image service's safety filter wrongly rejected the standard
"hands on hips, leaning back" wording for a teenage character (2026-11-08). Same look, the reference keeps her on model."""
import write_prompts as wp

TASHA = {
    'annoyed': "ANNOYED: arms folded across her hoodie, her skateboard leaning against her leg, a flat unimpressed frown, "
               "one eyebrow raised high, eyes rolled up.",
    'angry': "ANGRY: furious in a cartoon way, one arm out pointing an accusing finger straight at the viewer, the other "
             "hand gripping her skateboard, a scowl, a little cartoon steam puff above her beanie, mouth open in a shout.",
}
wp.CAST['tasha'] = ("TASHA, a teen skateboarder who is deeply unimpressed by everything: braids under a slouchy purple "
                    "beanie, an oversized red hoodie, ripped jeans, high-top sneakers covered in doodles, wired earbuds, a "
                    "skateboard. Flat and deadpan.")
wp.write('poses-tasha-annoyed-angry-retry', wp.pose_prompt('tasha', ['annoyed', 'angry'], TASHA))
print('poses-tasha-annoyed-angry-retry\tart-source/cast/tasha/neutral.png')

"""The court's EATING pose, reworded for Jitters and Dennis (2026-11-10, crowd-cast): the image service's safety filter
wrongly flagged "a fork up to the open mouth" for these two (the twitchy and the nervous character). Same pose, calmer
words: a cheerful bite of lunch."""
import write_prompts as wp

CALM = ("EATING LUNCH: sitting upright on a seat that is NOT drawn, seen from the front exactly like the model, a happy "
        "satisfied face, enjoying a meal at a table that is not drawn: one hand holds a plain silver dinner fork (with a "
        "dark outline) up near the chin, as if about to take a bite; the other forearm rests flat across the front of the "
        "body at waist height, on the edge of the table. NO food anywhere: nothing on the fork, nothing in the hands, no "
        "plate, no table, no chair, no cup, no drink.")
NOTES = {
    'jitters': " Both of his coffee cups are put down out of sight. Big grin, wide eyes, hair standing straight up.",
    'dennis': " A relieved, pleasantly surprised smile: he likes it. His little guidebook is put away out of sight.",
}
for c, note in NOTES.items():
    wp.EATING = CALM
    wp.EATING_NOTES[c] = note.strip()
    wp.write(f'eating-{c}-retry', wp.eating_prompt(c))
    print(f'eating-{c}-retry\tart-source/cast/{c}/neutral.png')

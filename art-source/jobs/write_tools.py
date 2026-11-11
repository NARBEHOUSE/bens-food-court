"""The Food Court's Timed-cooking tool props (2026-11-08): spec 5.3 says each cook station names its control prop
(peel, blender switch, fryer basket, scoop...), with a drawn button as the fallback. Only the diner's spatula existed.
Each job is given the spatula as a style reference so the tools look like one set. Prints the job list (name, refs)."""
import write_prompts as wp

TOOLS = ['peel', 'fryerBasket', 'blenderSwitch', 'scoop', 'espressoLever', 'grillPress']
REF = ("Attached image 1 is this game's spatula prop. Match its drawing style exactly: the same outline weight, the "
       "same flat colours with one hard-edged shadow tone, the same chunky proportions and the same plain white "
       "background. Draw only the new object, not the spatula.")

for t in TOOLS:
    name = f'prop-{t}'
    wp.write(name, wp.prop_prompt(t).replace('Object:', REF + '\nObject:', 1))
    print(f'{name}\tart-source/props/spatula.png')

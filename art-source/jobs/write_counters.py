"""The counter scenes, matched to the court (the user, 2026-11-08: "the scenes for each restaurant facing the customers
should reflect the main menu scene, so the burger bar will need to be modified"). Each counter backdrop is the view from
behind that storefront's counter looking out into the court. Two reference images per job: the storefront cut out of the
court picture (jobs/crop_stores.py) and the whole court picture, so the decor, colours, roof, sign and props match the
storefront, and the view across the court shows what really stands across from it.

Usage: python write_counters.py [ids...] > wave.tsv   (default: all seven). Images save under art-source/backdrops/
candidates/, so the current counters stay until a candidate is picked and copied over."""
import sys
import write_prompts as wp

VIEW = {
    'top': ("looking straight down the length of the court toward its OPEN end: tables, chairs and planters in the "
            "middle distance, the round stone plinth, and far away the wide mall concourse with shoppers' benches and "
            "potted palms; the side stalls appear only at the far left and far right edges"),
    'left': ("looking ACROSS the court: tables, chairs and planters in the middle distance, the round stone plinth, "
             "and far away on the other side the sushi bar (navy tiled roof, paper lanterns) and the ice cream parlor "
             "(pink and white, swirly roof) exactly as they look in image 2"),
    'right': ("looking ACROSS the court: tables, chairs and planters in the middle distance, the round stone plinth, "
              "and far away on the other side the smoothie shack (thatched roof, teal and bamboo) and the burrito stall "
              "(orange tiled roof, papel picado) exactly as they look in image 2"),
}

# Second pass (2026-11-09): the first candidates left the seating out or showed the far stalls mirrored. Each view now
# says exactly what is ahead, left and right, worked out from where the stall stands in image 2 (image 2's top is the
# far wall; facing DOWN the picture, the picture's left side is on your right; facing across from the right side, the
# picture's top is on your right). Used for the ids given to --pass2.
SEATING = ("THE SEATING FILLS THE MIDDLE DISTANCE, exactly as in image 2: several round tables with red chairs, two red "
           "booths, square planters with palms and pink flowers, and the round stone plinth in the centre of it all. "
           "It must be clearly there, never an empty floor")
VIEW2 = {
    'pizza-counter': ("looking straight down the court toward its OPEN far end (the mall concourse with benches and palms, "
                      "far away). " + SEATING + ". Because you look down the picture, the court's LEFT side is on YOUR "
                      "RIGHT: close on the right edge of the view stands the smoothie shack (thatched roof, giant smoothie "
                      "cup, teal), and further down on the right the burrito stall (orange tiled roof, papel picado). On "
                      "the far LEFT of the view, further away, stand the sushi bar (navy tiled roof, lanterns) and the ice "
                      "cream parlor (pink and white)"),
    'cafe-counter': ("looking straight down the court toward its OPEN far end (the mall concourse with benches and palms, "
                     "far away). " + SEATING + ". Because you look down the picture, the court's RIGHT side is on YOUR "
                     "LEFT: close on the LEFT edge of the view stands the sushi bar (navy tiled roof, giant nigiri, red "
                     "lanterns), and further down on the left the ice cream parlor (pink and white, cherry on top). On the "
                     "far RIGHT of the view, further away, stand the smoothie shack (thatched roof, teal) and the burrito "
                     "stall (orange tiled roof)"),
    'smoothie-counter': ("looking ACROSS the court to its right side. " + SEATING + ". Straight ahead on the far side "
                         "stands the sushi bar (navy tiled roof, giant nigiri, red lanterns); ahead and to the RIGHT, the "
                         "ice cream parlor (pink and white, cherry on top); on the far LEFT, the corner of the cafe "
                         "(brown roof, giant donut)"),
    'sushi-counter': ("looking ACROSS the court to its left side. " + SEATING + ". Straight ahead on the far side stands "
                      "the smoothie shack (thatched roof, giant smoothie cup, teal, a surfboard); ahead and to the LEFT, "
                      "the burrito stall (orange tiled roof, giant burrito, papel picado); on the far RIGHT, the corner of "
                      "the pizza parlor (red brick, giant pizza slice)"),
    'icecream-counter': ("looking ACROSS the court to its left side. " + SEATING + ". Straight ahead on the far side "
                         "stands the burrito stall (orange tiled roof, giant burrito, papel picado); ahead and to the "
                         "RIGHT, the smoothie shack (thatched roof, giant smoothie cup, teal); on the LEFT, the court "
                         "opens onto the wide mall concourse (benches, potted palms)"),
}

COUNTERS = {
    'counter': ('top', "Ben's Burger Bar, a retro red-and-chrome diner stall with a giant burger on its roof",
                "red and chrome everywhere: black-and-white checkered wall tiles, ribbed chrome pillars at the sides, "
                "the red-and-chrome underside of its sign and roof across the top, two milkshake machines and stacks "
                "of white plates on a side shelf, ketchup and mustard bottles, red-topped chrome stools on the "
                "customers' side of the counter.",
                "a clean-shaven mail carrier holding a parcel, a woman with a stroller, a teenager with headphones",
                "an EMPLOYEE OF THE MONTH frame whose photo is a pickle; a mounted fish on the wall wearing tiny "
                "sunglasses; a ceiling fan with a sock stuck on one blade; a sign reading NO SHIRT, NO SHOES, NO PROBLEM; "
                "a framed painting of a cheeseburger in a dramatic heroic sunset."),
    'pizza-counter': ('top', "Ben's Pizza Parlor, a red-brick pizzeria stall with a terracotta tile roof, a giant "
                      "pizza slice on top and a brick oven",
                      "red brick side walls, a red-and-white striped awning edge across the top, a red-and-white checked "
                      "tile panel, a stack of pizza boxes on a side shelf, hanging vines and garlic braids, red stools on "
                      "the customers' side, a chalkboard menu with little drawings of pizzas (no words).",
                      "a man in a tracksuit squinting at the menu, a woman with shopping bags checking her watch, a kid "
                      "holding a balloon",
                      "a sign reading NO PINEAPPLE with a tiny pineapple in sunglasses sneaking past it; a dough ball "
                      "stuck to the ceiling; a garden gnome holding a pizza slice; a framed photo of a pizza in a "
                      "graduation cap."),
    'cafe-counter': ('top', "Ben's Cafe, a cozy coffee and donut stall with a brown wooden roof, a giant donut and a "
                     "steaming coffee cup on top",
                     "warm wood side walls, a brown-and-cream striped awning edge across the top, warm hanging lamps, a "
                     "glass pastry dome of muffins and a coffee grinder on a side shelf, hanging vines, brown stools on "
                     "the customers' side, a chalk menu with drawings of cups and donuts (no words).",
                     "a sleepy office worker yawning, a student with a laptop bag, a man walking a tiny dog in a sweater",
                     "a coffee cup with a bandage on it; a donut hanging from the light like a mobile; a framed portrait "
                     "of a coffee bean wearing a crown; a sign reading DECAF IS A LIFESTYLE."),
    'smoothie-counter': ('left', "Ben's Smoothie Shack, a beach-shack smoothie stall with a thatched straw roof and a "
                         "giant smoothie cup on top",
                         "bamboo poles, a thatched straw roof edge across the top, teal wooden side panels, a blender and "
                         "a basket of tropical fruit on a side shelf, a surfboard leaning on the wall, strings of shell "
                         "lights, teal stools on the customers' side.",
                         "a jogger stretching, a park ranger with a clipboard, a teenager holding a model rocket",
                         "a crab in sunglasses on a shelf; an inflatable flamingo stuck in the rafters; a coconut with a "
                         "face drawn on it; a surf-report board showing one tiny wave."),
    'burrito-counter': ('left', "Ben's Burritos, a bright orange burrito stall with a clay tile roof, a giant burrito "
                        "and chili peppers on top",
                        "papel picado banners in bright colours across the top, orange wooden side walls, a shelf of hot "
                        "sauce bottles, a stack of plates, a cactus in a talavera pot, orange stools on the customers' "
                        "side, a chalk menu with drawings (no words).",
                        "a florist in a green apron hugging sunflowers, a woman in a sun hat, a man fanning his mouth after "
                        "hot sauce",
                        "a cactus wearing a tiny sombrero hat; a fire extinguisher next to the hottest sauce; a chili "
                        "pepper with a smoke cloud above it; a pinata shaped like an avocado."),
    'sushi-counter': ('right', "Ben's Sushi, a sushi bar stall with a navy tiled roof and a giant piece of salmon "
                      "nigiri with chopsticks on top",
                      "a navy noren curtain with a white wave pattern across the top, red paper lanterns, pale wooden "
                      "lattice side walls, a glass case of sushi on the counter's end, soy sauce bottles, a small "
                      "cherry-blossom tree in a pot, a waving lucky cat on a shelf, navy stools on the customers' side.",
                      "a businessman checking his tie, a couple sharing an umbrella, a teenager taking a photo of the "
                      "lanterns",
                      "a rubber duck sitting in the sushi case among the rolls; a lucky cat holding a tiny fish; a "
                      "goldfish bowl with a goldfish looking nervous; a framed drawing of a very proud cucumber."),
    'icecream-counter': ('right', "Ben's Ice Cream Emporium, an old-fashioned pink-and-white striped ice cream "
                         "parlor stall with a swirly whipped-cream roof topped by a cherry",
                         "pink-and-white striped side walls, a scalloped pink-and-white awning edge across the top, the "
                         "end of a glass freezer case of ice cream tubs, a holder of waffle cones, syrup bottles, pink "
                         "stools on the customers' side.",
                         "a little league kid in a baseball uniform, a bald man in tennis whites with a racket, a marching-band teen with a trumpet",
                         "a snowman melting in a frame; a cone wearing sunglasses; a cherry with a tiny crown; a sign "
                         "reading BRAIN FREEZE SAFETY ZONE."),
}


def counter_prompt(name, side, stall, decor, queue, details, view=None):
    view = view or VIEW[side]
    return f"""Use case: background painting for a 2D game
Asset type: game backdrop, 1536 x 1024, landscape
Attached image 1 is THIS restaurant's storefront, cut out of the food court picture (attached image 2), seen from above.
Draw the same restaurant from INSIDE it: its materials, colours, roof and awning, blank sign shape, counter front and
props must match image 1 exactly, so a player who zooms in from the court recognises it at once.
Scene: inside {stall}, one of the restaurants in a cheerful shopping-mall food court, seen from BEHIND its serving counter,
{view}, under the mall's big skylight, eye level about 1.6 m. The stall's own side walls, pillars and roof edge
frame the view on the left edge, the right edge and across the top, seen from inside (its kitchen is behind the viewer,
out of sight). The stall's decor: {decor}
Composition (percent of the image):
- Left 10% to 55%: keep this area visually quiet (a plain wall of the stall and an empty table far back), because the
  game draws the current customer standing here, large, on top of the picture.
- Right 55% to 85%, middle distance: a short queue of three waiting customers, small, SHARP and in focus like everything
  else: {queue}. Original, funny designs. None of them may look like the game's own characters (no trucker caps or
  beards, plaid shirts, hard hats or safety vests, skateboards, beanies or hoodies, grandmas with glasses and
  cardigans, blond surfers, tracksuits, sweater vests, flat caps with moustaches, scrubs, party crowns or balloons): a
  served regular must never stand next to their own twin (2026-11-09, see write_queue_fixes.py).
- Bottom 22%: just the floor (the game draws the counter top here, on top of the picture).
Hidden funny details, small but findable: {details}
Everything sharp, nothing blurred. No text anywhere except what the details ask for. No border.
Save as art-source/backdrops/candidates/{name}.png (1536 x 1024) and the prompt as art-source/backdrops/candidates/{name}-prompt.md.
Reply with the saved paths. If saving into the project fails, reply with the path of the generated file."""


args = sys.argv[1:]
pass2 = '--pass2' in args
ids = [a for a in args if a != '--pass2'] or (list(VIEW2) if pass2 else list(COUNTERS))
for name in ids:
    side, stall, decor, queue, details = COUNTERS[name]
    sid = 'diner' if name == 'counter' else name.split('-')[0]
    job = f'counter-{sid}' + ('-2' if pass2 else '')
    text = counter_prompt(name, side, stall, decor, queue, details, VIEW2.get(name) if pass2 else None)
    if pass2:   # keep the first candidate: the second saves beside it
        text = text.replace(f'candidates/{name}.png', f'candidates/{name}-2.png').replace(
            f'candidates/{name}-prompt.md', f'candidates/{name}-2-prompt.md')
    wp.write(job, text)
    print(f'{job}\tart-source/review/stores/{sid}.png art-source/backdrops/court.png')

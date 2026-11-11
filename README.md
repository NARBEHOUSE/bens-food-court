# Ben's Food Court (website copy)

A switch-accessible cooking game: seven restaurants around one food court, published at
**https://narbehouse.github.io/bens-food-court/**. It is not listed anywhere yet (the Benny's Hub game list,
the offline download, SwitchedGames and the NARBE House home page) until we decide to list it.

- **Source of truth:** the game is built in Ben's PC Hub (the Electron app), folder
  `bennyshub/apps/games/BENSFOODCOURT`. This repo holds a copy of that whole folder (game, reference art,
  docs, tests and tools). Copy from the PC to here with `node scripts/copy-big-game.cjs bens-food-court`
  in the main website repo (preview first, then `--write`), never the other way.
- **Website-only changes** (the copy script applies them):
  - `index.html`: the analytics tag first in `<head>`; every shared hub file and the favicons load from the
    main site with absolute `/bennyshub/shared/...` and `/bennyshub/images/...` addresses.
  - `js/ui.js` (Exit Game, when not inside the hub): goes to `/bennyshub/index.html`.
- **Testing:** never open this folder on its own (VS Code's Live Preview, a plain static server, or the file
  itself): the shared scan, voice and sound scripts live in the main site, so on their own they 404 and
  there is no speech, no sound and no scanning. Run `npm start` in the main website repo
  (`F:\PROJECT FILES\WEBSITES\NARBE LLC WEBSITE`) and open http://127.0.0.1:4173/bens-food-court/.
- **The game's Node tests** (`node --test tests/*.test.cjs`) run anywhere. `tests/dom-play.cjs`,
  `tools/food-frames.cjs` and `tools/review-frames.cjs` expect to sit inside Ben's PC Hub
  (`bennyshub/apps/games/BENSFOODCOURT`), because they read the hub's shared files and another game's renderer.
- **Hosting:** GitHub Pages from `main` (root), no custom domain, so the game shares the
  `narbehouse.github.io` origin with Benny's Hub (same saved scan and voice settings, frame messaging works).
- **Online only:** the hub's offline download covers `/bennyshub/` only.

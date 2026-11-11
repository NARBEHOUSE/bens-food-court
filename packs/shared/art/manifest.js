/** Built by tools/build_art.py: the shared props (the game never asks for a missing one). */
(function (root, data) {
  if (typeof module === 'object' && module.exports) module.exports = data;
  else ((root.BBArt = root.BBArt || {}).shared = data);
})(typeof window === 'undefined' ? globalThis : window, {
  "props": [
    "back5",
    "bell",
    "blenderSwitch",
    "espressoLever",
    "fryerBasket",
    "grillPress",
    "peel",
    "register",
    "scoop",
    "spatula"
  ]
});

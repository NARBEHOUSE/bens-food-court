/** Built by tools/build_art.py: the smoothie pack's backdrops and its own props, and its counter picture's layout (the game never asks for a missing one). */
(function (root, data) {
  if (typeof module === 'object' && module.exports) module.exports = data;
  else ((root.BBArt = root.BBArt || {}).smoothie = data);
})(typeof window === 'undefined' ? globalThis : window, {
  "backdrops": [
    "blender",
    "counter",
    "prep"
  ],
  "props": [],
  "backdropSize": [
    1536,
    1024
  ],
  "counter": {
    "queue": [
      0.57,
      0.802
    ],
    "heads": 0.494,
    "feet": 0.713,
    "eyes": 0.526,
    "horizon": 0.48,
    "sign": [
      0.313,
      0.168,
      0.516,
      0.216
    ]
  }
});

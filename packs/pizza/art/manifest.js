/** Built by tools/build_art.py: the pizza pack's backdrops and its own props, and its counter picture's layout (the game never asks for a missing one). */
(function (root, data) {
  if (typeof module === 'object' && module.exports) module.exports = data;
  else ((root.BBArt = root.BBArt || {}).pizza = data);
})(typeof window === 'undefined' ? globalThis : window, {
  "backdrops": [
    "counter",
    "oven",
    "prep"
  ],
  "props": [],
  "backdropSize": [
    1536,
    1024
  ],
  "counter": {
    "queue": [
      0.526,
      0.751
    ],
    "heads": 0.407,
    "feet": 0.742,
    "eyes": 0.47,
    "horizon": 0.47,
    "sign": [
      0.346,
      0.047,
      0.653,
      0.127
    ]
  }
});

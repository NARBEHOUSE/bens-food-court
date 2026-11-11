/** Built by tools/build_art.py: the diner pack's backdrops and its own props, and its counter picture's layout (the game never asks for a missing one). */
(function (root, data) {
  if (typeof module === 'object' && module.exports) module.exports = data;
  else ((root.BBArt = root.BBArt || {}).diner = data);
})(typeof window === 'undefined' ? globalThis : window, {
  "backdrops": [
    "board",
    "counter",
    "drinks",
    "fryer",
    "grill"
  ],
  "props": [],
  "backdropSize": [
    1536,
    1024
  ],
  "counter": {
    "queue": [
      0.513,
      0.77
    ],
    "heads": 0.45,
    "feet": 0.763,
    "eyes": 0.495,
    "horizon": 0.48,
    "sign": [
      0.296,
      0.056,
      0.703,
      0.143
    ]
  }
});

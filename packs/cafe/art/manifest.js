/** Built by tools/build_art.py: the cafe pack's backdrops and its own props, and its counter picture's layout (the game never asks for a missing one). */
(function (root, data) {
  if (typeof module === 'object' && module.exports) module.exports = data;
  else ((root.BBArt = root.BBArt || {}).cafe = data);
})(typeof window === 'undefined' ? globalThis : window, {
  "backdrops": [
    "coffee",
    "counter",
    "donuts"
  ],
  "props": [],
  "backdropSize": [
    1536,
    1024
  ],
  "counter": {
    "queue": [
      0.599,
      0.822
    ],
    "heads": 0.55,
    "feet": 0.76,
    "eyes": 0.59,
    "horizon": 0.48,
    "sign": [
      0.341,
      0.131,
      0.659,
      0.206
    ]
  }
});

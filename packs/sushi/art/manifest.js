/** Built by tools/build_art.py: the sushi pack's backdrops and its own props, and its counter picture's layout (the game never asks for a missing one). */
(function (root, data) {
  if (typeof module === 'object' && module.exports) module.exports = data;
  else ((root.BBArt = root.BBArt || {}).sushi = data);
})(typeof window === 'undefined' ? globalThis : window, {
  "backdrops": [
    "counter",
    "prep",
    "roll"
  ],
  "props": [],
  "backdropSize": [
    1536,
    1024
  ],
  "counter": {
    "queue": [
      0.545,
      0.735
    ],
    "heads": 0.373,
    "feet": 0.55,
    "eyes": 0.433,
    "horizon": 0.45,
    "sign": null
  }
});

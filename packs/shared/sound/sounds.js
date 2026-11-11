/** Built by tools/make-sounds.cjs: every sound effect there is, by folder (packs/<folder>/sound/<name>.wav),
 *  with its length in seconds and the volume it is played at. js/audio.js preloads only these. Do not edit. */
(function (root, data) {
  if (typeof module === 'object' && module.exports) module.exports = data;
  else root.BBSounds = data;
})(typeof window === 'undefined' ? globalThis : window, {
  version: 1,
  "shared": {
    "plop": {"dur":0.16,"vol":0.4},
    "swoosh": {"dur":0.22,"vol":0.3},
    "toss": {"dur":0.42,"vol":0.4},
    "tick": {"dur":0.07,"vol":0.3},
    "ding": {"dur":0.9,"vol":0.4},
    "kaching": {"dur":0.8,"vol":0.45},
    "stars": {"dur":0.75,"vol":0.35},
    "buzz": {"dur":0.9,"vol":0.25},
    "ew": {"dur":0.6,"vol":0.4},
  },
  "court": {
    "shutter": {"dur":1.7,"vol":0.4},
    "chime": {"dur":1.8,"vol":0.38},
    "paChime": {"dur":1.35,"vol":0.36},
    "signDrop": {"dur":0.5,"vol":0.38},
    "sparkle": {"dur":1.1,"vol":0.32},
    "pop1": {"dur":0.4,"vol":0.36},
    "pop2": {"dur":0.4,"vol":0.36},
    "pop3": {"dur":0.4,"vol":0.36},
  },
  "diner": {
    "sizzle": {"dur":1.3,"vol":0.35},
    "flip": {"dur":0.18,"vol":0.3},
    "squirt": {"dur":0.62,"vol":0.3},
    "fryer": {"dur":1.2,"vol":0.35},
    "fountain": {"dur":1.2,"vol":0.32},
    "salt": {"dur":0.36,"vol":0.35},
  },
  "pizza": {
    "oven": {"dur":1.3,"vol":0.35},
    "peel": {"dur":0.46,"vol":0.35},
    "cut": {"dur":0.52,"vol":0.32},
  },
  "smoothie": {
    "blender": {"dur":1.4,"vol":0.32},
    "blenderStop": {"dur":0.7,"vol":0.32},
    "pour": {"dur":0.75,"vol":0.3},
  },
  "cafe": {
    "pour": {"dur":1.2,"vol":0.34},
    "hiss": {"dur":1.1,"vol":0.28},
    "fryer": {"dur":1.3,"vol":0.34},
    "dip": {"dur":0.42,"vol":0.3},
  },
  "sushi": {
    "knife": {"dur":0.16,"vol":0.28},
    "mat": {"dur":0.75,"vol":0.3},
  },
  "burrito": {
    "wrap": {"dur":0.8,"vol":0.32},
    "press": {"dur":1.2,"vol":0.34},
    "burst": {"dur":0.55,"vol":0.34},
  },
  "icecream": {
    "scoop": {"dur":0.42,"vol":0.32},
    "mixer": {"dur":1.3,"vol":0.3},
    "mixerStop": {"dur":0.6,"vol":0.3},
    "pour": {"dur":0.6,"vol":0.26},
  },
});

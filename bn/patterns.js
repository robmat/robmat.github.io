// Attack tile patterns — inlined to avoid fetch() restrictions on file:// protocol
window.ATTACK_PATTERNS = {
  "air_seaplane_guns": {
    "name": "Scissors",
    "targeting": "column",
    "hits": [
      { "rowIndex": 0, "dmgMult": 1.00 },
      { "rowIndex": 1, "dmgMult": 0.66 },
      { "rowIndex": 2, "dmgMult": 0.33 }
    ]
  },
  "air_torpedo_strike": {
    "name": "Unguided Torpedo",
    "targeting": "tile",
    "hits": [
      { "offset": [ 0,  0], "dmgMult": 1.00 },
      { "offset": [-1,  0], "dmgMult": 0.25 },
      { "offset": [ 1,  0], "dmgMult": 0.25 },
      { "offset": [ 0, -1], "dmgMult": 0.25 },
      { "offset": [ 0,  1], "dmgMult": 0.25 }
    ]
  },
  "air_bomb_drop_rnd": {
    "name": "Shrapnel Bomb",
    "targeting": "tile",
    "hits": [
      { "offset": [ 0,  0], "hitChance": 0.75, "dmgMult": 1.00 },
      { "offset": [-1,  0], "hitChance": 0.06, "dmgMult": 1.00 },
      { "offset": [ 1,  0], "hitChance": 0.06, "dmgMult": 1.00 },
      { "offset": [ 0, -1], "hitChance": 0.06, "dmgMult": 1.00 },
      { "offset": [ 0,  1], "hitChance": 0.06, "dmgMult": 1.00 }
    ]
  },
  "goliath_quad_cannon": {
    "name": "Total Annihilation",
    "targeting": "tile",
    "hits": [
      { "offset": [0, 0], "dmgMult": 1.00 },
      { "offset": [0, 1], "dmgMult": 1.00 },
      { "offset": [1, 0], "dmgMult": 1.00 },
      { "offset": [1, 1], "dmgMult": 1.00 }
    ]
  },
  "phalanx_gatling_gun": {
    "name": "Incendiary Burst Rounds (Horizontal)",
    "targeting": "row",
    "allColsInRow": true,
    "dmgMult": 1.00
  },
  "phalanx_gatling_gun_row": {
    "name": "Incendiary Burst Rounds (Vertical)",
    "targeting": "column",
    "hits": [
      { "rowIndex": 0, "dmgMult": 1.00 },
      { "rowIndex": 1, "dmgMult": 1.00 },
      { "rowIndex": 2, "dmgMult": 0.60 }
    ]
  },
  "goliath_mlrs_left": {
    "name": "Explosive Shell (MLRS Left)",
    "targeting": "tile",
    "hits": [
      { "offset": [-1, -1], "dmgMult": 1.00 },
      { "offset": [-1,  0], "dmgMult": 1.00 },
      { "offset": [-1,  1], "dmgMult": 1.00 },
      { "offset": [ 0, -1], "dmgMult": 1.00 },
      { "offset": [ 0,  0], "dmgMult": 1.00 },
      { "offset": [ 0,  1], "dmgMult": 1.00 },
      { "offset": [ 1, -1], "dmgMult": 1.00 },
      { "offset": [ 1,  0], "dmgMult": 1.00 },
      { "offset": [ 1,  1], "dmgMult": 1.00 }
    ]
  },
  "goliath_mlrs_single": {
    "name": "Explosive Shell (Anti-Air)",
    "targeting": "tile",
    "hits": [
      { "offset": [0, 0], "dmgMult": 1.00 }
    ]
  },
  "goliath_mlrs_right": {
    "name": "Explosive Shell (MLRS Right)",
    "targeting": "absolute",
    "type": "checkerboard",
    "parity": 0,
    "hits": [
      { "pos": [0, 0], "dmgMult": 1.00 },
      { "pos": [0, 2], "dmgMult": 1.00 },
      { "pos": [0, 4], "dmgMult": 1.00 },
      { "pos": [1, 1], "dmgMult": 1.00 },
      { "pos": [1, 3], "dmgMult": 1.00 },
      { "pos": [2, 0], "dmgMult": 1.00 },
      { "pos": [2, 2], "dmgMult": 1.00 }
    ]
  }
};

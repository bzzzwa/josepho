# Levels

One file per level: `level1.js`, `level2.js`, ... Each exports one object. `index.js` lists them in order and
`worldmap.js` places every level on the world map. The story and the plan for each level are in
`docs/pribeh.md`.

## Adding a level

1. Copy `level1.js` to `levelN.js`, rename the export (`LEVEL2`) and set `number: 2`.
2. Import it in `index.js` and add it to `LEVELS`.
3. Check its node in `worldmap.js` (name, map position, flag colors).
4. Run `npm run test:levels -- N` and look at `tools/out/levelN.png`.

## The level object

| Field | Needed | What it is |
| --- | --- | --- |
| `number` | yes | Level number, 1-10. Must match its node in `worldmap.js`. |
| `name` | yes | Shown on the map, the level banner and the clear screen (capitals, Czech). |
| `map` | yes | The world as rows of text, at least 14 rows, all the same length. Legend below. |
| `signs` | yes | One text per `s` on the map, left to right. `\n` starts a new line. |
| `touchSigns` | no | `{ index: text }` - a phone version of a sign that talks about keys. |
| `prisms` | if the map has digits | One entry per prism digit `1`-`9`: `{ turnsOn: [groups], banner }`. |
| `spectrum` | no | The level's colors: `[{ id, color }]`, up to 8 stripes. Each stripe is a color group. |
| `legend` | no | The level's own color-gated tiles: `{ char: { gate, kind, look } }`. |
| `startOn` | no | Color groups already on when the level starts, e.g. `['sky', 'earth']`. |
| `switches` | if the map has `P` | The two color groups a tide switch flips between, e.g. `['shallow', 'deep']`. |
| `theme` | no | The level's look (below). |
| `clearText` | no | Lines for the level-clear screen. |

### theme

| Field | What it does |
| --- | --- |
| `colors` | `{ DIRT: '#hex', GRASS: '#hex', ... }` - replaces shared colors by their names in `C` (`colors.js`). |
| `sky` | Three rows of six hex colors (pre-dawn, sunrise, morning): the level's own sky. |
| `tree` | `'palm'` draws palms for `T` instead of round trees. |
| `background` | `'sea'`: low islands and open water behind, instead of hills. |

Texts are Czech, in capitals, and always gender-neutral for Josepho (present tense, no gendered endings).
`npm run test:levels` reports any letter the pixel font cannot draw.

## Color groups

Every color belongs to a group that is either on (full color, and gated tiles have volume) or off (grey, and
gated tiles can be walked through). The built-in groups are `sky`, `earth`, `green`, `bloom` and `spirit`
(Josepho's own colors, always on). A level adds one group per `spectrum` stripe, named by the stripe's `id`.

`turnsOn` (prisms) and `startOn` take group names. At the end of every level (`F`) all groups turn on.

## Map legend

| Char | Tile | | Char | Object |
| --- | --- | --- | --- | --- |
| `.` | air | | `@` | Josepho starts here (exactly one) |
| `,` | backdrop: air drawn as a dark wall (inside a pit) | | | |
| `#` | earth with grass | | `F` | the end of the level (at least one) |
| `R` | rock | | `o` | mote of light |
| `B` | stone brick (breakable when glowing) | | `l` | lantern (checkpoint) |
| `?` | prism block with a mote | | `s` | sign |
| `G` | prism block with a glow petal | | `1`-`9` | small prism (see `prisms`) |
| `P` | tide switch (flips the two `switches` colors) | | `z` | lost shade (3 per level) |
| `=` | wooden plank (one-way) | | `e` | greyling |
| `~` | water (deadly) | | `t` | thornback |
| `^` | thorns (deadly) | | `b` | bell flower (spring once `bloom` is on) |
| `L` | leaf ledge, needs `green` | | `f` | flower |
| `C` | cloud ledge, needs `sky` | | `T` | tree (or palm) |
| | | | `d` | driftwood (floats on the water below it) |
| | | | `r` | leaping fish (sits in water; stranded when drained) |

### The level's own gated tiles

Any other character can be defined in `legend`:

```js
legend: {
    m: { gate: 'shallow' },                                // a block with volume while 'shallow' is on
    n: { gate: 'deep', kind: 'oneway', look: 'ledge' },    // a ledge you can jump up through
},
```

- `gate` - the color group (a stripe id or a built-in group).
- `kind` - `'solid'` (default), `'oneway'` or `'water'`. Water whose color is on can be swum in; grey water has
  no volume at all, so Josepho drops through it to whatever is below (build a floor under it).
- `look` - `'block'` (default), `'ledge'`, `'water'`, `'leaf'` or `'cloud'`. Blocks, ledges and water are drawn in
  the stripe's color; while the color is off they show as a dotted outline (water: an empty basin).

### Tide switches

A `P` block flips the level's two `switches` colors: the one that is on goes grey (and loses its volume at
once), the other one comes on. It stays grey and does nothing until one of the two colors is on - usually a
prism turns the first one on. If Josepho would be stuck inside a tile that just got volume, they are nudged
out. The tide is saved with the game at every lantern.

When teaching a switch, make sure it is needed: a gap or wall it opens must be too big to jump, even with a
flutter (13+ tiles wide, 6+ tiles tall).

## Reach

Josepho's jumps do not change between levels. Keep required jumps inside these limits (the jump check in
`npm run test:levels` uses them):

| Move | Safe | Maximum |
| --- | --- | --- |
| gap, running jump | 7 tiles | about 9 |
| gap with a flutter | 9 tiles | about 11 |
| climb, held jump | 4 tiles | about 5 |
| climb with a bell flower | 8 tiles | about 9 |
| climb out of water (a leap at the surface) | 1 tile | about 2 (3 with jump held) |

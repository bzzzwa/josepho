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
| `talks` | no | Conversations: `[{ at: column, lines: [[speaker, text], ...] }]`, shown when Josepho first reaches `at`. |
| `freeGreylings` | no | `true` (level 5 on): a stomp frees a greyling instead of squashing it - it gets its colors back and leaves a mote. In a dark level it flies along with Josepho and lights the way ahead (up to three; they stay after Josepho dies and fly home at the flag); otherwise it runs off home. A freed greyling never comes back grey. |
| `freeTalk` | no | Lines `[[speaker, text], ...]` shown when the first greyling of the level is freed. |
| `theme` | no | The level's look (below). |
| `finale` | no | The banner when Josepho reaches the flag - what came back, in the level's own words. Default `SPEKTRUM JE ZPĚT`. |
| `clearText` | no | Lines for the level-clear screen. |

### theme

| Field | What it does |
| --- | --- |
| `colors` | `{ DIRT: '#hex', GRASS: '#hex', ... }` - replaces shared colors by their names in `C` (`colors.js`). |
| `sky` | Three rows of six hex colors (pre-dawn, sunrise, morning): the level's own sky. |
| `tree` | `'palm'` draws palms for `T` instead of round trees; `'treeAutumn'` draws trees whose leaves use the level's first three stripes (they light up while those colors are on). |
| `background` | `'sea'`: low islands and open water behind, instead of hills; `'archive'`: a dark back wall with shelves of grey boxes; `'office'`: a grey wall with windows and filing cabinets. |
| `dark` | `true`: the level is dark except around the lights (Josepho, lit lanterns, freed greylings). Fireflies drift about for the mood (their glow does not light aura tiles). At the flag the light spreads until the dark is gone. |
| `leaves` | `true`: leaves fall through the air, in the colors of the first three stripes. |
| `tint` | `0`-`1`: how strongly the whole world takes on the color of the last arch Josepho passed (an arch that turns on two colors: the upper sky one, the lower sky the other, the land both mixed). `0.25` is a soft tint. |
| `skyFlag` | Six hex colors, top to bottom: at the end of the level the sky shows them as the stripes of a flag for a few seconds. |
| `cameraAbove` | How far below the top of the screen (pixels) the camera keeps Josepho. A level with things under its ceiling (lamps, stamps) sets it so floor and ceiling are on screen together (level 6: 88, with the ceiling 4 rows thick). |

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
| | | | `k` | Skatulka: a box in the ground that rattles, pops up and snaps; it bites from the side, a stomp from above shuts it for good |
| `>` `<` | slow sorting belt (carries right / left) | | `x` | stamp: hangs under the ceiling, shakes, drops on whoever steps under it |
| `}` `{` | fast sorting belt | | `c` | clerk behind a counter (decoration) |

### The level's own gated tiles

Any other character can be defined in `legend`:

```js
legend: {
    m: { gate: 'shallow' },                                // a block with volume while 'shallow' is on
    n: { gate: 'deep', kind: 'oneway', look: 'ledge' },    // a ledge you can jump up through
},
```

- `gate` - the color group (a stripe id or a built-in group).
- `kind` - `'solid'` (default), `'oneway'`, `'water'`, `'timer'`, `'arch'`, `'flyer'`, `'aura'`, `'beam'` or `'lamp'`. Water whose color is on can be swum in; grey
  water has no volume at all, so Josepho drops through it to whatever is below (build a floor under it). A
  `'timer'` is a leaf block (see below) and also needs `seconds`. An `'arch'` is not a tile but an arch to walk
  through (see below); it has no `gate`. A `'flyer'` is not a tile either but a flutterer (see below).
- `look` - `'block'` (default), `'ledge'`, `'water'`, `'leaf'` or `'cloud'`. Blocks, ledges and water are drawn in
  the stripe's color; while the color is off they show as a dotted outline (water: an empty basin).

### Leaf blocks (timer colors)

A leaf block (`kind: 'timer'`) is always solid and always shows the color it brings, even while that color is
off. Bumping it turns its `gate` on for `seconds` (again from full if it was already on). A bar in the HUD shows
the time left; the last 1.5 seconds the color's tiles blink and a clock ticks, then the color is gone - and with
it the volume of its tiles. Put a safe floor under anything that can run out beneath Josepho's feet. Timer colors
do not survive dying or a saved game, and the flag at the end turns them on for good.

When chaining colors (bump the next block while the last one still holds), start the next ledge right where the
last one ends - a gap there is easy to overshoot when bumping at a run.

### Arches

An arch (`kind: 'arch'`) is 3 tiles tall, standing on the cell of its character. Walking or jumping through it,
from either side, sorts Josepho: its `turnsOn` groups come on at once and its `turnsOff` groups go grey (and lose
their volume). `shows` is the stripe whose color the arch is drawn in - it keeps that color while it is off - and
the soft glow Josepho gets. The colors are saved at lanterns.

```js
A: { kind: 'arch', shows: 'blue', turnsOn: ['blue'], turnsOff: ['pink'] },
X: { kind: 'arch', shows: 'white', turnsOn: ['blue', 'pink'], turnsOff: [] },   // both at once
```

An arch in the air over a gap is passed by jumping through it; make it tall enough that any jump across passes
it, and put the ledge it opens where the jump lands.

### Aura tiles

An aura tile (`kind: 'aura'`, `look: 'ledge'` or `'block'`) has volume only while its middle is in light: within 4
tiles of Josepho, or near a lit lantern or a freed greyling. Lit, it shows in its `gate` color (whether that color
is on or not); dark, it is a faint dotted outline. So bridges and stairs unfold in front of Josepho and fade behind.
Keep aura jumps well inside Josepho's own light - the far ledge of a jump must be lit by the time Josepho gets
there, which it is within 4 tiles.

### Lamps and beam tiles

A lamp (`kind: 'lamp'`, `gate` = its color) hangs under the ceiling on the cell of its character and shines a
column of its color straight down, `width` tiles wide (3 by default), to the first solid tile. With `range`
(tiles; + right first, - left first) and `speed` (pixels per frame) it rides a rail back and forth. A beam tile
(`kind: 'beam'`, `look: 'ledge'`) has volume only in the light of a lamp of its `gate` color - or, with `needs`,
only where the light of all those colors meets (`needs: ['magenta', 'blue']` for lavender).

Rules the level 6 build taught:

- Put beam bridges level with the floor: Josepho walks on with the light, and a bridge one tile higher is walked
  under.
- Let a moving lamp's end reach over the floor it starts from (and the one it ends at), so Josepho steps into light
  that is already all around them.
- Where two lamps meet over ledges of three colors, make their light wide enough (5 tiles) that the last ledge of
  one color, the mixed ones and the first of the other are all lit at the meeting.
- Keep lamps and stamps on screen: the player has to see where the light comes from and see a stamp shake. Hang
  them right under a ceiling low enough for `theme.cameraAbove` to show it with the floor.

### Stamps and belts

A stamp (`x`) hangs under the ceiling. When Josepho steps under it, it shakes for half a second, drops like a stone,
leaves a ZAMITNUTO mark on the floor and slowly rises again. It hurts while falling and lying down, never while
shaking or rising; it cannot be stomped. Belts (`>` `<` slow, `}` `{` fast) are solid ground that carries whoever
stands on it. A slow belt against Josepho under a stamp is passed at a run.

### Flutterers

A flutterer (`kind: 'flyer'`, `gate` = the color of its wings) follows the world's rule: while its color is on its
wings carry it and it flies back and forth around the cell of its character, bobbing; while the color is grey it
drops to the ground and toddles about like a greyling, and it takes off again when the color comes back. It can
be stomped either way and hurts from the side. Place it where its flight does not cross the arc of a jump
Josepho must make, and not where it would toddle into a narrow dip Josepho has to jump down into.

### Talks

`talks` show a conversation box when Josepho first reaches a column; the game holds still until it is read (jump,
Enter or a tap goes on). The speaker `TŘÍDIČ` gets a black-and-white box, anyone else a colored one. A talk behind
the lantern a saved game starts from is not shown again. The Sorter is the only one who speaks with gendered
words, and only rarely (see docs/pribeh.md).

### Tide switches

A `P` block flips the level's two `switches` colors: the one that is on goes grey (and loses its volume at
once), the other one comes on. It stays grey and does nothing until one of the two colors is on - usually a
prism turns the first one on. If Josepho would be stuck inside a tile that just got volume, they are nudged
out. After a flip the switch rests until Josepho has moved away from beneath it, so floating up under it in
the water that just came does not flip it straight back. The tide is saved with the game at every lantern.

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

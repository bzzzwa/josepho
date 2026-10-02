# Changelog

All notable changes to Josepho are listed here. Versions follow [Semantic Versioning](https://semver.org).

## 0.7.0 - 2026-10-02

Level 6 "Urad" (The office).

### Added

- Level 6 "Urad" (The office), 262 tiles: the Sorter's office, where every form has two boxes - blue or pink.
  Office lamps shine magenta or blue: beam ledges have volume only in the light of their color, and lavender ones
  only where the two lights meet - the way light mixes, and the middle stripe of the bi flag. Taught in four steps:
  a fixed lamp, riding a moving lamp over a pit, lavender where a moving lamp passes a fixed one, and two lamps
  meeting in the middle. Then the filing room, with belts under stamps. Three lanterns; lost shades on the harder
  ways.
- Stamps: they hang under the ceiling, shake when Josepho steps under them, drop and leave a ZAMITNUTO mark.
- Sorting belts, slow and fast, that carry whoever stands on them.
- The Sorter's clerks behind their counters, stamping forms. An office background with windows and filing cabinets.
- `theme.cameraAbove`: a level can keep Josepho lower or higher on screen. The office uses it so its low ceiling,
  with the lamps and stamps hanging under it, is always in view; the light is thicker right under a lamp, so it
  reads as coming from it.

### Changed

- The level bot waits for a lamp's light, walks with it, boards a moving light only while it moves on ahead, and
  waits before a falling stamp.
- The check for one-tile holes ignores ceilings (a ceiling above is no floor).

## 0.6.0 - 2026-09-29

Level 5 "Archiv" (The archive).

### Added

- Level 5 "Archiv" (The archive), 256 tiles: the Sorter's archive under the mountains, dark but for the light
  Josepho carries. Aura ledges in the colors of heat (red to blue-white) have volume only in light - near Josepho,
  a lit lantern or a freed greyling - so bridges and stairs unfold ahead and fade behind. Taught in four steps: aura
  stairs, an aura bridge, a freed greyling lighting the way, a climb up a dark shaft. At the flag the light spreads
  until the dark is gone.
- Greylings are sorted beings: from level 5 on a stomp frees a greyling instead of squashing it. It gets its
  colors back and leaves a mote; the first one says thank you. A freed greyling never comes back grey.
- In a dark level a freed greyling flies along with Josepho, a little ahead and above, and lights the way (up to
  three). They stay after Josepho dies and fly home at the flag. In level 5 dark stepping stones show why: alone,
  Josepho sees only the nearest ones.
- Fireflies drift about the archive, glowing softly - only for the mood.

### Fixed

- Everything the game draws as a rectangle, a line or a pixel (the dark of level 5, the boxes of signs and talks,
  HUD bars, map panels, sparks) now stays in drawing order. BLIT386's renderer draws all primitives of a frame
  before all sprites, so these used to end up under every sprite - the dark of level 5 covered only the background,
  not the ground. They are drawn with a solid sprite instead, and the test double now layers draws like the engine.
- The dark of level 5 is almost black: only faint outlines show through, so the lights stand out.

## 0.5.0 - 2026-09-29

Level 4 "Dva brehy" (Two banks).

### Added

- Level 4 "Dva brehy" (Two banks), 273 tiles and 22 rows tall. Its sections follow the stripes of the trans flag:
  blue (rolling hills, the first arch on a hilltop), pink (a canyon, then blue ledges up a cliff face to a
  plateau), white (the lake: stepping stones to the island with the white prism, white stones beyond), pink (a
  cave with the relay on a bridge), blue (a hilltop, two arches stacked in the air over a wide pit, and the valley
  under the white arch, whose stones need both colors at once) and the flag.
  The Sorter's arches sort Josepho to one color - one bank on, the other grey - with a soft glow in that color.
- Flutterers: grey creatures with blue or pink wings. While their color is on they fly back and forth; while it
  is grey their wings cannot carry them, so they drop to the ground and toddle - and take off again when the
  color comes back. So an arch changes the danger around Josepho, not only the ledges.
- The world takes on a soft tint of the last arch's color (`theme.tint`): blue, pink, or after the white arch
  both - blue above in the sky, pink below, the land mixed. At the end the sky shows the flag's stripes for a
  few seconds (`theme.skyFlag`).
- Talks: conversation boxes that hold the game until read. The Sorter speaks for the first time.
- Each level has its own banner at the flag (`finale`), saying what came back: MOŘE MÁ ZASE HLOUBKU, BARVY
  PODZIMU JSOU ZPĚT, BŘEHY JSOU SPOJENÉ (level 1 keeps SPEKTRUM JE ZPĚT).
- `npm run test:levels` warns about one-tile holes with no floor and about pits with no way out, and notes
  creatures that can walk to where Josepho lands after a pit.

### Fixed

- The flags on the world map have one pixel row per stripe: the trans flag no longer shows its top stripe twice.
- Level 4: the deep pit under the arches in the air had no way out; every pit now has stairs up to its rim.

## 0.4.0 - 2026-09-28

Level 3 "Opadavani" (Falling leaves).

### Added

- Level 3 "Opadavani" (Falling leaves), 264 tiles: the edge of the forest and the leaf prism, leaf blocks that
  bring a color back for a few seconds (a bar in the HUD shows the time, the leaves blink and a clock ticks before
  it runs out) taught in four steps, a clearing with Skatulka boxes, and the treetops - orange leaves up to a
  branch, red leaves across to the next. Two lanterns and three lost shades. The Skatulka is a box in the ground
  that rattles as a warning, pops up and snaps its lid: it bites from the side, and a stomp from above shuts it
  for good (it never comes up under Josepho's feet).
  Autumn trees that light up with the colors, brown hills and falling leaves.

### Changed

- The jump check in `npm run test:levels` follows paths from ledge to ledge, so it also sees stairs going up.
- The level bot bumps leaf blocks, climbs ledges and goes back to try a stretch again.

## 0.3.0 - 2026-09-27

The world map, saved progress, and level 2 "Melciny" (Shallows).

### Added

- Level 2 "Melciny" (Shallows), 244 tiles: the beach, the tide switch taught in four steps (it flips the
  shallows and the deep water; colored water has volume, grey water does not), a lagoon to swim with driftwood
  and leaping fish, a trench to swim across - or to drain, walk and fill again from a switch on its floor - and
  a last bridge before the flag. Sand, palms and a hazy sea behind; two lanterns and three lost shades.
- Lost shades: three hidden in each level from level 2 on, shown in the HUD, on the clear screen and on the map.
- World map of Lumen with all ten regions from the story. Finished levels raise their flag, the land regains color
  after the first level, the next region unlocks and Josepho walks there. Regions without a level yet say so.
- Progress is saved in the browser. The title screen offers Continue / New game (a new game asks to confirm).
- Pause menu: continue, start the level again, back to the map, fullscreen.
- A level in progress is saved at its start and at every lantern (prisms, motes, blocks, time). After closing or
  reloading the page, Continue goes straight back to the last lantern; the map shows the level as in progress.
- Levels are data files in `src/levels/` with their own spectrum (up to 8 color stripes, each switchable), their
  own color-gated tiles, look and starting colors. The format is described in `src/levels/README.md`.
- `npm run test:levels`: runs the game in Node, checks every level (map, texts, jumps out of safe reach), draws a
  preview of the whole level and lets an automatic player finish it.

### Changed

- The palette has 128 colors (was 64); slots 64-127 hold the level's spectrum or the world map's flags.
- Level 1 moved to `src/levels/level1.js`. It plays exactly as before (checked frame by frame).
- The engine's stats overlay is off (its toggle icon sat in the bottom-left corner, under the touch arrows).
- In levels taller than the screen the camera keeps Josepho lower, so blocks above are not hidden behind signs.

### Fixed

- The world map was drawn shifted after leaving a level, and was an empty blue screen after finishing one. BLIT386
  starts every frame with the camera last set by `cameraSet()` (`cameraReset()` does not clear it); the game now
  resets the camera at the start of every frame. The level tests check this.
- A screen shake at the left edge of a level drew a wrong column of the distant mountains.

## 0.2.0 - 2026-09-25

Josepho on phones and tablets.

### Added

- Play on phones and tablets: on-screen controls (arrows, jump, pause) using up to three fingers at once. Holding a
  direction makes Josepho run.
- Fullscreen: tapping to start on a phone goes fullscreen and locks landscape where the browser allows it; a
  fullscreen button on the title and pause screens; the F key toggles it on a computer.
- "Add to Home Screen" support (web manifest, icon), which is the fullscreen option on iPhone.
- A "turn your device sideways" screen when a phone is held upright; the game pauses meanwhile.
- Touch versions of the texts that mention keys.
- The story and plan for all ten levels: `docs/pribeh.md` (Czech).

### Fixed

- No sound on phones. BLIT386 1.7 starts audio on the beginning of a touch, which mobile browsers do not accept;
  `src/audio-unlock.js` now also starts it when the touch ends.

### Changed

- The canvas can grow up to 3840 x 2160 instead of stopping at 960 x 720, so it fills large and fullscreen displays.
- The screen stays awake while playing, and touches no longer scroll or zoom the page.
- The first sign now suggests X (run) and Z (jump), which avoids keyboards dropping Shift + arrow + Space.

## 0.1.1 - 2026-09-24

### Added

- Play in the browser: the game is published automatically to GitHub Pages (https://bzzzwa.github.io/josepho/) by a
  GitHub Actions workflow on every push to `master`.
- MIT license.

### Changed

- The build uses relative paths (`base: './'` in `vite.config.js`), so the built game runs from any folder, not only
  from the root of a domain.
- The version number on the title screen now shows the full version.

## 0.1.0 - 2026-09-24

The first playable version: Chapter 1, "Svitani" (Dawn).

### Added

- A complete first level, 230 tiles long, from the grey meadow to the Dawn Prism.
- Mario / SuperTux style controls: walk, run, variable-height jump, coyote time and jump buffering, a flutter glide
  (press jump again in the air), and dropping through planks.
- The color mechanic: the world starts grey, and three prisms restore green and earth, the sky, and the flowers. The
  colors come back through the palette itself.
- Color-gated platforms: leaves become solid with green, clouds with the sky, and bell flowers become springs with
  bloom.
- A sunrise that follows your progress through the level, with parallax sky, sun, mountains and hills.
- Creatures: greylings (can be stomped) and thornbacks (knocked off by bumping the block beneath them).
- Prism blocks with motes of light, a glow petal power-up that shields one hit and breaks bricks, lantern checkpoints
  and signs with a typewriter text box.
- Title screen, a four-page story intro, a pause screen and a chapter-clear screen with motes and time.
- A 3 x 5 pixel font with Czech diacritics. All texts are Czech and gender-neutral for Josepho.
- Fully synthesized sound effects, plus music that adds an instrument with every color that returns.
- All art is generated from text at startup; there are no image or audio files.

# Changelog

All notable changes to Josepho are listed here. Versions follow [Semantic Versioning](https://semver.org).

## Unreleased

Phase 0: the ground for levels 2-10.

### Added

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

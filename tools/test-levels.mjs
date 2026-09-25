// test-levels.mjs - checks every level before you push.
//
//   npm run test:levels            all levels
//   npm run test:levels -- 2 3     only levels 2 and 3
//   npm run test:levels -- --fast  skip the bot (quick checks and previews only)
//
// For each level it runs:
//   1. static checks  - map shape, known characters, start and end, signs, prisms, texts the font can draw
//   2. jump check     - places where nothing to the right is in safe jump reach (warnings, not errors)
//   3. preview        - tools/out/levelN.png: the whole level at its start (top) and with every color on
//   4. bot            - an automatic player tries to finish the level, then the game must return to the map
// Before all that, a smoke test walks through title -> story -> map -> level -> pause -> map, and checks that a
// level left half-way continues from its last lantern after the page is reloaded.
// Exit code 1 when something is broken, so it can run in CI too.

import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LEVELS } from '../src/levels/index.js';
import { WORLD } from '../src/levels/worldmap.js';
import { runBot } from './lib/bot.mjs';
import { checkJumps, checkLevel } from './lib/checks.mjs';
import { BT, createGame, fakeStorage, screenRgb, screenshot, seedRandom, stats, step, steps } from './lib/harness.mjs';
import { writePng } from './lib/png.mjs';

const OUT = fileURLToPath(new URL('./out/', import.meta.url));
const args = process.argv.slice(2);
const fast = args.includes('--fast');
const only = args.filter((a) => /^\d+$/.test(a)).map(Number);

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;

mkdirSync(OUT, { recursive: true });
seedRandom();
const storage = fakeStorage();
const game = await createGame();
let failed = false;

/** The map must be drawn with a clean camera, not the camera the level left behind. */
function expectMapCamera(when) {
    const cam = stats.firstDrawCamera;
    if (game.state !== 'map') {
        throw new Error(`${when}: expected the world map, got '${game.state}'`);
    }
    if (cam && (cam.x !== 0 || cam.y !== 0)) {
        throw new Error(`${when}: the map was drawn with the camera at ${cam.x}, ${cam.y} (it must be 0, 0)`);
    }
}

// ---------------------------------------------------------------------- smoke test
try {
    steps(game, 30);
    step(game, ['Space']); // title -> story
    step(game);
    step(game, ['Enter']); // skip the story -> map
    steps(game, 30);
    if (game.state !== 'map') {
        throw new Error(`expected the world map, got '${game.state}'`);
    }
    screenshot(`${OUT}map.png`);
    step(game, ['Space']); // play level 1
    steps(game, 40);
    if (game.state !== 'play') {
        throw new Error(`expected a level, got '${game.state}'`);
    }
    steps(game, 90, ['ArrowRight']); // move so the level camera is not at 0
    step(game, ['Enter']); // pause
    step(game);
    step(game, ['ArrowDown']);
    step(game);
    step(game, ['ArrowDown']);
    step(game);
    step(game, ['Space']); // "back to the map"
    steps(game, 20);
    expectMapCamera('pause -> back to the map');
    console.log(green('smoke test: title, story, map, level, pause and back to the map all work'));

    // a level left half-way: after a reload, "Continue" goes back to the last lantern
    game.startLevel(1);
    steps(game, 30);
    game.enemies = [];
    game.player.reset(72 * 8 + 1, 11 * 8 - 10);
    game.wakePrism(game.prisms[0]);
    steps(game, 60, ['ArrowRight']);
    const reloaded = await createGame();
    steps(reloaded, 25);
    step(reloaded, ['Space']); // "Continue"
    steps(reloaded, 10);
    const tile = Math.floor(reloaded.player.px / 8);
    if (reloaded.state !== 'play' || tile < 70 || !reloaded.prisms[0].awake || !reloaded.level.gates.green) {
        throw new Error(`continue after reload: expected level 1 at the lantern with prism 1 awake, got '${reloaded.state}' at tile ${tile}`);
    }
    console.log(green('smoke test: after a reload, Continue returns to the last lantern'));
    for (const k of Object.keys(storage)) {
        delete storage[k];
    }
} catch (e) {
    failed = true;
    console.log(red(`smoke test failed: ${e.stack}`));
}

// ---------------------------------------------------------------------- per level
function preview(def) {
    game.startLevel(def.number);
    game.banner = null;
    game.chroma.fade = 0;
    game.fadeIn = false;
    const pw = game.level.pw;
    const rows = 2;
    const rgb = new Uint8Array(pw * 108 * rows * 3);
    for (let r = 0; r < rows; r++) {
        if (r === 1) {
            game.turnOn(Object.keys(game.spec.groups), true);
            game.chroma.dawn = 1;
        }
        game.writePalette(BT.palette, true);
        for (const e of game.enemies) {
            e.active = true;
        }
        for (let cam = 0; cam < pw; cam += 192) {
            game.camX = Math.min(cam, pw - 192);
            game.camY = game.level.ph - 108;
            game.renderWorld(true);
            const shot = screenRgb();
            for (let y = 0; y < 108; y++) {
                for (let x = 0; x < 192; x++) {
                    const wx = game.camX + x;
                    const d = ((r * 108 + y) * pw + wx) * 3;
                    const s = (y * 192 + x) * 3;
                    rgb[d] = shot[s];
                    rgb[d + 1] = shot[s + 1];
                    rgb[d + 2] = shot[s + 2];
                }
            }
        }
    }
    const path = `${OUT}level${def.number}.png`;
    writePng(path, pw, 108 * rows, rgb, 1);
    return path;
}

for (const def of LEVELS) {
    if (only.length && !only.includes(def.number)) {
        continue;
    }
    console.log(`\nlevel ${def.number} - ${def.name}`);
    const { errors, warnings } = checkLevel(def, WORLD);
    for (const e of errors) {
        console.log(red(`  error:   ${e}`));
    }
    for (const w of warnings) {
        console.log(yellow(`  warning: ${w}`));
    }
    if (errors.length) {
        failed = true;
        continue;
    }
    const jumps = checkJumps(def);
    for (const w of jumps.warnings) {
        console.log(yellow(`  jump:    ${w}`));
    }
    for (const n of jumps.notes) {
        console.log(`  note:    ${n}`);
    }
    try {
        console.log(`  preview: ${preview(def)}`);
    } catch (e) {
        failed = true;
        console.log(red(`  preview crashed: ${e.stack}`));
        continue;
    }
    if (fast) {
        continue;
    }
    try {
        game.startLevel(def.number);
        const result = runBot(game);
        const secs = Math.round(result.frames / 60);
        const deaths = result.deaths.map((d) => `${d.cause}@${d.tile}`).join(', ') || 'none';
        if (result.cleared) {
            console.log(green(`  bot:     finished in ${secs} s, deaths: ${deaths}`));
            steps(game, 70);
            step(game, ['Space']); // clear screen -> map
            steps(game, 5);
            expectMapCamera(`after finishing level ${def.number}`);
            if (game.save.inProgress) {
                throw new Error('a finished level must not stay saved as "in progress"');
            }
            console.log(green('  after:   back on the map, level saved as finished'));
        } else {
            failed = true;
            screenshot(`${OUT}level${def.number}-stuck.png`);
            console.log(red(`  bot:     did not finish - stuck at tile ${result.stuckAt.x}, ${result.stuckAt.y} after ${secs} s`));
            console.log(red(`           deaths: ${deaths}; screenshot: ${OUT}level${def.number}-stuck.png`));
        }
    } catch (e) {
        failed = true;
        console.log(red(`  bot crashed the game: ${e.stack}`));
    }
}

console.log(failed ? red('\nsome checks failed') : green('\nall checks passed'));
process.exit(failed ? 1 : 0);

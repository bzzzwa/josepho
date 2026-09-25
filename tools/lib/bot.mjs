// bot.mjs - a simple automatic player: runs right, jumps over walls, gaps, hazards and creatures,
// flutters over pits, and looks for a bell flower when a wall is too high. It is not clever; if it gets
// stuck somewhere, look at that spot - a human may get stuck there too.

import { step } from './harness.mjs';

const RIGHT = 'ArrowRight';
const LEFT = 'ArrowLeft';
const RUN = 'KeyX';
const JUMP = 'KeyZ';

/**
 * Plays the level that is currently running. Returns { cleared, frames, deaths: [...], stuckAt }.
 * maxFrames: give up after this many frames (default 6 minutes).
 */
export function runBot(game, { maxFrames = 60 * 60 * 6 } = {}) {
    const deaths = [];
    let hold = 0;
    let flutterArmed = false;
    let lastX = 0;
    let stuck = 0;
    let springMode = null;
    let furthest = 0;

    for (let f = 0; f < maxFrames; f++) {
        if (game.state === 'clear') {
            return { cleared: true, frames: f, deaths, stuckAt: null };
        }
        if (game.state !== 'play') {
            step(game);
            continue;
        }
        const p = game.player;
        const level = game.level;
        const solidAt = (x, y) => level.collides(x, y, 1, 1, true);
        const keys = [];
        const feet = p.bottom;

        if (p.dead) {
            step(game);
            continue;
        }
        furthest = Math.max(furthest, p.px);

        // a wall too high: go back and use a bell flower, if there is one
        if (springMode) {
            const b = springMode;
            if (p.px > b.x - 22 && !springMode.approach) {
                keys.push(LEFT);
            } else {
                springMode.approach = true;
                keys.push(RIGHT);
                if (p.onGround && p.px >= b.x - 12 && p.px < b.x) {
                    hold = 4;
                }
                if (!p.onGround && p.vy < 0 && p.spring) {
                    springMode = null; // launched
                }
                if (p.px > b.x + 30) {
                    springMode = null;
                }
            }
        } else {
            keys.push(RIGHT, RUN);
            if (p.onGround) {
                let jump = false;
                const front = p.px + p.w;
                for (let dx = 1; dx < 14; dx++) {
                    if (solidAt(front + dx, feet - 3)) {
                        jump = true;
                    }
                }
                let ground = false;
                for (let dy = 0; dy < 24; dy++) {
                    if (solidAt(front + 6, feet + dy)) {
                        ground = true;
                    }
                }
                if (!ground || level.hazard(front + 2, feet + 1, 4, 3) || level.hazard(front + 8, feet - 2, 4, 3)) {
                    jump = true;
                }
                for (const e of game.enemies) {
                    if (e.active && e.state === 'walk' && e.px > p.px && e.px - p.px < 22 && Math.abs(e.py + e.h - feet) < 6) {
                        jump = true;
                    }
                }
                if (jump && hold === 0) {
                    hold = 22;
                    flutterArmed = false;
                }
            }
        }

        if (hold > 0) {
            keys.push(JUMP);
            hold--;
        } else if (!p.onGround && p.vy > 0 && !springMode) {
            // over a pit: flutter (release once, then press and hold)
            let ground = false;
            for (let dy = 0; dy < 112; dy++) {
                if (solidAt(p.px + 3, feet + dy) || solidAt(p.px + 14, feet + dy)) {
                    ground = true;
                }
            }
            if (!ground) {
                if (flutterArmed) {
                    keys.push(JUMP);
                }
                flutterArmed = true;
            }
        }

        if (stuck > 120 && !springMode) {
            // look for a bell flower behind
            const bell = game.bells.find((b) => level.gates.bloom && b.x < p.px && p.px - b.x < 100);
            if (bell) {
                springMode = { x: bell.x + 4, approach: false };
                stuck = 0;
            } else {
                keys.push(JUMP);
                if (stuck > 600) {
                    return { cleared: false, frames: f, deaths, stuckAt: { x: Math.floor(p.px / 8), y: Math.floor(p.py / 8) } };
                }
            }
        }

        const deadBefore = p.dead;
        step(game, keys);
        if (!deadBefore && game.player.dead) {
            deaths.push({ frame: f, tile: Math.floor(p.px / 8), cause: game.player.deathCause });
        }
        if (Math.abs(p.px - lastX) < 1) {
            stuck++;
        } else if (p.px > furthest - 4) {
            stuck = 0;
        }
        lastX = p.px;
    }
    return { cleared: false, frames: maxFrames, deaths, stuckAt: { x: Math.floor(game.player.px / 8), y: Math.floor(game.player.py / 8) } };
}

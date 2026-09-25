// bot.mjs - a simple automatic player: runs right, jumps over walls, gaps, hazards and creatures,
// flutters over pits, swims, bumps a tide switch overhead when the way ahead is blocked, and looks for a
// bell flower when a wall is too high. It is not clever; if it gets stuck somewhere, look at that spot - a
// human may get stuck there too.

import { step } from './harness.mjs';

const RIGHT = 'ArrowRight';
const LEFT = 'ArrowLeft';
const RUN = 'KeyX';
const JUMP = 'KeyZ';

/**
 * Is the way ahead blocked for a normal jump? A wall taller than a jump, or a stretch of 8+ tiles with
 * nothing to land on near Josepho's height.
 */
function blockedAhead(level, p) {
    const T = 8;
    const col = Math.floor((p.px + p.w) / T);
    const feetRow = Math.floor((p.bottom - 1) / T);
    const standable = (x, y) => {
        const ch = level.tile(x, y);
        return (level.isSolidTile(ch) || level.isOneWay(ch)) && !level.isSolidTile(level.tile(x, y - 1));
    };
    let gap = 0;
    for (let dx = 1; dx <= 14; dx++) {
        const x = col + dx;
        let wall = true;
        for (let y = feetRow - 5; y <= feetRow; y++) {
            if (!level.isSolidTile(level.tile(x, y))) {
                wall = false;
            }
        }
        if (wall) {
            return true;
        }
        let land = false;
        for (let y = feetRow - 4; y <= feetRow + 3; y++) {
            if (standable(x, y) || level.isWater(x * T + 4, y * T + 4)) {
                land = true;
            }
        }
        gap = land ? 0 : gap + 1;
        if (gap >= 8) {
            return true;
        }
    }
    return false;
}

/** A tide switch right above Josepho's head (or `ahead` tiles further on), close enough to bump. */
function switchOverhead(level, p, ahead = 0) {
    const T = 8;
    const x = Math.floor(p.cx / T) + ahead;
    const head = Math.floor(p.py / T);
    for (let y = head - 1; y >= head - 5; y--) {
        const ch = level.tile(x, y);
        if (ch === 'P') {
            return level.activeSwitch() ? { x, y } : null;
        }
        if (level.isSolidTile(ch)) {
            return null;
        }
    }
    return null;
}

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
    let lastSwitch = { frame: -999, key: '' };
    let strokeTimer = 0;

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
        } else if (p.inWater) {
            // swim: a stroke every so often, and leap out at the far bank
            keys.push(RIGHT);
            strokeTimer++;
            const bank = level.collides(p.px + p.w + 2, p.py + 2, 2, p.h - 4);
            if (strokeTimer > 14 || (bank && strokeTimer > 4)) {
                strokeTimer = 0;
                hold = 3;
            }
        } else {
            keys.push(RIGHT, RUN);
            const sw = p.onGround ? switchOverhead(level, p) : null;
            const swKey = sw ? `${sw.x},${sw.y}` : '';
            const again = swKey !== lastSwitch.key || f - lastSwitch.frame > 90;
            const swSoon = p.onGround && !sw && [1, 2, 3].some((a) => switchOverhead(level, p, a));
            if (sw && again && blockedAhead(level, p)) {
                // the tide switch first: it may make the way
                lastSwitch = { frame: f, key: swKey };
                hold = 8;
                keys.length = 0;
            } else if (swSoon && blockedAhead(level, p)) {
                // a switch just ahead and trouble after it: walk up to it instead of jumping
                keys.length = 0;
                keys.push(RIGHT);
            } else if (p.onGround) {
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

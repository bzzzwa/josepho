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

/** Are there tiles of this color in the next stretch of the level (so bumping its leaf block helps)? */
function colorAhead(level, p, gate) {
    const col = Math.floor(p.cx / 8);
    for (let x = col + 1; x <= col + 16; x++) {
        for (let y = 0; y < level.h; y++) {
            if (level.legend[level.tile(x, y)]?.gate === gate && level.legend[level.tile(x, y)]?.kind !== 'timer') {
                return true;
            }
        }
    }
    return false;
}

/** Ledges whose volume comes and goes with light or rhythm: walk along them, never jump into them. */
const LIGHT_KINDS = new Set(['beam', 'pulse', 'arc']);
const ledgeOnNow = (level, e, x, y) => (e.kind === 'beam' ? level.inBeams(e, x, y) : level.ledgeOn(e));

/** The nearest beam ledge just ahead is not lit yet: wait for the lamp. */
function beamNotYet(level, p) {
    const col = Math.floor(p.cx / 8);
    const feetRow = Math.floor((p.bottom - 1) / 8);
    // look a little further when running: stopping takes a few pixels
    const reach = Math.abs(p.vx) > 16 ? 4 : 2;
    for (let dx = 1; dx <= reach; dx++) {
        for (let y = feetRow - 1; y <= feetRow + 1; y++) {
            const e = level.legend[level.tile(col + dx, y)];
            if (LIGHT_KINDS.has(e?.kind)) {
                // a ledge of the rhythm whose turn comes next: walk up to it anyway (see the ride below)
                if (e.kind !== 'beam' && level.pulse.next === e.gate) {
                    return false;
                }
                return !ledgeOnNow(level, e, col + dx, y);
            }
        }
    }
    return false;
}

/** Standing on a beam ledge, or a few tiles before one: the way on is to walk with the lamp's light. */
function onBeamRoute(level, p) {
    const col = Math.floor(p.cx / 8);
    const feetRow = Math.floor((p.bottom - 1) / 8);
    for (let dx = 0; dx <= 4; dx++) {
        for (let y = feetRow; y <= feetRow + 1; y++) {
            if (LIGHT_KINDS.has(level.legend[level.tile(col + dx, y)]?.kind)) {
                return true;
            }
        }
    }
    return false;
}

/** Josepho is grey (a ray caught them) and the paint ahead is grey too: wait for the color to come back. */
function greyAhead(level, p) {
    if (!(p.greyT > 0)) {
        return false;
    }
    const col = Math.floor(p.cx / 8);
    const feetRow = Math.floor((p.bottom - 1) / 8);
    for (let dx = 0; dx <= 3; dx++) {
        for (let y = feetRow - 2; y <= feetRow + 1; y++) {
            if (level.greyed.has(`${col + dx},${y}`)) {
                return true;
            }
        }
    }
    return false;
}

/** Grey paint just ahead (and Josepho not grey): walk up to it first - it takes its color back - then jump. */
function greyNear(level, p) {
    if (p.greyT > 0) {
        return false;
    }
    const col = Math.floor(p.cx / 8);
    const feetRow = Math.floor((p.bottom - 1) / 8);
    for (let dx = 1; dx <= 5; dx++) {
        for (let y = feetRow - 3; y <= feetRow + 2; y++) {
            if (level.greyed.has(`${col + dx},${y}`)) {
                return true;
            }
        }
    }
    return false;
}

/** A Discolorer whose ray would catch Josepho is about to fire: time to jump over it. */
function rayComing(game, p) {
    return game.enemies.some(
        (e) =>
            e.rest !== undefined &&
            e.state === 'charge' &&
            e.timer >= 26 &&
            p.bottom > e.y &&
            p.py < e.y + 16 &&
            Math.sign(p.cx - (e.x + 4)) === e.dir &&
            Math.abs(p.cx - (e.x + 4)) < 22 * 8, // (a tile more than the ray reaches: stepping into it counts)
    );
}

/** A stamp or an icicle just ahead that is shaking, falling or lying down. */
function stampAhead(game, p) {
    return game.enemies.some(
        (e) =>
            e.homeY !== undefined &&
            (e.w === 16 || e.w === 6) &&
            e.px > p.px + p.w - 2 &&
            e.px - (p.px + p.w) < 20 &&
            ['warn', 'fall', 'land'].includes(e.state),
    );
}

/** A closed fence within reach ahead, and a greyling walking between: free it (a stomp opens the fence). */
function fenceGreyling(game, p) {
    const level = game.level;
    const col = Math.floor(p.cx / 8);
    let fence = false;
    for (let x = col; x < col + 22 && !fence; x++) {
        fence = level.def.map.some((r) => r[x] === 'E') && !level.openFences.has(x);
    }
    if (!fence) {
        return null;
    }
    // the nearest greyling on either side
    const near = game.enemies.filter((e) => e.state === 'walk' && e.spawnKey && Math.abs(e.px - p.px) < 60);
    near.sort((a, b) => Math.abs(a.px - p.px) - Math.abs(b.px - p.px));
    return near[0] ?? null;
}

/** The nearest leaf block or tide switch behind Josepho (up to 20 tiles), bumpable from the ground below it. */
function findTriggerBehind(level, p) {
    const col = Math.floor(p.cx / 8);
    const feetRow = Math.floor((p.bottom - 1) / 8);
    for (let x = col; x >= col - 20; x--) {
        for (let y = feetRow - 6; y <= feetRow - 2; y++) {
            const ch = level.tile(x, y);
            if (ch === 'P' || level.legend[ch]?.kind === 'timer') {
                return { x, y };
            }
        }
    }
    return null;
}

/** A ledge a little ahead and 1-4 tiles up: jump onto it (climbing stairs of ledges). */
function ledgeAhead(level, p) {
    const col = Math.floor((p.px + p.w) / 8);
    const feetRow = Math.floor((p.bottom - 1) / 8);
    for (let dx = 1; dx <= 2; dx++) {
        for (let y = feetRow - 4; y <= feetRow - 1; y++) {
            const ch = level.tile(col + dx, y);
            if (level.isOneWay(ch) && !level.isSolidTile(level.tile(col + dx, y - 1))) {
                return true;
            }
        }
    }
    return false;
}

/**
 * A tide switch or a leaf block right above Josepho's head (or `ahead` tiles further on), close enough to
 * bump. A leaf block counts while its color is off or has less than half its time left.
 */
function switchOverhead(level, p, ahead = 0, timers = new Map()) {
    const T = 8;
    const x = Math.floor(p.cx / T) + ahead;
    const head = Math.floor(p.py / T);
    for (let y = head - 1; y >= head - 5; y--) {
        const ch = level.tile(x, y);
        if (ch === 'P') {
            return level.activeSwitch() ? { x, y } : null;
        }
        if (level.legend[ch]?.kind === 'timer') {
            // a leaf block whose color is already on needs no bump
            const gate = level.legend[ch].gate;
            const t = timers.get(gate);
            return level.gates[gate] && (!t || t.left > t.total / 2) ? null : { x, y, gate };
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
    if (game.def.climb) {
        return runClimbBot(game, { maxFrames });
    }
    const deaths = [];
    let hold = 0;
    let flutterArmed = false;
    let lastX = 0;
    let stuck = 0;
    let springMode = null;
    let retreat = null; // going back to a leaf block or switch to try a stretch again
    let furthest = 0;
    let lastSwitch = { frame: -999, key: '' };
    let waiting = false; // waiting on purpose (for a lamp or a stamp) is not being stuck
    let hopping = false; // on or just off a bridge of light or rhythm: no speeding up in the air
    let strokeTimer = 0;

    for (let f = 0; f < maxFrames; f++) {
        if (game.state === 'clear') {
            return { cleared: true, frames: f, deaths, stuckAt: null };
        }
        if (game.state !== 'play') {
            step(game);
            continue;
        }
        if (game.talk) {
            // a conversation: read it (press jump every few frames)
            step(game, f % 6 === 0 ? [JUMP] : []);
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

        // stuck at a wall with a leaf block or switch behind: go back under it, bump it, try again
        if (retreat) {
            const col = Math.floor(p.cx / 8);
            if (col > retreat.x) {
                keys.push(LEFT);
            } else if (p.onGround) {
                hold = 8;
                retreat = null;
                lastSwitch = { frame: f, key: '' };
            }
        } else if (springMode) {
            // a wall too high: go back and use a bell flower, if there is one
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
            const sw = p.onGround ? switchOverhead(level, p, 0, game.timers) : null;
            const swKey = sw ? `${sw.x},${sw.y}` : '';
            const again = swKey !== lastSwitch.key || f - lastSwitch.frame > 90;
            const swSoon = p.onGround && !sw && [1, 2, 3].some((a) => switchOverhead(level, p, a, game.timers));
            const needed = sw && (blockedAhead(level, p) || (sw.gate && colorAhead(level, p, sw.gate)));
            const dodge = p.onGround && rayComing(game, p);
            const wait = p.onGround && !dodge && (beamNotYet(level, p) || stampAhead(game, p) || greyAhead(level, p));
            waiting = wait;
            const toFree = p.onGround && !wait ? fenceGreyling(game, p) : null;
            const ride = p.onGround && onBeamRoute(level, p);
            if (dodge) {
                // a Discolorer is about to fire along this row: jump the ray (straight up, to stay on the ledge)
                keys.length = 0;
                hold = 14;
            } else if (wait) {
                // a lamp's light has not reached the ledge ahead yet, or a stamp ahead is coming down: wait
                keys.length = 0;
            } else if (p.onGround && greyNear(level, p)) {
                // grey paint ahead: walk on (to the edge at most), and let it take its color back first
                keys.length = 0;
                const front = p.px + p.w + 2;
                if (solidAt(front, p.bottom)) {
                    keys.push(RIGHT);
                }
                waiting = true;
            } else if (toFree) {
                // a fence ahead: let the greyling come, then hop onto it
                keys.length = 0;
                const d = toFree.px - p.px;
                const coming = (d > 0 && toFree.vx < 0) || (d < 0 && toFree.vx > 0);
                if (Math.abs(d) < 22 && (coming || Math.abs(d) <= 12)) {
                    // it is coming (or already close): jump, and come down on it
                    hold = 6;
                } else if (d > 0 && !coming) {
                    keys.push(RIGHT);
                } else {
                    waiting = true;
                }
            } else if (ride) {
                hopping = true; // careful in the air too, until back on firm ground
                // on (or at) a bridge of lamp light or of the aurora: walk with it, never jump into the dark - step
                // on only while the ledge under Josepho's front has volume. At a ledge of the rhythm's next color,
                // step a little onto it and wait: when the turn passes, it takes over from the one underfoot.
                keys.length = 0;
                const under = Math.floor((p.bottom + 1) / 8);
                const peek = Math.floor((p.px + p.w + 2) / 8);
                const pe = level.legend[level.tile(peek, under)];
                const nextTurn = pe && pe.kind !== 'beam' && LIGHT_KINDS.has(pe.kind) && !level.ledgeOn(pe) && level.pulse.next === pe.gate;
                const front = nextTurn ? Math.floor((p.px + p.w - 3) / 8) : peek;
                const e = level.legend[level.tile(front, under)];
                const here = level.legend[level.tile(Math.floor(p.cx / 8), under)];
                // stepping from firm ground onto the light: only while its lamp moves on ahead, not back toward us
                const x = front * 8 + 4;
                const coming = game.lamps.some((l) => l.range && l.dir < 0 && Math.abs(l.x - x) < l.width);
                const boarding = here?.kind !== 'beam' && e?.kind === 'beam';
                const dark = LIGHT_KINDS.has(e?.kind) && !ledgeOnNow(level, e, front, under);
                // stepping onto a stretch of the rhythm from firm ground: only with time enough to walk all of it
                // (judged by the back foot: drifting a little onto the stretch is not yet being on it)
                const back = level.legend[level.tile(Math.floor(p.px / 8), under)];
                let late = false;
                if (e && (e.kind === 'pulse' || e.pulses) && back?.kind !== e.kind && !nextTurn) {
                    let end = front;
                    while (level.legend[level.tile(end + 1, under)]?.gate === e.gate) {
                        end++;
                    }
                    late = level.pulse.left < (end + 1) * 8 - p.px + 12;
                }
                // at the border of the next color's turn: start braking early enough to stop astride the border
                let brake = false;
                const ahead = Math.ceil((p.px + p.w - 2) / 8); // the first column still ahead of Josepho's body
                for (let c = ahead; c <= ahead + 3; c++) {
                    const t = level.legend[level.tile(c, under)];
                    if (t && t.kind !== 'beam' && LIGHT_KINDS.has(t.kind) && !level.ledgeOn(t) && level.pulse.next === t.gate) {
                        const v = Math.abs(p.vx) / 16;
                        brake = c * 8 - (p.px + p.w) <= 8 * v * v - 2;
                        break;
                    }
                }
                if (!dark && !late && !brake && !(boarding && coming)) {
                    keys.push(RIGHT);
                    // a field line climbing one row: a small hop up onto the next step (when it has volume)
                    const stepCol = Math.floor((p.px + p.w + 3) / 8);
                    const step = level.legend[level.tile(stepCol, under - 1)];
                    if (step && LIGHT_KINDS.has(step.kind) && ledgeOnNow(level, step, stepCol, under - 1)) {
                        hold = 3;
                        hopping = true;
                    }
                }
                waiting = keys.length === 0;
            } else if (sw && again && needed) {
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
                if (ledgeAhead(level, p)) {
                    jump = true;
                }
                for (const e of game.enemies) {
                    if (e.active && e.state === 'walk' && e.px > p.px && e.px - p.px < 22 && Math.abs(e.py + e.h - feet) < 6) {
                        jump = true;
                    }
                    // a box in the ground just ahead (unless stomped flat): jump over it
                    const boxAhead = e.behindTiles && e.state !== 'flat' && e.px > p.px - 2 && e.px - p.px < 18;
                    if (boxAhead && Math.abs(e.bottom - feet) < 6) {
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

        if (stuck > 120 && !springMode && !retreat) {
            // look for a bell flower behind, or a leaf block / switch to use again
            const bell = game.bells.find((b) => level.gates.bloom && b.x < p.px && p.px - b.x < 100);
            const trigger = findTriggerBehind(level, p);
            if (bell) {
                springMode = { x: bell.x + 4, approach: false };
                stuck = 0;
            } else if (trigger && stuck < 400) {
                retreat = trigger;
                stuck = 0;
            } else {
                keys.push(JUMP);
                if (stuck > 600) {
                    return { cleared: false, frames: f, deaths, stuckAt: { x: Math.floor(p.px / 8), y: Math.floor(p.py / 8) } };
                }
            }
        }

        if (hopping) {
            if (p.onGround && hold === 0 && !onBeamRoute(level, p)) {
                hopping = false;
            } else if (!p.onGround) {
                const i = keys.indexOf(RUN);
                if (i >= 0) {
                    keys.splice(i, 1);
                }
                if (Math.abs(p.vx) >= 12) {
                    const r = keys.indexOf(RIGHT);
                    if (r >= 0) {
                        keys.splice(r, 1);
                    }
                }
            }
        }
        const deadBefore = p.dead;
        step(game, keys);
        if (!deadBefore && game.player.dead) {
            deaths.push({ frame: f, tile: Math.floor(p.px / 8), cause: game.player.deathCause });
        }
        if (Math.abs(p.px - lastX) < 1) {
            stuck = waiting ? 0 : stuck + 1;
        } else if (p.px > furthest - 4) {
            stuck = 0;
        }
        lastX = p.px;
    }
    return { cleared: false, frames: maxFrames, deaths, stuckAt: { x: Math.floor(game.player.px / 8), y: Math.floor(game.player.py / 8) } };
}

// ------------------------------------------------------------------------------------------- climbing levels

/**
 * The ground Josepho can stand on, as flat segments { row, x0, x1, solid } (tiles), and which segment can be
 * reached from which: a jump up to 4 rows, across a gap of a few tiles, or any drop. Gated, light and paint tiles
 * count as there. Used by the climbing bot (and the reachability check) for levels that go up as well as across.
 */
export function standGraph(level) {
    const stand = (x, y) => {
        const ch = level.tile(x, y);
        // (a gated tile whose color is not back yet counts too: the way to its prism comes first)
        return level.isSolidTile(ch) || level.isOneWay(ch) || ['solid', 'oneway'].includes(level.legend[ch]?.kind);
    };
    const solidAt = (x, y) => level.isSolidTile(level.tile(x, y));
    const segs = [];
    for (let y = 1; y < level.h; y++) {
        let start = -1;
        for (let x = 0; x <= level.w; x++) {
            const ok = x < level.w && stand(x, y) && !solidAt(x, y - 1) && !solidAt(x, y - 2);
            if (ok && start < 0) {
                start = x;
            } else if (!ok && start >= 0) {
                segs.push({ row: y, x0: start, x1: x - 1, solid: solidAt(start, y) });
                start = -1;
            }
        }
    }
    const edges = segs.map(() => []);
    segs.forEach((a, i) => {
        segs.forEach((b, j) => {
            if (i === j) {
                return;
            }
            const rise = a.row - b.row; // up is positive
            const gap = Math.max(0, Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1) - 1);
            const overlap = Math.min(a.x1, b.x1) >= Math.max(a.x0, b.x0);
            if (rise > 4 || (rise > 0 && gap > 4 - Math.floor(rise / 2)) || (rise <= 0 && gap > 6)) {
                return;
            }
            // a solid block right above cannot be jumped up through: only from beside it
            if (rise > 0 && overlap && b.solid && a.x0 >= b.x0 && a.x1 <= b.x1) {
                return;
            }
            edges[i].push(j);
        });
    });
    return { segs, edges };
}

/** The segment Josepho stands on (or the nearest one under them). */
function segmentAt(graph, cx, bottom) {
    const tx = Math.floor(cx / 8);
    const row = Math.round(bottom / 8);
    return graph.segs.findIndex((s) => s.row === row && tx >= s.x0 - 1 && tx <= s.x1 + 1);
}

/** The shortest way from segment `from` to one of `goals` (a list of segment indices), or null. */
function route(graph, from, goals) {
    const prev = new Map([[from, -1]]);
    const queue = [from];
    while (queue.length) {
        const i = queue.shift();
        if (goals.includes(i)) {
            const path = [];
            for (let k = i; k >= 0; k = prev.get(k)) {
                path.unshift(k);
            }
            return path;
        }
        for (const j of graph.edges[i]) {
            if (!prev.has(j)) {
                prev.set(j, i);
                queue.push(j);
            }
        }
    }
    return null;
}

/**
 * The climbing bot: finds its way on the stand graph to the flag - left, right and up - and follows it, segment by
 * segment, working the path out again whenever it stands on new ground (after a fall too). It jumps Discolorers'
 * rays, lets grey paint take its color back before jumping to it, waits for a shaft's ray to pass, jumps over
 * walking creatures, and kicks the boxes in its way just by walking into them.
 */
function runClimbBot(game, { maxFrames }) {
    const deaths = [];
    const level = game.level;
    const graph = standGraph(level);
    const flag = game.greatPrism;
    const goals = [segmentAt(graph, flag.cx, flag.bottom)].filter((i) => i >= 0);
    let path = null;
    let hold = 0;
    let dir = 1;
    let lastSeg = -2;
    let idle = 0;
    let lastPos = '';

    for (let f = 0; f < maxFrames; f++) {
        if (game.state === 'clear') {
            return { cleared: true, frames: f, deaths, stuckAt: null };
        }
        if (game.state !== 'play') {
            step(game);
            continue;
        }
        if (game.talk) {
            step(game, f % 6 === 0 ? [JUMP] : []);
            continue;
        }
        const p = game.player;
        const keys = [];
        if (p.onGround && hold === 0) {
            const here = segmentAt(graph, p.cx, p.bottom);
            if (here >= 0 && (here !== lastSeg || !path)) {
                path = route(graph, here, goals);
                lastSeg = here;
            }
            const next = path && path.length > 1 ? graph.segs[path[1]] : null;
            const cur = here >= 0 ? graph.segs[here] : null;
            if (path && path.length === 1) {
                // on the flag's own ground: walk to it
                keys.push(flag.cx > p.cx ? RIGHT : LEFT);
            } else if (next && cur) {
                const rise = cur.row - next.row;
                const overlap = Math.min(cur.x1, next.x1) >= Math.max(cur.x0, next.x0);
                // where to take off from (pixels), and which way to go once in the air
                let takeoff;
                if (rise > 0 && overlap && !next.solid) {
                    takeoff = (Math.max(cur.x0, next.x0) + Math.min(cur.x1, next.x1) + 1) * 4;
                    dir = 0;
                } else if (rise > 0 && overlap && next.solid) {
                    takeoff = cur.x0 < next.x0 ? next.x0 * 8 - 4 : (next.x1 + 1) * 8 + 4;
                    dir = cur.x0 < next.x0 ? 1 : -1;
                } else {
                    dir = next.x0 > cur.x1 ? 1 : next.x1 < cur.x0 ? -1 : Math.sign((next.x0 + next.x1) / 2 - (cur.x0 + cur.x1) / 2) || 1;
                    takeoff = dir > 0 ? (cur.x1 + 1) * 8 - 4 : cur.x0 * 8 + 4;
                    if (rise < 0 && overlap) {
                        takeoff = dir > 0 ? (cur.x1 + 1) * 8 + 2 : cur.x0 * 8 - 2;
                    }
                }
                const d = takeoff - p.cx;
                const landing = [...Array(next.x1 - next.x0 + 1).keys()].map((k) => `${next.x0 + k},${next.row}`);
                const greyLanding = landing.some((k) => level.greyed.has(k));
                // (a shaft's ray due soon: wait until it has fired; also when the way there leads through it)
                const shaftRay = game.enemies.some(
                    (e) =>
                        e.vertical &&
                        e.state !== 'off' &&
                        (e.state === 'charge' || (e.state === 'rest' && e.timer > e.rest - 50)) &&
                        (e.inRay((next.x0 - 1) * 8, (next.x1 + 2) * 8, (next.row - 3) * 8, (next.row + 1) * 8) ||
                            e.inRay(Math.min(p.cx, takeoff) - 4, Math.max(p.cx, takeoff) + 4, p.py, p.bottom)),
                );
                const ray = rayAhead(game, p);
                const creature = game.enemies.find(
                    (e) => e.state === 'walk' && Math.abs(e.py + (e.h ?? 8) - p.bottom) < 6 && Math.sign(e.px - p.px) === (Math.sign(d) || dir) && Math.abs(e.px - p.px) < 20,
                );
                // a shaft's ray about to fire where Josepho stands: step out of it, to the side
                const inShaftRay = game.enemies.find(
                    (e) => e.vertical && e.state !== 'off' && (e.state === 'charge' || e.timer > e.rest - 50) && e.inRay(p.px - 2, p.px + p.w + 2, p.py, p.bottom),
                );
                if (inShaftRay) {
                    keys.push(p.cx >= inShaftRay.x + 8 ? RIGHT : LEFT);
                } else if (ray) {
                    hold = 14; // jump straight up over the ray
                    dir = 0;
                } else if (creature && Math.abs(d) > 6) {
                    hold = 12;
                    dir = Math.sign(d);
                } else if (Math.abs(d) > 3 && !shaftRay) {
                    keys.push(d > 0 ? RIGHT : LEFT);
                } else if (Math.abs(d) > 3) {
                    // a shaft's ray is due on the way: wait
                } else if ((greyLanding && (p.greyT > 0 || f % 4 !== 0)) || shaftRay) {
                    // wait: the landing is grey (it takes its color back as Josepho waits nearby), or a ray is due
                } else if (rise < 0 && overlap === false) {
                    keys.push(dir > 0 ? RIGHT : LEFT);
                } else if (rise <= 0 && !overlap) {
                    hold = rise === 0 ? 8 : 4;
                } else if (rise < 0) {
                    keys.push(dir > 0 ? RIGHT : LEFT);
                } else if (dir === 0 && Math.abs(p.vx) > 4) {
                    // a jump straight up: stand still first
                } else {
                    hold = rise >= 3 ? 16 : 12;
                }
            }
        } else if (!p.onGround) {
            // in the air: steer toward the next segment (when there is one)
            const next = path && path.length > 1 ? graph.segs[path[1]] : null;
            if (next) {
                // keep over the next segment (a little inside its ends)
                const mid = (next.x0 + next.x1 + 1) * 4;
                if (p.cx < next.x0 * 8 + 3) {
                    keys.push(RIGHT);
                } else if (p.cx > (next.x1 + 1) * 8 - 3) {
                    keys.push(LEFT);
                } else if (Math.abs(p.cx - mid) > 4 && Math.abs(p.vx) > 6) {
                    keys.push(p.cx < mid ? RIGHT : LEFT);
                }
            }
        }
        if (hold > 0) {
            keys.push(JUMP);
            if (dir > 0) {
                keys.push(RIGHT);
            } else if (dir < 0) {
                keys.push(LEFT);
            }
            hold--;
        }
        const deadBefore = p.dead;
        step(game, keys);
        if (!deadBefore && game.player.dead) {
            deaths.push({ frame: f, tile: Math.floor(p.px / 8), row: Math.floor(p.py / 8), cause: game.player.deathCause });
            path = null;
            lastSeg = -2;
        }
        const pos = `${Math.round(p.px / 4)},${Math.round(p.py / 4)}`;
        idle = pos === lastPos ? idle + 1 : 0;
        lastPos = pos;
        if (idle > 900) {
            return { cleared: false, frames: f, deaths, stuckAt: { x: Math.floor(p.px / 8), y: Math.floor(p.py / 8) } };
        }
    }
    const p = game.player;
    return { cleared: false, frames: maxFrames, deaths, stuckAt: { x: Math.floor(p.px / 8), y: Math.floor(p.py / 8) } };
}

/** A sideways Discolorer about to fire along Josepho's row (in its last stage): jump. */
function rayAhead(game, p) {
    return game.enemies.some((e) => e.rest !== undefined && !e.vertical && e.stage === 3 && e.inRay(p.px, p.px + p.w, p.py, p.bottom));
}

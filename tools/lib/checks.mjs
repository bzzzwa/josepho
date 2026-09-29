// checks.mjs - static checks of a level definition, and a simple jump-reach check of its map.

import { glyphName, wrapText } from '../../src/font.js';
import { BUILTIN_LEGEND, ENTITY_CHARS, TILE_CHARS } from '../../src/world.js';

const BUILTIN_GROUPS = ['sky', 'earth', 'green', 'bloom', 'spirit'];
const SIGN_TEXT_WIDTH = 192 - 20;

// Josepho's reach, in tiles, with a safety margin (see "Zasady pro stavbu levelu" in docs/pribeh.md).
export const SAFE = {
    gap: 7, // running jump reaches about 9
    flutterGap: 9, // running jump plus flutter reaches about 11
    rise: 4, // a held jump reaches about 5
    springRise: 8, // a bell flower throws about 8-9 tiles high
};

function textProblems(text, where, errors, warnings) {
    for (const ch of text.replace(/\n/g, '')) {
        if (ch !== ' ' && glyphName(ch) === 'f:?' && ch !== '?') {
            errors.push(`${where}: the font has no letter '${ch}'`);
        }
    }
    const lines = wrapText(text, SIGN_TEXT_WIDTH);
    if (lines.length > 3) {
        warnings.push(`${where}: ${lines.length} lines on a sign - keep it to 2-3 short lines`);
    }
}

/** Returns { errors, warnings } for one level definition. */
export function checkLevel(def, world) {
    const errors = [];
    const warnings = [];
    const map = def.map ?? [];
    const legend = { ...BUILTIN_LEGEND, ...(def.legend ?? {}) };
    const stripeIds = (def.spectrum ?? []).map((s) => s.id);
    const groups = new Set([...BUILTIN_GROUPS, ...stripeIds]);

    if (!map.length) {
        errors.push('the map is empty');
        return { errors, warnings };
    }
    if (!world.nodes.some((n) => n.number === def.number)) {
        errors.push(`level ${def.number} has no node in src/levels/worldmap.js`);
    }
    if (map.length < 14) {
        errors.push(`the map has ${map.length} rows; it needs at least 14 (the screen is 13.5 tiles tall)`);
    }
    const width = map[0].length;
    map.forEach((row, y) => {
        if (row.length !== width) {
            errors.push(`row ${y} is ${row.length} characters long, row 0 is ${width}`);
        }
    });

    for (const [ch, entry] of Object.entries(def.legend ?? {})) {
        if (TILE_CHARS.has(ch) || ENTITY_CHARS.has(ch) || BUILTIN_LEGEND[ch]) {
            errors.push(`legend character '${ch}' is already used by the game`);
        }
        if (entry.kind === 'arch') {
            for (const g of [...(entry.turnsOn ?? []), ...(entry.turnsOff ?? []), entry.shows]) {
                if (!groups.has(g)) {
                    errors.push(`legend '${ch}' (arch): unknown color group '${g}'`);
                }
            }
        } else if (!groups.has(entry.gate)) {
            errors.push(`legend '${ch}': unknown color group '${entry.gate}'`);
        }
        if (entry.kind === 'timer' && !(entry.seconds > 0)) {
            errors.push(`legend '${ch}': a leaf block (kind 'timer') needs seconds`);
        }
    }

    const count = (ch) => map.reduce((n, row) => n + [...row].filter((c) => c === ch).length, 0);
    const unknown = new Set();
    for (const row of map) {
        for (const ch of row) {
            if (!TILE_CHARS.has(ch) && !ENTITY_CHARS.has(ch) && !legend[ch]) {
                unknown.add(ch);
            }
        }
    }
    for (const ch of unknown) {
        errors.push(`unknown map character '${ch}'`);
    }
    if (count('@') !== 1) {
        errors.push(`the map needs exactly one '@' (start), it has ${count('@')}`);
    }
    if (count('F') < 1) {
        errors.push("the map has no 'F' (the end of the level)");
    }
    const signs = count('s');
    if (signs !== (def.signs ?? []).length) {
        errors.push(`the map has ${signs} signs but the level has ${(def.signs ?? []).length} sign texts`);
    }
    for (const key of Object.keys(def.touchSigns ?? {})) {
        if (Number(key) >= signs) {
            errors.push(`touchSigns[${key}] has no sign`);
        }
    }
    for (let d = 1; d <= 9; d++) {
        if (count(String(d)) > 0 && !def.prisms?.[d - 1]) {
            errors.push(`prism '${d}' is on the map but prisms[${d - 1}] is missing`);
        }
    }
    (def.prisms ?? []).forEach((p, i) => {
        for (const g of p.turnsOn ?? []) {
            if (!groups.has(g)) {
                errors.push(`prisms[${i}] turns on unknown color group '${g}'`);
            }
        }
    });
    for (const g of def.startOn ?? []) {
        if (!groups.has(g)) {
            errors.push(`startOn: unknown color group '${g}'`);
        }
    }

    (def.signs ?? []).forEach((t, i) => textProblems(t, `sign ${i}`, errors, warnings));
    for (const [i, t] of Object.entries(def.touchSigns ?? {})) {
        textProblems(t, `touch sign ${i}`, errors, warnings);
    }
    (def.clearText ?? []).forEach((t, i) => textProblems(t, `clearText ${i}`, errors, warnings));
    (def.talks ?? []).forEach((t, i) => {
        for (const [who, line] of t.lines ?? []) {
            textProblems(who, `talk ${i} speaker`, errors, warnings);
            textProblems(line, `talk ${i}`, errors, warnings);
        }
    });
    for (const p of def.prisms ?? []) {
        if (p.banner) {
            textProblems(p.banner, 'prism banner', errors, warnings);
        }
    }
    return { errors, warnings };
}

/**
 * Looks for places Josepho cannot jump on from, going right, with every color on (the most volume the level
 * can have). It is a rough guide, not a proof: it ignores ceilings, enemies and moving parts.
 * Returns { warnings, notes }: warnings are gaps too far for a safe jump; notes are gaps that need a flutter
 * (fine where the level teaches or expects fluttering).
 */
export function checkJumps(def) {
    const map = def.map;
    const legend = { ...BUILTIN_LEGEND, ...(def.legend ?? {}) };
    const w = map[0].length;
    const h = map.length;
    const at = (x, y) => (y < 0 || y >= h || x < 0 || x >= w ? '.' : map[y][x]);
    const solid = (ch) => '#RB?GUP'.includes(ch) || legend[ch]?.kind === 'solid' || legend[ch]?.kind === 'timer';
    const standOn = (ch) => solid(ch) || ch === '=' || legend[ch]?.kind === 'oneway';
    const free = (ch) => !solid(ch);

    // standable surfaces per column, joined into flat segments
    const segments = [];
    for (let x = 0; x < w; x++) {
        for (let y = 2; y < h; y++) {
            if (standOn(at(x, y)) && free(at(x, y - 1)) && free(at(x, y - 2))) {
                const last = segments.find((s) => s.row === y && s.x1 === x - 1);
                if (last) {
                    last.x1 = x;
                } else {
                    segments.push({ row: y, x0: x, x1: x });
                }
            }
        }
    }
    const springs = [];
    const goals = [];
    map.forEach((row, y) =>
        [...row].forEach((ch, x) => {
            if (ch === 'b') {
                springs.push({ x, y });
            }
            if (ch === 'F') {
                goals.push(x);
            }
        }),
    );
    const goal = Math.min(...goals);

    const warnings = [];
    const notes = [];
    // can Josepho get from ledge s to ledge t (either side, or above/below it) with one jump?
    const jump = (s, t, gapLimit, hasSpring) => {
        const gap = Math.max(0, Math.max(s.x0, t.x0) - Math.min(s.x1, t.x1) - 1);
        const rise = s.row - t.row; // tiles up
        if (rise <= 0) {
            return gap <= gapLimit + Math.floor(-rise / 2);
        }
        return (rise <= SAFE.rise || (hasSpring && rise <= SAFE.springRise)) && gap <= gapLimit;
    };
    const springOn = (s) => springs.some((b) => b.x >= s.x0 - 1 && b.x <= s.x1 && b.y + 1 === s.row);
    // from s, following jumps from ledge to ledge, is any ledge further right in reach?
    const onward = (s, gapLimit) => {
        const seen = new Set([s]);
        const queue = [s];
        while (queue.length) {
            const a = queue.shift();
            if (a.x1 > s.x1) {
                return true;
            }
            for (const t of segments) {
                if (!seen.has(t) && jump(a, t, gapLimit, springOn(a))) {
                    seen.add(t);
                    queue.push(t);
                }
            }
        }
        return false;
    };
    for (const s of segments) {
        if (s.x1 >= goal || s.x1 >= w - 2) {
            continue;
        }
        if (at(s.x0, s.row - 1) === ',' || at(s.x1, s.row - 1) === ',') {
            continue; // the floor of a pit (backdrop behind it): its way out is back the way you came
        }
        if (onward(s, SAFE.gap)) {
            continue;
        }
        const where = `the ledge at columns ${s.x0}-${s.x1} (row ${s.row})`;
        if (onward(s, SAFE.flutterGap)) {
            notes.push(`from ${where} the next landing needs a flutter`);
        } else {
            warnings.push(`from ${where} nothing to the right is in safe jump reach`);
        }
    }
    // Every pit floor (backdrop behind it) must have a way out: stairs, or ledges, up to ground outside the pit.
    const inPit = (t) => at(t.x0, t.row - 1) === ',' || at(t.x1, t.row - 1) === ',';
    for (const s of segments) {
        if (!inPit(s)) {
            continue;
        }
        const seen = new Set([s]);
        const queue = [s];
        let out = false;
        while (queue.length && !out) {
            const a = queue.shift();
            for (const t of segments) {
                if (!seen.has(t) && jump(a, t, SAFE.gap, false)) {
                    if (!inPit(t) && t.row < s.row) {
                        out = true;
                        break;
                    }
                    seen.add(t);
                    queue.push(t);
                }
            }
        }
        if (!out) {
            warnings.push(`no way out of the pit floor at columns ${s.x0}-${s.x1} (row ${s.row}) - Josepho is stuck there`);
        }
    }

    // A hole one column wide that goes all the way down is almost always a slip in building the map.
    const bottomless = (x) => [...Array(h).keys()].every((y) => !standOn(at(x, y)) && at(x, y) !== '~');
    for (let x = 1; x < w - 1; x++) {
        if (bottomless(x) && !bottomless(x - 1) && !bottomless(x + 1)) {
            warnings.push(`column ${x} is a one-tile hole with no floor at all - falling in is death`);
        }
    }

    // A walking creature on the ground just after a pit may be waiting right where Josepho lands. Often fine
    // (it can be stomped), but worth a look: it is easy to land on it from the side.
    const isPit = (x, y) => [1, 2, 3].every((d) => !standOn(at(x, y + d)));
    map.forEach((row, y) =>
        [...row].forEach((ch, x) => {
            if (ch !== 'e' && ch !== 't') {
                return;
            }
            for (let dx = 1; dx <= 8; dx++) {
                if (!standOn(at(x - dx, y + 1))) {
                    if (isPit(x - dx, y)) {
                        notes.push(`the creature at column ${x} can walk to the landing after the pit at column ${x - dx}`);
                    }
                    return;
                }
            }
        }),
    );
    return { warnings, notes };
}

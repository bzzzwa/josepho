// world.js - the tile map: what is solid, what is deadly, and how it is drawn.
//
// Positions of moving things are kept in "subpixels" (1/16 of a pixel) as whole numbers, so motion can be
// smooth and slow while every drawn coordinate is still a whole pixel.

import { C, HINT_SHADES, STRIPE_SHADES } from './colors.js';

export const TILE = 8;
export const SUB = 16;
const SWITCH_REST = 20; // frames a tide switch ignores bumps after flipping (longer while Josepho stays beneath)

const SOLID = new Set(['#', 'R', 'B', '?', 'G', 'U', 'P']);
// P is the tide switch: a block that flips the level's two `switches` colors each time it is bumped
// ',' is backdrop: empty air drawn as a dark wall behind (the inside of a pit or a cave)
export const TILE_CHARS = new Set(['.', ',', '#', 'R', 'B', '?', 'G', 'U', 'P', '=', '~', '^']);
export const ENTITY_CHARS = new Set([
    '@', 'o', 'e', 't', 's', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'F', 'l', 'b', 'f', 'T', 'd', 'r', 'z', 'k',
]);

// Color-gated tiles every level knows. A level adds its own in `legend` (see src/levels/README.md):
//   kind  'solid' (a full block), 'oneway' (a ledge you can jump up through), 'water' (swimmable),
//         'timer' (a leaf block: always solid; bumping it turns its gate on for `seconds`), or
//         'arch' (not a tile: an arch to walk through - see the Arch object in actors.js), or
//         'flyer' (not a tile: a flutterer whose wings are the gate's color - see Flyer in actors.js), or
//         'aura' (a ledge - or with look 'block' a block - that has volume only in light: near Josepho, a lit
//         lantern or a freed greyling; drawn in the gate's color while lit)
//   gate  the color group that must be on for the tile to have volume (a timer: the group it turns on)
//   look  which art to draw: leaf, cloud, block, ledge, water
export const BUILTIN_LEGEND = {
    L: { kind: 'oneway', gate: 'green', look: 'leaf' },
    C: { kind: 'oneway', gate: 'sky', look: 'cloud' },
};

export function hash2(x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export class Level {
    constructor(def) {
        this.def = def;
        this.h = def.map.length;
        this.w = def.map[0].length;
        this.pw = this.w * TILE;
        this.ph = this.h * TILE;
        this.tiles = def.map.map((row) => [...row]);
        this.spawns = [];
        // a level's arches and flutterers (legend kind 'arch', 'flyer') are objects, not tiles
        const objectKinds = new Set(['arch', 'flyer']);
        const archChars = new Set(Object.entries(def.legend ?? {}).filter(([, e]) => objectKinds.has(e.kind)).map(([c]) => c));
        for (let y = 0; y < this.h; y++) {
            for (let x = 0; x < this.w; x++) {
                const ch = this.tiles[y][x];
                if (ENTITY_CHARS.has(ch) || archChars.has(ch)) {
                    this.spawns.push({ ch, tx: x, ty: y });
                    this.tiles[y][x] = this.fillUnder(def, x, y);
                }
            }
        }
        this.spawns.sort((a, b) => a.tx - b.tx || a.ty - b.ty);
        // color-gated tiles: map character -> { kind, gate, look }
        this.legend = { ...BUILTIN_LEGEND };
        for (const [ch, entry] of Object.entries(def.legend ?? {})) {
            this.legend[ch] = { kind: 'solid', look: 'block', ...entry };
        }
        // spectrum stripe order, for picking each stripe's palette offset when drawing
        this.stripeIndex = Object.fromEntries((def.spectrum ?? []).map((st, i) => [st.id, i]));
        // the two color groups a tide switch (P) flips between
        this.switches = def.switches ?? [];
        // after a flip the switch rests until Josepho has moved away from under it (and at least a moment), so
        // floating up under it in the water that just came does not flip it straight back
        this.switchRest = 0;
        this.switchRestX = -1; // the column of the switch that is resting
        this.tick = 0;
        // which color groups are on: group name -> true. A gated tile has volume only while its gate is on.
        this.gates = {};
        // groups about to run out (timer colors): their tiles blink
        this.blinking = new Set();
        // lights for aura tiles, set by the game every frame: [{ x, y, r }] in pixels
        this.lights = [];
        // tile bounce animations: key "x,y" -> frames left
        this.bumps = new Map();
        // tiles changed while playing ("x,y" -> new character), so a saved game can put them back
        this.changes = new Map();
        // grass tufts drawn in front of the player
        this.tufts = [];
        for (let x = 0; x < this.w; x++) {
            for (let y = 1; y < this.h; y++) {
                if (this.tiles[y][x] === '#' && this.tiles[y - 1][x] === '.' && hash2(x, y) < 0.3) {
                    this.tufts.push({ tx: x, ty: y, v: Math.floor(hash2(y, x) * 3) });
                }
            }
        }
    }

    /**
     * What is left in a map cell once the object drawn there (a fish, a shade, ...) has been taken out: the
     * water or backdrop around it, so a fish in a lagoon does not leave a hole of air in the water.
     */
    fillUnder(def, x, y) {
        const legend = { ...BUILTIN_LEGEND, ...(def.legend ?? {}) };
        const row = def.map[y];
        // only the neighbours at the same height: driftwood lying on the surface must not pull water up
        for (const ch of [row[x - 1], row[x + 1]]) {
            if (ch === ',' || legend[ch]?.kind === 'water') {
                return ch;
            }
        }
        return '.';
    }

    tile(tx, ty) {
        if (ty < 0 || ty >= this.h || tx < 0 || tx >= this.w) {
            return '.';
        }
        return this.tiles[ty][tx];
    }

    set(tx, ty, ch) {
        if (ty >= 0 && ty < this.h && tx >= 0 && tx < this.w) {
            this.tiles[ty][tx] = ch;
        }
    }

    /** Is this map character a color-gated tile whose color is on? */
    gatedOn(ch, kind) {
        const entry = this.legend[ch];
        return !!entry && entry.kind === kind && !!this.gates[entry.gate];
    }

    /**
     * Does this map character block movement from every side right now? With a position (tile coordinates),
     * aura blocks count only while lit; without one they count as there.
     */
    isSolidTile(ch, tx, ty) {
        if (SOLID.has(ch) || this.gatedOn(ch, 'solid') || this.legend[ch]?.kind === 'timer') {
            return true;
        }
        const e = this.legend[ch];
        return e?.kind === 'aura' && e.look === 'block' && this.litAt(tx, ty);
    }

    /** Is the middle of this tile in light? (No position: yes - "is the tile there at all".) */
    litAt(tx, ty) {
        if (tx === undefined) {
            return true;
        }
        const x = tx * TILE + 4;
        const y = ty * TILE + 4;
        for (const l of this.lights) {
            const dx = x - l.x;
            const dy = y - l.y;
            if (dx * dx + dy * dy <= l.r * l.r) {
                return true;
            }
        }
        return false;
    }

    isOneWay(ch, tx, ty) {
        if (ch === '=' || this.gatedOn(ch, 'oneway')) {
            return true;
        }
        const e = this.legend[ch];
        return e?.kind === 'aura' && e.look !== 'block' && this.litAt(tx, ty);
    }

    /** Is the point (in pixels) inside water whose color is on? Grey water has no volume at all. */
    isWater(px, py) {
        return this.gatedOn(this.tile(Math.floor(px / TILE), Math.floor(py / TILE)), 'water');
    }

    /** The switch group that is on right now, or null (before the tide has been woken up). */
    activeSwitch() {
        return this.switches.find((g) => this.gates[g]) ?? null;
    }

    /**
     * Does a box overlap anything solid? One-way tiles only count when the box is moving down and its
     * bottom row has just reached the top row of the tile.
     */
    collides(px, py, w, h, movingDown = false, dropThrough = false) {
        const x0 = Math.floor(px / TILE);
        const x1 = Math.floor((px + w - 1) / TILE);
        const y0 = Math.floor(py / TILE);
        const y1 = Math.floor((py + h - 1) / TILE);
        for (let ty = y0; ty <= y1; ty++) {
            for (let tx = x0; tx <= x1; tx++) {
                if (tx < 0 || tx >= this.w) {
                    return true; // the world's side walls
                }
                const ch = this.tile(tx, ty);
                if (this.isSolidTile(ch, tx, ty)) {
                    return true;
                }
                if (movingDown && !dropThrough && ty === y1 && this.isOneWay(ch, tx, ty) && py + h - 1 === ty * TILE) {
                    return true;
                }
            }
        }
        return false;
    }

    /** Standing on a one-way tile (so down + jump can drop through)? */
    onOneWay(px, py, w, h) {
        const ty = Math.floor((py + h) / TILE);
        for (let tx = Math.floor(px / TILE); tx <= Math.floor((px + w - 1) / TILE); tx++) {
            if (this.isOneWay(this.tile(tx, ty), tx, ty)) {
                return true;
            }
        }
        return false;
    }

    /** Which hazard (if any) touches a box: 'water', 'thorns' or null. */
    hazard(px, py, w, h) {
        const x0 = Math.floor(px / TILE);
        const x1 = Math.floor((px + w - 1) / TILE);
        const y0 = Math.floor(py / TILE);
        const y1 = Math.floor((py + h - 1) / TILE);
        for (let ty = y0; ty <= y1; ty++) {
            for (let tx = x0; tx <= x1; tx++) {
                const ch = this.tile(tx, ty);
                if (ch === '~' && py + h - 1 >= ty * TILE + 3) {
                    return 'water';
                }
                if (ch === '^' && py + h - 1 >= ty * TILE + 3) {
                    return 'thorns';
                }
            }
        }
        return null;
    }

    /** Josepho's head hit a tile from below. Returns what happened, for the game to react to. */
    bump(tx, ty, canBreak) {
        const ch = this.tile(tx, ty);
        if (ch === '?' || ch === 'G') {
            this.set(tx, ty, 'U');
            this.changes.set(`${tx},${ty}`, 'U');
            this.bumps.set(`${tx},${ty}`, 8);
            return ch === '?' ? 'mote' : 'petal';
        }
        if (this.legend[ch]?.kind === 'timer') {
            this.bumps.set(`${tx},${ty}`, 8);
            return 'timer';
        }
        if (ch === 'P') {
            this.bumps.set(`${tx},${ty}`, 8);
            if (!this.activeSwitch() || this.switchRest > 0) {
                return 'thud';
            }
            this.switchRest = SWITCH_REST;
            this.switchRestX = tx;
            return 'switch';
        }
        if (ch === 'B') {
            if (canBreak) {
                this.set(tx, ty, '.');
                this.changes.set(`${tx},${ty}`, '.');
                return 'break';
            }
            this.bumps.set(`${tx},${ty}`, 8);
            return 'bump';
        }
        if (this.isSolidTile(ch)) {
            return 'thud';
        }
        return null;
    }

    /** Called every frame with Josepho's box: the resting switch wakes once they are no longer beneath it. */
    update(px = -999, w = 0) {
        this.tick++;
        const beneath = px + w > this.switchRestX * TILE - 2 && px < (this.switchRestX + 1) * TILE + 2;
        if (this.switchRest > 1 || (this.switchRest === 1 && !beneath)) {
            this.switchRest--;
        }
        for (const [key, t] of this.bumps) {
            if (t <= 1) {
                this.bumps.delete(key);
            } else {
                this.bumps.set(key, t - 1);
            }
        }
    }

    // ------------------------------------------------------------------ drawing (world coordinates)

    isGround(tx, ty) {
        const ch = this.tile(tx, ty);
        return ch === '#' || (tx < 0 || tx >= this.w ? this.tile(Math.max(0, Math.min(this.w - 1, tx)), ty) === '#' : false);
    }

    render(gfx, camX, camY) {
        const x0 = Math.max(0, Math.floor(camX / TILE));
        const x1 = Math.min(this.w - 1, Math.floor((camX + 192) / TILE));
        const y1 = this.h - 1;
        for (let ty = 0; ty <= y1; ty++) {
            for (let tx = x0; tx <= x1; tx++) {
                const ch = this.tiles[ty][tx];
                if (ch === '.') {
                    continue;
                }
                const x = tx * TILE;
                let y = ty * TILE;
                const bump = this.bumps.get(`${tx},${ty}`);
                if (bump) {
                    y -= [0, 1, 2, 3, 3, 3, 2, 1, 1][bump] ?? 0;
                }
                this.drawTile(gfx, ch, tx, ty, x, y);
            }
        }
    }

    drawTile(gfx, ch, tx, ty, x, y) {
        switch (ch) {
            case '#': {
                gfx.draw(`dirt${Math.floor(hash2(tx, ty) * 4)}`, x, y);
                const left = this.isGround(tx - 1, ty);
                const right = this.isGround(tx + 1, ty);
                if (!left) {
                    gfx.draw('edgeL', x, y);
                }
                if (!right) {
                    gfx.draw('edgeR', x + 6, y);
                }
                if (!this.isGround(tx, ty - 1)) {
                    let cap = `grass${Math.floor(hash2(ty, tx) * 4)}`;
                    if (!left && !this.isGround(tx - 1, ty - 1)) {
                        cap = 'grassL';
                    } else if (!right && !this.isGround(tx + 1, ty - 1)) {
                        cap = 'grassR';
                    }
                    gfx.draw(cap, x, y - 3);
                }
                break;
            }
            case 'R':
                gfx.draw('rock', x, y);
                break;
            case 'B':
                gfx.draw((tx + ty) % 2 ? 'brick0' : 'brick1', x, y);
                break;
            case '?':
            case 'G':
                gfx.draw('prismBlock', x, y);
                break;
            case 'U':
                gfx.draw('usedBlock', x, y);
                break;
            case 'P': {
                // shows the color that is on now; grey until the tide wakes up
                const active = this.activeSwitch();
                if (active) {
                    gfx.draw('swBlock', x, y, (this.stripeIndex[active] ?? 0) * STRIPE_SHADES);
                } else {
                    gfx.draw('swBlockOff', x, y);
                }
                break;
            }
            case '=':
                gfx.draw('plank', x, y);
                break;
            case '~':
                gfx.draw(this.tile(tx, ty - 1) === '~' ? 'water' : 'waterTop', x, y);
                break;
            case '^':
                gfx.draw('spikes', x, y);
                break;
            case ',':
                // the dark back wall of a pit: solid, so nothing behind shows through
                gfx.rect(x, y, TILE, TILE, C.SHADE);
                gfx.tint('backdrop', x, y, C.DIRT_DK);
                break;
            default: {
                const entry = this.legend[ch];
                if (entry) {
                    this.drawGated(gfx, entry, tx, x, y);
                }
            }
        }
    }

    /** A color-gated tile: solid-looking when its color is on, a dotted ghost outline when it is off. */
    drawGated(gfx, entry, tx, x, y) {
        // about to run out: blink between the tile and its ghost
        const on = !!this.gates[entry.gate] && !(this.blinking.has(entry.gate) && Math.floor(this.tick / 5) % 2);
        if (entry.kind === 'aura') {
            // lit: its color (hint shades - they keep their color); dark: a faint dotted outline
            const ty = Math.floor((y + 4) / TILE);
            const block = entry.look === 'block';
            if (this.litAt(tx, ty)) {
                gfx.draw(block ? 'hBlock' : 'hLedge', x, y, (this.stripeIndex[entry.gate] ?? 0) * HINT_SHADES);
            } else {
                gfx.draw(block ? 'sBlockGhost' : 'sLedgeGhost', x, y, (this.stripeIndex[entry.gate] ?? 0) * STRIPE_SHADES);
            }
            return;
        }
        if (entry.kind === 'timer') {
            gfx.draw('tmFrame', x, y);
            gfx.draw('tmLeaf', x, y, (this.stripeIndex[entry.gate] ?? 0) * HINT_SHADES);
            return;
        }
        switch (entry.look) {
            case 'leaf':
                gfx.draw(on ? 'leaf' : 'leafGhost', x, y);
                break;
            case 'cloud': {
                const v = tx % 2;
                gfx.draw(on ? `cloud${v}` : `cloudGhost${v}`, x, y);
                break;
            }
            case 'water': {
                const offset = (this.stripeIndex[entry.gate] ?? 0) * STRIPE_SHADES;
                const surface = this.legend[this.tile(tx, Math.floor(y / TILE) - 1)]?.kind !== 'water';
                if (!on) {
                    // drained: a basin of wet sand, and a dotted line where the surface was
                    gfx.rect(x, y, TILE, TILE, C.DIRT_DK);
                    gfx.tint('backdrop', x, y, C.DIRT);
                    if (surface) {
                        gfx.draw('sWaterGhost', x, y, offset);
                    }
                } else if (surface) {
                    gfx.draw(Math.floor(this.tick / 20 + tx) % 2 ? 'sWaterTop0' : 'sWaterTop1', x, y, offset);
                } else {
                    gfx.draw('sWater', x, y, offset);
                }
                break;
            }
            default: {
                // spectrum tiles: drawn with stripe 0's slots, shifted to this stripe
                const offset = (this.stripeIndex[entry.gate] ?? 0) * STRIPE_SHADES;
                const base = entry.look === 'ledge' ? 'sLedge' : 'sBlock';
                gfx.draw(on ? base : `${base}Ghost`, x, y, offset);
            }
        }
    }

    renderTufts(gfx, camX) {
        for (const t of this.tufts) {
            const x = t.tx * TILE;
            if (x < camX - 8 || x > camX + 192) {
                continue;
            }
            if (this.tile(t.tx, t.ty) !== '#') {
                continue;
            }
            gfx.draw(`tuft${t.v}`, x, t.ty * TILE - 4);
        }
    }
}

/**
 * Moves a body (x, y, vx, vy in subpixels; w, h in pixels) through the level one pixel at a time.
 * Returns flags describing what it hit this frame.
 */
export function moveBody(level, b, dropThrough = false) {
    const res = { hitX: false, hitUp: false, landed: false };

    // Horizontal
    let nx = b.x + b.vx;
    let cur = Math.floor(b.x / SUB);
    const tx = Math.floor(nx / SUB);
    const py = Math.floor(b.y / SUB);
    if (tx !== cur) {
        const dir = tx > cur ? 1 : -1;
        while (cur !== tx) {
            if (level.collides(cur + dir, py, b.w, b.h)) {
                res.hitX = true;
                nx = dir > 0 ? cur * SUB + SUB - 1 : cur * SUB;
                break;
            }
            cur += dir;
        }
    }
    b.x = nx;

    // Vertical
    const px = Math.floor(b.x / SUB);
    let ny = b.y + b.vy;
    let cy = Math.floor(b.y / SUB);
    const ty = Math.floor(ny / SUB);
    if (ty !== cy) {
        const dir = ty > cy ? 1 : -1;
        while (cy !== ty) {
            if (level.collides(px, cy + dir, b.w, b.h, dir > 0, dropThrough)) {
                if (dir > 0) {
                    res.landed = true;
                    ny = cy * SUB + SUB - 1;
                } else {
                    res.hitUp = true;
                    ny = cy * SUB;
                }
                break;
            }
            cy += dir;
        }
    }
    b.y = ny;
    return res;
}

/** Is there something to stand on right below the body? */
export function isGrounded(level, b, dropThrough = false) {
    const px = Math.floor(b.x / SUB);
    const py = Math.floor(b.y / SUB);
    return level.collides(px, py + 1, b.w, b.h, true, dropThrough);
}

export { C };

// map.js - the world map of Lumen between levels.
//
// Josepho walks from node to node along a dotted path. Finished levels show their spectrum as a small flag
// (world map palette: every level's flag colors are their own color group, grey until the level is done),
// and the land itself regains color once the first level is finished.
//
// Keyboard: left/right (or up/down) to walk, Space/Enter to play, Esc back to the title.
// Touch: tap a node to walk there, tap the panel at the bottom to play.

import { C, FLAG0, FLAG_COLORS } from './colors.js';

const SPEED = 1.2; // pixels per frame when walking between nodes
const PANEL_Y = 86;

function hashNoise(i) {
    let h = Math.imul(i ^ 0x5bd1e995, 2654435761);
    h ^= h >>> 15;
    return ((h >>> 0) % 1000) / 1000;
}

export class WorldMap {
    /**
     * @param world   WORLD from levels/worldmap.js
     * @param save    the save data (unlocked, current, done)
     * @param hasLevel (number) => boolean, whether a level file exists
     */
    constructor(world, save, hasLevel) {
        this.world = world;
        this.nodes = world.nodes;
        this.save = save;
        this.hasLevel = hasLevel;
        this.at = Math.min(save.current, save.unlocked) - 1; // node index Josepho stands on
        this.target = this.at;
        this.x = this.nodes[this.at].x;
        this.y = this.nodes[this.at].y;
        this.tick = 0;
        this.message = null;

        // coastline: land spans per row, ragged
        this.coast = [];
        for (let y = 0; y < 108; y++) {
            const left = 4 + Math.round(hashNoise(y >> 2) * 5) + (y > 74 ? (y - 74) * 1.4 : 0);
            const right = 188 - Math.round(hashNoise((y >> 2) + 50) * 5);
            this.coast.push([Math.round(left), right]);
        }
        // specks of texture on the land
        this.specks = [];
        for (let i = 0; i < 420; i++) {
            const y = 7 + Math.floor(hashNoise(i * 3 + 1) * 92);
            const [l, r] = this.coast[y];
            const x = l + 2 + Math.floor(hashNoise(i * 3 + 2) * (r - l - 4));
            const north = y < 30;
            const light = hashNoise(i * 3 + 3) < 0.4;
            this.specks.push({ x, y, color: north ? (light ? C.WHITE : C.GREY_LT) : light ? C.GRASS_LT : C.GRASS_DK });
        }
    }

    get moving() {
        return this.at !== this.target || Math.abs(this.x - this.nodes[this.at].x) > 0.5 || Math.abs(this.y - this.nodes[this.at].y) > 0.5;
    }

    /** Walks to a node (only unlocked ones). */
    walkTo(index) {
        const max = this.save.unlocked - 1;
        this.target = Math.max(0, Math.min(max, index));
    }

    /**
     * @returns {{ play: number } | { back: true } | null}
     */
    update(inp, ui, touch) {
        this.tick++;
        if (this.message) {
            this.message.t--;
            if (this.message.t <= 0) {
                this.message = null;
            }
        }

        // step toward the next node on the way to the target
        if (this.at !== this.target || this.moving) {
            const next = this.at === this.target ? this.at : this.at + Math.sign(this.target - this.at);
            const n = this.nodes[next];
            const dx = n.x - this.x;
            const dy = n.y - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist <= SPEED) {
                this.x = n.x;
                this.y = n.y;
                this.at = next;
            } else {
                this.x += (dx / dist) * SPEED;
                this.y += (dy / dist) * SPEED;
            }
            return null;
        }

        if (ui.rightPressed || ui.downPressed) {
            this.walkTo(this.at + 1);
        } else if (ui.leftPressed || ui.upPressed) {
            this.walkTo(this.at - 1);
        }
        if (ui.backPressed) {
            return { back: true };
        }

        // touch: a node walks there, the panel plays
        for (let i = 0; i < this.nodes.length; i++) {
            const n = this.nodes[i];
            if (touch.tappedIn(n.x - 7, n.y - 7, 14, 14)) {
                if (i === this.at) {
                    return this.tryPlay();
                }
                this.walkTo(i);
                return null;
            }
        }
        if (ui.confirmPressed || touch.tappedIn(0, PANEL_Y, 192, 108 - PANEL_Y)) {
            return this.tryPlay();
        }
        return null;
    }

    tryPlay() {
        const number = this.nodes[this.at].number;
        if (!this.hasLevel(number)) {
            this.message = { text: 'TENHLE KRAJ SE TEPRVE CHYSTÁ', t: 120 };
            return null;
        }
        return { play: number };
    }

    // ------------------------------------------------------------------ drawing

    render(gfx, touchActive) {
        const t = this.tick;
        // sea
        gfx.rect(0, 0, 192, 108, C.WATER_DEEP);
        for (let y = 3; y < 108; y += 6) {
            const x = (y * 37 + Math.floor(t / 8)) % 200;
            gfx.rect(x - 8, y, 5, 1, C.WATER0 + ((y >> 1) % 4));
        }
        // land: grass in the south, snow in the north, sand along the coast
        for (let y = 6; y < 100; y++) {
            const [l, r] = this.coast[y];
            gfx.rect(l, y, r - l, 1, y < 30 ? C.GHOST : C.GRASS);
            gfx.rect(l, y, 2, 1, y < 30 ? C.WHITE : C.DIRT_LT);
            gfx.rect(r - 2, y, 2, 1, y < 30 ? C.WHITE : C.DIRT_LT);
            gfx.pixel(l - 1, y, C.WATER_FOAM);
            gfx.pixel(r, y, C.WATER_FOAM);
        }
        gfx.ditherRow('dither50', this.coast[29][0] + 2, 29, this.coast[29][1] - this.coast[29][0] - 4, C.GRASS);
        gfx.ditherRow('dither25', this.coast[28][0] + 2, 28, this.coast[28][1] - this.coast[28][0] - 4, C.GRASS);
        gfx.rect(this.coast[6][0], 6, this.coast[6][1] - this.coast[6][0], 1, C.WATER_FOAM);
        for (const sp of this.specks) {
            gfx.pixel(sp.x, sp.y, sp.color);
        }

        for (const n of this.nodes) {
            this.drawRegion(gfx, n);
        }
        this.drawPath(gfx);
        this.nodes.forEach((n, i) => this.drawNode(gfx, n, i));

        // Josepho
        const bob = this.moving ? Math.floor(t / 6) % 2 : 0;
        const face = this.moving && this.nodes[this.target].x < this.x ? '<' : '';
        const frame = this.moving ? (Math.floor(t / 6) % 2 ? 'j.run0' : 'j.run2') : t % 80 < 40 ? 'j.idle0' : 'j.idle1';
        gfx.draw(frame + face, Math.round(this.x) - 5, Math.round(this.y) - 13 - bob);

        // title
        gfx.text(this.world.name, 4, 3, C.WHITE);

        this.drawPanel(gfx, touchActive);
    }

    drawRegion(gfx, n) {
        const { x, y } = n;
        switch (n.region) {
            case 'meadow':
                for (const [dx, dy] of [
                    [-9, -4],
                    [7, -6],
                    [-4, 5],
                ]) {
                    gfx.pixel(x + dx, y + dy, C.PETAL_A);
                    gfx.pixel(x + dx + 1, y + dy, C.PETAL_B);
                }
                break;
            case 'coast':
                gfx.rect(x - 10, y + 4, 20, 2, C.DIRT_LT);
                break;
            case 'forest':
                for (let i = 0; i < 7; i++) {
                    const tx = x - 14 + i * 5 + (i % 2) * 2;
                    const ty = y - 8 + (i % 3) * 3;
                    gfx.line(tx, ty, tx - 2, ty + 4, C.LEAF);
                    gfx.line(tx, ty, tx + 2, ty + 4, C.LEAF);
                    gfx.rect(tx - 1, ty + 2, 3, 3, C.LEAF_DK);
                }
                break;
            case 'lake':
                for (let dy = -5; dy <= 5; dy++) {
                    const w = Math.round(Math.sqrt(25 - dy * dy) * 2.2);
                    gfx.rect(x - w, y + dy, w * 2, 1, dy < -3 ? C.WATER0 + 1 : C.WATER0);
                }
                break;
            case 'cave':
            case 'tundra':
                for (const [dx, h] of [
                    [-12, 9],
                    [-4, 13],
                    [6, 10],
                ]) {
                    for (let i = 0; i < h; i++) {
                        gfx.rect(x + dx - i / 2, y - 2 - h + i, i + 1, 1, i < 3 ? C.WHITE : C.STONE);
                    }
                }
                if (n.region === 'cave') {
                    gfx.rect(x - 2, y - 4, 4, 3, C.INK);
                }
                break;
            case 'city':
                for (let i = 0; i < 5; i++) {
                    const h = 4 + ((i * 7) % 5);
                    gfx.rect(x - 12 + i * 5, y - 2 - h, 4, h, C.STONE);
                    gfx.pixel(x - 11 + i * 5, y - h, C.LANTERN);
                }
                break;
            case 'tower':
                gfx.rect(x - 3, y - 20, 6, 16, C.INK);
                gfx.rect(x - 2, y - 20, 2, 16, C.WHITE);
                break;
            case 'road':
                gfx.ditherRow('dither50', x - 14, y + 4, 28, C.GREY);
                break;
            case 'cube':
                gfx.rect(x - 6, y - 16, 6, 10, C.INK);
                gfx.rect(x, y - 16, 6, 10, C.WHITE);
                gfx.frame(x - 6, y - 16, 12, 10, C.GREY);
                break;
        }
    }

    /** A trail of footprints; the part already open glows. */
    drawPath(gfx) {
        for (let i = 0; i < this.nodes.length - 1; i++) {
            const a = this.nodes[i];
            const b = this.nodes[i + 1];
            const open = i + 1 < this.save.unlocked;
            const steps = Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 4);
            for (let s = 1; s < steps; s++) {
                const px = Math.round(a.x + ((b.x - a.x) * s) / steps);
                const py = Math.round(a.y + ((b.y - a.y) * s) / steps);
                if (open) {
                    gfx.rect(px, py + 1, 2, 1, C.INK);
                    gfx.rect(px, py, 2, 1, C.MOTE);
                } else {
                    gfx.pixel(px, py, C.GREY_DK);
                }
            }
        }
    }

    drawNode(gfx, n, i) {
        const done = !!this.save.done[n.number];
        const unlocked = i < this.save.unlocked;
        // a dark round base, and a pulsing ring under the node Josepho stands on
        gfx.rect(n.x - 4, n.y + 2, 9, 2, C.INK);
        gfx.rect(n.x - 3, n.y + 1, 7, 1, C.INK);
        if (i === this.at && !this.moving && Math.floor(this.tick / 15) % 2 === 0) {
            gfx.rect(n.x - 5, n.y + 3, 11, 1, C.MOTE);
        }
        if (done) {
            this.drawFlag(gfx, n, i);
            return;
        }
        if (!unlocked) {
            gfx.draw('hudPrismOff', n.x - 2, n.y - 2);
            return;
        }
        const glow = Math.floor(this.tick / 20) % 2;
        gfx.draw(glow ? 'hudPrismOn' : 'hudPrismOff', n.x - 2, n.y - 2);
    }

    /** A little flag on a pole, one row per stripe (6 rows tall), colored by the level's flag slots. */
    drawFlag(gfx, n, i) {
        const colors = n.flag.slice(0, FLAG_COLORS);
        const rows = 6;
        const x = n.x;
        const top = n.y - 9;
        gfx.rect(x - 1, top, 1, 10, C.INK);
        for (let r = 0; r < rows; r++) {
            const k = Math.min(colors.length - 1, Math.floor((r * colors.length) / rows));
            const wave = Math.floor((this.tick / 10 + r) % 4) === 0 ? 1 : 0;
            gfx.rect(x, top + r, 8 - wave, 1, FLAG0 + i * FLAG_COLORS + k);
        }
    }

    drawPanel(gfx, touchActive) {
        const n = this.nodes[this.at];
        gfx.rect(0, PANEL_Y, 192, 108 - PANEL_Y, C.INK);
        gfx.rect(0, PANEL_Y, 192, 1, C.UI_DIM);
        gfx.text(`${n.number}  ${n.name}`, 6, PANEL_Y + 5, C.WHITE);
        const done = this.save.done[n.number];
        let info;
        if (!this.hasLevel(n.number)) {
            info = 'PŘIPRAVUJEME';
        } else if (this.save.inProgress?.level === n.number) {
            info = 'ROZEHRÁNO - OD LUCERNY';
        } else if (done) {
            const secs = Math.floor(done.frames / 60);
            info = `JISKRY ${done.motes}/${done.total}   ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
        } else {
            info = 'NOVÝ KRAJ';
        }
        gfx.text(info, 6, PANEL_Y + 14, C.UI_DIM);
        if (this.hasLevel(n.number) && !this.moving && Math.floor(this.tick / 30) % 2 === 0) {
            const hint = touchActive ? 'KLEPNI - HRÁT' : 'MEZERNÍK - HRÁT';
            gfx.text(hint, 186 - gfx.textWidth(hint), PANEL_Y + 14, C.MOTE);
        }
        if (this.message) {
            const w = gfx.textWidth(this.message.text);
            gfx.rect(96 - w / 2 - 4, 40, w + 8, 12, C.INK);
            gfx.text(this.message.text, 96 - w / 2, 44, C.WHITE);
        }
    }
}

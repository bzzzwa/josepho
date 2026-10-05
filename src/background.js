// background.js - the sky behind Josepho: a dithered dawn gradient, a rising sun, drifting clouds and two
// ranges of hills that slide past at different speeds (parallax) so the flat screen feels deep.
// Every color here is a palette slot whose meaning changes with the dawn, so nothing is recolored by hand.

import { C, STRIPE0, STRIPE_SHADES } from './colors.js';

const SCREEN_W = 192;
const SCREEN_H = 108;
const BAND_TOPS = [0, 14, 27, 40, 52, 63]; // six sky bands, horizon below the last one
const FAR_SPEED = 0.18;
const MID_SPEED = 0.42;

function valueNoise(seed) {
    const cache = new Map();
    const rnd = (i) => {
        if (!cache.has(i)) {
            let h = Math.imul(i ^ seed, 2654435761);
            h ^= h >>> 15;
            cache.set(i, ((h >>> 0) % 10000) / 10000);
        }
        return cache.get(i);
    };
    return (x, scale) => {
        const f = x / scale;
        const i = Math.floor(f);
        const t = f - i;
        const s = t * t * (3 - 2 * t);
        return rnd(i) * (1 - s) + rnd(i + 1) * s;
    };
}

export class Background {
    /** style: 'hills' (default) or 'sea' - low islands on the horizon and open water instead of hills. */
    constructor(worldWidth, style = 'hills') {
        this.style = style;
        const farN = valueNoise(11);
        const midN = valueNoise(29);
        const treeN = valueNoise(47);
        const farLen = Math.ceil(worldWidth * FAR_SPEED) + SCREEN_W + 2;
        const midLen = Math.ceil(worldWidth * MID_SPEED) + SCREEN_W + 2;

        // Far mountains: sharp-ish peaks.
        this.far = new Int16Array(farLen);
        for (let x = 0; x < farLen; x++) {
            const ridge = farN(x, 38) * 22 + farN(x + 500, 13) * 7;
            // by the sea the far land is a row of low islands
            this.far[x] = style === 'sea' ? Math.round(84 - Math.max(0, ridge - 12) * 0.8) : Math.round(76 - ridge);
        }

        // Mid hills: soft rounded shapes with a fringe of little conifers.
        this.mid = new Int16Array(midLen);
        for (let x = 0; x < midLen; x++) {
            let top = 90 - midN(x, 46) * 16 - midN(x + 900, 17) * 4;
            // conifers every few pixels where the noise says "forest"
            if (treeN(x, 60) > 0.45) {
                const cell = Math.floor(x / 5);
                const within = x - cell * 5;
                const tall = 3 + ((cell * 7919) % 5);
                const peak = Math.abs(within - 2);
                top -= Math.max(0, tall - peak * 2);
            }
            this.mid[x] = Math.round(top);
        }

        this.clouds = [
            { x: 10, y: 10, big: true, speed: 0.05 },
            { x: 120, y: 22, big: false, speed: 0.08 },
            { x: 210, y: 6, big: true, speed: 0.04 },
            { x: 300, y: 30, big: false, speed: 0.07 },
        ];
    }

    render(gfx, camX, dawn, tick) {
        // Sky bands with dithered seams.
        for (let i = 0; i < 6; i++) {
            const top = BAND_TOPS[i];
            const bottom = i < 5 ? BAND_TOPS[i + 1] : SCREEN_H;
            gfx.rect(0, top, SCREEN_W, bottom - top, C.SKY0 + i);
        }
        for (let i = 1; i < 6; i++) {
            const y = BAND_TOPS[i];
            gfx.ditherRow('dither25', 0, y - 2, SCREEN_W, C.SKY0 + i);
            gfx.ditherRow('dither50', 0, y - 1, SCREEN_W, C.SKY0 + i);
            gfx.ditherRow('dither25', 0, y, SCREEN_W, C.SKY0 + i - 1);
        }

        // The sun climbs as the dawn goes on.
        const e = dawn * dawn * (3 - 2 * dawn);
        const sx = 150 - Math.floor(camX * 0.01);
        const sy = Math.round(84 - e * 64);
        this.disc(gfx, sx, sy, 13, C.SUN_GLOW, 'dither25');
        this.disc(gfx, sx, sy, 10, C.SUN_GLOW, 'dither50');
        this.disc(gfx, sx, sy, 7, C.SUN, null);

        // Clouds.
        for (const c of this.clouds) {
            const name = c.big ? 'cloudBig' : 'cloudSmall';
            const span = SCREEN_W + 80;
            let x = (c.x - camX * 0.1 - tick * c.speed) % span;
            if (x < 0) {
                x += span;
            }
            gfx.draw(name, x - 40, c.y);
        }

        // Far mountains.
        const fo = Math.floor(camX * FAR_SPEED);
        for (let sx2 = 0; sx2 < SCREEN_W; sx2++) {
            // clamped: a screen shake can push the camera a pixel past either end
            const i = Math.max(0, Math.min(this.far.length - 1, sx2 + fo));
            const top = this.far[i];
            gfx.line(sx2, top, sx2, SCREEN_H - 1, C.FAR);
            if (this.far[i + 1] > top || this.far[i - 1] > top + 1) {
                gfx.pixel(sx2, top, C.FAR_HI);
            }
        }
        // a thin haze where the mountains meet the hills
        gfx.ditherRow('dither50', 0, 80, SCREEN_W, C.SKY0 + 5);
        gfx.ditherRow('dither25', 0, 81, SCREEN_W, C.SKY0 + 5);

        if (this.style === 'sea') {
            this.renderSea(gfx, camX, tick);
            return;
        }
        if (this.style === 'archive') {
            this.renderArchive(gfx, camX);
            return;
        }
        if (this.style === 'office') {
            this.renderOffice(gfx, camX);
            return;
        }
        if (this.style === 'tundra') {
            this.renderTundra(gfx, camX, tick);
            return;
        }

        // Mid hills.
        const mo = Math.floor(camX * MID_SPEED);
        for (let sx2 = 0; sx2 < SCREEN_W; sx2++) {
            const i = Math.max(0, Math.min(this.mid.length - 1, sx2 + mo));
            const top = this.mid[i];
            gfx.line(sx2, top, sx2, SCREEN_H - 1, C.MID);
            if (this.mid[i + 1] > top) {
                gfx.pixel(sx2, top, C.MID_HI);
            }
        }
    }

    /**
     * The far north at night: a dark sky with curtains of aurora (in the level's stripe colors - grey until they
     * come back), snowy hills, and a herd of reindeer that starts to run once a fence is gone (`herdRun`).
     */
    renderTundra(gfx, camX, tick) {
        gfx.rect(0, 0, SCREEN_W, SCREEN_H, C.SKY0);
        gfx.rect(0, 40, SCREEN_W, 30, C.SKY0 + 1);
        gfx.ditherRow('dither50', 0, 40, SCREEN_W, C.SKY0 + 1);
        // stars
        for (let i = 0; i < 24; i++) {
            const sx = (i * 47 + Math.floor(camX * 0.05)) % SCREEN_W;
            gfx.pixel(SCREEN_W - 1 - sx, (i * 13) % 40, C.GREY_LT);
        }
        // aurora curtains: wavy vertical streaks drifting slowly
        const off = camX * 0.1;
        for (let x = 0; x < SCREEN_W; x += 2) {
            const wx = x + off;
            const k = Math.floor((Math.sin(wx * 0.013) + 1) * 1.99) % Math.max(1, this.stripes ?? 1);
            const top = 8 + Math.sin(wx * 0.05 + tick * 0.01) * 6 + Math.sin(wx * 0.017) * 8;
            const len = 18 + Math.sin(wx * 0.031 + tick * 0.013) * 8;
            if (Math.sin(wx * 0.021 + tick * 0.004) > -0.2) {
                gfx.rect(x, Math.round(top), 1, Math.round(len), STRIPE0 + k * STRIPE_SHADES + 1);
                gfx.rect(x, Math.round(top + len), 1, 4, STRIPE0 + k * STRIPE_SHADES);
            }
        }
        // snowy hills
        const mo = Math.floor(camX * 0.3);
        for (let sx = 0; sx < SCREEN_W; sx++) {
            const i = Math.max(0, Math.min(this.mid.length - 1, sx + mo));
            const top = this.mid[i] + 4;
            gfx.rect(sx, top, 1, SCREEN_H - top, C.GREY_LT);
            gfx.pixel(sx, top, C.WHITE);
        }
        // the herd
        const run = (this.herdRun ?? 0) > 0 ? tick * 0.6 : 0;
        for (let r = 0; r < 6; r++) {
            const hx = Math.round(((r * 29 + 40 - camX * 0.3 + run) % 320) + 320) % 320 - 60;
            const hy = 78 + (r % 3) * 3;
            gfx.rect(hx, hy, 7, 3, C.INK);
            gfx.rect(hx + 6, hy - 2, 2, 2, C.INK);
            gfx.pixel(hx + 7, hy - 4, C.INK);
            gfx.pixel(hx + 5, hy - 4, C.INK);
            const leg = run ? Math.floor(tick / 6 + r) % 2 : 0;
            gfx.rect(hx + leg, hy + 3, 1, 2, C.INK);
            gfx.rect(hx + 5 - leg, hy + 3, 1, 2, C.INK);
        }
    }

    /**
     * The Sorter's office: a grey wall with tall windows (a pale sky outside) and rows of filing cabinets, all
     * sliding slowly with the parallax.
     */
    renderOffice(gfx, camX) {
        gfx.rect(0, 0, SCREEN_W, SCREEN_H, C.STONE_DK);
        const wall = Math.floor(camX * 0.25);
        for (let wx = -(wall % 64) - 64; wx < SCREEN_W + 64; wx += 64) {
            gfx.rect(wx + 20, 18, 24, 30, C.GREY);
            gfx.rect(wx + 22, 20, 20, 26, C.SKY0 + 4);
            gfx.rect(wx + 31, 20, 2, 26, C.GREY);
            gfx.rect(wx + 22, 32, 20, 1, C.GREY);
        }
        const near = Math.floor(camX * 0.45);
        for (let cx = -(near % 14) - 14; cx < SCREEN_W + 14; cx += 14) {
            gfx.rect(cx, 60, 12, 48, C.GREY_DK);
            for (let d = 0; d < 4; d++) {
                gfx.rect(cx + 1, 62 + d * 11, 10, 9, C.GREY);
                gfx.rect(cx + 4, 66 + d * 11, 4, 1, C.GREY_LT);
            }
        }
    }

    /**
     * The Sorter's archive: a dark back wall with shelves of grey boxes, sorted by size, sliding slowly with
     * the parallax. (Instead of the sky, far land and hills.)
     */
    renderArchive(gfx, camX) {
        gfx.rect(0, 0, SCREEN_W, SCREEN_H, C.SHADE);
        const off = Math.floor(camX * 0.4);
        for (let shelf = 0; shelf < 6; shelf++) {
            const y = 22 + shelf * 26;
            gfx.rect(0, y, SCREEN_W, 2, C.DIRT_DK);
            for (let sx = -(off % 12) - 12; sx < SCREEN_W + 12; sx += 12) {
                const k = Math.abs(Math.floor((sx + off) / 12) * 7 + shelf * 13) % 5;
                const h = 6 + k * 2;
                gfx.rect(sx + 1, y - h, 9, h, k % 2 ? C.GREY_DK : C.GREY);
                gfx.rect(sx + 1, y - h, 9, 1, C.GREY_LT);
                gfx.rect(sx + 4, y - h + 2, 3, 1, C.INK);
            }
        }
    }

    /**
     * Open water from the horizon down, with glinting wave lines that slide with the parallax. It is drawn in
     * the hazy colors of the far mountains, not the water colors, so the distant sea is never mistaken for
     * water Josepho can swim in.
     */
    renderSea(gfx, camX, tick) {
        const top = 84;
        gfx.rect(0, top, SCREEN_W, SCREEN_H - top, C.FAR);
        gfx.ditherRow('dither50', 0, top, SCREEN_W, C.SKY0 + 5);
        for (let y = top + 3; y < SCREEN_H; y += 3) {
            const speed = MID_SPEED * (1 + (y - top) / 20);
            const off = Math.floor(camX * speed + tick * 0.05) % 24;
            for (let x = -off; x < SCREEN_W; x += 24) {
                gfx.rect(x + ((y * 7) % 11), y, 4 + ((y >> 1) % 3), 1, C.FAR_HI);
            }
        }
    }

    disc(gfx, cx, cy, r, color, pattern) {
        for (let dy = -r; dy <= r; dy++) {
            const y = cy + dy;
            if (y < 0 || y >= SCREEN_H) {
                continue;
            }
            const w = Math.floor(Math.sqrt(r * r - dy * dy));
            if (pattern) {
                gfx.ditherRow(pattern, cx - w, y, w * 2 + 1, color);
            } else {
                gfx.rect(cx - w, y, w * 2 + 1, 1, color);
            }
        }
    }
}

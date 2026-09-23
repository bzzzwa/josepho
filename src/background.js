// background.js - the sky behind Josepho: a dithered dawn gradient, a rising sun, drifting clouds and two
// ranges of hills that slide past at different speeds (parallax) so the flat screen feels deep.
// Every color here is a palette slot whose meaning changes with the dawn, so nothing is recolored by hand.

import { C } from './colors.js';

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
    constructor(worldWidth) {
        const farN = valueNoise(11);
        const midN = valueNoise(29);
        const treeN = valueNoise(47);
        const farLen = Math.ceil(worldWidth * FAR_SPEED) + SCREEN_W + 2;
        const midLen = Math.ceil(worldWidth * MID_SPEED) + SCREEN_W + 2;

        // Far mountains: sharp-ish peaks.
        this.far = new Int16Array(farLen);
        for (let x = 0; x < farLen; x++) {
            const ridge = farN(x, 38) * 22 + farN(x + 500, 13) * 7;
            this.far[x] = Math.round(76 - ridge);
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
            const i = sx2 + fo;
            const top = this.far[i];
            gfx.line(sx2, top, sx2, SCREEN_H - 1, C.FAR);
            if (this.far[i + 1] > top || this.far[i - 1] > top + 1) {
                gfx.pixel(sx2, top, C.FAR_HI);
            }
        }
        // a thin haze where the mountains meet the hills
        gfx.ditherRow('dither50', 0, 80, SCREEN_W, C.SKY0 + 5);
        gfx.ditherRow('dither25', 0, 81, SCREEN_W, C.SKY0 + 5);

        // Mid hills.
        const mo = Math.floor(camX * MID_SPEED);
        for (let sx2 = 0; sx2 < SCREEN_W; sx2++) {
            const i = sx2 + mo;
            const top = this.mid[i];
            gfx.line(sx2, top, sx2, SCREEN_H - 1, C.MID);
            if (this.mid[i + 1] > top) {
                gfx.pixel(sx2, top, C.MID_HI);
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

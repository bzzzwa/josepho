// harness.mjs - runs the real game in Node (with the engine test double) and drives it frame by frame.
// Run scripts that use this with:  node --import ./tools/lib/register-mock.mjs <script>

import { BT, beginFrame, currentPalette, framebuffer, GameClass, input, stats } from 'blit386';
import { writePng } from './png.mjs';

const W = 192;
const H = 108;

/** Same run, same result: particles and screen shake use Math.random, so tests seed it. */
export function seedRandom(seed = 12345) {
    let s = seed;
    Math.random = () => {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return s / 0x7fffffff;
    };
}

/** An in-memory stand-in for the browser's localStorage. */
export function fakeStorage() {
    const store = {};
    globalThis.localStorage = {
        getItem: (k) => store[k] ?? null,
        setItem: (k, v) => {
            store[k] = String(v);
        },
        removeItem: (k) => {
            delete store[k];
        },
    };
    return store;
}

export async function createGame() {
    await import('../../src/game.js');
    const game = new GameClass();
    game.configure();
    await game.init();
    return game;
}

/** Advances one frame. keys: key codes held this frame. touches: [[slot, x, y], ...]. */
export function step(game, keys = [], touches = []) {
    input.keys = new Set(keys);
    input.touches = new Map(touches.map(([slot, x, y]) => [slot, { x, y }]));
    game.update();
    beginFrame();
    game.render();
    input.prevTouches = new Set(input.touches.keys());
}

export function steps(game, n, keys = [], touches = []) {
    for (let i = 0; i < n; i++) {
        step(game, keys, touches);
    }
}

/** The current screen as RGB bytes. */
export function screenRgb() {
    const pal = currentPalette();
    const rgb = new Uint8Array(W * H * 3);
    for (let i = 0; i < framebuffer.length; i++) {
        const c = pal.colors[framebuffer[i]];
        rgb[i * 3] = c.r;
        rgb[i * 3 + 1] = c.g;
        rgb[i * 3 + 2] = c.b;
    }
    return rgb;
}

export function screenshot(path, scale = 3) {
    writePng(path, W, H, screenRgb(), scale);
}

export { BT, stats, W as SCREEN_W, H as SCREEN_H };

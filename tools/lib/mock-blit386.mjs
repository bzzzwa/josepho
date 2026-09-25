// mock-blit386.mjs - a stand-in for the BLIT386 engine, so the game can run in Node for the level tests.
//
// It implements only what Josepho uses. Drawing goes into an indexed framebuffer (one palette slot per pixel)
// that the tests turn into PNG screenshots. Input is scripted by the tests through `input`.
// It is strict on purpose: wrong arguments (NaN, colors outside the palette, source rectangles outside the
// sprite sheet) throw, so mistakes show up here instead of as odd pixels in the browser.

const W = 192;
const H = 108;
const PALETTE_MAX = 128;

function check(...values) {
    for (const v of values) {
        if (!Number.isFinite(v)) {
            throw new Error(`blit386 mock: not a finite number: ${v}`);
        }
    }
}

export class Vector2i {
    constructor(x = 0, y = 0) {
        check(x, y);
        this.x = x | 0;
        this.y = y | 0;
    }

    set(x, y) {
        check(x, y);
        this.x = x | 0;
        this.y = y | 0;
        return this;
    }

    clone() {
        return new Vector2i(this.x, this.y);
    }
}

export class Rect2i {
    constructor(x = 0, y = 0, width = 0, height = 0) {
        this.set(x, y, width, height);
    }

    set(x, y, width, height) {
        check(x, y, width, height);
        this.x = x | 0;
        this.y = y | 0;
        this.width = width | 0;
        this.height = height | 0;
        return this;
    }
}

export class Color32 {
    constructor(r = 0, g = 0, b = 0, a = 255) {
        this.setRGBA(r, g, b, a);
    }

    setRGBA(r, g, b, a) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
        return this;
    }

    clone() {
        return new Color32(this.r, this.g, this.b, this.a);
    }
}

class Palette {
    constructor(size) {
        this.size = size;
        this.colors = Array.from({ length: size }, () => new Color32(0, 0, 0, 0));
    }

    set(slot, color) {
        if (slot < 0 || slot >= this.size) {
            throw new Error(`blit386 mock: palette slot ${slot} out of range`);
        }
        if (slot !== 0) {
            this.colors[slot] = color.clone();
        }
    }

    get(slot) {
        return this.colors[slot].clone();
    }
}

export class SpriteSheet {
    static fromIndexedPixels(width, height, pixels) {
        if (pixels.length !== width * height) {
            throw new Error('blit386 mock: pixel count does not match the sheet size');
        }
        const sheet = new SpriteSheet();
        sheet.width = width;
        sheet.height = height;
        sheet.pixels = pixels;
        return sheet;
    }
}

export class AudioClip {
    static async synth(params) {
        for (const key of ['waveform', 'frequency', 'duration', 'seed']) {
            if (params[key] === undefined) {
                throw new Error(`blit386 mock: synth needs '${key}'`);
            }
        }
        return { params };
    }
}

/** The framebuffer: one palette slot per pixel. */
export const framebuffer = new Uint8Array(W * H);

/** Scripted input: key codes held this frame, touches { slot -> {x, y} }. */
export const input = { keys: new Set(), touches: new Map(), prevTouches: new Set() };

export const stats = { draws: 0, sounds: 0, firstDrawCamera: null };

// Like the real engine (1.7): every frame starts with the camera last given to cameraSet(), and
// cameraReset() does NOT clear that remembered value. A screen that draws without resetting the camera
// first therefore inherits the camera of an earlier screen.
let camera = { x: 0, y: 0 };
let lastSetCamera = { x: 0, y: 0 };
let palette = null;

/** Called by the harness before each render, as the engine does at the start of a frame. */
export function beginFrame() {
    camera = { ...lastSetCamera };
    stats.firstDrawCamera = null;
}

function noteDraw() {
    stats.draws++;
    if (!stats.firstDrawCamera) {
        stats.firstDrawCamera = { ...camera };
    }
}

function plot(x, y, color) {
    const px = x - camera.x;
    const py = y - camera.y;
    if (color === 0 || px < 0 || py < 0 || px >= W || py >= H) {
        return;
    }
    if (color < 0 || color >= PALETTE_MAX || !Number.isInteger(color)) {
        throw new Error(`blit386 mock: bad color ${color}`);
    }
    framebuffer[py * W + px] = color;
}

const POINTER_A = 4096;

export const BT = {
    BTN_UP: 1,
    BTN_DOWN: 2,
    BTN_LEFT: 4,
    BTN_RIGHT: 8,
    BTN_A: 16,
    BTN_B: 32,
    BTN_X: 64,
    BTN_Y: 128,
    BTN_START: 1024,
    BTN_POINTER_A: POINTER_A,
    displaySize: new Vector2i(W, H),
    isSplashVisible: false,
    isAudioUnlocked: true,
    isReducedMotionPreferred: false,

    get palette() {
        if (!palette) {
            throw new Error('blit386 mock: no palette set');
        }
        return palette;
    },
    paletteCreate: (size) => new Palette(size),
    paletteSet: (p) => {
        palette = p;
    },

    isKeyDown: (code) => input.keys.has(code),
    isDown: () => false,
    isPressed: (button, slot = 0) => button === POINTER_A && input.touches.has(slot) && !input.prevTouches.has(slot),
    isPointerActive: (slot = 0) => input.touches.has(slot),
    pointerPosTo: (out, slot = 0) => {
        const t = input.touches.get(slot);
        return out.set(t ? t.x : 0, t ? t.y : 0);
    },

    soundPlay: (clip) => {
        if (!clip) {
            throw new Error('blit386 mock: soundPlay without a clip');
        }
        stats.sounds++;
        return {};
    },

    clear: (color) => {
        framebuffer.fill(color);
    },
    cameraSet: (v) => {
        camera = { x: v.x, y: v.y };
        lastSetCamera = { ...camera };
    },
    cameraReset: () => {
        camera = { x: 0, y: 0 };
    },
    drawRectFill: (r, color) => {
        noteDraw();
        for (let y = r.y; y < r.y + r.height; y++) {
            for (let x = r.x; x < r.x + r.width; x++) {
                plot(x, y, color);
            }
        }
    },
    drawRect: (r, color) => {
        noteDraw();
        for (let x = r.x; x < r.x + r.width; x++) {
            plot(x, r.y, color);
            plot(x, r.y + r.height - 1, color);
        }
        for (let y = r.y; y < r.y + r.height; y++) {
            plot(r.x, y, color);
            plot(r.x + r.width - 1, y, color);
        }
    },
    drawLine: (a, b, color) => {
        noteDraw();
        let x0 = a.x;
        let y0 = a.y;
        const dx = Math.abs(b.x - x0);
        const dy = -Math.abs(b.y - y0);
        const sx = x0 < b.x ? 1 : -1;
        const sy = y0 < b.y ? 1 : -1;
        let err = dx + dy;
        for (;;) {
            plot(x0, y0, color);
            if (x0 === b.x && y0 === b.y) {
                break;
            }
            const e2 = 2 * err;
            if (e2 >= dy) {
                err += dy;
                x0 += sx;
            }
            if (e2 <= dx) {
                err += dx;
                y0 += sy;
            }
        }
    },
    drawPixel: (x, y, color) => {
        noteDraw();
        if (!Number.isInteger(x) || !Number.isInteger(y)) {
            throw new Error(`blit386 mock: drawPixel needs whole numbers, got ${x}, ${y}`);
        }
        plot(x, y, color);
    },
    drawSprite: (sheet, src, pos, offset = 0) => {
        noteDraw();
        if (offset < 0 || !Number.isInteger(offset)) {
            throw new Error(`blit386 mock: bad palette offset ${offset}`);
        }
        if (src.x < 0 || src.y < 0 || src.x + src.width > sheet.width || src.y + src.height > sheet.height) {
            throw new Error(`blit386 mock: source rectangle outside the sheet ${JSON.stringify(src)}`);
        }
        for (let y = 0; y < src.height; y++) {
            for (let x = 0; x < src.width; x++) {
                const v = sheet.pixels[(src.y + y) * sheet.width + src.x + x];
                if (v) {
                    plot(pos.x + x, pos.y + y, v + offset);
                }
            }
        }
    },
};

/** The game class handed to bootstrap(). */
export let GameClass = null;

export function bootstrap(Game) {
    GameClass = Game;
    return Promise.resolve(true);
}

export function currentPalette() {
    return palette;
}

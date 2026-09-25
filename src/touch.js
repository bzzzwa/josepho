// touch.js - on-screen controls for phones and tablets.
//
// BLIT386 reports up to three touch contacts (pointer slots 1-3) in screen pixels, so the controls are just
// screen regions:
//   lower left   - the movement pad: left of its middle walks left, right of it walks right.
//                  Holding a direction for a moment makes Josepho break into a run.
//   right side   - jump (hold for a higher jump, press again in the air to flutter).
//   top middle   - pause.
// Every region reacts wherever the finger lands inside it, not only on the drawn button, and fingers can
// slide between left and right without lifting.

import { BT, Vector2i } from 'blit386';
import { C } from './colors.js';

const SCREEN_W = 192;
const RUN_AFTER = 18; // frames of holding one direction before running

// Regions (screen pixels).
const PAD = { x: 0, y: 40, w: 60, h: 68, split: 23 };
const JUMP = { x: 118, y: 30, w: 74, h: 78 };
const PAUSE = { x: 80, y: 0, w: 32, h: 15 };

// Where the buttons are drawn.
export const TOUCH_LAYOUT = {
    left: { x: 3, y: 86 },
    right: { x: 25, y: 86 },
    jump: { x: 165, y: 82 },
    pause: { x: 93, y: 3 },
};

function inside(r, x, y) {
    return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

export class TouchControls {
    /** True once the player has used touch (or the device has a touch screen); the buttons are drawn then. */
    active = false;
    left = false;
    right = false;
    jump = false;
    run = false;
    /** A pause tap this frame. */
    pausePressed = false;
    /** Screen positions of contacts that started this frame (touch or mouse click). */
    taps = [];

    pos = new Vector2i(0, 0);
    holdDir = 0;
    holdFrames = 0;

    constructor() {
        if (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches) {
            this.active = true;
        }
    }

    update() {
        this.left = false;
        this.right = false;
        this.jump = false;
        this.pausePressed = false;
        this.taps.length = 0;

        for (let slot = 1; slot <= 3; slot++) {
            const pressed = BT.isPressed(BT.BTN_POINTER_A, slot);
            if (!BT.isPointerActive(slot) && !pressed) {
                continue;
            }
            this.active = true;
            BT.pointerPosTo(this.pos, slot);
            const { x, y } = this.pos;
            if (pressed) {
                this.taps.push({ x, y });
                if (inside(PAUSE, x, y)) {
                    this.pausePressed = true;
                }
            }
            if (inside(PAD, x, y)) {
                if (x < PAD.split) {
                    this.left = true;
                } else {
                    this.right = true;
                }
            } else if (inside(JUMP, x, y)) {
                this.jump = true;
            }
        }

        // a mouse click also counts as a tap (for menus and the fullscreen button)
        if (BT.isPressed(BT.BTN_POINTER_A, 0)) {
            BT.pointerPosTo(this.pos, 0);
            this.taps.push({ x: this.pos.x, y: this.pos.y });
        }

        // run after holding one direction for a moment
        const dir = this.left === this.right ? 0 : this.left ? -1 : 1;
        if (dir !== 0 && dir === this.holdDir) {
            this.holdFrames++;
        } else {
            this.holdDir = dir;
            this.holdFrames = 0;
        }
        this.run = dir !== 0 && this.holdFrames >= RUN_AFTER;
    }

    /** Was there a tap inside the rectangle this frame? */
    tappedIn(x, y, w, h) {
        return this.taps.some((t) => t.x >= x && t.x < x + w && t.y >= y && t.y < y + h);
    }

    render(gfx) {
        const L = TOUCH_LAYOUT;
        this.button(gfx, 'tbBox', 'tbLeft', L.left.x, L.left.y, 18, this.left);
        this.button(gfx, 'tbBox', 'tbRight', L.right.x, L.right.y, 18, this.right);
        this.button(gfx, 'tbCircle', 'tbUp', L.jump.x, L.jump.y, 23, this.jump);
        gfx.tint('tbPause', L.pause.x + 1, L.pause.y + 1, C.INK);
        gfx.tint('tbPause', L.pause.x, L.pause.y, C.UI_DIM);
    }

    button(gfx, frame, icon, x, y, size, down) {
        const color = down ? C.WHITE : C.UI_DIM;
        const iw = gfx.width(icon);
        const ih = gfx.height(icon);
        const ix = x + Math.floor((size - iw) / 2);
        const iy = y + Math.floor((size - ih) / 2);
        // dark shadow first so the buttons read on bright and dark backgrounds alike
        gfx.tint(frame, x + 1, y + 1, C.INK);
        gfx.tint(icon, ix + 1, iy + 1, C.INK);
        gfx.tint(frame, x, y, color);
        gfx.tint(icon, ix, iy, color);
    }
}

export { SCREEN_W };

// gfx.js - the one place that turns art names into BT.drawSprite calls, plus the pixel font.

import { BT, Rect2i, SpriteSheet, Vector2i } from 'blit386';
import { buildAtlas } from './art-data.js';
import { C } from './colors.js';
import { ADVANCE, FONT_MASKS, glyphName, LETTER_TOP, LINE_HEIGHT, SPACE_ADVANCE, textWidth, wrapText } from './font.js';

class Gfx {
    sheet = null;
    /** @type {Record<string, Rect2i>} */
    rects = {};
    pos = new Vector2i(0, 0);
    part = new Rect2i(0, 0, 1, 1);
    box = new Rect2i(0, 0, 1, 1);
    p0 = new Vector2i(0, 0);
    p1 = new Vector2i(0, 0);
    masks = FONT_MASKS;

    init() {
        const atlas = buildAtlas();
        this.sheet = SpriteSheet.fromIndexedPixels(atlas.width, atlas.height, atlas.pixels);
        this.rects = {};
        for (const [name, [x, y, w, h]] of Object.entries(atlas.rects)) {
            this.rects[name] = new Rect2i(x, y, w, h);
        }
    }

    has(name) {
        return name in this.rects;
    }

    width(name) {
        return this.rects[name]?.width ?? 0;
    }

    height(name) {
        return this.rects[name]?.height ?? 0;
    }

    /** Draws a sprite with its top-left corner at (x, y). offset shifts every color by that many slots. */
    draw(name, x, y, offset = 0) {
        const r = this.rects[name];
        if (!r) {
            return;
        }
        this.pos.set(Math.round(x), Math.round(y));
        BT.drawSprite(this.sheet, r, this.pos, offset);
    }

    /** Draws a mask sprite ('#' pixels) in one palette color. */
    tint(name, x, y, color) {
        this.draw(name, x, y, color - 1);
    }

    /** Draws a sub-rectangle of a sprite. */
    drawPart(name, sx, sy, w, h, x, y, offset = 0) {
        const r = this.rects[name];
        if (!r || w <= 0 || h <= 0) {
            return;
        }
        this.part.set(r.x + sx, r.y + sy, w, h);
        this.pos.set(Math.round(x), Math.round(y));
        BT.drawSprite(this.sheet, this.part, this.pos, offset);
    }

    rect(x, y, w, h, color) {
        if (w <= 0 || h <= 0) {
            return;
        }
        this.box.set(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
        BT.drawRectFill(this.box, color);
    }

    frame(x, y, w, h, color) {
        this.box.set(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
        BT.drawRect(this.box, color);
    }

    line(x0, y0, x1, y1, color) {
        this.p0.set(Math.round(x0), Math.round(y0));
        this.p1.set(Math.round(x1), Math.round(y1));
        BT.drawLine(this.p0, this.p1, color);
    }

    pixel(x, y, color) {
        BT.drawPixel(Math.round(x), Math.round(y), color);
    }

    /** A horizontal dithered strip (pattern 'dither50', 'dither25' or 'dither12'), one row tall. */
    ditherRow(pattern, x, y, w, color, row = 0) {
        let dx = Math.round(x);
        const end = dx + Math.round(w);
        const yy = Math.round(y);
        while (dx < end) {
            const span = Math.min(56, end - dx);
            // start inside the pattern so the dots line up with the screen grid
            this.drawPart(pattern, dx & 7, (row + yy) & 1, span, 1, dx, yy, color - 1);
            dx += span;
        }
    }

    // ------------------------------------------------------------------ text

    textWidth(text) {
        return textWidth(text);
    }

    wrap(text, maxWidth) {
        return wrapText(text, maxWidth);
    }

    get lineHeight() {
        return LINE_HEIGHT;
    }

    /** Draws text with the top of the capitals at y. Accents rise above it. */
    text(text, x, y, color = C.WHITE, shadow = C.INK, count = Number.POSITIVE_INFINITY) {
        let cx = Math.round(x);
        const top = Math.round(y) - LETTER_TOP;
        let n = 0;
        for (const ch of text) {
            if (n >= count) {
                break;
            }
            n++;
            const name = glyphName(ch);
            if (!name) {
                cx += SPACE_ADVANCE;
                continue;
            }
            if (shadow) {
                this.draw(name, cx + 1, top + 1, shadow - 1);
            }
            this.draw(name, cx, top, color - 1);
            cx += ADVANCE;
        }
    }

    textCentered(text, cx, y, color, shadow = C.INK) {
        this.text(text, Math.round(cx - textWidth(text) / 2), y, color, shadow);
    }

    /** Big letters: each font pixel becomes a scale x scale block. colorFn(i) picks a color per letter. */
    bigText(text, x, y, scale, colorFn, shadow = C.INK) {
        let cx = x;
        let i = 0;
        for (const ch of text) {
            const name = glyphName(ch);
            if (!name) {
                cx += SPACE_ADVANCE * scale;
                continue;
            }
            const r = this.rects[name];
            const mask = this.masks?.[name];
            if (r && mask) {
                const color = colorFn(i);
                for (let py = 0; py < mask.length; py++) {
                    for (let px = 0; px < mask[py].length; px++) {
                        if (mask[py][px] !== '#') {
                            continue;
                        }
                        const bx = cx + px * scale;
                        const by = y + (py - LETTER_TOP) * scale;
                        if (shadow) {
                            this.rect(bx + 1, by + scale, scale, 1, shadow);
                        }
                        this.rect(bx, by, scale, scale, color);
                    }
                }
            }
            cx += ADVANCE * scale;
            i++;
        }
    }
}

export const gfx = new Gfx();

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

    /**
     * A filled rectangle. Drawn with a solid sprite, not BT.drawRectFill: BLIT386's renderer draws all of a
     * frame's primitives before all of its sprites, so a primitive rectangle ends up under every sprite no matter
     * when it was drawn. As a sprite it stays in drawing order (the dark of level 5 over the tiles, a sign's box
     * over the world).
     */
    rect(x, y, w, h, color) {
        x = Math.round(x);
        y = Math.round(y);
        w = Math.round(w);
        h = Math.round(h);
        if (w <= 0 || h <= 0) {
            return;
        }
        for (let yy = 0; yy < h; yy += 32) {
            for (let xx = 0; xx < w; xx += 32) {
                this.drawPart('solid', 0, 0, Math.min(32, w - xx), Math.min(32, h - yy), x + xx, y + yy, color - 1);
            }
        }
    }

    /** A rectangle outline (sprites too, so it stays in drawing order). */
    frame(x, y, w, h, color) {
        x = Math.round(x);
        y = Math.round(y);
        w = Math.round(w);
        h = Math.round(h);
        this.rect(x, y, w, 1, color);
        this.rect(x, y + h - 1, w, 1, color);
        this.rect(x, y + 1, 1, h - 2, color);
        this.rect(x + w - 1, y + 1, 1, h - 2, color);
    }

    /** A line, pixel by pixel (sprites, in drawing order). */
    line(x0, y0, x1, y1, color) {
        x0 = Math.round(x0);
        y0 = Math.round(y0);
        x1 = Math.round(x1);
        y1 = Math.round(y1);
        if (x0 === x1) {
            this.rect(x0, Math.min(y0, y1), 1, Math.abs(y1 - y0) + 1, color);
            return;
        }
        const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        for (let i = 0; i <= steps; i++) {
            this.pixel(x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps, color);
        }
    }

    pixel(x, y, color) {
        this.drawPart('solid', 0, 0, 1, 1, Math.round(x), Math.round(y), color - 1);
    }

    /** A horizontal dithered strip (pattern 'dither50', 'dither25' or 'dither12'), one row tall. */
    ditherRow(pattern, x, y, w, color, row = 0) {
        let dx = Math.round(x);
        const end = dx + Math.round(w);
        const yy = Math.round(y);
        while (dx < end) {
            const span = Math.min(56, end - dx);
            // start inside the pattern so the dots line up with the screen grid (patterns are 2 or 4 rows tall)
            const rows = this.rects[pattern]?.height ?? 2;
            this.drawPart(pattern, dx & 7, (row + yy) % rows, span, 1, dx, yy, color - 1);
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

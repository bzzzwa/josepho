// menu.js - a short vertical list of choices, for the title and pause screens.
// Keyboard: up/down to move, Space/Enter/Z to choose. Touch or mouse: tap a line.

import { C } from './colors.js';

const LINE = 11;

export class Menu {
    /** @param {{ label: string, id: string }[]} items */
    constructor(items) {
        this.items = items;
        this.index = 0;
        this.top = 0;
    }

    /** Returns the chosen item's id, or null. `ui` is the menu input from Game.readInput(). */
    update(ui, touch) {
        if (ui.downPressed) {
            this.index = (this.index + 1) % this.items.length;
        }
        if (ui.upPressed) {
            this.index = (this.index + this.items.length - 1) % this.items.length;
        }
        if (ui.confirmPressed) {
            return this.items[this.index].id;
        }
        for (let i = 0; i < this.items.length; i++) {
            if (touch.tappedIn(24, this.top + i * LINE - 3, 144, LINE)) {
                this.index = i;
                return this.items[i].id;
            }
        }
        return null;
    }

    render(gfx, cx, top, blink) {
        this.top = top;
        this.items.forEach((item, i) => {
            const y = top + i * LINE;
            const chosen = i === this.index;
            const color = chosen ? C.MOTE : C.UI_DIM;
            gfx.textCentered(item.label, cx, y, color);
            if (chosen && blink) {
                const w = gfx.textWidth(item.label);
                gfx.text('>', Math.round(cx - w / 2) - 8, y, C.MOTE);
            }
        });
    }
}

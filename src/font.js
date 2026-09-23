// font.js - a 3 x 5 pixel font with Czech diacritics, made for a 192 x 108 screen.
//
// The engine's built-in font is 14 pixels tall - lovely at 320 x 240, far too big here. So Josepho
// carries its own. Every glyph cell is 3 wide and 8 tall: rows 0-1 hold an accent (acute, caron or
// ring), row 2 is a gap, rows 3-7 are the letter. Text is always drawn in capitals.
// No engine imports: art-data.js packs these masks into the sprite atlas.

export const GLYPH_W = 3;
export const GLYPH_H = 8;
export const LETTER_TOP = 3; // the letter body starts this many rows into the cell
export const ADVANCE = 4;
export const SPACE_ADVANCE = 3;
export const LINE_HEIGHT = 9;

const G = {
    A: ['.#.', '#.#', '###', '#.#', '#.#'],
    B: ['##.', '#.#', '##.', '#.#', '##.'],
    C: ['.##', '#..', '#..', '#..', '.##'],
    D: ['##.', '#.#', '#.#', '#.#', '##.'],
    E: ['###', '#..', '##.', '#..', '###'],
    F: ['###', '#..', '##.', '#..', '#..'],
    G: ['.##', '#..', '#.#', '#.#', '.##'],
    H: ['#.#', '#.#', '###', '#.#', '#.#'],
    I: ['###', '.#.', '.#.', '.#.', '###'],
    J: ['..#', '..#', '..#', '#.#', '.#.'],
    K: ['#.#', '#.#', '##.', '#.#', '#.#'],
    L: ['#..', '#..', '#..', '#..', '###'],
    M: ['#.#', '###', '###', '#.#', '#.#'],
    N: ['##.', '#.#', '#.#', '#.#', '#.#'],
    O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
    P: ['##.', '#.#', '##.', '#..', '#..'],
    Q: ['.#.', '#.#', '#.#', '##.', '.##'],
    R: ['##.', '#.#', '##.', '#.#', '#.#'],
    S: ['.##', '#..', '.#.', '..#', '##.'],
    T: ['###', '.#.', '.#.', '.#.', '.#.'],
    U: ['#.#', '#.#', '#.#', '#.#', '###'],
    V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
    W: ['#.#', '#.#', '###', '###', '#.#'],
    X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
    Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
    Z: ['###', '..#', '.#.', '#..', '###'],
    0: ['###', '#.#', '#.#', '#.#', '###'],
    1: ['.#.', '##.', '.#.', '.#.', '###'],
    2: ['##.', '..#', '.#.', '#..', '###'],
    3: ['##.', '..#', '.#.', '..#', '##.'],
    4: ['#.#', '#.#', '###', '..#', '..#'],
    5: ['###', '#..', '##.', '..#', '##.'],
    6: ['.##', '#..', '###', '#.#', '###'],
    7: ['###', '..#', '.#.', '.#.', '.#.'],
    8: ['###', '#.#', '###', '#.#', '###'],
    9: ['###', '#.#', '###', '..#', '##.'],
    '.': ['...', '...', '...', '...', '.#.'],
    ',': ['...', '...', '...', '.#.', '#..'],
    '!': ['.#.', '.#.', '.#.', '...', '.#.'],
    '?': ['##.', '..#', '.#.', '...', '.#.'],
    ':': ['...', '.#.', '...', '.#.', '...'],
    '-': ['...', '...', '###', '...', '...'],
    "'": ['.#.', '.#.', '...', '...', '...'],
    '"': ['#.#', '#.#', '...', '...', '...'],
    '(': ['..#', '.#.', '.#.', '.#.', '..#'],
    ')': ['#..', '.#.', '.#.', '.#.', '#..'],
    '/': ['..#', '..#', '.#.', '#..', '#..'],
    '+': ['...', '.#.', '###', '.#.', '...'],
    '=': ['...', '###', '...', '###', '...'],
    '*': ['...', '#.#', '.#.', '#.#', '...'],
    // Arrows, typed as < > ^ in strings.
    '<': ['..#', '.##', '###', '.##', '..#'],
    '>': ['#..', '##.', '###', '##.', '#..'],
    '^': ['.#.', '###', '.#.', '.#.', '.#.'],
};

const ACUTE = ['..#', '.#.'];
const CARON = ['#.#', '.#.'];
const RING = ['.#.', '#.#'];

const ACCENTED = {
    Á: ['A', ACUTE],
    É: ['E', ACUTE],
    Í: ['I', ACUTE],
    Ó: ['O', ACUTE],
    Ú: ['U', ACUTE],
    Ý: ['Y', ACUTE],
    Č: ['C', CARON],
    Ď: ['D', CARON],
    Ě: ['E', CARON],
    Ň: ['N', CARON],
    Ř: ['R', CARON],
    Š: ['S', CARON],
    Ť: ['T', CARON],
    Ž: ['Z', CARON],
    Ů: ['U', RING],
};

function cell(letter, accent) {
    const top = accent ?? ['...', '...'];
    return [...top, '...', ...letter];
}

/** Every glyph as an 8-row mask, keyed 'f:<char>'. */
export const FONT_MASKS = {};
for (const [ch, rows] of Object.entries(G)) {
    FONT_MASKS[`f:${ch}`] = cell(rows);
}
for (const [ch, [base, accent]] of Object.entries(ACCENTED)) {
    FONT_MASKS[`f:${ch}`] = cell(G[base], accent);
}

/** Atlas name for a character, or null for a space. Unknown characters become '?'. */
export function glyphName(ch) {
    if (ch === ' ') {
        return null;
    }
    const up = ch.toUpperCase();
    const name = `f:${up}`;
    return FONT_MASKS[name] ? name : 'f:?';
}

export function textWidth(text) {
    let w = 0;
    for (const ch of text) {
        w += ch === ' ' ? SPACE_ADVANCE : ADVANCE;
    }
    return Math.max(0, w - 1);
}

/** Splits text into lines no wider than maxWidth pixels. '\n' forces a break. */
export function wrapText(text, maxWidth) {
    const lines = [];
    for (const para of text.split('\n')) {
        let line = '';
        for (const word of para.split(' ')) {
            const next = line ? `${line} ${word}` : word;
            if (textWidth(next) > maxWidth && line) {
                lines.push(line);
                line = word;
            } else {
                line = next;
            }
        }
        lines.push(line);
    }
    return lines;
}

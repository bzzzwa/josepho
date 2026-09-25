// colors.js - every palette slot of Josepho, and the "chroma" system that decides what each slot shows.
//
// The whole game is built on one idea that BLIT386 makes cheap: the world is drawn ONCE with slot numbers,
// and the palette decides what those numbers look like. At the start of chapter 1 most color groups are
// drained to grey. Every prism Josepho wakes up pours one group back in - grass, sky, flowers - and the
// change sweeps across everything on screen at once, without redrawing a single pixel differently.
//
// Slots 1-63 are the shared world colors below. Slots 64-127 belong to whatever is on screen: a level puts its
// spectrum stripes there (each stripe is its own color group that can be switched on and off), the world map
// puts the small flags of all levels there. createPaletteSpec() describes one such arrangement.
//
// This file has no engine imports on purpose: it only does arithmetic on plain [r, g, b] numbers, so it
// can be tested outside the browser. src/game.js copies the result into the live BLIT386 palette.

// Color groups. Each group has its own saturation that the story can raise from 0 (grey) to 1 (full color).
export const GROUP = {
    NEUTRAL: 0, // outlines, UI, the grey creatures - never change
    SKY: 1, // sky gradient, sun, clouds, far mountains, water
    EARTH: 2, // dirt, stone, wood
    GREEN: 3, // grass, leaves, near hills
    BLOOM: 4, // flowers, fireflies
    SPIRIT: 5, // Josepho, motes, prisms - always in color
};
export const GROUP_COUNT = 6;
export const GROUP_NAMES = ['neutral', 'sky', 'earth', 'green', 'bloom', 'spirit'];

// Slot numbers. Slot 0 is always transparent in BLIT386, so real colors start at 1.
export const C = {
    INK: 1,
    WHITE: 2,
    UI_DIM: 3,
    UI_DARK: 4,
    SKY0: 5, // top of the sky ... SKY5 is the horizon (5..10)
    SUN: 11,
    SUN_GLOW: 12,
    CLOUD_HI: 13,
    CLOUD_LO: 14,
    FAR: 15,
    FAR_HI: 16,
    MID: 17,
    MID_HI: 18,
    DIRT_DK: 19,
    DIRT: 20,
    DIRT_LT: 21,
    STONE_DK: 22,
    STONE: 23,
    STONE_LT: 24,
    GRASS_DK: 25,
    GRASS: 26,
    GRASS_LT: 27,
    LEAF_DK: 28,
    LEAF: 29,
    WOOD_DK: 30,
    WOOD: 31,
    PETAL_A: 32,
    PETAL_B: 33,
    PETAL_C: 34,
    CORE: 35,
    WATER0: 36, // four shimmering surface slots (36..39), rotated every few frames
    WATER_DEEP: 40,
    J_DARK: 41,
    J_BODY: 42,
    J_LIGHT: 43,
    J_CHEEK: 44,
    J_GOLD: 45,
    SPEC0: 46, // six rainbow slots (46..51) that slide around the color wheel
    GREY_DK: 52,
    GREY: 53,
    GREY_LT: 54,
    THORN: 55,
    MOTE: 56,
    MOTE_HI: 57,
    GHOST: 58,
    SHADE: 59,
    LANTERN: 60,
    FIREFLY: 61,
    CLOUD_SOLID: 62,
    WATER_FOAM: 63,
};
export const PALETTE_SIZE = 128;

// Level spectrum stripes: 4 shades each (dark, base, light, glow), up to 8 stripes, in slots 64-95.
// Sprites for stripe tiles are drawn with stripe 0's slots and shifted to stripe k with palette offset 4 * k.
export const STRIPE0 = 64;
export const STRIPE_SHADES = 4;
export const MAX_STRIPES = 8;
// World map: up to 6 flag colors for each of 10 levels, in slots 64-123.
export const FLAG0 = 64;
export const FLAG_COLORS = 6;

// Static colors: [slot, group, hex]. Dynamic slots (sky, sun, water, spectrum, lantern) are computed below.
const STATIC = [
    [C.INK, GROUP.NEUTRAL, '#120e1e'],
    [C.WHITE, GROUP.NEUTRAL, '#f6f1e6'],
    [C.UI_DIM, GROUP.NEUTRAL, '#8c879c'],
    [C.UI_DARK, GROUP.NEUTRAL, '#2b2540'],
    [C.DIRT_DK, GROUP.EARTH, '#4a2a2c'],
    [C.DIRT, GROUP.EARTH, '#7c4a36'],
    [C.DIRT_LT, GROUP.EARTH, '#ab744c'],
    [C.STONE_DK, GROUP.EARTH, '#3c3852'],
    [C.STONE, GROUP.EARTH, '#6a6682'],
    [C.STONE_LT, GROUP.EARTH, '#a09cb6'],
    [C.GRASS_DK, GROUP.GREEN, '#246a44'],
    [C.GRASS, GROUP.GREEN, '#4aa54c'],
    [C.GRASS_LT, GROUP.GREEN, '#9ad862'],
    [C.LEAF_DK, GROUP.GREEN, '#1c5040'],
    [C.LEAF, GROUP.GREEN, '#358a58'],
    [C.WOOD_DK, GROUP.EARTH, '#56321f'],
    [C.WOOD, GROUP.EARTH, '#98623e'],
    [C.PETAL_A, GROUP.BLOOM, '#ff6aa2'],
    [C.PETAL_B, GROUP.BLOOM, '#ffc53a'],
    [C.PETAL_C, GROUP.BLOOM, '#b27cff'],
    [C.CORE, GROUP.BLOOM, '#fff0b4'],
    [C.WATER_DEEP, GROUP.SKY, '#27508e'],
    [C.J_DARK, GROUP.SPIRIT, '#553a96'],
    [C.J_BODY, GROUP.SPIRIT, '#9b79e8'],
    [C.J_LIGHT, GROUP.SPIRIT, '#d8c6ff'],
    [C.J_CHEEK, GROUP.SPIRIT, '#ff8ab6'],
    [C.J_GOLD, GROUP.SPIRIT, '#ffd23a'],
    [C.GREY_DK, GROUP.NEUTRAL, '#383644'],
    [C.GREY, GROUP.NEUTRAL, '#6e6c7a'],
    [C.GREY_LT, GROUP.NEUTRAL, '#aaa8b4'],
    [C.THORN, GROUP.NEUTRAL, '#2c2234'],
    [C.MOTE, GROUP.SPIRIT, '#ffd64a'],
    [C.MOTE_HI, GROUP.SPIRIT, '#fff8d4'],
    [C.GHOST, GROUP.NEUTRAL, '#c4c0d4'],
    [C.SHADE, GROUP.EARTH, '#2a1a22'],
    [C.FIREFLY, GROUP.BLOOM, '#ffe46e'],
    [C.CLOUD_SOLID, GROUP.SKY, '#ffffff'],
    [C.WATER_FOAM, GROUP.SKY, '#e8f6ff'],
];

// Which group each slot belongs to (dynamic slots included).
const BASE_SLOT_GROUP = new Uint8Array(PALETTE_SIZE);
const SLOT_GROUP = BASE_SLOT_GROUP;
for (const [slot, group] of STATIC) {
    SLOT_GROUP[slot] = group;
}
for (let i = 0; i < 6; i++) {
    SLOT_GROUP[C.SKY0 + i] = GROUP.SKY;
    SLOT_GROUP[C.SPEC0 + i] = GROUP.SPIRIT;
}
for (let i = 0; i < 4; i++) {
    SLOT_GROUP[C.WATER0 + i] = GROUP.SKY;
}
for (const s of [C.SUN, C.SUN_GLOW, C.CLOUD_HI, C.CLOUD_LO, C.FAR, C.FAR_HI]) {
    SLOT_GROUP[s] = GROUP.SKY;
}
SLOT_GROUP[C.MID] = GROUP.GREEN;
SLOT_GROUP[C.MID_HI] = GROUP.GREEN;
SLOT_GROUP[C.LANTERN] = GROUP.SPIRIT;

export function hexToRgb(hex) {
    const n = Number.parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Three moments of the sunrise. The player's progress through the level moves the sky from the first to the last.
const SKY_KEYS = [
    ['#15153a', '#20204c', '#37295c', '#5a3364', '#874266', '#b35a5e'],
    ['#2c3a78', '#474a8a', '#795a90', '#c46e7e', '#f0936a', '#ffc27a'],
    ['#4a86d8', '#62a0e4', '#80b7ec', '#a3ccf0', '#c7dff2', '#ecefe2'],
].map((row) => row.map(hexToRgb));

// [slot, pre-dawn, sunrise, morning]
const DAWN_KEYS = [
    [C.SUN, '#ff7a4a', '#ffb050', '#fff4c8'],
    [C.SUN_GLOW, '#c24e5c', '#ff8a5a', '#ffe6a0'],
    [C.CLOUD_HI, '#6c4c7c', '#ffc2a2', '#ffffff'],
    [C.CLOUD_LO, '#3a2d5a', '#c07a8a', '#c8d8ec'],
    [C.FAR, '#29294f', '#584e84', '#86a3cb'],
    [C.FAR_HI, '#4a3f70', '#ffb49a', '#eef4fa'],
    [C.MID, '#1a2838', '#2c4848', '#3b7654'],
    [C.MID_HI, '#283844', '#6a7a50', '#68a860'],
].map(([slot, a, b, c]) => [slot, hexToRgb(a), hexToRgb(b), hexToRgb(c)]);

const WATER_CYCLE = ['#4f9ada', '#6fbaee', '#b4e2ff', '#6fbaee'].map(hexToRgb);

const STATIC_RGB = STATIC.map(([slot, group, hex]) => [slot, group, hexToRgb(hex)]);

// Warm, dim light at dawn; plain daylight later. Applied to the ground, plants and flowers.
const AMBIENT_DAWN = [0.74, 0.66, 0.84];

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function lerp3(out, a, b, t) {
    out[0] = lerp(a[0], b[0], t);
    out[1] = lerp(a[1], b[1], t);
    out[2] = lerp(a[2], b[2], t);
    return out;
}

// Three-key blend: t = 0 -> k0, 0.5 -> k1, 1 -> k2.
function key3(out, k0, k1, k2, t) {
    if (t < 0.5) {
        return lerp3(out, k0, k1, t * 2);
    }
    return lerp3(out, k1, k2, (t - 0.5) * 2);
}

// HSL (h in degrees, s and l 0..1) to [r, g, b].
export function hsl(out, h, s, l) {
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    out[0] = f(0) * 255;
    out[1] = f(8) * 255;
    out[2] = f(4) * 255;
    return out;
}

/**
 * Everything the palette depends on. game.js owns one of these and changes it as the story moves.
 */
export function createChromaState(spec = DEFAULT_SPEC) {
    return {
        sat: new Float32Array(spec.groupCount), // per-group saturation, 0 = grey, 1 = full color
        dawn: 0, // 0 = before sunrise, 1 = bright morning
        tick: 0, // frame counter for cycling slots
        flash: 0, // 0..1 mix toward white (a prism waking up)
        drain: 0, // 0..1 extra desaturation of everything (Josepho being hurt)
        fade: 0, // 0..1 fade to black (screen transitions)
        lantern: 0, // flicker phase for lit lanterns
    };
}

const WHITE_RGB = [255, 255, 255];
const tmp = [0, 0, 0];
const grey = [0, 0, 0];
const rgb = [0, 0, 0];

function shade(rgb, toward, t) {
    return [lerp(rgb[0], toward[0], t), lerp(rgb[1], toward[1], t), lerp(rgb[2], toward[2], t)];
}
const BLACK_RGB = [18, 14, 30];

/**
 * Describes what the palette holds on one screen.
 *   colors:  { DIRT: '#hex', ... } - replace shared world colors (by the names in C) for a level's look
 *   sky:     three rows of six hex colors (pre-dawn, sunrise, morning) - a level's own sky
 *   stripes: [{ id, color }] - the level's spectrum; each stripe becomes a color group named by its id
 *   flags:   [[hex, ...], ...] - world map only: the flag colors of every level, groups 'flag1' ... 'flag10'
 */
export function createPaletteSpec({ colors = {}, sky = null, stripes = [], flags = [] } = {}) {
    const slotGroup = new Uint8Array(BASE_SLOT_GROUP);
    const groups = {};
    GROUP_NAMES.forEach((name, i) => {
        groups[name] = i;
    });
    let groupCount = GROUP_COUNT;
    const fixed = new Map(); // slot -> [r, g, b] that replaces the computed color

    for (const [name, hex] of Object.entries(colors)) {
        if (C[name] === undefined) {
            throw new Error(`Unknown palette color '${name}'`);
        }
        fixed.set(C[name], hexToRgb(hex));
    }
    if (stripes.length > MAX_STRIPES) {
        throw new Error(`At most ${MAX_STRIPES} spectrum stripes`);
    }
    stripes.forEach((stripe, i) => {
        const group = groupCount++;
        groups[stripe.id] = group;
        const base = hexToRgb(stripe.color);
        const shades = [shade(base, BLACK_RGB, 0.4), base, shade(base, WHITE_RGB, 0.35), shade(base, WHITE_RGB, 0.7)];
        shades.forEach((rgb, k) => {
            const slot = STRIPE0 + i * STRIPE_SHADES + k;
            fixed.set(slot, rgb);
            slotGroup[slot] = group;
        });
    });
    flags.forEach((colorsOfFlag, i) => {
        const group = groupCount++;
        groups[`flag${i + 1}`] = group;
        colorsOfFlag.slice(0, FLAG_COLORS).forEach((hex, k) => {
            const slot = FLAG0 + i * FLAG_COLORS + k;
            fixed.set(slot, hexToRgb(hex));
            slotGroup[slot] = group;
        });
    });
    return {
        slotGroup,
        groups,
        groupCount,
        fixed,
        skyKeys: sky ? sky.map((row) => row.map(hexToRgb)) : SKY_KEYS,
        stripeIndex: Object.fromEntries(stripes.map((st, i) => [st.id, i])),
    };
}

/**
 * Computes all slot colors into out (a Uint8Array of PALETTE_SIZE * 3 numbers).
 */
export function computePalette(state, out, spec = DEFAULT_SPEC) {
    const dawn = Math.max(0, Math.min(1, state.dawn));
    const ambientT = Math.min(1, dawn * 1.4);
    const amb0 = lerp(AMBIENT_DAWN[0], 1, ambientT);
    const amb1 = lerp(AMBIENT_DAWN[1], 1, ambientT);
    const amb2 = lerp(AMBIENT_DAWN[2], 1, ambientT);

    const slotGroup = spec.slotGroup;
    for (let slot = 1; slot < PALETTE_SIZE; slot++) {
        const fixedRgb = spec.fixed.get(slot);
        if (fixedRgb) {
            rgb[0] = fixedRgb[0];
            rgb[1] = fixedRgb[1];
            rgb[2] = fixedRgb[2];
        } else {
            baseColor(slot, state, dawn, rgb, spec);
        }
        const group = slotGroup[slot];

        if (group === GROUP.EARTH || group === GROUP.GREEN || group === GROUP.BLOOM) {
            rgb[0] *= amb0;
            rgb[1] *= amb1;
            rgb[2] *= amb2;
        }

        // Grey version: brightness kept, a slight cool tint so "grey" still feels like a place.
        const lum = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
        grey[0] = lum * 0.93 + 4;
        grey[1] = lum * 0.95 + 5;
        grey[2] = lum * 1.0 + 12;

        let s = group === GROUP.NEUTRAL ? 1 : state.sat[group];
        if (group !== GROUP.NEUTRAL) {
            s *= 1 - state.drain;
        }
        lerp3(tmp, grey, rgb, s);

        if (state.flash > 0) {
            lerp3(tmp, tmp, WHITE_RGB, state.flash);
        }
        const keep = 1 - state.fade;
        const o = slot * 3;
        out[o] = clamp255(tmp[0] * keep);
        out[o + 1] = clamp255(tmp[1] * keep);
        out[o + 2] = clamp255(tmp[2] * keep);
    }
    return out;
}

function clamp255(v) {
    return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

function baseColor(slot, state, dawn, out, spec) {
    if (slot >= C.SKY0 && slot < C.SKY0 + 6) {
        const i = slot - C.SKY0;
        const keys = spec.skyKeys;
        return key3(out, keys[0][i], keys[1][i], keys[2][i], dawn);
    }
    if (slot >= C.WATER0 && slot < C.WATER0 + 4) {
        const phase = Math.floor(state.tick / 10);
        const c = WATER_CYCLE[(slot - C.WATER0 + phase) % 4];
        out[0] = c[0];
        out[1] = c[1];
        out[2] = c[2];
        return out;
    }
    if (slot >= C.SPEC0 && slot < C.SPEC0 + 6) {
        const h = ((slot - C.SPEC0) * 60 + state.tick * 3) % 360;
        return hsl(out, h, 0.9, 0.64);
    }
    if (slot === C.LANTERN) {
        const f = 0.5 + 0.5 * Math.sin(state.lantern * 0.21) * Math.sin(state.lantern * 0.13 + 1);
        out[0] = 255;
        out[1] = lerp(170, 214, f);
        out[2] = lerp(70, 120, f);
        return out;
    }
    for (const [s, k0, k1, k2] of DAWN_KEYS) {
        if (s === slot) {
            return key3(out, k0, k1, k2, dawn);
        }
    }
    for (const [s, , c] of STATIC_RGB) {
        if (s === slot) {
            out[0] = c[0];
            out[1] = c[1];
            out[2] = c[2];
            return out;
        }
    }
    // a slot nobody uses on this screen
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    return out;
}

const DEFAULT_SPEC = createPaletteSpec();

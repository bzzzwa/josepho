// art-data.js - every picture in Josepho, as text you can edit, plus a few that are grown by code.
//
// Each sprite is a list of rows. Every character is one pixel and names a palette slot (see CHARS).
// A dot is transparent. buildAtlas() packs every sprite into one indexed image, adds mirrored copies
// of the ones that need to face left, and returns the pixels plus a name -> rectangle map.
// No engine imports here, so the art can be previewed and tested outside the browser.

import { C, STRIPE0 } from './colors.js';
import { FONT_MASKS } from './font.js';

export const CHARS = {
    '.': 0,
    K: C.INK,
    W: C.WHITE,
    U: C.UI_DIM,
    u: C.UI_DARK,
    d: C.J_DARK,
    b: C.J_BODY,
    l: C.J_LIGHT,
    c: C.J_CHEEK,
    y: C.J_GOLD,
    0: C.SPEC0,
    1: C.SPEC0 + 1,
    2: C.SPEC0 + 2,
    3: C.SPEC0 + 3,
    4: C.SPEC0 + 4,
    5: C.SPEC0 + 5,
    g: C.GREY_DK,
    h: C.GREY,
    i: C.GREY_LT,
    t: C.THORN,
    m: C.MOTE,
    n: C.MOTE_HI,
    S: C.STONE_DK,
    s: C.STONE,
    r: C.STONE_LT,
    E: C.DIRT_DK,
    e: C.DIRT,
    f: C.DIRT_LT,
    G: C.GRASS_DK,
    v: C.GRASS,
    V: C.GRASS_LT,
    L: C.LEAF_DK,
    x: C.LEAF,
    O: C.WOOD_DK,
    o: C.WOOD,
    P: C.PETAL_A,
    Q: C.PETAL_B,
    R: C.PETAL_C,
    q: C.CORE,
    X: C.GHOST,
    A: C.LANTERN,
    Z: C.SHADE,
    F: C.FIREFLY,
    w: C.CLOUD_SOLID,
    j: C.CLOUD_HI,
    k: C.CLOUD_LO,
    a: C.WATER0,
    B: C.WATER0 + 1,
    D: C.WATER0 + 2,
    H: C.WATER0 + 3,
    N: C.WATER_DEEP,
    T: C.WATER_FOAM,
    // spectrum stripe 0 (dark, base, light, glow); drawn with a palette offset for the other stripes
    6: STRIPE0,
    7: STRIPE0 + 1,
    8: STRIPE0 + 2,
    9: STRIPE0 + 3,
};

// ---------------------------------------------------------------------------------------------------------
// Josepho: 10 x 12, facing right. Two moth-like antennae end in spectrum-colored tips that never stop shifting.
// ---------------------------------------------------------------------------------------------------------

const J = {};

// Josepho is assembled from three parts so every frame stays consistent:
// two antennae (3 rows), a body with a face (8 rows) and feet (1 row).
const BODY = [
    '..KKKKK...',
    '.KllbbbK..',
    '.KlbbbbbK.',
    'KlbWKbWKK.',
    'KbbKKbKKK.',
    'KbbbbbbcK.',
    'KdbbbbbbK.',
    '.KddddddK.',
];
const FACES = {
    open: ['KlbWKbWKK.', 'KbbKKbKKK.'],
    blink: ['KlbbbbbbK.', 'KbbKKbKKK.'],
    wide: ['KlbWWbWWK.', 'KbbKKbKKK.'],
    hurt: ['KlbKWbKWK.', 'KbbWKbWKK.'],
    happy: ['KlbKKbKKK.', 'KbbbbbbbK.'],
};
const ANTENNAE = {
    up: ['.0....5...', '..K..K....', '...KK.....'],
    bob: ['..........', '.0...5....', '..KKK.....'],
    back: ['0...5.....', '.K.K......', '..KK......'],
    backLow: ['..........', '0..5......', '.KKK......'],
    tall: ['..0..5....', '..K..K....', '...KK.....'],
};
const FEET = {
    stand: '..KK..KK..',
    stride: '.KK....KK.',
    tuck: '...KKKK...',
    spread: '.K......K.',
};

function josepho(antennae, face, feet, options = {}) {
    const body = [...BODY];
    const f = FACES[face];
    body[3] = f[0];
    body[4] = f[1];
    if (face === 'happy') {
        body[5] = 'KbbbKKbcK.';
    }
    const rows = [...ANTENNAE[antennae], ...body, FEET[feet]];
    if (options.squash) {
        // one row shorter on top: the body presses down
        rows.splice(3, 1);
        rows.unshift('..........');
    }
    return rows;
}

// Flutter frames are wider: small wings of light beat on both sides.
function withWings(rows, up) {
    const wingRows = up ? [3, 4, 5, 6] : [6, 7, 8, 9];
    const shapes = up ? ['n.', 'mn', 'mm', '.m'] : ['.m', 'mm', 'mn', 'n.'];
    return rows.map((row, y) => {
        const k = wingRows.indexOf(y);
        if (k < 0) {
            return `..${row}..`;
        }
        const s = shapes[k];
        const right = s.split('').reverse().join('');
        return `${s}${row}${right}`;
    });
}

J.idle0 = josepho('up', 'open', 'stand');
J.idle1 = josepho('bob', 'open', 'stand', { squash: true });
J.blink = josepho('up', 'blink', 'stand');
J.run0 = josepho('back', 'open', 'stride');
J.run1 = josepho('backLow', 'open', 'tuck');
J.run2 = josepho('back', 'open', 'stand');
J.jump = josepho('back', 'open', 'tuck');
J.fall = josepho('tall', 'wide', 'spread');
J.flutter0 = withWings(josepho('tall', 'open', 'tuck'), true);
J.flutter1 = withWings(josepho('tall', 'open', 'tuck'), false);
J.hurt = josepho('tall', 'hurt', 'spread');
J.happy = josepho('up', 'happy', 'stand');

// ---------------------------------------------------------------------------------------------------------
// Creatures
// ---------------------------------------------------------------------------------------------------------

// Sedivec (greyling): a soft grey tuft that drinks color. 10 x 8, walking frames and a flattened one.
const greyling0 = [
    '...gggg...',
    '..ghiihg..',
    '.ghhhhhhg.',
    'ghWKhhWKhg',
    'ghhhhhhhhg',
    'gghhhhhhgg',
    '.gghhhhgg.',
    '..g....g..',
];
const greyling1 = [
    '..........',
    '...gggg...',
    '.gghiihgg.',
    'ghhhhhhhhg',
    'ghWKhhWKhg',
    'ghhhhhhhhg',
    '.gghhhhgg.',
    '...g..g...',
];
const greylingFlat = [
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '.gggggggg.',
    'ghWKhhWKhg',
    'gggggggggg',
];

// Bodlinec (thornback): a slow beetle wearing a crown of thorns. Cannot be stomped. 10 x 9.
const thorn0 = [
    '.t...t....',
    '.tt.tt.t..',
    '..ttttttt.',
    '.tgttgtttt',
    'tggggggggt',
    'tghhhhhWKt',
    'tghhhhhhht',
    '.tgggggggt',
    '..t.t..t..',
];
const thorn1 = [
    '..t...t...',
    '.tt.tt.t..',
    '..ttttttt.',
    '.tgttgtttt',
    'tggggggggt',
    'tghhhhhWKt',
    'tghhhhhhht',
    '.tgggggggt',
    '.t..t.t...',
];

// ---------------------------------------------------------------------------------------------------------
// Objects
// ---------------------------------------------------------------------------------------------------------

// Mote of light: four spin frames, 6 x 6.
const mote = [
    ['..nn..', '.nmmn.', 'nmmmmn', 'nmmmmn', '.nmmn.', '..nn..'],
    ['..nn..', '..mn..', '.nmmn.', '.nmmn.', '..mn..', '..nn..'],
    ['...n..', '...n..', '...m..', '...m..', '...n..', '...n..'],
    ['..nn..', '..nm..', '.nmmn.', '.nmmn.', '..nm..', '..nn..'],
];

// Glow petal (power-up): a floating five-color petal. 8 x 8.
const petal = [
    '...nn...',
    '..n01n..',
    '.n0yy1n.',
    'n5yWWy2n',
    'n5yWWy2n',
    '.n4yy3n.',
    '..n43n..',
    '...nn...',
];

// Small prism shrine: 12 x 18 crystal on a stone pedestal. Dormant uses greys; awake uses spectrum slots.
const prismDormant = [
    '.....ii.....',
    '....iWhi....',
    '...iWhhgi...',
    '..iWhhhhgi..',
    '..iWhhhhgi..',
    '.iWhhhhhhgi.',
    '.iWhhhhhhgi.',
    '..iWhhhhgi..',
    '..iWhhhhgi..',
    '...iWhhgi...',
    '....iWgi....',
    '.....ii.....',
    '............',
    '..KKKKKKKK..',
    '.KrrrrrrrrK.',
    '.KssssssssK.',
    '..KsSsSsSK..',
    '..KSSSSSSK..',
];
const prismAwake = [
    '.....nn.....',
    '....nW0n....',
    '...nW001n...',
    '..nW00112n..',
    '..nW01122n..',
    '.nW0112233n.',
    '.n51122334n.',
    '..n5223344n.',
    '..n5523344n.',
    '...n55344n..',
    '....n554n...',
    '.....nn.....',
    '............',
    '..KKKKKKKK..',
    '.KrrrrrrrrK.',
    '.KssssssssK.',
    '..KsSsSsSK..',
    '..KSSSSSSK..',
];

// The Dawn Prism at the end of the chapter: 20 x 30.
const greatPrism = [
    '.........nn.........',
    '........nWWn........',
    '.......nW00in.......',
    '......nW0011in......',
    '.....nW001122in.....',
    '.....nW0011223n.....',
    '....nW001122334n....',
    '....nW011223344n....',
    '...nW00112233445n...',
    '...nW01122334455n...',
    '..nW0011223344550n..',
    '..nW0112233445501n..',
    '..nW5112233445501n..',
    '..nW5512233445501n..',
    '...n551233445501n...',
    '...n554233445012n...',
    '....n5443345012n....',
    '....n5444450012n....',
    '.....n54455012n.....',
    '......n545012n......',
    '.......n55012n......',
    '........n501n.......',
    '.........nnn........',
    '....................',
    '...KKKKKKKKKKKKKK...',
    '..KrrrrrrrrrrrrrrK..',
    '..KrsssssssssssssK..',
    '...KsSsSsSsSsSsSK...',
    '...KssssssssssssK...',
    '..KSSSSSSSSSSSSSSK..',
];

// Lantern checkpoint: 6 x 14, unlit and lit.
const lanternOff = [
    '..KK..',
    '.KiiK.',
    'KhhhhK',
    'KhgghK',
    'KhgghK',
    'KhhhhK',
    '.KiiK.',
    '..KK..',
    '..KO..',
    '..KO..',
    '..KO..',
    '..KO..',
    '..KO..',
    '.KKOK.',
];
const lanternOn = [
    '..KK..',
    '.KyyK.',
    'KAnnAK',
    'KnWWnK',
    'KnWWnK',
    'KAnnAK',
    '.KyyK.',
    '..KK..',
    '..KO..',
    '..KO..',
    '..KO..',
    '..KO..',
    '..KO..',
    '.KKOK.',
];

// Wooden sign: 10 x 10.
const sign = [
    'KKKKKKKKKK',
    'KoooooooOK',
    'KoOOoOOoOK',
    'KoooooooOK',
    'KoOoOOOoOK',
    'KOOOOOOOOK',
    'KKKKOOKKKK',
    '....KO....',
    '....KO....',
    '...KKOK...',
];

// Flowers: bud (grey world) and bloom (after the bloom prism). 7 x 9.
const flowerBud = [
    '.......',
    '.......',
    '...L...',
    '..LxL..',
    '..LxL..',
    '...L...',
    '...x...',
    '.x.x...',
    '..xx.x.',
];
const flowerBloom = [
    ['..P.P..', '.PPqPP.', '..PqP..', '.PPqPP.', '..P.P..', '...x...', '...x...', '.x.x...', '..xx.x.'],
    ['..Q.Q..', '.QQqQQ.', '..QqQ..', '.QQqQQ.', '..Q.Q..', '...x...', '...x...', '...x.x.', '.x.xx..'],
    ['..R.R..', '.RRqRR.', '..RqR..', '.RRqRR.', '..R.R..', '...x...', '...x...', '.x.x...', '..xx.x.'],
];

// Bell flower spring (bloom platforms). 16 x 10, closed and open.
const bellClosed = [
    '................',
    '................',
    '................',
    '......XXXX......',
    '.....X....X.....',
    '....X......X....',
    '.....XXXXXX.....',
    '.......LL.......',
    '.......xL.......',
    '......LxxL......',
];
const bellOpen = [
    '.PP..........PP.',
    'PqPP........PPqP',
    '.PPPPP....PPPPP.',
    '..PPPPPPPPPPPP..',
    '...PPqqqqqqPP...',
    '....PPPPPPPP....',
    '.....KPPPPK.....',
    '.......LL.......',
    '.......xL.......',
    '......LxxL......',
];
const bellSquash = [
    '................',
    '................',
    '................',
    '.PP..........PP.',
    'PqPPPPPPPPPPPPqP',
    '.PPPPqqqqqqPPPP.',
    '....KPPPPPPK....',
    '.......LL.......',
    '.......xL.......',
    '......LxxL......',
];

// Tall grass tufts drawn in front of the player for depth. 8 x 5.
const tufts = [
    ['.V....V.', '.v..V.v.', 'Gv.vv.vG', 'GvGvGvvG', 'GGGGGGGG'],
    ['...V....', 'V..v..V.', 'v.Vv.Vv.', 'vGvGvvGv', 'GGGGGGGG'],
    ['......V.', '.V...Vv.', '.vV..vvV', 'GvvGGvvG', 'GGGGGGGG'],
];

// Background tree (mid-ground decoration). 16 x 24.
const tree = [
    '......LLLL......',
    '....LLxxxxLL....',
    '...LxxVxxxxxL...',
    '..LxxVVxxxxxxL..',
    '.LxxxVxxxxxxxxL.',
    '.LxxxxxxxxxxLxL.',
    'LxxxxxxxxxxxLxxL',
    'LxxVxxxxxxxLxxxL',
    'LxVVxxxxxxxxxxxL',
    'LxxxxxxxxxxxxxLL',
    '.LxxxxxxxxxxxLL.',
    '.LLxxxxLxxxxLLL.',
    '..LLLxLLLxxLLL..',
    '...LLLLOLLLLL...',
    '......LOL.......',
    '.......oO.......',
    '.......oO.......',
    '.......oO.......',
    '......ooOO......',
    '.......oO.......',
    '.......oO.......',
    '......ooOO......',
    '.....ooOOOO.....',
    '....oOO..OOO....',
];

// Distant cloud puffs (background). 24 x 8.
const cloudBig = [
    '........jjjjj...........',
    '......jjjjjjjjj..jjj....',
    '...jjjjjjjjjjjjjjjjjjj..',
    '.jjjjjjjjjjjjjjjjjjjjjj.',
    'jjjjjjjjjjjjjjjjjjjjjjjj',
    'kjjjjjjjjjjjjjjjjjjjjjjk',
    '.kkkjjjjjjkkkkjjjjjkkk..',
    '....kkkkkk....kkkkk.....',
];
const cloudSmall = ['....jjjj....', '..jjjjjjjjj.', 'jjjjjjjjjjjj', 'kjjjjjjjjjjk', '.kkkkjjkkkk.'];

// Spectrum tiles (8 x 8): a full block and a ledge you can jump up through, plus their ghost outlines for
// when the stripe's color is off. Only stripe slots are used, so a palette offset recolors the whole tile.
const sBlock = ['66666666', '69888887', '68777776', '68777776', '68777776', '68777776', '67777776', '66666666'];
const sBlockGhost = ['7.7.7.7.', '.......7', '7.......', '.......7', '7.......', '.......7', '7.......', '.7.7.7.7'];
const sLedge = ['69888888', '87777777', '66666666', '.6....6.', '........', '........', '........', '........'];
const sLedgeGhost = ['7.7.7.7.', '.......7', '.7.7.7.7', '........', '........', '........', '........', '........'];

// HUD icons.
const hudMote = ['.nn.', 'nmmn', 'nmmn', '.nn.'];
const hudPrismOff = ['..U..', '.UuU.', 'UuuuU', '.UuU.', '..U..'];
const hudPrismOn = ['..n..', '.n0n.', 'n012n', '.n3n.', '..n..'];

// Arrow glyphs used in the tutorial text (3 x 5, stored in index 1 so they tint like text).
const arrowLeft = ['..#', '.##', '###', '.##', '..#'];
const arrowRight = ['#..', '##.', '###', '##.', '#..'];

// Touch buttons (masks). The frames are generated; the icons are drawn here.
function roundedBox(w, h) {
    return Array.from({ length: h }, (_, y) =>
        Array.from({ length: w }, (_, x) => {
            const edgeX = x === 0 || x === w - 1;
            const edgeY = y === 0 || y === h - 1;
            const corner = (x < 2 || x > w - 3) && (y < 2 || y > h - 3);
            if (corner) {
                return (x === 1 || x === w - 2) && (y === 1 || y === h - 2) ? '#' : '.';
            }
            return edgeX || edgeY ? '#' : '.';
        }).join(''),
    );
}
function ring(d) {
    const r = (d - 1) / 2;
    return Array.from({ length: d }, (_, y) =>
        Array.from({ length: d }, (_, x) => {
            const dist = Math.hypot(x - r, y - r);
            return dist <= r + 0.3 && dist > r - 0.9 ? '#' : '.';
        }).join(''),
    );
}
const tbBox = roundedBox(18, 18);
const tbCircle = ring(23);
const tbLeft = ['...#...', '..##...', '.######', '#######', '.######', '..##...', '...#...'];
const tbRight = tbLeft.map((row) => row.split('').reverse().join(''));
const tbUp = ['...#...', '..###..', '.#####.', '#######', '..###..', '..###..', '..###..'];
const tbPause = ['##.##', '##.##', '##.##', '##.##', '##.##', '##.##'];
const tbFull = ['###...###', '#.......#', '.........', '.........', '.........', '#.......#', '###...###'];

// Dither patterns, 64 wide (index 1 marks the dots). Drawn with a palette offset to pick their color.
function ditherRows(pattern) {
    return pattern.map((row) => row.repeat(64 / row.length));
}
const dither50 = ditherRows(['#.', '.#']);
const dither25 = ditherRows(['#...', '..#.']);
const dither12 = ditherRows(['#.......', '....#...']);

// Debris chip when a brick breaks, and a puff of dust.
const chip = ['SrS', 'rsS', 'SS.'];
const dust = [
    ['.WW.', 'WWWW', '.WW.'],
    ['.W..', 'W.W.', '.W.W'],
    ['....', '.W..', '...W'],
];

export const SPRITES = {
    'j.idle0': J.idle0,
    'j.idle1': J.idle1,
    'j.blink': J.blink,
    'j.run0': J.run0,
    'j.run1': J.run1,
    'j.run2': J.run2,
    'j.jump': J.jump,
    'j.fall': J.fall,
    'j.flutter0': J.flutter0,
    'j.flutter1': J.flutter1,
    'j.hurt': J.hurt,
    'j.happy': J.happy,
    greyling0: greyling0,
    greyling1: greyling1,
    greylingFlat: greylingFlat,
    thorn0: thorn0,
    thorn1: thorn1,
    mote0: mote[0],
    mote1: mote[1],
    mote2: mote[2],
    mote3: mote[3],
    petal: petal,
    prismDormant: prismDormant,
    prismAwake: prismAwake,
    greatPrism: greatPrism,
    lanternOff: lanternOff,
    lanternOn: lanternOn,
    sign: sign,
    flowerBud: flowerBud,
    flower0: flowerBloom[0],
    flower1: flowerBloom[1],
    flower2: flowerBloom[2],
    bellClosed: bellClosed,
    bellOpen: bellOpen,
    bellSquash: bellSquash,
    tuft0: tufts[0],
    tuft1: tufts[1],
    tuft2: tufts[2],
    tree: tree,
    cloudBig: cloudBig,
    cloudSmall: cloudSmall,
    sBlock: sBlock,
    sBlockGhost: sBlockGhost,
    sLedge: sLedge,
    sLedgeGhost: sLedgeGhost,
    hudMote: hudMote,
    hudPrismOff: hudPrismOff,
    hudPrismOn: hudPrismOn,
    chip: chip,
    dust0: dust[0],
    dust1: dust[1],
    dust2: dust[2],
};

// Sprites whose '#' means "index 1" - they are tinted with a palette offset when drawn.
export const MASKS = {
    arrowLeft,
    arrowRight,
    dither50,
    dither25,
    dither12,
    tbBox,
    tbCircle,
    tbLeft,
    tbRight,
    tbUp,
    tbPause,
    tbFull,
    ...FONT_MASKS,
};

// These also get a mirrored copy named with a trailing '<' (facing left).
export const MIRRORED = [
    'j.idle0',
    'j.idle1',
    'j.blink',
    'j.run0',
    'j.run1',
    'j.run2',
    'j.jump',
    'j.fall',
    'j.flutter0',
    'j.flutter1',
    'j.hurt',
    'j.happy',
    'greyling0',
    'greyling1',
    'thorn0',
    'thorn1',
];

// ---------------------------------------------------------------------------------------------------------
// Tiles grown by code: 8 x 8 each, with small random variation so the ground never looks stamped.
// ---------------------------------------------------------------------------------------------------------

function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => {
        s ^= s << 13;
        s >>>= 0;
        s ^= s >>> 17;
        s ^= s << 5;
        s >>>= 0;
        return s / 4294967296;
    };
}

function blank(w, h) {
    return Array.from({ length: h }, () => new Array(w).fill(0));
}

// Dirt interior with pebbles and roots.
function makeDirt(seed) {
    const r = rng(seed);
    const px = blank(8, 8);
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            px[y][x] = C.DIRT;
        }
    }
    for (let n = 0; n < 5; n++) {
        const x = Math.floor(r() * 8);
        const y = Math.floor(r() * 8);
        px[y][x] = C.DIRT_DK;
        if (r() < 0.5 && x < 7) {
            px[y][x + 1] = C.DIRT_DK;
        }
    }
    for (let n = 0; n < 3; n++) {
        const x = Math.floor(r() * 7);
        const y = Math.floor(r() * 7);
        px[y][x] = C.DIRT_LT;
        px[y + 1][x + 1] = C.DIRT_DK;
    }
    if (r() < 0.45) {
        // a little stone
        const x = 1 + Math.floor(r() * 5);
        const y = 1 + Math.floor(r() * 5);
        px[y][x] = C.STONE_LT;
        px[y][x + 1] = C.STONE;
        px[y + 1][x] = C.STONE;
        px[y + 1][x + 1] = C.STONE_DK;
    }
    return px;
}

// Grass cap: 8 x 7. Rows 0-2 are blades that overhang the tile above, rows 3-6 cover the top of the tile.
function makeGrassTop(seed) {
    const r = rng(seed);
    const px = blank(8, 7);
    for (let x = 0; x < 8; x++) {
        px[3][x] = C.GRASS_LT;
        px[4][x] = C.GRASS;
        px[5][x] = r() < 0.5 ? C.GRASS : C.GRASS_DK;
        px[6][x] = r() < 0.35 ? C.GRASS_DK : 0;
        const h = r();
        if (h < 0.35) {
            px[2][x] = C.GRASS;
        }
        if (h < 0.12) {
            px[1][x] = C.GRASS_LT;
        }
    }
    // a lighter highlight run
    const hx = Math.floor(r() * 5);
    px[3][hx] = C.GRASS_LT;
    px[4][hx + 1] = C.GRASS_LT;
    return px;
}

function makeGrassCorner(left) {
    const px = makeGrassTop(left ? 91 : 93);
    // round the outer end and let the grass hang down the side
    const edge = left ? 0 : 7;
    px[3][edge] = 0;
    px[4][edge] = C.GRASS_DK;
    px[5][edge] = C.GRASS_DK;
    px[6][edge] = C.GRASS_DK;
    return px;
}

// Stone brick (breakable when glowing).
function makeBrick(seed) {
    const r = rng(seed);
    const px = blank(8, 8);
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            let c = C.STONE;
            const row = y < 4 ? 0 : 1;
            const seam = row === 0 ? 4 : 0;
            if (y === 3 || y === 7) {
                c = C.STONE_DK;
            } else if (x === seam || (row === 1 && x === 7)) {
                c = C.STONE_DK;
            } else if (y === 0 || y === 4) {
                c = C.STONE_LT;
            } else if (r() < 0.08) {
                c = C.STONE_DK;
            }
            px[y][x] = c;
        }
    }
    return px;
}

// Solid rock (unbreakable, also used for the chapter-end staircase).
function makeRock() {
    const px = blank(8, 8);
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            let c = C.STONE;
            if (x === 0 || y === 0) {
                c = C.STONE_LT;
            }
            if (x === 7 || y === 7) {
                c = C.STONE_DK;
            }
            px[y][x] = c;
        }
    }
    px[1][1] = C.WHITE;
    px[3][4] = C.STONE_DK;
    px[4][3] = C.STONE_DK;
    px[5][5] = C.STONE_LT;
    return px;
}

// Prism block: a stone frame holding a rhombus whose colors are the spectrum slots (they animate for free).
function makePrismBlock(used) {
    const px = blank(8, 8);
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            let c = used ? C.STONE : C.STONE_DK;
            if (x === 0 || y === 0) {
                c = used ? C.STONE_LT : C.STONE;
            }
            if (x === 7 || y === 7) {
                c = C.INK;
            }
            px[y][x] = c;
        }
    }
    const shape = ['...##...', '..#..#..', '.#....#.', '..#..#..', '...##...'];
    for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 8; x++) {
            if (shape[y][x] === '#') {
                px[y + 1][x] = used ? C.STONE_DK : C.SPEC0 + ((x + y) % 6);
            } else if (!used && y > 0 && y < 4 && x > 1 && x < 6 && Math.abs(x - 3.5) + Math.abs(y - 2) < 2.5) {
                px[y + 1][x] = C.MOTE_HI;
            }
        }
    }
    return px;
}

// Wooden bridge plank (one-way).
function makePlank() {
    const px = blank(8, 8);
    for (let x = 0; x < 8; x++) {
        px[0][x] = C.WOOD;
        px[1][x] = x % 4 === 3 ? C.WOOD_DK : C.WOOD;
        px[2][x] = C.WOOD_DK;
        px[3][x] = x === 1 || x === 6 ? C.WOOD_DK : 0;
        px[4][x] = x === 1 || x === 6 ? C.WOOD_DK : 0;
    }
    px[0][2] = C.DIRT_LT;
    return px;
}

// Leaf platform (solid once green returns) and its ghost outline.
function makeLeaf(ghost) {
    const rows = ['.xxxxxx.', 'xVVxxVxx', 'LxxLxxxL', '.LLLLLL.', '...L....'];
    const px = blank(8, 8);
    for (let y = 0; y < rows.length; y++) {
        for (let x = 0; x < 8; x++) {
            const ch = rows[y][x];
            if (ch === '.') {
                continue;
            }
            if (ghost) {
                px[y][x] = (x + y) % 2 === 0 ? C.GHOST : 0;
            } else {
                px[y][x] = CHARS[ch];
            }
        }
    }
    return px;
}

// Cloud platform (solid once the sky returns) and its ghost outline.
function makeCloud(ghost, variant) {
    const rows =
        variant === 0
            ? ['..wwww..', '.wwwwww.', 'wwwwwwww', 'kjjjjjjk', '.kk..kk.']
            : ['.wwww...', 'wwwwwww.', 'wwwwwwww', 'jjjjjjjk', '.kkkkk..'];
    const px = blank(8, 8);
    for (let y = 0; y < rows.length; y++) {
        for (let x = 0; x < 8; x++) {
            const ch = rows[y][x];
            if (ch === '.') {
                continue;
            }
            if (ghost) {
                px[y][x] = (x + y) % 2 === 0 ? C.GHOST : 0;
            } else {
                px[y][x] = CHARS[ch];
            }
        }
    }
    return px;
}

// Water: the surface uses the four cycling slots arranged diagonally, so rotating them makes waves roll.
function makeWater(surface) {
    const px = blank(8, 8);
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            if (surface) {
                if (y === 0) {
                    px[y][x] = (x + 1) % 4 === 0 ? C.WATER_FOAM : 0;
                } else if (y === 1) {
                    px[y][x] = C.WATER0 + (x % 4);
                } else if (y === 2) {
                    px[y][x] = C.WATER0 + ((x + 2) % 4);
                } else {
                    px[y][x] = y < 5 && (x + y) % 3 === 0 ? C.WATER0 + (x % 4) : C.WATER_DEEP;
                }
            } else {
                px[y][x] = (x * 3 + y * 5) % 11 === 0 ? C.WATER0 + (y % 4) : C.WATER_DEEP;
            }
        }
    }
    return px;
}

// Thorn spikes (deadly tile).
function makeSpikes() {
    const rows = ['........', '...t...t', '..tt..tt', '.tgt.tgt', 'ttgtttgt', 'tggttggt', 'ZZZZZZZZ', 'EEEEEEEE'];
    return rows.map((row) => [...row].map((ch) => CHARS[ch] ?? 0));
}

// Side shading strips for ground edges (2 x 8).
function makeEdge(left) {
    const px = blank(2, 8);
    for (let y = 0; y < 8; y++) {
        if (left) {
            px[y][0] = C.DIRT_DK;
            px[y][1] = y % 3 === 0 ? C.DIRT_DK : 0;
        } else {
            px[y][1] = C.DIRT_DK;
            px[y][0] = y % 3 === 1 ? C.DIRT_DK : 0;
        }
    }
    return px;
}

function generatedTiles() {
    const out = {};
    for (let i = 0; i < 4; i++) {
        out[`dirt${i}`] = makeDirt(17 + i * 101);
        out[`grass${i}`] = makeGrassTop(7 + i * 57);
    }
    out.grassL = makeGrassCorner(true);
    out.grassR = makeGrassCorner(false);
    out.brick0 = makeBrick(5);
    out.brick1 = makeBrick(55);
    out.rock = makeRock();
    out.prismBlock = makePrismBlock(false);
    out.usedBlock = makePrismBlock(true);
    out.plank = makePlank();
    out.leaf = makeLeaf(false);
    out.leafGhost = makeLeaf(true);
    out.cloud0 = makeCloud(false, 0);
    out.cloud1 = makeCloud(false, 1);
    out.cloudGhost0 = makeCloud(true, 0);
    out.cloudGhost1 = makeCloud(true, 1);
    out.waterTop = makeWater(true);
    out.water = makeWater(false);
    out.spikes = makeSpikes();
    out.edgeL = makeEdge(true);
    out.edgeR = makeEdge(false);
    return out;
}

// ---------------------------------------------------------------------------------------------------------
// Atlas packing
// ---------------------------------------------------------------------------------------------------------

function fromRows(rows, map) {
    return rows.map((row) =>
        [...row].map((ch) => {
            const v = map[ch];
            if (v === undefined) {
                throw new Error(`Unknown art character '${ch}'`);
            }
            return v;
        }),
    );
}

function mirror(px) {
    return px.map((row) => [...row].reverse());
}

// A one-pixel outline around the shape, used for the glow aura around Josepho.
function aura(px) {
    const h = px.length + 2;
    const w = px[0].length + 2;
    const out = blank(w, h);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const inside = px[y - 1]?.[x - 1];
            if (inside) {
                continue;
            }
            let near = false;
            for (const [dx, dy] of [
                [1, 0],
                [-1, 0],
                [0, 1],
                [0, -1],
            ]) {
                if (px[y - 1 + dy]?.[x - 1 + dx]) {
                    near = true;
                }
            }
            if (near) {
                out[y][x] = 1;
            }
        }
    }
    return out;
}

/**
 * Packs all sprites into one indexed image.
 * @returns {{ width: number, height: number, pixels: Uint8Array, rects: Record<string, number[]> }}
 */
export function buildAtlas() {
    const items = [];
    const maskMap = { '.': 0, '#': 1 };

    for (const [name, rows] of Object.entries(SPRITES)) {
        const px = fromRows(rows, CHARS);
        items.push([name, px]);
        if (MIRRORED.includes(name)) {
            items.push([`${name}<`, mirror(px)]);
        }
        if (name.startsWith('j.')) {
            items.push([`${name}~`, aura(px)]);
            items.push([`${name}<~`, aura(mirror(px))]);
        }
    }
    for (const [name, rows] of Object.entries(MASKS)) {
        items.push([name, fromRows(rows, maskMap)]);
    }
    for (const [name, px] of Object.entries(generatedTiles())) {
        items.push([name, px]);
    }

    // Shelf packing, tallest first, into a 256-wide sheet.
    const width = 256;
    items.sort((a, b) => b[1].length - a[1].length);
    const rects = {};
    let x = 0;
    let y = 0;
    let shelf = 0;
    for (const [name, px] of items) {
        const w = px[0].length;
        const h = px.length;
        if (x + w > width) {
            x = 0;
            y += shelf + 1;
            shelf = 0;
        }
        rects[name] = [x, y, w, h];
        x += w + 1;
        shelf = Math.max(shelf, h);
    }
    const height = y + shelf + 1;
    const pixels = new Uint8Array(width * height);
    for (const [name, px] of items) {
        const [rx, ry, w, h] = rects[name];
        for (let yy = 0; yy < h; yy++) {
            for (let xx = 0; xx < w; xx++) {
                pixels[(ry + yy) * width + rx + xx] = px[yy][xx];
            }
        }
    }
    return { width, height, pixels, rects };
}

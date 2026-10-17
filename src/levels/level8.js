// level8.js - Level 8, "Vez protikladu" (The Tower of opposites). Josepho's own level.
// The Sorter's Tower, all black and white, rises over the tundra: one screen wide, eight floors high. Josepho climbs
// it in a zigzag - each floor has a hole on one side, left and right in turns, with ledges in it up to the next
// floor; whoever falls through lands one floor down. Discolorers fire grey rays: paint ledges
// in a ray lose their color and their volume, and Josepho caught in one goes grey for a while. Josepho gives color
// back to whatever is close around them. A Skatulkar, stomped, leaves its box behind; a kicked box slides and
// shuts a Discolorer down for good. Black and white, which the Sorter took for its own, are stripes of Josepho's
// flag: once the prism gives them back, black ledges carry Josepho for the first time. At the top: the mirror.
// The plan is in docs/pribeh.md; the shape of a level file is described in src/levels/README.md.
//
// Legend (this level)
//   ,  backdrop    y  yellow paint block    u  purple paint ledge     (Discolorers turn them grey)
//   q  black ledge    w  white ledge     (they carry Josepho once the prism gives black and white back)
//   N  Discolorer firing right   K  Discolorer firing left   V  a fast one, firing up a shaft
//   J  Skatulkar   p  box   Z  the mirror   z  lost shade
// Everything else as in level1.js.

/** The Tower is tall: its rows are written in runs - 'x*5' is five x, a lone character is one. */
function expand(rows) {
    return rows.map((row) =>
        row
            .split(' ')
            .map((run) => {
                const [ch, n] = run.split('*');
                return ch.repeat(n ? Number(n) : 1);
            })
            .join(''),
    );
}

export const LEVEL8 = {
    number: 8,
    name: 'VĚŽ PROTIKLADŮ',
    // the map, row by row, in runs: 'R .*22 R' is an R, 22 dots and an R (expanded below)
    map: expand([
        'R*24',
        'R .*22 R',
        'R .*22 R',
        'R .*22 R',
        'R .*22 R',
        'R .*22 R',
        'R .*22 R',
        'R .*22 R',
        'R .*22 R',
        'R .*22 R',
        'R .*22 R',
        'R .*2 F .*6 Z .*12 R',
        'R #*16 .*5 # R',
        'R #*16 .*5 # R',
        'R .*22 R',
        'R .*16 w*3 .*3 R',
        'R .*22 R',
        'R .*22 R',
        'R .*18 q*3 . R',
        'R .*22 R',
        'R .*11 z .*10 R',
        'R .*8 o . o . o .*3 w*3 .*3 R',
        'R .*22 R',
        'R .*22 R',
        'R # .*5 #*16 R',
        'R # .*5 #*16 R',
        'R .*22 R',
        'R .*3 u*3 .*16 R',
        'R .*22 R',
        'R .*22 R',
        'R . u*3 .*18 R',
        'R .*22 R',
        'R .*22 R',
        'R .*3 u*3 .*16 R',
        'R .*22 R',
        'R .*3 V .*4 J .*4 J .*8 R',
        'R #*16 .*5 # R',
        'R #*16 .*5 # R',
        'R .*22 R',
        'R .*16 q*3 .*3 R',
        'R .*22 R',
        'R .*22 R',
        'R .*18 q*3 . R',
        'R .*22 R',
        'R .*10 o . o . o .*7 R',
        'R .*16 q*3 .*3 R',
        'R .*22 R',
        'R .*3 l .*4 1 .*3 s .*9 R',
        'R # .*5 #*16 R',
        'R # .*5 #*16 R',
        'R .*22 R',
        'R .*3 u*3 .*16 R',
        'R .*22 R',
        'R .*22 R',
        'R . u*3 .*18 R',
        'R .*9 z .*12 R',
        'R .*22 R',
        'R .*3 u*3 .*15 K R',
        'R .*8 u*3 .*11 R',
        'R N .*21 R',
        'R #*4 y*3 .*5 y*3 # .*5 # R',
        'R #*4 .*11 # .*5 # R',
        'R .*22 R',
        'R .*16 u*3 .*3 R',
        'R .*22 R',
        'R .*22 R',
        'R .*18 u*3 . R',
        'R .*22 R',
        'R .*11 o . o . o .*6 R',
        'R .*16 u*3 .*3 R',
        'R .*22 R',
        'R .*3 l .*2 s .*2 p .*8 V .*3 R',
        'R # .*5 #*16 R',
        'R # .*5 #*16 R',
        'R .*22 R',
        'R .*3 u*3 .*16 R',
        'R .*22 R',
        'R .*22 R',
        'R . u*3 .*18 R',
        'R .*22 R',
        'R .*10 z .*11 R',
        'R .*3 u*3 .*16 R',
        'R .*22 R',
        'R N .*14 s .*2 l .*3 R',
        'R #*7 u*7 #*2 .*5 # R',
        'R #*7 .*7 #*2 .*5 # R',
        'R .*22 R',
        'R .*16 u*3 .*3 R',
        'R .*22 R',
        'R .*22 R',
        'R .*18 u*3 . R',
        'R .*22 R',
        'R .*7 o . o . o .*10 R',
        'R .*16 u*3 .*3 R',
        'R .*22 R',
        'R N . @ . s .*17 R',
        'R #*5 y*10 #*7 R',
        'R #*22 R',
        'R #*22 R',
        'R #*22 R',
    ]),

    // the nonbinary flag (Kye Rowan): yellow, white, purple, black - Josepho's own colors
    spectrum: [
        { id: 'yellow', color: '#fff433' },
        { id: 'white', color: '#ffffff' },
        { id: 'purple', color: '#9b59d0' },
        { id: 'black', color: '#2c2c2c' },
    ],
    legend: {
        y: { kind: 'paint', gate: 'yellow', look: 'block' },
        u: { kind: 'paint', gate: 'purple', look: 'ledge' },
        q: { gate: 'black', kind: 'oneway', look: 'ledge' },
        w: { gate: 'white', kind: 'oneway', look: 'ledge' },
        // Discolorers: `dir` 1 fires right, -1 left, 'up' or 'down'; `rest` frames between shots; `phase` frames into
        // the rest at the start
        N: { kind: 'discolor', dir: 1, rest: 150 },
        K: { kind: 'discolor', dir: -1, rest: 150, phase: 75 },
        V: { kind: 'discolor', dir: 'up', rest: 80 },
    },

    startOn: ['sky', 'earth', 'green', 'bloom', 'yellow', 'purple'],

    theme: {
        background: 'tower',
        // climbing up: a little more of the Tower above Josepho on screen
        cameraAbove: 72,
        // a stone floor, black and white and grey
        colors: {
            DIRT_DK: '#34343e',
            DIRT: '#4a4a56',
            DIRT_LT: '#62626e',
            GRASS_DK: '#8c8c98',
            GRASS: '#c8c8d2',
            GRASS_LT: '#ffffff',
        },
    },

    freeGreylings: true,
    // a level that goes up as well as across: the test bot finds its way, and the check makes sure the flag can be
    // reached
    climb: true,

    talks: [
        {
            // at the top, by the mirror
            at: 1,
            row: 11,
            lines: [
                ['TŘÍDIČ', 'JSI ZTRACENÝ. ZTRACENÁ. ZTRACENÉ...'],
                ['JOSEPHO', 'NIKAM SE NEZTRÁCÍM. JSEM TADY.'],
            ],
        },
    ],

    // (signs are numbered in map order, top to bottom: here the highest comes first)
    signs: [
        'ČERNÁ NENÍ PRÁZDNOTA. TEĎ NESE.',
        'KOPNI DO KRABICE. A ODBARVOVAČ UMLKNE.',
        'ODBARVOVAČ SE PŘED VÝSTŘELEM NADECHNE. PŘESKOČ JEHO PAPRSEK.',
        'TŘÍDIČOVA VĚŽ. ČERNÁ A BÍLÁ TU PATŘÍ JEMU. ZATÍM.',
    ],

    prisms: [{ turnsOn: ['black', 'white'], banner: 'ČERNÁ A BÍLÁ JSOU ZPĚT VE VLAJCE' }],

    // the banner when the flag is reached
    finale: 'JSEM TADY',

    clearText: ['ODRAZ V ZRCADLE JE ZASE CELÝ. A KŘÍDLA MAJÍ BARVY VLAJKY.', 'TŘÍDIČ UTEKL DOLŮ. ZA NÍM SE VALÍ ŠEDÁ VLNA...'],
};

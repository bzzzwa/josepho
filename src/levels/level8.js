// level8.js - Level 8, "Vez protikladu" (The Tower of opposites). Josepho's own level.
// The Sorter's Tower, all black and white, rises over the tundra. Josepho climbs it floor by floor - up and to the
// right; whoever falls in the shaft between floors lands one floor down. Discolorers fire grey rays: paint ledges
// in a ray lose their color and their volume, and Josepho caught in one goes grey for a while. Josepho gives color
// back to whatever is close around them. A Skatulkar, stomped, leaves its box behind; a kicked box slides and
// shuts a Discolorer down for good. Black and white, which the Sorter took for its own, are stripes of Josepho's
// flag: once the prism gives them back, black ledges carry Josepho for the first time. At the top: the mirror.
// The plan is in docs/pribeh.md; the shape of a level file is described in src/levels/README.md.
//
// Legend (this level)
//   ,  backdrop    y  yellow paint block    u  purple paint ledge     (Discolorers turn them grey)
//   q  black ledge    w  white ledge     (they carry Josepho once the prism gives black and white back)
//   N  Discolorer firing right   K  Discolorer firing left   Q  a fast one, firing right
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
    // the map, row by row, in runs: 'R .*258 Z' is one R, 258 dots, one Z (expanded below)
    map: expand([
        'R .*275',
        'R .*275',
        'R .*275',
        'R .*275',
        'R .*275',
        'R .*249 Z .*15 F .*9',
        'R .*240 #*35',
        'R .*240 #*35',
        'R .*237 w*3 #*35',
        'R .*214 z .*25 #*35',
        'R .*213 w*3 .*18 w*3 .*3 #*35',
        'R .*240 #*35',
        'R .*209 q*3 .*19 w*3 .*6 #*35',
        'R .*240 #*35',
        'R .*228 w*3 .*9 #*35',
        'R .*198 l . s .*6 J .*6 p .*4 J .*20 #*35',
        'R .*196 #*79',
        'R .*196 #*79',
        'R .*193 q*3 #*79',
        'R .*163 o . o . o .*28 #*79',
        'R .*190 q*3 .*3 #*79',
        'R .*196 #*79',
        'R .*164 y*3 .*20 q*3 .*6 #*79',
        'R .*153 N .*42 #*79',
        'R .*159 u*3 .*7 u*3 .*12 q*3 .*9 #*79',
        'R .*181 K 1 .*13 #*79',
        'R .*148 #*6 y*3 ,*17 y*3 , y*3 #*94',
        'R .*148 #*6 ,*27 #*94',
        'R .*145 u*3 #*6 R ,*25 R #*94',
        'R .*148 #*6 R ,*25 R #*94',
        'R .*142 u*3 .*3 #*6 R*2 ,*23 R*2 #*94',
        'R .*148 #*6 R*2 , ^*21 , R*2 #*94',
        'R .*126 z .*12 u*3 .*6 #*6 R*2 #*23 R*2 #*94',
        'R .*148 #*6 R*2 #*23 R*2 #*94',
        'R .*136 u*3 .*9 #*6 R*2 #*23 R*2 #*94',
        'R .*102 l . s .*4 p .*9 Q .*28 #*6 R*2 #*23 R*2 #*94',
        'R .*100 #*20 u*14 #*20 R*2 #*23 R*2 #*94',
        'R .*100 #*20 ,*14 #*20 R*2 #*23 R*2 #*94',
        'R .*81 R .*15 u*3 #*20 R ,*12 R #*20 R*2 #*23 R*2 #*94',
        'R .*81 R .*18 #*20 R ,*12 R #*20 R*2 #*23 R*2 #*94',
        'R .*81 R .*12 u*3 .*3 #*20 R*2 ,*10 R*2 #*20 R*2 #*23 R*2 #*94',
        'R .*81 R .*18 #*20 R*2 , ^*8 , R*2 #*20 R*2 #*23 R*2 #*94',
        'R .*81 R .*9 u*3 .*6 #*20 R*2 #*10 R*2 #*20 R*2 #*23 R*2 #*94',
        'R .*65 o . o . o . o . o . o .*5 R .*18 #*20 R*2 #*10 R*2 #*20 R*2 #*23 R*2 #*94',
        'R .*88 u*3 .*9 #*20 R*2 #*10 R*2 #*20 R*2 #*23 R*2 #*94',
        'R .*54 l .*2 s .*23 K .*18 #*20 R*2 #*10 R*2 #*20 R*2 #*23 R*2 #*94',
        'R .*52 #*9 u*19 #*40 R*2 #*10 R*2 #*20 R*2 #*23 R*2 #*94',
        'R .*52 #*9 ,*19 #*40 R*2 #*10 R*2 #*20 R*2 #*23 R*2 #*94',
        'R .*49 u*3 #*9 R ,*17 R #*40 R*2 #*10 R*2 #*20 R*2 #*23 R*2 #*94',
        'R .*52 #*9 R ,*17 R #*40 R*2 #*10 R*2 #*20 R*2 #*23 R*2 #*94',
        'R .*46 u*3 .*3 #*9 R*2 ,*15 R*2 #*40 R*2 #*10 R*2 #*20 R*2 #*23 R*2 #*94',
        'R .*29 z .*22 #*9 R*2 ,*15 R*2 #*40 R*2 #*10 R*2 #*20 R*2 #*23 R*2 #*94',
        'R .*43 u*3 .*6 #*9 R*2 #*15 R*2 #*40 R*2 #*10 R*2 #*20 R*2 #*23 R*2 #*94',
        'R .*25 o . o . o .*22 #*9 R*2 #*15 R*2 #*40 R*2 #*10 R*2 #*20 R*2 #*23 R*2 #*94',
        'R .*40 u*3 .*9 #*9 R*2 #*15 R*2 #*40 R*2 #*10 R*2 #*20 R*2 #*23 R*2 #*94',
        'R N . @ . s .*47 #*9 R*2 #*15 R*2 #*40 R*2 #*10 R*2 #*20 R*2 #*23 R*2 #*94',
        'R #*5 y*15 #*41 R*2 #*15 R*2 #*40 R*2 #*10 R*2 #*20 R*2 #*23 R*2 #*94',
        'R #*61 R*2 #*15 R*2 #*40 R*2 #*10 R*2 #*20 R*2 #*23 R*2 #*94',
        'R #*61 R*2 #*15 R*2 #*40 R*2 #*10 R*2 #*20 R*2 #*23 R*2 #*94',
        'R #*61 R*2 #*15 R*2 #*40 R*2 #*10 R*2 #*20 R*2 #*23 R*2 #*94',
        'R #*61 R*2 #*15 R*2 #*40 R*2 #*10 R*2 #*20 R*2 #*23 R*2 #*94',
        'R #*61 R*2 #*15 R*2 #*40 R*2 #*10 R*2 #*20 R*2 #*23 R*2 #*94',
        'R #*61 R*2 #*15 R*2 #*40 R*2 #*10 R*2 #*20 R*2 #*23 R*2 #*94',
        'R #*61 R*2 #*15 R*2 #*40 R*2 #*10 R*2 #*20 R*2 #*23 R*2 #*94',
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
        // Discolorers: `dir` 1 fires right, -1 left; `rest` frames between shots; `phase` frames into the rest at start
        N: { kind: 'discolor', dir: 1, rest: 150 },
        K: { kind: 'discolor', dir: -1, rest: 150, phase: 75 },
        Q: { kind: 'discolor', dir: 1, rest: 70 },
    },

    startOn: ['sky', 'earth', 'green', 'bloom', 'yellow', 'purple'],

    theme: {
        background: 'tower',
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

    talks: [
        {
            at: 247,
            lines: [
                ['TŘÍDIČ', 'JSI ZTRACENÝ. ZTRACENÁ. ZTRACENÉ...'],
                ['JOSEPHO', 'NIKAM SE NEZTRÁCÍM. JSEM TADY.'],
            ],
        },
    ],

    signs: [
        'TŘÍDIČOVA VĚŽ. ČERNÁ A BÍLÁ TU PATŘÍ JEMU. ZATÍM.',
        'ODBARVOVAČ SE PŘED VÝSTŘELEM NADECHNE. PŘESKOČ JEHO PAPRSEK.',
        'KOPNI DO KRABICE. A ODBARVOVAČ UMLKNE.',
        'ČERNÁ NENÍ PRÁZDNOTA. TEĎ NESE.',
    ],

    prisms: [{ turnsOn: ['black', 'white'], banner: 'ČERNÁ A BÍLÁ JSOU ZPĚT VE VLAJCE' }],

    // the banner when the flag is reached
    finale: 'JSEM TADY',

    clearText: ['ODRAZ V ZRCADLE JE ZASE CELÝ. A KŘÍDLA MAJÍ BARVY VLAJKY.', 'TŘÍDIČ UTEKL DOLŮ. ZA NÍM SE VALÍ ŠEDÁ VLNA...'],
};

// level3.js - Level 3, "Opadavani" (Falling leaves) - TEST ROOM.
// A short room with the new elements of level 3, to try them before the real level is built: leaf blocks
// that bring a color back for a few seconds (taught in four steps), and the Skatulka boxes.
// The shape of a level file is described in src/levels/README.md.
//
// Legend (this level)
//   ,  backdrop (the dark wall at the back of a pit)
//   V  yellow leaf block (8 s)      Y  yellow leaf block (6 s)
//   O  orange leaf block (6 s)      Q  red leaf block (5 s)
//   y  yellow ledge   j  orange ledge   q  red ledge
//   k  Skatulka (a box in the ground)   z  lost shade
// Everything else as in level1.js.

export const LEVEL3 = {
    number: 3,
    name: 'OPADÁVÁNÍ',
    map: [
        '......................................................................................................................................................',
        '......................................................................................................................................................',
        '..............................z..........................................................................................................l...T....F...',
        '.............................yy....................................................................................................z..################',
        '..........................oo..........................................................................................................################',
        '..........................yy......................................................................................................qqq.################',
        '.......................oo..........................................O..................................................................################',
        '.................V.....yy.......Y..........ooo.........Y.................o.o.o.o.o....................o.o.o.............Q.....qqq.....################',
        '....................oo................................................................................................................################',
        '....................yy..................yyyyyy.......................jjjjjjjjjjjjjjjjj....................................qqq.........################',
        '.T.@..s..f..1.....................yyyyyy......yyyyyy.....yyyyyyyyyyyy..................l....s..T..k..f...k..T..k......................################',
        '##################################,,,,,,,,,,,,,,,,,,#####,,,,,,,,,,,,,,,,,,,,,,,,,,,,,################################################################',
        '##################################,,,,,,,,,,,,,,,,,,#####,,,,,,,,,,,,,,,,,,,,,,,,,,,,,################################################################',
        '##################################R,,,,,,,,,,,,,,,,,#####R,,,,,,,,,,,,,,,,,,,,,,,,,,,,################################################################',
        '##################################R,,,,,,,,,,,,,,,,,#####R,,,,,,,,,,,,,,,,,,,,,,,,,,,,################################################################',
        '##################################RR,,,,,,,,,,,,,,,,#####RR,,,,,,,,,,,,,,,,,,,,,,,,,,,################################################################',
        '##################################RR,,,,,,,,,,,,,,,,#####RR,,,,,,,,,,,,,,,,,,,,,,,,,z,################################################################',
        '##################################RR#####################RR###########################################################################################',
    ],

    // the colors of turning leaves; the Sorter keeps only green (alive) and brown (dead)
    spectrum: [
        { id: 'yellow', color: '#e9c43a' },
        { id: 'orange', color: '#e8812b' },
        { id: 'red', color: '#c8412b' },
    ],
    legend: {
        V: { kind: 'timer', gate: 'yellow', seconds: 8 },
        Y: { kind: 'timer', gate: 'yellow', seconds: 6 },
        O: { kind: 'timer', gate: 'orange', seconds: 6 },
        Q: { kind: 'timer', gate: 'red', seconds: 5 },
        y: { gate: 'yellow', kind: 'oneway', look: 'ledge' },
        j: { gate: 'orange', kind: 'oneway', look: 'ledge' },
        q: { gate: 'red', kind: 'oneway', look: 'ledge' },
    },

    // the sky and the flowers are back since level 1; the forest itself is grey
    startOn: ['sky', 'bloom'],

    theme: {
        // olive grass, brown-orange hills, autumn trees and falling leaves
        colors: {
            GRASS_DK: '#5a6a2a',
            GRASS: '#8a9a3a',
            GRASS_LT: '#c2b84a',
            MID: '#7a4f2a',
            MID_HI: '#b8803a',
        },
        tree: 'treeAutumn',
        leaves: true,
    },

    signs: [
        'ZKUŠEBNA PODZIMU. LISTOVÝ BLOK VRÁTÍ BARVU JEN NA CHVÍLI. POSPĚŠ SI.',
        'ŠKATULKA KOUŠE, KDYŽ JE OTEVŘENÁ. ZAVŘENOU ZAKLAPNI SKOKEM.',
    ],

    prisms: [{ turnsOn: ['green', 'earth'], banner: 'VRACÍ SE ZELENÁ A HNĚDÁ' }],

    clearText: ['LISTÍ SE ZNOVU BARVÍ VŠEMI ODSTÍNY PODZIMU.', 'ZE ŠEDIVCE VYLÉTLA BARVA. MOŽNÁ TO NEJSOU NEPŘÁTELÉ...'],
};

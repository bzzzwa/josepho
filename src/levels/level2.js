// level2.js - Level 2, "Melciny" (Shallows) - TEST ROOM.
// A short room with every new element of level 2, to try them before the real level is built:
// the tide switch taught in four steps, swimming, driftwood, leaping fish, drained water and lost shades.
// The shape of a level file is described in src/levels/README.md.
//
// Legend (this level)
//   ,  backdrop (the dark wall at the back of a pit)
//   P  tide switch - flips between the shallows and the deep water
//   m  shallow block        M  shallow ledge       w  shallow water
//   N  deep ledge           W  deep water
//   d  driftwood            r  leaping fish        z  lost shade
// Everything else as in level1.js.

export const LEVEL2 = {
    number: 2,
    name: 'MĚLČINY',
    map: [
        '..............................................................................................................................................................',
        '..............................................................................................................................................................',
        '..............................................................................................................................................................',
        '......................m.......................................................................................................................................',
        '......................m.......................................................................................................................................',
        '......................m..........................P..............................................................................................z.............',
        '......................moooo......................................................P.............................................................MMM............',
        '..................P...mNNNNP........................ooo...........P................................P............................P.............P...............',
        '......................m.....................................................................................o.o.o.............................................',
        '......................m.......................MMMMM...........................................................................................................',
        '.T.@..s...f..1.s......m......MMMMMMMMMMMMMM.....NNNNNNNNNNNNNNNNN...MMMMMMMMMMMMMMM.............ls........d...........d........s............l......T..F.f.T...',
        '#############################,,,,,,,,,,,,,,###,,,,,,,,,,,,,,,,,,,###,,,,,,,,,,,,NNNNNNNNNNNNNNN#####wwwwwwwwwwwwwwwwwwwwwwwwww###WWWWWWWWWW###################',
        '#############################,,,,,,,,,,,,,,###,,,,,,,,,,,,,,,,,,,###,,,,,,,,,,,,,,,,,,,,,,,,,,,#####wwwwwwwwwwwwrwwwwwwwwwrwww###WWWWWWWWWW###################',
        '#############################R,,,,,,,,,,,,,###R,,,,,,,,,,,,,,,,,,###R,,,,,,,,,,,,,,,,,,,,,,,,,,#####wwwwwwwwwwwwwwwzwwwwwwwwww###WWWWrWWWWR###################',
        '#############################R,,,,,,,,,,,,,###R,,,,,,,,,,,,,,,,,,###R,,,,,,,,,,,,,,,,,,,,,,,,,,##################################WWzWWWWWWR###################',
        '#############################RR,,,,,,,,,,,,###RR,,,,,,,,,,,,,,,,,###RR,,,,,,,,,,,,,,,,,,,,,,,,,###############################################################',
        '#############################RR,,,,,,,,,,,,###RR,,,,,,,,,,,,,,,,,###RR,,,,,,,,,,,,,,,,,,,,,,,,,###############################################################',
        '#############################RR###############RR####################RR########################################################################################',
    ],

    // the sea: shallows (turquoise) and deep water (dark blue)
    spectrum: [
        { id: 'shallow', color: '#3cc4c9' },
        { id: 'deep', color: '#1b5e99' },
    ],
    legend: {
        m: { gate: 'shallow' },
        M: { gate: 'shallow', kind: 'oneway', look: 'ledge' },
        w: { gate: 'shallow', kind: 'water', look: 'water' },
        N: { gate: 'deep', kind: 'oneway', look: 'ledge' },
        W: { gate: 'deep', kind: 'water', look: 'water' },
    },
    // the tide switches (P) flip between these two
    switches: ['shallow', 'deep'],

    // what level 1 brought back is still there; the sea is grey
    startOn: ['sky', 'earth', 'green', 'bloom'],

    theme: {
        // sand instead of earth, dune grass, palms and the open sea behind
        colors: {
            DIRT_DK: '#a67c4e',
            DIRT: '#d4ae74',
            DIRT_LT: '#ecd29a',
            GRASS_DK: '#4f8a3e',
            GRASS: '#79b04c',
            GRASS_LT: '#b6d86a',
        },
        tree: 'palm',
        background: 'sea',
    },

    signs: [
        'ZKUŠEBNA MĚLČIN. TADY SE ZKOUŠÍ PŘÍLIV, PLAVÁNÍ A RYBY.',
        'BLOK PŘÍLIVU PŘEHODÍ VODU. CO SVÍTÍ, UNESE TĚ.',
        'V BAREVNÉ VODĚ SE PLAVE. SKOK JE TEMPO.',
        'ŠEDÁ VODA NENESE. POD NÍ JE DNO.',
    ],

    prisms: [{ turnsOn: ['shallow'], banner: 'VRACÍ SE MĚLČINA' }],

    clearText: ['PŘÍLIV SE VRACÍ A MOŘE ZNOVU DÝCHÁ.', 'ŠKATULKÁŘI ALE ODNÁŠEJÍ SVÉ NÁDRŽE DÁL NA SEVER...'],
};

// level7.js - Level 7, "Polarni zare" (Northern lights).
// The far north. The Sorter tries to sort the tundra: ice here, water there, animals in one box, plants in another,
// north apart from south. Nature cannot be sorted - everything is connected - and the aurora itself comes from a
// relationship: the Earth's magnetic field has two poles but exists only between them, its field lines are neither
// straight nor black-and-white, and the aurora lights up where the solar wind meets them. The aurora pulses in a
// rhythm: its ledges carry Josepho only in their color's turn. Compass stones raise field lines - the first curved
// bridges - but only once both poles of a pair are awake. Ice, gusts of wind, icicles under an overhang, the
// arctic fox (white in winter, brown in summer), lichen, and fences on the tundra that freed greylings take apart.
// The plan is in docs/pribeh.md; the shape of a level file is described in src/levels/README.md.
//
// Legend (this level)
//   ,  backdrop    I  ice    E  a fence (a freed greyling nearby takes it apart)
//   y  green aurora ledge    u  violet aurora ledge      (they carry Josepho in their color's turn)
//   N S  compass stones, pair 1 (north dark, south awake)    A  their field line
//   M W  compass stones, pair 2                               g v  their field line, green and violet in turns
//   i  icicle    a  arctic fox    z  lost shade
// Everything else as in level1.js.

export const LEVEL7 = {
    number: 7,
    name: 'POLÁRNÍ ZÁŘE',
    map: [
        '......................................................................................................................................................................................................................................................................',
        '......................................................................................................................................................................................................................................................................',
        '......................................................................................................................................................................................................................................................................',
        '......................................................................................................................................................................................................................................................................',
        '......................................................................................................................................................................................................................................................................',
        '......................................................................................................................................................................................................................................................................',
        '......................................................................................................................................................................................................................................................................',
        '......................................................................................................................................................o.o.o........................................z..................................................................',
        '........................................................................................................................................................................................RRRRRRRRRRRRRRRRR.............................................................',
        '........................................................................................................................................................................................RRRRRRRRRRRRRRRRR....................EE..........EE...........................',
        '................................................................................................................z...................................vvvvvgggggg............................i....i....i.......................EE..........EE...........................',
        '..............o.o.o.............................z...........................................................AAAAAAAAA...........................vvvv...........ggvv..........................................................EE..........EE.....o.o.o.o...............',
        '.................................o.o..........o.o.o.o.............o.o.o...o.o.o...o.o.o..................AAA.........AAA.....................ggg...................vvv.......................................................EE..........EE...........................',
        '.......................................................................................................AA...............AA.................gg.........................vv.....................................................EE..........EE...........................',
        '...@.s..................a...............s..................................................l....s.N..AA...................AA..S...l...M..gg.............................vv..W...l....s...........................l....e......EE....e.....EE...a.............F.........',
        '##########IIIIIIIIIIIIIIIIIIIII##############yyyyyyyy##########yyyyyyyyuuuuuuuuyyyyyyyyyy###########A,,,,,,,,,,,,,,,,,,,,,,,A###########g,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,g#############IIIIIIIIIIIIIIIII#############################################################',
        '#############################################,,,,,,,,##########,,,,,,,,,,,,,,,,,,,,,,,,,,###########,,,,,,,,,,,,,,,,,,,,,,,,,###########,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,###########################################################################################',
        '###############################################################R,,,,,,,,,,,,,,,,,,,,,,,,,###########R,,,,,,,,,,,,,,,,,,,,,,,,###########R,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,###########################################################################################',
        '###############################################################R,,,,,,,,,,,,,,,,,,,,,,,,,###########R,,,,,,,,,,,,,,,,,,,,,,,,###########R,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,###########################################################################################',
        '###############################################################R####################################R###################################R#############################################################################################################################',
    ],

    // the colors of the real aurora: green and red (oxygen), violet and pink (nitrogen)
    spectrum: [
        { id: 'green', color: '#4dffa0' },
        { id: 'red', color: '#ff5a6a' },
        { id: 'violet', color: '#9a7bff' },
        { id: 'pink', color: '#ff8fd6' },
    ],
    legend: {
        y: { kind: 'pulse', gate: 'green', look: 'ledge' },
        u: { kind: 'pulse', gate: 'violet', look: 'ledge' },
        N: { kind: 'pole', pair: 1, side: 'N', gate: 'red' },
        S: { kind: 'pole', pair: 1, side: 'S', gate: 'red', awake: true, turnsOn: ['red', 'green'] },
        A: { kind: 'arc', pair: 1, gate: 'red', look: 'ledge' },
        M: { kind: 'pole', pair: 2, side: 'N', gate: 'violet' },
        W: { kind: 'pole', pair: 2, side: 'S', gate: 'violet', awake: true, turnsOn: ['violet', 'pink'] },
        g: { kind: 'arc', pair: 2, gate: 'green', look: 'ledge', pulses: true },
        v: { kind: 'arc', pair: 2, gate: 'violet', look: 'ledge', pulses: true },
    },
    // the aurora's rhythm: each color's turn lasts `period` frames (2 seconds), in this order
    pulse: { period: 120, order: ['green', 'violet'] },
    // gusts of wind: every `period` frames, `warn` frames of snow blowing sideways first, then `gust` frames of
    // wind pushing Josepho (pixels per frame, half as much on the ground), inside the zones (columns)
    wind: {
        period: 360,
        warn: 60,
        gust: 100,
        strength: 0.6,
        zones: [
            [12, 40],
            [140, 170],
        ],
    },

    startOn: ['sky', 'earth', 'green', 'bloom'],

    theme: {
        background: 'tundra',
        snow: true,
        // snow on frozen ground
        colors: {
            DIRT_DK: '#4a5468',
            DIRT: '#5d6a80',
            DIRT_LT: '#76849a',
            GRASS_DK: '#9fb0c8',
            GRASS: '#d8e4f0',
            GRASS_LT: '#ffffff',
        },
    },

    freeGreylings: true,

    talks: [
        {
            at: 128,
            lines: [
                ['TŘÍDIČ', 'BEZ KRABIC JE CHAOS. KRABICE JSOU BEZPEČÍ.'],
                ['JOSEPHO', 'PODÍVEJ SE NAHORU. I SEVER POTŘEBUJE JIH. JINAK BY NEBYLA ZÁŘE.'],
            ],
        },
    ],

    signs: [
        'TŘÍDIČ CHTĚL ODDĚLIT LED OD VODY. JENŽE LED JE VODA.',
        'POLÁRNÍ ZÁŘE DÝCHÁ V RYTMU. PŘED KAŽDÝM NÁDECHEM ZAZNÍ TÓN.',
        'SEVERNÍ PÓL SÁM NIC NEZMŮŽE. JEN SPOLU S JIŽNÍM VYTVOŘÍ SILOČÁRU.',
        'LIŠEJNÍK JE HOUBA I ŘASA. DO ŽÁDNÉ KRABICE SE NEVEJDE.',
    ],

    // the banner when the flag is reached
    finale: 'NEBE ZASE TANČÍ',

    clearText: ['ZÁŘE SE VLNÍ NAD TUNDROU A SOBI ZASE TÁHNOU.', 'NA OBZORU ALE ČNÍ VĚŽ. TŘÍDIČ TAM ČEKÁ...'],
};

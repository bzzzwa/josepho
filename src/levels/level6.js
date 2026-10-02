// level6.js - Level 6, "Urad" (The office).
// The Sorter's office: endless corridors of filing cabinets, belts carrying boxes, and forms with two boxes to tick -
// blue, or pink. There is no third box. Lamps hang under the ceiling and shine magenta or blue; beam ledges have
// volume only in the light of their color, and lavender ones only where the two lights meet - the way light
// really mixes, and the middle stripe of the bi flag. Stamps come down on whoever steps under them; sorting belts
// carry you along. Sections: the registry, a fixed lamp, riding a moving lamp, lavender where the lights meet, two
// lamps meeting in the middle, the filing room (belts under stamps) and the flag.
// The plan is in docs/pribeh.md; the shape of a level file is described in src/levels/README.md.
//
// Legend (this level)
//   ,  backdrop (the dark wall at the back of a pit)
//   H  magenta lamp (fixed)          M, O, Q  blue lamps riding their rails    N  magenta lamp riding its rail
//   j  magenta beam ledge    u  blue beam ledge    v  lavender beam ledge (needs both lights)
//   > <  slow belts    } {  fast belts    x  stamp    c  clerk    z  lost shade
// Everything else as in level1.js.

export const LEVEL6 = {
    number: 6,
    name: 'ÚŘAD',
    map: [
        'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR',
        'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR',
        'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR',
        'RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR',
        '...............................x..........H..........M.................................H..............................N.............................Q...............x.....x.................x.....x...................................................................',
        '.......................................................................................O..............................................................................................................................................................................',
        '..........................................z...........................................................................................................................................................................................................................',
        '.........................................jjj..........................................................................................................................................................................................................................',
        '..........................................o...........................................................................................................................................................................................................................',
        '.........................................jjj..........................................................................................................................................................................................................................',
        '..........................................o...................................................................................................................................z.......................................................................................',
        '.........................................jjj................................................................................................................................====..............................o.o.o.o.o...............................................',
        '.....................o.o.o................o.............o.o.o.o.o.o.o.........................o.o.o.o.o.................o.o.o..o.o....o.o.o.o.o.......................................................................................................................',
        '.........................................jjj..........................................................................................................................................................................................................................',
        '...@.s...c...c...e.................s......................................l........s........................l................................................s......................l..........z.............e.......e........c...c.............c...f.....F...f.......',
        '####################>>>>>>>>#########################uuuuuuuuuuuuuuuuuu###############vvvuuuuuuuuuuuuuuuuu############jjjjjjjjjvvvuuuuuuuuuuuuuuuuuuu###########}}}}}}}}}}}}}}}}}#######<<<<<<<<<<<<<<<###############################################################',
        '#####################################################,,,,,,,,,,,,,,,,,,###############,,,,,,,,,,,,,,,,,,,,############,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#################################################################################################################',
        '#####################################################R,,,,,,,,,,,,,,,,,###############R,,,,,,,,,,,,,,,,,,,############R,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#################################################################################################################',
        '#####################################################R,,,,,,,,,,,,,,,,,###############R,,,,,,,,,,,,,,,,,,,############R,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#################################################################################################################',
        '#####################################################RR,,,,,,,,,,,,,,,,###############RR,,,,,,,,,,,,,,,,,,############RR,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#################################################################################################################',
        '#####################################################RR,,,,,,,,,,,,,,,,###############RR,,,,,,,,,,,,,,,,,,############RR,,,,,,,,,,,,,,,,,,,,,,,,,,,,,#################################################################################################################',
        '#####################################################RR###############################RR##############################RR##############################################################################################################################################',
    ],

    // the bi flag: magenta, lavender (where the two meet) and blue
    spectrum: [
        { id: 'magenta', color: '#e0368a' },
        { id: 'lavender', color: '#a86bbd' },
        { id: 'blue', color: '#4f7fe8' },
    ],
    legend: {
        // lamps: range in tiles (+ right first, - left first), speed in pixels per frame
        H: { kind: 'lamp', gate: 'magenta' },
        M: { kind: 'lamp', gate: 'blue', range: 17, speed: 0.4 },
        O: { kind: 'lamp', gate: 'blue', range: 17, speed: 0.35 },
        // step 4: wide lights, so where they meet the last magenta, the lavender and the first blue ledge are all lit
        N: { kind: 'lamp', gate: 'magenta', range: 10, speed: 0.35, width: 5 },
        Q: { kind: 'lamp', gate: 'blue', range: -20, speed: 0.7, width: 5 },
        j: { kind: 'beam', gate: 'magenta', look: 'ledge' },
        u: { kind: 'beam', gate: 'blue', look: 'ledge' },
        v: { kind: 'beam', gate: 'lavender', look: 'ledge', needs: ['magenta', 'blue'] },
    },

    startOn: ['sky', 'earth', 'green', 'bloom'],

    theme: {
        background: 'office',
        // the camera keeps Josepho this far below the top of the screen: floor and ceiling (with its lamps and
        // stamps) both on screen
        cameraAbove: 88,
        // grey-blue linoleum instead of earth and grass
        colors: {
            DIRT_DK: '#2b2e44',
            DIRT: '#383c56',
            DIRT_LT: '#464b68',
            GRASS_DK: '#3e4462',
            GRASS: '#555c80',
            GRASS_LT: '#7780a6',
        },
    },

    freeGreylings: true,

    talks: [
        {
            at: 110,
            lines: [
                ['TŘÍDIČ', 'VYPLŇ KOLONKU. MODRÁ, NEBO RŮŽOVÁ?'],
                ['JOSEPHO', 'OBĚ. A TO, CO VZNIKNE, KDYŽ SE POTKAJÍ.'],
            ],
        },
    ],

    signs: [
        'ÚŘAD TŘÍDIČE. KAŽDÁ VĚC TU MÁ KOLONKU. MODROU, NEBO RŮŽOVOU.',
        'PURPUROVÉ ŘÍMSY NESOU JEN V PURPUROVÉM SVĚTLE. MODRÉ V MODRÉM.',
        'KDE SE DVĚ SVĚTLA POTKAJÍ, VZNIKNE TŘETÍ BARVA. TAKOVOU KOLONKU TU NEMAJÍ.',
        'KARTOTÉKA. RAZÍTKO SE PŘED ÚDEREM TŘESE. PROBĚHNI, NEBO POČKEJ.',
    ],

    // the banner when the flag is reached
    finale: 'BARVY SE ZASE MÍSÍ',

    clearText: ['KOLONKY SE ROZPOUŠTĚJÍ A BARVY SE ZASE MÍSÍ.', 'NA SEVERU ALE NEBE ŠEDNE. TŘÍDIČ ZHASÍNÁ I POLÁRNÍ ZÁŘI...'],
};

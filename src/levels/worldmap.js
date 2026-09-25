// worldmap.js - the land of Lumen as the world map shows it: one node per level, in story order.
//
// x, y      where the node sits on the 192 x 108 map screen
// flag      the level's spectrum as a small flag (top stripe first); it turns from grey to color when the
//           level is finished. Up to 6 colors.
// region    what the map draws around the node: meadow, coast, forest, lake, cave, city, tundra, tower,
//           road, cube
// The levels themselves live in src/levels/levelN.js and are listed in src/levels/index.js. A node without a
// level file yet shows up on the map as "coming soon".

export const WORLD = {
    name: 'LUMEN',
    nodes: [
        {
            number: 1,
            name: 'SVÍTÁNÍ',
            x: 20,
            y: 72,
            region: 'meadow',
            flag: ['#e40303', '#ff8c00', '#ffed00', '#008026', '#004dff', '#750787'],
        },
        {
            number: 2,
            name: 'MĚLČINY',
            x: 44,
            y: 76,
            region: 'coast',
            flag: ['#7fe3d8', '#3cc4c9', '#1f8fb8', '#1b5e99', '#163a6b', '#0d1f40'],
        },
        {
            number: 3,
            name: 'OPADÁVÁNÍ',
            x: 64,
            y: 60,
            region: 'forest',
            flag: ['#4f9a3a', '#d6c42a', '#e8912b', '#c8452b', '#7a4a2b'],
        },
        {
            number: 4,
            name: 'DVA BŘEHY',
            x: 44,
            y: 44,
            region: 'lake',
            // trans flag: blue, pink, white, pink, blue
            flag: ['#5bcefa', '#f5a9b8', '#ffffff', '#f5a9b8', '#5bcefa'],
        },
        {
            number: 5,
            name: 'ARCHIV',
            x: 72,
            y: 32,
            region: 'cave',
            flag: ['#ff3b1f', '#ff8a2a', '#ffd27a', '#fff6e8', '#bfd8ff'],
        },
        {
            number: 6,
            name: 'ÚŘAD',
            x: 102,
            y: 46,
            region: 'city',
            // bi flag: magenta, magenta, lavender, blue, blue
            flag: ['#d60270', '#d60270', '#9b4f96', '#0038a8', '#0038a8'],
        },
        {
            number: 7,
            name: 'POLÁRNÍ ZÁŘE',
            x: 122,
            y: 24,
            region: 'tundra',
            flag: ['#3dff9a', '#1fd1c1', '#4a7dff', '#b45cff', '#ff6fb5'],
        },
        {
            number: 8,
            name: 'VĚŽ PROTIKLADŮ',
            x: 146,
            y: 42,
            region: 'tower',
            // nonbinary flag: yellow, white, purple, black
            flag: ['#fcf434', '#ffffff', '#9c59d1', '#2c2c2c'],
        },
        {
            number: 9,
            name: 'ŠEDÁ VLNA',
            x: 158,
            y: 66,
            region: 'road',
            // placeholder: the spectrum of level 9 is still to be decided (see docs/pribeh.md)
            flag: ['#f6ede4', '#e7c7a9', '#c69c72', '#9b6b43', '#6b4429', '#3b2219'],
        },
        {
            number: 10,
            name: 'TŘÍDÍRNA',
            x: 176,
            y: 28,
            region: 'cube',
            flag: ['#e40303', '#ff8c00', '#ffed00', '#008026', '#004dff', '#750787'],
        },
    ],
};

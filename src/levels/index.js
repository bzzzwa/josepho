// index.js - every playable level, in order. Level N is LEVELS[N - 1].
// To add a level: create levelN.js (copy the shape of level1.js, see README.md here), import it below and
// append it. Its node on the world map is in worldmap.js.

import { LEVEL1 } from './level1.js';

export const LEVELS = [LEVEL1];

export function levelByNumber(number) {
    return LEVELS.find((level) => level.number === number) ?? null;
}

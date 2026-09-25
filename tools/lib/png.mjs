// png.mjs - writes RGB pixels as a PNG file (no dependencies; Node's zlib does the compression).

import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    return c >>> 0;
});

function crc(buf) {
    let c = 0xffffffff;
    for (const b of buf) {
        c = CRC_TABLE[(c ^ b) & 255] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
}

/** rgb: w * h * 3 bytes. scale: each pixel becomes scale x scale. */
export function writePng(path, w, h, rgb, scale = 1) {
    const W = w * scale;
    const H = h * scale;
    const raw = Buffer.alloc((W * 3 + 1) * H);
    for (let y = 0; y < H; y++) {
        const row = y * (W * 3 + 1);
        raw[row] = 0;
        for (let x = 0; x < W; x++) {
            const s = (Math.floor(y / scale) * w + Math.floor(x / scale)) * 3;
            const d = row + 1 + x * 3;
            raw[d] = rgb[s];
            raw[d + 1] = rgb[s + 1];
            raw[d + 2] = rgb[s + 2];
        }
    }
    const header = Buffer.alloc(13);
    header.writeUInt32BE(W, 0);
    header.writeUInt32BE(H, 4);
    header[8] = 8; // bit depth
    header[9] = 2; // RGB
    writeFileSync(
        path,
        Buffer.concat([
            Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
            chunk('IHDR', header),
            chunk('IDAT', deflateSync(raw)),
            chunk('IEND', Buffer.alloc(0)),
        ]),
    );
}

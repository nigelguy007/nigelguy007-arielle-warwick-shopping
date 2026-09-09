// Generates PWA icons without native deps: a rounded accent square with a white "A" mark.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const ACCENT = [255, 79, 31];
const crcTable = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
const crc32 = (buf) => {
  let c = -1;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

function png(size, maskable) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const r = maskable ? 0 : size * 0.22;
  const pad = maskable ? 0 : 0;
  const cx = size / 2;
  // "A" glyph: two strokes + crossbar, in a coordinate box
  const stroke = size * 0.11;
  const top = size * 0.26, bottom = size * 0.76, half = size * 0.2;
  const dist = (px, py, ax, ay, bx, by) => {
    const vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
    const t = Math.max(0, Math.min(1, (vx * wx + vy * wy) / (vx * vx + vy * vy)));
    return Math.hypot(px - (ax + t * vx), py - (ay + t * vy));
  };
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const o = y * (size * 4 + 1) + 1 + x * 4;
      const dx = Math.max(Math.abs(x - cx) - (cx - r - pad), 0);
      const dy = Math.max(Math.abs(y - cx) - (cx - r - pad), 0);
      const inside = Math.hypot(dx, dy) <= r;
      if (!inside) { raw[o + 3] = 0; continue; }
      const inA = dist(x, y, cx, top, cx - half, bottom) < stroke / 2 || dist(x, y, cx, top, cx + half, bottom) < stroke / 2 || (Math.abs(y - size * 0.6) < stroke * 0.38 && Math.abs(x - cx) < half * 0.62);
      const [cr, cg, cb] = inA ? [255, 255, 255] : ACCENT;
      raw[o] = cr; raw[o + 1] = cg; raw[o + 2] = cb; raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

mkdirSync("public/icons", { recursive: true });
for (const [name, size, maskable] of [["icon-192.png", 192, false], ["icon-512.png", 512, false], ["icon-maskable-512.png", 512, true], ["apple-touch-icon.png", 180, true]]) {
  writeFileSync(`public/icons/${name}`, png(size, maskable));
  console.log("wrote", name);
}

#!/usr/bin/env node
// Generate electron/icons/icon.ico from icon.png — pure Node + macOS `sips`,
// no external deps. Produces a multi-resolution ICO with PNG-compressed
// entries (supported by Windows Vista and later, which covers electron-builder
// NSIS targets). Run from the repo root: `node scripts/make-ico.js`.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SRC = path.join(__dirname, '..', 'electron', 'icons', 'icon.png');
const OUT = path.join(__dirname, '..', 'electron', 'icons', 'icon.ico');
const SIZES = [16, 24, 32, 48, 64, 128, 256];

if (!fs.existsSync(SRC)) {
  console.error(`Source not found: ${SRC}`);
  process.exit(1);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kinward-ico-'));
const images = SIZES.map((size) => {
  const p = path.join(tmp, `icon-${size}.png`);
  execFileSync('sips', ['-z', String(size), String(size), SRC, '--out', p], {
    stdio: 'ignore',
  });
  return { size, data: fs.readFileSync(p) };
});

// ICONDIR header (6 bytes) + N * ICONDIRENTRY (16 bytes each)
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: 1 = icon
header.writeUInt16LE(images.length, 4); // image count

const entries = [];
let offset = 6 + images.length * 16;
for (const img of images) {
  const e = Buffer.alloc(16);
  e.writeUInt8(img.size >= 256 ? 0 : img.size, 0); // width (0 => 256)
  e.writeUInt8(img.size >= 256 ? 0 : img.size, 1); // height (0 => 256)
  e.writeUInt8(0, 2); // palette count
  e.writeUInt8(0, 3); // reserved
  e.writeUInt16LE(1, 4); // color planes
  e.writeUInt16LE(32, 6); // bits per pixel
  e.writeUInt32LE(img.data.length, 8); // bytes in resource
  e.writeUInt32LE(offset, 12); // offset of image data
  offset += img.data.length;
  entries.push(e);
}

fs.writeFileSync(OUT, Buffer.concat([header, ...entries, ...images.map((i) => i.data)]));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`Wrote ${OUT} (${SIZES.length} sizes, ${fs.statSync(OUT).size} bytes)`);

/* Generates every site icon from src/assets/logo-flame.png.
 *
 * Run with:  node scripts/make-icons.js
 * Not part of the build — the outputs are committed, like campuses.json. Rerun
 * it only when the logo changes.
 *
 * WHY THIS EXISTS
 * public/ still contained the Create React App defaults: favicon.ico, logo192
 * and logo512 were all the React atom, and manifest.json literally said
 * "Create React App Sample". That is what Google was showing next to
 * savorscout.net in search results.
 *
 * WHY IT IS HAND-ROLLED
 * The source logo is 182x256 — not square — and Google requires a square icon
 * whose dimensions are a multiple of 48. That means resizing and padding, and
 * this machine has no sharp, no ImageMagick and no Pillow. Rather than add a
 * native dependency to a project that does not otherwise need one, this decodes
 * and encodes PNG directly: Node ships zlib, and the source is the simplest
 * possible case (8-bit RGBA, non-interlaced).
 *
 * The downscale is an area average rather than bilinear. Every output here is
 * smaller than the source, and for downscaling a box filter keeps far more of
 * the flame's thin highlights than bilinear sampling does — visible at 16px,
 * which is the size that matters most.
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const SRC = path.join(__dirname, "..", "src", "assets", "logo-flame.png");
const OUT = path.join(__dirname, "..", "public");

/* Brand dark, the same value the app uses for its background and the type-page
   SVGs. A tile rather than a transparent flame: transparent icons disappear
   against a background that happens to match them, and a solid mark stays the
   same shape everywhere Google, Chrome and iOS put it. */
const BG = { r: 0x0c, g: 0x09, b: 0x12 };
const PAD = 0.06;      // fraction of the tile left empty around the flame
const RADIUS = 0.20;   // corner radius as a fraction of tile size

/* ---- PNG decode ------------------------------------------------------------ */

function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");
  let pos = 8, width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9]; interlace = data[12];
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
    throw new Error(`unsupported PNG: bitDepth=${bitDepth} colorType=${colorType} interlace=${interlace}`);
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 4, stride = width * bpp;
  const out = Buffer.alloc(height * stride);

  /* Undo the per-scanline filter. Each row is prefixed with a filter byte; the
     five filters are defined in the PNG spec and all reference the pixel to the
     left (a), above (b) and above-left (c). */
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= bpp ? prev[i - bpp] : 0;
      let v = src[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      cur[i] = v & 0xff;
    }
  }
  return { width, height, data: out };
}

/* ---- PNG encode ------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const filtered = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    filtered[y * (stride + 1)] = 0;                       // filter: None
    rgba.copy(filtered, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(filtered, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ---- resize and compose ---------------------------------------------------- */

/* Area average. Each destination pixel takes the mean of the source rectangle
   it covers, weighted by alpha so transparent edges do not drag colour toward
   black. */
function resize(src, sw, sh, dw, dh) {
  const out = Buffer.alloc(dw * dh * 4);
  const xr = sw / dw, yr = sh / dh;
  for (let y = 0; y < dh; y++) {
    const y0 = Math.floor(y * yr), y1 = Math.max(y0 + 1, Math.ceil((y + 1) * yr));
    for (let x = 0; x < dw; x++) {
      const x0 = Math.floor(x * xr), x1 = Math.max(x0 + 1, Math.ceil((x + 1) * xr));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = y0; sy < Math.min(y1, sh); sy++) {
        for (let sx = x0; sx < Math.min(x1, sw); sx++) {
          const i = (sy * sw + sx) * 4, al = src[i + 3] / 255;
          r += src[i] * al; g += src[i + 1] * al; b += src[i + 2] * al;
          a += src[i + 3]; n++;
        }
      }
      const o = (y * dw + x) * 4, aa = a / n;
      const wsum = (a / 255) || 1e-6;
      out[o] = Math.round(r / wsum); out[o + 1] = Math.round(g / wsum);
      out[o + 2] = Math.round(b / wsum); out[o + 3] = Math.round(aa);
    }
  }
  return out;
}

/* Coverage of a rounded rectangle at (x,y), sampled 2x2 so the corners are not
   jagged at 16px. */
function tileAlpha(x, y, size, radius) {
  let hits = 0;
  for (const dy of [0.25, 0.75]) for (const dx of [0.25, 0.75]) {
    const px = x + dx, py = y + dy;
    const cx = px < radius ? radius : px > size - radius ? size - radius : px;
    const cy = py < radius ? radius : py > size - radius ? size - radius : py;
    if ((px - cx) ** 2 + (py - cy) ** 2 <= radius * radius) hits++;
  }
  return hits / 4;
}

function makeIcon(src, size) {
  const out = Buffer.alloc(size * size * 4);
  const radius = size * RADIUS;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const o = (y * size + x) * 4, a = tileAlpha(x, y, size, radius);
      out[o] = BG.r; out[o + 1] = BG.g; out[o + 2] = BG.b;
      out[o + 3] = Math.round(a * 255);
    }
  }

  const box = size * (1 - PAD * 2);
  const scale = Math.min(box / src.width, box / src.height);
  const lw = Math.max(1, Math.round(src.width * scale));
  const lh = Math.max(1, Math.round(src.height * scale));
  const logo = resize(src.data, src.width, src.height, lw, lh);
  const ox = Math.round((size - lw) / 2), oy = Math.round((size - lh) / 2);

  /* Source-over compositing of the flame onto the tile. */
  for (let y = 0; y < lh; y++) {
    for (let x = 0; x < lw; x++) {
      const s = (y * lw + x) * 4, d = ((y + oy) * size + (x + ox)) * 4;
      const sa = logo[s + 3] / 255;
      if (sa === 0) continue;
      const da = out[d + 3] / 255;
      const oa = sa + da * (1 - sa);
      for (let c = 0; c < 3; c++) {
        out[d + c] = Math.round((logo[s + c] * sa + out[d + c] * da * (1 - sa)) / oa);
      }
      out[d + 3] = Math.round(oa * 255);
    }
  }
  return out;
}

/* ---- ICO ------------------------------------------------------------------- */

/* PNG-in-ICO. Every browser since IE11 reads it, and it keeps favicon.ico at
   the root for clients that request it blindly. */
function encodeIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  let offset = 6 + entries.length * 16;
  const dir = [], payload = [];
  for (const { size, png } of entries) {
    const e = Buffer.alloc(16);
    e[0] = size >= 256 ? 0 : size; e[1] = size >= 256 ? 0 : size;
    e[2] = 0; e[3] = 0;
    e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
    e.writeUInt32LE(png.length, 8); e.writeUInt32LE(offset, 12);
    dir.push(e); payload.push(png); offset += png.length;
  }
  return Buffer.concat([header, ...dir, ...payload]);
}

/* ---- run ------------------------------------------------------------------- */

const src = decodePng(fs.readFileSync(SRC));
console.log(`make-icons: source ${src.width}x${src.height}`);

/* Google wants a square icon whose size is a multiple of 48. 192 and 512 are
   the PWA sizes the manifest declares; 180 is what iOS asks for. */
const PNGS = [
  ["icon-48.png", 48], ["icon-96.png", 96], ["icon-192.png", 192],
  ["icon-512.png", 512], ["apple-touch-icon.png", 180],
];

for (const [name, size] of PNGS) {
  const png = encodePng(size, size, makeIcon(src, size));
  fs.writeFileSync(path.join(OUT, name), png);
  console.log(`  ${name.padEnd(22)} ${size}x${size}  ${(png.length / 1024).toFixed(1)}kB`);
}

const ico = encodeIco([16, 32, 48].map((size) => ({
  size, png: encodePng(size, size, makeIcon(src, size)),
})));
fs.writeFileSync(path.join(OUT, "favicon.ico"), ico);
console.log(`  favicon.ico            16+32+48   ${(ico.length / 1024).toFixed(1)}kB`);

/* The CRA leftovers. Nothing references them once index.html and manifest.json
   are updated, and leaving the React atom in public/ invites it back. */
for (const stale of ["logo192.png", "logo512.png"]) {
  const p = path.join(OUT, stale);
  if (fs.existsSync(p)) { fs.unlinkSync(p); console.log(`  removed ${stale} (CRA default)`); }
}

/**
 * Erzeugt die PWA-Icons lokal, ohne externe Abhängigkeiten.
 * Gezeichnet wird eine abstrakte "Szene": eine Sprechblase mit hervorgehobener
 * lexikalischer Einheit (Punkt + Balken) in Sandton auf Petrol.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

const PETROL = [0x1f, 0x5e, 0x63];
const SAND = [0xe8, 0xd3, 0xae];

/* ---------------------------------------------------------- PNG-Kodierung */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (let i = 0; i < buffer.length; i += 1) crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed), 0);
  return Buffer.concat([length, typed, crc]);
}

function encodePng(size, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // Bittiefe
  header[9] = 6; // Farbtyp RGBA
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0; // Filter "None"
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* --------------------------------------------------------------- Zeichnen */

const clamp01 = (value) => Math.min(1, Math.max(0, value));

function createCanvas(size) {
  return { size, data: Buffer.alloc(size * size * 4) };
}

/** Zeichnet eine Form über ihre vorzeichenbehaftete Distanzfunktion (weiche Kanten). */
function paint(canvas, sdf, color, alpha = 1) {
  const { size, data } = canvas;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const distance = sdf(x + 0.5, y + 0.5);
      const coverage = clamp01(0.5 - distance) * alpha;
      if (coverage <= 0) continue;
      const index = (y * size + x) * 4;
      const previous = data[index + 3] / 255;
      const out = coverage + previous * (1 - coverage);
      for (let c = 0; c < 3; c += 1) {
        const src = color[c] * coverage;
        const dst = data[index + c] * previous * (1 - coverage);
        data[index + c] = Math.round((src + dst) / (out || 1));
      }
      data[index + 3] = Math.round(out * 255);
    }
  }
}

const roundedRect = (cx, cy, halfW, halfH, radius) => (x, y) => {
  const dx = Math.abs(x - cx) - (halfW - radius);
  const dy = Math.abs(y - cy) - (halfH - radius);
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  return outside + Math.min(Math.max(dx, dy), 0) - radius;
};

const circle = (cx, cy, radius) => (x, y) => Math.hypot(x - cx, y - cy) - radius;

const ring = (sdf, halfStroke) => (x, y) => Math.abs(sdf(x, y)) - halfStroke;

/** Dreieck über den Schnitt dreier Halbebenen (Sprechblasen-Spitze). */
const triangle = (ax, ay, bx, by, cx, cy) => {
  const edge = (x0, y0, x1, y1) => {
    const nx = y1 - y0;
    const ny = -(x1 - x0);
    const length = Math.hypot(nx, ny) || 1;
    return (x, y) => ((x - x0) * nx + (y - y0) * ny) / length;
  };
  const sign = Math.sign(edge(ax, ay, bx, by)(cx, cy)) || 1;
  const edges = [edge(ax, ay, bx, by), edge(bx, by, cx, cy), edge(cx, cy, ax, ay)];
  return (x, y) => Math.max(...edges.map((fn) => -sign * fn(x, y)));
};

function drawIcon(size, { maskable = false } = {}) {
  const canvas = createCanvas(size);
  const unit = size / 100;

  if (maskable) {
    paint(canvas, () => -size, PETROL);
  } else {
    paint(canvas, roundedRect(size / 2, size / 2, size / 2, size / 2, 22 * unit), PETROL);
  }

  // Inhalt im sicheren Bereich halten (maskable: 60 % Kantenlänge).
  const scale = maskable ? 0.62 : 0.78;
  const s = (value) => value * unit * scale;
  const cx = size / 2;
  const cy = size / 2 - s(3);

  const bubble = roundedRect(cx, cy, s(31), s(23), s(8));
  paint(canvas, ring(bubble, s(4)), SAND);
  paint(canvas, triangle(cx - s(19), cy + s(17), cx - s(3), cy + s(17), cx - s(17), cy + s(36)), SAND);

  // Hervorgehobene lexikalische Einheit: Punkt plus Zeilenbalken.
  paint(canvas, circle(cx - s(15), cy - s(6), s(5)), SAND);
  paint(canvas, roundedRect(cx + s(6), cy - s(6), s(15), s(3.4), s(3.4)), SAND);
  paint(canvas, roundedRect(cx - s(2), cy + s(9), s(23), s(3.4), s(3.4)), SAND, 0.55);

  return encodePng(size, canvas.data);
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'icon-192.png'), drawIcon(192));
writeFileSync(join(OUT_DIR, 'icon-512.png'), drawIcon(512));
writeFileSync(join(OUT_DIR, 'icon-maskable-512.png'), drawIcon(512, { maskable: true }));

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="LexiScène">
  <rect width="100" height="100" rx="22" fill="#1F5E63" />
  <g fill="none" stroke="#E8D3AE" stroke-width="6">
    <rect x="19" y="24" width="62" height="46" rx="12" />
  </g>
  <path d="M31 68 L43 68 L32 80 Z" fill="#E8D3AE" />
  <circle cx="38" cy="41" r="6" fill="#E8D3AE" />
  <rect x="50" y="37.5" width="26" height="7" rx="3.5" fill="#E8D3AE" />
  <rect x="30" y="53" width="40" height="6" rx="3" fill="#E8D3AE" opacity="0.55" />
</svg>
`;
writeFileSync(join(OUT_DIR, 'favicon.svg'), favicon);

console.log('Icons erzeugt:', OUT_DIR);

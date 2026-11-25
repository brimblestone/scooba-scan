// Offline barcode test: zxing-wasm (zxing-cpp) over the test photos.
// Usage: node tools/barcode-test.mjs [longSidePx]
import { readdirSync } from 'node:fs';
import sharp from 'sharp';
import { readBarcodes } from 'zxing-wasm/reader';

const dir = 'test-data/private';
const size = Number(process.argv[2] || 1920);
const files = readdirSync(dir).filter((f) => f.endsWith('.jpg')).sort();
let withAny = 0; const times = []; const rows = [];
for (const [i, f] of files.entries()) {
  const { data, info } = await sharp(`${dir}/${f}`).rotate().resize({ width: size, height: size, fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const t = performance.now();
  const res = await readBarcodes({ data: new Uint8ClampedArray(data), width: info.width, height: info.height, colorSpace: 'srgb' }, { tryHarder: true, maxNumberOfSymbols: 8 });
  times.push(performance.now() - t);
  if (res.length) withAny++;
  rows.push(`${String(i + 1).padStart(2)}  ${res.length ? res.map((r) => `${r.format}:${r.text}`).join('  ') : '-'}`);
}
console.log(rows.join('\n'));
times.sort((a, b) => a - b);
console.log(`\n${withAny}/${files.length} photos decoded at least one barcode at ${size}px; median ${times[times.length >> 1].toFixed(0)} ms, p90 ${times[Math.floor(times.length * 0.9)].toFixed(0)} ms`);

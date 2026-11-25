// Benchmark zxing-wasm decoder options over the test photos (speed vs. how many tags are read).
// Usage: node tools/barcode-bench.mjs
import { readdirSync } from 'node:fs';
import sharp from 'sharp';
import { readBarcodes } from 'zxing-wasm/reader';

const dir = 'test-data/private';
const files = readdirSync(dir).filter((f) => f.endsWith('.jpg')).sort();
const SIZES = [1920, 1440, 1280, 960];
const TAG = /^0{2,}\d{4,8}$/; // lab institution tags: 10 digits with leading zeros

const configs = [
  { name: 'current (all formats, tryHarder, 8 symbols)', o: { tryHarder: true, maxNumberOfSymbols: 8 } },
  { name: 'tryHarder off', o: { tryHarder: false, maxNumberOfSymbols: 8 } },
  { name: 'Code128 only', o: { tryHarder: true, maxNumberOfSymbols: 8, formats: ['Code128'] } },
  { name: 'Code128 only, tryHarder off', o: { tryHarder: false, maxNumberOfSymbols: 8, formats: ['Code128'] } },
  { name: 'Code128 only, tryHarder off, no rotate/invert/downscale', o: { tryHarder: false, tryRotate: false, tryInvert: false, tryDownscale: false, maxNumberOfSymbols: 8, formats: ['Code128'] } },
];

const pct = (a, p) => a[Math.min(a.length - 1, Math.floor(a.length * p))];
const results = [];
for (const size of SIZES) {
  // decode each photo to raw RGBA once per size so resize time is not counted
  const imgs = [];
  for (const f of files) {
    const { data, info } = await sharp(`${dir}/${f}`).rotate().resize({ width: size, height: size, fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    imgs.push({ data: new Uint8ClampedArray(data), width: info.width, height: info.height, colorSpace: 'srgb' });
  }
  await readBarcodes(imgs[0], { tryHarder: false }); // warm up the WASM module
  for (const cfg of configs) {
    const times = []; let tagPhotos = 0, anyPhotos = 0;
    for (const img of imgs) {
      const t = performance.now();
      const res = await readBarcodes(img, cfg.o);
      times.push(performance.now() - t);
      if (res.length) anyPhotos++;
      if (res.some((r) => TAG.test(r.text))) tagPhotos++;
    }
    times.sort((a, b) => a - b);
    results.push({ size, name: cfg.name, tagPhotos, anyPhotos, median: Math.round(pct(times, 0.5)), p90: Math.round(pct(times, 0.9)), mean: Math.round(times.reduce((s, x) => s + x, 0) / times.length) });
  }
}
console.log('size  tags/any  median  p90  mean  config');
for (const r of results) console.log(`${String(r.size).padStart(4)}  ${String(r.tagPhotos).padStart(2)}/${String(r.anyPhotos).padEnd(2)}    ${String(r.median).padStart(4)}ms ${String(r.p90).padStart(4)}ms ${String(r.mean).padStart(4)}ms  ${r.name}`);

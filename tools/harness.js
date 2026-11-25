// Offline harness: OCR + CAS extraction over test photos, scored against expected.json.
// Usage: node tools/harness.js [--dir test-data/private] [--size 1600] [--psm 3] [--gray] [--out report.json]
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import { extractCas } from '../src/cas.js';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, arr) => {
  if (x.startsWith('--')) a.push([x.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return a;
}, []));
const dir = args.dir || 'test-data/private';
const size = Number(args.size || 1600);   // max long side in px (phone video frames are ~1280-1920)
const psm = String(args.psm || 3);
const expected = JSON.parse(await readFile(path.join(dir, 'expected.json'), 'utf8'));

const worker = await createWorker('eng');
await worker.setParameters({ tessedit_pageseg_mode: psm, ...(args.whitelist ? { tessedit_char_whitelist: '0123456789-CAS:NoRN.' } : {}) });
// --crop W,H : centered crop as fractions of the (resized) frame, simulating an on-screen reticle.
// --upscale K : enlarge the crop K times before OCR.
const crop = args.crop ? String(args.crop).split(',').map(Number) : null;
const upscale = Number(args.upscale || 1);

const rows = [];
for (const [file, { cas, note }] of Object.entries(expected)) {
  let img = sharp(path.join(dir, file)).rotate().resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true });
  if (args.gray) img = img.grayscale().normalize();
  let buf = await img.jpeg({ quality: 90 }).toBuffer();
  if (crop) {
    const m = await sharp(buf).metadata();
    const w = Math.round(m.width * crop[0]), h = Math.round(m.height * crop[1]);
    let c = sharp(buf).extract({ left: Math.round((m.width - w) / 2), top: Math.round((m.height - h) / 2), width: w, height: h });
    if (upscale !== 1) c = c.resize({ width: Math.round(w * upscale) });
    buf = await c.jpeg({ quality: 90 }).toBuffer();
  }
  const t0 = performance.now();
  const { data } = await worker.recognize(buf);
  const ms0 = performance.now() - t0;
  let text = data.text;
  let extraMs = 0;
  if (args.tiles && !extractCas(text).length) {
    // Fallback: OCR overlapping tiles upscaled 1.5x (small print needs more pixels per glyph).
    const meta = await sharp(buf).metadata();
    const cols = 2, rows_ = 3, ov = 0.15;
    const tw = Math.round(meta.width / cols * (1 + ov)), th = Math.round(meta.height / rows_ * (1 + ov));
    const t1 = performance.now();
    for (let r = 0; r < rows_; r++) for (let c = 0; c < cols; c++) {
      const left = Math.min(meta.width - tw, Math.round(c * meta.width / cols - (c ? tw * ov / 2 : 0)));
      const top = Math.min(meta.height - th, Math.round(r * meta.height / rows_ - (r ? th * ov / 2 : 0)));
      const tile = await sharp(buf).extract({ left: Math.max(0, left), top: Math.max(0, top), width: tw, height: th }).resize({ width: Math.round(tw * 1.5) }).jpeg({ quality: 90 }).toBuffer();
      text += '\n' + (await worker.recognize(tile)).data.text;
    }
    extraMs = performance.now() - t1;
  }
  const found = extractCas(text);
  const foundSet = found.map((f) => f.cas);
  const exactSet = found.filter((f) => f.tier === 'exact').map((f) => f.cas);
  const want = [].concat(cas ?? []);
  const hits = want.filter((w) => foundSet.includes(w));
  const extras = foundSet.filter((f) => !want.includes(f));
  rows.push({ file, note, want, found: foundSet, hits: hits.length, exactHits: want.filter((w) => exactSet.includes(w)).length, exactExtras: exactSet.filter((f) => !want.includes(f)), extras, ms: Math.round(ms0 + extraMs), topIsRight: want.length ? found[0]?.cas === want[0] : null });
}
await worker.terminate();

const withCas = rows.filter((r) => r.want.length);
const noCas = rows.filter((r) => !r.want.length);
const single = withCas.filter((r) => r.want.length === 1);
const pct = (a, b) => (b ? ((100 * a) / b).toFixed(1) + '%' : 'n/a');
for (const r of rows) {
  const status = !r.want.length ? (r.found.length ? 'FALSE+' : 'ok(none)') : r.hits === r.want.length ? 'HIT' : r.hits ? 'PART' : 'MISS';
  console.log(`${status.padEnd(9)} ${String(r.ms).padStart(5)}ms  ${r.file.slice(9, 18)}  want=${r.want.join(',') || '-'}  got=${r.found.join(',') || '-'}  ${r.note}`);
}
const ms = rows.map((r) => r.ms).sort((a, b) => a - b);
const summary = {
  config: { size, psm, gray: !!args.gray },
  photos: rows.length,
  singleCasRecall: pct(single.filter((r) => r.hits).length, single.length),
  singleCasTop1: pct(single.filter((r) => r.topIsRight).length, single.length),
  singleCasRecallExactOnly: pct(single.filter((r) => r.exactHits).length, single.length),
  allExpectedCasFound: pct(withCas.reduce((s, r) => s + r.hits, 0), withCas.reduce((s, r) => s + r.want.length, 0)),
  falsePositivePhotosExactOnly: `${rows.filter((r) => r.exactExtras.length).length}/${rows.length}`,
  falsePositivePhotos: `${rows.filter((r) => r.extras.length).length}/${rows.length}`,
  noCasPhotosClean: `${noCas.filter((r) => !r.found.length).length}/${noCas.length}`,
  msMedian: ms[Math.floor(ms.length / 2)], msP90: ms[Math.floor(ms.length * 0.9)], msMax: ms.at(-1),
};
console.log('\n' + JSON.stringify(summary, null, 2));
if (args.out) await writeFile(args.out, JSON.stringify({ summary, rows }, null, 2));

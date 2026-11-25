// Builds the static site in docs/ for GitHub Pages: page + cas.js + the vendored OCR/barcode libraries.
// Usage: npm run build
import { mkdirSync, copyFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const out = 'docs';
rmSync(out, { recursive: true, force: true });
const copy = (from, to) => {
  if (!existsSync(from)) throw new Error(`missing ${from} (run npm install; eng.traineddata appears after one npm run harness)`);
  mkdirSync(path.dirname(path.join(out, to)), { recursive: true });
  copyFileSync(from, path.join(out, to));
};
const core = 'node_modules/tesseract.js-core/';
copy('web/index.html', 'index.html');
copy('src/cas.js', 'src/cas.js');
copy('node_modules/@zxing/library/umd/index.min.js', 'vendor/zxing/index.min.js');
copy('node_modules/tesseract.js/dist/tesseract.min.js', 'vendor/tesseract/tesseract.min.js');
copy('node_modules/tesseract.js/dist/worker.min.js', 'vendor/tesseract/worker.min.js');
for (const f of ['tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js']) copy(core + f, 'vendor/tesseract-core/' + f);
copy('eng.traineddata', 'vendor/lang/eng.traineddata');
writeFileSync(path.join(out, '.nojekyll'), '');
console.log('Built docs/ — commit and push it, then enable Pages from the /docs folder.');

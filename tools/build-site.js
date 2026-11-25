// Builds the static site in docs/ for GitHub Pages: page + cas.js + the vendored OCR/barcode libraries.
// Usage: npm run build
import { mkdirSync, copyFileSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
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
copy('web/manifest.webmanifest', 'manifest.webmanifest');
for (const i of ['icon-180.png', 'icon-192.png', 'icon-512.png']) copy('web/' + i, i);
copy('src/cas.js', 'src/cas.js');
copy('src/csv.js', 'src/csv.js');
copy('src/inventory.js', 'src/inventory.js');
copy('node_modules/zxing-wasm/dist/iife/reader/index.js', 'vendor/zxing-wasm/iife/reader/index.js');
copy('node_modules/zxing-wasm/dist/reader/zxing_reader.wasm', 'vendor/zxing-wasm/reader/zxing_reader.wasm');
copy('node_modules/tesseract.js/dist/tesseract.min.js', 'vendor/tesseract/tesseract.min.js');
copy('node_modules/tesseract.js/dist/worker.min.js', 'vendor/tesseract/worker.min.js');
for (const f of ['tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js']) copy(core + f, 'vendor/tesseract-core/' + f);
copy('eng.traineddata', 'vendor/lang/eng.traineddata');
// Stamp the build so test reports can say which version they used.
const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const stamp = `v${version} ${new Date().toISOString().slice(0, 16).replace('T', ' ')}Z`;
const indexPath = path.join(out, 'index.html');
writeFileSync(indexPath, readFileSync(indexPath, 'utf8').replace('__BUILD__', stamp));
console.log('Stamped build', stamp);
writeFileSync(path.join(out, '.nojekyll'), '');
console.log('Built docs/ — commit and push it, then enable Pages from the /docs folder.');

// Generates the app icons in web/ from an inline SVG (barcode glyph). Run: node tools/make-icons.mjs
import sharp from 'sharp';
const bars = [[18,5],[28,3],[35,8],[48,3],[55,5],[65,3],[72,8],[85,3],[92,5],[102,3],[109,8]]; // [x, width] on a 128 grid
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" fill="#0b0f14"/>
<rect x="10" y="10" width="108" height="108" rx="22" fill="#121923" stroke="#58a6ff" stroke-width="3"/>
${bars.map(([x, w]) => `<rect x="${((x - 18) * 0.75 + 26.9).toFixed(1)}" y="34" width="${(w * 0.75).toFixed(1)}" height="46" fill="#e8eef6"/>`).join('')}
<rect x="22" y="90" width="84" height="5" rx="2.5" fill="#3ddc97"/></svg>`;
for (const [name, size] of [['icon-180.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`web/${name}`);
}
console.log('icons written');

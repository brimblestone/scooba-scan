// Converts HEIC photos in a folder to JPG next to the originals.
import { readdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import convert from 'heic-convert';

const dir = process.argv[2] || 'test-data/private';
for (const f of await readdir(dir)) {
  if (!/\.heic$/i.test(f)) continue;
  const out = path.join(dir, f.replace(/\.heic$/i, '.jpg'));
  try { await access(out); continue; } catch {}
  const buf = await convert({ buffer: await readFile(path.join(dir, f)), format: 'JPEG', quality: 0.92 });
  await writeFile(out, Buffer.from(buf));
  console.log('converted', out);
}

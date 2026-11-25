import { readdirSync } from 'node:fs';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
const dir='test-data/private'; const files=readdirSync(dir).filter(f=>f.endsWith('.jpg')).sort();
const idx=process.argv.slice(2).map(Number);
const w=await createWorker('eng'); await w.setParameters({tessedit_pageseg_mode:'11'});
for(const i of idx){ const b=await sharp(dir+'/'+files[i-1]).rotate().jpeg().toBuffer();
 const {data}=await w.recognize(b);
 const lines=data.text.split('\n').filter(l=>/cas|\d{2,}\s*[-–]\s*\d|\d-\d/i.test(l));
 console.log('#'+i, JSON.stringify(lines.slice(0,6)));}
await w.terminate();

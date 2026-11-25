// One-off: writes test-data/private/expected.json from my hand-read labels, verifying checksums.
import { writeFileSync, readdirSync } from 'node:fs';
import { isValidCas } from '../src/cas.js';
const dir = 'test-data/private';
const files = readdirSync(dir).filter(f => f.endsWith('.jpg')).sort();
// index (1-based, sorted order) -> [cas | [cas...] | null, note]
const E = {
 1:['159610-89-6','Aaron'],2:['144120-54-7','Ambeed-style, brackets'],3:['13734-28-6','AK Scientific'],
 4:[null,'Sigma; CAS hidden by hand/edge'],5:[null,'Sigma; label turned away, no CAS'],
 6:['100-61-8','Acros; CAS cut off at label edge, tiny'],7:['104-92-7','Acros, old yellowed'],
 8:['535-87-5','Ambeed'],9:['62129-44-6','AA Blocks'],10:['16774-21-3','Sigma-Aldrich/Merck'],
 11:['617-94-7','Oakwood'],12:['535-87-5','old Aldrich, brackets'],13:['865-49-6','Sigma, tape over'],
 14:['104-94-9','Oakwood'],15:['624-28-2','Oakwood, taped label'],16:['1149-26-4','AK Scientific'],
 17:['85-41-6','Acros'],18:[null,'Acros; no CAS on label'],19:['91-20-3','Fisher, tiny'],
 20:['462-06-6','Aldrich, CAS in paragraph'],21:['127-08-2','Sigma/Merck'],
 22:['121-46-0','TCI'],23:['1122-58-3','Oakwood'],
 24:[null,'shelf scene, no legible CAS'],25:['118-45-6','Oakwood; multi-bottle, others illegible'],
 26:['87-69-4','Alfa Aesar'],27:[null,'old Aldrich; no CAS on label'],
 28:[['96-31-1','109-94-4','288-32-4'],'shelf scene, 3 small CAS'],29:['124-63-0','Thermo'],
 30:[null,'two bottles, no CAS visible'],31:[null,'two bottles, no CAS visible'],
 32:['1152-61-0','old Sigma, brackets'],33:['154445-77-9','Novabiochem'],34:['154445-77-9','Novabiochem, angled'],
 35:['593-60-2','Aldrich gas cylinder, tiny rusty'],36:['75-05-8','Fisher 4L, tiny CAS'],
 37:['13139-17-8','Ambeed'],38:['2216-51-5','Acros, handwriting'],
};
const out = {};
files.forEach((f,i)=>{
  const [cas,note]=E[i+1]; 
  for (const c of [].concat(cas??[])) if(!isValidCas(c)) console.log('CHECKSUM FAIL', i+1, c);
  out[f]={cas,note};
});
writeFileSync(dir+'/expected.json', JSON.stringify(out,null,2));
console.log(files.length,'entries');

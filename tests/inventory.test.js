import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, parseCsvRows } from '../src/csv.js';
import { Inventory, normTag, toContainer } from '../src/inventory.js';

// Synthetic data only: never put real inventory rows in tests (this repo is public).
const CSV = '﻿"Chemical Name","CAS Number","Location (space)",Bench,Shelf,"Specific Location Note",Amount,Units,"Container ID","Container Status"\r\n' +
  '"Acetone, ACS",67-64-1,"Room 1",B2,S3,freezer,5.00000000,ml,0000000123,Normal\r\n' +
  '"Ethanol ""200 proof""\nline two",64-17-5,"Room 2",,,,1.50000000,L,00000000456,Normal\r\n' +
  'Old tag chemical,7647-14-5,,,,,10,g,000789,Normal\r\n' +
  'Odd id,,,,,,,,C-20128355,Normal\r\n' +
  '\r\n';

test('csv: quoted commas, escaped quotes, newlines in quotes, BOM, blank lines', () => {
  const rows = parseCsvRows(CSV);
  assert.equal(rows.length, 5);
  assert.equal(rows[1][0], 'Acetone, ACS');
  assert.equal(rows[2][0], 'Ethanol "200 proof"\nline two');
});

test('csv: objects keyed by header, short rows padded', () => {
  const objs = parseCsv('a,b,c\n1,2\n');
  assert.deepEqual(objs, [{ a: '1', b: '2', c: '' }]);
});

test('normTag: leading zeros and formats', () => {
  assert.equal(normTag('0000047508'), '47508');
  assert.equal(normTag('00000047508'), '47508');
  assert.equal(normTag(' 047508 '), '47508');
  assert.equal(normTag('0000'), '0');
  assert.equal(normTag('c-20128355'), 'C-20128355');
});

test('inventory: tag lookup tolerates zero padding and different tag lengths', () => {
  const inv = Inventory.fromCsv(CSV);
  assert.equal(inv.size, 4);
  assert.equal(inv.lookupTag('0000000123')[0].name, 'Acetone, ACS');
  assert.equal(inv.lookupTag('0000000456')[0].cas, '64-17-5'); // 11-digit id in the file, 10-digit barcode
  assert.equal(inv.lookupTag('000789')[0].cas, '7647-14-5'); // old 6-digit tag
  assert.equal(inv.lookupTag('C-20128355')[0].name, 'Odd id');
  assert.deepEqual(inv.lookupTag('0000099999'), []);
});

test('inventory: CAS lookup and tidy location/amount', () => {
  const inv = Inventory.fromCsv(CSV);
  const c = inv.lookupCas('67-64-1')[0];
  assert.equal(c.where, 'Room 1 · bench B2 · shelf S3 · freezer');
  assert.equal(c.amount, '5 ml');
  assert.deepEqual(inv.lookupCas('0-00-0'), []);
});

test('toContainer: column names are case-insensitive', () => {
  const c = toContainer({ 'container id': '0000000001', 'cas number': '50-00-0', 'chemical name': 'Formaldehyde' });
  assert.deepEqual([c.id, c.cas, c.name], ['0000000001', '50-00-0', 'Formaldehyde']);
});

// ---- Find mode search (synthetic data only) ----
const FIND_CSV = '"Chemical Name","CAS Number","Location (space)",Bench,Shelf,"Container ID"\r\n' +
  'Acetone,67-64-1,Room 1,B1,S1,0000000001\r\n' +
  '"Acetone, ACS",67-64-1,Room 2,B2,S2,0000000002\r\n' +
  'Acetone-d6,666-52-4,Room 1,B1,S3,0000000003\r\n' +
  'Ethyl acetate,141-78-6,Room 3,B3,S4,0000000004\r\n' +
  'Sodium chloride,7647-14-5,Room 4,B4,S5,0000000005\r\n' +
  'No cas thing,,Room 5,B5,S6,0000000006\r\n';

test('search: groups containers by chemical and ranks starts-with first', () => {
  const inv = Inventory.fromCsv(FIND_CSV);
  const r = inv.search('acetone');
  assert.equal(r[0].cas, '67-64-1');
  assert.equal(r[0].containers.length, 2);
  assert.equal(r[1].cas, '666-52-4');
  assert.equal(r.length, 2); // "Ethyl acetate" does not contain "acetone"
});

test('search: every word must match, any order', () => {
  const inv = Inventory.fromCsv(FIND_CSV);
  assert.equal(inv.search('chloride sodium')[0].cas, '7647-14-5');
  assert.deepEqual(inv.search('sodium zzz'), []);
});

test('search: CAS prefix and full CAS', () => {
  const inv = Inventory.fromCsv(FIND_CSV);
  assert.equal(inv.search('67-64')[0].cas, '67-64-1');
  assert.equal(inv.search('67-64-1')[0].containers.length, 2);
  assert.deepEqual(inv.search('99-99'), []);
});

test('search: tag number, with or without leading zeros', () => {
  const inv = Inventory.fromCsv(FIND_CSV);
  const r = inv.search('0000000004');
  assert.equal(r[0].kind, 'tag');
  assert.equal(r[0].label, 'Ethyl acetate');
  assert.equal(inv.search('4')[0] === undefined, true); // too short to search
  assert.equal(inv.search('000004')[0].tag, '0000000004');
});

test('search: groups chemicals without a CAS by name; short queries return nothing', () => {
  const inv = Inventory.fromCsv(FIND_CSV);
  assert.equal(inv.search('no cas')[0].label, 'No cas thing');
  assert.deepEqual(inv.search('a'), []);
  assert.deepEqual(inv.search(''), []);
});

test('search: respects the limit', () => {
  const rows = ['"Chemical Name","CAS Number","Container ID"'];
  for (let i = 0; i < 30; i++) rows.push(`Widget ${i},,${String(i).padStart(10, '0')}`);
  assert.equal(Inventory.fromCsv(rows.join('\n')).search('widget', 5).length, 5);
});

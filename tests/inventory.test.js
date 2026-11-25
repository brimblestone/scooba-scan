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

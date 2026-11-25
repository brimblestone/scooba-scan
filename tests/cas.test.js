import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidCas, extractCas, normaliseDigits, checkDigitFor } from '../src/cas.js';

test('checksum accepts real CAS numbers', () => {
  for (const c of ['67-64-1', '7647-14-5', '64-17-5', '7732-18-5', '50-00-0', '67-56-1', '108-88-3', '7664-93-9', '58-08-2'])
    assert.ok(isValidCas(c), c);
});

test('checksum rejects wrong check digit and bad format', () => {
  for (const c of ['67-64-2', '7647-14-4', '64-17-6', '1-23-4', '12345678-12-3', 'abc', ''])
    assert.ok(!isValidCas(c), c);
});

test('normaliseDigits maps look-alikes', () => {
  assert.equal(normaliseDigits('O1lI|'), '01111');
});

test('extracts CAS from a label line', () => {
  const r = extractCas('Acetone  CAS No. 67-64-1  MW 58.08');
  assert.equal(r.length, 1);
  assert.equal(r[0].cas, '67-64-1');
  assert.ok(r[0].nearCas);
  assert.ok(!r[0].corrected);
});

test('tolerates spaces and unicode dashes', () => {
  assert.equal(extractCas('CAS: 7647 – 14 – 5')[0].cas, '7647-14-5');
  assert.equal(extractCas('64−17−5')[0].cas, '64-17-5');
});

test('corrects OCR letter/digit confusion', () => {
  const r = extractCas('CAS 67-64-l');
  assert.equal(r[0].cas, '67-64-1');
  assert.ok(r[0].corrected);
  assert.equal(extractCas('CAS 7732-l8-5')[0].cas, '7732-18-5');
  assert.equal(extractCas('5O-OO-O')[0].cas, '50-00-0');
});

test('drops candidates that fail the checksum', () => {
  assert.deepEqual(extractCas('Lot 123-45-6 CAS 67-64-2'), []);
});

test('ignores digits glued onto a longer number', () => {
  assert.deepEqual(extractCas('99967-64-1'), []);
  assert.deepEqual(extractCas('67-64-12'), []);
});

test('prefers candidates near the text CAS and dedupes', () => {
  const r = extractCas('Cat 64-17-5 ... CAS 67-64-1 ......................................... 64-17-5');
  assert.deepEqual(r.map((x) => x.cas), ['67-64-1', '64-17-5']);
});

test('handles empty input', () => {
  assert.deepEqual(extractCas(''), []);
  assert.deepEqual(extractCas(null), []);
});

test('fuzzy: re-inserts a dropped final hyphen', () => {
  const r = extractCas('104-949');
  assert.equal(r[0].cas, '104-94-9');
  assert.equal(r[0].tier, 'fuzzy');
});

test('fuzzy: re-inserts both hyphens only right after "CAS"', () => {
  assert.equal(extractCas('Qty: 5g CAS : 159610896')[0].cas, '159610-89-6');
  assert.deepEqual(extractCas('Lot 159610896'), []);
});

test('fuzzy can be disabled', () => {
  assert.deepEqual(extractCas('104-949', { fuzzy: false }), []);
});

test('exact candidates rank before fuzzy ones', () => {
  const r = extractCas('104-949 ... CAS 67-64-1');
  assert.deepEqual(r.map((x) => x.tier), ['exact', 'fuzzy']);
});

test('maps T/S/B/Z/G look-alikes inside hyphenated numbers', () => {
  assert.equal(extractCas('[144120-54-T]')[0].cas, '144120-54-7');
});

test('checkDigitFor completes a truncated CAS', () => {
  assert.equal(checkDigitFor('121-46'), 0);
});

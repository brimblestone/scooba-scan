// Lab inventory lookup: maps a scanned tag (barcode text) or CAS number to container records.
// The inventory CSV is loaded on the device; nothing here talks to a network.
import { parseCsv } from './csv.js';

// Column names of the lab's chemical-container export. Matching is case-insensitive.
const COLS = {
  id: 'Container ID', cas: 'CAS Number', name: 'Chemical Name', space: 'Location (space)', bench: 'Bench',
  shelf: 'Shelf', note: 'Specific Location Note', maker: 'Manufacturer', amount: 'Amount', units: 'Units', status: 'Container Status',
};

/**
 * Normalise a tag so "0000047508", "47508" and "00000047508" all match.
 * All-digit ids drop leading zeros; anything else (e.g. "C-20128355") is just trimmed and upper-cased.
 */
export function normTag(raw) {
  const s = String(raw ?? '').trim();
  if (/^\d+$/.test(s)) return s.replace(/^0+(?=\d)/, '');
  return s.toUpperCase();
}

function pick(row, key) {
  const want = COLS[key].toLowerCase();
  for (const k of Object.keys(row)) if (k.toLowerCase() === want) return row[k];
  return '';
}

/** Turn a raw CSV row into a compact container record. */
export function toContainer(row) {
  const amount = pick(row, 'amount').replace(/\.?0+$/, '') || pick(row, 'amount');
  const where = [pick(row, 'space'), pick(row, 'bench') && `bench ${pick(row, 'bench')}`, pick(row, 'shelf') && `shelf ${pick(row, 'shelf')}`, pick(row, 'note')].filter(Boolean);
  return {
    id: pick(row, 'id'), cas: pick(row, 'cas'), name: pick(row, 'name'), maker: pick(row, 'maker'),
    amount: [amount, pick(row, 'units')].filter(Boolean).join(' '), where: where.join(' · '), status: pick(row, 'status'),
  };
}

export class Inventory {
  constructor(containers = []) {
    this.byTag = new Map();
    this.byCas = new Map();
    for (const c of containers) {
      if (c.id) { const k = normTag(c.id); (this.byTag.get(k) || this.byTag.set(k, []).get(k)).push(c); }
      if (c.cas) (this.byCas.get(c.cas) || this.byCas.set(c.cas, []).get(c.cas)).push(c);
    }
    this.size = containers.length;
  }

  static fromCsv(text) { return new Inventory(parseCsv(text).map(toContainer)); }

  /** Containers whose tag matches a barcode's text (usually 0 or 1). */
  lookupTag(text) { return this.byTag.get(normTag(text)) || []; }

  /** All containers holding a given CAS number. */
  lookupCas(cas) { return this.byCas.get(cas) || []; }
}

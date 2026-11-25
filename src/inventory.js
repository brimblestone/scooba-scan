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
    this.all = containers;
  }

  /**
   * Search by name words, CAS (full or prefix) or tag number, for Find mode.
   * Returns at most `limit` groups, one per chemical (grouped by CAS, or by name when there is no CAS):
   *   { kind: 'chemical'|'tag', label, cas, tag?, containers, score }  (lower score = better match)
   */
  search(query, limit = 8) {
    const q = String(query ?? '').trim().toLowerCase();
    if (q.length < 2) return [];
    const out = [];

    // A tag number: exact match on one container.
    if (/^\d{3,11}$/.test(q)) {
      for (const c of this.lookupTag(q)) out.push({ kind: 'tag', label: c.name || c.cas || c.id, cas: c.cas, tag: c.id, containers: [c], score: -1 });
    }

    const casLike = /^\d{2,7}(-\d{0,2}(-\d?)?)?$/.test(q) && q.includes('-');
    const tokens = q.split(/\s+/).filter(Boolean);
    const groups = new Map();
    for (const c of this.all) {
      let score = null;
      if (casLike) { if (c.cas && c.cas.startsWith(q)) score = c.cas === q ? 0 : 1; }
      else {
        const name = c.name.toLowerCase();
        if (tokens.every((t) => name.includes(t))) {
          score = name.startsWith(q) ? 0 : tokens.every((t) => name.startsWith(t) || name.includes(' ' + t) || name.includes('-' + t) || name.includes('(' + t)) ? 1 : 2;
        }
      }
      if (score === null) continue;
      const key = c.cas || 'name:' + c.name.toLowerCase();
      const g = groups.get(key);
      if (g) { g.containers.push(c); g.score = Math.min(g.score, score); }
      else groups.set(key, { kind: 'chemical', label: c.name, cas: c.cas, containers: [c], score });
    }
    const chem = [...groups.values()].sort((a, b) => a.score - b.score || b.containers.length - a.containers.length || a.label.length - b.label.length);
    return [...out, ...chem].slice(0, limit);
  }

  static fromCsv(text) { return new Inventory(parseCsv(text).map(toContainer)); }

  /** Containers whose tag matches a barcode's text (usually 0 or 1). */
  lookupTag(text) { return this.byTag.get(normTag(text)) || []; }

  /** All containers holding a given CAS number. */
  lookupCas(cas) { return this.byCas.get(cas) || []; }
}

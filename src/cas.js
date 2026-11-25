// CAS Registry Number extraction: regex + OCR-noise normalisation + checksum.
// Pure functions, no dependencies — runs in Node and in the browser.
//
// Two tiers of candidates, both checksum-validated:
//   exact: well-formed N-NN-N (allowing look-alike letters and odd dashes/spaces)
//   fuzzy: OCR dropped a hyphen (e.g. "104-949", "159610896"); we re-insert it.
// Fuzzy candidates are far more likely to be false positives (a random digit run
// passes the checksum 1 time in 10), so callers should prefer exact ones, or only
// accept fuzzy ones that match a known target (Find mode).

const DASHES = '\\-\\u2010\\u2011\\u2012\\u2013\\u2014\\u2015\\u2212\\u2E3A\\uFE58\\uFE63\\uFF0D';
// Characters OCR commonly confuses with digits.
const NOISE = { O: '0', o: '0', Q: '0', D: '0', l: '1', I: '1', i: '1', '|': '1', T: '7', Z: '2', S: '5', B: '8', G: '6' };
const LETTERS = Object.keys(NOISE).map((c) => (c === '|' ? '\\|' : c)).join('');
const DIGITISH = '0-9' + LETTERS;
const NOISE_RE = new RegExp(`[${LETTERS}]`, 'g');

const SEP = `[ \\t]*[${DASHES}][ \\t]*`;
const D = `[${DIGITISH}]`;
const LEAD = `(?<![0-9A-Za-z${DASHES}])`;
const EXACT_RE = new RegExp(`${LEAD}(${D}{2,7})${SEP}(${D}{2})${SEP}(${D})(?![0-9])`, 'g');
// "NNNN-NNN": the hyphen between the last two groups was lost
const MISSING2_RE = new RegExp(`${LEAD}(${D}{2,7})${SEP}(${D}{3})(?![0-9])`, 'g');
// "NNNNNNN": both hyphens lost; only trusted right after the text "CAS"
const MISSING_BOTH_RE = /CAS(?:\s*(?:No\.?|RN|Number|#))?\s*[:.\]\[]?\s*\[?([0-9]{5,10})(?![0-9])/gi;

/** Replace look-alike letters with digits. */
export function normaliseDigits(s) {
  return s.replace(NOISE_RE, (c) => NOISE[c]);
}

/** Checksum: sum(digit * position-from-right, excluding check digit) mod 10 === check digit. */
export function isValidCas(cas) {
  const m = /^(\d{2,7})-(\d{2})-(\d)$/.exec(cas);
  if (!m) return false;
  const digits = (m[1] + m[2]).split('').reverse();
  const sum = digits.reduce((acc, d, i) => acc + Number(d) * (i + 1), 0);
  return sum % 10 === Number(m[3]);
}

/** The check digit that would complete "N-NN" (useful for partial reads). */
export function checkDigitFor(prefix) {
  const digits = prefix.replace(/\D/g, '').split('').reverse();
  return digits.reduce((acc, d, i) => acc + Number(d) * (i + 1), 0) % 10;
}

function nearCasBefore(text, index) {
  return /CAS/i.test(text.slice(Math.max(0, index - 30), index));
}

/**
 * Find CAS candidates in OCR text.
 * Returns [{ cas, raw, index, corrected, nearCas, tier }] (checksum-passing only,
 * de-duplicated; exact before fuzzy, then near-"CAS" first, then text order).
 */
export function extractCas(text, { fuzzy = true } = {}) {
  if (!text) return [];
  const found = new Map();
  const add = (cas, raw, index, tier, corrected) => {
    if (!isValidCas(cas)) return;
    const nearCas = nearCasBefore(text, index);
    const prev = found.get(cas);
    if (!prev) found.set(cas, { cas, raw, index, corrected, nearCas, tier });
    else {
      if (nearCas) prev.nearCas = true;
      if (tier === 'exact') prev.tier = 'exact';
    }
  };

  for (const m of text.matchAll(EXACT_RE)) {
    const cas = `${normaliseDigits(m[1])}-${normaliseDigits(m[2])}-${normaliseDigits(m[3])}`;
    add(cas, m[0], m.index, 'exact', m[0].replace(/\s+/g, '') !== cas);
  }
  if (fuzzy) {
    for (const m of text.matchAll(MISSING2_RE)) {
      const g = normaliseDigits(m[2]);
      add(`${normaliseDigits(m[1])}-${g.slice(0, 2)}-${g.slice(2)}`, m[0], m.index, 'fuzzy', true);
    }
    for (const m of text.matchAll(MISSING_BOTH_RE)) {
      const d = m[1];
      add(`${d.slice(0, -3)}-${d.slice(-3, -1)}-${d.slice(-1)}`, m[0], m.index, 'fuzzy', true);
    }
  }
  const rank = (c) => (c.tier === 'exact' ? 0 : 1);
  return [...found.values()].sort((a, b) => rank(a) - rank(b) || Number(b.nearCas) - Number(a.nearCas) || a.index - b.index);
}

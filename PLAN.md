# Scooba Scan — Plan

A phone-camera web app that scans chemical bottles hands-free, identifying them by **institution inventory barcode** or **CAS number**.

Status: design settled (2026-11-24), implementation not started.

---

## 1. Goals

- Fast, hands-free scanning of many bottles on a shelf.
- Two modes in v1: **Find** (locate one chemical) and **Bulk Add** (record bottles → CSV).
- Personal use first; open source (MIT) for anyone afterward.

## 2. Platform

| Decision | Choice | Why |
|---|---|---|
| Runtime | Web app in the phone browser | No install; camera via `getUserMedia`; easy to share |
| Hosting | GitHub Pages (static, HTTPS) | Camera requires HTTPS; free; natural open-source home |
| Data | Stays on the phone (no backend) | Privacy; works offline |
| First target | iPhone Safari | User's test device; also works on Android |
| Barcode lib | ZXing (WASM/JS) | iOS Safari lacks native `BarcodeDetector` |
| OCR lib | Tesseract.js (WASM) | Cross-platform, offline |
| License | MIT | |

Laptop is only a dev machine (local dev server for testing); it is not needed at runtime.

## 3. Identification

### Institution barcode
- Read any 1D/2D symbology via ZXing.
- Each tag value = one unique bottle.

### CAS number (no per-vendor training)
1. OCR the label region of the frame.
2. Regex candidates: `\b(\d{2,7})-(\d{2})-(\d)\b` (also tolerate OCR noise: spaces, `–`, `O`→`0`, `l`/`I`→`1`).
3. Validate checksum: check digit = Σ(digit × position from right, excluding check digit) mod 10.
4. Keep only valid candidates. Optionally prefer ones near the text "CAS".

Vendor label photos are used as a **test set** (does the pipeline extract the right CAS?), not as training data.

## 4. Modes

### Mode 1 — Find
- Input: a CAS number (checksum-validated on entry) **or** an institution tag.
- Camera scans continuously; every frame tries barcode + OCR.
- On match: vibrate + beep + highlight the bottle on screen, then **stop**.
- User can stop anytime and start a new search.
- Note: iOS Safari does not support `navigator.vibrate`; fall back to sound + visual flash.

### Mode 2 — Bulk Add
- Continuous, hands-free.
- Dedupe rules:
  - Tag seen → one bottle record keyed by tag; a valid CAS seen in the same frame is attached to it.
  - CAS seen without a tag → one record per CAS; user corrects quantity in the review list.
- Live list of recorded items during scanning.
- Review screen: edit/delete entries, adjust quantities.
- Optional name lookup via PubChem by CAS when online; blank when offline.
- Export CSV: `tag, cas, name, quantity, scanned_at`.
- Session saved to phone storage (IndexedDB/localStorage) so it can be resumed.

## 5. Later (not v1)
- **Audit mode**: import expected list (CSV/Excel export), tick off found bottles, report found / missing / unexpected.
- Android fast path: native `BarcodeDetector` / `TextDetector` when available.
- Find by chemical name (PubChem name → CAS).

## 6. Test data
- Private label photos in `test-data/private/` (git-ignored) — contains institution tags.
- A few scrubbed samples in `test-data/public/` with expected CAS in a manifest (`expected.json`).
- A test script runs the OCR + CAS extraction over the photos and reports accuracy.

## 7. Key risk & first milestone
**Risk:** Tesseract.js live on iPhone may be too slow / inaccurate for hands-free scanning.

**Milestone 0 — Scanner spike** (do first):
1. CAS extraction + checksum module with unit tests.
2. Offline test harness over label photos → accuracy report.
3. Minimal camera page on iPhone: live ZXing + OCR, show detections and frames/sec.
4. Decide: acceptable as-is, crop-to-region / downscale tweaks, or alternative OCR engine.

Then:
- **M1** Find mode.
- **M2** Bulk Add mode + review + CSV export + resume.
- **M3** PubChem names, PWA/offline caching, GitHub Pages deploy, README.

## 8. Proposed structure
```
scooba-scan/
  index.html
  src/
    cas.js          # regex + checksum + OCR-noise normalisation
    scanner.js      # camera loop, ZXing + Tesseract per frame
    find.js         # Find mode
    bulk.js         # Bulk Add mode, dedupe, storage, CSV export
    pubchem.js      # optional name lookup
  tests/
  test-data/
    public/
    private/        # .gitignore'd
  LICENSE           # MIT
  PLAN.md
```

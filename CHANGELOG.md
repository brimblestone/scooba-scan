# Changelog

## 1.0.0 — 2026-11-25
First release.
- Full-screen camera with a bottom sheet showing the latest reads; settings behind a gear.
- Barcode tags (Code 128 and others) read from the whole frame with zxing-wasm, about 80 ms per frame.
- Load the lab's chemical-container CSV on the phone (kept in the browser, never uploaded): a tag read shows the
  chemical name, CAS, location and amount; "Not in inventory" and duplicate tag numbers are flagged.
- CAS text reader (Tesseract.js) as a backup for labels without a tag: checksum-validated, repairs dropped hyphens
  and look-alike characters, and shows how many containers hold that CAS and where.
- Add to Home Screen support for a no-toolbar view; build stamp and "Copy log" for test reports.
- Not included yet: Find mode, Bulk Add / CSV export, audit mode.

## Earlier builds (not tagged)
- 0.5.0 full-screen layout, 0.4.0 inventory lookup, 0.3.0 zxing-wasm (the old JS ZXing read 0 of 38 test photos),
  0.2.0 reticle crop / parallel OCR / blur filter, 0.1.0 scanner spike. Details in MILESTONE0.md.

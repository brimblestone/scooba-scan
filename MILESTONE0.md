# Milestone 0 — Scanner spike: results

Test set: 38 phone photos (`test-data/private/`, git-ignored), 31 with a legible CAS, 7 with none visible.
Answer key `expected.json` was read by hand from the photos; every entry passes the CAS checksum.

## Offline accuracy (Tesseract.js 7, laptop CPU, `npm run harness -- --size N --psm P`)

| Image long side | Mode | Single-CAS recall (exact only) | + fuzzy hyphen repair | Median / p90 per frame | False-positive photos |
|---|---|---|---|---|---|
| 1600 | auto (3) | – | 20% | 0.27 s / 0.5 s | 0/38 |
| 1920 | sparse (11) | 27% | 50% | 0.75 s / 1.4 s | 1/38 |
| 3024 (native) | auto (3) | – | 37% | 0.7 s / 1.2 s | 0/38 |
| 3024 (native) | sparse (11) | 53% | 67% | 1.0 s / 1.7 s | 0/38 |
| 3024 + 6-tile 1.5x fallback | sparse (11) | 60% | 77% | 3.3 s / 6.5 s | 0/38 |

The 7 photos with no visible CAS were all correctly reported as "nothing found" in every run.

## Findings
- **Pixels per glyph decide everything.** Label text is small in a full-bottle frame; recall roughly triples from 1600 px to native.
- **Many misses were fixable in the parser, not the OCR:** dropped hyphens (`104-949`), `T`/`S`/`B` read for digits. `src/cas.js` now has a *fuzzy* tier for these, tagged so the UI can treat it as lower confidence.
- **Checksum blind spot:** a lost leading *even* digit still passes (`617-94-7` → `17-94-7`), because that digit's weight is 5. Find mode should compare against the full target; Bulk Add should flag unusually short prefixes.
- Remaining misses: tiny/rusty print, text cut off at a label edge, handwriting, glare, text split across lines.

## Not yet measured
Live speed and accuracy **on the iPhone**. Run `npm run serve`, open the printed `https://<laptop-ip>:8443/` on the phone, accept the certificate warning, tap Start, and use **Copy log** to capture numbers.

## First iPhone test (build v0.1.0, iPhone Safari, 1080x1920 full frame, sparse mode)
- OCR latency per frame: median 0.66 s (p90 0.91 s), about 1.4 frames/s.
- Reads that appeared were correct on the bottles checked, but it took roughly 7 frames (~5 s) per bottle:
  only ~8-14% of frames produced a result, and some frames were wasted aiming at nothing.
- Verdict: accurate but too slow to beat reading the CAS by eye.

## Speed experiments (offline, 1920 px frames, `--crop` / `--upscale` / `--whitelist` in the harness)
| Variant | Recall (incl. fuzzy) | Exact only | Median ms |
|---|---|---|---|
| Full frame | 50% | 27% | 460 |
| Center box 100% x 50% | 47% | 30% | 330 |
| Box + digits-only character whitelist | 30% | 23% | 350 |
| Box + 1.5x enlarge | 60% | 50% | 650 |
| Box 100% x 35% | 50% | 33% | 420 |

Cropping to a box is ~30% faster at similar recall; enlarging the box is the best accuracy lever;
a digits-only whitelist hurts, so it is not used.

## Build v0.2.0 changes (dev)
On-screen reticle box, OCR on the box only with 1.5x zoom, 2 parallel OCR workers, skip-blurry-frames filter,
and more speed fields in Copy log. Not yet measured on the phone.

## Second iPhone test (v0.2.0) and the barcode discovery
- Box + zoom + 2 workers: a little faster but still ~seconds per bottle; a smaller box was slower to focus.
- **No barcode was read at all in the phone test.** Offline test over the 38 photos confirmed it: the pure-JS
  `@zxing/library` decoded 0/38, even on a clean crop of a Code 128 tag.
- Replacing it with `zxing-wasm` (zxing-cpp compiled to WebAssembly) fixed this. At 1920 px it decodes 13/38 photos
  (median 83 ms); at full 3024 px 14/38 (median 220 ms). Of the 11 photos showing a full institution tag
  (10-digit `0000xxxxxx`, Code 128), 8 decode at 1920 px and 9 at full size; misses are small, oblique or curved tags.
  It also reads vendor Data Matrix / QR codes (Merck/Sigma GS1, Fisher URL) and older 6-digit lab labels.
- Build v0.3.0 uses zxing-wasm for barcodes. Barcode decoding ran at ~17 fps in the laptop browser test.
- Next: look tags up in the lab's own inventory export so a tag read gives the CAS/name instantly.

## Lab inventory lookup (build v0.4.0)
The lab's chemical-container export (5,951 containers, 99% with a CAS) keys containers by `Container ID`, which is the
same 10-digit number as the Code 128 barcode tag. Checked against the tags decoded from the test photos: 8 of 11 tags
are in the export, and for all 6 where the label prints a CAS it agrees with the inventory CAS. Not found: two tags in the
0000047xxx range (likely added after the export date) and one low-numbered tag.
- `src/csv.js` + `src/inventory.js`: CSV parsing and lookup by tag (leading zeros ignored, so 10-digit barcodes,
  11-digit ids and old 6-digit labels all match) and by CAS. 9 tag numbers are shared by more than one container
  once zeros are ignored; the page flags those as ambiguous.
- The page loads the CSV on the phone ("Load inventory CSV"), keeps it in the browser's IndexedDB, and never uploads it.
  A tag read now shows name, CAS, location and amount; a CAS read shows how many containers hold it and where.

# Changelog

## 1.3.0 — 2026-11-25
Faster tag scanning, with the same field of view.
- **Scanning starts the moment the camera does.** The CAS text reader used to load first, delaying tag scanning by
  seconds; it now loads in the background and joins in when ready.
- **Lab tag formats only by default** (Code 128, Code 39, ITF, Codabar, Code 93). On the test photos this is about 4x faster
  (59 ms -> 15 ms per 1920 px frame) with the same lab-tag recall. Vendor QR / Data Matrix codes are an opt-in setting
  ("Also read vendor QR / Data Matrix codes"), since they cost about 2.5x more and nothing uses them yet.
- **Full camera resolution, no downscaling.** Shrinking frames loses tags (1440 px read 5 of 8, 960 px read 1), so frames
  are decoded as the camera delivers them. The 4K camera setting is now a trial for reading smaller or farther tags.
- **Decoding follows the camera's frames** (requestVideoFrameCallback, never waiting more than 30 ms) instead of a
  tight loop that could decode the same picture twice.

## 1.2.0 — 2026-11-25
Celebration when Find reaches its goal.
- Enter the CAS you are looking for first; the start button then reads "Start scanning". Scan shelves; the moment a
  matching bottle is read, scanning stops and the camera freezes on it.
- Confetti burst, a pop-in "🎉 FOUND!" banner, a pulsing green glow and a short rising fanfare (plus a vibration
  on phones that allow it; iPhone does not). Reduced-motion phones skip the confetti and animations.
- "Keep looking" un-freezes the camera and resumes (skipping bottles already found); "Done" ends the search.

## 1.1.1 — 2026-11-25
Find mode fixes from phone testing.
- The tiny 🔍 icon is replaced by a full-width "Find a chemical — name or CAS" search bar under the stats. While you
  are searching it reads "Looking for: …"; tap it to change the target.
- A CAS typed **without hyphens** now works (`67641` finds 67-64-1). The iPhone number pad has no hyphen key. Spaces,
  dots and typographic dashes from iOS smart punctuation are accepted too, and partial CAS numbers still list every match.
- A valid CAS that is not in the inventory can still be searched for; a mistyped one explains that its check digit fails.

## 1.1.0 — 2026-11-25
Find mode.
- New 🔍 button: search the inventory by chemical name, CAS number (full or partial) or tag number, and pick what to
  look for. The page shows how many containers you have and where to try first.
- Scan until a matching bottle is seen: a tag whose inventory record has that CAS, or a CAS text read equal to the target.
  A big FOUND banner shows that container's tag, location and amount, plus where the other containers with that CAS are.
  It beeps, vibrates where the phone allows it (not on iPhone), and pauses scanning.
- "Keep looking" resumes and skips bottles already found; "Done" (or ✕) ends the search.
- You can pick a target before starting the camera. A CAS number can be typed even without an inventory loaded.

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

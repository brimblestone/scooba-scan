# Scooba Scan

A phone-camera web app for scanning chemical bottles hands-free. It identifies a bottle by its
**institution barcode tag** or by the **CAS number** printed on the label.

**Version 1.3.0.** Point the camera at a bottle: its tag is read in a fraction of a second and
looked up in your lab's inventory (name, CAS, location, amount). Labels without a tag fall back to reading the CAS number.
**Find mode** helps you locate a specific chemical on the shelf.

**Not built yet:** Bulk Add / CSV export and shelf audit. See [PLAN.md](PLAN.md) for
the roadmap, [CHANGELOG.md](CHANGELOG.md) for what changed, and [MILESTONE0.md](MILESTONE0.md) for measured speed and accuracy.

**Try it:** https://brimblestone.github.io/scooba-scan/ (iPhone Safari or Android Chrome, camera access required)

## Privacy
Everything runs on your device. The camera feed is processed in the browser by
[zxing-wasm](https://github.com/Sec-ant/zxing-wasm) (barcodes) and [Tesseract.js](https://github.com/naptha/tesseract.js) (text).
Nothing is uploaded and there is no backend or analytics.

## Find a chemical
Tap the 🔍 button, type a chemical name, CAS number or tag number, and pick the match. The page tells you how many
containers you have and where to look first. Then tap **Start scanning** and pan across the shelf: when a matching
bottle's tag (or CAS text) is seen, scanning stops, the camera freezes on the bottle, and you get confetti, a fanfare and
a green FOUND banner with its location. **Keep looking** finds the next
container; **Done** ends the search. The inventory CSV is needed to search by name.

## Full-screen on your phone
The camera fills the screen and the latest reads appear in a sheet at the bottom (tap its header to see more;
the gear opens settings). For a true full-screen view with no browser toolbars, open the page in Safari and choose
**Share → Add to Home Screen**, then launch it from the new icon.

## Lab inventory
Tap **Load inventory CSV** and choose your lab's chemical-container export. It is read on the phone and kept in the
browser's local storage. It is never uploaded and is not part of this repository (CSV files are git-ignored).
Scanning a tag then shows the container's name, CAS and location.

## Giving feedback during testing
Tap **Copy log** on the page and paste it into your report, along with your phone model and the build
shown at the bottom of the page. Please do **not** share photos of labels that show institution tags.

## Development
```
npm install
npm test            # unit tests for CAS extraction + checksum
npm run harness     # OCR accuracy over test-data/private (needs your own photos + expected.json)
npm run serve       # local dev server (https for a phone on the same network, http://localhost:8080 on this machine)
npm run build       # builds docs/ for GitHub Pages
```
Test photos live in `test-data/private/` and are git-ignored.

## License
[MIT](LICENSE)

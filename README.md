# Scooba Scan

A phone-camera web app for scanning chemical bottles hands-free. It identifies a bottle by its
**institution barcode tag** or by the **CAS number** printed on the label.

**Status: early prototype (Milestone 0, scanner spike).** Find and Bulk Add modes are not built yet.
See [PLAN.md](PLAN.md) for the design and [MILESTONE0.md](MILESTONE0.md) for current accuracy results.

**Try it:** https://brimblestone.github.io/scooba-scan/ (iPhone Safari or Android Chrome, camera access required)

## Privacy
Everything runs on your device. The camera feed is processed in the browser by
[ZXing](https://github.com/zxing-js/library) (barcodes) and [Tesseract.js](https://github.com/naptha/tesseract.js) (text).
Nothing is uploaded and there is no backend or analytics.

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

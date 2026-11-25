// HTTPS dev server for phone testing (camera access requires HTTPS).
//   npm run serve            -> https://<laptop-ip>:8443/
// Generates a self-signed certificate in certs/ (git-ignored) for localhost + this machine's LAN IPs.
// On the iPhone, open the URL, accept the certificate warning once, then allow camera access.
import http from 'node:http';
import https from 'node:https';
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, createReadStream } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 8443);

const ips = Object.values(networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);

const certDir = path.join(root, 'certs');
const keyFile = path.join(certDir, 'key.pem');
const certFile = path.join(certDir, 'cert.pem');
const sanFile = path.join(certDir, 'san.txt');
const san = ['DNS:localhost', 'IP:127.0.0.1', ...ips.map((ip) => `IP:${ip}`)].join(',');
// Regenerate when this machine's IPs change (e.g. switching to a phone hotspot).
if (!existsSync(certFile) || !existsSync(sanFile) || readFileSync(sanFile, 'utf8') !== san) {
  mkdirSync(certDir, { recursive: true });
  writeFileSync(sanFile, san);
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '30', '-keyout', keyFile, '-out', certFile, '-subj', '/CN=scooba-scan-dev', '-addext', `subjectAltName=${san}`], { stdio: 'ignore' });
  console.log('Generated self-signed certificate (valid 30 days).');
}

// URL prefix -> directory/file on disk. Everything is served locally so the phone needs no internet.
const mounts = [
  ['/vendor/tesseract/', 'node_modules/tesseract.js/dist/'],
  ['/vendor/tesseract-core/', 'node_modules/tesseract.js-core/'],
  ['/vendor/zxing/', 'node_modules/@zxing/library/umd/'],
  ['/vendor/lang/', '.'], // eng.traineddata lives in the project root (downloaded on first harness run)
  ['/src/', 'src/'],
  ['/', 'web/'],
];
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.json': 'application/json', '.css': 'text/css', '.traineddata': 'application/octet-stream' };

function resolve(urlPath) {
  for (const [prefix, dir] of mounts) {
    if (!urlPath.startsWith(prefix)) continue;
    let rel = urlPath.slice(prefix.length) || 'index.html';
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.resolve(root, dir, rel);
    if (!file.startsWith(path.resolve(root, dir))) return null; // path traversal guard
    if (prefix === '/vendor/lang/' && !file.endsWith('.traineddata')) return null; // don't expose the project root
    if (existsSync(file) && statSync(file).isFile()) return file;
  }
  return null;
}

const handler = (req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'https://x').pathname);
  const file = resolve(urlPath);
  if (!file) { res.writeHead(404).end('not found'); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  createReadStream(file).pipe(res);
};
// Laptop-only plain-HTTP listener: http://localhost is a secure context, so the camera API works without a cert.
http.createServer(handler).listen(Number(process.env.HTTP_PORT || 8080), '127.0.0.1');
https.createServer({ key: readFileSync(keyFile), cert: readFileSync(certFile) }, handler).listen(PORT, '0.0.0.0', () => {
  console.log('\nScooba Scan dev server (HTTPS). Open on your iPhone:');
  for (const ip of ips) console.log(`  https://${ip}:${PORT}/`);
  console.log(`  http://localhost:${process.env.HTTP_PORT || 8080}/  (this laptop only, no certificate warning)\n`);
});

// Copies Tesseract OCR worker, engine and language data into public/tesseract
// so the app can run OCR from its own origin (the production CSP blocks CDNs).
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nm = join(root, 'node_modules');
const out = join(root, 'public', 'tesseract');
mkdirSync(out, { recursive: true });

const copy = (from, name) => copyFileSync(from, join(out, name));

copy(join(nm, 'tesseract.js', 'dist', 'worker.min.js'), 'worker.min.js');

const coreDir = join(nm, 'tesseract.js-core');
for (const file of readdirSync(coreDir)) {
  // The .wasm.js builds embed the wasm binary, so the raw .wasm files are not needed.
  if (/^tesseract-core.*lstm\.wasm\.js$/.test(file)) {
    copy(join(coreDir, file), file);
  }
}

for (const lang of ['tha', 'eng']) {
  const file = `${lang}.traineddata.gz`;
  copy(join(nm, '@tesseract.js-data', lang, '4.0.0_best_int', file), file);
}

console.log(`Tesseract assets copied to ${out}`);

// Static validation of the built output.
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const dist = resolve(root, 'dist');

const required = [
  'dist/index.html',
  'dist/favicon.svg',
  'dist/worklets/meter-processor.js',
  'dist/worklets/gate-processor.js',
  'dist/worklets/deesser-processor.js'
];
let failed = 0;
for (const rel of required) {
  const p = resolve(root, rel);
  if (!existsSync(p)) {
    console.error('MISSING:', rel);
    failed++;
  } else {
    const size = statSync(p).size;
    if (size === 0) { console.error('EMPTY:', rel); failed++; }
    else console.log('OK     ', rel, '(' + size + ' bytes)');
  }
}
if (failed > 0) {
  console.error('\nValidation failed. Run: npm run build');
  process.exit(1);
}

// Sanity check index.html references the built JS and CSS
const html = readFileSync(resolve(dist, 'index.html'), 'utf8');
if (!/src="\/assets\/index-[^"]+\.js"/.test(html)) {
  console.error('index.html does not reference the built JS bundle.');
  process.exit(1);
}
if (!/href="\/assets\/index-[^"]+\.css"/.test(html)) {
  console.error('index.html does not reference the built CSS bundle.');
  process.exit(1);
}
console.log('\nProduction build looks complete.');
// Validate catalog parts (and generated cards once patterns exist).
// Usage: node scripts/validate-catalog.js [data/parts/catalog-*.json | data/parts/patterns.json]
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { CatalogEntry, Pattern, Card, PATTERN_IDS } from '../lib/schemas.js';
import { buildCard } from '../public/offline-match.js';

const root = new URL('..', import.meta.url).pathname;
const parts = join(root, 'data/parts');
const files = process.argv.slice(2).length ? process.argv.slice(2)
  : readdirSync(parts).filter(f => /^(catalog-|patterns)/.test(f)).map(f => join(parts, f));
const patFile = join(parts, 'patterns.json');
const patterns = existsSync(patFile) ? JSON.parse(readFileSync(patFile, 'utf8')) : null;
let bad = 0;
const fail = (where, msg) => { bad++; console.log(`FAIL  ${where}: ${msg}`); };

for (const f of files) {
  const data = JSON.parse(readFileSync(f, 'utf8'));
  if (basename(f).startsWith('patterns')) {
    for (const id of PATTERN_IDS) if (!data[id]) fail('patterns', `missing ${id}`);
    for (const [id, p] of Object.entries(data)) {
      const r = Pattern.safeParse(p);
      if (!r.success) r.error.issues.slice(0, 6).forEach(i => fail(`pattern ${id}`, `${i.path.join('.')}: ${i.message}`));
    }
    console.log(`ok    patterns: ${Object.keys(data).length}`);
    continue;
  }
  const names = new Set();
  data.forEach((e, i) => {
    const r = CatalogEntry.safeParse(e);
    if (!r.success) return r.error.issues.slice(0, 6).forEach(x => fail(`${basename(f)}[${i}] ${e.name}`, `${x.path.join('.')}: ${x.message}`));
    if (names.has(e.name.toLowerCase())) fail(e.name, 'duplicate');
    names.add(e.name.toLowerCase());
    if (patterns) {
      const c = Card.safeParse(buildCard(r.data, patterns));
      if (!c.success) fail(e.name, `generated card invalid: ${c.error.issues[0].path.join('.')} ${c.error.issues[0].message}`);
    }
  });
  console.log(`ok    ${basename(f)}: ${data.length} entries${patterns ? ' (cards generated)' : ''}`);
}
process.exit(bad ? 1 : 0);

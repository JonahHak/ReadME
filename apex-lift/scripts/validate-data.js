// Validate offline content against the Zod schemas.
// Usage: node scripts/validate-data.js [file ...]   (defaults to every data/parts file)
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { SCHEMAS } from '../lib/schemas.js';

const root = new URL('..', import.meta.url).pathname;
const partsDir = join(root, 'data/parts');
const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : existsSync(partsDir) ? readdirSync(partsDir).map(f => join(partsDir, f)) : [];

const kindFor = f => {
  const b = basename(f);
  if (b.startsWith('cards')) return 'card';
  if (b.startsWith('pregame')) return 'pregame';
  if (b.startsWith('sessions')) return 'session';
  return null;
};

let bad = 0;
for (const f of files) {
  const kind = kindFor(f);
  const raw = JSON.parse(readFileSync(f, 'utf8'));
  if (!kind) { console.log(`skip  ${basename(f)} (no schema)`); continue; }
  const items = kind === 'session' ? raw.map(s => s.session) : raw;
  items.forEach((item, i) => {
    const r = SCHEMAS[kind].safeParse(item);
    if (!r.success) {
      bad++;
      console.log(`FAIL  ${basename(f)}[${i}] ${item.name || item.sport || item.title}:`);
      r.error.issues.slice(0, 8).forEach(x => console.log(`      ${x.path.join('.')}: ${x.message}`));
    }
    if (kind === 'card') {
      const blob = JSON.stringify(item).toLowerCase();
      if (/\b\d+\s?(mg|g)\b.*(creatine|caffeine|ashwagandha|boron|zinc)/.test(blob)) { bad++; console.log(`FAIL  ${item.name}: supplement dosing`); }
    }
  });
  console.log(`ok    ${basename(f)}: ${items.length} ${kind}(s) checked`);
}
process.exit(bad ? 1 : 0);

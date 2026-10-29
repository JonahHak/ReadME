// Merge data/parts/* into the shipped offline files:
//   data/exercises.json  = { cards, morning5, pregame, sessions }
//   data/fightlab.json, data/systems.json, data/catalog.json, data/patterns.json
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_PROFILE } from '../lib/profile.js';

const root = new URL('..', import.meta.url).pathname;
const parts = join(root, 'data/parts');
const read = f => JSON.parse(readFileSync(join(parts, f), 'utf8'));

const seen = new Set();
const cards = readdirSync(parts).filter(f => f.startsWith('cards')).sort().flatMap(read)
  .filter(c => !seen.has(c.name.toLowerCase()) && seen.add(c.name.toLowerCase()));

const exercises = { cards, morning5: read('morning5.json'), pregame: read('pregame.json'), sessions: read('sessions.json') };
writeFileSync(join(root, 'data/exercises.json'), JSON.stringify(exercises, null, 1));
writeFileSync(join(root, 'data/fightlab.json'), JSON.stringify(read('fightlab.json'), null, 1));
writeFileSync(join(root, 'data/systems.json'), JSON.stringify(read('systems.json'), null, 1));
const seenCat = new Set();
const catalog = readdirSync(parts).filter(f => f.startsWith('catalog-')).sort().flatMap(read)
  .filter(e => !seenCat.has(e.name.toLowerCase()) && seenCat.add(e.name.toLowerCase()));
writeFileSync(join(root, 'data/catalog.json'), JSON.stringify(catalog));
writeFileSync(join(root, 'data/patterns.json'), JSON.stringify(read('patterns.json')));
console.log(`catalog.json: ${catalog.length} exercises`);
writeFileSync(join(root, 'data/profile.json'), JSON.stringify({ profile: DEFAULT_PROFILE }, null, 1));
console.log(`exercises.json: ${cards.length} cards, ${exercises.pregame.length} pre-game, ${exercises.sessions.length} sessions`);

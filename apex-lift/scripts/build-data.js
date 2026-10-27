// Merge data/parts/* into the shipped offline files:
//   data/exercises.json  = { cards, morning5, pregame, sessions }
//   data/fightlab.json, data/systems.json
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

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
console.log(`exercises.json: ${cards.length} cards, ${exercises.pregame.length} pre-game, ${exercises.sessions.length} sessions`);

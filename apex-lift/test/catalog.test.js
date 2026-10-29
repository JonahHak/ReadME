import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Card, Session, Pattern, PATTERN_IDS } from '../lib/schemas.js';
import { buildCard, offlineCard, planWorkout, allNames } from '../public/offline-match.js';

const read = f => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8'));
const DATA = { ...read('exercises.json'), catalog: read('catalog.json'), patterns: read('patterns.json') };

test('every movement pattern exists and validates', () => {
  for (const id of PATTERN_IDS) assert.ok(Pattern.safeParse(DATA.patterns[id]).success, id);
});

test('every catalog exercise builds a complete, valid card', () => {
  assert.ok(DATA.catalog.length >= 300, `only ${DATA.catalog.length} exercises`);
  for (const e of DATA.catalog) {
    const c = buildCard(e, DATA.patterns);
    const r = Card.safeParse(c);
    assert.ok(r.success, `${e.name}: ${r.error?.issues[0]?.path.join('.')} ${r.error?.issues[0]?.message}`);
    if (e.standing) assert.ok(c.footBase, `${e.name}: standing without foot cue`);
  }
});

test('common searches land on the right exercise', () => {
  const cases = {
    'leg curl': /leg curl/i, 'seated leg curl': /seated leg curl/i, 'leg extension': /leg extension/i,
    'lat pulldown': /pulldown/i, 'skull crushers': /skull/i, 'tricep pushdown': /pushdown/i,
    'hip thrust': /hip thrust/i, 'face pulls': /face pull/i, 'kb swing': /swing/i, 'jump rope': /rope/i,
    'cable crossover': /crossover|fly/i, 'preacher curl': /preacher/i, 'hack squat': /hack/i,
    'calf raise': /calf/i, 'heavy bag': /bag/i, 'rdl': /romanian/i, 'bss': /bulgarian/i,
  };
  for (const [q, re] of Object.entries(cases)) {
    const c = offlineCard(DATA, q);
    assert.ok(c && re.test(c.name), `"${q}" → ${c?.name}`);
    assert.ok(!c.guessed, `"${q}" should be a real library entry`);
  }
});

test('unknown names still get a full card (nearest exercise or movement pattern)', () => {
  for (const q of ['zigzag kettlebell reverse lunge thing', 'weird cable bicep curl variation', 'qwerty press']) {
    const c = offlineCard(DATA, q);
    assert.ok(c, q);
    assert.ok(Card.safeParse(c).success, q);
  }
});

test('autocomplete knows hundreds of names', () => {
  assert.ok(allNames(DATA).length >= 300);
});

test('"I pick, APEX coaches": reorders, doses, balances, validates', () => {
  const s = planWorkout(DATA, ['leg extension', 'leg curl', 'back squat', 'box jump', 'plank'], { equipment: 'Full gym', time: 60 });
  assert.ok(Session.safeParse(s).success);
  const order = s.blocks.flatMap(b => b.items.map(i => i.name));
  const idx = re => order.findIndex(n => re.test(n));
  assert.ok(idx(/box jump/i) < idx(/leg curl/i), 'power before isolation');
  assert.ok(idx(/squat/i) < idx(/leg extension/i), 'compound before isolation');
  assert.ok(idx(/plank/i) > idx(/leg curl/i), 'core last');
  assert.equal(s.blocks[0].phase, 'CNS Prime');
  assert.equal(s.blocks.at(-1).phase, 'Cooldown');
  assert.ok(s.rules.some(r => /Reordered/.test(r)));
  const push = planWorkout(DATA, ['bench press', 'shoulder press', 'tricep pushdown'], {});
  assert.ok(push.rules.some(r => /no pull/.test(r)));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Card, PreGame, Session } from '../lib/schemas.js';
import { parsePartial } from '../public/partial-json.js';

const d = JSON.parse(readFileSync(new URL('../data/exercises.json', import.meta.url), 'utf8'));
const STANDING = /squat|deadlift|lunge|calf|overhead press|raise|hammer curl|carry|jump|hop|shadow|throw|barbell row|sprint|sprawl|face pull/i;
const ROTATIONAL = /throw|shadow|sprawl/i;
const BANNED = /(ashwagandha|boron|t[- ]booster|pre-workout|mouth tap|mewing|mastic|ice bath after lift)/i;

test('every card validates and passes the Section 4 audit', () => {
  for (const c of d.cards) {
    assert.ok(Card.safeParse(c).success, c.name);
    assert.ok(c.setup.cues.length <= 3, `${c.name}: >3 cues`);
    assert.ok(c.tips.every(t => t.grade), `${c.name}: ungraded tip`);
    if (STANDING.test(c.name) && !/prone|incline|seated|lying/i.test(c.name)) assert.ok(c.footBase, `${c.name}: missing foot cue`);
    if (ROTATIONAL.test(c.name)) assert.ok(c.sequencing, `${c.name}: missing sequencing`);
    const blob = JSON.stringify(c);
    assert.ok(!/\d+\s?(mg|grams?)\b[^.]{0,40}(creatine|caffeine)/i.test(blob), `${c.name}: supplement dose`);
    assert.ok(!/(ashwagandha|boron|t-booster|pre-workout)/i.test(blob.replace(/never[^.]*\./gi, '')), `${c.name}: banned supplement`);
  }
});

test('pre-game protocols follow the Mode D order and have one anchor cue', () => {
  const order = ['CNS Prime', 'Visual Priming', 'Kinetic-Chain Activation', 'Motor-Pattern Grooving', 'Progressive Loading'];
  for (const p of d.pregame) {
    assert.ok(PreGame.safeParse(p).success, p.sport);
    const idx = p.steps.map(s => order.indexOf(s.phase));
    assert.deepEqual(idx, [...idx].sort((a, b) => a - b), `${p.sport}: phases out of order`);
    assert.ok(p.anchorCue.length < 80, `${p.sport}: anchor cue too long`);
  }
});

test('sessions validate and every session has a win', () => {
  for (const s of d.sessions) {
    assert.ok(Session.safeParse(s.session).success, s.id);
    assert.ok(s.session.win.metric);
  }
});

test('no banned claims anywhere in shipped content', () => {
  for (const f of ['exercises.json', 'systems.json', 'fightlab.json']) {
    const text = readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8')
      .replace(/"[^"]*\b(no|never|not|don't|avoid|removed|skip)\b[^"]*"/gi, '""');
    const m = text.match(BANNED);
    assert.ok(!m, `${f}: "${m?.[0]}"`);
  }
});

test('partial JSON parser recovers streamed prefixes', () => {
  const full = JSON.stringify(d.cards[0]);
  for (const n of [20, 200, 900, full.length - 3]) assert.equal(typeof parsePartial(full.slice(0, n)), 'object', `prefix ${n}`);
  assert.equal(parsePartial(full).name, d.cards[0].name);
  assert.equal(parsePartial('```json\n{"name":"Pog').name, 'Pog');
});

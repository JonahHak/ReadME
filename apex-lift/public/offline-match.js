// Offline matching over data/exercises.json. Shared by the server (lib/fallback.js)
// and the browser (static mode, when no server/gateway is reachable).

const STOP = new Set(['the', 'a', 'an', 'my', 'in', 'for', 'with', 'and', 'min', 'mins', 'minutes', 'day', 'today', 'i', 'have', 'only', 'do', 'some', 'of', 'to', 'at', 'on', 'game', 'session']);
const norm = s => s.toLowerCase().replace(/[^a-z0-9+ ]/g, ' ').replace(/\bdb\b/g, 'dumbbell').replace(/\bbb\b/g, 'barbell').replace(/\s+/g, ' ').trim();
const tokens = s => norm(s).split(' ').filter(w => w && !STOP.has(w));

function score(query, names) {
  const q = norm(query);
  const qt = tokens(query);
  let best = 0;
  for (const n of names) {
    const nn = norm(n);
    if (!nn) continue;
    if (nn === q) return 100;
    let s = 0;
    if (q.includes(nn)) s = 60 + nn.length / 2;
    else if (nn.includes(q)) s = 50;
    const nt = tokens(n);
    const hits = qt.filter(w => nt.some(t => t === w || (w.length > 3 && t.startsWith(w.slice(0, -1))))).length;
    s = Math.max(s, (hits / Math.max(nt.length, 1)) * 40 + hits * 5);
    best = Math.max(best, s);
  }
  return best;
}

function bestOf(list, query, namesOf, min = 20) {
  const ranked = list.map(item => ({ item, s: score(query, namesOf(item)) })).sort((a, b) => b.s - a.s);
  return ranked[0] && ranked[0].s >= min ? ranked[0].item : null;
}

const GENERIC_FOOT = 'Tripod foot (big-toe ball, pinky-toe ball, heel) and the Screw: rotate both feet outward into the floor without moving them. The arch lifts, knees track over toes and glutes switch on before the first rep. Flat feet leak force here first.';

// Build a full Optimization Card from a catalog entry + its movement pattern.
export function buildCard(entry, patterns) {
  const p = patterns[entry.pattern];
  const footBase = entry.standing === false ? (p.footBaseSeated ?? null) : (p.footBase || GENERIC_FOOT);
  const tips = [{ tip: entry.note, grade: entry.noteGrade || 'C', source: entry.noteGrade && entry.noteGrade !== 'C' ? undefined : 'grade C, mechanism-based' }, ...p.tips].slice(0, 6);
  return {
    name: entry.name,
    aliases: entry.aliases || [],
    category: p.category,
    muscles: entry.muscles,
    equipment: entry.equipment,
    doThisNotThat: entry.doThisNotThat,
    priorityNote: p.priorityNote,
    prescription: { ...p.prescription, ...(entry.prescription || {}) },
    setup: { steps: entry.steps, cues: entry.cues.slice(0, 3) },
    biomechanics: { ...p.biomechanics, ...(entry.hardestPoint ? { hardestPoint: entry.hardestPoint } : {}) },
    neural: p.neural,
    elastic: p.elastic ?? null,
    mobility: p.mobility,
    footBase,
    sequencing: p.sequencing ?? null,
    looks: p.looks,
    sportTransfer: p.sportTransfer,
    intensityTechnique: p.intensityTechnique,
    tips,
    teachMe: p.teachMe,
    swaps: { home: entry.homeSwap, bodyweight: p.swaps.bodyweight },
    evidence: p.evidence,
    pattern: entry.pattern,
  };
}

// Unknown name → closest movement pattern by keyword, so nothing comes back empty.
export function guessPattern(DATA, query) {
  const q = ` ${norm(query)} `;
  let best = null, bestScore = 0;
  for (const p of Object.values(DATA.patterns || {})) {
    const sc = p.keywords.reduce((a, k) => a + (q.includes(` ${norm(k)}`) ? norm(k).length : 0), 0);
    if (sc > bestScore) { best = p; bestScore = sc; }
  }
  return best;
}

const titleCase = s => s.trim().replace(/\s+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

function patternCard(p, name) {
  return {
    ...buildCard({ name, aliases: [], pattern: p.id, equipment: ['any'], muscles: ['see pattern'], standing: !p.footBaseSeated, doThisNotThat: p.doThisNotThat, steps: p.defaultSteps, cues: p.defaultCues, homeSwap: p.swaps.home, note: `Not in the library by name, so this is coached as a ${p.label} pattern. Connect the live coach for exact setup.` }, { [p.id]: p }),
    footBase: p.footBase || GENERIC_FOOT,
    guessed: true,
  };
}

export function offlineCard(DATA, query) {
  const hand = DATA.cards.map(c => ({ c, s: score(query, [c.name, ...(c.aliases || [])]) + 3 }));
  const cat = (DATA.catalog || []).map(e => ({ e, s: score(query, [e.name, ...(e.aliases || [])]) }));
  const best = [...hand, ...cat].sort((a, b) => b.s - a.s)[0];
  if (best && best.s >= 22) return best.c || buildCard(best.e, DATA.patterns);
  const p = guessPattern(DATA, query);
  return p ? patternCard(p, titleCase(query)) : null;
}

// Every name the app knows, for autocomplete.
export function allNames(DATA) {
  return [...new Set([...DATA.cards.map(c => c.name), ...(DATA.catalog || []).map(e => e.name)])].sort();
}

// ---------- "I pick the exercises, APEX tells me how" ----------
const CAT_RANK = { combat: 0.5, skill: 0.5, power: 1, plyo: 1, compound: 2, isolation: 4, core: 5, conditioning: 6, mobility: 8 };
const BAL_OF_CAT = { power: 'power', plyo: 'power', core: 'core', conditioning: 'conditioning', mobility: 'mobility', combat: 'skill', skill: 'skill' };
const firstNum = (s, d) => { const m = /(\d+(?:\.\d+)?)/.exec(s || ''); return m ? Number(m[1]) : d; };
const restSec = s => { const n = firstNum(s, 90); return /min/.test(s || '') ? n * 60 : n; };

function describe(DATA, name) {
  const card = offlineCard(DATA, name);
  const pid = card?.pattern || guessPattern(DATA, card?.name || name)?.id;
  const p = pid ? DATA.patterns?.[pid] : null;
  const rank = p ? p.rank : CAT_RANK[card?.category] ?? 3;
  const balance = p ? p.balance : BAL_OF_CAT[card?.category] || 'other';
  return { asked: name, card, p, rank, balance };
}

export function planWorkout(DATA, names, toggles = {}) {
  const items = names.map((n, i) => ({ ...describe(DATA, n), i }));
  const sorted = [...items].sort((a, b) => a.rank - b.rank || a.i - b.i);
  const moved = sorted.filter((x, k) => x.i !== k);
  const cooked = toggles.energy === 'Cooked';
  const dose = it => {
    const pr = it.card?.prescription || {};
    let sets = pr.sets || '3 working';
    if (cooked && it.rank >= 2 && it.rank < 6) sets = '2 working (Cooked)';
    return { dose: `${sets} × ${pr.reps || '6-10'} · ${pr.load || '1-2 RIR'}`, rest: pr.rest || '2 min' };
  };
  const row = (it, extra = '') => ({ name: it.card?.name || it.asked, ...dose(it), note: `${it.card?.setup?.cues?.[0] || ''}${extra}`.trim() || undefined, expandable: true });

  const skill = sorted.filter(x => x.rank < 1);
  const power = sorted.filter(x => x.rank >= 1 && x.rank < 2);
  const main = sorted.filter(x => x.rank >= 2 && x.rank < 3.5);
  const acc = sorted.filter(x => x.rank >= 3.5 && x.rank < 5);
  const fin = sorted.filter(x => x.rank >= 5 && x.rank < 8);
  const mob = sorted.filter(x => x.rank >= 8);
  const lower = items.some(x => ['quad', 'hip'].includes(x.balance));

  const blocks = [{ phase: 'CNS Prime', items: [
    { name: 'Box breathing', dose: '4 rounds of 4-4-4-4 s', note: 'Downshifts the threat response so the nervous system releases range and speed.', expandable: false },
    { name: 'Wall push isometric', dose: '2 × 6 s max effort', note: '"Release the brake": recruits more fibers before the first working set.', expandable: false },
    { name: 'Saccades + near-far focus', dose: '30 s each', note: 'Eyes are the first link in the chain.', expandable: false },
    lower ? { name: 'Pogo Hops', dose: '2 × 10 quick, quiet contacts', note: 'Wakes the Achilles spring.', expandable: true }
      : { name: 'The Screw + tripod foot hold', dose: '3 × 5 s', note: 'Sets your base before you load anything.', expandable: false },
  ] }];
  if (skill.length) blocks.push({ phase: 'Skill', items: skill.map(x => row(x, ' Do skill work fresh, before lifting.')) });
  if (main.length) blocks.push({ phase: 'Main', items: main.map(x => row(x)) });
  const pp = main[0]?.card?.neural?.powerPair;
  const powerItems = power.map(x => row(x));
  if (!power.length && pp && pp.type !== 'none') powerItems.push({ name: pp.exercise, dose: pp.dose, rest: pp.rest, note: `APEX added: ${pp.type === 'PAPE' ? 'PAPE — wait ~4-8 min after your heavy set' : 'contrast — do it right after the set'}.`, expandable: true });
  if (powerItems.length) blocks.push({ phase: 'Power', items: powerItems });
  if (acc.length) blocks.push({ phase: 'Accessory', items: acc.map(x => row(x, ' Last set: to failure + 3-5 lengthened partials.')) });
  if (fin.length) blocks.push({ phase: fin.some(x => x.rank >= 6) ? 'Conditioning' : 'Finisher', items: fin.map(x => row(x)) });
  blocks.push({ phase: 'Cooldown', items: [
    ...mob.map(x => row(x)),
    { name: 'Long-exhale breathing, lying down', dose: '2 min, 4 s in / 8 s out', note: 'Switches you to recovery mode.', expandable: false },
  ] });

  const rules = [];
  if (moved.length) rules.push(`Reordered: power and heavy compounds go first while you're fresh, isolations after, core/conditioning last. Moved: ${moved.map(x => x.card?.name || x.asked).join(', ')}.`);
  const has = b => items.some(x => x.balance === b);
  if (has('push') && !has('pull')) rules.push('Balance: all push, no pull. Add a row or pulldown (1:1 sets) so your shoulders stay healthy and posture improves.');
  if (has('quad') && !has('hip')) rules.push('Balance: quads but no hamstrings/glutes. Add an RDL or leg curl; Nordic curls cut hamstring injuries (grade A-B).');
  if (cooked) rules.push('COOKED: 2 working sets, no failure, keep power crisp.');
  if (toggles.game48) rules.push('GAME/FIGHT WITHIN 48 H: skip anything new, no eccentric-heavy work, no lower-body failure.');
  if ((toggles.sore || []).length) rules.push(`Sore: ${toggles.sore.join(', ')}. Swap anything that loads it painfully; sharp or joint-line pain = stop and swap.`);
  items.filter(x => x.card?.guessed).forEach(x => rules.push(`${x.card.name}: not in the library by name, coached as a ${x.p?.label || 'general'} pattern.`));
  const unknown = items.filter(x => !x.card);
  if (unknown.length) rules.push(`Couldn't place: ${unknown.map(x => x.asked).join(', ')}. Check the spelling or pick from the list.`);

  const est = Math.round(10 + items.filter(x => x.card).reduce((a, x) => {
    const sets = firstNum(x.card.prescription?.sets, 3) + 1;
    return a + (sets * (40 + restSec(x.card.prescription?.rest))) / 60;
  }, 0));
  if (toggles.time && est > toggles.time + 5) rules.push(`Time: about ${est} min, over your ${toggles.time}-min budget. Drop to 2 sets on accessories or cut the last one.`);

  const lead = main[0] || power[0] || items[0];
  const leadName = lead?.card?.name || lead?.asked || 'your first lift';
  return {
    title: 'Your Workout',
    programMode: 'custom',
    priorityNote: 'Order follows athleticism first: fast and heavy work while fresh, size work after, conditioning last.',
    durationMin: est,
    equipment: toggles.equipment || 'Home',
    win: lead?.rank < 2
      ? { metric: `${leadName}: best rep of the day (height, distance or speed)`, why: 'Power output is the most direct read on how athletic you are getting.' }
      : { metric: `${leadName}: beat last time by 1 rep or 5 lb at the same RIR`, why: 'Double progression on your main lift is the clearest proof you got stronger this week.' },
    blocks,
    rules,
    nextTarget: `${leadName}: when every working set hits the top of the rep range, add load; otherwise add 1 rep to set 1.`,
  };
}

export function offlinePregame(DATA, query) {
  return bestOf(DATA.pregame, query, p => [p.sport, ...(p.aliases || [])], 15)
    || DATA.pregame.find(p => /first|any|new/i.test(p.sport)) || null;
}

const EQUIP = { Home: 'home', 'Full gym': 'gym', Bodyweight: 'bodyweight', Hotel: 'hotel' };
const SOON = /\b(fight|game|match|meet|race|tournament|tryout)s?\b.*\b(tomorrow|tonight|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|this week|weekend)\b/;

export function offlineSession(DATA, query, toggles = {}) {
  const q = norm(query);
  if (SOON.test(q)) toggles = { ...toggles, game48: true };
  const want = EQUIP[toggles.equipment] || (/home/.test(q) ? 'home' : /hotel/.test(q) ? 'hotel' : /gym/.test(q) ? 'gym' : 'home');
  const ranked = DATA.sessions.map(s => {
    let sc = score(query, [s.session.title, ...(s.match || [])]);
    if (s.equipment?.includes(want)) sc += 15;
    if (toggles.game48 && /fight.?week|48/i.test(s.id)) sc += 20;
    if (!toggles.game48 && /fight.?week/i.test(s.id)) sc -= 10;
    return { s, sc };
  }).sort((a, b) => b.sc - a.sc);
  const hit = ranked[0]?.sc >= 20 ? ranked[0].s : null;
  if (!hit) return null;
  const session = structuredClone(hit.session);
  const extra = [];
  if (toggles.energy === 'Cooked') extra.push('COOKED: drop to 2 working sets on everything, no failure, keep the power work crisp and short. A crisp session beats a sloppy long one.');
  if (toggles.game48) extra.push('GAME/FIGHT WITHIN 48 H: no new exercises, skip eccentric-heavy work, no lower-body failure; power stays low-volume and sharp.');
  if ((toggles.sore || []).length) extra.push(`Sore: ${toggles.sore.join(', ')} — swap any exercise that loads it painfully; sharp or joint-line pain = stop and swap.`);
  session.rules = [...extra, ...(session.rules || [])];
  return session;
}

export const offlineIndex = DATA => ({
  cards: DATA.cards.map(c => c.name),
  pregame: DATA.pregame.map(p => p.sport),
  sessions: DATA.sessions.map(s => s.session.title),
});

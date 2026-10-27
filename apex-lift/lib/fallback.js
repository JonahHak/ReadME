// Offline answers from data/exercises.json when the gateway is missing or fails.
import { readFileSync, existsSync } from 'node:fs';

const file = new URL('../data/exercises.json', import.meta.url);
const DATA = existsSync(file)
  ? JSON.parse(readFileSync(file, 'utf8'))
  : { cards: [], pregame: [], sessions: [], morning5: null };

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

export function offlineCard(query) {
  return bestOf(DATA.cards, query, c => [c.name, ...(c.aliases || [])]);
}

export function offlinePregame(query) {
  return bestOf(DATA.pregame, query, p => [p.sport, ...(p.aliases || [])], 15)
    || DATA.pregame.find(p => /first|any|new/i.test(p.sport)) || null;
}

const EQUIP = { Home: 'home', 'Full gym': 'gym', Bodyweight: 'bodyweight', Hotel: 'hotel' };

const SOON = /\b(fight|game|match|meet|race|tournament|tryout)s?\b.*\b(tomorrow|tonight|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|this week|weekend)\b/;

export function offlineSession(query, toggles = {}) {
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

export const offlineIndex = () => ({
  cards: DATA.cards.map(c => c.name),
  pregame: DATA.pregame.map(p => p.sport),
  sessions: DATA.sessions.map(s => s.session.title),
});

export const morning5 = () => DATA.morning5;

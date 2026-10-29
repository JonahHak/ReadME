import { parsePartial } from './partial-json.js';
import * as offline from './offline-match.js';

// ---------- tiny helpers ----------
const $ = (sel, el = document) => el.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const h = (strings, ...vals) => strings.reduce((out, s, i) => out + s + (i < vals.length ? (vals[i]?.__html ?? esc(vals[i])) : ''), '');
const raw = html => ({ __html: html });
const today = () => new Date().toLocaleDateString('en-CA');
const daysAgo = n => new Date(Date.now() - n * 864e5).toLocaleDateString('en-CA');

// ---------- storage (localStorage, never trusted to exist) ----------
const KEY = 'apex.v1';
const DEFAULT_STATE = {
  profile: '', settings: { textModel: '', visionModel: '', programMode: 'split' },
  toggles: { equipment: 'Home', time: 45, energy: 'Normal', game48: false, sore: [] },
  logs: [], tests: [], garmin: [], reaction: [], session: null, last: {},
};
let S = structuredClone(DEFAULT_STATE);
try { S = { ...S, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { /* private mode */ }
S.toggles = { ...DEFAULT_STATE.toggles, ...S.toggles };
S.settings = { ...DEFAULT_STATE.settings, ...S.settings };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* storage full or blocked */ } };

// ---------- data ----------
const DATA = { health: null, profile: '', morning5: null, tips: null, fight: null, systems: null, offline: null };
const getJSON = url => fetch(url).then(r => (r.ok ? r.json() : null)).catch(() => null);

// ---------- tabs ----------
const TABS = [
  ['optimize', 'Optimize'], ['session', 'Build Session'], ['pregame', 'Pre-Game'], ['fight', 'Fight Lab'],
  ['lungs', 'Lungs'], ['vision', 'Vision & Skills'], ['log', "Today's Log"], ['progress', 'Progress'],
  ['tips', 'Tips Library'], ['settings', 'Settings'],
];
const TOGGLE_TABS = new Set(['optimize', 'session', 'pregame', 'fight']);
let current = location.hash.slice(1) || 'optimize';

function renderTabs() {
  $('#tabs').innerHTML = TABS.map(([id, label]) =>
    h`<button class="tab" role="tab" data-tab="${id}" aria-selected="${id === current}">${label}</button>`).join('');
}
$('#tabs').addEventListener('click', e => {
  const b = e.target.closest('[data-tab]');
  if (b) go(b.dataset.tab);
});
function go(tab) {
  current = tab;
  history.replaceState(null, '', `#${tab}`);
  renderTabs();
  $('#toggles').hidden = !TOGGLE_TABS.has(tab);
  $('#view').onclick = null;
  VIEWS[tab]();
  $(`[data-tab="${tab}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest' });
  window.scrollTo(0, 0);
}

// ---------- quick toggles ----------
const EQUIP = ['Home', 'Full gym', 'Bodyweight', 'Hotel'];
const TIMES = [5, 15, 30, 45, 60];
const ENERGY = ['Fresh', 'Normal', 'Cooked'];
function renderToggles() {
  const t = S.toggles;
  const chips = (key, vals, fmt = v => v) => vals.map(v =>
    h`<button class="chip ${t[key] === v ? 'on' : ''}" data-k="${key}" data-v="${v}">${fmt(v)}</button>`).join('');
  $('#toggles').innerHTML = h`
    <div class="trow"><span class="tlabel">Gear</span>${raw(chips('equipment', EQUIP))}</div>
    <div class="trow"><span class="tlabel">Time</span>${raw(chips('time', TIMES, v => (v === 60 ? '60+' : v) + "'"))}</div>
    <div class="trow"><span class="tlabel">Energy</span>${raw(chips('energy', ENERGY))}
      <button class="chip warn ${t.game48 ? 'on' : ''}" data-k="game48">Game ≤48h${t.game48 ? ' ✓' : ''}</button>
      <button class="chip warn ${t.sore.length ? 'on' : ''}" data-k="sore">Sore${t.sore.length ? ` (${t.sore.length})` : ''}</button></div>`;
}
$('#toggles').addEventListener('click', e => {
  const b = e.target.closest('[data-k]');
  if (!b) return;
  const k = b.dataset.k;
  if (k === 'game48') S.toggles.game48 = !S.toggles.game48;
  else if (k === 'sore') return openBodyMap();
  else {
    S.toggles[k] = k === 'time' ? Number(b.dataset.v) : b.dataset.v;
    if (k === 'energy') S.toggles.hrvFlag = false;
  }
  save(); renderToggles();
});

// Body map: front + back silhouettes with tappable regions.
const REGIONS = {
  front: [['Neck', 50, 22, 7, 5], ['Shoulders', 50, 32, 26, 5], ['Chest', 50, 42, 15, 7], ['Elbows/Arms', 22, 52, 6, 12], ['Wrists/Hands', 17, 74, 5, 6], ['Abs/Hip flexors', 50, 60, 12, 9], ['Groin', 50, 74, 8, 4], ['Quads', 42, 90, 7, 13], ['Knees', 42, 108, 6, 4], ['Shins', 42, 124, 5, 10], ['Ankles/Feet', 42, 142, 6, 4]],
  back: [['Upper back', 50, 36, 18, 8], ['Lower back', 50, 58, 12, 7], ['Glutes', 50, 72, 14, 6], ['Hamstrings', 42, 92, 7, 12], ['Calves/Achilles', 42, 124, 6, 10], ['Triceps', 22, 50, 6, 10]],
};
function bodySvg(side) {
  const regs = REGIONS[side];
  const mirrored = regs.flatMap(([n, x, y, rx, ry]) => (x !== 50 ? [[n, x, y, rx, ry], [n, 100 - x, y, rx, ry]] : [[n, x, y, rx, ry]]));
  return `<svg viewBox="0 0 100 150" aria-label="${side}">
    <text x="50" y="8">${side.toUpperCase()}</text>
    ${mirrored.map(([n, x, y, rx, ry]) => `<ellipse class="rg ${S.toggles.sore.includes(n) ? 'on' : ''}" data-r="${esc(n)}" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"><title>${esc(n)}</title></ellipse>`).join('')}
  </svg>`;
}
function openBodyMap() {
  const d = $('#sheet');
  const draw = () => {
    d.innerHTML = h`<h2>Sore spots</h2><p class="muted">Tap where it hurts. APEX swaps or adjusts anything that loads it.</p>
      <div class="bodymap">${raw(bodySvg('front'))}${raw(bodySvg('back'))}</div>
      <p><b>${S.toggles.sore.join(', ') || 'Nothing selected'}</b></p>
      <div class="row"><button class="btn ghost sm" data-act="clear">Clear</button><button class="btn sm" data-act="done">Done</button></div>`;
  };
  draw();
  d.onclick = e => {
    const r = e.target.closest('[data-r]')?.dataset.r;
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (r) { S.toggles.sore = S.toggles.sore.includes(r) ? S.toggles.sore.filter(x => x !== r) : [...S.toggles.sore, r]; draw(); }
    if (act === 'clear') { S.toggles.sore = []; draw(); }
    if (act === 'done' || e.target === d) { d.close(); save(); renderToggles(); }
  };
  d.showModal();
}

// ---------- training log summary sent with each request ----------
function logSummary() {
  const since = daysAgo(14);
  const rows = S.logs.filter(l => l.date >= since).map(l =>
    `${l.date} ${l.exercise}: ${l.sets.map(s => `${s.w || 'BW'}x${s.r}${s.rir !== '' && s.rir != null ? `@RIR${s.rir}` : ''}`).join(', ')}`);
  const g = S.garmin.slice(-3).map(x => `${x.date} RHR ${x.rhr || '-'} HRV ${x.hrv || '-'} sleep ${x.sleep || '-'}h`);
  return [...rows, ...(g.length ? ['Garmin:', ...g] : [])].join('\n') || '';
}

// ---------- streaming API ----------
const LOCAL = {
  'api/optimize': b => offline.offlineCard(DATA.lib, b.input),
  'api/session': b => (b.exercises?.length ? offline.planWorkout(DATA.lib, b.exercises, S.toggles) : offline.offlineSession(DATA.lib, b.input, S.toggles)),
  'api/pregame': b => offline.offlinePregame(DATA.lib, b.input),
  'api/vision': () => null,
};

// No server reachable (e.g. the static preview): answer from the offline library in the browser.
function localAnswer(path, body) {
  const data = LOCAL[path](body);
  if (data) return { data, source: 'offline', note: 'gateway not configured' };
  const msg = path === 'api/vision'
    ? 'Photo mode needs the live coach (OmniRoute). Pick the exercise from the offline list instead.'
    : 'Not in the offline library yet. Try one of these, or connect the live coach.';
  throw Object.assign(new Error(msg), { offline: offline.offlineIndex(DATA.lib) });
}

async function stream(path, body, { onPartial, onMeta, onStatus }) {
  if (DATA.static) return localAnswer(path, body);
  const res = await fetch(path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...body, profile: S.profile || DATA.profile, log: logSummary(),
      toggles: { ...S.toggles, programMode: S.settings.programMode },
      model: path === 'api/vision' ? S.settings.visionModel : S.settings.textModel,
    }),
  });
  if (!res.ok || !res.body) throw new Error(`Server ${res.status}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '', text = '', final = null, lastDraw = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) !== -1) {
      const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
      const ev = /^event: (.*)$/m.exec(chunk)?.[1];
      const data = JSON.parse(/^data: (.*)$/m.exec(chunk)?.[1] || 'null');
      if (ev === 'delta') {
        text += data.text;
        if (onPartial && Date.now() - lastDraw > 120) { lastDraw = Date.now(); const p = parsePartial(text); if (p) onPartial(p); }
      } else if (ev === 'meta') onMeta?.(data);
      else if (ev === 'status') onStatus?.(data.message);
      else if (ev === 'final') final = data;
      else if (ev === 'error') throw Object.assign(new Error(data.message), { offline: data.offline });
    }
  }
  if (!final) throw new Error('Connection dropped before the answer finished.');
  return final;
}

const statusLine = msg => h`<div class="status"><span class="spin"></span>${msg}</div>`;
const sourceBadge = (src, model) => src === 'live'
  ? h`<span class="badge live">LIVE · ${(model || '').split('/').pop()}</span>`
  : h`<span class="badge offline">OFFLINE LIBRARY</span>`;
const gradeBadge = g => (g ? h`<span class="grade ${String(g)[0]}">${g}</span>` : '');

// ---------- Optimization Card ----------
const list = arr => (arr || []).map(x => h`<li>${x}</li>`).join('');
function layer(title, color, body, open = false) {
  if (!body) return '';
  return `<details class="layer c-${color}" ${open ? 'open' : ''}><summary><span class="dot"></span>${esc(title)}</summary><div class="layer-body">${body}</div></details>`;
}
const dl = pairs => `<dl>${pairs.filter(([, v]) => v).map(([k, v]) => h`<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;

function renderCard(c, meta = {}) {
  if (!c) return '';
  const p = c.prescription || {}, st = c.setup || {}, b = c.biomechanics || {}, n = c.neural || {}, pp = n.powerPair || {};
  const lk = c.looks || {}, sp = c.sportTransfer || {}, it = c.intensityTechnique || {}, sw = c.swaps || {}, ev = c.evidence || {};
  return `
  <div class="panel ${meta.streaming ? 'streaming' : ''}">
    <div class="card-head"><h2>${esc(c.name || '…')}</h2></div>
    <div class="badges">${meta.source ? sourceBadge(meta.source, meta.model) : ''}${ev.grade ? h`<span class="badge">Evidence ${raw(gradeBadge(ev.grade))} · ${ev.confidence ?? '?'}%</span>` : ''}${c.category ? h`<span class="badge">${c.category}</span>` : ''}</div>
    ${c.doThisNotThat ? h`<div class="dtnt"><b>DO THIS, NOT THAT</b>${c.doThisNotThat}</div>` : ''}
    ${c.priorityNote ? h`<div class="prio">⚖️ ${c.priorityNote}</div>` : ''}
    ${layer('Prescription', 'lime', p.sets || p.reps ? dl([['Sets', p.sets], ['Reps', p.reps], ['Load', p.load], ['Rest', p.rest], ['Tempo', p.tempo], ['Slot', p.slot], ['Warm-up', p.warmup]]) : '', true)}
    ${layer('Setup & Execution', 'lime', st.steps ? `<ol>${list(st.steps)}</ol><div>${(st.cues || []).map(x => h`<span class="cue">${x}</span>`).join('')}</div>` : '', true)}
    ${layer('Biomechanics & Physics', 'purple', b.forceVector ? dl([['Force vector', b.forceVector], ['Joint angles', b.jointAngles], ['Moment arm', b.momentArm], ['Kinetic chain', b.kineticChain], ['Ground force', b.grf], ['Hardest point', b.hardestPoint]]) : '')}
    ${layer('Neural / Power', 'blue', n.intent ? dl([['Intent', n.intent], ['RFD', n.rfd], ['Power pair', pp.exercise ? `${pp.exercise} — ${pp.dose}` : ''], ['Timing', pp.type ? `${pp.type === 'PAPE' ? 'PAPE (acute potentiation)' : pp.type === 'contrast' ? 'Contrast (short rest)' : 'None'} · rest ${pp.rest || ''}` : '']]) : '')}
    ${layer('Elastic / Tendon', 'blue', c.elastic ? esc(c.elastic) : '')}
    ${layer('Mobility Built-In', 'green', c.mobility ? esc(c.mobility) : '')}
    ${layer('Flat-Foot / Base', 'green', c.footBase ? esc(c.footBase) : '')}
    ${layer('Sequencing', 'green', c.sequencing ? esc(c.sequencing) : '')}
    ${layer('Looks', 'gold', lk.effect ? dl([['Effect', lk.effect], ['Lengthened', lk.lengthened]]) : '')}
    ${layer('Sport Transfer', 'amber', sp.mechanism ? dl([['Sports', (sp.sports || []).join(', ')], ['Mechanism', sp.mechanism], ['Boxing / MMA', sp.combatNote]]) : '')}
    ${layer('Intensity Technique', 'red', it.technique ? dl([['Technique', it.technique], ['When', it.when]]) : '')}
    ${layer('🔑 Small Tips That Matter', 'white', c.tips?.length ? `<ul>${c.tips.map(t => h`<li>${raw(gradeBadge(t.grade))} ${t.tip}${t.source ? raw(h` <span class="dim">— ${t.source}</span>`) : ''}</li>`).join('')}</ul>` : '', true)}
    ${layer('Teach Me', 'white', c.teachMe ? esc(c.teachMe) : '')}
    ${layer('Swaps', 'gray', sw.home ? dl([['Home / DB', sw.home], ['Bodyweight', sw.bodyweight]]) : '')}
    ${layer('Evidence', 'gray', ev.grade ? h`<p>Grade ${raw(gradeBadge(ev.grade))} · confidence ${ev.confidence}%</p><ul>${raw(list(ev.studies))}</ul>` : '')}
    ${meta.streaming ? statusLine('Coaching…') : h`<div class="row" style="margin-top:10px"><button class="btn ghost sm" data-addlog="${c.name}">+ Add to Today's Log</button></div>`}
  </div>`;
}

async function optimize(target, input, context = '') {
  target.innerHTML = statusLine(`Optimizing "${esc(input)}"…`);
  let meta = {};
  try {
    const fin = await stream('api/optimize', { input, context }, {
      onMeta: m => { meta = m; },
      onStatus: m => target.insertAdjacentHTML('beforeend', statusLine(esc(m))),
      onPartial: p => { target.innerHTML = renderCard(p, { ...meta, streaming: true }); },
    });
    target.innerHTML = noteHtml(fin) + renderCard(fin.data, { source: fin.source, model: fin.model });
    S.last.card = { input, fin }; save();
    return fin.data;
  } catch (e) {
    target.innerHTML = errorBox(e, 'card');
  }
}

function noteHtml(fin) {
  if (!fin.note) return '';
  if (/not configured/.test(fin.note)) return '<p class="dim" style="font-size:12px;margin:4px 0">Offline library · connect OmniRoute in deploy settings for live coaching.</p>';
  return h`<div class="banner">Live coach unavailable — showing offline library (${fin.note}).</div>`;
}

function errorBox(e, kind) {
  const off = e.offline;
  const options = off ? (kind === 'pregame' ? off.pregame : kind === 'session' ? off.sessions : off.cards) : [];
  return h`<div class="panel"><p class="err">${e.message}</p>
    ${options.length ? raw(h`<p class="muted">Offline library:</p><div class="suggest">${raw(options.map(o => h`<button class="chip" data-pick="${o}">${o}</button>`).join(''))}</div>`) : ''}</div>`;
}

// Global click handlers for "+ Add to log" and offline picks.
document.addEventListener('click', e => {
  const add = e.target.closest('[data-addlog]');
  if (add) { addToLog(add.dataset.addlog); add.textContent = '✓ Added — see Today\'s Log'; add.disabled = true; }
  const pick = e.target.closest('[data-pick]');
  if (pick) {
    const input = $('#ask');
    if (input) { input.value = pick.dataset.pick; $('#askForm')?.requestSubmit(); }
  }
});

// ---------- photo (Mode B) ----------
function resizeImage(file, max = 1280) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(img.src);
      resolve(cv.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => reject(new Error('Could not read that image (HEIC? try a screenshot or JPEG).'));
    img.src = URL.createObjectURL(file);
  });
}

async function photoFlow(file, note) {
  const out = $('#out');
  let image;
  try { image = await resizeImage(file); } catch (e) { out.innerHTML = h`<p class="err">${e.message}</p>`; return; }
  out.innerHTML = h`<img class="photo-prev" src="${image}" alt="your photo">${raw(statusLine('Reading the photo…'))}`;
  try {
    const fin = await stream('api/vision', { image, context: note }, {});
    const v = fin.data;
    const ctx = [
      v.kind === 'machine' && v.machineSetup ? `Machine setup identified: ${v.machineSetup.join('; ')}` : '',
      v.formAudit ? `Form audit from photo — leaks: ${v.formAudit.leaks.map(l => `${l.where}: ${l.what}`).join('; ')}. Top fix: ${v.formAudit.oneFix}` : '',
    ].filter(Boolean).join('\n');
    const head = h`<img class="photo-prev" src="${image}" alt="your photo">
      <div class="panel"><div class="card-head"><h2>${v.identified}</h2></div>
        <div class="badges">${raw(sourceBadge(fin.source, fin.model))}<span class="badge">${v.kind}</span><span class="badge">${v.confidence}% sure</span></div>
        ${v.machineSetup?.length ? raw(layer('Machine Setup', 'lime', `<ol>${list(v.machineSetup)}</ol>`, true)) : ''}
        ${v.formAudit ? raw(layer('Form Audit (Goodson lens)', 'red', `<ul>${v.formAudit.leaks.map(l => h`<li><b>${l.where}:</b> ${l.what}</li>`).join('')}</ul><div class="dtnt"><b>THE ONE FIX</b>${esc(v.formAudit.oneFix)}</div>`, true)) : ''}
      </div>`;
    if (v.confidence < 70 && v.alternatives?.length) {
      out.innerHTML = head + h`<p class="muted">Not sure. Which is it?</p><div class="suggest">${raw([v.identified, ...v.alternatives.map(a => a.name)].map(n =>
        h`<button class="chip" data-guess="${n}">${n}</button>`).join(''))}</div><div id="photoCard"></div>`;
      out.onclick = e => {
        const g = e.target.closest('[data-guess]');
        if (g) optimize($('#photoCard'), g.dataset.guess, ctx);
      };
    } else {
      out.innerHTML = head + '<div id="photoCard"></div>';
      await optimize($('#photoCard'), v.identified, ctx);
    }
  } catch (e) {
    out.innerHTML = h`<img class="photo-prev" src="${image}" alt="">` + errorBox(e, 'card');
  }
}

// ---------- views ----------
const COMMON = ['Incline Dumbbell Press', 'Bulgarian Split Squat', 'Pogo Hops', 'Shadowboxing', 'Romanian Deadlift', 'Pull-Up', 'Overhead Dumbbell Triceps Extension', 'Nordic Hamstring Curl'];

const VIEWS = {
  optimize() {
    $('#view').innerHTML = h`
      ${raw(exerciseDatalist())}<form id="askForm" class="ask"><input id="ask" list="exlist" placeholder="Any exercise… e.g. leg curl, incline DB press" autocomplete="off" enterkeyhint="go">
        <label class="icon-btn" title="Photo">📷<input id="photo" type="file" accept="image/*" hidden></label>
        <button class="btn">Go</button></form>
      <div class="suggest">${raw(COMMON.map(c => h`<button class="chip" data-pick="${c}">${c}</button>`).join(''))}</div>
      <div id="out"></div>`;
    $('#askForm').onsubmit = e => { e.preventDefault(); const v = $('#ask').value.trim(); if (v) optimize($('#out'), v); };
    $('#photo').onchange = e => { const f = e.target.files[0]; if (f) photoFlow(f, $('#ask').value.trim()); };
    if (S.last.card) $('#out').innerHTML = renderCard(S.last.card.fin.data, { source: S.last.card.fin.source, model: S.last.card.fin.model });
  },

  session() {
    const mine = S.buildMode === 'mine';
    $('#view').innerHTML = h`
      <div class="suggest" id="modes"><button class="chip ${mine ? '' : 'on'}" data-mode="apex">APEX builds it</button><button class="chip ${mine ? 'on' : ''}" data-mode="mine">I pick the exercises</button></div>
      <div id="builder"></div><div id="out"></div>`;
    $('#modes').onclick = e => { const b = e.target.closest('[data-mode]'); if (b) { S.buildMode = b.dataset.mode; save(); VIEWS.session(); } };
    if (mine) renderPicker();
    else {
      $('#builder').innerHTML = h`
        <form id="askForm" class="ask"><input id="ask" placeholder="leg day · chest and bis · VO2 day · 15 min hotel" autocomplete="off" enterkeyhint="go"><button class="btn">Build</button></form>
        <div class="suggest">${raw(['Leg day', 'Chest and bis', 'Back and tris', 'Boxing conditioning', 'VO2 day', '15 min hotel room', 'I only have dumbbells'].map(c => h`<button class="chip" data-pick="${c}">${c}</button>`).join(''))}</div>
        <div class="row muted" style="font-size:13px">Program mode: <b>${{ split: 'Current split', triphasic: 'Triphasic block', 'six-day': '6-day template' }[S.settings.programMode]}</b> <span class="dim">(change in Settings)</span></div>`;
      $('#askForm').onsubmit = e => { e.preventDefault(); const v = $('#ask').value.trim(); if (v) buildSession(v); };
    }
    if (S.last.session) $('#out').innerHTML = renderSession(S.last.session.data, S.last.session);
  },

  pregame() {
    $('#view').innerHTML = h`
      <form id="askForm" class="ask"><input id="ask" placeholder="pickleball in 20 min · basketball game · 2-mile XC" autocomplete="off" enterkeyhint="go"><button class="btn">Prime</button></form>
      <div class="suggest">${raw(['Basketball in 15', 'Pickleball in 20 min', '2-mile XC race', 'Boxing class', 'Soccer pickup', 'Tennis match', 'First time golfing'].map(c => h`<button class="chip" data-pick="${c}">${c}</button>`).join(''))}</div>
      <div id="out"></div>`;
    $('#askForm').onsubmit = e => { e.preventDefault(); const v = $('#ask').value.trim(); if (v) preGame(v); };
  },

  async fight() {
    const f = DATA.fight || (DATA.fight = await getJSON('data/fightlab.json'));
    if (!f) { $('#view').innerHTML = '<p class="err">Fight Lab data missing.</p>'; return; }
    const ladder = (f.contactLadder || []).map(l => h`<div class="item"><div class="item-top"><span class="name">Level ${l.level} · ${l.name}</span>${l.siblingOK ? raw('<span class="badge live">OK w/ sibling</span>') : raw('<span class="badge offline">Coach/gym only</span>')}</div><ul class="rules">${raw(list(l.rules))}</ul></div>`).join('');
    const prog = arr => (arr || []).map(s => layer(`${s.step}. ${s.name}`, 'amber', (s.drills || []).map(d => h`<div class="item"><div class="item-top"><span class="name">${d.name}</span><span class="dose">${d.dose}</span></div>${d.cue ? raw(h`<div class="note">Cue: ${d.cue}</div>`) : ''}</div>`).join(''))).join('');
    $('#view').innerHTML = h`
      <form id="askForm" class="ask"><input id="ask" placeholder="Optimize a strike or drill… e.g. jab, double leg" autocomplete="off"><button class="btn">Go</button></form>
      <div id="out"></div>
      <div class="section-title">Philosophy</div>
      ${raw((f.philosophy || []).map(p => h`<div class="item"><div class="item-top"><span class="name">${p.name}</span></div><div>${p.rule}</div>${p.apply ? raw(h`<div class="note">→ ${p.apply}</div>`) : ''}</div>`).join(''))}
      <div class="section-title">Home contact ladder</div>${raw(ladder)}
      <div class="section-title">Striking progression</div>${raw(prog(f.striking))}
      <div class="section-title">Grappling progression</div>${raw(prog(f.grappling))}
      <div class="section-title">Weekly emphasis blocks</div>
      ${raw((f.weeklyBlocks || []).map(w => h`<div class="kv"><b>Week ${w.week}: ${w.emphasis}</b></div><p class="muted">${w.notes}</p>`).join(''))}
      <div class="section-title">Fight conditioning</div>
      ${raw((f.conditioning || []).map(c => h`<div class="item"><div class="item-top"><span class="name">${c.name}</span>${raw(gradeBadge(c.grade))}</div><div class="dose">${c.dose}</div><div class="note">${c.why}</div></div>`).join(''))}
      ${f.safety ? raw(h`<div class="section-title">Safety</div><ul class="rules">${raw(list(f.safety))}</ul>`) : ''}`;
    $('#askForm').onsubmit = e => { e.preventDefault(); const v = $('#ask').value.trim(); if (v) optimize($('#out'), v, 'Combat technique/drill. Include the contact ladder level and the striking/grappling sequencing.'); };
  },

  async lungs() { await systemsView(['lungs', 'running'], 'Lungs & engine'); },

  async vision() {
    await systemsView(['vision', 'skills'], 'Vision & skills', morning5Html() + rotationHtml() + reactionHtml());
    wireReaction();
  },

  log() { renderLog(); },
  progress() { renderProgress(); },

  async tips() {
    const t = DATA.tips || (DATA.tips = await getJSON('data/tips.json'));
    const sys = DATA.systems || (DATA.systems = await getJSON('data/systems.json'));
    const cats = [...new Set((t?.tips || []).map(x => x.category))];
    const draw = cat => {
      const items = (t?.tips || []).filter(x => !cat || x.category === cat);
      $('#tiplist').innerHTML = items.map(x => h`<div class="panel"><div class="card-head"><h3>${x.title}</h3>${raw(gradeBadge(x.grade))}</div>
        <p>${x.tip}</p><p class="dim" style="font-size:13px">${x.sources.join(' · ')}</p>
        ${x.correction ? raw(h`<p style="font-size:13px;color:var(--amber)">Checked: ${x.correction}</p>`) : ''}</div>`).join('');
    };
    $('#view').innerHTML = h`<p class="muted">Verified by web search on ${t?.verified || '—'}. Grades: A = multiple metas/consistent RCTs · B = one good RCT/meta · C = mechanism/consensus · D = anecdote.</p>
      <div class="suggest" id="cats"><button class="chip on" data-cat="">All</button>${raw(cats.map(c => h`<button class="chip" data-cat="${c}">${c}</button>`).join(''))}</div>
      <div id="tiplist"></div>
      ${raw(sys ? sectionsHtml(sys.recovery, 'Recovery & natural hormones') + sectionsHtml(sys.looks, 'Looks extras') : '')}`;
    $('#cats').onclick = e => {
      const b = e.target.closest('[data-cat]'); if (!b) return;
      document.querySelectorAll('#cats .chip').forEach(c => c.classList.toggle('on', c === b));
      draw(b.dataset.cat);
    };
    draw('');
  },

  settings() {
    const h0 = DATA.health || {};
    const opts = (ids, sel) => [''].concat(ids || []).map(id => h`<option value="${id}" ${id === sel ? 'selected' : ''}>${id || `Auto (${id === '' ? 'best available' : ''})`}</option>`).join('');
    $('#view').innerHTML = h`
      <div class="panel"><h3>Gateway</h3>
        <p class="${h0.gateway ? '' : 'muted'}">${h0.gateway ? `Connected · ${h0.models?.length || 0} models` : (h0.reason || 'Checking…')}</p>
        ${h0.defaults ? raw(h`<p class="dim" style="font-size:13px">Auto picks → text: ${h0.defaults.text || '—'} · vision: ${h0.defaults.vision || '—'}</p>`) : ''}
        <div class="field"><label>Text model</label><select id="tm">${raw(opts(h0.models, S.settings.textModel))}</select></div>
        <div class="field"><label>Vision model</label><select id="vm">${raw(opts(h0.models, S.settings.visionModel))}</select></div>
      </div>
      <div class="panel"><h3>Program mode</h3>
        <select id="pm">${raw([['split', 'Current split — Chest+Bi / Back+Tri / Legs, 2x/week'], ['triphasic', 'Triphasic 4-phase block (eccentric → isometric → concentric → French contrast)'], ['six-day', '6-day: Lower Power / Upper Horiz / Recovery+Z2 / Lower Vol / Upper Vert / VO2']].map(([v, l]) => h`<option value="${v}" ${S.settings.programMode === v ? 'selected' : ''}>${l}</option>`).join(''))}</select></div>
      <div class="panel"><h3>Athlete profile</h3><p class="muted" style="font-size:13px">Sent with every request. Edit as you grow.</p>
        <textarea id="prof">${S.profile || DATA.profile}</textarea>
        <div class="row" style="margin-top:8px"><button class="btn sm" id="saveProf">Save profile</button><button class="btn ghost sm" id="resetProf">Reset to default</button></div></div>
      <div class="panel"><h3>Backup</h3><p class="muted" style="font-size:13px">Everything lives on this device. Export to move it to your iPad or keep a copy.</p>
        <div class="row"><button class="btn ghost sm" id="exp">Export JSON</button><label class="btn ghost sm">Import JSON<input type="file" id="imp" accept="application/json" hidden></label></div>
        <textarea id="expBox" hidden readonly style="min-height:120px;margin-top:8px"></textarea></div>`;
    $('#tm').onchange = e => { S.settings.textModel = e.target.value; save(); };
    $('#vm').onchange = e => { S.settings.visionModel = e.target.value; save(); };
    $('#pm').onchange = e => { S.settings.programMode = e.target.value; save(); };
    $('#saveProf').onclick = () => { S.profile = $('#prof').value; save(); $('#saveProf').textContent = 'Saved ✓'; };
    $('#resetProf').onclick = () => { S.profile = ''; save(); $('#prof').value = DATA.profile; };
    $('#exp').onclick = () => {
      const json = JSON.stringify(S, null, 2);
      navigator.clipboard?.writeText(json).then(() => { $('#exp').textContent = 'Copied ✓'; }, () => {});
      $('#expBox').hidden = false; $('#expBox').value = json; $('#expBox').select();
      if (!DATA.static) {
        const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([json], { type: 'application/json' })), download: `apex-lift-${today()}.json` });
        a.click();
      }
    };
    $('#imp').onchange = async e => {
      try { S = { ...structuredClone(DEFAULT_STATE), ...JSON.parse(await e.target.files[0].text()) }; save(); go('settings'); }
      catch { $('#imp').closest('label').textContent = 'Not an APEX export — try again'; }
    };
  },
};

// ---------- "I pick the exercises" builder ----------
function exerciseDatalist() {
  const names = DATA.lib ? offline.allNames(DATA.lib) : [];
  return `<datalist id="exlist">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist>`;
}

function renderPicker() {
  S.custom ||= [];
  const list = S.custom;
  $('#builder').innerHTML = h`
    <form id="pickForm" class="ask"><input id="pick" list="exlist" placeholder="Type any exercise… leg curl, lat pulldown, box jump" autocomplete="off" enterkeyhint="done"><button class="btn ghost">Add</button></form>
    ${raw(exerciseDatalist())}
    <p class="dim" style="font-size:12px;margin:0 0 8px">${DATA.lib ? `${offline.allNames(DATA.lib).length} exercises in the library. Anything else gets coached by its movement pattern.` : ''}</p>
    ${raw(list.length ? list.map((n, i) => h`<div class="item"><div class="item-top"><span class="name">${i + 1}. ${n}</span>
      <button class="btn ghost sm" data-mv="${i}:-1" aria-label="Move up">↑</button><button class="btn ghost sm" data-mv="${i}:1" aria-label="Move down">↓</button><button class="btn ghost sm" data-del="${i}" aria-label="Remove">✕</button></div></div>`).join('')
      : '<p class="muted">Add the exercises you want to do today, in any order. APEX puts them in the best order, sets your sets, reps and rest, adds a warm-up and cooldown, and tells you exactly how to do each one.</p>')}
    <div class="row" style="margin:10px 0">
      <button class="btn" id="howTo" ${list.length ? '' : 'disabled'}>Tell me how to do it</button>
      ${raw(list.length ? '<button class="btn ghost sm" id="clearPick">Clear</button>' : '')}
    </div>`;
  const add = v => {
    v = v.trim();
    if (!v || list.some(x => x.toLowerCase() === v.toLowerCase())) return;
    const card = DATA.lib ? offline.offlineCard(DATA.lib, v) : null;
    list.push(card && !card.guessed ? card.name : v);
    save(); renderPicker(); $('#pick').focus();
  };
  $('#pickForm').onsubmit = e => { e.preventDefault(); add($('#pick').value); };
  $('#builder').onclick = e => {
    const mv = e.target.closest('[data-mv]');
    const del = e.target.closest('[data-del]');
    if (mv) { const [i, d] = mv.dataset.mv.split(':').map(Number); const j = i + d; if (j >= 0 && j < list.length) { [list[i], list[j]] = [list[j], list[i]]; save(); renderPicker(); } }
    if (del) { list.splice(+del.dataset.del, 1); save(); renderPicker(); }
    if (e.target.id === 'clearPick') { list.length = 0; save(); renderPicker(); }
    if (e.target.id === 'howTo') buildSession('My workout', list.slice());
  };
}

// ---------- Session (Mode C) ----------
const PHASE_COLOR = { 'CNS Prime': 'blue', Main: 'lime', Power: 'purple', Accessory: 'gold', Finisher: 'red', Cooldown: 'green', Conditioning: 'amber', Skill: 'blue' };

function renderSession(s, meta = {}) {
  if (!s) return '';
  return `<div class="panel ${meta.streaming ? 'streaming' : ''}">
    <div class="card-head"><h2>${esc(s.title || '…')}</h2></div>
    <div class="badges">${meta.source ? sourceBadge(meta.source, meta.model) : ''}${s.durationMin ? h`<span class="badge">${s.durationMin} min</span>` : ''}${s.equipment ? h`<span class="badge">${s.equipment}</span>` : ''}</div>
    ${s.priorityNote ? h`<div class="prio">⚖️ ${s.priorityNote}</div>` : ''}
    ${s.win ? h`<div class="win" style="margin-top:10px"><b>TODAY'S WIN:</b> ${s.win.metric}<div class="muted" style="font-size:13px">${s.win.why || ''}</div></div>` : ''}
    ${s.rules?.length ? h`<ul class="rules">${raw(list(s.rules))}</ul>` : ''}
    ${(s.blocks || []).map(b => `<div class="block c-${PHASE_COLOR[b.phase] || 'gray'}"><h3>${esc(b.phase)}</h3>${(b.items || []).map(i => h`
      <div class="item"><div class="item-top"><span class="name">${i.name}</span>${i.expandable !== false && !meta.streaming ? raw(h`<button class="btn ghost sm" data-card="${i.name}">Card</button>`) : ''}</div>
        <div class="dose">${i.dose || ''}${i.rest ? ` · rest ${i.rest}` : ''}</div>${i.note ? raw(h`<div class="note">${i.note}</div>`) : ''}<div class="expand"></div></div>`).join('')}</div>`).join('')}
    ${s.nextTarget ? h`<div class="target">Next session: ${s.nextTarget}</div>` : ''}
    ${meta.streaming ? statusLine('Building…') : h`<div class="row" style="margin-top:12px"><button class="btn" data-startsession="1">Start → log it</button></div>`}
  </div>`;
}

async function buildSession(input, exercises) {
  const out = $('#out');
  out.innerHTML = statusLine(exercises ? 'Coaching your workout…' : `Building "${esc(input)}"…`);
  let meta = {};
  try {
    const fin = await stream('api/session', { input, exercises }, {
      onMeta: m => { meta = m; },
      onPartial: p => { out.innerHTML = renderSession(p, { ...meta, streaming: true }); },
    });
    S.last.session = { data: fin.data, source: fin.source, model: fin.model }; save();
    out.innerHTML = noteHtml(fin) + renderSession(fin.data, fin);
  } catch (e) { out.innerHTML = errorBox(e, 'session'); }
}

document.addEventListener('click', e => {
  const c = e.target.closest('[data-card]');
  if (c) {
    const box = c.closest('.item').querySelector('.expand');
    if (box.innerHTML) { box.innerHTML = ''; return; }
    optimize(box, c.dataset.card, `Part of today's session "${S.last.session?.data?.title || ''}". Keep the prescription consistent with the session dose.`);
  }
  if (e.target.closest('[data-startsession]')) {
    const s = S.last.session?.data;
    if (!s) return;
    S.session = { title: s.title, date: today(), nextTarget: s.nextTarget, win: s.win };
    s.blocks.filter(b => ['Main', 'Power', 'Accessory', 'Finisher'].includes(b.phase)).flatMap(b => b.items).forEach(i => addToLog(i.name, true));
    save(); go('log');
  }
});

// ---------- Pre-Game (Mode D) ----------
const PG_COLOR = { 'CNS Prime': 'blue', 'Visual Priming': 'purple', 'Kinetic-Chain Activation': 'green', 'Motor-Pattern Grooving': 'amber', 'Progressive Loading': 'lime' };
function renderPregame(p, meta = {}) {
  if (!p) return '';
  return `<div class="panel">
    <div class="card-head"><h2>${esc(p.sport || '…')}</h2></div>
    <div class="badges">${meta.source ? sourceBadge(meta.source, meta.model) : ''}${p.totalMin ? h`<span class="badge">${p.totalMin} min · do it once, now</span>` : ''}</div>
    ${(p.steps || []).map((s, i) => h`<div class="step c-${PG_COLOR[s.phase] || 'gray'}"><span class="n">${i + 1}</span><div><div class="ph">${s.phase || ''}</div><div class="drill">${s.drill || ''}</div><div class="dose">${s.dose || ''}</div><div class="note muted" style="font-size:13px">${s.why || ''}</div></div></div>`).join('')}
    ${p.anchorCue ? h`<div class="muted" style="text-align:center;font-size:12px;margin-top:12px">YOUR ONE ANCHOR CUE (between plays only)</div><div class="anchor">${p.anchorCue}</div>` : ''}
    ${p.airwayNote ? layer('Airways (EIB)', 'amber', esc(p.airwayNote), true) : ''}
    ${p.avoid?.length ? layer('Skip these', 'red', `<ul>${list(p.avoid)}</ul>`) : ''}
    ${p.teachMe ? layer('Teach Me', 'white', esc(p.teachMe)) : ''}
    ${meta.streaming ? statusLine('Priming…') : ''}
  </div>`;
}
async function preGame(input) {
  const out = $('#out');
  out.innerHTML = statusLine(`Priming for "${esc(input)}"…`);
  let meta = {};
  try {
    const fin = await stream('api/pregame', { input }, { onMeta: m => { meta = m; }, onPartial: p => { out.innerHTML = renderPregame(p, { ...meta, streaming: true }); } });
    out.innerHTML = noteHtml(fin) + renderPregame(fin.data, fin);
  } catch (e) { out.innerHTML = errorBox(e, 'pregame'); }
}

// ---------- systems tabs ----------
function sectionsHtml(sections, title) {
  if (!sections?.length) return '';
  return h`<div class="section-title">${title}</div>` + sections.map(s => layer(`${s.title}`, 'lime',
    h`<p>${raw(gradeBadge(s.grade))} ${s.summary || ''}</p>` + (s.items || []).map(i => h`<div class="item"><div class="item-top"><span class="name">${i.name}</span>${raw(gradeBadge(i.grade))}</div><div class="dose">${i.dose || ''}</div><div class="note">${i.why || ''}</div></div>`).join(''))).join('');
}
async function systemsView(keys, title, extra = '') {
  const sys = DATA.systems || (DATA.systems = await getJSON('data/systems.json'));
  if (!sys) { $('#view').innerHTML = '<p class="err">Content missing.</p>'; return; }
  $('#view').innerHTML = extra + keys.map(k => sectionsHtml(sys[k], { lungs: 'Lungs / VO2 / EIB', running: 'XC running economy', vision: 'Vision', skills: 'Skills (5-10 min/day, rotate 2-3)' }[k] || title)).join('');
}
function morning5Html() {
  const m = DATA.morning5;
  if (!m) return '';
  return layer(`☀️ ${m.name} — ${m.minutes} min, barefoot`, 'lime',
    (m.rules?.length ? `<ul class="rules">${list(m.rules)}</ul>` : '') +
    (m.steps || []).map((s, i) => h`<div class="step c-lime"><span class="n">${i + 1}</span><div><div class="drill">${s.drill} ${raw(gradeBadge(s.grade))}</div><div class="dose">${s.dose}</div><div class="note muted" style="font-size:13px">${s.why}</div></div></div>`).join('') +
    (m.teachMe ? h`<p class="muted">${m.teachMe}</p>` : ''), true);
}
function rotationHtml() {
  const skills = DATA.systems?.skills?.flatMap(s => s.items || []) || [];
  if (!skills.length) return '';
  const seed = Number(today().replace(/-/g, ''));
  const pick = [0, 1, 2].map(i => skills[(seed * (i + 7)) % skills.length]).filter((x, i, a) => a.indexOf(x) === i);
  return layer("🎯 Today's skill rotation", 'blue', pick.map(i => h`<div class="item"><div class="item-top"><span class="name">${i.name}</span></div><div class="dose">${i.dose}</div></div>`).join(''), true);
}
function reactionHtml() {
  const best = S.reaction.length ? Math.min(...S.reaction.map(r => r.ms)) : null;
  const last5 = S.reaction.slice(-5).map(r => r.ms);
  return layer('⚡ Reaction test (visible win)', 'purple', h`<div class="react" id="react">Tap to start</div>
    <p class="muted" style="font-size:13px">Best: <b>${best ? `${best} ms` : '—'}</b> · Last: ${last5.join(', ') || '—'}. Eyes are the first link in the chain — this number dropping means the whole chain is getting faster.</p>`, true);
}
function wireReaction() {
  const el = $('#react');
  if (!el) return;
  let state = 'idle', t0 = 0, timer;
  el.onpointerdown = () => {
    if (state === 'idle' || state === 'done') {
      state = 'wait'; el.className = 'react wait'; el.textContent = 'Wait for lime…';
      timer = setTimeout(() => { state = 'go'; el.className = 'react go'; el.textContent = 'TAP!'; t0 = performance.now(); }, 1200 + Math.random() * 2500);
    } else if (state === 'wait') {
      clearTimeout(timer); state = 'done'; el.className = 'react'; el.textContent = 'Too early — tap to retry';
    } else if (state === 'go') {
      const ms = Math.round(performance.now() - t0);
      const prevBest = S.reaction.length ? Math.min(...S.reaction.map(r => r.ms)) : Infinity;
      S.reaction.push({ date: today(), ms }); S.reaction = S.reaction.slice(-200); save();
      state = 'done'; el.className = 'react'; el.textContent = `${ms} ms${ms < prevBest ? ' — NEW BEST 🔥' : ''} · tap again`;
    }
  };
}

// ---------- Today's Log ----------
function addToLog(name, quiet) {
  S.session ||= { title: 'Free session', date: today() };
  if (S.session.date !== today()) S.session = { title: 'Free session', date: today() };
  S.session.items ||= [];
  if (!S.session.items.some(i => i.exercise === name)) S.session.items.push({ exercise: name, sets: [] });
  if (!quiet) save();
}

function logHistory(name) {
  return S.logs.filter(l => l.exercise.toLowerCase() === name.toLowerCase()).sort((a, b) => a.date.localeCompare(b.date));
}
const e1rm = s => (Number(s.w) || 0) * (1 + Number(s.r) / 30);

const QUALITY = /jump|hop|pogo|throw|sprint|shadow|sprawl|plank|carry|4x4|4×4|interval|slam/i;

function nextTarget(name, sets) {
  const [lo, hi] = [6, 10];
  if (/nordic/i.test(name)) return 'Log reps. Win = a slower, longer lowering than last time (control the last 30°).';
  if (QUALITY.test(name)) return 'Quality only: stop the moment height, speed or snap drops. Log reps (or distance in the lb box).';
  const prev = logHistory(name).at(-1);
  const work = sets.filter(s => !s.warm);
  if (!work.length) {
    if (!prev) return `Find a weight you can move for ${lo}-${hi} reps at 1-2 RIR.`;
    const top = prev.sets.filter(s => !s.warm).sort((a, b) => e1rm(b) - e1rm(a))[0];
    return top ? `Beat last time: ${top.w || 'BW'} × ${top.r}. ${top.r >= hi ? `Hit ${hi} last time → add load.` : `Get ${Number(top.r) + 1}.`}` : '';
  }
  const last = work.at(-1);
  if (Number(last.r) >= hi) return `Top of range (${hi}) → next session add load (+5 lb DB / +5-10 lb bar). Light DBs maxed? Slow the lowering to 3 s or add 3 lengthened partials.`;
  if (work.length >= 3) return `Done. Next session: ${last.w || 'BW'} × ${Number(last.r) + 1} on set 1.`;
  return `Next set: ${last.w || 'BW'} × ${last.r}${last.rir === '0' ? ' (you hit failure — keep it at 1 RIR next set)' : ''}. Stop if rep speed visibly slows.`;
}

function renderLog() {
  const s = S.session && S.session.date === today() ? S.session : null;
  const items = s?.items || [];
  $('#view').innerHTML = h`
    <div class="panel"><div class="card-head"><h2>${s?.title || 'No session yet'}</h2></div>
      ${s?.win ? raw(h`<div class="win" style="margin-top:8px"><b>WIN TO CHASE:</b> ${s.win.metric}</div>`) : raw('<p class="muted">Build a session and tap "Start", or add exercises below.</p>')}
    </div>
    <form id="addEx" class="ask"><input id="exName" placeholder="Add exercise…" autocomplete="off"><button class="btn ghost">Add</button></form>
    ${raw(items.map((it, idx) => h`<div class="panel" data-idx="${idx}">
      <div class="item-top"><span class="name" style="font-weight:800">${it.exercise}</span><button class="btn ghost sm" data-rm="${idx}">✕</button></div>
      <div class="sets">${raw(it.sets.map((x, j) => h`<span class="set-pill">${x.warm ? 'W ' : ''}${x.w || 'BW'}×${x.r}${x.rir !== '' ? ` @${x.rir}` : ''} <span data-del="${idx}:${j}" style="color:var(--tx3);cursor:pointer">✕</span></span>`).join(''))}</div>
      <div class="setrow"><input inputmode="decimal" placeholder="lb" data-f="w"><input inputmode="numeric" placeholder="reps" data-f="r"><input inputmode="numeric" placeholder="RIR" data-f="rir"><button class="btn sm" data-log="${idx}">Log</button></div>
      <label class="muted" style="font-size:12px"><input type="checkbox" data-f="warm" ${it.sets.length ? '' : 'checked'}> warm-up set</label>
      <div class="target">${nextTarget(it.exercise, it.sets)}</div></div>`).join(''))}
    ${items.some(i => i.sets.length) ? raw('<button class="btn" id="finish" style="width:100%;margin-top:8px">Finish session → wins</button>') : ''}
    <div id="wins"></div>
    <div class="section-title">Last 14 days</div>
    ${raw(S.logs.filter(l => l.date >= daysAgo(14)).slice(-30).reverse().map(l => h`<div class="kv"><span>${l.date} · ${l.exercise}</span><span class="muted">${l.sets.filter(x => !x.warm).map(x => `${x.w || 'BW'}×${x.r}`).join(', ')}</span></div>`).join('') || '<p class="dim">Nothing logged yet.</p>')}`;

  $('#addEx').onsubmit = e => { e.preventDefault(); const v = $('#exName').value.trim(); if (v) { addToLog(v); renderLog(); } };
  $('#view').onclick = e => {
    const lg = e.target.closest('[data-log]');
    const rm = e.target.closest('[data-rm]');
    const del = e.target.closest('[data-del]');
    if (lg) {
      const panel = lg.closest('[data-idx]');
      const f = k => panel.querySelector(`[data-f="${k}"]`);
      const r = f('r').value.trim();
      if (!r) { f('r').focus(); return; }
      s.items[+lg.dataset.log].sets.push({ w: f('w').value.trim(), r: Number(r), rir: f('rir').value.trim(), warm: f('warm').checked, t: Date.now() });
      save(); renderLog();
      $(`[data-idx="${lg.dataset.log}"] [data-f="w"]`)?.setAttribute('value', f('w').value);
    }
    if (rm) { s.items.splice(+rm.dataset.rm, 1); save(); renderLog(); }
    if (del) { const [i, j] = del.dataset.del.split(':').map(Number); s.items[i].sets.splice(j, 1); save(); renderLog(); }
    if (e.target.id === 'finish') finishSession();
  };
}

const ONE_LINERS = [
  'Nervous system just got a software update.', 'That was a deposit, not a withdrawal.', 'Ground pushed back harder today.',
  'Hips led. Arms followed. Progress.', 'Small wins stack into scary athletes.', 'Future you is already faster.',
];
function finishSession() {
  const s = S.session;
  const done = s.items.filter(i => i.sets.length);
  const prs = [];
  let volume = 0;
  done.forEach(it => {
    const work = it.sets.filter(x => !x.warm);
    volume += work.reduce((a, x) => a + (Number(x.w) || 0) * Number(x.r), 0);
    const prevBest = Math.max(0, ...logHistory(it.exercise).flatMap(l => l.sets.filter(x => !x.warm).map(e1rm)));
    const best = Math.max(0, ...work.map(e1rm));
    if (best > prevBest && prevBest > 0) prs.push(`${it.exercise}: est. 1RM ${Math.round(prevBest)} → ${Math.round(best)} lb`);
    const prevAtW = w => Math.max(0, ...logHistory(it.exercise).flatMap(l => l.sets.filter(x => !x.warm && x.w === w).map(x => x.r)));
    work.forEach(x => { const p = prevAtW(x.w); if (p && x.r > p) prs.push(`${it.exercise}: rep PR at ${x.w || 'BW'} — ${x.r} (was ${p})`); });
    S.logs.push({ date: today(), session: s.title, exercise: it.exercise, sets: it.sets });
  });
  const prevSess = S.logs.filter(l => l.session === s.title && l.date < today());
  const lastDate = prevSess.at(-1)?.date;
  const prevVol = prevSess.filter(l => l.date === lastDate).flatMap(l => l.sets.filter(x => !x.warm)).reduce((a, x) => a + (Number(x.w) || 0) * Number(x.r), 0);
  const sets = done.reduce((a, i) => a + i.sets.filter(x => !x.warm).length, 0);
  S.session = null; save(); renderLog();
  $('#wins').innerHTML = h`<div class="panel win"><h2>Wins</h2>
    <div class="grid3" style="margin:10px 0"><div class="stat"><b>${sets}</b><span>hard sets</span></div><div class="stat"><b>${Math.round(volume).toLocaleString()}</b><span>lb volume</span></div><div class="stat"><b>${prs.length}</b><span>PRs</span></div></div>
    ${prevVol ? raw(h`<p>Volume vs last "${s.title}": <b>${volume >= prevVol ? '+' : ''}${Math.round(((volume - prevVol) / prevVol) * 100)}%</b></p>`) : ''}
    ${prs.length ? raw(h`<ul>${raw(list([...new Set(prs)]))}</ul>`) : raw('<p class="muted">No PRs today — consistency is the win. Next session, chase +1 rep.</p>')}
    ${s.win ? raw(h`<p>Win you were chasing: <b>${s.win.metric}</b></p>`) : ''}
    <p><i>${ONE_LINERS[Math.floor(Math.random() * ONE_LINERS.length)]}</i></p></div>`;
  $('#wins').scrollIntoView({ behavior: 'smooth' });
}

// ---------- Progress ----------
const TESTS = [
  ['broad', 'Broad jump (in)', 1], ['vertical', 'Vertical (in)', 1], ['sprint', '10-yd / treadmill sprint (s)', -1],
  ['balance', 'Single-leg eyes-closed (s)', 1], ['rhr', 'Resting HR (bpm)', -1],
];
function athleticismScore() {
  if (S.tests.length < 1) return null;
  const first = S.tests[0], last = S.tests.at(-1);
  const deltas = TESTS.map(([k, , dir]) => (Number(first[k]) && Number(last[k]) ? dir * (Number(last[k]) - Number(first[k])) / Number(first[k]) : null)).filter(x => x != null);
  return deltas.length ? Math.round(100 + (deltas.reduce((a, b) => a + b, 0) / deltas.length) * 100) : 100;
}
function lineChart(points, label) {
  if (points.length < 2) return h`<p class="dim" style="font-size:13px">${label}: log 2+ weeks to see the trend.</p>`;
  const ys = points.map(p => p.y), min = Math.min(...ys), max = Math.max(...ys), rng = max - min || 1;
  const W = 320, H = 140, pad = 18;
  const pts = points.map((p, i) => [pad + (i / (points.length - 1)) * (W - 2 * pad), H - pad - ((p.y - min) / rng) * (H - 2 * pad)]);
  return `<div class="muted" style="font-size:12px">${esc(label)}</div><svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <polyline fill="none" stroke="#e8ff00" stroke-width="2.5" points="${pts.map(p => p.join(',')).join(' ')}"/>
    ${pts.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="3.5" fill="#e8ff00"><title>${esc(points[i].x)}: ${points[i].y}</title></circle>`).join('')}
    <text x="${pad}" y="12" fill="#7d838c" font-size="10">${max}</text><text x="${pad}" y="${H - 4}" fill="#7d838c" font-size="10">${min}</text></svg>`;
}
function scoreSeries() {
  return S.tests.map((t, i) => {
    const sub = S.tests.slice(0, i + 1);
    const first = sub[0];
    const d = TESTS.map(([k, , dir]) => (Number(first[k]) && Number(t[k]) ? dir * (Number(t[k]) - Number(first[k])) / Number(first[k]) : null)).filter(x => x != null);
    return { x: t.date, y: d.length ? Math.round(100 + (d.reduce((a, b) => a + b, 0) / d.length) * 100) : 100 };
  });
}
function renderProgress() {
  const score = athleticismScore();
  $('#view').innerHTML = h`
    <div class="panel"><div class="card-head"><h2>Athleticism score</h2></div>
      <div class="stat" style="margin:10px 0"><b style="font-size:40px">${score ?? '—'}</b><span>100 = your first test · higher = more athletic</span></div>
      ${raw(lineChart(scoreSeries(), 'Score trend'))}</div>
    <div class="panel"><h3>Weekly test</h3><p class="muted" style="font-size:13px">Same day, same warm-up, best of 2-3 tries.</p>
      <form id="testForm">${raw(TESTS.map(([k, l]) => h`<div class="field"><label>${l}</label><input inputmode="decimal" name="${k}"></div>`).join(''))}
      <button class="btn" style="width:100%">Save test</button></form>
      ${raw(TESTS.map(([k, l]) => lineChart(S.tests.filter(t => Number(t[k])).map(t => ({ x: t.date, y: Number(t[k]) })), l)).join(''))}</div>
    <div class="panel"><h3>Garmin (paste today's numbers)</h3>
      <form id="gForm"><div class="grid3"><div class="field"><label>RHR</label><input inputmode="numeric" name="rhr"></div><div class="field"><label>HRV ms</label><input inputmode="numeric" name="hrv"></div><div class="field"><label>Sleep h</label><input inputmode="decimal" name="sleep"></div></div>
      <button class="btn ghost" style="width:100%">Save</button></form>
      <p class="muted" style="font-size:13px">If HRV is well below (&lt;85% of) your 7-day average, APEX switches today to "Cooked": less volume, power stays crisp.</p>
      ${raw(lineChart(S.garmin.filter(g => Number(g.hrv)).map(g => ({ x: g.date, y: Number(g.hrv) })), 'HRV'))}
      ${raw(lineChart(S.garmin.filter(g => Number(g.sleep)).map(g => ({ x: g.date, y: Number(g.sleep) })), 'Sleep (target 9 h)'))}</div>`;
  $('#testForm').onsubmit = e => {
    e.preventDefault();
    const t = Object.fromEntries(new FormData(e.target));
    if (!Object.values(t).some(Boolean)) return;
    S.tests.push({ date: today(), ...t }); save(); renderProgress();
  };
  $('#gForm').onsubmit = e => {
    e.preventDefault();
    const g = { date: today(), ...Object.fromEntries(new FormData(e.target)) };
    S.garmin = S.garmin.filter(x => x.date !== g.date).concat(g).slice(-120);
    applyHrv(); save(); renderProgress();
  };
}
function applyHrv() {
  const t = S.garmin.find(g => g.date === today());
  const prior = S.garmin.filter(g => g.date < today() && g.date >= daysAgo(7) && Number(g.hrv));
  if (!t || !Number(t.hrv) || prior.length < 3) return;
  const avg = prior.reduce((a, g) => a + Number(g.hrv), 0) / prior.length;
  if (Number(t.hrv) < 0.85 * avg) {
    S.toggles.energy = 'Cooked'; S.toggles.hrvFlag = true;
    showBanner(`HRV ${t.hrv} ms is ${Math.round((1 - t.hrv / avg) * 100)}% under your 7-day average (${Math.round(avg)}). Auto-switched to Cooked: lower volume, keep power crisp.`);
  }
}
function showBanner(msg) { const b = $('#banner'); b.textContent = msg; b.hidden = false; }

// ---------- boot ----------
async function boot() {
  renderTabs(); renderToggles();
  $('#toggles').hidden = !TOGGLE_TABS.has(current);
  const [health, prof] = await Promise.all([getJSON('api/health'), getJSON('api/profile')]);
  DATA.health = health; DATA.profile = prof?.profile || ''; DATA.morning5 = prof?.morning5 || null;
  const [lib, catalog, patterns, p] = await Promise.all([getJSON('data/exercises.json'), getJSON('data/catalog.json'), getJSON('data/patterns.json'), health ? null : getJSON('data/profile.json')]);
  DATA.lib = { ...(lib || { cards: [], pregame: [], sessions: [] }), catalog: catalog || [], patterns: patterns || {} };
  if (!health) {
    DATA.static = true;
    DATA.profile = p?.profile || ''; DATA.morning5 = lib?.morning5 || null;
  }
  const gw = $('#gw');
  if (health?.gateway) { gw.textContent = 'LIVE'; gw.className = 'gw on'; gw.title = `Default model: ${health.defaults?.text}`; }
  else { gw.textContent = 'OFFLINE'; gw.className = 'gw off'; gw.title = health?.reason || 'Preview: offline library only'; }
  if (DATA.static) showBanner('Preview: running on the offline library (43 cards, 14 sessions, 15 sports). Live AI coaching and photo mode turn on once the app is deployed with OmniRoute.');
  if (S.toggles.hrvFlag) showBanner('Energy auto-set to Cooked from your HRV. Tap a different Energy chip to override.');
  (VIEWS[current] || VIEWS.optimize)();
  if (!DATA.static && 'serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot();

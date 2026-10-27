import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startMock } from './mock-gateway.js';

process.env.NODE_ENV = 'test';
const { default: app } = await import('../server.js');
let srv, base;
before(async () => { await new Promise(r => { srv = app.listen(0, r); }); base = `http://127.0.0.1:${srv.address().port}`; });
after(() => srv.close());

async function sse(path, body) {
  const res = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const text = await res.text();
  return text.split('\n\n').filter(Boolean).map(c => ({ event: /^event: (.*)$/m.exec(c)?.[1], data: JSON.parse(/^data: (.*)$/m.exec(c)?.[1] || 'null') }));
}
const final = evs => evs.find(e => e.event === 'final')?.data;
function useGateway(url) {
  if (url) { process.env.OMNIROUTE_BASE_URL = url; process.env.OMNIROUTE_API_KEY = 'test-key'; }
  else { delete process.env.OMNIROUTE_BASE_URL; delete process.env.OMNIROUTE_API_KEY; }
}

test('offline: no gateway → offline card, session, pre-game for the spec test inputs', async () => {
  useGateway(null);
  const h = await (await fetch(`${base}/api/health`)).json();
  assert.equal(h.gateway, false);
  for (const [path, input, toggles, expect] of [
    ['/api/optimize', 'incline dumbbell press', {}, /Incline Dumbbell Press/],
    ['/api/optimize', 'Bulgarian split squat', {}, /Bulgarian/],
    ['/api/session', 'leg day, home, 30 min', { equipment: 'Home', time: 30 }, /Legs.*Home/],
    ['/api/session', 'boxing conditioning, fight Saturday', {}, /Fight/],
    ['/api/pregame', 'pickleball in 20 min', {}, /Pickleball/],
    ['/api/pregame', '2-mile XC race', {}, /Cross Country/],
  ]) {
    const f = final(await sse(path, { input, toggles }));
    assert.equal(f.source, 'offline', input);
    assert.match(f.data.name || f.data.title || f.data.sport, expect, input);
  }
});

test('offline: fight Saturday adds the 48 h rule', async () => {
  useGateway(null);
  const f = final(await sse('/api/session', { input: 'boxing conditioning, fight Saturday', toggles: {} }));
  assert.ok(f.data.rules.some(r => /48 H/.test(r)));
});

test('live: streams deltas, validates, picks strongest Claude model, key never leaves server', async () => {
  const mock = await startMock('good');
  useGateway(mock.url);
  const h = await (await fetch(`${base}/api/health`)).json();
  assert.equal(h.gateway, true);
  assert.equal(h.defaults.text, 'cc/claude-opus-4-1');
  assert.ok(!JSON.stringify(h).includes('test-key'));
  const evs = await sse('/api/optimize', { input: 'incline dumbbell press', toggles: { equipment: 'Home' } });
  assert.ok(evs.filter(e => e.event === 'delta').length > 3);
  assert.equal(final(evs).source, 'live');
  assert.equal(final(evs).data.name, 'Mock Live Card');
  const sys = mock.calls[0].messages[0].content;
  assert.match(sys, /Cameron Goodson/);
  assert.match(sys, /<athlete_profile>[\s\S]*flat feet/i);
  assert.match(sys, /Equipment: Home/);
  mock.close();
});

test('live: invalid JSON → one retry with the validation error → success', async () => {
  const mock = await startMock('bad-then-good');
  useGateway(mock.url);
  const f = final(await sse('/api/pregame', { input: 'basketball in 15' }));
  assert.equal(f.source, 'live');
  assert.equal(mock.calls.length, 2);
  assert.match(mock.calls[1].messages.at(-1).content, /failed validation/);
  mock.close();
});

test('live: vision sends image as image_url part', async () => {
  const mock = await startMock('good');
  useGateway(mock.url);
  const f = final(await sse('/api/vision', { image: 'data:image/jpeg;base64,AAAA' }));
  assert.equal(f.data.identified, 'Cable Crossover Station');
  const user = mock.calls[0].messages[1].content;
  assert.equal(user[1].type, 'image_url');
  mock.close();
});

test('gateway down → falls back to offline content', async () => {
  const mock = await startMock('down');
  useGateway(mock.url);
  const f = final(await sse('/api/optimize', { input: 'pogo hops', model: 'cc/claude-opus-4-1' }));
  assert.equal(f.source, 'offline');
  assert.match(f.note, /gateway error/);
  mock.close();
});

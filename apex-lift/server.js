// APEX LIFT server: static front end + /api proxy to OmniRoute with offline fallback.
import express from 'express';
import { gatewayConfig, listModels, pickDefaults, chatStream, chatOnce } from './lib/omniroute.js';
import { buildMessages } from './lib/prompt.js';
import { extractJson, validate } from './lib/schemas.js';
import { offlineCard, offlinePregame, offlineSession, offlineIndex, morning5 } from './lib/fallback.js';
import { DEFAULT_PROFILE } from './lib/profile.js';

const app = express();
app.use(express.json({ limit: '8mb' }));
app.use(express.static(new URL('./public', import.meta.url).pathname, { extensions: ['html'] }));
app.use('/data', express.static(new URL('./data', import.meta.url).pathname));

let modelCache = { at: 0, ids: [], error: null };
async function models(cfg) {
  if (Date.now() - modelCache.at < 5 * 60_000 && modelCache.ids.length) return modelCache;
  try {
    modelCache = { at: Date.now(), ids: await listModels(cfg), error: null };
  } catch (e) {
    modelCache = { at: Date.now(), ids: [], error: e.message };
  }
  return modelCache;
}

app.get('/api/health', async (_req, res) => {
  const cfg = gatewayConfig();
  if (!cfg) return res.json({ gateway: false, reason: 'OMNIROUTE_BASE_URL / OMNIROUTE_API_KEY not set — running on offline content.', offline: offlineIndex() });
  const m = await models(cfg);
  res.json({ gateway: !m.error, reason: m.error, models: m.ids, defaults: pickDefaults(m.ids, cfg), offline: offlineIndex() });
});

app.get('/api/profile', (_req, res) => res.json({ profile: DEFAULT_PROFILE, morning5: morning5() }));

const OFFLINE = {
  card: (input) => offlineCard(input),
  session: (input, toggles) => offlineSession(input, toggles),
  pregame: (input) => offlinePregame(input),
  vision: () => null,
};

function sse(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  return (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function sendOffline(send, kind, body, reason) {
  const data = OFFLINE[kind](body.input || '', body.toggles || {});
  if (data) send('final', { data, source: 'offline', note: reason });
  else send('error', { message: kind === 'vision'
    ? `Photo mode needs the OmniRoute gateway (${reason}). Pick the exercise from the offline list instead.`
    : `Not in the offline library (${reason}). Try one of the listed exercises/sports, or connect the gateway.`,
    offline: offlineIndex() });
}

async function run(kind, req, res) {
  const body = req.body || {};
  const send = sse(res);
  const cfg = gatewayConfig();
  if (!cfg) { sendOffline(send, kind, body, 'gateway not configured'); return res.end(); }

  const m = await models(cfg);
  const defaults = pickDefaults(m.ids, cfg);
  const model = body.model || (kind === 'vision' ? defaults.vision : defaults.text);
  if (!model) { sendOffline(send, kind, body, m.error || 'no models on gateway'); return res.end(); }

  const abort = new AbortController();
  res.on('close', () => { if (!res.writableEnded) abort.abort(); });
  const timer = setTimeout(() => abort.abort(), 120_000);
  send('meta', { source: 'live', model });

  try {
    const messages = buildMessages(kind, body);
    const maxTokens = kind === 'vision' ? 1500 : 7000;
    const text = await chatStream(cfg, { model, messages, maxTokens, signal: abort.signal, onDelta: t => send('delta', { text: t }) });

    let result;
    try { result = validate(kind, extractJson(text)); } catch (e) { result = { ok: false, error: e.message }; }

    if (!result.ok) {
      // One retry, feeding the validation error back.
      send('status', { message: 'Fixing output format…' });
      const retry = await chatOnce(cfg, {
        model, maxTokens, signal: abort.signal,
        messages: [...messages, { role: 'assistant', content: text },
          { role: 'user', content: `That JSON failed validation: ${result.error}. Return the corrected, complete JSON object only.` }],
      });
      try { result = validate(kind, extractJson(retry)); } catch (e) { result = { ok: false, error: e.message }; }
    }

    if (result.ok) send('final', { data: result.data, source: 'live', model });
    else sendOffline(send, kind, body, `model output invalid: ${result.error.slice(0, 200)}`);
  } catch (e) {
    if (!abort.signal.aborted || !res.writableEnded) sendOffline(send, kind, body, `gateway error: ${e.message.slice(0, 200)}`);
  } finally {
    clearTimeout(timer);
    res.end();
  }
}

app.post('/api/optimize', (req, res) => run('card', req, res));
app.post('/api/session', (req, res) => run('session', req, res));
app.post('/api/pregame', (req, res) => run('pregame', req, res));
app.post('/api/vision', (req, res) => run('vision', req, res));

const port = Number(process.env.PORT) || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    const cfg = gatewayConfig();
    console.log(`APEX LIFT on http://localhost:${port} — gateway: ${cfg ? cfg.base : 'not configured (offline mode)'}`);
  });
}

export default app;

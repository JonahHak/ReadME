// Fake OmniRoute gateway for tests. mode: 'good' | 'bad-then-good' | 'down'
import express from 'express';
import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(new URL('../data/exercises.json', import.meta.url), 'utf8'));

export function startMock(mode = 'good') {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  const calls = [];
  app.get('/v1/models', (_q, r) => (mode === 'down' ? r.status(500).end()
    : r.json({ data: ['openai/gpt-4o-mini', 'cc/claude-sonnet-4-5', 'cc/claude-opus-4-1', 'text-embedding-3-small'].map(id => ({ id })) })));
  app.post('/v1/chat/completions', (req, res) => {
    calls.push(req.body);
    if (mode === 'down') return res.status(502).json({ error: 'upstream down' });
    const sys = req.body.messages[0].content;
    const kind = /output_schema kind="(\w+)"/.exec(sys)[1];
    const sample = {
      card: { ...data.cards[0], name: 'Mock Live Card' },
      session: { ...data.sessions[0].session, title: 'Mock Live Session' },
      pregame: { ...data.pregame[0], sport: 'Mock Live Sport' },
      vision: { kind: 'machine', identified: 'Cable Crossover Station', confidence: 82, alternatives: [], machineSetup: ['Pulleys at shoulder height'], formAudit: null },
    }[kind];
    const good = JSON.stringify(sample);
    const isRetry = req.body.messages.length > 2;
    const text = mode === 'bad-then-good' && !isRetry ? '{"name": "broken"' : good;
    if (!req.body.stream) return res.json({ choices: [{ message: { content: text } }] });
    res.setHeader('Content-Type', 'text/event-stream');
    for (let i = 0; i < text.length; i += 40) res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text.slice(i, i + 40) } }] })}\n\n`);
    res.end('data: [DONE]\n\n');
  });
  return new Promise(resolve => {
    const srv = app.listen(0, () => resolve({ url: `http://127.0.0.1:${srv.address().port}`, calls, close: () => srv.close() }));
  });
}

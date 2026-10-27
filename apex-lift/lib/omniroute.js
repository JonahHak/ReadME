// Thin OpenAI-compatible client for the OmniRoute gateway. The key stays server-side.

export function gatewayConfig(env = process.env) {
  const raw = (env.OMNIROUTE_BASE_URL || '').trim().replace(/\/+$/, '');
  const key = (env.OMNIROUTE_API_KEY || '').trim();
  if (!raw || !key) return null;
  const base = /\/v\d+$/.test(raw) ? raw : `${raw}/v1`;
  return { base, key, textModel: env.MODEL_TEXT || '', visionModel: env.MODEL_VISION || '' };
}

const headers = cfg => ({ Authorization: `Bearer ${cfg.key}`, 'Content-Type': 'application/json' });

export async function listModels(cfg) {
  const res = await fetch(`${cfg.base}/models`, { headers: headers(cfg), signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`GET /models → ${res.status}`);
  const body = await res.json();
  return (body.data || body.models || []).map(m => (typeof m === 'string' ? m : m.id)).filter(Boolean);
}

const NOT_CHAT = /(embed|whisper|tts|speech|dall-e|imagen|image-gen|moderation|rerank|transcribe|audio|flux|stable-diffusion)/i;

function versionOf(id) {
  const m = id.match(/(\d+)(?:[.-](\d))?(?!\d)/);
  return m ? Number(m[1]) + (m[2] ? Number(m[2]) / 10 : 0) : 0;
}

// Higher = stronger. Claude first (opus > fable > sonnet > haiku, newer > older), then other frontier models.
export function scoreModel(id, { vision = false } = {}) {
  const s = id.toLowerCase();
  if (NOT_CHAT.test(s)) return -1;
  let score = 0;
  if (s.includes('claude')) {
    score = 1000;
    if (s.includes('opus')) score += 300;
    else if (s.includes('fable')) score += 250;
    else if (s.includes('sonnet')) score += 200;
    else if (s.includes('haiku')) score += 50;
    score += versionOf(s.replace(/.*claude-?/, '')) * 10;
  } else if (/gpt-5|o3|o4/.test(s)) score = 700;
  else if (/gemini.*pro/.test(s)) score = 650;
  else if (/gpt-4\.1|gpt-4o/.test(s)) score = 600;
  else if (/gemini/.test(s)) score = 500;
  else score = 100;
  if (/mini|nano|lite|flash/.test(s)) score -= 150;
  if (vision && !/(claude|gpt-4o|gpt-4\.1|gpt-5|gemini|vision|vl|llava|pixtral|o3|o4)/.test(s)) return -1;
  return score;
}

export function pickDefaults(ids, cfg = {}) {
  const best = vision => [...ids]
    .map(id => ({ id, s: scoreModel(id, { vision }) }))
    .filter(x => x.s >= 0)
    .sort((a, b) => b.s - a.s)[0]?.id || '';
  return {
    text: cfg.textModel || best(false),
    vision: cfg.visionModel || best(true),
  };
}

// Streamed chat completion. Calls onDelta(text) per token chunk; resolves with the full text.
export async function chatStream(cfg, { model, messages, maxTokens = 6000, onDelta, signal }) {
  const res = await fetch(`${cfg.base}/chat/completions`, {
    method: 'POST',
    headers: headers(cfg),
    body: JSON.stringify({ model, messages, stream: true, temperature: 0.4, max_tokens: maxTokens }),
    signal,
  });
  if (!res.ok) throw new Error(`chat/completions → ${res.status}: ${(await res.text()).slice(0, 300)}`);

  const type = res.headers.get('content-type') || '';
  if (!type.includes('event-stream')) {
    // Gateway ignored stream:true — treat as a normal response.
    const body = await res.json();
    const text = body.choices?.[0]?.message?.content ?? '';
    onDelta?.(text);
    return text;
  }

  const decoder = new TextDecoder();
  let buf = '';
  let full = '';
  for await (const chunk of res.body) {
    buf += decoder.decode(chunk, { stream: true });
    let nl;
    while ((nl = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') return full;
      try {
        const delta = JSON.parse(data).choices?.[0]?.delta?.content;
        if (delta) { full += delta; onDelta?.(delta); }
      } catch { /* keep-alive or partial line */ }
    }
  }
  return full;
}

export async function chatOnce(cfg, { model, messages, maxTokens = 6000, signal }) {
  const res = await fetch(`${cfg.base}/chat/completions`, {
    method: 'POST',
    headers: headers(cfg),
    body: JSON.stringify({ model, messages, stream: false, temperature: 0.3, max_tokens: maxTokens }),
    signal,
  });
  if (!res.ok) throw new Error(`chat/completions → ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const body = await res.json();
  return body.choices?.[0]?.message?.content ?? '';
}

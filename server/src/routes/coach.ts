import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import db from '../db';

const COACH_MODEL = 'claude-sonnet-4-6';

const router = Router();

let briefingCache: { date: string; text: string } | null = null;

function getContext() {
  const profile = db.prepare(`SELECT * FROM profile WHERE id = 1`).get() as Record<string, unknown>;
  const sessions = db.prepare(`SELECT * FROM sessions ORDER BY date DESC LIMIT 7`).all() as Array<{ id: number; date: string; type: string; duration_min: number; rpe: number; notes: string }>;
  const sessionIds = sessions.map(s => s.id);
  const exercises = sessionIds.length
    ? db.prepare(`SELECT * FROM exercises WHERE session_id IN (${sessionIds.map(() => '?').join(',')})`).all(...sessionIds) as Array<{ session_id: number; name: string; movement_pattern: string; sets: number; reps: string; load_kg: number | null }>
    : [];
  const exMap: Record<number, typeof exercises> = {};
  for (const ex of exercises) {
    if (!exMap[ex.session_id]) exMap[ex.session_id] = [];
    exMap[ex.session_id].push(ex);
  }
  const sessionsWithEx = sessions.map(s => ({ ...s, exercises: exMap[s.id] || [] }));
  const checkins = db.prepare(`SELECT * FROM checkins ORDER BY date DESC LIMIT 7`).all();

  return { profile, sessions: sessionsWithEx, checkins };
}

function buildSystemPrompt(ctx: ReturnType<typeof getContext>, currentPlan?: unknown): string {
  return `You are an elite athletic performance coach for a multi-sport athlete focused on explosiveness, functional strength, and all-around athleticism. The athlete plays pickleball competitively and trains across many sports.

ATHLETE PROFILE:
${JSON.stringify(ctx.profile, null, 2)}

RECENT SESSIONS (last 7):
${JSON.stringify(ctx.sessions, null, 2)}

RECENT CHECK-INS (last 7):
${JSON.stringify(ctx.checkins, null, 2)}

${currentPlan ? `CURRENT RECOMMENDED SESSION:\n${JSON.stringify(currentPlan, null, 2)}` : ''}

You give concise, direct coaching advice. You understand periodization, load management, injury prevention, and sport-specific training. When the athlete mentions physical issues, adjust your recommendations. When they mention upcoming competitions, taper appropriately. Keep responses focused and actionable.`;
}

router.post('/chat', async (req: Request, res: Response) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.json({ error: 'no_key', message: 'Add your ANTHROPIC_API_KEY to server/.env to enable the AI coach.' });
  }

  const { messages, context } = req.body;
  const ctx = getContext();
  const systemPrompt = buildSystemPrompt(ctx, context?.currentPlan);

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: COACH_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return res.json({ text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: 'api_error', message });
  }
});

router.get('/briefing', async (_req: Request, res: Response) => {
  const today = new Date().toISOString().slice(0, 10);

  if (briefingCache && briefingCache.date === today) {
    return res.json({ text: briefingCache.text });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const ctx = getContext();

  if (!apiKey) {
    const latestCheckin = ctx.checkins[0] as Record<string, number> | undefined;
    const energy = latestCheckin?.energy ?? 3;
    const fallback = energy >= 4
      ? 'Energy is up — good day to attack your session.'
      : energy <= 2
      ? 'Low energy today — keep intensity moderate, focus on movement quality.'
      : 'Steady day — execute the plan and track your effort.';
    return res.json({ text: fallback });
  }

  try {
    const client = new Anthropic({ apiKey });
    const systemPrompt = buildSystemPrompt(ctx);
    const response = await client.messages.create({
      model: COACH_MODEL,
      max_tokens: 80,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Give me a single motivating sentence for today as my coach — based on my recent training data. No more than 20 words.' }],
    });
    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : 'Execute your plan today.';
    briefingCache = { date: today, text };
    return res.json({ text });
  } catch {
    return res.json({ text: 'Execute your plan with intention today.' });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

const ACUTE_LAMBDA = 2 / (7 + 1);
const CHRONIC_LAMBDA = 2 / (28 + 1);

interface DailyLoad {
  date: string;
  load: number;
}

interface LoadPoint {
  date: string;
  dailyLoad: number;
  acuteLoad: number;
  chronicLoad: number;
  acwr: number;
}

function computeACWR(days: DailyLoad[]): LoadPoint[] {
  if (days.length === 0) return [];
  const result: LoadPoint[] = [];
  let acute = days[0].load;
  let chronic = days[0].load;
  for (let i = 0; i < days.length; i++) {
    const load = days[i].load;
    if (i === 0) {
      acute = load;
      chronic = load;
    } else {
      acute = ACUTE_LAMBDA * load + (1 - ACUTE_LAMBDA) * acute;
      chronic = CHRONIC_LAMBDA * load + (1 - CHRONIC_LAMBDA) * chronic;
    }
    const acwr = chronic > 0 ? acute / chronic : 1;
    result.push({ date: days[i].date, dailyLoad: load, acuteLoad: acute, chronicLoad: chronic, acwr });
  }
  return result;
}

function getACWRBand(acwr: number): 'green' | 'yellow' | 'red' | 'undertrain' {
  if (acwr > 1.5) return 'red';
  if (acwr > 1.3) return 'yellow';
  if (acwr >= 0.8) return 'green';
  return 'undertrain';
}

function buildDailyLoads(daysBack: number): DailyLoad[] {
  const sessions = db.prepare(`SELECT date, rpe, duration_min FROM sessions ORDER BY date ASC`).all() as Array<{ date: string; rpe: number; duration_min: number }>;

  const loadByDate: Record<string, number> = {};
  for (const s of sessions) {
    loadByDate[s.date] = (loadByDate[s.date] || 0) + s.rpe * s.duration_min;
  }

  const result: DailyLoad[] = [];
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - daysBack);

  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    result.push({ date: dateStr, load: loadByDate[dateStr] || 0 });
  }

  return result;
}

router.get('/load', (_req: Request, res: Response) => {
  const allDays = buildDailyLoads(60);
  const points = computeACWR(allDays);
  const last = points[points.length - 1];
  const band = last ? getACWRBand(last.acwr) : 'undertrain';
  res.json({ data: points.slice(-30), currentACWR: last?.acwr ?? 1, band });
});

router.get('/readiness', (_req: Request, res: Response) => {
  const checkins = db.prepare(`SELECT * FROM checkins ORDER BY date DESC LIMIT 14`).all() as Array<{
    date: string; sleep_hours: number; sleep_quality: number; resting_hr: number | null;
    hrv: number | null; soreness: number; energy: number; stress: number;
  }>;

  if (checkins.length === 0) {
    return res.json({ score: 70, reason: 'No check-in data yet', breakdown: {} });
  }

  const latest = checkins[0];
  const baseline = checkins.slice(1);

  type CheckinRow = typeof checkins[0];
  function avg(arr: CheckinRow[], key: keyof CheckinRow): number {
    const vals = arr.map(c => c[key]).filter((v): v is number => v != null && typeof v === 'number');
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }

  const bSleep = avg(baseline, 'sleep_hours') || 7.5;
  const bSleepQ = avg(baseline, 'sleep_quality') || 3;
  const bHrv = avg(baseline, 'hrv') || 65;
  const bRHR = avg(baseline, 'resting_hr') || 52;
  const bSoreness = avg(baseline, 'soreness') || 2;
  const bEnergy = avg(baseline, 'energy') || 3;
  const bStress = avg(baseline, 'stress') || 2;

  const sleepScore = Math.min(1, latest.sleep_hours / bSleep) * 100;
  const sleepQScore = (latest.sleep_quality / bSleepQ) * 100;
  const hrvScore = latest.hrv && bHrv ? Math.min(1.2, latest.hrv / bHrv) * 100 : 70;
  const rhrScore = latest.resting_hr && bRHR ? Math.min(1.2, bRHR / latest.resting_hr) * 100 : 70;
  const sorenessScore = (1 - (latest.soreness - 1) / 4) * 100;
  const energyScore = (latest.energy / 5) * 100;
  const stressScore = (1 - (latest.stress - 1) / 4) * 100;

  const hasHRV = latest.hrv != null;
  const hasRHR = latest.resting_hr != null;

  let score: number;
  let breakdown: Record<string, number>;

  if (hasHRV || hasRHR) {
    const hrvComponent = hasHRV ? (hasRHR ? (hrvScore * 0.6 + rhrScore * 0.4) : hrvScore) : rhrScore;
    score = sleepScore * 0.20 + sleepQScore * 0.10 + hrvComponent * 0.20 + sorenessScore * 0.20 + energyScore * 0.20 + stressScore * 0.10;
    breakdown = { sleep: sleepScore, sleepQuality: sleepQScore, hrv: hrvComponent, soreness: sorenessScore, energy: energyScore, stress: stressScore };
  } else {
    score = sleepScore * 0.25 + sleepQScore * 0.15 + sorenessScore * 0.25 + energyScore * 0.25 + stressScore * 0.10;
    breakdown = { sleep: sleepScore, sleepQuality: sleepQScore, soreness: sorenessScore, energy: energyScore, stress: stressScore };
  }

  score = Math.max(0, Math.min(100, score));

  const deviations = [
    { label: 'poor sleep', delta: bSleep - latest.sleep_hours },
    { label: 'high soreness', delta: latest.soreness - bSoreness },
    { label: 'low energy', delta: bEnergy - latest.energy },
    { label: 'high stress', delta: latest.stress - bStress },
    { label: 'low HRV', delta: hasHRV && latest.hrv ? bHrv - latest.hrv : 0 },
  ];
  const worst = deviations.sort((a, b) => b.delta - a.delta)[0];
  const reason = worst.delta > 0.5 ? `Dragged down by ${worst.label}` : 'Tracking close to your baseline';

  return res.json({ score: Math.round(score), reason, breakdown });
});

router.get('/recommendation', (_req: Request, res: Response) => {
  const allDays = buildDailyLoads(90);
  const points = computeACWR(allDays);
  const last = points[points.length - 1];
  const acwr = last?.acwr ?? 1;
  const band = getACWRBand(acwr);

  const recentSessions = db.prepare(`SELECT * FROM sessions ORDER BY date DESC LIMIT 7`).all() as Array<{
    id: number; date: string; type: string; duration_min: number; rpe: number;
  }>;

  const recentExercises = recentSessions.length
    ? db.prepare(`SELECT * FROM exercises WHERE session_id IN (${recentSessions.map(() => '?').join(',')})`)
        .all(...recentSessions.map(s => s.id)) as Array<{ session_id: number; movement_pattern: string }>
    : [];

  const patternMap: Record<number, string[]> = {};
  for (const ex of recentExercises) {
    if (!patternMap[ex.session_id]) patternMap[ex.session_id] = [];
    patternMap[ex.session_id].push(ex.movement_pattern);
  }

  const latestCheckin = db.prepare(`SELECT * FROM checkins ORDER BY date DESC LIMIT 1`).get() as {
    soreness: number; energy: number; sleep_quality: number;
  } | undefined;

  const soreness = latestCheckin?.soreness ?? 2;
  const energy = latestCheckin?.energy ?? 3;

  const firstSession = db.prepare(`SELECT date FROM sessions ORDER BY date ASC LIMIT 1`).get() as { date: string } | undefined;
  let weekNumber = 1;
  if (firstSession) {
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    weekNumber = Math.floor((Date.now() - new Date(firstSession.date).getTime()) / msPerWeek) + 1;
  }

  const isDeloadWeek = weekNumber % 4 === 0;

  const lastSessionType = recentSessions[0]?.type ?? '';
  const lastPatterns = recentSessions[0] ? (patternMap[recentSessions[0].id] || []) : [];

  const typeRotation: Array<'gym-strength' | 'gym-power' | 'conditioning'> = ['gym-strength', 'gym-power', 'conditioning'];
  const typeHistory = recentSessions.map(s => s.type);
  let nextType: 'gym-strength' | 'gym-power' | 'conditioning';

  if (lastSessionType === 'gym-strength') nextType = 'gym-power';
  else if (lastSessionType === 'gym-power') nextType = 'conditioning';
  else nextType = 'gym-strength';

  if (soreness >= 4 && lastPatterns.includes('squat')) nextType = 'conditioning';

  let action: 'push' | 'hold' | 'deload' = 'push';
  if (isDeloadWeek || (band === 'red')) action = 'deload';
  else if (band === 'yellow' || soreness >= 4 || energy <= 2) action = 'hold';

  const volumeMultiplier = action === 'deload' ? 0.5 : action === 'hold' ? 0.75 : 1;

  type Exercise = { name: string; pattern: string; sets: number; reps: string; load_intent: string; notes: string };

  const sessionTemplates: Record<string, { focus: string; exercises: Exercise[]; warmup: string[] }> = {
    'gym-strength': {
      focus: 'Heavy compound strength — 3–5 rep range',
      warmup: ['Leg swing circles ×10 each', 'Hip 90/90 mobility ×5 each', 'Band pull-aparts ×15', 'Goblet squat ×10 @light', 'Lateral shuffle 5m ×4'],
      exercises: [
        { name: 'Back Squat', pattern: 'squat', sets: Math.round(4 * volumeMultiplier) || 2, reps: '4', load_intent: '85% 1RM', notes: 'Controlled descent, drive through floor' },
        { name: 'Romanian Deadlift', pattern: 'hinge', sets: Math.round(3 * volumeMultiplier) || 2, reps: '5', load_intent: '80% 1RM', notes: 'Hip hinge — load hamstrings' },
        { name: 'Bench Press', pattern: 'push', sets: Math.round(4 * volumeMultiplier) || 2, reps: '4', load_intent: '85% 1RM', notes: '' },
        { name: 'Weighted Pull-up', pattern: 'pull', sets: Math.round(3 * volumeMultiplier) || 2, reps: '5', load_intent: 'BW+15kg', notes: '' },
        { name: 'Farmers Carry', pattern: 'carry', sets: Math.round(3 * volumeMultiplier) || 2, reps: '40m', load_intent: 'Heavy — grip challenge', notes: '' },
      ],
    },
    'gym-power': {
      focus: 'Explosive power — low rep, maximal intent',
      warmup: ['Ankle hops ×20', 'Single-leg balance ×10 each', 'Arm circles + thoracic rotation', 'Broad jump ×3 @50%', 'Sprint acceleration 10m ×2'],
      exercises: [
        { name: 'Power Clean', pattern: 'hinge', sets: Math.round(5 * volumeMultiplier) || 3, reps: '3', load_intent: '75–80% 1RM — bar speed', notes: 'Reset between reps' },
        { name: 'Box Jump', pattern: 'jump', sets: Math.round(4 * volumeMultiplier) || 2, reps: '4', load_intent: 'Max height — land softly', notes: 'Full reset, max intent' },
        { name: 'Rotational Med Ball Throw', pattern: 'throw', sets: Math.round(4 * volumeMultiplier) || 2, reps: '6 each side', load_intent: '5–8kg', notes: 'Hip-driven rotation' },
        { name: 'Push Press', pattern: 'push', sets: Math.round(4 * volumeMultiplier) || 2, reps: '4', load_intent: '70% overhead max', notes: '' },
        { name: 'Sprint 30m', pattern: 'sprint', sets: Math.round(5 * volumeMultiplier) || 3, reps: '30m', load_intent: '95% max velocity', notes: 'Full recovery between sets' },
      ],
    },
    'conditioning': {
      focus: 'Aerobic capacity + lactate threshold',
      warmup: ['Easy 5min jog or bike', 'Dynamic leg swings', 'Arm crossovers', 'Lateral shuffle ×4', 'Jump rope 60s easy'],
      exercises: [
        { name: 'Rowing Intervals', pattern: 'pull', sets: Math.round(5 * volumeMultiplier) || 3, reps: '500m', load_intent: '~2:00/500m effort', notes: '90s rest between' },
        { name: 'KB Swing', pattern: 'hinge', sets: Math.round(4 * volumeMultiplier) || 2, reps: '20', load_intent: '24–32kg', notes: 'Hinge, not squat' },
        { name: 'Sled Push', pattern: 'sprint', sets: Math.round(4 * volumeMultiplier) || 2, reps: '25m', load_intent: 'Moderate load — keep speed', notes: '' },
        { name: 'Battle Ropes', pattern: 'pull', sets: Math.round(3 * volumeMultiplier) || 2, reps: '30s on/15s off', load_intent: 'Continuous output', notes: '' },
      ],
    },
  };

  const template = sessionTemplates[nextType];
  const rationale = [
    action === 'deload' ? `Deload week ${weekNumber} — halved volume to consolidate adaptations.` : '',
    action === 'hold' ? `Holding intensity: ${band === 'yellow' ? 'ACWR in caution zone' : band === 'red' ? 'ACWR dangerously high' : 'low readiness'}.` : '',
    action === 'push' ? `Green ACWR + solid readiness — time to load.` : '',
    `Rotating to ${nextType.replace('gym-', '')} after ${lastSessionType || 'rest'}.`,
    soreness >= 3 ? `Soreness score ${soreness}/5 — steering away from heavy ${lastPatterns[0] || 'compound'} patterns.` : '',
  ].filter(Boolean).join(' ');

  return res.json({
    action,
    sessionType: nextType,
    focus: template.focus,
    exercises: template.exercises,
    warmup: template.warmup,
    rationale,
  });
});

export { buildDailyLoads, computeACWR, getACWRBand };
export default router;

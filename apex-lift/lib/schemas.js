// Zod schemas for every model output. The same schemas validate the offline
// content in data/*.json (see test/data.test.js), so live and offline results
// render through one code path.
import { z } from 'zod';

const Grade = z.enum(['A', 'A-B', 'B', 'B-C', 'C', 'C-D', 'D']);
const str = z.string().min(1);

export const Tip = z.object({
  tip: str,
  grade: Grade,
  source: z.string().optional(), // "Author Year" or "grade C, mechanism-based"
});

export const Card = z.object({
  name: str,
  aliases: z.array(z.string()).default([]),
  category: z.enum(['compound', 'isolation', 'power', 'plyo', 'conditioning', 'skill', 'mobility', 'combat', 'core']),
  muscles: z.array(z.string()).default([]),
  equipment: z.array(z.string()).default([]),
  doThisNotThat: str,
  priorityNote: z.string().optional(),
  prescription: z.object({
    sets: str, reps: str, load: str, rest: str, tempo: str, slot: str, warmup: str,
  }),
  setup: z.object({
    steps: z.array(str).min(1),
    cues: z.array(str).min(1).max(3),
  }),
  biomechanics: z.object({
    forceVector: str, jointAngles: str, momentArm: str, kineticChain: str, grf: str, hardestPoint: str,
  }),
  neural: z.object({
    intent: str,
    rfd: str,
    powerPair: z.object({
      exercise: str, dose: str, rest: str, type: z.enum(['PAPE', 'contrast', 'none']),
    }),
  }),
  elastic: z.string().nullable(),
  mobility: str,
  footBase: z.string().nullable(),
  sequencing: z.string().nullable(),
  looks: z.object({ effect: str, lengthened: str }),
  sportTransfer: z.object({
    sports: z.array(str).min(1),
    mechanism: str,
    combatNote: z.string().nullable(),
  }),
  intensityTechnique: z.object({ technique: str, when: str }),
  tips: z.array(Tip).min(3).max(6),
  teachMe: str,
  swaps: z.object({ home: str, bodyweight: str }),
  evidence: z.object({
    grade: Grade,
    studies: z.array(z.string()),
    confidence: z.number().min(0).max(100),
  }),
});

const Phase = z.enum(['CNS Prime', 'Main', 'Power', 'Accessory', 'Finisher', 'Cooldown', 'Conditioning', 'Skill']);

export const Session = z.object({
  title: str,
  programMode: z.enum(['split', 'triphasic', 'six-day', 'conditioning', 'combat', 'custom']),
  priorityNote: z.string().optional(),
  durationMin: z.number(),
  equipment: z.string(),
  win: z.object({ metric: str, why: str }),
  blocks: z.array(z.object({
    phase: Phase,
    items: z.array(z.object({
      name: str,
      dose: str,
      rest: z.string().optional(),
      note: z.string().optional(),
      expandable: z.boolean().default(true),
    })).min(1),
  })).min(3),
  rules: z.array(z.string()).default([]),
  nextTarget: str,
});

const PreGamePhase = z.enum(['CNS Prime', 'Visual Priming', 'Kinetic-Chain Activation', 'Motor-Pattern Grooving', 'Progressive Loading']);

export const PreGame = z.object({
  sport: str,
  aliases: z.array(z.string()).default([]),
  totalMin: z.number().min(3).max(15),
  steps: z.array(z.object({
    phase: PreGamePhase,
    drill: str,
    dose: str,
    why: str,
  })).min(5),
  anchorCue: str, // the ONE between-plays cue
  airwayNote: z.string().nullable(),
  avoid: z.array(z.string()).default([]),
  teachMe: str,
});

export const VisionResult = z.object({
  kind: z.enum(['exercise', 'machine', 'form-check', 'unknown']),
  identified: str,
  confidence: z.number().min(0).max(100),
  alternatives: z.array(z.object({ name: str, confidence: z.number() })).default([]),
  machineSetup: z.array(z.string()).nullable().default(null),
  formAudit: z.object({
    leaks: z.array(z.object({ where: str, what: str })),
    oneFix: str,
  }).nullable().default(null),
});

export const SCHEMAS = { card: Card, session: Session, pregame: PreGame, vision: VisionResult };

// JSON Schema text given to the model so it knows the exact shape.
export function jsonSchemaFor(kind) {
  return JSON.stringify(z.toJSONSchema(SCHEMAS[kind], { io: 'input' }));
}

// Pull the first JSON object out of model text (handles ``` fences and stray prose).
export function extractJson(text) {
  const clean = text.replace(/```(?:json)?/gi, '');
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('No JSON object found in model output');
  return JSON.parse(clean.slice(start, end + 1));
}

export function validate(kind, obj) {
  const r = SCHEMAS[kind].safeParse(obj);
  if (r.success) return { ok: true, data: r.data };
  const issues = r.error.issues.slice(0, 12).map(i => `${i.path.join('.') || '(root)'}: ${i.message}`);
  return { ok: false, error: issues.join('; ') };
}

// ---------- Exercise catalog (data/catalog.json) + movement patterns (data/patterns.json) ----------
// A catalog entry is exercise-specific (setup, cues, swap). Its pattern supplies the deep layers.
export const PATTERN_IDS = [
  'squat', 'hinge', 'single-leg', 'knee-flexion', 'knee-extension', 'calf', 'glute-bridge', 'hip-abduction', 'hip-adduction',
  'horizontal-press', 'incline-press', 'vertical-press', 'chest-fly', 'dip', 'horizontal-pull', 'vertical-pull',
  'scap-rear-delt', 'shrug', 'shoulder-raise', 'elbow-flexion', 'elbow-extension-overhead', 'elbow-extension', 'forearm-grip',
  'neck', 'core-anti-extension', 'core-anti-rotation', 'core-flexion', 'rotational-power', 'plyo-lower', 'plyo-upper',
  'olympic', 'ballistic-hinge', 'carry', 'sprint-agility', 'cardio', 'combat', 'mobility',
];

export const CatalogEntry = z.object({
  name: str,
  aliases: z.array(z.string()).default([]),
  pattern: z.enum(PATTERN_IDS),
  equipment: z.array(z.string()).min(1),
  muscles: z.array(z.string()).min(1),
  standing: z.boolean(),
  doThisNotThat: str,
  steps: z.array(str).min(3).max(6),
  cues: z.array(str).min(1).max(3),
  homeSwap: str,
  note: str, // one exercise-specific, Jonah-specific detail; becomes the first small tip
  noteGrade: Grade.default('C'),
  hardestPoint: z.string().optional(),
  prescription: z.object({ sets: str, reps: str, rest: str }).partial().optional(),
});

export const Pattern = z.object({
  id: z.enum(PATTERN_IDS),
  label: str,
  category: Card.shape.category,
  rank: z.number().min(0).max(9), // session order: 1 power, 2 main compound, 3 secondary, 4 isolation, 5 core, 6 conditioning, 8 mobility
  balance: z.enum(['push', 'pull', 'quad', 'hip', 'core', 'power', 'conditioning', 'arms', 'skill', 'mobility', 'other']),
  keywords: z.array(z.string()).min(3),
  doThisNotThat: str,
  priorityNote: z.string().optional(),
  prescription: Card.shape.prescription,
  defaultSteps: z.array(str).min(3),
  defaultCues: z.array(str).min(1).max(3),
  biomechanics: Card.shape.biomechanics,
  neural: Card.shape.neural,
  elastic: z.string().nullable(),
  mobility: str,
  footBase: z.string().nullable(),
  footBaseSeated: z.string().nullable(),
  sequencing: z.string().nullable(),
  looks: Card.shape.looks,
  sportTransfer: Card.shape.sportTransfer,
  intensityTechnique: Card.shape.intensityTechnique,
  tips: z.array(Tip).min(3).max(5),
  teachMe: str,
  swaps: Card.shape.swaps,
  evidence: Card.shape.evidence,
});

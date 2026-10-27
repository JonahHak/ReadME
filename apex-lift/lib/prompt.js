// Builds the messages for each mode: system prompt + profile + log + toggles + schema.
import { readFileSync } from 'node:fs';
import { jsonSchemaFor } from './schemas.js';
import { DEFAULT_PROFILE } from './profile.js';

const SYSTEM = readFileSync(new URL('../prompts/coach_system.md', import.meta.url), 'utf8');

const clip = (s, n) => (s.length > n ? `${s.slice(0, n)}…` : s);

export function togglesText(t = {}) {
  const sore = (t.sore || []).length ? t.sore.join(', ') : 'none';
  return [
    `Equipment: ${t.equipment || 'Home'} (home = light dumbbells, treadmill, bodyweight; no bar, bands or bag)`,
    `Time: ${t.time || 45} min`,
    `Energy: ${t.energy || 'Normal'}${t.hrvFlag ? ' (auto-set: HRV well below 7-day average)' : ''}`,
    `Game or fight within 48 h: ${t.game48 ? 'YES' : 'no'}`,
    `Sore spots: ${sore}`,
    `Program mode: ${t.programMode || 'split'}`,
  ].join('\n');
}

function system(kind, { profile, log, toggles }) {
  return [
    SYSTEM,
    `<athlete_profile>\n${clip(profile || DEFAULT_PROFILE, 6000)}\n</athlete_profile>`,
    `<training_log>\n${clip(log || 'No sets logged in the last 14 days.', 5000)}\n</training_log>`,
    `<today>\n${togglesText(toggles)}\n</today>`,
    `<output_schema kind="${kind}">\n${jsonSchemaFor(kind)}\n</output_schema>`,
    'Return ONE JSON object that validates against output_schema. No markdown fences, no prose.',
  ].join('\n\n');
}

const ASK = {
  card: ({ input, context }) =>
    `MODE A — OPTIMIZATION CARD.\nExercise: "${input}"${context ? `\nContext: ${context}` : ''}\n` +
    'Fill every layer. "doThisNotThat" = the single biggest upgrade over how most people do it. ' +
    'setup.cues: max 3, external focus. footBase required for standing lifts; sequencing required for rotational/throwing/striking moves. ' +
    'Label the power pairing PAPE (~4-8 min rest) or contrast (short rest). Grade every tip; never invent a citation. ' +
    'Swaps must fit the equipment toggle. If a sore spot is loaded by this exercise, say how to adjust in prescription.load.',
  session: ({ input }) =>
    `MODE C — BUILD MY SESSION.\nRequest: "${input}"\n` +
    'Order: CNS Prime → Main → Power → Accessory → Finisher → Cooldown (Conditioning/Skill blocks allowed). ' +
    'Fit inside the time toggle. Use real exercise names (each expands into its own card). 1 warm-up set per exercise. ' +
    'Use the training_log for double-progression targets (name the load/reps to beat). One measurable win + why. ' +
    'If energy is Cooked: cut volume ~30-40%, keep power crisp, no failure. If game/fight within 48 h: no new exercises, no eccentric-heavy work, no lower-body failure.',
  pregame: ({ input }) =>
    `MODE D — PRE-GAME ACTIVATION.\nRequest: "${input}"\n` +
    'One-time 5-8 min protocol RIGHT NOW in this order: CNS Prime → Visual Priming → Kinetic-Chain Activation → Motor-Pattern Grooving → Progressive Loading. ' +
    'Install patterns; give exactly ONE anchor cue for between plays and nothing to remember mid-game. ' +
    'If the sport involves sustained running include an interval-style airway warm-up (EIB) with HR targets in airwayNote; else null. ' +
    'If the request says how many minutes until start, fit totalMin inside it.',
  vision: ({ context }) =>
    'MODE B — PHOTO.\nIdentify what is in the photo: an exercise, a gym machine, a social-media screenshot of an exercise, or the athlete mid-rep. ' +
    'Give confidence 0-100 and 2-3 alternatives when under 70. For machines, machineSetup = exact setup steps (seat height, pad, grip, cable height) for a 5\'8" athlete. ' +
    'If it shows a person mid-rep, kind = "form-check" and formAudit = where force leaks through the chain (foot collapse, knee valgus, arm-first sequencing, lost brace) plus the ONE fix that matters most. ' +
    `Otherwise machineSetup/formAudit = null.${context ? `\nAthlete note: ${context}` : ''}`,
};

export function buildMessages(kind, { input, context, image, profile, log, toggles }) {
  const text = ASK[kind]({ input, context });
  const user = image
    ? [{ type: 'text', text }, { type: 'image_url', image_url: { url: image } }]
    : text;
  return [
    { role: 'system', content: system(kind, { profile, log, toggles }) },
    { role: 'user', content: user },
  ];
}

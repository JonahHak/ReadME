import db from './db';

interface SeedExercise {
  name: string;
  movement_pattern: string;
  sets: number;
  reps: string;
  load_kg: number | null;
  notes: string;
}

interface SeedSession {
  daysAgo: number;
  type: string;
  duration_min: number;
  rpe: number;
  notes: string;
  exercises: SeedExercise[];
}

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export function seed() {
  const count = (db.prepare('SELECT COUNT(*) as c FROM sessions').get() as { c: number }).c;
  if (count > 0) return;

  const sessions: SeedSession[] = [
    {
      daysAgo: 21,
      type: 'gym-strength',
      duration_min: 75,
      rpe: 8,
      notes: 'Felt strong on squats, bench was a grind',
      exercises: [
        { name: 'Back Squat', movement_pattern: 'squat', sets: 4, reps: '5', load_kg: 120, notes: '' },
        { name: 'Romanian Deadlift', movement_pattern: 'hinge', sets: 3, reps: '6', load_kg: 100, notes: '' },
        { name: 'Bench Press', movement_pattern: 'push', sets: 4, reps: '5', load_kg: 90, notes: 'tough' },
        { name: 'Barbell Row', movement_pattern: 'pull', sets: 3, reps: '6', load_kg: 80, notes: '' },
        { name: 'Farmers Carry', movement_pattern: 'carry', sets: 3, reps: '40m', load_kg: 40, notes: '' },
      ],
    },
    {
      daysAgo: 19,
      type: 'gym-power',
      duration_min: 60,
      rpe: 7,
      notes: 'Power cleans felt explosive',
      exercises: [
        { name: 'Power Clean', movement_pattern: 'hinge', sets: 5, reps: '3', load_kg: 80, notes: '' },
        { name: 'Box Jump', movement_pattern: 'jump', sets: 4, reps: '5', load_kg: null, notes: '30in box' },
        { name: 'Med Ball Slam', movement_pattern: 'throw', sets: 4, reps: '8', load_kg: 8, notes: '' },
        { name: 'Push Press', movement_pattern: 'push', sets: 4, reps: '4', load_kg: 70, notes: '' },
        { name: 'Broad Jump', movement_pattern: 'jump', sets: 3, reps: '5', load_kg: null, notes: '' },
      ],
    },
    {
      daysAgo: 18,
      type: 'conditioning',
      duration_min: 45,
      rpe: 7,
      notes: 'Row + bike intervals',
      exercises: [
        { name: 'Rowing Intervals', movement_pattern: 'pull', sets: 6, reps: '500m', load_kg: null, notes: '~2:05/500m' },
        { name: 'Assault Bike', movement_pattern: 'other', sets: 5, reps: '30s on/30s off', load_kg: null, notes: '' },
        { name: 'Sled Push', movement_pattern: 'sprint', sets: 4, reps: '20m', load_kg: 60, notes: '' },
      ],
    },
    {
      daysAgo: 16,
      type: 'gym-strength',
      duration_min: 80,
      rpe: 8,
      notes: 'Deadlift PR attempt — got it',
      exercises: [
        { name: 'Deadlift', movement_pattern: 'hinge', sets: 5, reps: '3', load_kg: 160, notes: 'PR at 160kg' },
        { name: 'Bulgarian Split Squat', movement_pattern: 'squat', sets: 3, reps: '8', load_kg: 60, notes: '' },
        { name: 'Weighted Pull-up', movement_pattern: 'pull', sets: 4, reps: '5', load_kg: 20, notes: '' },
        { name: 'Dumbbell Press', movement_pattern: 'push', sets: 3, reps: '8', load_kg: 36, notes: '' },
        { name: 'Copenhagen Plank', movement_pattern: 'other', sets: 3, reps: '30s', load_kg: null, notes: '' },
      ],
    },
    {
      daysAgo: 15,
      type: 'sport',
      duration_min: 90,
      rpe: 6,
      notes: 'Pickleball doubles, felt quick laterally',
      exercises: [
        { name: 'Pickleball Drilling', movement_pattern: 'sprint', sets: 1, reps: '60min', load_kg: null, notes: '' },
        { name: 'Match Play', movement_pattern: 'other', sets: 1, reps: '30min', load_kg: null, notes: '' },
      ],
    },
    {
      daysAgo: 14,
      type: 'gym-power',
      duration_min: 55,
      rpe: 7,
      notes: 'Hang snatches + reactive plyos',
      exercises: [
        { name: 'Hang Snatch', movement_pattern: 'hinge', sets: 5, reps: '3', load_kg: 55, notes: '' },
        { name: 'Depth Drop to Jump', movement_pattern: 'jump', sets: 4, reps: '5', load_kg: null, notes: '' },
        { name: 'Rotational Med Ball Throw', movement_pattern: 'throw', sets: 4, reps: '6', load_kg: 6, notes: '' },
        { name: 'Sprint 20m', movement_pattern: 'sprint', sets: 6, reps: '20m', load_kg: null, notes: '' },
      ],
    },
    {
      daysAgo: 12,
      type: 'gym-strength',
      duration_min: 70,
      rpe: 7,
      notes: 'Volume day, kept it controlled',
      exercises: [
        { name: 'Front Squat', movement_pattern: 'squat', sets: 4, reps: '6', load_kg: 95, notes: '' },
        { name: 'Good Morning', movement_pattern: 'hinge', sets: 3, reps: '10', load_kg: 60, notes: '' },
        { name: 'Incline Press', movement_pattern: 'push', sets: 4, reps: '8', load_kg: 80, notes: '' },
        { name: 'Cable Row', movement_pattern: 'pull', sets: 4, reps: '10', load_kg: 70, notes: '' },
        { name: 'Suitcase Carry', movement_pattern: 'carry', sets: 3, reps: '30m', load_kg: 50, notes: '' },
      ],
    },
    {
      daysAgo: 11,
      type: 'conditioning',
      duration_min: 40,
      rpe: 6,
      notes: 'Easy aerobic, heart rate cap 140',
      exercises: [
        { name: 'Zone 2 Run', movement_pattern: 'sprint', sets: 1, reps: '30min', load_kg: null, notes: 'HR ~135' },
        { name: 'Jump Rope', movement_pattern: 'jump', sets: 3, reps: '3min', load_kg: null, notes: '' },
      ],
    },
    {
      daysAgo: 9,
      type: 'gym-power',
      duration_min: 65,
      rpe: 8,
      notes: 'Best clean session in months',
      exercises: [
        { name: 'Power Clean + Push Jerk', movement_pattern: 'hinge', sets: 5, reps: '2+2', load_kg: 85, notes: '' },
        { name: 'Trap Bar Jump', movement_pattern: 'jump', sets: 4, reps: '5', load_kg: 60, notes: '' },
        { name: 'Single-leg Box Jump', movement_pattern: 'jump', sets: 3, reps: '5 each', load_kg: null, notes: '' },
        { name: 'Overhead Med Ball Throw', movement_pattern: 'throw', sets: 4, reps: '8', load_kg: 8, notes: '' },
        { name: 'Lateral Bound', movement_pattern: 'jump', sets: 3, reps: '8 each', load_kg: null, notes: '' },
      ],
    },
    {
      daysAgo: 8,
      type: 'gym-strength',
      duration_min: 75,
      rpe: 9,
      notes: 'Pushed hard — maybe too hard',
      exercises: [
        { name: 'Back Squat', movement_pattern: 'squat', sets: 5, reps: '3', load_kg: 127.5, notes: '' },
        { name: 'Deadlift', movement_pattern: 'hinge', sets: 4, reps: '4', load_kg: 150, notes: '' },
        { name: 'Bench Press', movement_pattern: 'push', sets: 5, reps: '5', load_kg: 92.5, notes: '' },
        { name: 'Pendlay Row', movement_pattern: 'pull', sets: 4, reps: '5', load_kg: 90, notes: '' },
      ],
    },
    {
      daysAgo: 6,
      type: 'sport',
      duration_min: 120,
      rpe: 7,
      notes: 'Long pickleball session — tournament warm-up',
      exercises: [
        { name: 'Drilling', movement_pattern: 'other', sets: 1, reps: '60min', load_kg: null, notes: '' },
        { name: 'Matches', movement_pattern: 'sprint', sets: 1, reps: '60min', load_kg: null, notes: '3 sets' },
      ],
    },
    {
      daysAgo: 5,
      type: 'gym-power',
      duration_min: 55,
      rpe: 7,
      notes: 'Reactive focus, felt springy',
      exercises: [
        { name: 'Hang Power Clean', movement_pattern: 'hinge', sets: 5, reps: '3', load_kg: 75, notes: '' },
        { name: 'Hurdle Hop', movement_pattern: 'jump', sets: 4, reps: '6', load_kg: null, notes: '' },
        { name: 'Rotational Throw', movement_pattern: 'throw', sets: 4, reps: '6 each', load_kg: 5, notes: '' },
        { name: 'Hill Sprint', movement_pattern: 'sprint', sets: 6, reps: '30m', load_kg: null, notes: '' },
      ],
    },
    {
      daysAgo: 4,
      type: 'conditioning',
      duration_min: 50,
      rpe: 7,
      notes: 'Circuit: KB + sleds',
      exercises: [
        { name: 'KB Swing', movement_pattern: 'hinge', sets: 5, reps: '15', load_kg: 32, notes: '' },
        { name: 'Sled Sprint', movement_pattern: 'sprint', sets: 6, reps: '20m', load_kg: 40, notes: '' },
        { name: 'Battle Ropes', movement_pattern: 'pull', sets: 4, reps: '30s', load_kg: null, notes: '' },
      ],
    },
    {
      daysAgo: 2,
      type: 'gym-strength',
      duration_min: 70,
      rpe: 8,
      notes: 'Solid session, felt recovered',
      exercises: [
        { name: 'Pause Squat', movement_pattern: 'squat', sets: 4, reps: '4', load_kg: 110, notes: '3s pause' },
        { name: 'Trap Bar Deadlift', movement_pattern: 'hinge', sets: 4, reps: '5', load_kg: 140, notes: '' },
        { name: 'Weighted Dip', movement_pattern: 'push', sets: 3, reps: '6', load_kg: 25, notes: '' },
        { name: 'Chest-supported Row', movement_pattern: 'pull', sets: 4, reps: '8', load_kg: 80, notes: '' },
        { name: 'Farmer Carry', movement_pattern: 'carry', sets: 3, reps: '40m', load_kg: 50, notes: '' },
      ],
    },
    {
      daysAgo: 1,
      type: 'gym-power',
      duration_min: 60,
      rpe: 7,
      notes: 'Light power — speed focus',
      exercises: [
        { name: 'Power Snatch', movement_pattern: 'hinge', sets: 5, reps: '3', load_kg: 50, notes: '' },
        { name: 'Box Jump', movement_pattern: 'jump', sets: 5, reps: '5', load_kg: null, notes: '' },
        { name: 'Med Ball Chest Pass', movement_pattern: 'throw', sets: 4, reps: '8', load_kg: 5, notes: '' },
        { name: 'Acceleration Sprint', movement_pattern: 'sprint', sets: 5, reps: '30m', load_kg: null, notes: '' },
      ],
    },
  ];

  const insertSession = db.prepare(`
    INSERT INTO sessions (date, type, sport_name, duration_min, rpe, notes)
    VALUES (@date, @type, @sport_name, @duration_min, @rpe, @notes)
  `);

  const insertExercise = db.prepare(`
    INSERT INTO exercises (session_id, name, movement_pattern, sets, reps, load_kg, notes)
    VALUES (@session_id, @name, @movement_pattern, @sets, @reps, @load_kg, @notes)
  `);

  const seedSessions = db.transaction(() => {
    for (const s of sessions) {
      const result = insertSession.run({
        date: dateStr(s.daysAgo),
        type: s.type,
        sport_name: s.type === 'sport' ? 'pickleball' : null,
        duration_min: s.duration_min,
        rpe: s.rpe,
        notes: s.notes,
      });
      const sessionId = result.lastInsertRowid;
      for (const ex of s.exercises) {
        insertExercise.run({ session_id: sessionId, ...ex });
      }
    }
  });

  seedSessions();

  const checkinData = [
    { daysAgo: 21, sleep_hours: 7.5, sleep_quality: 4, resting_hr: 52, hrv: 68, soreness: 2, energy: 4, stress: 2 },
    { daysAgo: 20, sleep_hours: 6.5, sleep_quality: 3, resting_hr: 55, hrv: 61, soreness: 3, energy: 3, stress: 3 },
    { daysAgo: 19, sleep_hours: 8.0, sleep_quality: 5, resting_hr: 50, hrv: 74, soreness: 2, energy: 5, stress: 1 },
    { daysAgo: 18, sleep_hours: 7.0, sleep_quality: 3, resting_hr: 54, hrv: 65, soreness: 3, energy: 3, stress: 3 },
    { daysAgo: 17, sleep_hours: 8.5, sleep_quality: 5, resting_hr: 49, hrv: 78, soreness: 1, energy: 5, stress: 1 },
    { daysAgo: 16, sleep_hours: 7.5, sleep_quality: 4, resting_hr: 51, hrv: 71, soreness: 2, energy: 4, stress: 2 },
    { daysAgo: 15, sleep_hours: 6.0, sleep_quality: 2, resting_hr: 58, hrv: 55, soreness: 4, energy: 2, stress: 4 },
    { daysAgo: 14, sleep_hours: 8.0, sleep_quality: 4, resting_hr: 52, hrv: 67, soreness: 2, energy: 4, stress: 2 },
    { daysAgo: 13, sleep_hours: 7.5, sleep_quality: 4, resting_hr: 51, hrv: 70, soreness: 2, energy: 4, stress: 2 },
    { daysAgo: 12, sleep_hours: 8.0, sleep_quality: 5, resting_hr: 50, hrv: 75, soreness: 1, energy: 5, stress: 1 },
    { daysAgo: 11, sleep_hours: 7.0, sleep_quality: 3, resting_hr: 54, hrv: 63, soreness: 3, energy: 3, stress: 3 },
    { daysAgo: 10, sleep_hours: 7.5, sleep_quality: 4, resting_hr: 52, hrv: 69, soreness: 2, energy: 4, stress: 2 },
    { daysAgo: 9, sleep_hours: 8.5, sleep_quality: 5, resting_hr: 48, hrv: 80, soreness: 1, energy: 5, stress: 1 },
    { daysAgo: 8, sleep_hours: 6.5, sleep_quality: 3, resting_hr: 56, hrv: 60, soreness: 3, energy: 3, stress: 3 },
    { daysAgo: 7, sleep_hours: 5.5, sleep_quality: 2, resting_hr: 60, hrv: 52, soreness: 4, energy: 2, stress: 5 },
    { daysAgo: 6, sleep_hours: 7.5, sleep_quality: 4, resting_hr: 53, hrv: 66, soreness: 3, energy: 4, stress: 2 },
    { daysAgo: 5, sleep_hours: 8.0, sleep_quality: 4, resting_hr: 51, hrv: 72, soreness: 2, energy: 4, stress: 2 },
    { daysAgo: 4, sleep_hours: 7.0, sleep_quality: 3, resting_hr: 54, hrv: 64, soreness: 3, energy: 3, stress: 3 },
    { daysAgo: 3, sleep_hours: 8.5, sleep_quality: 5, resting_hr: 49, hrv: 77, soreness: 1, energy: 5, stress: 1 },
    { daysAgo: 2, sleep_hours: 7.5, sleep_quality: 4, resting_hr: 52, hrv: 70, soreness: 2, energy: 4, stress: 2 },
    { daysAgo: 1, sleep_hours: 7.0, sleep_quality: 4, resting_hr: 53, hrv: 68, soreness: 2, energy: 4, stress: 2 },
  ];

  const insertCheckin = db.prepare(`
    INSERT OR IGNORE INTO checkins (date, sleep_hours, sleep_quality, resting_hr, hrv, soreness, energy, stress)
    VALUES (@date, @sleep_hours, @sleep_quality, @resting_hr, @hrv, @soreness, @energy, @stress)
  `);

  const seedCheckins = db.transaction(() => {
    for (const c of checkinData) {
      insertCheckin.run({ ...c, date: dateStr(c.daysAgo) });
    }
  });

  seedCheckins();

  console.log('Seeded training data (21 days)');
}

import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const sessions = db.prepare(`SELECT * FROM sessions ORDER BY date DESC, id DESC`).all();
  const exercises = db.prepare(`SELECT * FROM exercises`).all() as Array<{ session_id: number;[key: string]: unknown }>;
  const exerciseMap: Record<number, unknown[]> = {};
  for (const ex of exercises) {
    if (!exerciseMap[ex.session_id]) exerciseMap[ex.session_id] = [];
    exerciseMap[ex.session_id].push(ex);
  }
  const result = (sessions as Array<{ id: number;[key: string]: unknown }>).map(s => ({
    ...s,
    exercises: exerciseMap[s.id] || [],
  }));
  res.json(result);
});

router.get('/:id', (req: Request, res: Response) => {
  const session = db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Not found' });
  const exercises = db.prepare(`SELECT * FROM exercises WHERE session_id = ?`).all(req.params.id);
  return res.json({ ...session as object, exercises });
});

router.post('/', (req: Request, res: Response) => {
  const { date, type, sport_name, duration_min, rpe, notes, exercises } = req.body;
  const insertSession = db.prepare(`
    INSERT INTO sessions (date, type, sport_name, duration_min, rpe, notes)
    VALUES (@date, @type, @sport_name, @duration_min, @rpe, @notes)
  `);
  const insertExercise = db.prepare(`
    INSERT INTO exercises (session_id, name, movement_pattern, sets, reps, load_kg, notes)
    VALUES (@session_id, @name, @movement_pattern, @sets, @reps, @load_kg, @notes)
  `);

  const run = db.transaction(() => {
    const result = insertSession.run({ date, type, sport_name: sport_name || null, duration_min, rpe, notes: notes || '' });
    const sessionId = result.lastInsertRowid;
    if (exercises && Array.isArray(exercises)) {
      for (const ex of exercises) {
        insertExercise.run({
          session_id: sessionId,
          name: ex.name,
          movement_pattern: ex.movement_pattern,
          sets: ex.sets,
          reps: ex.reps,
          load_kg: ex.load_kg || null,
          notes: ex.notes || '',
        });
      }
    }
    return sessionId;
  });

  const sessionId = run();
  const session = db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(sessionId);
  const exRows = db.prepare(`SELECT * FROM exercises WHERE session_id = ?`).all(sessionId);
  res.status(201).json({ ...session as object, exercises: exRows });
});

router.delete('/:id', (req: Request, res: Response) => {
  db.prepare(`DELETE FROM sessions WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

export default router;

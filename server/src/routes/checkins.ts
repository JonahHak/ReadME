import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const rows = db.prepare(`SELECT * FROM checkins ORDER BY date DESC`).all();
  res.json(rows);
});

router.get('/today', (_req: Request, res: Response) => {
  const today = new Date().toISOString().slice(0, 10);
  const row = db.prepare(`SELECT * FROM checkins WHERE date = ?`).get(today);
  res.json(row || null);
});

router.post('/', (req: Request, res: Response) => {
  const today = new Date().toISOString().slice(0, 10);
  const { sleep_hours, sleep_quality, resting_hr, hrv, soreness, energy, stress } = req.body;
  db.prepare(`
    INSERT INTO checkins (date, sleep_hours, sleep_quality, resting_hr, hrv, soreness, energy, stress)
    VALUES (@date, @sleep_hours, @sleep_quality, @resting_hr, @hrv, @soreness, @energy, @stress)
    ON CONFLICT(date) DO UPDATE SET
      sleep_hours=excluded.sleep_hours,
      sleep_quality=excluded.sleep_quality,
      resting_hr=excluded.resting_hr,
      hrv=excluded.hrv,
      soreness=excluded.soreness,
      energy=excluded.energy,
      stress=excluded.stress
  `).run({ date: today, sleep_hours, sleep_quality, resting_hr: resting_hr || null, hrv: hrv || null, soreness, energy, stress });
  const row = db.prepare(`SELECT * FROM checkins WHERE date = ?`).get(today);
  res.json(row);
});

export default router;

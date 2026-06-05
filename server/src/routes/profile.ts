import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const row = db.prepare(`SELECT * FROM profile WHERE id = 1`).get();
  res.json(row);
});

router.put('/', (req: Request, res: Response) => {
  const { goals, sports, days_per_week, equipment } = req.body;
  db.prepare(`
    UPDATE profile SET goals=@goals, sports=@sports, days_per_week=@days_per_week, equipment=@equipment WHERE id=1
  `).run({ goals, sports, days_per_week, equipment });
  const row = db.prepare(`SELECT * FROM profile WHERE id = 1`).get();
  res.json(row);
});

export default router;

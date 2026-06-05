import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import sessionsRouter from './routes/sessions';
import checkinsRouter from './routes/checkins';
import profileRouter from './routes/profile';
import analyticsRouter from './routes/analytics';
import coachRouter from './routes/coach';
import { seed } from './seed';

const app = express();
const PORT = 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/sessions', sessionsRouter);
app.use('/api/checkins', checkinsRouter);
app.use('/api/profile', profileRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/coach', coachRouter);

seed();

app.listen(PORT, () => {
  console.log(`Training OS server running on http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('  Note: ANTHROPIC_API_KEY not set — AI coach disabled');
  }
});

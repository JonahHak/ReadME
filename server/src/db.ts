import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '../../training.db');

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY,
    goals TEXT NOT NULL DEFAULT 'explosiveness, functional strength, all-around elite athleticism for multi-sport',
    sports TEXT NOT NULL DEFAULT 'pickleball',
    days_per_week INTEGER NOT NULL DEFAULT 5,
    equipment TEXT NOT NULL DEFAULT 'full gym'
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('gym-strength','gym-power','conditioning','sport')),
    sport_name TEXT,
    duration_min INTEGER NOT NULL,
    rpe REAL NOT NULL CHECK(rpe >= 0 AND rpe <= 10),
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    movement_pattern TEXT NOT NULL CHECK(movement_pattern IN ('squat','hinge','push','pull','carry','jump','throw','sprint','other')),
    sets INTEGER NOT NULL,
    reps TEXT NOT NULL,
    load_kg REAL,
    notes TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    sleep_hours REAL NOT NULL,
    sleep_quality INTEGER NOT NULL CHECK(sleep_quality BETWEEN 1 AND 5),
    resting_hr INTEGER,
    hrv REAL,
    soreness INTEGER NOT NULL CHECK(soreness BETWEEN 1 AND 5),
    energy INTEGER NOT NULL CHECK(energy BETWEEN 1 AND 5),
    stress INTEGER NOT NULL CHECK(stress BETWEEN 1 AND 5),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

db.prepare(`INSERT OR IGNORE INTO profile (id, goals, sports, days_per_week, equipment)
  VALUES (1, 'explosiveness, functional strength, all-around elite athleticism for multi-sport', 'pickleball', 5, 'full gym')`).run();

export default db;

// Offline answers from data/exercises.json when the gateway is missing or fails.
import { readFileSync, existsSync } from 'node:fs';
import * as match from '../public/offline-match.js';

const file = new URL('../data/exercises.json', import.meta.url);
const DATA = existsSync(file)
  ? JSON.parse(readFileSync(file, 'utf8'))
  : { cards: [], pregame: [], sessions: [], morning5: null };

export const offlineCard = query => match.offlineCard(DATA, query);
export const offlinePregame = query => match.offlinePregame(DATA, query);
export const offlineSession = (query, toggles) => match.offlineSession(DATA, query, toggles);
export const offlineIndex = () => match.offlineIndex(DATA);
export const morning5 = () => DATA.morning5;

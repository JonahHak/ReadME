// Offline answers from data/exercises.json when the gateway is missing or fails.
import { readFileSync, existsSync } from 'node:fs';
import * as match from '../public/offline-match.js';

const load = (f, empty) => {
  const url = new URL(`../data/${f}`, import.meta.url);
  return existsSync(url) ? JSON.parse(readFileSync(url, 'utf8')) : empty;
};
const DATA = {
  ...load('exercises.json', { cards: [], pregame: [], sessions: [], morning5: null }),
  catalog: load('catalog.json', []),
  patterns: load('patterns.json', {}),
};

export const offlineCard = query => match.offlineCard(DATA, query);
export const offlinePregame = query => match.offlinePregame(DATA, query);
export const offlineSession = (query, toggles) => match.offlineSession(DATA, query, toggles);
export const planWorkout = (names, toggles) => match.planWorkout(DATA, names, toggles);
export const offlineIndex = () => match.offlineIndex(DATA);
export const morning5 = () => DATA.morning5;

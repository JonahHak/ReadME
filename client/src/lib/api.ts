import type { Session, CheckIn, Profile, AnalyticsLoad, Readiness, Recommendation, ChatMessage } from '../types';

async function req<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export const getSessions = () => req<Session[]>('/api/sessions');
export const getSession = (id: number) => req<Session>(`/api/sessions/${id}`);
export const postSession = (data: unknown) => req<Session>('/api/sessions', { method: 'POST', body: JSON.stringify(data) });
export const deleteSession = (id: number) => req<{ ok: boolean }>(`/api/sessions/${id}`, { method: 'DELETE' });

export const getCheckins = () => req<CheckIn[]>('/api/checkins');
export const getTodayCheckin = () => req<CheckIn | null>('/api/checkins/today');
export const postCheckin = (data: unknown) => req<CheckIn>('/api/checkins', { method: 'POST', body: JSON.stringify(data) });

export const getProfile = () => req<Profile>('/api/profile');
export const updateProfile = (data: unknown) => req<Profile>('/api/profile', { method: 'PUT', body: JSON.stringify(data) });

export const getAnalyticsLoad = () => req<AnalyticsLoad>('/api/analytics/load');
export const getReadiness = () => req<Readiness>('/api/analytics/readiness');
export const getRecommendation = () => req<Recommendation>('/api/analytics/recommendation');

export const postCoachChat = (messages: ChatMessage[], currentPlan?: unknown) =>
  req<{ text?: string; error?: string; message?: string }>('/api/coach/chat', {
    method: 'POST',
    body: JSON.stringify({ messages, context: { currentPlan } }),
  });

export const getDailyBriefing = () => req<{ text: string }>('/api/coach/briefing');

import { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, PlusCircle, ClipboardCheck, MessageSquare, History } from 'lucide-react';
import Dashboard from './components/Dashboard';
import SessionForm from './components/SessionForm';
import CheckInForm from './components/CheckInForm';
import CoachChat from './components/CoachChat';
import SessionLog from './components/SessionLog';
import { getAnalyticsLoad, getReadiness, getRecommendation, getTodayCheckin, getDailyBriefing } from './lib/api';
import type { LucideIcon } from 'lucide-react';
import type { AnalyticsLoad, Readiness, Recommendation, CheckIn } from './types';

type Tab = 'dashboard' | 'log' | 'checkin' | 'coach' | 'history';

const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'log', label: 'Log Session', icon: PlusCircle },
  { id: 'checkin', label: 'Check In', icon: ClipboardCheck },
  { id: 'coach', label: 'Coach', icon: MessageSquare },
  { id: 'history', label: 'History', icon: History },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [analytics, setAnalytics] = useState<AnalyticsLoad | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [todayCheckin, setTodayCheckin] = useState<CheckIn | null>(null);
  const [briefing, setBriefing] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [a, r, rec, ci, b] = await Promise.all([
        getAnalyticsLoad(),
        getReadiness(),
        getRecommendation(),
        getTodayCheckin(),
        getDailyBriefing(),
      ]);
      setAnalytics(a);
      setReadiness(r);
      setRecommendation(rec);
      setTodayCheckin(ci);
      setBriefing(b.text);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const onSessionLogged = () => { refresh(); setTab('dashboard'); };
  const onCheckinLogged = () => { refresh(); setTab('dashboard'); };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center font-bold text-sm">T</div>
          <span className="font-semibold text-gray-100 tracking-tight">Training OS</span>
        </div>
        <span className="text-xs text-gray-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
      </header>

      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 flex gap-1 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        {tab === 'dashboard' && (
          <Dashboard
            analytics={analytics}
            readiness={readiness}
            recommendation={recommendation}
            todayCheckin={todayCheckin}
            briefing={briefing}
            loading={loading}
            onLogSession={() => setTab('log')}
            onCheckIn={() => setTab('checkin')}
          />
        )}
        {tab === 'log' && <SessionForm recommendation={recommendation} onSaved={onSessionLogged} />}
        {tab === 'checkin' && <CheckInForm onSaved={onCheckinLogged} />}
        {tab === 'coach' && <CoachChat recommendation={recommendation} />}
        {tab === 'history' && <SessionLog onDeleted={refresh} />}
      </main>
    </div>
  );
}

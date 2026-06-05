import { Zap, TrendingUp, Minus, ChevronRight, Plus, ClipboardCheck } from 'lucide-react';
import ACWRGauge from './ACWRGauge';
import LoadChart from './LoadChart';
import type { AnalyticsLoad, Readiness, Recommendation, CheckIn } from '../types';

interface Props {
  analytics: AnalyticsLoad | null;
  readiness: Readiness | null;
  recommendation: Recommendation | null;
  todayCheckin: CheckIn | null;
  briefing: string;
  loading: boolean;
  onLogSession: () => void;
  onCheckIn: () => void;
}

const actionConfig = {
  push: { icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30', label: 'PUSH' },
  hold: { icon: Minus, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', label: 'HOLD' },
  deload: { icon: Zap, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/30', label: 'DELOAD' },
};

function ReadinessRing({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="96" height="96">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="#1f2937" strokeWidth="6" />
        <circle
          cx="48" cy="48" r={radius} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <span className="text-2xl font-bold tabular-nums" style={{ color }}>{score}</span>
    </div>
  );
}

const typeLabel: Record<string, string> = {
  'gym-strength': 'Strength',
  'gym-power': 'Power',
  'conditioning': 'Conditioning',
  'sport': 'Sport',
};

export default function Dashboard({ analytics, readiness, recommendation, todayCheckin, briefing, loading, onLogSession, onCheckIn }: Props) {
  const action = recommendation?.action ?? 'hold';
  const actionCfg = actionConfig[action];
  const ActionIcon = actionCfg.icon;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Briefing */}
      {briefing && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl px-5 py-3 text-sm text-gray-300 italic">
          "{briefing}"
        </div>
      )}

      {/* Top row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Readiness */}
        <div className="card p-5 flex flex-col items-center text-center">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-3">Readiness</div>
          <ReadinessRing score={readiness?.score ?? 0} />
          <div className="text-xs text-gray-400 mt-2 leading-snug">{readiness?.reason}</div>
          {!todayCheckin && (
            <button onClick={onCheckIn} className="mt-3 text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1">
              <ClipboardCheck size={12} /> Log check-in
            </button>
          )}
        </div>

        {/* ACWR */}
        <ACWRGauge analytics={analytics} />

        {/* Quick actions */}
        <div className="card p-5 flex flex-col gap-3">
          <div className="text-xs text-gray-400 uppercase tracking-wider">Quick Actions</div>
          <button
            onClick={onLogSession}
            className="flex items-center gap-2 w-full px-4 py-3 bg-sky-600 hover:bg-sky-500 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Log Session
          </button>
          <button
            onClick={onCheckIn}
            className="flex items-center gap-2 w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            <ClipboardCheck size={16} /> {todayCheckin ? 'Update Check-In' : 'Morning Check-In'}
          </button>
          {todayCheckin && (
            <div className="text-xs text-gray-500 grid grid-cols-3 gap-1 mt-1">
              <div className="bg-gray-800/60 rounded p-1.5 text-center"><div className="text-gray-400">Sleep</div><div className="font-medium text-white">{todayCheckin.sleep_hours}h</div></div>
              <div className="bg-gray-800/60 rounded p-1.5 text-center"><div className="text-gray-400">Energy</div><div className="font-medium text-white">{todayCheckin.energy}/5</div></div>
              <div className="bg-gray-800/60 rounded p-1.5 text-center"><div className="text-gray-400">Soreness</div><div className="font-medium text-white">{todayCheckin.soreness}/5</div></div>
            </div>
          )}
        </div>
      </div>

      {/* Recommended session */}
      {recommendation && (
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-bold ${actionCfg.bg} ${actionCfg.color}`}>
              <ActionIcon size={14} />
              {actionCfg.label}
            </div>
            <div className="text-sm font-semibold text-gray-200">
              {typeLabel[recommendation.sessionType] ?? recommendation.sessionType}
            </div>
            <div className="text-sm text-gray-400">— {recommendation.focus}</div>
          </div>

          {/* Warmup */}
          <div className="mb-4">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Warmup</div>
            <div className="flex flex-wrap gap-2">
              {recommendation.warmup.map((w, i) => (
                <span key={i} className="text-xs bg-gray-800 rounded px-2 py-1 text-gray-300">{w}</span>
              ))}
            </div>
          </div>

          {/* Exercises table */}
          <div className="mb-4 overflow-x-auto">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Exercises</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-800">
                  <th className="text-left py-1.5 pr-4">Exercise</th>
                  <th className="text-center py-1.5 pr-3">Sets</th>
                  <th className="text-center py-1.5 pr-3">Reps</th>
                  <th className="text-left py-1.5">Target</th>
                </tr>
              </thead>
              <tbody>
                {recommendation.exercises.map((ex, i) => (
                  <tr key={i} className="border-b border-gray-800/50 last:border-0">
                    <td className="py-2 pr-4">
                      <div className="font-medium text-gray-100">{ex.name}</div>
                      <div className="text-xs text-gray-500 capitalize">{ex.pattern}</div>
                    </td>
                    <td className="py-2 pr-3 text-center text-gray-200">{ex.sets}</td>
                    <td className="py-2 pr-3 text-center text-gray-200">{ex.reps}</td>
                    <td className="py-2 text-sky-400 text-xs">{ex.load_intent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Rationale */}
          <div className="bg-gray-800/40 rounded-lg px-4 py-3 text-xs text-gray-400 flex items-start gap-2">
            <ChevronRight size={14} className="text-gray-500 mt-0.5 shrink-0" />
            {recommendation.rationale}
          </div>

          <button
            onClick={onLogSession}
            className="mt-4 btn-primary text-sm w-full sm:w-auto"
          >
            Log This Session
          </button>
        </div>
      )}

      {/* Chart */}
      <LoadChart analytics={analytics} />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { format, parseISO, startOfWeek } from 'date-fns';
import toast from 'react-hot-toast';
import { getSessions, deleteSession } from '../lib/api';
import type { Session } from '../types';

interface Props { onDeleted: () => void; }

const typeBadge: Record<string, string> = {
  'gym-strength': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'gym-power': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  'conditioning': 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  'sport': 'bg-green-500/20 text-green-300 border-green-500/30',
};

const typeLabel: Record<string, string> = {
  'gym-strength': 'Strength',
  'gym-power': 'Power',
  'conditioning': 'Conditioning',
  'sport': 'Sport',
};

function rpeBar(rpe: number) {
  const color = rpe <= 5 ? '#22c55e' : rpe <= 7 ? '#eab308' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${rpe * 10}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-gray-400">{rpe}/10</span>
    </div>
  );
}

function SessionCard({ session, onDelete }: { session: Session; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card overflow-hidden">
      <div
        className="p-4 flex items-start gap-3 cursor-pointer hover:bg-gray-800/40 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded border ${typeBadge[session.type]}`}>
              {typeLabel[session.type]}{session.sport_name ? ` — ${session.sport_name}` : ''}
            </span>
            <span className="text-sm text-gray-200 font-medium">
              {format(parseISO(session.date), 'EEE, MMM d')}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>{session.duration_min} min</span>
            {rpeBar(session.rpe)}
            <span>{session.exercises.length} exercises</span>
          </div>
          {session.notes && <p className="text-xs text-gray-500 mt-1 truncate">{session.notes}</p>}
        </div>
        <div className="flex items-center gap-2">
          {expanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="text-gray-600 hover:text-red-400 transition-colors p-1"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {expanded && session.exercises.length > 0 && (
        <div className="border-t border-gray-800 px-4 pb-4 pt-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left py-1 pr-3">Exercise</th>
                <th className="text-center py-1 pr-2">Sets</th>
                <th className="text-center py-1 pr-2">Reps</th>
                <th className="text-left py-1">Load</th>
              </tr>
            </thead>
            <tbody>
              {session.exercises.map((ex, i) => (
                <tr key={i} className="border-b border-gray-800/40 last:border-0">
                  <td className="py-1.5 pr-3 text-gray-200">{ex.name} <span className="text-gray-600">({ex.movement_pattern})</span></td>
                  <td className="py-1.5 pr-2 text-center text-gray-300">{ex.sets}</td>
                  <td className="py-1.5 pr-2 text-center text-gray-300">{ex.reps}</td>
                  <td className="py-1.5 text-gray-400">{ex.load_kg ? `${ex.load_kg}kg` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function SessionLog({ onDeleted }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setSessions(await getSessions()); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this session?')) return;
    await deleteSession(id);
    toast.success('Session deleted');
    load();
    onDeleted();
  };

  if (loading) return <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" /></div>;

  // Group by week
  const byWeek: Record<string, Session[]> = {};
  for (const s of sessions) {
    const weekStart = format(startOfWeek(parseISO(s.date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    if (!byWeek[weekStart]) byWeek[weekStart] = [];
    byWeek[weekStart].push(s);
  }

  const weeks = Object.keys(byWeek).sort((a, b) => b.localeCompare(a));

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Session History</h2>
        <p className="text-sm text-gray-400">{sessions.length} sessions logged</p>
      </div>
      {weeks.map(week => (
        <div key={week}>
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
            Week of {format(parseISO(week), 'MMM d, yyyy')}
            <span className="ml-2 text-gray-600">· {byWeek[week].length} sessions</span>
          </div>
          <div className="space-y-2">
            {byWeek[week].map(s => (
              <SessionCard key={s.id} session={s} onDelete={() => handleDelete(s.id)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

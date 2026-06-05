import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { postSession } from '../lib/api';
import type { Recommendation } from '../types';

interface Props {
  recommendation: Recommendation | null;
  onSaved: () => void;
}

interface ExerciseEntry {
  name: string;
  movement_pattern: string;
  sets: number;
  reps: string;
  load_kg: string;
  notes: string;
}

const PATTERNS = ['squat', 'hinge', 'push', 'pull', 'carry', 'jump', 'throw', 'sprint', 'other'];
const SESSION_TYPES = [
  { value: 'gym-strength', label: 'Strength' },
  { value: 'gym-power', label: 'Power' },
  { value: 'conditioning', label: 'Conditioning' },
  { value: 'sport', label: 'Sport' },
];

function rpeColor(rpe: number): string {
  if (rpe <= 5) return '#22c55e';
  if (rpe <= 7) return '#eab308';
  if (rpe <= 9) return '#f97316';
  return '#ef4444';
}

export default function SessionForm({ recommendation, onSaved }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [type, setType] = useState<string>(recommendation?.sessionType ?? 'gym-strength');
  const [sportName, setSportName] = useState('pickleball');
  const [duration, setDuration] = useState(60);
  const [rpe, setRpe] = useState(7);
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<ExerciseEntry[]>(
    recommendation?.exercises.map(ex => ({
      name: ex.name,
      movement_pattern: ex.pattern,
      sets: ex.sets,
      reps: ex.reps,
      load_kg: '',
      notes: ex.notes,
    })) ?? [{ name: '', movement_pattern: 'squat', sets: 3, reps: '5', load_kg: '', notes: '' }]
  );
  const [saving, setSaving] = useState(false);

  const addExercise = () => setExercises(e => [...e, { name: '', movement_pattern: 'squat', sets: 3, reps: '5', load_kg: '', notes: '' }]);
  const removeExercise = (i: number) => setExercises(e => e.filter((_, idx) => idx !== i));
  const updateExercise = (i: number, field: keyof ExerciseEntry, value: string | number) =>
    setExercises(e => e.map((ex, idx) => idx === i ? { ...ex, [field]: value } : ex));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await postSession({
        date,
        type,
        sport_name: type === 'sport' ? sportName : undefined,
        duration_min: duration,
        rpe,
        notes,
        exercises: exercises.filter(ex => ex.name.trim()).map(ex => ({
          ...ex,
          load_kg: ex.load_kg ? Number(ex.load_kg) : null,
          sets: Number(ex.sets),
        })),
      });
      toast.success('Session logged!');
      onSaved();
    } catch {
      toast.error('Failed to save session');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-1">Log Session</h2>
      <p className="text-sm text-gray-400 mb-6">Record what you did today.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="card p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Duration (min)</label>
              <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} className="input" min={5} max={300} />
            </div>
          </div>

          <div>
            <label className="label">Session Type</label>
            <div className="flex gap-2 flex-wrap">
              {SESSION_TYPES.map(t => (
                <button
                  key={t.value} type="button"
                  onClick={() => setType(t.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    type === t.value
                      ? 'bg-sky-600 border-sky-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                  }`}
                >{t.label}</button>
              ))}
            </div>
          </div>

          {type === 'sport' && (
            <div>
              <label className="label">Sport Name</label>
              <input type="text" value={sportName} onChange={e => setSportName(e.target.value)} className="input" placeholder="e.g. pickleball" />
            </div>
          )}

          <div>
            <label className="label">RPE — Perceived Effort: <span className="font-bold" style={{ color: rpeColor(rpe) }}>{rpe}/10</span></label>
            <input
              type="range" min={0} max={10} step={0.5} value={rpe}
              onChange={e => setRpe(Number(e.target.value))}
              className="w-full accent-sky-500"
              style={{ accentColor: rpeColor(rpe) }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Rest</span><span>Easy</span><span>Moderate</span><span>Hard</span><span>Max</span>
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input" rows={2} placeholder="How'd it feel?" />
          </div>
        </div>

        {/* Exercises */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium text-gray-200">Exercises</div>
            <button type="button" onClick={addExercise} className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300">
              <Plus size={14} /> Add
            </button>
          </div>
          <div className="space-y-4">
            {exercises.map((ex, i) => (
              <div key={i} className="bg-gray-800/60 rounded-lg p-4 space-y-3">
                <div className="flex gap-3 items-start">
                  <div className="flex-1">
                    <label className="label">Exercise Name</label>
                    <input
                      type="text" value={ex.name}
                      onChange={e => updateExercise(i, 'name', e.target.value)}
                      className="input" placeholder="e.g. Back Squat"
                    />
                  </div>
                  <button type="button" onClick={() => removeExercise(i)} className="mt-5 text-gray-600 hover:text-red-400 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="label">Pattern</label>
                    <select value={ex.movement_pattern} onChange={e => updateExercise(i, 'movement_pattern', e.target.value)} className="input">
                      {PATTERNS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Sets</label>
                    <input type="number" value={ex.sets} onChange={e => updateExercise(i, 'sets', e.target.value)} className="input" min={1} />
                  </div>
                  <div>
                    <label className="label">Reps</label>
                    <input type="text" value={ex.reps} onChange={e => updateExercise(i, 'reps', e.target.value)} className="input" placeholder="5" />
                  </div>
                  <div>
                    <label className="label">Load (kg)</label>
                    <input type="number" value={ex.load_kg} onChange={e => updateExercise(i, 'load_kg', e.target.value)} className="input" placeholder="opt." />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full text-base py-3">
          {saving ? 'Saving...' : 'Log Session'}
        </button>
      </form>
    </div>
  );
}

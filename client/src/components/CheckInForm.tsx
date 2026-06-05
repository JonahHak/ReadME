import { useState } from 'react';
import toast from 'react-hot-toast';
import { postCheckin } from '../lib/api';

interface Props { onSaved: () => void; }

const energyEmoji = ['', '😴', '😕', '😐', '🙂', '⚡'];
const sorenessEmoji = ['', '✅', '🟡', '🟠', '🔴', '💀'];
const stressEmoji = ['', '😌', '🙂', '😐', '😬', '🤯'];
const qualityEmoji = ['', '😞', '😕', '😐', '😊', '😁'];

function Slider({ label, value, onChange, min, max, step = 1, emoji, unit }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number; emoji?: string; unit?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="flex-1 accent-sky-500"
        />
        <div className="w-16 text-right">
          <span className="font-bold text-gray-100">{value}{unit ?? ''}</span>
          {emoji && <span className="ml-1">{emoji}</span>}
        </div>
      </div>
    </div>
  );
}

export default function CheckInForm({ onSaved }: Props) {
  const [sleepHours, setSleepHours] = useState(7.5);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [soreness, setSoreness] = useState(2);
  const [energy, setEnergy] = useState(3);
  const [stress, setStress] = useState(2);
  const [restingHr, setRestingHr] = useState('');
  const [hrv, setHrv] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await postCheckin({
        sleep_hours: sleepHours,
        sleep_quality: sleepQuality,
        soreness,
        energy,
        stress,
        resting_hr: restingHr ? Number(restingHr) : undefined,
        hrv: hrv ? Number(hrv) : undefined,
      });
      toast.success('Check-in saved!');
      onSaved();
    } catch {
      toast.error('Failed to save check-in');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h2 className="text-xl font-semibold mb-1">Morning Check-In</h2>
      <p className="text-sm text-gray-400 mb-6">Quick daily readiness snapshot.</p>

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <Slider label="Sleep Hours" value={sleepHours} onChange={setSleepHours} min={3} max={12} step={0.5} unit="h" />
        <Slider label="Sleep Quality" value={sleepQuality} onChange={setSleepQuality} min={1} max={5} emoji={qualityEmoji[sleepQuality]} />
        <Slider label="Muscle Soreness" value={soreness} onChange={setSoreness} min={1} max={5} emoji={sorenessEmoji[soreness]} />
        <Slider label="Energy Level" value={energy} onChange={setEnergy} min={1} max={5} emoji={energyEmoji[energy]} />
        <Slider label="Stress Level" value={stress} onChange={setStress} min={1} max={5} emoji={stressEmoji[stress]} />

        <div className="border-t border-gray-800 pt-4">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-3">Optional Metrics</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Resting HR (bpm)</label>
              <input
                type="number" placeholder="e.g. 52"
                value={restingHr} onChange={e => setRestingHr(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">HRV (ms)</label>
              <input
                type="number" placeholder="e.g. 68"
                value={hrv} onChange={e => setHrv(e.target.value)}
                className="input"
              />
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? 'Saving...' : 'Save Check-In'}
        </button>
      </form>
    </div>
  );
}

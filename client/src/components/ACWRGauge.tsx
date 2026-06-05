import type { AnalyticsLoad } from '../types';

interface Props {
  analytics: AnalyticsLoad | null;
}

const bandConfig = {
  green: { color: '#22c55e', label: 'Optimal', bg: 'bg-green-500/10 border-green-500/20' },
  yellow: { color: '#eab308', label: 'Caution', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  red: { color: '#ef4444', label: 'High Risk', bg: 'bg-red-500/10 border-red-500/20' },
  undertrain: { color: '#6b7280', label: 'Undertrain', bg: 'bg-gray-500/10 border-gray-500/20' },
};

export default function ACWRGauge({ analytics }: Props) {
  const band = analytics?.band ?? 'undertrain';
  const acwr = analytics?.currentACWR ?? 1;
  const cfg = bandConfig[band];

  const clampedACWR = Math.max(0, Math.min(2, acwr));
  const pct = (clampedACWR / 2) * 100;

  const zones = [
    { start: 0, end: 40, color: '#6b7280' },
    { start: 40, end: 65, color: '#22c55e' },
    { start: 65, end: 75, color: '#eab308' },
    { start: 75, end: 100, color: '#ef4444' },
  ];

  return (
    <div className={`card p-5 border ${cfg.bg}`}>
      <div className="text-xs text-gray-400 uppercase tracking-wider mb-3">ACWR</div>
      <div className="flex items-end gap-3 mb-4">
        <span className="text-4xl font-bold tabular-nums" style={{ color: cfg.color }}>
          {acwr.toFixed(2)}
        </span>
        <span className="text-sm font-medium mb-1" style={{ color: cfg.color }}>{cfg.label}</span>
      </div>

      {/* Bar */}
      <div className="relative h-3 rounded-full overflow-hidden bg-gray-800 mb-2">
        {zones.map((z, i) => (
          <div
            key={i}
            className="absolute top-0 h-full"
            style={{ left: `${z.start}%`, width: `${z.end - z.start}%`, backgroundColor: z.color, opacity: 0.4 }}
          />
        ))}
        <div
          className="absolute top-0 h-full w-1 rounded-full bg-white shadow-lg transition-all duration-500"
          style={{ left: `calc(${pct}% - 2px)` }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-500">
        <span>0</span>
        <span>0.8</span>
        <span>1.3</span>
        <span>1.5</span>
        <span>2.0</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="bg-gray-800/60 rounded p-2">
          <div className="text-gray-400">Acute</div>
          <div className="font-semibold text-sky-400">{(analytics?.data?.at(-1)?.acuteLoad ?? 0).toFixed(0)}</div>
        </div>
        <div className="bg-gray-800/60 rounded p-2">
          <div className="text-gray-400">Chronic</div>
          <div className="font-semibold text-purple-400">{(analytics?.data?.at(-1)?.chronicLoad ?? 0).toFixed(0)}</div>
        </div>
      </div>
    </div>
  );
}

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import { format, parseISO } from 'date-fns';
import type { AnalyticsLoad } from '../types';

interface Props {
  analytics: AnalyticsLoad | null;
}

function acwrColor(acwr: number): string {
  if (acwr > 1.5) return '#ef4444';
  if (acwr > 1.3) return '#eab308';
  if (acwr >= 0.8) return '#22c55e';
  return '#6b7280';
}

const CustomDot = (props: { cx?: number; cy?: number; payload?: { acwr: number } }) => {
  const { cx, cy, payload } = props;
  if (!cx || !cy || !payload) return null;
  return <circle cx={cx} cy={cy} r={3} fill={acwrColor(payload.acwr)} stroke="none" />;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs shadow-xl">
      <div className="text-gray-400 mb-1">{label}</div>
      <div className="space-y-1">
        <div className="flex gap-2"><span className="text-gray-400">Load:</span><span className="text-white font-medium">{d?.dailyLoad ?? 0}</span></div>
        <div className="flex gap-2"><span className="text-sky-400">Acute:</span><span className="text-white">{d?.acuteLoad?.toFixed(0)}</span></div>
        <div className="flex gap-2"><span className="text-purple-400">Chronic:</span><span className="text-white">{d?.chronicLoad?.toFixed(0)}</span></div>
        <div className="flex gap-2"><span style={{ color: acwrColor(d?.acwr ?? 1) }}>ACWR:</span><span className="text-white font-bold">{d?.acwr?.toFixed(2)}</span></div>
      </div>
    </div>
  );
};

export default function LoadChart({ analytics }: Props) {
  const data = analytics?.data ?? [];
  const formatted = data.map(d => ({
    ...d,
    label: format(parseISO(d.date), 'MMM d'),
  }));

  return (
    <div className="card p-5">
      <div className="text-sm font-medium text-gray-200 mb-4">Training Load — 30 Days</div>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={formatted} margin={{ top: 5, right: 30, bottom: 5, left: 0 }}>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={4}
          />
          <YAxis
            yAxisId="load"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={45}
          />
          <YAxis
            yAxisId="acwr"
            orientation="right"
            domain={[0, 2]}
            tick={{ fill: '#6b7280', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={35}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, color: '#9ca3af' }}
            formatter={(value) => value === 'dailyLoad' ? 'Daily Load' : value === 'acuteLoad' ? 'Acute' : value === 'chronicLoad' ? 'Chronic' : 'ACWR'}
          />
          <ReferenceLine yAxisId="acwr" y={0.8} stroke="#6b7280" strokeDasharray="4 4" strokeOpacity={0.5} />
          <ReferenceLine yAxisId="acwr" y={1.3} stroke="#eab308" strokeDasharray="4 4" strokeOpacity={0.5} />
          <ReferenceLine yAxisId="acwr" y={1.5} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} />
          <Bar yAxisId="load" dataKey="dailyLoad" fill="#1e3a5f" radius={[2, 2, 0, 0]} maxBarSize={20} />
          <Line yAxisId="load" type="monotone" dataKey="acuteLoad" stroke="#38bdf8" strokeWidth={2} dot={false} />
          <Line yAxisId="load" type="monotone" dataKey="chronicLoad" stroke="#a78bfa" strokeWidth={2} dot={false} />
          <Line yAxisId="acwr" type="monotone" dataKey="acwr" strokeWidth={2} dot={<CustomDot />} stroke="#22c55e" />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-gray-500 inline-block"></span>0.8 undertrain</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-yellow-500 inline-block"></span>1.3 caution</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-500 inline-block"></span>1.5 danger</span>
      </div>
    </div>
  );
}

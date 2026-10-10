import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

interface AirQualityChartProps {
  hourlyPm25: number[];
  selectedHour: number;
  bestStartHour: number;
  onSelectHour: (hour: number) => void;
  title: string;
}

export const AirQualityChart: React.FC<AirQualityChartProps> = ({
  hourlyPm25,
  selectedHour,
  bestStartHour,
  onSelectHour,
  title,
}) => {
  const chartData = hourlyPm25.map((val, idx) => ({
    hour: idx,
    label: `${idx.toString().padStart(2, '0')}:00`,
    pm25: val,
    isBest: idx === bestStartHour,
    isSelected: idx === selectedHour,
  }));

  const getBarColor = (val: number) => {
    if (val <= 60) return '#16a34a'; // Green
    if (val <= 90) return '#d97706'; // Amber / Yellow
    return '#dc2626'; // Red
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
      <div className="flex flex-wrap items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          {title}
        </h3>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block"></span>
            &le;60 (Good)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
            61-90 (Moderate)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-600 inline-block"></span>
            &gt;90 (Poor)
          </span>
        </div>
      </div>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} onClick={(data) => {
            if (data && data.activePayload && data.activePayload.length > 0) {
              const h = data.activePayload[0].payload.hour;
              onSelectHour(h);
            }
          }}>
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} interval={2} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 'auto']} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-white p-2.5 rounded shadow-lg text-xs">
                      <p className="font-bold">{data.label}</p>
                      <p>PM2.5: <span className="font-mono font-bold">{data.pm25.toFixed(1)}</span> µg/m³</p>
                      {data.isBest && <p className="text-emerald-400 mt-1 font-semibold">★ Cleanest Hour</p>}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="pm25" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor(entry.pm25)}
                  stroke={entry.isSelected ? '#0f172a' : (entry.isBest ? '#15803d' : 'transparent')}
                  strokeWidth={entry.isSelected ? 2.5 : (entry.isBest ? 1.5 : 0)}
                  cursor="pointer"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 text-xs text-slate-500 text-center">
        Tip: Click any bar to adjust your intended walking hour. Starred bar is the cleanest predicted slot.
      </div>
    </div>
  );
};

import { useMemo } from 'react';

type BarChartProps = {
  data: { label: string; value: number; sublabel?: string }[];
  color?: string;
  emptyText?: string;
  valueFormat?: (v: number) => string;
};

export function HorizontalBarChart({
  data,
  color = '#C07E5A',
  emptyText = 'Belum ada data',
  valueFormat = (v) => String(v),
}: BarChartProps) {
  const maxValue = useMemo(() => Math.max(...data.map((d) => d.value), 1), [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-cafe-400 text-sm">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((d, i) => {
        const pct = (d.value / maxValue) * 100;
        return (
          <div key={i} className="animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-cafe-800 truncate pr-2">{d.label}</span>
              <span className="text-sm font-bold text-cafe-700 tabular-nums whitespace-nowrap">
                {valueFormat(d.value)}
              </span>
            </div>
            <div className="h-2.5 bg-cafe-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${color}aa, ${color})`,
                  animationDelay: `${i * 60}ms`,
                }}
              />
            </div>
            {d.sublabel && (
              <p className="text-xs text-cafe-400 mt-1">{d.sublabel}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

type LineChartProps = {
  data: { label: string; value: number }[];
  color?: string;
  emptyText?: string;
  valueFormat?: (v: number) => string;
};

export function LineChart({
  data,
  color = '#C07E5A',
  emptyText = 'Belum ada data',
  valueFormat = (v) => String(v),
}: LineChartProps) {
  const maxValue = useMemo(() => Math.max(...data.map((d) => d.value), 1), [data]);
  const minValue = 0;
  const range = maxValue - minValue || 1;
  const chartHeight = 180;
  const padding = { top: 20, bottom: 32, left: 8, right: 8 };
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const stepX = data.length > 1 ? 100 / (data.length - 1) : 0;

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-cafe-400 text-sm">
        {emptyText}
      </div>
    );
  }

  const points = data.map((d, i) => {
    const x = padding.left + i * stepX * ((100 - padding.left - padding.right) / 100);
    const y = padding.top + innerHeight - ((d.value - minValue) / range) * innerHeight;
    return { x, y, ...d };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + innerHeight} L ${points[0].x} ${padding.top + innerHeight} Z`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 100 ${chartHeight}`} preserveAspectRatio="none" className="w-full" style={{ height: chartHeight }}>
        <defs>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padding.top + innerHeight * (1 - t);
          return (
            <line
              key={t}
              x1={padding.left}
              y1={y}
              x2={100 - padding.right}
              y2={y}
              stroke="#F5E9DC"
              strokeWidth="0.3"
              strokeDasharray="0.5"
            />
          );
        })}
        <path d={areaD} fill="url(#lineGradient)" />
        <path d={pathD} fill="none" stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="1" fill={color} />
          </g>
        ))}
      </svg>
      <div className="flex justify-between mt-2 px-1">
        {data.map((d, i) => (
          <span key={i} className="text-[10px] text-cafe-400">{d.label}</span>
        ))}
      </div>
      <div className="flex justify-end mt-1">
        <span className="text-xs text-cafe-500">Tertinggi: {valueFormat(maxValue)}</span>
      </div>
    </div>
  );
}

import type { DayPoint } from "@/lib/progressAnalytics";

const LIME = "#a6ff00";

/** Vertical bars, one per day. Thin (<= 24px), 4px rounded tops, flat on the baseline. Values also live in `title`s. */
export function DailyBars({
  points,
  labelFor,
  highlightDate,
  ariaLabel,
  format,
}: {
  points: DayPoint[];
  /** Short label under a bar, or null for none. */
  labelFor: (point: DayPoint, index: number) => string | null;
  highlightDate?: string;
  ariaLabel: string;
  format: (value: number) => string;
}) {
  const max = Math.max(...points.map((point) => point.value), 1);

  return (
    <div role="img" aria-label={ariaLabel} className="flex h-28 items-stretch gap-[2px]">
      {points.map((point, index) => {
        const label = labelFor(point, index);
        return (
          <div key={point.date} title={`${point.date} · ${format(point.value)}`} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <div className="flex w-full flex-1 items-end justify-center">
              <div
                className="w-full max-w-6 rounded-t-[4px]"
                style={{
                  height: `${Math.max((point.value / max) * 100, point.value > 0 ? 4 : 0)}%`,
                  background: LIME,
                  opacity: point.value > 0 ? 1 : 0,
                }}
              />
              {point.value === 0 ? <div className="h-px w-full max-w-6 bg-white/[0.13]" /> : null}
            </div>
            <span
              className={`h-4 text-xs font-semibold ${point.date === highlightDate ? "text-white" : "text-white/60"}`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Ring showing one percentage; the number sits in the middle in text ink. */
export function Donut({ percent, ariaLabel }: { percent: number | null; ariaLabel: string }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const value = percent ?? 0;

  return (
    <div role="img" aria-label={ariaLabel} className="relative size-28 shrink-0">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="9" />
        {percent !== null ? (
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={LIME}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${(value / 100) * circumference} ${circumference}`}
          />
        ) : null}
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[28px] font-black">
        {percent === null ? "—" : `${percent}%`}
      </span>
    </div>
  );
}

/** One line of best weight per date: 2px stroke, 8px end dot with a surface ring, hairline grid. */
export function LineChart({
  points,
  ariaLabel,
  formatValue,
  formatDate,
}: {
  points: DayPoint[];
  ariaLabel: string;
  formatValue: (value: number) => string;
  formatDate: (date: string) => string;
}) {
  const width = 320;
  const height = 140;
  const padX = 8;
  const padTop = 12;
  const padBottom = 24;
  const values = points.map((point) => point.value);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = high - low || 1;
  const x = (index: number) => (points.length === 1 ? width / 2 : padX + (index / (points.length - 1)) * (width - padX * 2));
  const y = (value: number) => padTop + (1 - (value - low) / span) * (height - padTop - padBottom);
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index)} ${y(point.value)}`).join(" ");
  const last = points.length - 1;

  return (
    <svg role="img" aria-label={ariaLabel} viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
      {[padTop, height - padBottom].map((line) => (
        <line key={line} x1={0} x2={width} y1={line} y2={line} stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
      ))}
      <text x={width} y={padTop - 3} textAnchor="end" fontSize="11" fill="rgba(247,247,242,0.6)">
        {formatValue(high)}
      </text>
      {points.length > 1 ? (
        <path d={path} fill="none" stroke={LIME} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ) : null}
      {points.map((point, index) => (
        <g key={point.date}>
          <title>{`${formatDate(point.date)} · ${formatValue(point.value)}`}</title>
          <circle cx={x(index)} cy={y(point.value)} r={14} fill="transparent" />
          {index === last || points.length <= 12 ? (
            <circle
              cx={x(index)}
              cy={y(point.value)}
              r={index === last ? 5 : 4}
              fill={LIME}
              stroke="#020303"
              strokeWidth="2"
            />
          ) : null}
        </g>
      ))}
      <text x={padX} y={height - 6} fontSize="11" fill="rgba(247,247,242,0.6)">
        {formatDate(points[0].date)}
      </text>
      {points.length > 1 ? (
        <text x={width - padX} y={height - 6} textAnchor="end" fontSize="11" fill="rgba(247,247,242,0.6)">
          {formatDate(points[last].date)}
        </text>
      ) : null}
    </svg>
  );
}

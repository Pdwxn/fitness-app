"use client";

import { useEffect, useState } from "react";

import { useBodyVariant } from "@/hooks/useBodyVariant";
import { HEAT_LEVELS, heatLevel } from "@/lib/muscleMap";

import { loadBodyFigures, type BodyFigure, type BodyFigures, type BodyZone } from "./bodyShapes";

/** Gray (untrained) -> light yellow -> yellow -> orange -> red, in increasing intensity. */
const HEAT_COLORS = ["#FDE68A", "#FACC15", "#FB923C", "#EF4444"];
const UNTRAINED_FILL = "rgba(255,255,255,0.14)";

export function heatFill(level: number): string {
  if (level <= 0) return UNTRAINED_FILL;
  return HEAT_COLORS[Math.min(level, HEAT_COLORS.length) - 1];
}

function Figure({
  figure,
  sets,
  max,
  label,
  zoneLabel,
  setsLabel,
}: {
  figure: BodyFigure;
  sets: Partial<Record<BodyZone, number>>;
  max: number;
  label: string;
  zoneLabel: (zone: BodyZone) => string;
  setsLabel: (count: number) => string;
}) {
  return (
    <figure className="flex flex-col items-center gap-2">
      <svg viewBox={figure.viewBox} role="img" aria-label={label} className="h-auto w-full max-w-[150px]">
        <g fill="#141914" stroke="rgba(255,255,255,0.16)" strokeWidth="2" strokeLinejoin="round">
          {figure.inert.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        <g stroke="#020303" strokeWidth="2" strokeLinejoin="round">
          {figure.parts.map((part, partIndex) => {
            const count = sets[part.zone] ?? 0;
            const fill = heatFill(heatLevel(count, max));
            const title = `${zoneLabel(part.zone)} · ${setsLabel(count)}`;
            return (
              <g key={`${part.zone}-${partIndex}`} fill={fill}>
                {part.paths.map((d, pathIndex) => (
                  <path key={pathIndex} d={d}>
                    <title>{title}</title>
                  </path>
                ))}
              </g>
            );
          })}
        </g>
      </svg>
      <figcaption className="text-sm font-semibold text-white/60">{label}</figcaption>
    </figure>
  );
}

/** Front and back figures, each zone shaded by how many sets it got, plus a less-to-more key. */
export function MuscleMap({
  sets,
  frontLabel,
  backLabel,
  lessLabel,
  moreLabel,
  zoneLabel,
  setsLabel,
}: {
  sets: Partial<Record<BodyZone, number>>;
  frontLabel: string;
  backLabel: string;
  lessLabel: string;
  moreLabel: string;
  zoneLabel: (zone: BodyZone) => string;
  setsLabel: (count: number) => string;
}) {
  const gender = useBodyVariant();
  const [figures, setFigures] = useState<BodyFigures | null>(null);

  useEffect(() => {
    let alive = true;
    void loadBodyFigures().then((loaded) => {
      if (alive) setFigures(loaded);
    });
    return () => {
      alive = false;
    };
  }, []);

  const max = Math.max(0, ...Object.values(sets).map((value) => value ?? 0));

  if (!figures) {
    // Keeps the card's height stable while the ~95 KB geometry loads, so nothing below it jumps.
    return <div className="h-[260px] w-full animate-pulse rounded-2xl bg-white/[0.04]" aria-hidden="true" />;
  }

  const body = figures[gender];

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full justify-center gap-6">
        <Figure figure={body.front} sets={sets} max={max} label={frontLabel} zoneLabel={zoneLabel} setsLabel={setsLabel} />
        <Figure figure={body.back} sets={sets} max={max} label={backLabel} zoneLabel={zoneLabel} setsLabel={setsLabel} />
      </div>
      <div className="flex items-center gap-3 text-sm font-medium text-white/60" aria-hidden="true">
        <span>{lessLabel}</span>
        <span className="flex gap-1">
          {Array.from({ length: HEAT_LEVELS + 1 }, (_, level) => (
            <span key={level} className="size-4 rounded-[4px] border border-white/10" style={{ background: heatFill(level) }} />
          ))}
        </span>
        <span>{moreLabel}</span>
      </div>
    </div>
  );
}

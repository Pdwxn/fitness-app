import {
  BACK_SHAPES,
  BODY_CENTER,
  BODY_CENTER_PARTS,
  BODY_SIDE_PARTS,
  BODY_VIEWBOX,
  FRONT_SHAPES,
  type BodyShape,
  type BodyZone,
} from "./bodyShapes";
import { HEAT_LEVELS, heatLevel } from "@/lib/muscleMap";

const MIRROR = `translate(${BODY_CENTER * 2} 0) scale(-1 1)`;

/** One step of the lime scale; 0 is the unworked base tone. */
export function heatFill(level: number): string {
  return level === 0 ? "rgba(255,255,255,0.05)" : `rgba(166,255,0,${(0.2 + (level / HEAT_LEVELS) * 0.75).toFixed(2)})`;
}

function Figure({
  shapes,
  sets,
  max,
  label,
  zoneLabel,
  setsLabel,
}: {
  shapes: BodyShape[];
  sets: Partial<Record<BodyZone, number>>;
  max: number;
  label: string;
  zoneLabel: (zone: BodyZone) => string;
  setsLabel: (count: number) => string;
}) {
  return (
    <figure className="flex flex-col items-center gap-2">
      <svg viewBox={BODY_VIEWBOX} role="img" aria-label={label} className="h-auto w-full max-w-[150px]">
        <g fill="#141914" stroke="rgba(255,255,255,0.16)" strokeWidth="1" strokeLinejoin="round">
          {BODY_CENTER_PARTS.map((d) => (
            <path key={d} d={d} />
          ))}
          {BODY_SIDE_PARTS.map((d) => (
            <g key={d}>
              <path d={d} />
              <path d={d} transform={MIRROR} />
            </g>
          ))}
        </g>
        <g stroke="#020303" strokeWidth="1.5" strokeLinejoin="round">
          {shapes.map((shape) => {
            const count = sets[shape.zone] ?? 0;
            const fill = heatFill(heatLevel(count, max));
            const title = `${zoneLabel(shape.zone)} · ${setsLabel(count)}`;
            return (
              <g key={shape.zone} fill={fill}>
                <path d={shape.d}>
                  <title>{title}</title>
                </path>
                {shape.mirror ? (
                  <path d={shape.d} transform={MIRROR}>
                    <title>{title}</title>
                  </path>
                ) : null}
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
  const max = Math.max(0, ...Object.values(sets).map((value) => value ?? 0));

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full justify-center gap-6">
        <Figure shapes={FRONT_SHAPES} sets={sets} max={max} label={frontLabel} zoneLabel={zoneLabel} setsLabel={setsLabel} />
        <Figure shapes={BACK_SHAPES} sets={sets} max={max} label={backLabel} zoneLabel={zoneLabel} setsLabel={setsLabel} />
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

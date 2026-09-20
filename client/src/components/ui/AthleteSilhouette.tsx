import { useId } from "react";

/** Decorative athlete silhouette, purely visual (aria-hidden) -- echoes the design's hero artwork without a real photo asset. */
export function AthleteSilhouette({ className }: { className?: string }) {
  const id = useId();
  const fill = `${id}-fill`;
  const stroke = `${id}-stroke`;

  return (
    <svg aria-hidden="true" viewBox="0 0 300 340" fill="none" className={className}>
      <defs>
        <linearGradient id={fill} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a201a" />
          <stop offset="1" stopColor="#050605" />
        </linearGradient>
        <linearGradient id={stroke} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#a6ff00" stopOpacity="0.85" />
          <stop offset="0.6" stopColor="#a6ff00" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <ellipse cx="150" cy="82" rx="38" ry="47" fill={`url(#${fill})`} stroke={`url(#${stroke})`} strokeWidth="2" />
      <path d="M132 122 L132 150 Q150 160 168 150 L168 122 Z" fill={`url(#${fill})`} />
      <path
        d="M104 160 Q150 176 196 160 Q258 170 284 230 L300 340 L0 340 L16 230 Q42 170 104 160 Z"
        fill={`url(#${fill})`}
        stroke={`url(#${stroke})`}
        strokeWidth="2"
      />
    </svg>
  );
}

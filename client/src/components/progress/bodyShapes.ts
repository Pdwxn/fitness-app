export type BodyZone =
  | "chest"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "abs"
  | "back"
  | "glutes"
  | "quads"
  | "hamstrings"
  | "calves";

export type BodyShape = { zone: BodyZone; d: string; /** Also drawn mirrored on the right side. */ mirror: boolean };

/** viewBox of the figures below; the body is symmetric about x = 100. */
export const BODY_VIEWBOX = "0 0 200 420";
export const BODY_CENTER = 100;

/** The plain silhouette (head, torso, one arm and one leg; the arm and leg are mirrored). */
export const BODY_CENTER_PARTS = [
  "M100 14 A18 18 0 1 1 99.9 14Z",
  "M89 48 L111 48 L113 68 L87 68Z",
  "M65 70 Q100 58 135 70 Q142 112 134 150 Q130 180 128 206 Q132 222 134 236 L66 236 Q68 222 72 206 Q70 180 66 150 Q58 112 65 70Z",
];
export const BODY_SIDE_PARTS = [
  "M64 74 Q46 78 44 100 L41 142 Q41 150 49 152 L59 148 L61 100 Q63 86 64 74Z",
  "M41 152 L33 212 Q32 220 40 222 L52 218 L59 150Z",
  "M33 220 A8 11 0 1 0 33.1 220Z",
  "M68 238 Q84 232 97 240 L95 318 Q82 324 68 318 Q64 278 68 238Z",
  "M70 322 Q85 318 96 324 Q98 352 92 376 Q88 392 80 394 Q72 392 70 376 Q66 352 70 322Z",
  "M69 394 A13 6.5 0 1 0 69.1 394Z",
];

const SHOULDER = "M62 76 Q46 80 44 99 Q53 105 61 100 Q65 88 62 76Z";
const UPPER_ARM = "M50 102 Q58 102 58 126 Q58 146 50 148 Q42 146 42 126 Q42 102 50 102Z";
const FOREARM = "M44 160 Q52 160 52 186 Q52 208 44 212 Q36 208 36 186 Q36 160 44 160Z";
const CALF = "M72 326 Q85 322 93 328 Q95 352 90 374 Q86 388 80 390 Q74 388 72 374 Q68 352 72 326Z";

export const FRONT_SHAPES: BodyShape[] = [
  { zone: "shoulders", d: SHOULDER, mirror: true },
  { zone: "chest", d: "M68 78 Q86 70 99 80 L99 118 Q89 126 76 120 Q66 104 68 78Z", mirror: true },
  { zone: "abs", d: "M85 126 L115 126 L112 198 Q100 206 88 198Z", mirror: false },
  { zone: "biceps", d: UPPER_ARM, mirror: true },
  { zone: "forearms", d: FOREARM, mirror: true },
  { zone: "quads", d: "M71 242 Q84 236 95 244 L93 314 Q80 320 71 314 Q67 280 71 242Z", mirror: true },
  { zone: "calves", d: CALF, mirror: true },
];

export const BACK_SHAPES: BodyShape[] = [
  { zone: "shoulders", d: SHOULDER, mirror: true },
  { zone: "back", d: "M66 70 Q100 60 134 70 L137 106 Q135 152 126 180 L120 200 L80 200 L74 180 Q65 152 63 106Z", mirror: false },
  { zone: "triceps", d: UPPER_ARM, mirror: true },
  { zone: "forearms", d: FOREARM, mirror: true },
  { zone: "glutes", d: "M70 206 Q85 198 98 208 Q100 226 96 240 Q84 248 70 240 Q66 224 70 206Z", mirror: true },
  { zone: "hamstrings", d: "M72 250 L97 250 L94 316 Q82 322 72 316 Q68 284 72 250Z", mirror: true },
  { zone: "calves", d: CALF, mirror: true },
];

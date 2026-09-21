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
  "M100 12 A16 16 0 1 1 99.9 12Z",
  "M92 40 L108 40 L110 58 L90 58Z",
  "M64 66 Q100 56 136 66 Q140 100 132 140 Q128 176 126 200 Q130 218 132 232 L68 232 Q70 218 74 200 Q72 176 68 140 Q60 100 64 66Z",
];
export const BODY_SIDE_PARTS = [
  "M62 72 Q48 74 46 92 L42 152 L58 154 L64 100Z",
  "M42 154 L34 214 L46 218 L58 156Z",
  "M40 216 A7 10 0 1 0 40.1 216Z",
  "M72 228 L99 230 L97 322 L77 324 Q69 280 72 228Z",
  "M77 324 L97 324 L93 402 L80 404Z",
  "M80 404 A11 5 0 1 0 80.1 404Z",
];

const SHOULDER = "M62 70 Q46 74 46 98 Q55 102 63 97 Q67 82 62 70Z";
const ARM = "M52 100 Q60 100 60 124 Q60 146 52 148 Q44 146 44 124 Q44 100 52 100Z";
const FOREARM = "M46 160 Q54 160 54 184 Q54 208 46 212 Q38 208 38 184 Q38 160 46 160Z";
const CALF = "M79 330 L95 330 L92 388 L83 390Z";

export const FRONT_SHAPES: BodyShape[] = [
  { zone: "shoulders", d: SHOULDER, mirror: true },
  { zone: "chest", d: "M66 76 Q84 70 98 80 L98 118 Q80 124 68 112 Q62 94 66 76Z", mirror: true },
  { zone: "abs", d: "M85 128 L115 128 L114 196 Q100 202 86 196Z", mirror: false },
  { zone: "biceps", d: ARM, mirror: true },
  { zone: "forearms", d: FOREARM, mirror: true },
  { zone: "quads", d: "M74 236 Q88 230 98 236 L96 314 L78 316 Q71 282 74 236Z", mirror: true },
  { zone: "calves", d: CALF, mirror: true },
];

export const BACK_SHAPES: BodyShape[] = [
  { zone: "shoulders", d: SHOULDER, mirror: true },
  { zone: "back", d: "M68 68 Q100 60 132 68 L135 102 Q133 150 124 176 L118 196 L82 196 L76 176 Q67 150 65 102Z", mirror: false },
  { zone: "triceps", d: ARM, mirror: true },
  { zone: "forearms", d: FOREARM, mirror: true },
  { zone: "glutes", d: "M72 204 Q86 198 99 208 L99 240 Q84 246 72 236Z", mirror: true },
  { zone: "hamstrings", d: "M74 248 L98 248 L96 316 L78 318 Q71 284 74 248Z", mirror: true },
  { zone: "calves", d: CALF, mirror: true },
];

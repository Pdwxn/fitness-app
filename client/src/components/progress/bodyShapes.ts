// Body geometry for the muscle map. See NOTICE_bodyData.md for where
// bodyData.json comes from and its license (MIT, Melih Colpan's MuscleMap).

/** The 18 "whole muscle" groups the exercise dataset can resolve to -- see NOTICE_bodyData.md. */
export type BodyZone =
  | "trapezius"
  | "deltoids"
  | "chest"
  | "upperBack"
  | "serratus"
  | "biceps"
  | "triceps"
  | "forearms"
  | "abs"
  | "obliques"
  | "lowerBack"
  | "glutes"
  | "quads"
  | "hamstrings"
  | "adductors"
  | "hipFlexors"
  | "calves"
  | "tibialis";

export type BodyGender = "male" | "female";
export type BodyView = "front" | "back";

export type BodyPart = { zone: BodyZone; paths: string[] };

export type BodyFigure = {
  viewBox: string;
  /** Silhouette only (head, hair, neck, hands, feet, knees, ankles) -- never shaded. */
  inert: string[];
  /** One entry per muscle actually drawn in this view; not every zone has both a front and a back. */
  parts: BodyPart[];
};

export type BodyFigures = Record<BodyGender, Record<BodyView, BodyFigure>>;

let cache: BodyFigures | null = null;
let pending: Promise<BodyFigures> | null = null;

/**
 * Loads the body geometry (~95 KB of SVG path data) on first use instead of
 * shipping it in the main bundle -- only the Progress screen ever needs it.
 * Cached at module scope so mounting the map more than once (front/back
 * figures, or revisiting the screen) doesn't re-fetch.
 */
export function loadBodyFigures(): Promise<BodyFigures> {
  if (cache) return Promise.resolve(cache);
  pending ??= import("./bodyData.json").then((mod) => (cache = mod.default as unknown as BodyFigures));
  return pending;
}

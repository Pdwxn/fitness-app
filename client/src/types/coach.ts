import type { Routine } from "@/types/routine";

/** Mirrors `RoutineEditProposal.changes` items, as normalized by the backend validator. */
export type CoachChange =
  | {
      type: "adjust_load";
      day_number: number;
      exercise_name: string;
      exercise_id: string;
      weight_change_percent?: number;
      sets_delta?: number;
      reps?: string;
      rest_seconds?: number;
      why: string;
    }
  | {
      type: "substitute_exercise";
      day_number: number;
      exercise_name: string;
      exercise_id: string;
      new_exercise: { name: string; muscle_group: string; external_id: string; search_term: string };
      why: string;
    }
  | {
      type: "add_exercise";
      day_number: number;
      exercise: {
        name: string;
        muscle_group: string;
        external_id: string;
        search_term: string;
        sets: number;
        reps: string;
        weight_kg: number | null;
        rest_seconds: number | null;
      };
      why: string;
    }
  | {
      type: "remove_exercise";
      day_number: number;
      exercise_name: string;
      exercise_id: string;
      why: string;
    };

export type RoutineEditProposal = {
  id: string;
  routine: string;
  status: "pending" | "approved" | "rejected";
  target_month: number;
  target_year: number;
  summary: string;
  changes: CoachChange[];
  created_at: string;
  decided_at: string | null;
};

/** Small pointer the backend attaches to a log-sync response when the coach kicks in. */
export type NextProposalInfo = { id: string; target_month: number; target_year: number };

export type ApproveResult = Routine;

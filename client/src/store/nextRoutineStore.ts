import { create } from "zustand";

import type { NextProposalInfo } from "@/types/coach";

export type NextRoutineInfo = { id: string; month: number; year: number } | null;

type NextRoutineState = {
  nextRoutine: NextRoutineInfo;
  setNextRoutine: (info: NextRoutineInfo) => void;
  clearNextRoutine: () => void;
  /** Set when a log sync made the AI coach prepare edits for the user to review. */
  nextProposal: NextProposalInfo | null;
  setNextProposal: (info: NextProposalInfo | null) => void;
  clearNextProposal: () => void;
};

export const useNextRoutineStore = create<NextRoutineState>((set) => ({
  nextRoutine: null,
  setNextRoutine: (info) => set({ nextRoutine: info }),
  clearNextRoutine: () => set({ nextRoutine: null }),
  nextProposal: null,
  setNextProposal: (info) => set({ nextProposal: info }),
  clearNextProposal: () => set({ nextProposal: null }),
}));

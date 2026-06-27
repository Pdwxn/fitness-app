import { create } from "zustand";

export type NextRoutineInfo = { id: string; month: number; year: number } | null;

type NextRoutineState = {
  nextRoutine: NextRoutineInfo;
  setNextRoutine: (info: NextRoutineInfo) => void;
  clearNextRoutine: () => void;
};

export const useNextRoutineStore = create<NextRoutineState>((set) => ({
  nextRoutine: null,
  setNextRoutine: (info) => set({ nextRoutine: info }),
  clearNextRoutine: () => set({ nextRoutine: null }),
}));

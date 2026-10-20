import { create } from "zustand";

type SyncIssuesState = {
  /**
   * How many offline logs got dropped because the server will never accept
   * them again (e.g. the routine day they point to no longer exists). Not the
   * logs themselves -- just enough for a watcher to tell the user once.
   */
  droppedLogCount: number;
  reportDroppedLog: () => void;
  clearDroppedLogs: () => void;
};

export const useSyncIssuesStore = create<SyncIssuesState>((set) => ({
  droppedLogCount: 0,
  reportDroppedLog: () => set((state) => ({ droppedLogCount: state.droppedLogCount + 1 })),
  clearDroppedLogs: () => set({ droppedLogCount: 0 }),
}));

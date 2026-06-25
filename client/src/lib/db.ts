import Dexie, { type EntityTable } from "dexie";
import type { DailyLog } from "@/types/progress";
import type { RoutineCache } from "@/types/routine";

export interface PendingSyncItem {
  id: string;
  log: DailyLog;
  createdAt: string;
}

export interface StatsEntry {
  id: string;
  completed_days: number;
  total_exercises_completed: number;
  pending_sync: number;
}

export class ApexFitDB extends Dexie {
  routineCache!: EntityTable<RoutineCache, "id">;
  dailyLogs!: EntityTable<DailyLog, "id">;
  pendingSync!: EntityTable<PendingSyncItem, "id">;
  stats!: EntityTable<StatsEntry, "id">;

  constructor() {
    super("apex-fit");
    this.version(1).stores({
      routineCache: "&id",
      dailyLogs: "&id, routine_day_id, date, [routine_day_id+date]",
      pendingSync: "&id, createdAt",
      stats: "&id",
    });
  }
}

export const db = new ApexFitDB();

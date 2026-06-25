export const queryKeys = {
  routine: {
    all: ["routine"] as const,
    active: () => [...queryKeys.routine.all, "active"] as const,
    day: (dayId: string) => [...queryKeys.routine.all, "day", dayId] as const,
  },
  progress: {
    all: ["progress"] as const,
    logs: (routineDayId?: string) =>
      routineDayId ? [...queryKeys.progress.all, "logs", routineDayId] as const : [...queryKeys.progress.all, "logs"] as const,
    stats: () => [...queryKeys.progress.all, "stats"] as const,
  },
  onboarding: {
    status: () => ["onboarding", "status"] as const,
  },
  profile: {
    all: ["profile"] as const,
    main: () => [...queryKeys.profile.all, "main"] as const,
    health: () => [...queryKeys.profile.all, "health"] as const,
  },
};

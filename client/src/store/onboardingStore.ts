import { create } from "zustand";

import { getFromStorage, removeFromStorage, setInStorage, STORAGE_KEYS } from "@/lib/storage";
import type {
  OnboardingDraft,
  OnboardingHealth,
  OnboardingPayload,
  OnboardingProfile,
} from "@/types/onboarding";

const TOTAL_STEPS = 6;

const defaultData: OnboardingPayload = {
  profile: {
    full_name: "",
    gender: "",
    age: null,
    weight_kg: null,
    height_cm: null,
    preferred_language: "es",
    preferred_units: "metric",
  },
  health: {
    activity_level: "",
    physical_goals: [],
    specific_goal: "",
    injuries: [],
    equipment_type: "",
    available_equipment: [],
    routine_type: "",
  },
};

type OnboardingState = {
  currentStep: number;
  data: OnboardingPayload;
  setStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  updateProfile: (profile: Partial<OnboardingProfile>) => void;
  updateHealth: (health: Partial<OnboardingHealth>) => void;
  hydrateFromStorage: () => void;
  saveToStorage: () => void;
  clearStorage: () => void;
  reset: () => void;
};

function clampStep(step: number) {
  return Math.min(Math.max(step, 1), TOTAL_STEPS);
}

function buildDraft(currentStep: number, data: OnboardingPayload): OnboardingDraft {
  return { currentStep, ...data };
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  currentStep: 1,
  data: defaultData,

  setStep: (step) => {
    set({ currentStep: clampStep(step) });
    get().saveToStorage();
  },

  nextStep: () => {
    set((state) => ({ currentStep: clampStep(state.currentStep + 1) }));
    get().saveToStorage();
  },

  previousStep: () => {
    set((state) => ({ currentStep: clampStep(state.currentStep - 1) }));
    get().saveToStorage();
  },

  updateProfile: (profile) => {
    set((state) => ({
      data: {
        ...state.data,
        profile: { ...state.data.profile, ...profile },
      },
    }));
    get().saveToStorage();
  },

  updateHealth: (health) => {
    set((state) => ({
      data: {
        ...state.data,
        health: { ...state.data.health, ...health },
      },
    }));
    get().saveToStorage();
  },

  hydrateFromStorage: () => {
    const draft = getFromStorage<OnboardingDraft>(STORAGE_KEYS.ONBOARDING_DRAFT);
    if (!draft) return;

    set({
      currentStep: clampStep(draft.currentStep),
      data: {
        profile: { ...defaultData.profile, ...draft.profile },
        health: { ...defaultData.health, ...draft.health },
      },
    });
  },

  saveToStorage: () => {
    const { currentStep, data } = get();
    setInStorage(STORAGE_KEYS.ONBOARDING_DRAFT, buildDraft(currentStep, data));
  },

  clearStorage: () => {
    removeFromStorage(STORAGE_KEYS.ONBOARDING_DRAFT);
  },

  reset: () => {
    set({ currentStep: 1, data: defaultData });
    removeFromStorage(STORAGE_KEYS.ONBOARDING_DRAFT);
  },
}));

export { TOTAL_STEPS };

import { create } from "zustand";

import type { AccessibilityPreferences } from "@/types";

interface AccessibilityStore extends AccessibilityPreferences {
  setHighContrast: (enabled: boolean) => void;
  setLargeText: (enabled: boolean) => void;
  setSimpleMode: (enabled: boolean) => void;
  resetAccessibilityPreferences: () => void;
}

const initialPreferences: AccessibilityPreferences = {
  highContrast: false,
  largeText: false,
  simpleMode: false,
};

export const useAccessibilityStore = create<AccessibilityStore>((set) => ({
  ...initialPreferences,
  setHighContrast: (highContrast) => set({ highContrast }),
  setLargeText: (largeText) => set({ largeText }),
  setSimpleMode: (simpleMode) => set({ simpleMode }),
  resetAccessibilityPreferences: () => set(initialPreferences),
}));

import { create } from "zustand";

import type { AccessibilityPreferences } from "@/types";

interface AccessibilityStore extends AccessibilityPreferences {
  hydrateAccessibilityPreferences: () => void;
  setHighContrast: (enabled: boolean) => void;
  setLargeText: (enabled: boolean) => void;
  setSimpleMode: (enabled: boolean) => void;
  resetAccessibilityPreferences: () => void;
}

const ACCESSIBILITY_PREFERENCES_STORAGE_KEY =
  "movi.accessibility-preferences";

const initialPreferences: AccessibilityPreferences = {
  highContrast: false,
  largeText: false,
  simpleMode: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAccessibilityPreferences(
  value: unknown,
): value is AccessibilityPreferences {
  if (!isRecord(value)) return false;

  return (
    Object.keys(value).length === 3 &&
    typeof value.highContrast === "boolean" &&
    typeof value.largeText === "boolean" &&
    typeof value.simpleMode === "boolean"
  );
}

function readAccessibilityPreferences(): AccessibilityPreferences {
  if (typeof window === "undefined") return initialPreferences;

  try {
    const storedValue = window.localStorage.getItem(
      ACCESSIBILITY_PREFERENCES_STORAGE_KEY,
    );
    if (!storedValue) return initialPreferences;

    const parsedValue: unknown = JSON.parse(storedValue);
    if (isAccessibilityPreferences(parsedValue)) return parsedValue;

    window.localStorage.removeItem(ACCESSIBILITY_PREFERENCES_STORAGE_KEY);
    return initialPreferences;
  } catch {
    removeStoredAccessibilityPreferences();
    return initialPreferences;
  }
}

function storeAccessibilityPreferences(
  preferences: AccessibilityPreferences,
): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      ACCESSIBILITY_PREFERENCES_STORAGE_KEY,
      JSON.stringify(preferences),
    );
  } catch {
    // 저장소를 사용할 수 없어도 현재 탭의 접근성 설정은 유지한다.
  }
}

function removeStoredAccessibilityPreferences(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(ACCESSIBILITY_PREFERENCES_STORAGE_KEY);
  } catch {
    // 저장소를 사용할 수 없어도 현재 탭의 설정은 초기화한다.
  }
}

export const useAccessibilityStore = create<AccessibilityStore>((set) => ({
  ...initialPreferences,
  hydrateAccessibilityPreferences: () =>
    set(readAccessibilityPreferences()),
  setHighContrast: (highContrast) =>
    set((state) => {
      const preferences = {
        highContrast,
        largeText: state.largeText,
        simpleMode: state.simpleMode,
      };
      storeAccessibilityPreferences(preferences);
      return preferences;
    }),
  setLargeText: (largeText) =>
    set((state) => {
      const preferences = {
        highContrast: state.highContrast,
        largeText,
        simpleMode: state.simpleMode,
      };
      storeAccessibilityPreferences(preferences);
      return preferences;
    }),
  setSimpleMode: (simpleMode) =>
    set((state) => {
      const preferences = {
        highContrast: state.highContrast,
        largeText: state.largeText,
        simpleMode,
      };
      storeAccessibilityPreferences(preferences);
      return preferences;
    }),
  resetAccessibilityPreferences: () => {
    removeStoredAccessibilityPreferences();
    set(initialPreferences);
  },
}));

export { ACCESSIBILITY_PREFERENCES_STORAGE_KEY };

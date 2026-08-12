"use client";

import { useAccessibilityStore } from "@/store/useAccessibilityStore";

export function HighContrastToggle() {
  const highContrast = useAccessibilityStore((state) => state.highContrast);
  const setHighContrast = useAccessibilityStore(
    (state) => state.setHighContrast,
  );

  return (
    <button
      type="button"
      aria-pressed={highContrast}
      onClick={() => setHighContrast(!highContrast)}
      className="min-h-11 rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 font-semibold text-[var(--color-text)] hover:border-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
    >
      고대비 {highContrast ? "끄기" : "켜기"}
    </button>
  );
}

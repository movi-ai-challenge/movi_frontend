"use client";

import { useAccessibilityStore } from "@/store/useAccessibilityStore";

export function LargeTextToggle() {
  const largeText = useAccessibilityStore((state) => state.largeText);
  const setLargeText = useAccessibilityStore((state) => state.setLargeText);

  return (
    <button
      type="button"
      aria-pressed={largeText}
      onClick={() => setLargeText(!largeText)}
      className="min-h-11 rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 font-semibold text-[var(--color-text)] hover:border-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
    >
      큰 글씨 {largeText ? "끄기" : "켜기"}
    </button>
  );
}

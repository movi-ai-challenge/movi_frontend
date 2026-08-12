"use client";

import { useAccessibilityStore } from "@/store/useAccessibilityStore";

export function AccessibilitySettingsPanel() {
  const highContrast = useAccessibilityStore((state) => state.highContrast);
  const largeText = useAccessibilityStore((state) => state.largeText);
  const setHighContrast = useAccessibilityStore(
    (state) => state.setHighContrast,
  );
  const setLargeText = useAccessibilityStore((state) => state.setLargeText);

  return (
    <section
      className="accessibility-settings-shell"
      aria-labelledby="display-settings-title"
    >
      <fieldset className="accessibility-settings-panel">
        <legend
          id="display-settings-title"
          className="text-xl font-bold text-[var(--color-text)]"
        >
          화면 보기 설정
        </legend>
        <p
          id="display-settings-description"
          className="mt-2 text-base leading-7 text-[var(--color-text-muted)]"
        >
          글씨와 화면 색상을 보기 편하게 바꿀 수 있어요.
        </p>

        <div
          className="mt-4 grid gap-3 sm:grid-cols-2"
          aria-describedby="display-settings-description"
        >
          <label className="accessibility-setting-option">
            <span>
              <span className="block font-bold">고대비로 보기</span>
              <span className="mt-1 block text-sm text-[var(--color-text-muted)]">
                글자와 배경의 차이를 크게 합니다.
              </span>
            </span>
            <input
              type="checkbox"
              checked={highContrast}
              onChange={(event) => setHighContrast(event.target.checked)}
              className="h-7 w-7 shrink-0 accent-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
            />
          </label>

          <label className="accessibility-setting-option">
            <span>
              <span className="block font-bold">글씨 크게 보기</span>
              <span className="mt-1 block text-sm text-[var(--color-text-muted)]">
                화면의 글씨와 조작 요소를 키웁니다.
              </span>
            </span>
            <input
              type="checkbox"
              checked={largeText}
              onChange={(event) => setLargeText(event.target.checked)}
              className="h-7 w-7 shrink-0 accent-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
            />
          </label>
        </div>
      </fieldset>
    </section>
  );
}

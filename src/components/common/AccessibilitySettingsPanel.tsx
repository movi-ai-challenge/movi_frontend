"use client";

import type { ReactNode } from "react";

import { useAccessibilityStore } from "@/store/useAccessibilityStore";

/**
 * 화면 보기 설정 (명세 11.1 고대비 / 11.2 큰 글씨 / 11.6 단순 화면)
 *
 * 목업 설정 화면의 그룹 목록 형태를 따르되 조작 요소는 네이티브
 * 체크박스를 유지한다. 목업의 커스텀 토글로 바꾸면 고대비 모드에서
 * 강제 색상이 적용되지 않고 키보드 조작을 직접 구현해야 한다.
 *
 * 전용 CSS 클래스를 쓰지 않고 토큰 기반 유틸리티로만 구성한다.
 * 클래스 정의가 globals.css 한쪽에만 남아 스타일이 끊기는 일을 막는다.
 */
export function AccessibilitySettingsPanel() {
  const highContrast = useAccessibilityStore((state) => state.highContrast);
  const largeText = useAccessibilityStore((state) => state.largeText);
  const simpleMode = useAccessibilityStore((state) => state.simpleMode);
  const setHighContrast = useAccessibilityStore((state) => state.setHighContrast);
  const setLargeText = useAccessibilityStore((state) => state.setLargeText);
  const setSimpleMode = useAccessibilityStore((state) => state.setSimpleMode);

  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
        화면 보기
      </legend>
      <p id="display-settings-description" className="sr-only">
        글씨와 화면 색상을 보기 편하게 바꿀 수 있어요.
      </p>

      <div
        aria-describedby="display-settings-description"
        className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
      >
        <SettingRow
          label="고대비로 보기"
          description="글자와 배경의 차이를 크게 합니다."
          checked={highContrast}
          onChange={setHighContrast}
        />
        <SettingRow
          label="글씨 크게 보기"
          description="화면의 글씨와 조작 요소를 키웁니다."
          checked={largeText}
          onChange={setLargeText}
        />
        <SettingRow
          label="단순 화면 사용"
          description="설명을 줄이고 가장 중요한 행동에 집중합니다."
          checked={simpleMode}
          onChange={setSimpleMode}
          isLast
        />
      </div>
    </fieldset>
  );
}

interface SettingRowProps {
  label: string;
  description: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  isLast?: boolean;
}

function SettingRow({ label, description, checked, onChange, isLast = false }: SettingRowProps) {
  return (
    <label
      className={`flex min-h-[4.5rem] cursor-pointer items-center justify-between gap-4 px-4 py-3 ${
        isLast ? "" : "border-b border-[var(--color-border)]"
      }`}
    >
      <span>
        <span className="block text-[15px] font-bold text-[var(--color-text)]">{label}</span>
        <span
          className="mt-0.5 block text-[13px] leading-snug text-[var(--color-text-muted)]"
          data-secondary-content="true"
        >
          {description}
        </span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-7 w-7 shrink-0 accent-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
      />
    </label>
  );
}

import type { ReactNode } from "react";

type StatusTone = "success" | "warning" | "danger";

interface StatusHeroProps {
  tone: StatusTone;
  /** 원 안에 들어가는 기호. 장식이므로 의미는 title 이 전달한다. */
  symbol: string;
  title: string;
  description: ReactNode;
  className?: string;
}

const TONE_PRESET: Record<StatusTone, { ring: string; text: string }> = {
  success: {
    ring: "bg-[var(--color-success-surface)] border-[var(--color-success)]",
    text: "text-[var(--color-success)]",
  },
  warning: {
    ring: "bg-[var(--color-warning-surface)] border-[var(--color-warning)]",
    text: "text-[var(--color-warning)]",
  },
  danger: {
    ring: "bg-[var(--color-danger-surface)] border-[var(--color-danger)]",
    text: "text-[var(--color-danger)]",
  },
};

/**
 * 이체 결과 화면들의 공통 머리 영역.
 *
 * 완료·대기·차단 세 화면이 같은 구조를 쓴다. 결과는 금전과 직결되므로
 * 색과 기호에 더해 제목 문구로도 명확히 구분한다.
 *
 * role="status" 로 두어 화면 전환 후 낭독기가 결과를 읽도록 한다.
 */
export function StatusHero({ tone, symbol, title, description, className = "" }: StatusHeroProps) {
  const preset = TONE_PRESET[tone];

  return (
    <div role="status" className={`flex flex-col items-center gap-5 text-center ${className}`}>
      <span
        aria-hidden="true"
        className={`flex h-20 w-20 items-center justify-center rounded-full border-[3px] text-4xl ${preset.ring}`}
      >
        {symbol}
      </span>
      <div className="flex flex-col gap-2">
        <h1 className={`text-2xl font-extrabold ${preset.text}`}>{title}</h1>
        <p className="text-base leading-relaxed text-[var(--color-text-muted)]">{description}</p>
      </div>
    </div>
  );
}

import type { ElementType, ReactNode } from "react";

interface SurfaceCardProps {
  children: ReactNode;
  /** 강조된 카드. 음성 인식 결과나 선택된 항목에 사용한다. */
  accent?: boolean;
  as?: ElementType;
  className?: string;
}

/**
 * 목업의 기본 카드면.
 *
 * 배경과 테두리를 토큰으로 두어 고대비 모드에서 흰 테두리로 바뀐다.
 * 고대비 모드는 면 색을 모두 검정으로 만들기 때문에, 카드 구분은
 * 색이 아니라 테두리가 담당한다.
 */
export function SurfaceCard({
  children,
  accent = false,
  as: Tag = "div",
  className = "",
}: SurfaceCardProps) {
  const surface = accent
    ? "bg-[var(--color-surface-raised)] border-[var(--color-border-strong)]"
    : "bg-[var(--color-surface)] border-[var(--color-border)]";

  return <Tag className={`rounded-2xl border ${surface} ${className}`}>{children}</Tag>;
}

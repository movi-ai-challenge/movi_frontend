import type { TransferFdsRiskLevel } from "@/types";

interface RiskBadgeProps {
  level: TransferFdsRiskLevel;
  /** 차단된 거래처럼 결과가 확정된 경우 문구를 바꾼다. */
  label?: string;
  className?: string;
}

/**
 * 위험도 배지.
 *
 * 색만으로 위험도를 전달하지 않는다(접근성 완료 기준). 색 대비로
 * 등급을 구분하되, 문구를 항상 함께 두어 색을 구별하지 못해도
 * 읽을 수 있게 한다.
 */
const RISK_PRESET: Record<TransferFdsRiskLevel, { text: string; className: string }> = {
  LOW: {
    text: "저위험",
    className:
      "text-[var(--color-success)] bg-[var(--color-success-surface)] border-[var(--color-success-border)]",
  },
  MEDIUM: {
    text: "중위험",
    className:
      "text-[var(--color-warning)] bg-[var(--color-warning-surface)] border-[var(--color-warning-border)]",
  },
  HIGH: {
    text: "고위험",
    className:
      "text-[var(--color-danger)] bg-[var(--color-danger-surface)] border-[var(--color-danger-border)]",
  },
};

export function RiskBadge({ level, label, className = "" }: RiskBadgeProps) {
  const preset = RISK_PRESET[level];

  return (
    <span
      className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold ${preset.className} ${className}`}
    >
      {label ?? preset.text}
    </span>
  );
}

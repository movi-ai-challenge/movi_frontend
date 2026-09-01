"use client";

import type { ButtonHTMLAttributes, MouseEvent } from "react";

interface AccessibleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingLabel?: string;
  onVoiceFeedback?: () => void;
  variant?: "primary" | "secondary" | "kakao";
}

const variantClassNames = {
  primary:
    "border-transparent bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)]",
  secondary:
    "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-accent)]",
  /*
   * 카카오 브랜드 색은 테마 토큰이 아니라 고정값이다. 다크·라이트 어느 테마에서도
   * 같은 노랑이어야 사용자가 "카카오 버튼"으로 알아본다. #191600 대비는 15:1 이상이라
   * 명암비 기준을 넘는다.
   */
  kakao: "border-transparent bg-[#fee500] text-[#191600] hover:bg-[#f5dc00]",
} as const;

export function AccessibleButton({
  children,
  className = "",
  disabled,
  isLoading = false,
  loadingLabel = "처리 중",
  onClick,
  onVoiceFeedback,
  type = "button",
  variant = "primary",
  ...props
}: AccessibleButtonProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (!event.defaultPrevented) onVoiceFeedback?.();
  };

  return (
    <button
      {...props}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      onClick={handleClick}
      className={`inline-flex h-14 min-w-11 items-center justify-center rounded-2xl border-2 px-5 text-[17px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none ${variantClassNames[variant]} ${className}`}
    >
      {isLoading ? loadingLabel : children}
    </button>
  );
}

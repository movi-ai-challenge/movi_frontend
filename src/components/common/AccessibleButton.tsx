"use client";

import type { ButtonHTMLAttributes, MouseEvent } from "react";

interface AccessibleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingLabel?: string;
  onVoiceFeedback?: () => void;
}

export function AccessibleButton({
  children,
  className = "",
  disabled,
  isLoading = false,
  loadingLabel = "처리 중",
  onClick,
  onVoiceFeedback,
  type = "button",
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
      className={`min-h-11 min-w-11 rounded-lg bg-[var(--color-primary)] px-6 py-3 font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none ${className}`}
    >
      {isLoading ? loadingLabel : children}
    </button>
  );
}

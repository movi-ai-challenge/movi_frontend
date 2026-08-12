"use client";

import type { ButtonHTMLAttributes, MouseEvent } from "react";

interface AccessibleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingLabel?: string;
  onVoiceFeedback?: () => void;
  variant?: "primary" | "secondary";
}

const variantClassNames = {
  primary:
    "border-transparent bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)]",
  secondary:
    "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-primary)]",
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
      className={`min-h-11 min-w-11 rounded-lg border-2 px-6 py-3 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none ${variantClassNames[variant]} ${className}`}
    >
      {isLoading ? loadingLabel : children}
    </button>
  );
}

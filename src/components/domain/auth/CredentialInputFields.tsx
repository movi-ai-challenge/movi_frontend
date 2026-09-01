"use client";

import { forwardRef } from "react";

interface TextFieldProps {
  autoComplete: string;
  describedBy: string;
  helpText: string;
  id: string;
  invalid: boolean;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "password";
  value: string;
}

/**
 * 아이디·비밀번호·이름 입력 필드.
 *
 * 라벨을 시각적으로 숨기지 않고 항상 노출한다. placeholder만으로는 스크린리더가
 * 값을 채운 뒤 무슨 칸인지 다시 알려 주지 못한다.
 */
export const CredentialTextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function CredentialTextField(
    {
      autoComplete,
      describedBy,
      helpText,
      id,
      invalid,
      label,
      onChange,
      placeholder,
      type = "text",
      value,
    },
    ref,
  ) {
    return (
      <div>
        <label htmlFor={id} className="text-lg font-bold">
          {label}
        </label>
        <input
          ref={ref}
          id={id}
          type={type}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="mt-2 min-h-14 w-full rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
        />
        <p
          id={describedBy}
          className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]"
        >
          {helpText}
        </p>
      </div>
    );
  },
);

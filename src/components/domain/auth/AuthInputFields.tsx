"use client";

import { forwardRef } from "react";

import { sanitizePinInput } from "@/services/pinValidation";

interface PhoneNumberFieldProps {
  describedBy: string;
  helpText?: string;
  id: string;
  invalid: boolean;
  onChange: (value: string) => void;
  value: string;
}

export const PhoneNumberField = forwardRef<HTMLInputElement, PhoneNumberFieldProps>(
  function PhoneNumberField(
    {
      describedBy,
      helpText = "PIN을 등록할 때 사용한 본인의 휴대전화 번호를 입력해 주세요.",
      id,
      invalid,
      onChange,
      value,
    },
    ref,
  ) {
    return (
      <div>
        <label htmlFor={id} className="text-lg font-bold">
          휴대전화 번호
        </label>
        <input
          ref={ref}
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={value}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
          placeholder="010-1234-5678"
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

interface PinFieldProps {
  autoComplete: "current-password" | "new-password";
  describedBy: string;
  id: string;
  invalid: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}

export const PinField = forwardRef<HTMLInputElement, PinFieldProps>(
  function PinField(
    { autoComplete, describedBy, id, invalid, label, onChange, value },
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
          type="password"
          inputMode="numeric"
          autoComplete={autoComplete}
          maxLength={6}
          value={value}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(sanitizePinInput(event.target.value))}
          className="mt-2 min-h-14 w-full rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-lg tracking-[0.35em] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
        />
        <p
          id={describedBy}
          className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]"
        >
          숫자 6자리를 입력해 주세요. 입력한 숫자는 화면에 표시되지 않습니다.
        </p>
      </div>
    );
  },
);

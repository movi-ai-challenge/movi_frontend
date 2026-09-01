"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { PageBackLink } from "@/components/common/PageBackLink";
import {
  PhoneNumberField,
  PinField,
} from "@/components/domain/auth/AuthInputFields";
import {
  loginWithPin,
  toPinAuthenticationError,
} from "@/services/authService";
import {
  isSixDigitPin,
  normalizeKoreanMobileNumber,
} from "@/services/pinValidation";
import { useAuthStore } from "@/store/useAuthStore";
import { useBankStore } from "@/store/useBankStore";

type InvalidField = "phone" | "pin" | null;

function getSafeReturnPath(): string {
  const requestedPath = new URLSearchParams(window.location.search).get("next");
  if (
    !requestedPath ||
    !requestedPath.startsWith("/") ||
    requestedPath.startsWith("//") ||
    requestedPath.startsWith("/login")
  ) {
    return "/";
  }
  return requestedPath;
}

export default function PinLoginPage() {
  const router = useRouter();
  const setBackendSession = useAuthStore((state) => state.setBackendSession);
  const setUser = useBankStore((state) => state.setUser);
  const phoneRef = useRef<HTMLInputElement>(null);
  const pinRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pin, setPin] = useState("");
  const [invalidField, setInvalidField] = useState<InvalidField>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const focusError = (
    field: Exclude<InvalidField, null> | "summary",
  ) => {
    window.setTimeout(() => {
      if (field === "phone") phoneRef.current?.focus();
      else if (field === "pin") pinRef.current?.focus();
      else errorRef.current?.focus();
    }, 0);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedPhoneNumber = normalizeKoreanMobileNumber(phoneNumber);

    if (!normalizedPhoneNumber) {
      setInvalidField("phone");
      setErrorMessage("올바른 휴대전화 번호를 입력해 주세요.");
      focusError("phone");
      return;
    }
    if (!isSixDigitPin(pin)) {
      setInvalidField("pin");
      setErrorMessage("PIN 숫자 6자리를 모두 입력해 주세요.");
      focusError("pin");
      return;
    }

    setInvalidField(null);
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const { session, refreshToken } = await loginWithPin(
        normalizedPhoneNumber,
        pin,
      );
      setBackendSession(session, refreshToken);
      setUser({ id: session.userId, name: session.displayName });
      setPin("");
      router.replace(getSafeReturnPath());
    } catch (error: unknown) {
      const pinError = toPinAuthenticationError(error);
      setErrorMessage(pinError.message);

      if (pinError.kind === "invalid_phone") {
        setInvalidField("phone");
        focusError("phone");
      } else if (
        pinError.kind === "pin_mismatch" ||
        pinError.kind === "pin_not_registered" ||
        pinError.kind === "pin_locked"
      ) {
        setPin("");
        setInvalidField("pin");
        if (pinError.kind === "pin_locked") setIsLocked(true);
        focusError("pin");
      } else {
        focusError("summary");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main
      id="main-content"
      className="mx-auto min-h-[70vh] w-full max-w-xl px-6 py-12"
    >
      <PageBackLink href="/login">다른 방법으로 로그인</PageBackLink>
      <h1 className="text-3xl font-bold">PIN으로 로그인</h1>
      <p className="mt-4 text-lg leading-8 text-[var(--color-text-muted)]">
        등록한 휴대전화 번호와 PIN을 입력해 주세요.
      </p>

      <form className="mt-8 space-y-6" noValidate onSubmit={handleSubmit}>
        <PhoneNumberField
          ref={phoneRef}
          id="pin-login-phone"
          describedBy="pin-login-phone-help"
          value={phoneNumber}
          invalid={invalidField === "phone"}
          onChange={(value) => {
            setPhoneNumber(value);
            if (invalidField === "phone") setInvalidField(null);
          }}
        />
        <PinField
          ref={pinRef}
          id="pin-login-pin"
          describedBy="pin-login-pin-help"
          label="PIN"
          autoComplete="current-password"
          value={pin}
          invalid={invalidField === "pin"}
          onChange={(value) => {
            setPin(value);
            if (invalidField === "pin") setInvalidField(null);
          }}
        />

        {errorMessage ? (
          <div
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="rounded-lg border-2 border-[var(--color-danger)] bg-[var(--color-surface)] p-4 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
          >
            {errorMessage}
          </div>
        ) : null}

        <AccessibleButton
          type="submit"
          className="w-full"
          disabled={isLocked}
          isLoading={isSubmitting}
          loadingLabel="로그인하고 있어요"
        >
          로그인
        </AccessibleButton>
      </form>

      {isLocked ? (
        <p className="mt-4 leading-7 text-[var(--color-text-muted)]">
          잠금이 해제된 뒤 다시 시도해 주세요. PIN 재설정은 현재 MVP에서
          지원하지 않습니다.
        </p>
      ) : null}
    </main>
  );
}

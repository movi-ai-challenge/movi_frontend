"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import {
  PhoneNumberField,
  PinField,
} from "@/components/domain/auth/AuthInputFields";
import {
  registerPin,
  toPinAuthenticationError,
} from "@/services/authService";
import {
  isSixDigitPin,
  normalizeKoreanMobileNumber,
} from "@/services/pinValidation";
import { useAuthStore } from "@/store/useAuthStore";

type InvalidField = "phone" | "pin" | "confirmation" | null;

export default function PinRegisterPage() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const completePinRegistration = useAuthStore(
    (state) => state.completePinRegistration,
  );
  const phoneRef = useRef<HTMLInputElement>(null);
  const pinRef = useRef<HTMLInputElement>(null);
  const confirmationRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirmation, setPinConfirmation] = useState("");
  const [invalidField, setInvalidField] = useState<InvalidField>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canRegister = Boolean(session?.backend?.isNewUser);

  useEffect(() => {
    if (session && !canRegister) router.replace("/accounts");
  }, [canRegister, router, session]);

  const focusError = (
    field: Exclude<InvalidField, null> | "summary",
  ) => {
    window.setTimeout(() => {
      if (field === "phone") phoneRef.current?.focus();
      else if (field === "pin") pinRef.current?.focus();
      else if (field === "confirmation") confirmationRef.current?.focus();
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
    if (pin !== pinConfirmation) {
      setInvalidField("confirmation");
      setErrorMessage("두 PIN이 일치하지 않습니다. 다시 확인해 주세요.");
      focusError("confirmation");
      return;
    }

    setInvalidField(null);
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await registerPin(normalizedPhoneNumber, pin);
      setPin("");
      setPinConfirmation("");
      completePinRegistration();
      router.replace("/accounts/connect");
    } catch (error: unknown) {
      const pinError = toPinAuthenticationError(error);
      setErrorMessage(pinError.message);
      setPin("");
      setPinConfirmation("");

      if (
        pinError.kind === "invalid_phone" ||
        pinError.kind === "phone_already_registered"
      ) {
        setInvalidField("phone");
        focusError("phone");
      } else if (pinError.kind === "pin_already_registered") {
        setInvalidField("pin");
        focusError("pin");
      } else {
        focusError("summary");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canRegister) {
    return (
      <main
        id="main-content"
        className="mx-auto min-h-[70vh] w-full max-w-xl px-6 py-12"
        aria-live="polite"
        aria-busy="true"
      >
        <h1 className="text-3xl font-bold">PIN 등록 권한을 확인하고 있어요</h1>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      className="mx-auto min-h-[70vh] w-full max-w-xl px-6 py-12"
    >
      <p className="font-bold text-[var(--color-accent)]">마지막 가입 단계</p>
      <h1 className="mt-2 text-3xl font-bold">PIN 등록</h1>
      <p className="mt-4 text-lg leading-8 text-[var(--color-text-muted)]">
        다음 로그인에 사용할 휴대전화 번호와 숫자 6자리 PIN을 등록해
        주세요.
      </p>

      <form className="mt-8 space-y-6" noValidate onSubmit={handleSubmit}>
        <PhoneNumberField
          ref={phoneRef}
          id="pin-register-phone"
          describedBy="pin-register-phone-help"
          helpText="다음 PIN 로그인에 사용할 본인의 휴대전화 번호를 입력해 주세요."
          value={phoneNumber}
          invalid={invalidField === "phone"}
          onChange={(value) => {
            setPhoneNumber(value);
            if (invalidField === "phone") setInvalidField(null);
          }}
        />
        <PinField
          ref={pinRef}
          id="pin-register-pin"
          describedBy="pin-register-pin-help"
          label="새 PIN"
          autoComplete="new-password"
          value={pin}
          invalid={invalidField === "pin"}
          onChange={(value) => {
            setPin(value);
            if (invalidField === "pin") setInvalidField(null);
          }}
        />
        <PinField
          ref={confirmationRef}
          id="pin-register-confirmation"
          describedBy="pin-register-confirmation-help"
          label="새 PIN 확인"
          autoComplete="new-password"
          value={pinConfirmation}
          invalid={invalidField === "confirmation"}
          onChange={(value) => {
            setPinConfirmation(value);
            if (invalidField === "confirmation") setInvalidField(null);
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
          isLoading={isSubmitting}
          loadingLabel="PIN을 등록하고 있어요"
        >
          PIN 등록하고 계좌 연결하기
        </AccessibleButton>
      </form>
    </main>
  );
}

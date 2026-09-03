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
  clearPinRegistrationPhoneNumber,
  readPinRegistrationPhoneNumber,
} from "@/services/pinRegistrationHandoff";
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
  /*
   * 서버가 거절했을 때 안내문으로 초점을 옮기기 위한 신호. 값 자체는 쓰지 않고 "새 요약
   * 오류가 났다"는 사실만 센다.
   *
   * `setTimeout`으로 옮기지 않는 이유는, 안내문 <div>가 오류가 생긴 뒤에야 렌더되기
   * 때문이다. 타이머가 React 커밋보다 먼저 돌면 `errorRef`가 아직 비어 있어 초점이
   * 그대로 body 에 남는다. 입력란은 항상 떠 있어 그 방식이 통했을 뿐이다. effect 는
   * 커밋 뒤에 도므로 안내문이 반드시 있다.
   */
  const [summaryErrorCount, setSummaryErrorCount] = useState(0);

  const isNewUser = Boolean(session?.backend?.isNewUser);
  /*
   * 카카오로 막 가입한 사용자에게만 PIN 등록이 필수다. 그 사용자는 아직 이 서비스에
   * 아이디·비밀번호가 없어서, PIN을 등록하지 않으면 다음 접속 때 카카오 인증을 처음부터
   * 다시 거치는 길밖에 없다. 일반 가입자는 아이디·비밀번호를 이미 가지고 있으므로 PIN은
   * 편의 수단이고, 설정에서 언제든 다시 들어와 등록할 수 있다.
   */
  const isRequiredStep = isNewUser && session?.method === "카카오";
  const skipPath = isNewUser ? "/accounts/connect" : "/settings";

  /*
   * 일반 회원가입에서 전화번호를 적었다면 그 값을 그대로 채운다. 한 화면 전에 입력한
   * 번호를 다시 받아 적게 하지 않는다. 읽는 즉시 지워, 다음에 이 화면에 들어왔을 때
   * 남의 번호가 남아 있지 않게 한다.
   */
  useEffect(() => {
    const handedOffPhoneNumber = readPinRegistrationPhoneNumber();
    if (!handedOffPhoneNumber) return;

    /*
     * `useState` 초기값으로 읽지 않는 이유는 `sessionStorage`가 서버에 없기 때문이다.
     * 서버는 빈 칸으로, 브라우저는 번호가 채워진 칸으로 첫 렌더를 만들어 hydration이
     * 어긋난다. 마운트 뒤 한 번만 읽는 이 방식이 외부 저장소를 React 상태로 들여오는
     * 정석이라, 규칙이 잡아내지 못하는 예외로 두고 끈다.
     */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhoneNumber(handedOffPhoneNumber);
    clearPinRegistrationPhoneNumber();
  }, []);

  useEffect(() => {
    if (summaryErrorCount === 0) return;
    errorRef.current?.focus();
  }, [summaryErrorCount]);

  const focusError = (field: Exclude<InvalidField, null> | "summary") => {
    if (field === "summary") {
      setSummaryErrorCount((count) => count + 1);
      return;
    }
    window.setTimeout(() => {
      if (field === "phone") phoneRef.current?.focus();
      else if (field === "pin") pinRef.current?.focus();
      else confirmationRef.current?.focus();
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
      /*
       * 갓 가입한 사용자에게는 연결된 계좌가 없어 홈에서 할 수 있는 일이 "계좌 연결하기"
       * 하나뿐이다. 나중에 설정에서 들어온 사용자는 원래 있던 자리로 돌려보낸다.
       */
      router.replace(isNewUser ? "/accounts/connect" : "/settings");
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
        /*
         * 입력값 문제가 아니라 계정 상태 문제다. PIN을 다시 쳐 봐야 결과가 같으므로
         * 입력란이 아니라 안내문으로 초점을 옮긴다.
         */
        setErrorMessage(
          "이미 PIN이 등록된 계정이에요. 로그인 화면에서 PIN으로 로그인할 수 있어요.",
        );
        focusError("summary");
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
      <p className="font-bold text-[var(--color-accent)]">
        {isNewUser ? "마지막 가입 단계" : "로그인 수단 추가"}
      </p>
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
          {isNewUser ? "PIN 등록하고 계좌 연결하기" : "PIN 등록하기"}
        </AccessibleButton>
      </form>

      {isRequiredStep ? null : (
        <button
          type="button"
          onClick={() => router.replace(skipPath)}
          className="mt-6 min-h-11 text-lg font-semibold text-[var(--color-accent)] underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
        >
          나중에 등록하기
        </button>
      )}
    </main>
  );
}

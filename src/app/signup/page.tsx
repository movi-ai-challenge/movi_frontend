"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { PageBackLink } from "@/components/common/PageBackLink";
import { CredentialTextField } from "@/components/domain/auth/CredentialInputFields";
import { PhoneNumberField } from "@/components/domain/auth/AuthInputFields";
import { signUp, toPinAuthenticationError } from "@/services/authService";
import {
  isValidDisplayName,
  isValidLoginId,
  isValidPassword,
  normalizeLoginId,
} from "@/services/credentialValidation";
import { normalizeKoreanMobileNumber } from "@/services/pinValidation";
import { useAuthStore } from "@/store/useAuthStore";
import { useBankStore } from "@/store/useBankStore";

type InvalidField = "name" | "loginId" | "password" | "phone" | null;

export default function SignUpPage() {
  const router = useRouter();
  const setBackendSession = useAuthStore((state) => state.setBackendSession);
  const setUser = useBankStore((state) => state.setUser);
  const nameRef = useRef<HTMLInputElement>(null);
  const loginIdRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [invalidField, setInvalidField] = useState<InvalidField>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const focusError = (field: Exclude<InvalidField, null> | "summary") => {
    window.setTimeout(() => {
      if (field === "name") nameRef.current?.focus();
      else if (field === "loginId") loginIdRef.current?.focus();
      else if (field === "password") passwordRef.current?.focus();
      else if (field === "phone") phoneRef.current?.focus();
      else errorRef.current?.focus();
    }, 0);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isValidDisplayName(name)) {
      setInvalidField("name");
      setErrorMessage("이름을 입력해 주세요.");
      focusError("name");
      return;
    }
    if (!isValidLoginId(loginId)) {
      setInvalidField("loginId");
      setErrorMessage("아이디는 영문, 숫자, 밑줄 4자 이상으로 입력해 주세요.");
      focusError("loginId");
      return;
    }
    if (!isValidPassword(password)) {
      setInvalidField("password");
      setErrorMessage("비밀번호를 8자 이상 입력해 주세요.");
      focusError("password");
      return;
    }

    /*
     * 전화번호는 선택이다. 다만 적어 넣었다면 형식은 맞아야 한다 — 잘못된 번호를
     * 그대로 저장하면 보호자 경고 문자가 엉뚱한 곳으로 간다.
     */
    const trimmedPhone = phoneNumber.trim();
    let normalizedPhone: string | undefined = undefined;
    if (trimmedPhone.length > 0) {
      const parsedPhone = normalizeKoreanMobileNumber(trimmedPhone);
      if (!parsedPhone) {
        setInvalidField("phone");
        setErrorMessage("올바른 휴대전화 번호를 입력해 주세요.");
        focusError("phone");
        return;
      }
      normalizedPhone = parsedPhone;
    }

    setInvalidField(null);
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const { session, refreshToken } = await signUp({
        loginId: normalizeLoginId(loginId),
        password,
        name: name.trim(),
        phoneNumber: normalizedPhone,
      });
      setBackendSession(session, refreshToken);
      setUser({ id: session.userId, name: name.trim() });
      setPassword("");
      router.replace("/");
    } catch (error: unknown) {
      const signUpError = toPinAuthenticationError(error);
      setErrorMessage(signUpError.message);

      if (signUpError.kind === "login_id_already_registered") {
        setInvalidField("loginId");
        focusError("loginId");
        return;
      }
      if (signUpError.kind === "phone_already_registered") {
        setInvalidField("phone");
        focusError("phone");
        return;
      }
      focusError("summary");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-xl flex-col px-6 py-12"
    >
      <PageBackLink href="/login">로그인 방법 선택으로</PageBackLink>

      <h1 className="mt-6 text-4xl font-bold tracking-tight">회원가입</h1>
      <p
        className="mt-4 text-lg leading-8 text-[var(--color-text-muted)]"
        data-secondary-content="true"
      >
        아이디와 비밀번호로 계정을 만듭니다. 가입이 끝나면 바로 시작할 수 있어요.
      </p>

      <form className="mt-8 flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
        <CredentialTextField
          ref={nameRef}
          id="signup-name"
          label="이름"
          autoComplete="name"
          value={name}
          invalid={invalidField === "name"}
          describedBy="signup-name-help"
          helpText="서비스 안내에 사용할 이름이에요."
          onChange={setName}
        />
        <CredentialTextField
          ref={loginIdRef}
          id="signup-login-id"
          label="아이디"
          autoComplete="username"
          placeholder="movi123"
          value={loginId}
          invalid={invalidField === "loginId"}
          describedBy="signup-login-id-help"
          helpText="영문, 숫자, 밑줄 4자 이상 30자 이하로 정해 주세요."
          onChange={setLoginId}
        />
        <CredentialTextField
          ref={passwordRef}
          id="signup-password"
          label="비밀번호"
          type="password"
          autoComplete="new-password"
          value={password}
          invalid={invalidField === "password"}
          describedBy="signup-password-help"
          helpText="8자 이상 64자 이하로 정해 주세요."
          onChange={setPassword}
        />

        <div>
          <PhoneNumberField
            ref={phoneRef}
            id="signup-phone"
            value={phoneNumber}
            invalid={invalidField === "phone"}
            describedBy="signup-phone-help"
            helpText="선택 사항이에요. 적어 두면 위험한 송금이 감지될 때 보호자에게 문자를 보낼 수 있어요."
            onChange={setPhoneNumber}
          />
        </div>

        <AccessibleButton
          type="submit"
          className="w-full"
          isLoading={isSubmitting}
          loadingLabel="가입하고 있어요"
        >
          가입하고 시작하기
        </AccessibleButton>
      </form>

      <div className="mt-6 min-h-16" aria-live="assertive" aria-atomic="true">
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
      </div>

      <p
        className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]"
        data-secondary-content="true"
      >
        가입 시 서비스 이용약관에 동의합니다
      </p>
    </main>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { PageBackLink } from "@/components/common/PageBackLink";
import { CredentialTextField } from "@/components/domain/auth/CredentialInputFields";
import {
  loginWithPassword,
  toPinAuthenticationError,
} from "@/services/authService";
import {
  isValidLoginId,
  isValidPassword,
  normalizeLoginId,
} from "@/services/credentialValidation";
import { useAuthStore } from "@/store/useAuthStore";
import { useBankStore } from "@/store/useBankStore";

type InvalidField = "loginId" | "password" | null;

function getSafeReturnPath(): string {
  const requestedPath = new URLSearchParams(window.location.search).get("next");
  if (
    !requestedPath ||
    !requestedPath.startsWith("/") ||
    requestedPath.startsWith("//") ||
    requestedPath.startsWith("/login")
  ) {
    return "/accounts";
  }
  return requestedPath;
}

export default function PasswordLoginPage() {
  const router = useRouter();
  const setBackendSession = useAuthStore((state) => state.setBackendSession);
  const setUser = useBankStore((state) => state.setUser);
  const loginIdRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [invalidField, setInvalidField] = useState<InvalidField>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const focusError = (field: Exclude<InvalidField, null> | "summary") => {
    window.setTimeout(() => {
      if (field === "loginId") loginIdRef.current?.focus();
      else if (field === "password") passwordRef.current?.focus();
      else errorRef.current?.focus();
    }, 0);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

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

    setInvalidField(null);
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const { session, refreshToken } = await loginWithPassword(
        normalizeLoginId(loginId),
        password,
      );
      setBackendSession(session, refreshToken);
      setUser({ id: session.userId, name: session.displayName });
      setPassword("");
      router.replace(getSafeReturnPath());
    } catch (error: unknown) {
      const loginError = toPinAuthenticationError(error);
      setErrorMessage(loginError.message);
      setPassword("");

      if (loginError.kind === "password_locked") {
        setIsLocked(true);
        focusError("summary");
        return;
      }
      if (loginError.kind === "password_not_registered") {
        focusError("summary");
        return;
      }
      setInvalidField("password");
      focusError("password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col justify-center px-6 py-12"
    >
      <PageBackLink href="/login">로그인 방법 선택으로</PageBackLink>

      <h1 className="mt-6 text-4xl font-bold tracking-tight">일반 로그인</h1>
      <p
        className="mt-4 text-lg leading-8 text-[var(--color-text-muted)]"
        data-secondary-content="true"
      >
        가입할 때 정한 아이디와 비밀번호를 입력해 주세요.
      </p>

      <form className="mt-8 flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
        <CredentialTextField
          ref={loginIdRef}
          id="login-id"
          label="아이디"
          autoComplete="username"
          placeholder="movi123"
          value={loginId}
          invalid={invalidField === "loginId"}
          describedBy="login-id-help"
          helpText="영문, 숫자, 밑줄만 쓸 수 있어요. 대문자와 소문자는 구분하지 않습니다."
          onChange={setLoginId}
        />
        <CredentialTextField
          ref={passwordRef}
          id="login-password"
          label="비밀번호"
          type="password"
          autoComplete="current-password"
          value={password}
          invalid={invalidField === "password"}
          describedBy="login-password-help"
          helpText="8자 이상입니다. 다섯 번 잘못 입력하면 오 분간 잠깁니다."
          onChange={setPassword}
        />

        <AccessibleButton
          type="submit"
          className="w-full"
          isLoading={isSubmitting}
          loadingLabel="로그인하고 있어요"
          disabled={isLocked}
        >
          로그인
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

      <button
        type="button"
        onClick={() => router.push("/signup")}
        className="mt-2 min-h-11 text-lg font-semibold text-[var(--color-accent)] underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
      >
        아직 계정이 없으신가요? 회원가입
      </button>
    </main>
  );
}

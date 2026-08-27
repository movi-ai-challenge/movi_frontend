"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { PageBackLink } from "@/components/common/PageBackLink";
import { startKakaoLogin } from "@/services/authService";

function getPinLoginPath(): string {
  const requestedPath = new URLSearchParams(window.location.search).get("next");
  if (
    !requestedPath ||
    !requestedPath.startsWith("/") ||
    requestedPath.startsWith("//") ||
    requestedPath.startsWith("/login")
  ) {
    return "/login/pin";
  }

  return `/login/pin?next=${encodeURIComponent(requestedPath)}`;
}

export default function LoginPage() {
  const router = useRouter();
  const [isStartingKakao, setIsStartingKakao] = useState(false);
  const [authenticationError, setAuthenticationError] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);

  const handleKakaoLogin = () => {
    setAuthenticationError("");
    setIsStartingKakao(true);

    try {
      startKakaoLogin();
    } catch {
      setIsStartingKakao(false);
      setAuthenticationError(
        "카카오 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
      window.setTimeout(() => errorRef.current?.focus(), 0);
    }
  };

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col justify-center px-6 py-12"
    >
      <PageBackLink href="/">처음 화면으로</PageBackLink>

      <p
        className="text-base font-bold text-[var(--color-primary)]"
        data-secondary-content="true"
      >
        MOVI
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">MOVI 시작하기</h1>
      <p
        className="mt-4 text-lg leading-8 text-[var(--color-text-muted)]"
        data-secondary-content="true"
      >
        안전한 금융 서비스를 위해 본인 확인이 필요해요.
      </p>

      <section
        className="mt-8 rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-surface)] p-6"
        aria-labelledby="returning-user-login-title"
      >
        <p
          className="font-bold text-[var(--color-primary)]"
          data-secondary-content="true"
        >
          기존 사용자
        </p>
        <h2 id="returning-user-login-title" className="mt-2 text-2xl font-bold">
          다시 오셨나요?
        </h2>
        <p
          className="mt-2 leading-7 text-[var(--color-text-muted)]"
          data-secondary-content="true"
        >
          등록한 휴대전화 번호와 PIN으로 로그인하세요.
        </p>
        <AccessibleButton
          className="mt-5 w-full"
          onClick={() => router.push(getPinLoginPath())}
        >
          PIN으로 로그인
        </AccessibleButton>
      </section>

      <section
        className="mt-8 border-t-2 border-[var(--color-border)] pt-8"
        aria-labelledby="new-user-login-title"
      >
        <h2 id="new-user-login-title" className="text-xl font-bold">
          처음 이용하시나요?
        </h2>
        <p
          className="mt-2 leading-7 text-[var(--color-text-muted)]"
          data-secondary-content="true"
        >
          카카오로 본인 확인한 뒤 PIN을 등록할 수 있습니다.
        </p>
        <AccessibleButton
          className="mt-4 w-full"
          variant="secondary"
          isLoading={isStartingKakao}
          loadingLabel="카카오 인증을 시작하고 있어요"
          onClick={handleKakaoLogin}
        >
          카카오로 처음 시작하기
        </AccessibleButton>
      </section>

      <div className="mt-6 min-h-16" aria-live="polite" aria-atomic="true">
        {authenticationError ? (
          <div
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="rounded-lg border-2 border-[var(--color-danger)] bg-[var(--color-surface)] p-4 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
          >
            {authenticationError}
          </div>
        ) : null}
      </div>
    </main>
  );
}

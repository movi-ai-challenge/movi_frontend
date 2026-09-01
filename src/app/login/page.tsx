"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { PageBackLink } from "@/components/common/PageBackLink";
import { startKakaoLogin } from "@/services/authService";

/**
 * 이어서 이동할 경로를 안전하게 이어붙인다. 외부 도메인(`//`)이나 로그인 화면 자신으로
 * 되돌아가는 값은 버린다 — 열린 리다이렉트가 되거나 로그인 루프에 빠진다.
 */
function withReturnPath(basePath: string): string {
  const requestedPath = new URLSearchParams(window.location.search).get("next");
  if (
    !requestedPath ||
    !requestedPath.startsWith("/") ||
    requestedPath.startsWith("//") ||
    requestedPath.startsWith("/login")
  ) {
    return basePath;
  }

  return `${basePath}?next=${encodeURIComponent(requestedPath)}`;
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

      <h1 className="mt-6 text-4xl font-bold tracking-tight">로그인</h1>
      <p
        className="mt-4 text-lg leading-8 text-[var(--color-text-muted)]"
        data-secondary-content="true"
      >
        카카오 계정으로
        <br />
        간편하게 시작하세요
      </p>

      <section
        className="mt-8 rounded-2xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6"
        aria-labelledby="login-method-title"
      >
        <h2
          id="login-method-title"
          className="text-base font-bold text-[var(--color-text-muted)]"
          data-secondary-content="true"
        >
          로그인 방법
        </h2>

        <ul className="mt-4 divide-y-2 divide-[var(--color-border)]">
          <li>
            <button
              type="button"
              onClick={handleKakaoLogin}
              disabled={isStartingKakao}
              className="flex min-h-14 w-full items-center gap-3 py-4 text-left text-lg font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] disabled:opacity-60"
            >
              <span
                aria-hidden="true"
                className="h-3 w-3 shrink-0 rounded-full bg-[#fee500]"
              />
              카카오 로그인
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => router.push(withReturnPath("/login/password"))}
              className="flex min-h-14 w-full items-center gap-3 py-4 text-left text-lg font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
            >
              <span
                aria-hidden="true"
                className="h-3 w-3 shrink-0 rounded-full bg-[var(--color-primary)]"
              />
              일반 로그인
            </button>
          </li>
        </ul>
      </section>

      <AccessibleButton
        className="mt-10 w-full gap-2"
        variant="kakao"
        isLoading={isStartingKakao}
        loadingLabel="카카오 인증을 시작하고 있어요"
        onClick={handleKakaoLogin}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5 shrink-0"
          fill="currentColor"
        >
          <path d="M12 3C6.99 3 3 6.2 3 10.14c0 2.5 1.66 4.7 4.17 5.96l-1.05 3.85c-.09.33.28.6.57.41l4.6-3.04c.23.02.47.03.71.03 5.01 0 9-3.2 9-7.21S17.01 3 12 3Z" />
        </svg>
        카카오로 시작하기
      </AccessibleButton>

      <p
        className="mt-4 text-center text-sm leading-6 text-[var(--color-text-muted)]"
        data-secondary-content="true"
      >
        로그인 시 서비스 이용약관에 동의합니다
      </p>

      <nav
        className="mt-8 border-t-2 border-[var(--color-border)] pt-6"
        aria-label="다른 로그인 방법"
      >
        <ul className="flex flex-col gap-3">
          <li>
            <button
              type="button"
              onClick={() => router.push("/signup")}
              className="min-h-11 text-lg font-semibold text-[var(--color-accent)] underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
            >
              아이디로 회원가입
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => router.push(withReturnPath("/login/pin"))}
              className="min-h-11 text-lg font-semibold text-[var(--color-accent)] underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
            >
              PIN으로 로그인
            </button>
          </li>
        </ul>
      </nav>

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

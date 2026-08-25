"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { PageBackLink } from "@/components/common/PageBackLink";
import { authenticateWithMock } from "@/services/authService";
import { useAuthStore } from "@/store/useAuthStore";
import { useBankStore } from "@/store/useBankStore";
import type { MockAuthenticationMethod } from "@/types";
import { isMockMode } from "@/services/api";
import { startKakaoLogin } from "@/services/authService";

const NEW_USER_RETURN_PATH = "/accounts/connect";
const RETURNING_USER_RETURN_PATH = "/accounts";

function getSafeReturnPath(defaultPath: string): string {
  const requestedPath = new URLSearchParams(window.location.search).get("next");
  if (
    !requestedPath ||
    !requestedPath.startsWith("/") ||
    requestedPath.startsWith("//") ||
    requestedPath.startsWith("/login")
  ) {
    return defaultPath;
  }

  return requestedPath;
}

export default function LoginPage() {
  const [pendingMethod, setPendingMethod] =
    useState<MockAuthenticationMethod | null>(null);
  const [completedMethod, setCompletedMethod] =
    useState<MockAuthenticationMethod | null>(null);
  const [returnPath, setReturnPath] = useState(RETURNING_USER_RETURN_PATH);
  const [authenticationError, setAuthenticationError] = useState("");
  const setSession = useAuthStore((state) => state.setSession);
  const setUser = useBankStore((state) => state.setUser);
  const errorRef = useRef<HTMLDivElement>(null);

  const authenticate = async (method: MockAuthenticationMethod) => {
    const defaultPath =
      method === "PIN" || method === "생체인증"
        ? RETURNING_USER_RETURN_PATH
        : NEW_USER_RETURN_PATH;

    setCompletedMethod(null);
    setAuthenticationError("");
    setReturnPath(getSafeReturnPath(defaultPath));
    setPendingMethod(method);

    try {
      const session = await authenticateWithMock(method);
      setSession(session);
      setUser({ id: session.userId, name: session.displayName });
      setCompletedMethod(method);
    } catch {
      setAuthenticationError(
        "Mock 본인 확인을 완료하지 못했습니다. 다시 시도해 주세요.",
      );
      window.setTimeout(() => errorRef.current?.focus(), 0);
    } finally {
      setPendingMethod(null);
    }
  };

  const isPending = pendingMethod !== null;

  const handleKakaoLogin = () => {
    if (isMockMode) {
      authenticate("카카오");
      return;
    }
    setPendingMethod("카카오");
    startKakaoLogin();
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
          자주 사용하는 로그인
        </p>
        <h2 id="returning-user-login-title" className="mt-2 text-2xl font-bold">
          다시 오셨나요?
        </h2>
        <p
          className="mt-2 leading-7 text-[var(--color-text-muted)]"
          data-secondary-content="true"
        >
          PIN이나 생체인증으로 바로 로그인하세요.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <AccessibleButton
            isLoading={pendingMethod === "PIN"}
            loadingLabel="PIN 로그인을 준비하고 있어요"
            disabled={isPending}
            onClick={() => void authenticate("PIN")}
          >
            PIN으로 로그인
          </AccessibleButton>
          <AccessibleButton
            isLoading={pendingMethod === "생체인증"}
            loadingLabel="생체인증을 준비하고 있어요"
            disabled={isPending}
            onClick={() => void authenticate("생체인증")}
          >
            생체인증으로 로그인
          </AccessibleButton>
        </div>
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
          PASS 또는 카카오로 본인 확인을 시작하세요.
        </p>
        <AccessibleButton
          className="mt-4 w-full"
          variant="secondary"
          isLoading={pendingMethod === "PASS"}
          loadingLabel="PASS 인증을 준비하고 있어요"
          disabled={isPending}
          onClick={() => void authenticate("PASS")}
        >
          PASS로 처음 시작하기
        </AccessibleButton>
        <AccessibleButton
          className="mt-3 w-full"
          variant="secondary"
          isLoading={pendingMethod === "카카오"}
          loadingLabel="카카오 인증을 준비하고 있어요"
          disabled={isPending}
          onClick={() => void authenticate("카카오")}
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
        {completedMethod ? (
          <div className="rounded-lg border-2 border-[var(--color-success)] bg-[var(--color-surface)] p-4">
            <p className="font-semibold">
              {completedMethod} Mock 인증을 완료했습니다.
            </p>
            <Link
              href={returnPath}
              className="mt-4 inline-flex min-h-11 items-center rounded-lg border-2 border-transparent bg-[var(--color-primary)] px-5 py-2 font-semibold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
            >
              {returnPath === NEW_USER_RETURN_PATH
                ? "계좌 연결하기"
                : returnPath === RETURNING_USER_RETURN_PATH
                  ? "연결된 계좌로 이동"
                  : "요청한 화면으로 계속하기"}
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}

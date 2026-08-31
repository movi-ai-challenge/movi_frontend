"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { AppScreen } from "@/components/common/AppScreen";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { isMockMode } from "@/services/api";
import { authenticateWithMock, startKakaoLogin } from "@/services/authService";
import { useAuthStore } from "@/store/useAuthStore";
import { useBankStore } from "@/store/useBankStore";
import type { MockAuthenticationMethod } from "@/types";

const NEW_USER_RETURN_PATH = "/accounts/connect";
const RETURNING_USER_RETURN_PATH = "/accounts";

function readRequestedPath(): string | null {
  const requestedPath = new URLSearchParams(window.location.search).get("next");
  if (
    !requestedPath ||
    !requestedPath.startsWith("/") ||
    requestedPath.startsWith("//") ||
    requestedPath.startsWith("/login")
  ) {
    return null;
  }

  return requestedPath;
}

function getSafeReturnPath(defaultPath: string): string {
  return readRequestedPath() ?? defaultPath;
}

export default function LoginPage() {
  const router = useRouter();
  const [pendingMethod, setPendingMethod] = useState<MockAuthenticationMethod | null>(null);
  const [completedMethod, setCompletedMethod] = useState<MockAuthenticationMethod | null>(null);
  const [returnPath, setReturnPath] = useState(RETURNING_USER_RETURN_PATH);
  const [authenticationError, setAuthenticationError] = useState("");
  const setSession = useAuthStore((state) => state.setSession);
  const setUser = useBankStore((state) => state.setUser);
  const errorRef = useRef<HTMLDivElement>(null);

  const authenticate = async (method: MockAuthenticationMethod) => {
    const defaultPath =
      method === "PIN" || method === "생체인증" ? RETURNING_USER_RETURN_PATH : NEW_USER_RETURN_PATH;

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
      setAuthenticationError("Mock 본인 확인을 완료하지 못했습니다. 다시 시도해 주세요.");
      window.setTimeout(() => errorRef.current?.focus(), 0);
    } finally {
      setPendingMethod(null);
    }
  };

  const isPending = pendingMethod !== null;

  const handleKakaoLogin = () => {
    if (isMockMode) {
      void authenticate("카카오");
      return;
    }
    setPendingMethod("카카오");
    startKakaoLogin();
  };

  // PIN 은 목업과 동일하게 별도 입력 화면으로 보낸다.
  const goToPinScreen = () => {
    const requestedPath = readRequestedPath();
    router.push(requestedPath ? `/login/pin?next=${encodeURIComponent(requestedPath)}` : "/login/pin");
  };

  return (
    <AppScreen
      className="gap-5 pt-6"
      footer={
        <>
          <button
            type="button"
            disabled={isPending}
            onClick={handleKakaoLogin}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#FEE500] text-[16px] font-bold text-[#1A1200] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
          >
            {pendingMethod === "카카오" ? "카카오 인증을 준비하고 있어요" : "카카오로 시작하기"}
          </button>
          <p
            className="text-center text-xs text-[var(--color-text-muted)]"
            data-secondary-content="true"
          >
            로그인 시 서비스 이용약관에 동의합니다
          </p>
        </>
      }
    >
      <nav aria-label="이전 단계">
        <Link
          href="/"
          aria-label="첫 화면으로"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
        >
          <span aria-hidden="true">←</span>
        </Link>
      </nav>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-extrabold tracking-tight">로그인</h1>
        <p
          className="text-[15px] leading-relaxed text-[var(--color-text-muted)]"
          data-secondary-content="true"
        >
          안전한 금융 서비스를 위해 본인 확인이 필요해요.
        </p>
      </div>

      {/* 재방문 사용자 */}
      <SurfaceCard accent as="section" className="p-5" aria-labelledby="returning-user-login-title">
        <p className="text-xs font-bold text-[var(--color-accent)]" data-secondary-content="true">
          자주 사용하는 로그인
        </p>
        <h2 id="returning-user-login-title" className="mt-1 text-lg font-bold">
          다시 오셨나요?
        </h2>
        <p
          className="mt-1 text-[13px] leading-relaxed text-[var(--color-text-muted)]"
          data-secondary-content="true"
        >
          PIN이나 생체인증으로 바로 로그인하세요.
        </p>
        <div className="mt-4 grid gap-2.5">
          <AccessibleButton disabled={isPending} onClick={goToPinScreen}>
            PIN으로 로그인
          </AccessibleButton>
          <AccessibleButton
            variant="secondary"
            isLoading={pendingMethod === "생체인증"}
            loadingLabel="생체인증을 준비하고 있어요"
            disabled={isPending}
            onClick={() => void authenticate("생체인증")}
          >
            생체인증으로 로그인
          </AccessibleButton>
        </div>
      </SurfaceCard>

      {/* 신규 사용자 */}
      <section aria-labelledby="new-user-login-title">
        <h2 id="new-user-login-title" className="text-[15px] font-bold">
          처음 이용하시나요?
        </h2>
        <p
          className="mt-1 text-[13px] leading-relaxed text-[var(--color-text-muted)]"
          data-secondary-content="true"
        >
          PASS 또는 카카오로 본인 확인을 시작하세요.
        </p>
        <AccessibleButton
          className="mt-3 w-full"
          variant="secondary"
          isLoading={pendingMethod === "PASS"}
          loadingLabel="PASS 인증을 준비하고 있어요"
          disabled={isPending}
          onClick={() => void authenticate("PASS")}
        >
          PASS로 처음 시작하기
        </AccessibleButton>
      </section>

      <div className="min-h-16" aria-live="polite" aria-atomic="true">
        {authenticationError ? (
          <div
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="rounded-2xl border border-[var(--color-danger)] bg-[var(--color-danger-surface)] p-4 text-[15px] font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
          >
            {authenticationError}
          </div>
        ) : null}
        {completedMethod ? (
          <div className="rounded-2xl border border-[var(--color-success-border)] bg-[var(--color-success-surface)] p-4">
            <p className="text-[15px] font-semibold">{completedMethod} Mock 인증을 완료했습니다.</p>
            <Link
              href={returnPath}
              className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-[var(--color-primary)] px-5 py-2 font-semibold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
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
    </AppScreen>
  );
}

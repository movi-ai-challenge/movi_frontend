"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { restoreAuthenticatedSession } from "@/services/api";
import { logout } from "@/services/authService";
import { clearTransferRecoveryKey } from "@/services/transferRecoveryStorage";
import { useAuthStore } from "@/store/useAuthStore";
import { useBankStore } from "@/store/useBankStore";

const PROTECTED_ROUTE_PREFIXES = [
  "/pin",
  "/accounts",
  "/balance",
  "/transactions",
  "/transfer",
] as const;

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function MockAuthBoundary({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isRestoringSession = useAuthStore(
    (state) => state.isRestoringSession,
  );
  const hydrateSession = useAuthStore((state) => state.hydrateSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const resetBankState = useBankStore((state) => state.resetBankState);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const redirectStartedRef = useRef(false);
  const protectedRoute = isProtectedRoute(pathname);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    if (!hasHydrated || !isRestoringSession) return;

    void restoreAuthenticatedSession().catch(() => {
      // API 계층이 실패한 인증·금융 상태를 정리한다.
    });
  }, [hasHydrated, isRestoringSession]);

  useEffect(() => {
    if (
      !hasHydrated ||
      isRestoringSession ||
      !protectedRoute ||
      session ||
      redirectStartedRef.current
    ) {
      return;
    }

    redirectStartedRef.current = true;
    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [
    hasHydrated,
    isRestoringSession,
    pathname,
    protectedRoute,
    router,
    session,
  ]);

  useEffect(() => {
    redirectStartedRef.current = false;
  }, [pathname]);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await logout(session);
    } finally {
      redirectStartedRef.current = true;
      clearSession();
      resetBankState();
      clearTransferRecoveryKey();
      router.replace("/login");
      setIsLoggingOut(false);
    }
  };

  if (
    protectedRoute &&
    (!hasHydrated || isRestoringSession || !session)
  ) {
    return (
      <main
        id="main-content"
        className="mx-auto min-h-[70vh] w-full max-w-xl px-6 py-12"
        aria-live="polite"
        aria-busy="true"
      >
        <h1 className="text-3xl font-bold">로그인 상태를 확인하고 있어요</h1>
        <p className="mt-4 leading-7 text-[var(--color-text-muted)]">
          인증되지 않은 경우 로그인 화면으로 이동합니다.
        </p>
      </main>
    );
  }

  return (
    <>
      {session && protectedRoute ? (
        <header className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-6 pt-6">
          <div>
            <p className="font-bold">
              {session.displayName} · {session.backend ? "실제" : "Mock"} 로그인
            </p>
            <p
              className="mt-1 text-sm text-[var(--color-text-muted)]"
              data-secondary-content="true"
            >
              {session.backend
                ? "백엔드 인증 세션을 사용하고 있습니다."
                : "Mock 세션은 실제 금융 권한을 제공하지 않습니다."}
            </p>
          </div>
          <AccessibleButton
            variant="secondary"
            isLoading={isLoggingOut}
            loadingLabel="로그아웃하고 있어요"
            onClick={() => void handleLogout()}
          >
            로그아웃
          </AccessibleButton>
        </header>
      ) : null}
      {children}
    </>
  );
}

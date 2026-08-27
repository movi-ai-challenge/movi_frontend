"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { exchangeKakaoLoginCode } from "@/services/authService";
import { useAuthStore } from "@/store/useAuthStore";
import { useBankStore } from "@/store/useBankStore";

const NEW_USER_RETURN_PATH = "/accounts/connect";
const RETURNING_USER_RETURN_PATH = "/accounts";

function getCallbackValidationError(
  code: string | null,
  callbackError: string | null,
): string {
  if (callbackError) {
    return "카카오 로그인이 취소되었거나 만료되었습니다. 다시 시도해 주세요.";
  }
  if (!code) {
    return "카카오 로그인에 필요한 일회성 코드가 없습니다. 다시 시도해 주세요.";
  }
  return "";
}

function KakaoLoginCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setBackendSession = useAuthStore((state) => state.setBackendSession);
  const setUser = useBankStore((state) => state.setUser);
  const exchangeStartedRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [callbackParams] = useState(() => ({
    code: searchParams.get("code"),
    callbackError: searchParams.get("error"),
  }));
  const { code, callbackError } = callbackParams;
  const callbackValidationError = getCallbackValidationError(
    code,
    callbackError,
  );

  useEffect(() => {
    if (exchangeStartedRef.current) return;
    exchangeStartedRef.current = true;

    // 일회성 코드와 오류 값을 브라우저 기록·리퍼러에 남기지 않는다.
    window.history.replaceState(null, "", window.location.pathname);

    if (callbackValidationError || !code) return;

    const completeLogin = async () => {
      try {
        const { session, refreshToken } = await exchangeKakaoLoginCode(code);
        setBackendSession(session, refreshToken);
        setUser({ id: session.userId, name: session.displayName });
        router.replace(
          session.backend?.isNewUser
            ? NEW_USER_RETURN_PATH
            : RETURNING_USER_RETURN_PATH,
        );
      } catch {
        setErrorMessage(
          "카카오 로그인 코드가 만료되었거나 이미 사용되었습니다. 다시 로그인해 주세요.",
        );
      }
    };

    void completeLogin();
  }, [callbackValidationError, code, router, setBackendSession, setUser]);

  const visibleErrorMessage = callbackValidationError || errorMessage;

  if (visibleErrorMessage) {
    return (
      <main
        id="main-content"
        className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col justify-center px-6 py-12"
      >
        <h1 className="text-2xl font-bold">
          카카오 로그인을 완료하지 못했습니다.
        </h1>
        <p className="mt-4 text-lg leading-8 text-[var(--color-text-muted)]">
          {visibleErrorMessage}
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-14 w-fit items-center rounded-2xl border-2 border-transparent bg-[var(--color-primary)] px-5 text-[17px] font-semibold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
        >
          로그인 화면으로 돌아가기
        </Link>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col justify-center px-6 py-12"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="text-lg font-semibold">
        카카오 로그인을 완료하고 있어요.
      </p>
    </main>
  );
}

export default function KakaoLoginCallbackPage() {
  return (
    <Suspense fallback={null}>
      <KakaoLoginCallback />
    </Suspense>
  );
}

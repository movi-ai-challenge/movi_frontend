"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { AppScreen } from "@/components/common/AppScreen";
import { authenticateWithMock } from "@/services/authService";
import { useAuthStore } from "@/store/useAuthStore";
import { useBankStore } from "@/store/useBankStore";

const PIN_LENGTH = 6;
const DEFAULT_RETURN_PATH = "/accounts";

type KeypadKey = number | "bio" | "delete";

const KEYPAD: readonly KeypadKey[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, "bio", 0, "delete"];

function getSafeReturnPath(): string {
  const requestedPath = new URLSearchParams(window.location.search).get("next");
  if (
    !requestedPath ||
    !requestedPath.startsWith("/") ||
    requestedPath.startsWith("//") ||
    requestedPath.startsWith("/login")
  ) {
    return DEFAULT_RETURN_PATH;
  }

  return requestedPath;
}

/**
 * PIN 로그인 (명세 "pin 또는 생체인증 로그인")
 *
 * 입력한 자리 수만 점으로 표시하고 숫자 자체는 화면과 낭독기 어디에도
 * 남기지 않는다. 키패드 버튼의 접근성 이름도 "1번" 처럼 눌린 값이
 * 소리로 새어 나가지 않게 최소한으로 둔다.
 */
export default function PinLoginPage() {
  const router = useRouter();
  const [digitCount, setDigitCount] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [authenticationError, setAuthenticationError] = useState("");
  const setSession = useAuthStore((state) => state.setSession);
  const setUser = useBankStore((state) => state.setUser);
  const errorRef = useRef<HTMLParagraphElement>(null);

  const authenticate = async (method: "PIN" | "생체인증") => {
    setIsVerifying(true);
    setAuthenticationError("");

    try {
      const session = await authenticateWithMock(method);
      setSession(session);
      setUser({ id: session.userId, name: session.displayName });
      router.push(getSafeReturnPath());
    } catch {
      setDigitCount(0);
      setAuthenticationError("본인 확인을 완료하지 못했습니다. 다시 입력해 주세요.");
      window.setTimeout(() => errorRef.current?.focus(), 0);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKey = (key: KeypadKey) => {
    if (isVerifying) return;

    if (key === "bio") {
      void authenticate("생체인증");
      return;
    }

    if (key === "delete") {
      setDigitCount((count) => Math.max(0, count - 1));
      return;
    }

    setDigitCount((count) => {
      const next = Math.min(PIN_LENGTH, count + 1);
      if (next === PIN_LENGTH) void authenticate("PIN");
      return next;
    });
  };

  return (
    <AppScreen className="gap-5 pb-8 pt-6">
      <nav aria-label="이전 단계">
        <Link
          href="/login"
          aria-label="로그인 방법 다시 고르기"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
        >
          <span aria-hidden="true">←</span>
        </Link>
      </nav>

      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <h1 className="text-xl font-extrabold">PIN 번호 입력</h1>
        <p className="text-[13px] text-[var(--color-text-muted)]">
          {PIN_LENGTH}자리 PIN을 입력해 주세요
        </p>

        {/* 입력 자리 표시 */}
        <div className="mt-6 flex gap-3.5" role="status" aria-label={`${digitCount}자리 입력됨`}>
          {Array.from({ length: PIN_LENGTH }).map((_, index) => (
            <span
              key={index}
              aria-hidden="true"
              className={`h-4 w-4 rounded-full border-2 ${
                index < digitCount
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
                  : "border-[var(--color-border-strong)]"
              }`}
            />
          ))}
        </div>

        <p className="min-h-6 text-[13px]" aria-live="assertive">
          {authenticationError ? (
            <span ref={errorRef} tabIndex={-1} role="alert" className="text-[var(--color-danger)]">
              {authenticationError}
            </span>
          ) : isVerifying ? (
            <span className="text-[var(--color-text-muted)]">확인하고 있어요...</span>
          ) : null}
        </p>
      </div>

      {/* 키패드 */}
      <div className="grid grid-cols-3 gap-2.5">
        {KEYPAD.map((key) => (
          <button
            key={String(key)}
            type="button"
            disabled={isVerifying}
            onClick={() => handleKey(key)}
            className={`flex h-16 items-center justify-center rounded-2xl text-xl font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 disabled:opacity-50 motion-reduce:transition-none ${
              typeof key === "number"
                ? "bg-[var(--color-surface-raised)] text-[var(--color-text)]"
                : "bg-[var(--color-surface)] text-[var(--color-text-muted)]"
            }`}
          >
            {key === "delete" ? (
              <>
                <span aria-hidden="true">⌫</span>
                <span className="sr-only">한 자리 지우기</span>
              </>
            ) : key === "bio" ? (
              <>
                <span aria-hidden="true">👆</span>
                <span className="sr-only">생체인증으로 로그인</span>
              </>
            ) : (
              key
            )}
          </button>
        ))}
      </div>
    </AppScreen>
  );
}

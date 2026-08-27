"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { toApiError } from "@/services/api";
import { parseOpenBankingCallbackResult } from "@/services/openBankingContract";
import { getConnectedAccountCount } from "@/services/openBankingService";

type CallbackStatus = "checking" | "connected" | "empty" | "error";

function OpenBankingCallback() {
  const searchParams = useSearchParams();
  const startedRef = useRef(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const [callbackParams] = useState(() => ({
    result: searchParams.get("result"),
    error: searchParams.get("error"),
  }));
  const callbackResult = parseOpenBankingCallbackResult(
    callbackParams.result,
    callbackParams.error,
  );
  const initialErrorMessage =
    callbackResult === "error"
      ? "계좌 연결이 취소되었거나 완료되지 않았습니다. 처음부터 다시 시도해 주세요."
      : callbackResult === "invalid"
        ? "계좌 연결 결과를 확인할 수 없습니다. 처음부터 다시 시도해 주세요."
        : "";
  const [status, setStatus] = useState<CallbackStatus>(
    callbackResult === "success" ? "checking" : "error",
  );
  const [accountCount, setAccountCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage);
  const [canRetryAccountQuery, setCanRetryAccountQuery] = useState(false);

  const loadConnectedAccountCount = useCallback(async () => {
    try {
      const count = await getConnectedAccountCount();
      setAccountCount(count);
      setStatus(count > 0 ? "connected" : "empty");
    } catch (error: unknown) {
      setErrorMessage(toApiError(error).message);
      setCanRetryAccountQuery(true);
      setStatus("error");
      window.setTimeout(() => errorRef.current?.focus(), 0);
    }
  }, []);

  const retryConnectedAccountCount = () => {
    setStatus("checking");
    setErrorMessage("");
    setCanRetryAccountQuery(false);
    void loadConnectedAccountCount();
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    // callback 결과와 오류 코드를 브라우저 기록·리퍼러에 남기지 않는다.
    window.history.replaceState(null, "", window.location.pathname);

    if (callbackResult !== "success") {
      window.setTimeout(() => errorRef.current?.focus(), 0);
      return;
    }

    void getConnectedAccountCount()
      .then((count) => {
        setAccountCount(count);
        setStatus(count > 0 ? "connected" : "empty");
      })
      .catch((error: unknown) => {
        setErrorMessage(toApiError(error).message);
        setCanRetryAccountQuery(true);
        setStatus("error");
        window.setTimeout(() => errorRef.current?.focus(), 0);
      });
  }, [callbackResult]);

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col justify-center px-6 py-12"
      aria-live="polite"
      aria-busy={status === "checking"}
    >
      {status === "checking" ? (
        <>
          <h1 className="text-3xl font-bold">연결된 계좌를 확인하고 있어요</h1>
          <p className="mt-4 leading-7 text-[var(--color-text-muted)]">
            잠시만 기다려 주세요.
          </p>
        </>
      ) : null}

      {status === "connected" ? (
        <>
          <p className="font-bold text-[var(--color-success)]">연결 완료</p>
          <h1 className="mt-2 text-3xl font-bold">
            계좌 {accountCount}개를 확인했습니다
          </h1>
          <p className="mt-4 leading-7 text-[var(--color-text-muted)]">
            계좌번호는 안전을 위해 일부만 표시합니다.
          </p>
          <Link
            href="/accounts"
            className="mt-6 inline-flex min-h-14 items-center justify-center rounded-2xl border-2 border-transparent bg-[var(--color-primary)] px-5 text-[17px] font-semibold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
          >
            연결된 계좌 보기
          </Link>
        </>
      ) : null}

      {status === "empty" ? (
        <>
          <h1 className="text-3xl font-bold">연결된 계좌가 없습니다</h1>
          <p className="mt-4 leading-7 text-[var(--color-text-muted)]">
            오픈뱅킹에서 연결할 계좌를 선택한 뒤 다시 시도해 주세요.
          </p>
          <Link
            href="/accounts/connect"
            className="mt-6 inline-flex min-h-14 items-center justify-center rounded-2xl border-2 border-transparent bg-[var(--color-primary)] px-5 text-[17px] font-semibold text-[var(--color-on-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
          >
            계좌 연결 다시 시작
          </Link>
        </>
      ) : null}

      {status === "error" ? (
        <>
          <h1 className="text-3xl font-bold">계좌 연결을 완료하지 못했습니다</h1>
          <div
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="mt-5 rounded-lg border-2 border-[var(--color-danger)] bg-[var(--color-surface)] p-4 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
          >
            {errorMessage}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href="/accounts/connect"
              className="inline-flex min-h-14 items-center justify-center rounded-2xl border-2 border-transparent bg-[var(--color-primary)] px-5 text-center text-[17px] font-semibold text-[var(--color-on-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
            >
              처음부터 다시 연결
            </Link>
            {canRetryAccountQuery ? (
              <AccessibleButton
                variant="secondary"
                onClick={retryConnectedAccountCount}
              >
                계좌 목록 다시 확인
              </AccessibleButton>
            ) : null}
          </div>
        </>
      ) : null}
    </main>
  );
}

export default function OpenBankingCallbackPage() {
  return (
    <Suspense fallback={null}>
      <OpenBankingCallback />
    </Suspense>
  );
}

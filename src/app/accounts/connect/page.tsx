"use client";

import { useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { PageBackLink } from "@/components/common/PageBackLink";
import { toApiError } from "@/services/api";
import { startOpenBankingConnection } from "@/services/openBankingService";

export default function AccountConnectionPage() {
  const [hasConsent, setHasConsent] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);

  const startConnection = async () => {
    if (!hasConsent || isStarting) return;

    setIsStarting(true);
    setErrorMessage("");
    try {
      const authorizationUrl = await startOpenBankingConnection();
      window.location.assign(authorizationUrl);
    } catch (error: unknown) {
      setErrorMessage(toApiError(error).message);
      setIsStarting(false);
      window.setTimeout(() => errorRef.current?.focus(), 0);
    }
  };

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col justify-center px-6 py-12">
      <PageBackLink href="/accounts">계좌 화면으로</PageBackLink>

      <p
        className="text-base font-bold text-[var(--color-accent)]"
        data-secondary-content="true"
      >
        오픈뱅킹 계좌 연결
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">
        사용할 계좌를 연결할게요
      </h1>
      <p
        className="mt-4 text-lg leading-8 text-[var(--color-text-muted)]"
        data-secondary-content="true"
      >
        연결을 시작하면 오픈뱅킹 인증 화면으로 이동합니다. 인증을 마치면
        MOVI로 안전하게 돌아옵니다.
      </p>

      <section
        className="mt-8 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-5"
        aria-labelledby="connection-consent-title"
      >
        <h2 id="connection-consent-title" className="text-xl font-bold">
          연결 전 확인
        </h2>
        <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
          동의한 계좌 정보만 MOVI에서 조회하고 금융 기능에 사용합니다.
        </p>

        <label className="mt-5 flex min-h-14 cursor-pointer items-center gap-4 rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-background)] p-4">
          <input
            type="checkbox"
            checked={hasConsent}
            onChange={(event) => setHasConsent(event.target.checked)}
            className="h-7 w-7 shrink-0 accent-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
          />
          <span className="font-semibold">
            오픈뱅킹 계좌 연결에 필요한 정보 사용에 동의합니다.
          </span>
        </label>
      </section>

      <AccessibleButton
        className="mt-6 w-full"
        isLoading={isStarting}
        loadingLabel="오픈뱅킹 인증 화면으로 이동하고 있어요"
        disabled={!hasConsent}
        onClick={() => void startConnection()}
      >
        계좌 연결 시작하기
      </AccessibleButton>

      {!hasConsent ? (
        <p className="mt-3 text-center text-sm text-[var(--color-text-muted)]">
          동의 항목을 확인하면 연결을 시작할 수 있어요.
        </p>
      ) : null}

      <div className="mt-6 min-h-20" aria-live="polite" aria-atomic="true">
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
    </main>
  );
}

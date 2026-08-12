"use client";

import Link from "next/link";
import { useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";

type ConnectionStatus = "idle" | "connecting" | "started";

export default function AccountConnectionPage() {
  const [hasConsent, setHasConsent] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("idle");

  const startConnection = () => {
    if (!hasConsent || status === "connecting") return;

    setStatus("connecting");
    window.setTimeout(() => setStatus("started"), 700);
  };

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col justify-center px-6 py-12">
      <Link
        href="/login"
        className="mb-8 w-fit rounded-md font-semibold text-[var(--color-primary)] underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
      >
        로그인 화면으로
      </Link>

      <p
        className="text-base font-bold text-[var(--color-primary)]"
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
        연결을 시작하면 오픈뱅킹 인증 절차로 이동합니다. 현재 목업에서는
        Sandbox 연결 과정을 보여드려요.
      </p>

      <section
        className="mt-8 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-5"
        aria-labelledby="connection-consent-title"
      >
        <h2 id="connection-consent-title" className="text-xl font-bold">
          연결 전 확인
        </h2>
        <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
          사용자가 동의한 뒤에만 계좌 연결을 시작합니다.
        </p>

        <label className="mt-5 flex min-h-14 cursor-pointer items-center gap-4 rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-background)] p-4">
          <input
            type="checkbox"
            checked={hasConsent}
            onChange={(event) => setHasConsent(event.target.checked)}
            className="h-7 w-7 shrink-0 accent-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
          />
          <span className="font-semibold">
            계좌 연결에 필요한 정보 사용에 동의합니다.
          </span>
        </label>
      </section>

      <AccessibleButton
        className="mt-6 w-full"
        isLoading={status === "connecting"}
        loadingLabel="계좌 연결을 준비하고 있어요"
        disabled={!hasConsent || status === "started"}
        onClick={startConnection}
      >
        계좌 연결 시작하기
      </AccessibleButton>

      {!hasConsent ? (
        <p className="mt-3 text-center text-sm text-[var(--color-text-muted)]">
          동의 항목을 확인하면 연결을 시작할 수 있어요.
        </p>
      ) : null}

      <div className="mt-6 min-h-20" aria-live="polite" aria-atomic="true">
        {status === "started" ? (
          <div className="rounded-lg border-2 border-[var(--color-success)] bg-[var(--color-surface)] p-4">
            <p className="font-bold">Sandbox 계좌 연결을 시작했습니다.</p>
            <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
              실제 연동에서는 오픈뱅킹 인증 절차가 이어집니다.
            </p>
          </div>
        ) : null}
      </div>
    </main>
  );
}

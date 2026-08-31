"use client";

import Link from "next/link";
import { useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { AppScreen } from "@/components/common/AppScreen";
import { SurfaceCard } from "@/components/common/SurfaceCard";

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
    <AppScreen
      className="gap-4 pt-6"
      footer={
        <>
          <AccessibleButton
            className="w-full"
            isLoading={status === "connecting"}
            loadingLabel="계좌 연결을 준비하고 있어요"
            disabled={!hasConsent || status === "started"}
            onClick={startConnection}
          >
            계좌 연결 시작하기
          </AccessibleButton>
          {!hasConsent ? (
            <p className="text-center text-[13px] text-[var(--color-text-muted)]">
              동의 항목을 확인하면 연결을 시작할 수 있어요.
            </p>
          ) : null}
        </>
      }
    >
      <nav aria-label="이전 단계">
        <Link
          href="/login"
          aria-label="로그인 화면으로"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
        >
          <span aria-hidden="true">←</span>
        </Link>
      </nav>

      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-extrabold tracking-tight">계좌 연결</h1>
        <p
          className="text-[15px] leading-relaxed text-[var(--color-text-muted)]"
          data-secondary-content="true"
        >
          오픈뱅킹으로 계좌를 연결해 주세요. 현재 목업에서는 Sandbox 연결 과정을 보여드려요.
        </p>
      </div>

      <SurfaceCard as="section" className="p-5" aria-labelledby="connection-consent-title">
        <h2 id="connection-consent-title" className="text-[15px] font-bold">
          연결 전 확인
        </h2>
        <p
          className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-text-muted)]"
          data-secondary-content="true"
        >
          사용자가 동의한 뒤에만 계좌 연결을 시작합니다.
        </p>

        <label
          className={`mt-4 flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${
            hasConsent
              ? "border-[var(--color-accent)] bg-[var(--color-surface-raised)]"
              : "border-[var(--color-border)] bg-[var(--color-surface-sunken)]"
          }`}
        >
          <input
            type="checkbox"
            checked={hasConsent}
            onChange={(event) => setHasConsent(event.target.checked)}
            className="h-7 w-7 shrink-0 accent-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
          />
          <span className="text-[14px] font-semibold">
            계좌 연결에 필요한 정보 사용에 동의합니다.
          </span>
        </label>
      </SurfaceCard>

      <div className="min-h-20" aria-live="polite" aria-atomic="true">
        {status === "started" ? (
          <SurfaceCard className="border-[var(--color-success-border)] bg-[var(--color-success-surface)] p-5">
            <p className="text-[15px] font-bold">Sandbox 계좌 연결을 시작했습니다.</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
              실제 연동에서는 오픈뱅킹 인증 절차가 이어집니다.
            </p>
            <Link
              href="/accounts/register"
              className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[var(--color-primary)] px-5 font-semibold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
            >
              연결된 계좌 확인하기
            </Link>
          </SurfaceCard>
        ) : null}
      </div>
    </AppScreen>
  );
}

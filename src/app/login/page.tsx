"use client";

import Link from "next/link";
import { useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";

type AuthenticationMethod = "PASS" | "카카오" | "PIN" | "생체인증";

export default function LoginPage() {
  const [pendingMethod, setPendingMethod] =
    useState<AuthenticationMethod | null>(null);
  const [completedMethod, setCompletedMethod] =
    useState<AuthenticationMethod | null>(null);

  const authenticate = (method: AuthenticationMethod) => {
    setCompletedMethod(null);
    setPendingMethod(method);

    window.setTimeout(() => {
      setPendingMethod(null);
      setCompletedMethod(method);
    }, 700);
  };

  const isPending = pendingMethod !== null;

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col justify-center px-6 py-12"
    >
      <Link
        href="/"
        className="mb-8 w-fit rounded-md font-semibold text-[var(--color-primary)] underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
      >
        처음 화면으로
      </Link>

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

      <div className="mt-8">
        <AccessibleButton
          className="w-full"
          isLoading={pendingMethod === "PASS"}
          loadingLabel="PASS 인증을 준비하고 있어요"
          disabled={isPending}
          onClick={() => authenticate("PASS")}
        >
          PASS로 시작하기
        </AccessibleButton>
      </div>

      <details className="mt-4 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <summary className="min-h-11 cursor-pointer rounded-md py-2 font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2">
          다른 로그인 방법 보기
        </summary>
        <div className="mt-4 grid gap-3">
          <AccessibleButton
            variant="secondary"
            isLoading={pendingMethod === "카카오"}
            loadingLabel="카카오 인증을 준비하고 있어요"
            disabled={isPending}
            onClick={() => authenticate("카카오")}
          >
            카카오로 시작하기
          </AccessibleButton>
          <AccessibleButton
            variant="secondary"
            isLoading={pendingMethod === "PIN"}
            loadingLabel="PIN 로그인을 준비하고 있어요"
            disabled={isPending}
            onClick={() => authenticate("PIN")}
          >
            PIN으로 로그인
          </AccessibleButton>
          <AccessibleButton
            variant="secondary"
            isLoading={pendingMethod === "생체인증"}
            loadingLabel="생체인증을 준비하고 있어요"
            disabled={isPending}
            onClick={() => authenticate("생체인증")}
          >
            생체인증으로 로그인
          </AccessibleButton>
        </div>
      </details>

      <div className="mt-6 min-h-16" aria-live="polite" aria-atomic="true">
        {completedMethod ? (
          <p className="rounded-lg border-2 border-[var(--color-success)] bg-[var(--color-surface)] p-4 font-semibold">
            {completedMethod} Mock 인증을 완료했습니다.
          </p>
        ) : null}
      </div>
    </main>
  );
}

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

      <section className="mt-8" aria-labelledby="new-user-login-title">
        <h2 id="new-user-login-title" className="text-xl font-bold">
          처음 이용하시나요?
        </h2>
        <p
          className="mt-2 leading-7 text-[var(--color-text-muted)]"
          data-secondary-content="true"
        >
          편한 방법으로 본인 확인을 시작하세요.
        </p>
        <AccessibleButton
          className="mt-4 w-full"
          isLoading={pendingMethod === "PASS"}
          loadingLabel="PASS 인증을 준비하고 있어요"
          disabled={isPending}
          onClick={() => authenticate("PASS")}
        >
          PASS로 시작하기
        </AccessibleButton>
        <AccessibleButton
          className="mt-3 w-full"
          variant="secondary"
          isLoading={pendingMethod === "카카오"}
          loadingLabel="카카오 인증을 준비하고 있어요"
          disabled={isPending}
          onClick={() => authenticate("카카오")}
        >
          카카오로 시작하기
        </AccessibleButton>
      </section>

      <section
        className="mt-8 border-t-2 border-[var(--color-border)] pt-8"
        aria-labelledby="returning-user-login-title"
      >
        <h2 id="returning-user-login-title" className="text-xl font-bold">
          이미 이용한 적이 있나요?
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
      </section>

      <div className="mt-6 min-h-16" aria-live="polite" aria-atomic="true">
        {completedMethod ? (
          <div className="rounded-lg border-2 border-[var(--color-success)] bg-[var(--color-surface)] p-4">
            <p className="font-semibold">
              {completedMethod} Mock 인증을 완료했습니다.
            </p>
            <Link
              href="/accounts/connect"
              className="mt-4 inline-flex min-h-11 items-center rounded-lg border-2 border-transparent bg-[var(--color-primary)] px-5 py-2 font-semibold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
            >
              계좌 연결하기
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import {
  getPendingConnectedAccount,
  registerConnectedAccount,
} from "@/services/accountRegistrationService";
import { useBankStore } from "@/store/useBankStore";

type RegistrationStatus = "idle" | "registering" | "registered" | "error";

export default function AccountRegistrationPage() {
  const candidate = getPendingConnectedAccount();
  const accounts = useBankStore((state) => state.accounts);
  const setAccounts = useBankStore((state) => state.setAccounts);
  const [status, setStatus] = useState<RegistrationStatus>("idle");

  const registerAccount = async () => {
    if (!candidate || status === "registering") return;

    setStatus("registering");

    try {
      const registeredAccount = await registerConnectedAccount(candidate);
      setAccounts([
        ...accounts.filter((account) => account.id !== registeredAccount.id),
        registeredAccount,
      ]);
      setStatus("registered");
    } catch {
      setStatus("error");
    }
  };

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col justify-center px-6 py-12">
      <Link
        href="/accounts/connect"
        className="mb-8 w-fit rounded-md font-semibold text-[var(--color-primary)] underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
      >
        계좌 연결 화면으로
      </Link>

      <p
        className="text-base font-bold text-[var(--color-primary)]"
        data-secondary-content="true"
      >
        연결된 계좌 확인
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">
        이 계좌를 등록할까요?
      </h1>
      <p
        className="mt-4 text-lg leading-8 text-[var(--color-text-muted)]"
        data-secondary-content="true"
      >
        계좌번호는 안전을 위해 일부만 보여드려요.
      </p>

      {candidate ? (
        <section
          className="mt-8 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-5"
          aria-labelledby="connected-account-title"
        >
          <h2 id="connected-account-title" className="text-xl font-bold">
            연결된 계좌
          </h2>
          <dl className="mt-5 grid gap-4">
            <div>
              <dt className="text-sm font-semibold text-[var(--color-text-muted)]">
                은행
              </dt>
              <dd className="mt-1 text-xl font-bold">{candidate.bankName}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-[var(--color-text-muted)]">
                계좌 이름
              </dt>
              <dd className="mt-1 text-lg font-semibold">
                {candidate.accountName}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-[var(--color-text-muted)]">
                계좌번호
              </dt>
              <dd className="mt-1 text-lg font-semibold">
                {candidate.maskedAccountNumber}
              </dd>
            </div>
          </dl>
        </section>
      ) : (
        <div
          className="mt-8 rounded-xl border-2 border-[var(--color-danger)] bg-[var(--color-surface)] p-5"
          role="alert"
        >
          <h2 className="text-xl font-bold">연결된 계좌를 찾지 못했습니다.</h2>
          <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
            계좌 연결 화면으로 돌아가 다시 시도해 주세요.
          </p>
        </div>
      )}

      {candidate ? (
        <AccessibleButton
          className="mt-6 w-full"
          isLoading={status === "registering"}
          loadingLabel="계좌를 등록하고 있어요"
          disabled={status === "registered"}
          onClick={registerAccount}
        >
          이 계좌 등록하기
        </AccessibleButton>
      ) : null}

      <div className="mt-6 min-h-20" aria-live="polite" aria-atomic="true">
        {status === "registered" ? (
          <p className="rounded-lg border-2 border-[var(--color-success)] bg-[var(--color-surface)] p-4 font-bold">
            계좌를 등록했습니다.
          </p>
        ) : null}
        {status === "error" ? (
          <div className="rounded-lg border-2 border-[var(--color-danger)] bg-[var(--color-surface)] p-4" role="alert">
            <p className="font-bold">계좌를 등록하지 못했습니다.</p>
            <p className="mt-2 text-[var(--color-text-muted)]">
              잠시 후 다시 시도해 주세요.
            </p>
          </div>
        ) : null}
      </div>
    </main>
  );
}

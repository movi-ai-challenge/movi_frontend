"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { PageBackLink } from "@/components/common/PageBackLink";
import { AccountApiError } from "@/components/domain/accounts/AccountApiError";
import { getConnectedAccounts } from "@/services/accountService";
import { toApiError, type ApiError } from "@/services/api";
import { getAccountBalance } from "@/services/balanceService";
import { useBankStore } from "@/store/useBankStore";
import type { Account } from "@/types";

type BalanceStatus = "loading-accounts" | "ready" | "checking" | "error";

const currencyFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

export default function BalanceInquiryPage() {
  const accounts = useBankStore((state) => state.accounts);
  const defaultAccountId = useBankStore((state) => state.defaultAccountId);
  const setAccounts = useBankStore((state) => state.setAccounts);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [balanceAccount, setBalanceAccount] = useState<Account | null>(null);
  const [status, setStatus] = useState<BalanceStatus>("loading-accounts");
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    let isActive = true;

    void getConnectedAccounts()
      .then((connectedAccounts) => {
        if (!isActive) return;

        setAccounts(connectedAccounts);
        const preferredAccount = connectedAccounts.find(
          (account) => account.id === defaultAccountId,
        );
        setSelectedAccountId(
          preferredAccount?.id ?? connectedAccounts[0]?.id ?? "",
        );
        setStatus("ready");
      })
      .catch((loadError: unknown) => {
        if (!isActive) return;
        setError(toApiError(loadError));
        setStatus("error");
      });

    return () => {
      isActive = false;
    };
  }, [defaultAccountId, setAccounts]);

  const checkBalance = async () => {
    if (!selectedAccountId || status === "checking") return;

    setStatus("checking");
    setBalanceAccount(null);
    setError(null);

    try {
      const account = await getAccountBalance(selectedAccountId);
      setBalanceAccount(account);
      setStatus("ready");
    } catch (balanceError: unknown) {
      setError(toApiError(balanceError));
      setStatus("error");
    }
  };

  const retry = () => {
    if (selectedAccountId) {
      void checkBalance();
      return;
    }

    window.location.reload();
  };

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-xl px-6 py-12">
      <PageBackLink href="/accounts">연결된 계좌로</PageBackLink>

      <p
        className="text-base font-bold text-[var(--color-primary)]"
        data-secondary-content="true"
      >
        잔액조회
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">
        어느 계좌의 잔액을 볼까요?
      </h1>
      <p
        className="mt-4 text-lg leading-8 text-[var(--color-text-muted)]"
        data-secondary-content="true"
      >
        기본 계좌가 먼저 선택되어 있어요. 다른 계좌도 선택할 수 있습니다.
      </p>

      <div className="mt-8" aria-live="polite" aria-busy={status === "loading-accounts" || status === "checking"}>
        {status === "loading-accounts" ? (
          <p className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-lg font-semibold">
            계좌 정보를 불러오고 있어요.
          </p>
        ) : null}

        {status === "error" && error ? (
          <AccountApiError error={error} onRetry={retry} />
        ) : null}

        {status !== "loading-accounts" && accounts.length === 0 && !error ? (
          <section className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <h2 className="text-xl font-bold">조회할 계좌가 없습니다.</h2>
            <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
              먼저 사용할 계좌를 연결해 주세요.
            </p>
            <Link
              href="/accounts/connect"
              className="mt-5 inline-flex min-h-11 items-center rounded-lg border-2 border-transparent bg-[var(--color-primary)] px-5 py-2 font-semibold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
            >
              계좌 연결하기
            </Link>
          </section>
        ) : null}

        {accounts.length > 0 && status !== "loading-accounts" ? (
          <section aria-labelledby="balance-account-title">
            <h2 id="balance-account-title" className="text-xl font-bold">
              조회할 계좌 선택
            </h2>
            <label className="mt-4 block font-semibold" htmlFor="balance-account">
              계좌
            </label>
            <select
              id="balance-account"
              value={selectedAccountId}
              disabled={status === "checking"}
              onChange={(event) => {
                setSelectedAccountId(event.target.value);
                setBalanceAccount(null);
                setError(null);
              }}
              className="mt-2 min-h-14 w-full rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-lg text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.accountName} · {account.bankName} · {account.maskedAccountNumber}
                  {account.id === defaultAccountId ? " · 기본 계좌" : ""}
                </option>
              ))}
            </select>
            <AccessibleButton
              className="mt-5 w-full"
              isLoading={status === "checking"}
              loadingLabel="잔액을 확인하고 있어요"
              onClick={() => void checkBalance()}
            >
              선택한 계좌 잔액 확인하기
            </AccessibleButton>
          </section>
        ) : null}

        {balanceAccount ? (
          <section
            className="mt-8 rounded-xl border-2 border-[var(--color-success)] bg-[var(--color-surface)] p-6"
            aria-labelledby="balance-result-title"
          >
            <h2 id="balance-result-title" className="text-xl font-bold">
              현재 잔액
            </h2>
            <p className="mt-4 text-4xl font-bold">
              {currencyFormatter.format(balanceAccount.balance)}
            </p>
            <p className="mt-5 text-lg font-semibold">
              {balanceAccount.accountName} · {balanceAccount.bankName}
            </p>
            <p className="mt-1 text-[var(--color-text-muted)]">
              {balanceAccount.maskedAccountNumber}
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { getConnectedAccounts } from "@/services/accountService";
import { getRecentTransactions } from "@/services/transactionService";
import { useBankStore } from "@/store/useBankStore";
import type { Account, Transaction, TransactionType } from "@/types";

type TransactionListStatus = "loading" | "ready" | "error";

const typeLabels: Record<TransactionType, string> = {
  deposit: "입금",
  withdrawal: "출금",
  transfer: "이체",
};

const currencyFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default function TransactionListPage() {
  const defaultAccountId = useBankStore((state) => state.defaultAccountId);
  const setAccounts = useBankStore((state) => state.setAccounts);
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [status, setStatus] = useState<TransactionListStatus>("loading");

  const loadTransactions = async () => {
    setStatus("loading");

    try {
      const connectedAccounts = await getConnectedAccounts();
      setAccounts(connectedAccounts);
      const targetAccount =
        connectedAccounts.find((item) => item.id === defaultAccountId) ??
        connectedAccounts[0] ??
        null;

      setAccount(targetAccount);

      if (!targetAccount) {
        setTransactions([]);
        setStatus("ready");
        return;
      }

      const recentTransactions = await getRecentTransactions(targetAccount.id);
      setTransactions(recentTransactions);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    let isActive = true;

    void (async () => {
      try {
        const connectedAccounts = await getConnectedAccounts();
        if (!isActive) return;

        setAccounts(connectedAccounts);
        const targetAccount =
          connectedAccounts.find((item) => item.id === defaultAccountId) ??
          connectedAccounts[0] ??
          null;
        setAccount(targetAccount);

        if (!targetAccount) {
          setStatus("ready");
          return;
        }

        const recentTransactions = await getRecentTransactions(targetAccount.id);
        if (!isActive) return;
        setTransactions(recentTransactions);
        setStatus("ready");
      } catch {
        if (isActive) setStatus("error");
      }
    })();

    return () => {
      isActive = false;
    };
  }, [defaultAccountId, setAccounts]);

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-3xl px-6 py-12">
      <Link
        href="/accounts"
        className="mb-8 inline-flex min-h-11 items-center rounded-md font-semibold text-[var(--color-primary)] underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
      >
        연결된 계좌로
      </Link>

      <p
        className="text-base font-bold text-[var(--color-primary)]"
        data-secondary-content="true"
      >
        거래내역
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">
        최근 거래내역
      </h1>
      {account ? (
        <p className="mt-4 text-lg leading-8 text-[var(--color-text-muted)]">
          {account.accountName} · {account.bankName} · {account.maskedAccountNumber}
        </p>
      ) : null}

      <div className="mt-8" aria-live="polite" aria-busy={status === "loading"}>
        {status === "loading" ? (
          <p className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-lg font-semibold">
            최근 거래를 불러오고 있어요.
          </p>
        ) : null}

        {status === "error" ? (
          <section
            className="rounded-xl border-2 border-[var(--color-danger)] bg-[var(--color-surface)] p-6"
            role="alert"
            aria-labelledby="transaction-error-title"
          >
            <h2 id="transaction-error-title" className="text-xl font-bold">
              거래내역을 불러오지 못했습니다.
            </h2>
            <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
              인터넷 연결을 확인하고 다시 시도해 주세요.
            </p>
            <AccessibleButton className="mt-5" onClick={() => void loadTransactions()}>
              다시 불러오기
            </AccessibleButton>
          </section>
        ) : null}

        {status === "ready" && !account ? (
          <section className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <h2 className="text-xl font-bold">조회할 계좌가 없습니다.</h2>
            <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
              거래내역을 보려면 먼저 계좌를 연결해 주세요.
            </p>
            <Link
              href="/accounts/connect"
              className="mt-5 inline-flex min-h-11 items-center rounded-lg border-2 border-transparent bg-[var(--color-primary)] px-5 py-2 font-semibold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
            >
              계좌 연결하기
            </Link>
          </section>
        ) : null}

        {status === "ready" && account && transactions.length === 0 ? (
          <section className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <h2 className="text-xl font-bold">최근 거래내역이 없습니다.</h2>
            <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
              새로운 거래가 생기면 이 화면에서 확인할 수 있어요.
            </p>
          </section>
        ) : null}

        {status === "ready" && transactions.length > 0 ? (
          <section aria-labelledby="recent-transaction-count">
            <h2 id="recent-transaction-count" className="text-xl font-bold">
              최근 거래 {transactions.length}건
            </h2>
            <ol className="mt-4 grid list-none gap-3 p-0">
              {transactions.map((transaction) => {
                const isDeposit = transaction.type === "deposit";
                const amountPrefix = isDeposit ? "+" : "-";

                return (
                  <li
                    key={transaction.id}
                    className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-5"
                  >
                    <article aria-labelledby={`${transaction.id}-description`}>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="font-bold text-[var(--color-primary)]">
                            {typeLabels[transaction.type]}
                          </p>
                          <h3
                            id={`${transaction.id}-description`}
                            className="mt-1 text-xl font-bold"
                          >
                            {transaction.description}
                          </h3>
                        </div>
                        <p className="text-2xl font-bold">
                          <span className="sr-only">
                            {isDeposit ? "들어온 금액" : "나간 금액"}
                          </span>
                          {amountPrefix}
                          {currencyFormatter.format(transaction.amount)}
                        </p>
                      </div>
                      <p className="mt-4 text-[var(--color-text-muted)]">
                        {dateFormatter.format(new Date(transaction.occurredAt))}
                      </p>
                    </article>
                  </li>
                );
              })}
            </ol>
          </section>
        ) : null}
      </div>
    </main>
  );
}

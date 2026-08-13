"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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
  blocked: "차단",
};

const filterTypes: TransactionType[] = [
  "deposit",
  "withdrawal",
  "transfer",
  "blocked",
];

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

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getInitialDateRange() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);

  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end),
  };
}

export default function TransactionListPage() {
  const defaultAccountId = useBankStore((state) => state.defaultAccountId);
  const setAccounts = useBankStore((state) => state.setAccounts);
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [status, setStatus] = useState<TransactionListStatus>("loading");
  const [startDate, setStartDate] = useState(
    () => getInitialDateRange().startDate,
  );
  const [endDate, setEndDate] = useState(
    () => getInitialDateRange().endDate,
  );
  const [dateError, setDateError] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<TransactionType[]>([]);
  const dateErrorRef = useRef<HTMLDivElement>(null);

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

  const filterTransactionsByDate = async () => {
    if (!account) return;

    if (!startDate || !endDate) {
      setDateError("시작일과 종료일을 모두 입력해 주세요.");
      window.setTimeout(() => dateErrorRef.current?.focus(), 0);
      return;
    }

    if (startDate > endDate) {
      setDateError("시작일은 종료일보다 늦을 수 없습니다.");
      window.setTimeout(() => dateErrorRef.current?.focus(), 0);
      return;
    }

    setDateError("");
    setStatus("loading");

    try {
      const filteredTransactions = await getRecentTransactions(account.id, {
        startDate,
        endDate,
      }, selectedTypes);
      setTransactions(filteredTransactions);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  };

  const toggleTransactionType = (type: TransactionType) => {
    setSelectedTypes((currentTypes) =>
      currentTypes.includes(type)
        ? currentTypes.filter((currentType) => currentType !== type)
        : [...currentTypes, type],
    );
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

        {status === "ready" && account ? (
          <section
            className="mb-8 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-5"
            aria-labelledby="date-range-title"
          >
            <h2 id="date-range-title" className="text-xl font-bold">
              조회 기간
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="transaction-start-date" className="font-semibold">
                  시작일
                </label>
                <input
                  id="transaction-start-date"
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  aria-invalid={dateError ? "true" : undefined}
                  aria-describedby={dateError ? "date-range-error" : undefined}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="mt-2 min-h-14 w-full rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-lg text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
                />
              </div>
              <div>
                <label htmlFor="transaction-end-date" className="font-semibold">
                  종료일
                </label>
                <input
                  id="transaction-end-date"
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  aria-invalid={dateError ? "true" : undefined}
                  aria-describedby={dateError ? "date-range-error" : undefined}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="mt-2 min-h-14 w-full rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-lg text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
                />
              </div>
            </div>
            <fieldset className="mt-5 border-t-2 border-[var(--color-border)] pt-5">
              <legend className="font-bold">거래 유형</legend>
              <p
                id="transaction-type-help"
                className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]"
              >
                선택하지 않으면 모든 거래를 보여드려요.
              </p>
              <div
                className="mt-3 grid gap-3 sm:grid-cols-2"
                aria-describedby="transaction-type-help"
              >
                {filterTypes.map((type) => (
                  <label
                    key={type}
                    className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-background)] p-3 font-semibold"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type)}
                      onChange={() => toggleTransactionType(type)}
                      className="h-7 w-7 shrink-0 accent-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
                    />
                    {typeLabels[type]}
                  </label>
                ))}
              </div>
            </fieldset>
            {dateError ? (
              <div
                id="date-range-error"
                ref={dateErrorRef}
                tabIndex={-1}
                role="alert"
                className="mt-4 rounded-lg border-2 border-[var(--color-danger)] p-4 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
              >
                {dateError}
              </div>
            ) : null}
            <AccessibleButton
              className="mt-5 w-full sm:w-auto"
              onClick={() => void filterTransactionsByDate()}
            >
              선택한 기간 조회하기
            </AccessibleButton>
          </section>
        ) : null}

        {status === "ready" && account && transactions.length === 0 ? (
          <section className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <h2 className="text-xl font-bold">선택한 기간의 거래가 없습니다.</h2>
            <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
              다른 기간을 선택해 다시 조회해 주세요.
            </p>
          </section>
        ) : null}

        {status === "ready" && transactions.length > 0 ? (
          <section aria-labelledby="recent-transaction-count">
            <h2 id="recent-transaction-count" className="text-xl font-bold">
              조회 결과 {transactions.length}건
            </h2>
            <ol className="mt-4 grid list-none gap-3 p-0">
              {transactions.map((transaction) => {
                const isDeposit = transaction.type === "deposit";
                const isBlocked = transaction.type === "blocked";
                const amountPrefix = isDeposit ? "+" : isBlocked ? "" : "-";

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
                            {isDeposit
                              ? "들어온 금액"
                              : isBlocked
                                ? "차단되어 출금되지 않은 금액"
                                : "나간 금액"}
                          </span>
                          {amountPrefix}
                          {currencyFormatter.format(transaction.amount)}
                        </p>
                      </div>
                      <p className="mt-4 text-[var(--color-text-muted)]">
                        {dateFormatter.format(new Date(transaction.occurredAt))}
                      </p>
                      <Link
                        href={`/transactions/${transaction.id}`}
                        className="mt-4 inline-flex min-h-11 items-center rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 font-semibold text-[var(--color-text)] hover:border-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
                      >
                        이 거래 자세히 보기
                      </Link>
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

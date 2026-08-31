"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { Amount } from "@/components/common/Amount";
import { AppScreen } from "@/components/common/AppScreen";
import { RiskBadge } from "@/components/common/RiskBadge";
import { VoiceTransactionQuery } from "@/components/domain/transactions/VoiceTransactionQuery";
import { TransactionVoiceGuide } from "@/components/domain/transactions/TransactionVoiceGuide";
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


/**
 * 목록 행에 쓰는 짧은 날짜.
 *
 * 행 안에서 두 줄로 접히면 훑어보기 어렵다. 오늘·어제는 말로 쓰고
 * 그 이전은 월/일만 남긴다. 전체 일시는 거래 상세에서 확인한다.
 */
const listTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  hour: "numeric",
  minute: "2-digit",
});

const listDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "numeric",
  day: "numeric",
});

function formatListDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";

  const startOfDay = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();

  const dayDifference = Math.round(
    (startOfDay(new Date()) - startOfDay(date)) / 86_400_000,
  );

  const time = listTimeFormatter.format(date);

  if (dayDifference === 0) return `오늘 ${time}`;
  if (dayDifference === 1) return `어제 ${time}`;

  return `${listDateFormatter.format(date)} ${time}`;
}

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
      const filteredTransactions = await getRecentTransactions(
        account.id,
        { startDate, endDate },
        selectedTypes,
      );
      setTransactions(filteredTransactions);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  };

  const applyVoiceDateRange = async (
    recognizedStartDate: string,
    recognizedEndDate: string,
  ) => {
    if (!account) return;

    setStartDate(recognizedStartDate);
    setEndDate(recognizedEndDate);
    setDateError("");
    setStatus("loading");

    try {
      const filteredTransactions = await getRecentTransactions(
        account.id,
        {
          startDate: recognizedStartDate,
          endDate: recognizedEndDate,
        },
        selectedTypes,
      );
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
    <AppScreen className="gap-5 pb-10 pt-6">
      <header className="flex items-center gap-3">
        <Link
          href="/accounts"
          aria-label="연결된 계좌로"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
        >
          <span aria-hidden="true">←</span>
        </Link>
        <div>
          <h1 className="text-xl font-extrabold">거래 내역</h1>
          {account ? (
            <p className="text-xs text-[var(--color-text-muted)]">
              {account.bankName} {account.maskedAccountNumber}
            </p>
          ) : null}
        </div>
      </header>

      <div className="flex flex-col gap-5" aria-live="polite" aria-busy={status === "loading"}>
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
          <>
            <VoiceTransactionQuery onApplyRange={applyVoiceDateRange} />
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
          </>
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
            <TransactionVoiceGuide transactions={transactions} />
            <ol className="mt-3 grid list-none gap-2 p-0">
              {transactions.map((transaction) => {
                const isDeposit = transaction.type === "deposit";
                const isBlocked = transaction.type === "blocked";
                const amountPrefix = isDeposit ? "+" : isBlocked ? "" : "-";

                return (
                  <li key={transaction.id}>
                    <Link
                      href={`/transactions/${transaction.id}`}
                      aria-labelledby={`${transaction.id}-description`}
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 ${
                        isBlocked
                          ? "border-[var(--color-danger-border)] bg-[var(--color-danger-surface)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface)]"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${
                          isBlocked
                            ? "bg-[var(--color-danger-surface)]"
                            : isDeposit
                              ? "bg-[var(--color-success-surface)]"
                              : "bg-[var(--color-surface-sunken)]"
                        }`}
                      >
                        {isBlocked ? "⚠️" : isDeposit ? "📥" : "📤"}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span
                          id={`${transaction.id}-description`}
                          className="block truncate text-[15px] font-semibold text-[var(--color-text)]"
                        >
                          {transaction.description}
                        </span>
                        <span className="block text-[12px] text-[var(--color-text-muted)]">
                          {typeLabels[transaction.type]} · {formatListDate(transaction.occurredAt)}
                        </span>
                      </span>

                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span
                          className={`text-[15px] font-bold ${
                            isDeposit
                              ? "text-[var(--color-success)]"
                              : isBlocked
                                ? "text-[var(--color-danger)]"
                                : "text-[var(--color-text)]"
                          }`}
                        >
                          <span className="sr-only">
                            {isDeposit
                              ? "들어온 금액"
                              : isBlocked
                                ? "차단되어 출금되지 않은 금액"
                                : "나간 금액"}
                          </span>
                          <span aria-hidden="true">{amountPrefix}</span>
                          <Amount value={transaction.amount} />
                        </span>
                        {isBlocked ? <RiskBadge level="high" label="차단됨" /> : null}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        ) : null}
      </div>
    </AppScreen>
  );
}

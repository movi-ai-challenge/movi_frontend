"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { PageBackLink } from "@/components/common/PageBackLink";
import { TransactionVoiceGuide } from "@/components/domain/transactions/TransactionVoiceGuide";
import { getConnectedAccounts } from "@/services/accountService";
import { toApiError, type ApiError } from "@/services/api";
import { getRecentTransactions } from "@/services/transactionService";
import { useBankStore } from "@/store/useBankStore";
import type {
  Account,
  TransactionPage,
  TransactionType,
} from "@/types";

type TransactionListStatus = "loading" | "ready" | "error";
type TransactionTypeFilter = TransactionType | "ALL";

const PAGE_SIZE = 20;
const typeLabels: Record<TransactionType, string> = {
  IN: "입금",
  OUT: "출금",
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

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getInitialDateRange(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);
  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end),
  };
}

export default function TransactionListPage() {
  const setAccounts = useBankStore((state) => state.setAccounts);
  const [account, setAccount] = useState<Account | null>(null);
  const [result, setResult] = useState<TransactionPage | null>(null);
  const [status, setStatus] = useState<TransactionListStatus>("loading");
  const [startDate, setStartDate] = useState(
    () => getInitialDateRange().startDate,
  );
  const [endDate, setEndDate] = useState(
    () => getInitialDateRange().endDate,
  );
  const [selectedType, setSelectedType] =
    useState<TransactionTypeFilter>("ALL");
  const [dateError, setDateError] = useState("");
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const apiErrorRef = useRef<HTMLElement>(null);
  const dateErrorRef = useRef<HTMLDivElement>(null);

  const queryTransactions = async (
    targetAccount: Account,
    page: number,
    range: { startDate: string; endDate: string },
    type: TransactionTypeFilter,
  ) => {
    setStatus("loading");
    setApiError(null);
    try {
      const pageResult = await getRecentTransactions({
        accountId: targetAccount.id,
        startDate: range.startDate,
        endDate: range.endDate,
        type: type === "ALL" ? undefined : type,
        page,
        size: PAGE_SIZE,
      });
      setResult(pageResult);
      setStatus("ready");
    } catch (error: unknown) {
      setApiError(toApiError(error));
      setStatus("error");
    }
  };

  useEffect(() => {
    let isActive = true;
    const initialRange = getInitialDateRange();

    void getConnectedAccounts()
      .then(async (connectedAccounts) => {
        if (!isActive) return;
        setAccounts(connectedAccounts);
        const targetAccount =
          connectedAccounts.find((item) => item.isPrimary) ??
          connectedAccounts[0] ??
          null;
        setAccount(targetAccount);
        if (!targetAccount) {
          setStatus("ready");
          return;
        }

        const pageResult = await getRecentTransactions({
          accountId: targetAccount.id,
          startDate: initialRange.startDate,
          endDate: initialRange.endDate,
          page: 0,
          size: PAGE_SIZE,
        });
        if (!isActive) return;
        setResult(pageResult);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setApiError(toApiError(error));
        setStatus("error");
      });

    return () => {
      isActive = false;
    };
  }, [setAccounts]);

  useEffect(() => {
    if (status !== "error" || !apiError) return;
    const focusTimer = window.setTimeout(() => apiErrorRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [apiError, status]);

  const applyFilters = () => {
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
    void queryTransactions(
      account,
      0,
      { startDate, endDate },
      selectedType,
    );
  };

  const retry = () => {
    if (!account) {
      window.location.reload();
      return;
    }
    void queryTransactions(
      account,
      result?.page ?? 0,
      { startDate, endDate },
      selectedType,
    );
  };

  const movePage = (page: number) => {
    if (!account) return;
    void queryTransactions(
      account,
      page,
      { startDate, endDate },
      selectedType,
    );
  };

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-3xl px-6 py-12">
      <PageBackLink href="/accounts">연결된 계좌로</PageBackLink>

      <p className="text-base font-bold text-[var(--color-primary)]">
        거래내역
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">최근 거래내역</h1>
      {account ? (
        <p className="mt-4 text-lg leading-8 text-[var(--color-text-muted)]">
          {account.accountName} · {account.bankName} ·{" "}
          {account.maskedAccountNumber}
        </p>
      ) : null}

      <div
        className="mt-8"
        aria-live="polite"
        aria-busy={status === "loading"}
      >
        {status === "loading" ? (
          <p className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-lg font-semibold">
            거래내역을 불러오고 있어요.
          </p>
        ) : null}

        {status === "error" && apiError ? (
          <section
            ref={apiErrorRef}
            tabIndex={-1}
            className="rounded-xl border-2 border-[var(--color-danger)] bg-[var(--color-surface)] p-6 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
            role="alert"
          >
            <h2 className="text-xl font-bold">
              거래내역을 불러오지 못했습니다.
            </h2>
            <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
              {apiError.message}
            </p>
            <AccessibleButton className="mt-5" onClick={retry}>
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
              className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-[var(--color-primary)] px-5 py-2 font-semibold text-[var(--color-on-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
            >
              계좌 연결하기
            </Link>
          </section>
        ) : null}

        {account && status === "ready" ? (
          <section
            className="mb-8 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-5"
            aria-labelledby="transaction-filter-title"
          >
            <h2 id="transaction-filter-title" className="text-xl font-bold">
              조회 조건
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
                  className="mt-2 min-h-14 w-full rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
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
                  className="mt-2 min-h-14 w-full rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
                />
              </div>
            </div>

            <fieldset className="mt-5 border-t-2 border-[var(--color-border)] pt-5">
              <legend className="font-bold">거래 유형</legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {(["ALL", "IN", "OUT"] as const).map((type) => (
                  <label
                    key={type}
                    className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-background)] p-3 font-semibold"
                  >
                    <input
                      type="radio"
                      name="transaction-type"
                      value={type}
                      checked={selectedType === type}
                      onChange={() => setSelectedType(type)}
                      className="h-7 w-7 accent-[var(--color-primary)] focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
                    />
                    {type === "ALL" ? "전체" : typeLabels[type]}
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
            <AccessibleButton className="mt-5" onClick={applyFilters}>
              선택한 조건으로 조회하기
            </AccessibleButton>
          </section>
        ) : null}

        {status === "ready" && result ? (
          <section aria-labelledby="transaction-result-title">
            <h2 id="transaction-result-title" className="text-xl font-bold">
              조회 결과 {result.totalElements}건
            </h2>
            <TransactionVoiceGuide guideText={result.voiceMessage} />

            {result.transactions.length === 0 ? (
              <p className="mt-4 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                선택한 조건의 거래가 없습니다.
              </p>
            ) : (
              <ol className="mt-4 grid list-none gap-3 p-0">
                {result.transactions.map((transaction) => {
                  const isDeposit = transaction.type === "IN";
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
                            {isDeposit ? "+" : "-"}
                            {currencyFormatter.format(transaction.amount)}
                          </p>
                        </div>
                        <p className="mt-4 text-[var(--color-text-muted)]">
                          {dateFormatter.format(new Date(transaction.occurredAt))}
                        </p>
                        <Link
                          href={`/transactions/${transaction.id}`}
                          className="mt-4 inline-flex min-h-11 items-center rounded-lg border-2 border-[var(--color-border)] px-4 py-2 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
                        >
                          이 거래 자세히 보기
                        </Link>
                      </article>
                    </li>
                  );
                })}
              </ol>
            )}

            {result.totalPages > 1 ? (
              <nav
                className="mt-6 flex items-center justify-between gap-4"
                aria-label="거래내역 페이지"
              >
                <AccessibleButton
                  variant="secondary"
                  disabled={result.page === 0}
                  onClick={() => movePage(result.page - 1)}
                >
                  이전 페이지
                </AccessibleButton>
                <p aria-live="polite">
                  {result.page + 1} / {result.totalPages} 페이지
                </p>
                <AccessibleButton
                  variant="secondary"
                  disabled={!result.hasNext}
                  onClick={() => movePage(result.page + 1)}
                >
                  다음 페이지
                </AccessibleButton>
              </nav>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}

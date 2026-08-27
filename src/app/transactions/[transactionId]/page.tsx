"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { PageBackLink } from "@/components/common/PageBackLink";
import { TransactionVoiceGuide } from "@/components/domain/transactions/TransactionVoiceGuide";
import { getConnectedAccounts } from "@/services/accountService";
import { toApiError, type ApiError } from "@/services/api";
import { getTransactionDetail } from "@/services/transactionService";
import type { Account, Transaction, TransactionType } from "@/types";

type DetailStatus = "loading" | "ready" | "not-found" | "error";

const typeLabels: Record<TransactionType, string> = {
  IN: "입금",
  OUT: "출금",
};

const sourceLabels = {
  OPENBANKING: "오픈뱅킹",
  INTERNAL: "서비스 내 이체",
} as const;

const currencyFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
  hour: "numeric",
  minute: "2-digit",
});

export default function TransactionDetailPage() {
  const params = useParams<{ transactionId: string }>();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [voiceMessage, setVoiceMessage] = useState("");
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const [status, setStatus] = useState<DetailStatus>("loading");
  const apiErrorRef = useRef<HTMLElement>(null);

  const loadDetail = async () => {
    setStatus("loading");
    setApiError(null);
    try {
      const [detail, accounts] = await Promise.all([
        getTransactionDetail(params.transactionId),
        getConnectedAccounts(),
      ]);
      if (!detail) {
        setStatus("not-found");
        return;
      }
      setTransaction(detail.transaction);
      setVoiceMessage(detail.voiceMessage);
      setAccount(
        accounts.find((item) => item.id === detail.transaction.accountId) ??
          null,
      );
      setStatus("ready");
    } catch (error: unknown) {
      const parsedError = toApiError(error);
      setApiError(parsedError);
      setStatus(parsedError.status === 404 ? "not-found" : "error");
    }
  };

  useEffect(() => {
    let isActive = true;

    void Promise.all([
      getTransactionDetail(params.transactionId),
      getConnectedAccounts(),
    ])
      .then(([detail, accounts]) => {
        if (!isActive) return;
        if (!detail) {
          setStatus("not-found");
          return;
        }
        setTransaction(detail.transaction);
        setVoiceMessage(detail.voiceMessage);
        setAccount(
          accounts.find((item) => item.id === detail.transaction.accountId) ??
            null,
        );
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        const parsedError = toApiError(error);
        setApiError(parsedError);
        setStatus(parsedError.status === 404 ? "not-found" : "error");
      });

    return () => {
      isActive = false;
    };
  }, [params.transactionId]);

  useEffect(() => {
    if (status !== "error" || !apiError) return;
    const focusTimer = window.setTimeout(() => apiErrorRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [apiError, status]);

  const isDeposit = transaction?.type === "IN";

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-xl px-6 py-12">
      <PageBackLink href="/transactions">거래내역으로</PageBackLink>

      <p className="text-base font-bold text-[var(--color-primary)]">
        거래내역
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">거래 상세</h1>

      <div className="mt-8" aria-live="polite" aria-busy={status === "loading"}>
        {status === "loading" ? (
          <p className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-lg font-semibold">
            거래 정보를 불러오고 있어요.
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
              거래 정보를 불러오지 못했습니다.
            </h2>
            <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
              {apiError.message}
            </p>
            <AccessibleButton className="mt-5" onClick={() => void loadDetail()}>
              다시 불러오기
            </AccessibleButton>
          </section>
        ) : null}

        {status === "not-found" ? (
          <section className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <h2 className="text-xl font-bold">거래 정보를 찾지 못했습니다.</h2>
            <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
              없거나 현재 사용자에게 속하지 않은 거래입니다.
            </p>
          </section>
        ) : null}

        {status === "ready" && transaction ? (
          <article
            className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6"
            aria-labelledby="transaction-detail-description"
          >
            <p className="font-bold text-[var(--color-primary)]">
              {typeLabels[transaction.type]}
            </p>
            <h2
              id="transaction-detail-description"
              className="mt-2 text-2xl font-bold"
            >
              {transaction.description}
            </h2>
            <p className="mt-5 text-4xl font-bold">
              <span className="sr-only">
                {isDeposit ? "들어온 금액" : "나간 금액"}
              </span>
              {isDeposit ? "+" : "-"}
              {currencyFormatter.format(transaction.amount)}
            </p>

            <dl className="mt-8 grid gap-5 border-t-2 border-[var(--color-border)] pt-6">
              <div>
                <dt className="font-semibold text-[var(--color-text-muted)]">
                  거래 일시
                </dt>
                <dd className="mt-1 text-lg font-semibold">
                  {dateFormatter.format(new Date(transaction.occurredAt))}
                </dd>
              </div>
              {transaction.balanceAfter !== null ? (
                <div>
                  <dt className="font-semibold text-[var(--color-text-muted)]">
                    거래 후 잔액
                  </dt>
                  <dd className="mt-1 text-lg font-semibold">
                    {currencyFormatter.format(transaction.balanceAfter)}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="font-semibold text-[var(--color-text-muted)]">
                  계좌
                </dt>
                <dd className="mt-1 text-lg font-semibold">
                  {account
                    ? `${account.accountName} · ${account.bankName} · ${account.maskedAccountNumber}`
                    : "연결 계좌 정보 없음"}
                </dd>
              </div>
              {transaction.category ? (
                <div>
                  <dt className="font-semibold text-[var(--color-text-muted)]">
                    분류
                  </dt>
                  <dd className="mt-1 text-lg font-semibold">
                    {transaction.category}
                  </dd>
                </div>
              ) : null}
              {transaction.memo ? (
                <div>
                  <dt className="font-semibold text-[var(--color-text-muted)]">
                    메모
                  </dt>
                  <dd className="mt-1 text-lg font-semibold">
                    {transaction.memo}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="font-semibold text-[var(--color-text-muted)]">
                  거래 출처
                </dt>
                <dd className="mt-1 text-lg font-semibold">
                  {sourceLabels[transaction.source]}
                </dd>
              </div>
            </dl>

            <TransactionVoiceGuide
              guideText={voiceMessage}
              title="거래 상세 음성 안내"
            />
          </article>
        ) : null}
      </div>
    </main>
  );
}

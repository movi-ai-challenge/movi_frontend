"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { AppScreen } from "@/components/common/AppScreen";
import { AccessibleButton } from "@/components/common/AccessibleButton";
import { PageBackLink } from "@/components/common/PageBackLink";
import { getConnectedAccounts } from "@/services/accountService";
import { getTransactionDetail } from "@/services/transactionService";
import type { Account, Transaction, TransactionType } from "@/types";

type DetailStatus = "loading" | "ready" | "not-found" | "error";

const typeLabels: Record<TransactionType, string> = {
  deposit: "입금",
  withdrawal: "출금",
  transfer: "이체",
  blocked: "차단",
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
  weekday: "long",
  hour: "numeric",
  minute: "2-digit",
});

export default function TransactionDetailPage() {
  const params = useParams<{ transactionId: string }>();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [status, setStatus] = useState<DetailStatus>("loading");

  const loadDetail = async () => {
    setStatus("loading");

    try {
      const detail = await getTransactionDetail(params.transactionId);

      if (!detail) {
        setTransaction(null);
        setStatus("not-found");
        return;
      }

      const accounts = await getConnectedAccounts();
      setTransaction(detail);
      setAccount(
        accounts.find((item) => item.id === detail.accountId) ?? null,
      );
      setStatus("ready");
    } catch {
      setStatus("error");
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

        setTransaction(detail);
        setAccount(
          accounts.find((item) => item.id === detail.accountId) ?? null,
        );
        setStatus("ready");
      })
      .catch(() => {
        if (isActive) setStatus("error");
      });

    return () => {
      isActive = false;
    };
  }, [params.transactionId]);

  const isDeposit = transaction?.type === "deposit";
  const isBlocked = transaction?.type === "blocked";
  const amountPrefix = isDeposit ? "+" : isBlocked ? "" : "-";

  return (
    <AppScreen className="gap-5 pb-10 pt-6">
      <PageBackLink href="/transactions">거래내역으로</PageBackLink>

      <p
        className="text-base font-bold text-[var(--color-accent)]"
        data-secondary-content="true"
      >
        거래내역
      </p>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight">거래 상세</h1>

      <div className="mt-8" aria-live="polite" aria-busy={status === "loading"}>
        {status === "loading" ? (
          <p className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-[15px] font-semibold">
            거래 정보를 불러오고 있어요.
          </p>
        ) : null}

        {status === "error" ? (
          <section
            className="rounded-xl border-2 border-[var(--color-danger)] bg-[var(--color-surface)] p-6"
            role="alert"
          >
            <h2 className="text-[15px] font-bold">거래 정보를 불러오지 못했습니다.</h2>
            <p className="mt-2 leading-relaxed text-[var(--color-text-muted)]">
              인터넷 연결을 확인하고 다시 시도해 주세요.
            </p>
            <AccessibleButton className="mt-5" onClick={() => void loadDetail()}>
              다시 불러오기
            </AccessibleButton>
          </section>
        ) : null}

        {status === "not-found" ? (
          <section className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <h2 className="text-[15px] font-bold">거래 정보를 찾지 못했습니다.</h2>
            <p className="mt-2 leading-relaxed text-[var(--color-text-muted)]">
              거래내역으로 돌아가 다시 선택해 주세요.
            </p>
          </section>
        ) : null}

        {status === "ready" && transaction ? (
          <article
            className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6"
            aria-labelledby="transaction-detail-description"
          >
            <p className="font-bold text-[var(--color-accent)]">
              {typeLabels[transaction.type]}
            </p>
            <h2
              id="transaction-detail-description"
              className="mt-2 text-[15px] font-bold"
            >
              {transaction.description}
            </h2>
            <p className="mt-5 text-[28px] font-black">
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

            <dl className="mt-8 grid gap-5 border-t-2 border-[var(--color-border)] pt-6">
              <div>
                <dt className="font-semibold text-[var(--color-text-muted)]">
                  거래 일시
                </dt>
                <dd className="mt-1 text-[15px] font-semibold">
                  {dateFormatter.format(new Date(transaction.occurredAt))}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--color-text-muted)]">
                  거래 후 잔액
                </dt>
                <dd className="mt-1 text-[15px] font-semibold">
                  {currencyFormatter.format(transaction.balanceAfter)}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--color-text-muted)]">
                  계좌
                </dt>
                <dd className="mt-1 text-[15px] font-semibold">
                  {account
                    ? `${account.accountName} · ${account.bankName} · ${account.maskedAccountNumber}`
                    : "연결 계좌 정보 없음"}
                </dd>
              </div>
            </dl>
          </article>
        ) : null}
      </div>
    </AppScreen>
  );
}

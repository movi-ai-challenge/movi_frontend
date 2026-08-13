"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { AccountApiError } from "@/components/domain/accounts/AccountApiError";
import {
  getConnectedAccounts,
  updateDefaultAccount,
} from "@/services/accountService";
import { toApiError, type ApiError } from "@/services/api";
import { useBankStore } from "@/store/useBankStore";

type AccountListStatus = "loading" | "ready" | "error";

const currencyFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

export default function ConnectedAccountListPage() {
  const accounts = useBankStore((state) => state.accounts);
  const defaultAccountId = useBankStore((state) => state.defaultAccountId);
  const setAccounts = useBankStore((state) => state.setAccounts);
  const setDefaultAccount = useBankStore((state) => state.setDefaultAccount);
  const [status, setStatus] = useState<AccountListStatus>("loading");
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [updatingAccountId, setUpdatingAccountId] = useState<string | null>(
    null,
  );
  const [updateMessage, setUpdateMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    void getConnectedAccounts()
      .then((connectedAccounts) => {
        if (!isActive) return;
        setAccounts(connectedAccounts);
        setLoadError(null);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setLoadError(toApiError(error));
        setStatus("error");
      });

    return () => {
      isActive = false;
    };
  }, [setAccounts]);

  const retryLoadAccounts = async () => {
    setStatus("loading");
    setLoadError(null);

    try {
      const connectedAccounts = await getConnectedAccounts();
      setAccounts(connectedAccounts);
      setStatus("ready");
    } catch (error: unknown) {
      setLoadError(toApiError(error));
      setStatus("error");
    }
  };

  const changeDefaultAccount = async (accountId: string) => {
    if (updatingAccountId) return;

    setUpdatingAccountId(accountId);
    setUpdateMessage("");

    try {
      const updatedAccountId = await updateDefaultAccount(accountId);
      setDefaultAccount(updatedAccountId);
      const account = accounts.find((item) => item.id === updatedAccountId);
      setUpdateMessage(`${account?.accountName ?? "선택한 계좌"}를 기본 계좌로 설정했습니다.`);
    } catch {
      setUpdateMessage("기본 계좌를 바꾸지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setUpdatingAccountId(null);
    }
  };

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-3xl px-6 py-12">
      <Link
        href="/accounts/register"
        className="mb-8 inline-flex min-h-11 items-center rounded-md font-semibold text-[var(--color-primary)] underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
      >
        계좌 등록 화면으로
      </Link>

      <p
        className="text-base font-bold text-[var(--color-primary)]"
        data-secondary-content="true"
      >
        오픈뱅킹
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">연결된 계좌</h1>
      <p
        className="mt-4 text-lg leading-8 text-[var(--color-text-muted)]"
        data-secondary-content="true"
      >
        등록한 계좌의 잔액과 기본 정보를 확인할 수 있어요.
      </p>

      <div className="mt-8" aria-live="polite" aria-busy={status === "loading"}>
        {status === "loading" ? (
          <p className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-lg font-semibold">
            연결된 계좌를 불러오고 있어요.
          </p>
        ) : null}

        {status === "error" && loadError ? (
          <AccountApiError
            error={loadError}
            onRetry={() => void retryLoadAccounts()}
          />
        ) : null}

        {status === "ready" && accounts.length === 0 ? (
          <section
            className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6"
            aria-labelledby="empty-account-title"
          >
            <h2 id="empty-account-title" className="text-xl font-bold">
              아직 연결된 계좌가 없습니다.
            </h2>
            <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
              계좌를 연결하면 여기에서 잔액을 확인할 수 있어요.
            </p>
            <Link
              href="/accounts/connect"
              className="mt-5 inline-flex min-h-11 items-center rounded-lg border-2 border-transparent bg-[var(--color-primary)] px-5 py-2 font-semibold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
            >
              계좌 연결하기
            </Link>
          </section>
        ) : null}

        {status === "ready" && accounts.length > 0 ? (
          <section aria-labelledby="account-count-title">
            <h2 id="account-count-title" className="text-xl font-bold">
              등록한 계좌 {accounts.length}개
            </h2>
            <ul className="mt-4 grid list-none gap-4 p-0">
              {accounts.map((account) => (
                <li
                  key={account.id}
                  className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6"
                >
                  <article aria-labelledby={`${account.id}-name`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold text-[var(--color-text-muted)]">
                        {account.bankName}
                      </p>
                      {account.id === defaultAccountId ? (
                        <span className="rounded-full border-2 border-[var(--color-success)] px-3 py-1 text-sm font-bold">
                          기본 계좌
                        </span>
                      ) : null}
                    </div>
                    <h3 id={`${account.id}-name`} className="mt-1 text-2xl font-bold">
                      {account.accountName}
                    </h3>
                    <p className="mt-2 text-lg">{account.maskedAccountNumber}</p>
                    <dl className="mt-6 border-t-2 border-[var(--color-border)] pt-5">
                      <div>
                        <dt className="text-sm font-semibold text-[var(--color-text-muted)]">
                          잔액
                        </dt>
                        <dd className="mt-1 text-3xl font-bold">
                          {currencyFormatter.format(account.balance)}
                        </dd>
                      </div>
                    </dl>
                    {account.id !== defaultAccountId ? (
                      <AccessibleButton
                        className="mt-5 w-full sm:w-auto"
                        variant="secondary"
                        isLoading={updatingAccountId === account.id}
                        loadingLabel="기본 계좌로 바꾸고 있어요"
                        disabled={updatingAccountId !== null}
                        onClick={() => void changeDefaultAccount(account.id)}
                      >
                        이 계좌를 기본으로 설정
                      </AccessibleButton>
                    ) : (
                      <p
                        className="mt-5 font-semibold text-[var(--color-success)]"
                        data-secondary-content="true"
                      >
                        잔액조회와 이체에 먼저 사용됩니다.
                      </p>
                    )}
                  </article>
                </li>
              ))}
            </ul>
            <p
              className="mt-4 min-h-7 font-semibold"
              aria-live="polite"
              aria-atomic="true"
            >
              {updateMessage}
            </p>
            <Link
              href="/balance"
              className="mt-6 mr-3 inline-flex min-h-11 items-center rounded-lg border-2 border-transparent bg-[var(--color-primary)] px-5 py-2 font-semibold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
            >
              잔액 조회하기
            </Link>
            <Link
              href="/accounts/connect"
              className="mt-6 inline-flex min-h-11 items-center rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2 font-semibold text-[var(--color-text)] hover:border-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
            >
              새 계좌 연결하기
            </Link>
            <Link
              href="/transactions"
              className="mt-3 inline-flex min-h-11 items-center rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2 font-semibold text-[var(--color-text)] hover:border-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 sm:ml-3 sm:mt-6"
            >
              최근 거래내역 보기
            </Link>
            <Link
              href="/transfer"
              className="mt-3 inline-flex min-h-11 items-center rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2 font-semibold text-[var(--color-text)] hover:border-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 sm:ml-3 sm:mt-6"
            >
              송금하기
            </Link>
          </section>
        ) : null}
      </div>
    </main>
  );
}

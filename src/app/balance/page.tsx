"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { Amount } from "@/components/common/Amount";
import { AppScreen } from "@/components/common/AppScreen";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { VoiceWave } from "@/components/common/VoiceWave";
import { AccountApiError } from "@/components/domain/accounts/AccountApiError";
import { BalanceVoiceGuide } from "@/components/domain/accounts/BalanceVoiceGuide";
import { getConnectedAccounts } from "@/services/accountService";
import { toApiError, type ApiError } from "@/services/api";
import { getAccountBalance } from "@/services/balanceService";
import { useBankStore } from "@/store/useBankStore";
import type { Account } from "@/types";

type BalanceStatus = "loading-accounts" | "ready" | "checking" | "error";

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
        const preferredAccount = connectedAccounts.find((account) => account.id === defaultAccountId);
        setSelectedAccountId(preferredAccount?.id ?? connectedAccounts[0]?.id ?? "");
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

  const otherAccounts = balanceAccount
    ? accounts.filter((account) => account.id !== balanceAccount.id)
    : [];

  return (
    <AppScreen
      className="gap-5 pt-6"
      footer={
        <Link
          href="/"
          className="flex h-14 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[15px] font-semibold text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
        >
          홈으로
        </Link>
      }
    >
      <nav aria-label="이전 단계">
        <Link
          href="/accounts"
          aria-label="연결된 계좌로"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
        >
          <span aria-hidden="true">←</span>
        </Link>
      </nav>

      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-extrabold tracking-tight">잔액 조회</h1>
        <p
          className="text-[15px] leading-relaxed text-[var(--color-text-muted)]"
          data-secondary-content="true"
        >
          기본 계좌가 먼저 선택되어 있어요. 다른 계좌도 선택할 수 있습니다.
        </p>
      </div>

      <div
        className="flex flex-col gap-5"
        aria-live="polite"
        aria-busy={status === "loading-accounts" || status === "checking"}
      >
        {status === "loading-accounts" ? (
          <SurfaceCard className="p-5">
            <p className="text-[15px] font-semibold">계좌 정보를 불러오고 있어요.</p>
          </SurfaceCard>
        ) : null}

        {status === "error" && error ? <AccountApiError error={error} onRetry={retry} /> : null}

        {status !== "loading-accounts" && accounts.length === 0 && !error ? (
          <SurfaceCard as="section" className="p-5">
            <h2 className="text-lg font-bold">조회할 계좌가 없습니다.</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-text-muted)]">
              먼저 사용할 계좌를 연결해 주세요.
            </p>
            <Link
              href="/accounts/connect"
              className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[var(--color-primary)] px-5 font-semibold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
            >
              계좌 연결하기
            </Link>
          </SurfaceCard>
        ) : null}

        {accounts.length > 0 && status !== "loading-accounts" ? (
          <section aria-labelledby="balance-account-title">
            <h2 id="balance-account-title" className="text-[15px] font-bold">
              조회할 계좌 선택
            </h2>
            <label className="mt-3 block text-[13px] font-semibold" htmlFor="balance-account">
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
              className="mt-2 min-h-14 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-[15px] text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.accountName} · {account.bankName} · {account.maskedAccountNumber}
                  {account.id === defaultAccountId ? " · 기본 계좌" : ""}
                </option>
              ))}
            </select>
            <AccessibleButton
              className="mt-4 w-full"
              isLoading={status === "checking"}
              loadingLabel="잔액을 확인하고 있어요"
              onClick={() => void checkBalance()}
            >
              선택한 계좌 잔액 확인하기
            </AccessibleButton>
          </section>
        ) : null}

        {balanceAccount ? (
          <>
            {/* 음성 안내 중임을 알리는 표시. 문구가 상태를 전달한다. */}
            <SurfaceCard accent className="flex items-center gap-2.5 px-4 py-3">
              <VoiceWave />
              <span className="text-[13px] text-[var(--color-accent)]">음성으로도 안내해 드려요</span>
            </SurfaceCard>

            <SurfaceCard as="section" className="p-5" aria-labelledby="balance-result-title">
              <h2 id="balance-result-title" className="text-[13px] text-[var(--color-text-muted)]">
                {balanceAccount.accountName} · {balanceAccount.bankName}
              </h2>
              <p className="tabular mt-1 text-[13px] text-[var(--color-text-muted)]">
                {balanceAccount.maskedAccountNumber}
              </p>
              <p className="mt-5 text-[13px] text-[var(--color-text-muted)]">현재 잔액</p>
              <p className="mt-1 text-[40px] font-black leading-tight text-[var(--color-success)]">
                <Amount value={balanceAccount.balance} />
              </p>
              <BalanceVoiceGuide account={balanceAccount} />
            </SurfaceCard>

            {otherAccounts.length > 0 ? (
              <section aria-labelledby="other-accounts-title">
                <h2
                  id="other-accounts-title"
                  className="mb-2 text-[13px] text-[var(--color-text-muted)]"
                >
                  다른 계좌
                </h2>
                <ul className="flex flex-col gap-2">
                  {otherAccounts.map((account) => (
                    <li
                      key={account.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
                    >
                      <span>
                        <span className="block text-[13px] text-[var(--color-text)]">
                          {account.bankName}
                        </span>
                        <span className="tabular block text-[11px] text-[var(--color-text-muted)]">
                          {account.maskedAccountNumber}
                        </span>
                      </span>
                      <span className="text-[14px] font-bold">
                        <Amount value={account.balance} />
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </AppScreen>
  );
}

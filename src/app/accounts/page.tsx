"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { PageBackLink } from "@/components/common/PageBackLink";
import { AccountApiError } from "@/components/domain/accounts/AccountApiError";
import { VoiceCommandPanel } from "@/components/domain/voice/VoiceCommandPanel";
import { validateAccountAlias } from "@/services/accountContract";
import {
  getConnectedAccounts,
  updateAccountAlias,
  updateDefaultAccount,
} from "@/services/accountService";
import { toApiError, type ApiError } from "@/services/api";
import { useBankStore } from "@/store/useBankStore";

type AccountListStatus = "loading" | "ready" | "error";

const accountTypeLabel = {
  DEPOSIT: "입출금 계좌",
  SAVING: "적금 계좌",
} as const;

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
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [aliasDraft, setAliasDraft] = useState("");
  const [aliasError, setAliasError] = useState("");
  const [updateMessage, setUpdateMessage] = useState("");
  const aliasInputRef = useRef<HTMLInputElement>(null);
  const loadErrorRef = useRef<HTMLElement>(null);
  const updateResultRef = useRef<HTMLParagraphElement>(null);

  const loadAccounts = async () => {
    const connectedAccounts = await getConnectedAccounts();
    setAccounts(connectedAccounts);
    setLoadError(null);
    setStatus("ready");
  };

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

  useEffect(() => {
    if (status !== "error" || !loadError) return;
    const focusTimer = window.setTimeout(() => loadErrorRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [loadError, status]);

  const retryLoadAccounts = async () => {
    setStatus("loading");
    setLoadError(null);
    try {
      await loadAccounts();
    } catch (error: unknown) {
      setLoadError(toApiError(error));
      setStatus("error");
    }
  };

  const announceUpdate = (message: string) => {
    setUpdateMessage(message);
    window.setTimeout(() => updateResultRef.current?.focus(), 0);
  };

  const changeDefaultAccount = async (accountId: string) => {
    if (updatingAccountId || editingAccountId) return;

    setUpdatingAccountId(accountId);
    setUpdateMessage("");
    try {
      const updatedAccountId = await updateDefaultAccount(accountId);
      setDefaultAccount(updatedAccountId);
      const account = accounts.find((item) => item.id === updatedAccountId);
      announceUpdate(
        `${account?.accountName ?? "선택한 계좌"}를 기본 계좌로 설정했습니다.`,
      );
    } catch (error: unknown) {
      announceUpdate(toApiError(error).message);
    } finally {
      setUpdatingAccountId(null);
    }
  };

  const startAliasEdit = (accountId: string, currentAlias: string) => {
    if (updatingAccountId || editingAccountId) return;
    setEditingAccountId(accountId);
    setAliasDraft(currentAlias);
    setAliasError("");
    setUpdateMessage("");
    window.setTimeout(() => aliasInputRef.current?.focus(), 0);
  };

  const cancelAliasEdit = () => {
    const accountId = editingAccountId;
    setEditingAccountId(null);
    setAliasDraft("");
    setAliasError("");
    if (accountId) {
      window.setTimeout(
        () => document.getElementById(`edit-alias-${accountId}`)?.focus(),
        0,
      );
    }
  };

  const saveAlias = async (accountId: string) => {
    const alias = validateAccountAlias(aliasDraft);
    if (!alias) {
      setAliasError("계좌 이름은 공백 없이 1자 이상 50자 이하로 입력해 주세요.");
      aliasInputRef.current?.focus();
      return;
    }

    setUpdatingAccountId(accountId);
    setAliasError("");
    try {
      const updatedAccount = await updateAccountAlias(accountId, alias);
      setAccounts(
        accounts.map((account) =>
          account.id === updatedAccount.id ? updatedAccount : account,
        ),
      );
      setEditingAccountId(null);
      setAliasDraft("");
      announceUpdate(`계좌 이름을 ${updatedAccount.accountName}(으)로 바꿨습니다.`);
    } catch (error: unknown) {
      setAliasError(toApiError(error).message);
      aliasInputRef.current?.focus();
    } finally {
      setUpdatingAccountId(null);
    }
  };

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-3xl px-6 py-12">
      <PageBackLink href="/">처음 화면으로</PageBackLink>

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
        연결된 계좌의 기본 정보와 주로 사용할 계좌를 관리할 수 있어요.
      </p>

      {status === "ready" && accounts.length > 0 ? (
        <VoiceCommandPanel />
      ) : null}

      <div className="mt-8" aria-live="polite" aria-busy={status === "loading"}>
        {status === "loading" ? (
          <p className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-lg font-semibold">
            연결된 계좌를 불러오고 있어요.
          </p>
        ) : null}

        {status === "error" && loadError ? (
          <AccountApiError
            ref={loadErrorRef}
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
              처음 사용할 계좌를 오픈뱅킹으로 연결해 주세요.
            </p>
            <Link
              href="/accounts/connect"
              className="mt-5 inline-flex min-h-11 items-center rounded-lg border-2 border-transparent bg-[var(--color-primary)] px-5 py-2 font-semibold text-[var(--color-on-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
            >
              계좌 연결하기
            </Link>
          </section>
        ) : null}

        {status === "ready" && accounts.length > 0 ? (
          <section aria-labelledby="account-count-title">
            <h2 id="account-count-title" className="text-xl font-bold">
              연결된 계좌 {accounts.length}개
            </h2>
            <ul className="mt-4 grid list-none gap-4 p-0">
              {accounts.map((account) => {
                const isEditing = editingAccountId === account.id;
                return (
                  <li
                    key={account.id}
                    className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6"
                  >
                    <article aria-labelledby={`${account.id}-name`}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-semibold text-[var(--color-text-muted)]">
                          {account.bankName} · {accountTypeLabel[account.accountType]}
                        </p>
                        {account.id === defaultAccountId ? (
                          <span className="rounded-full border-2 border-[var(--color-success)] px-3 py-1 text-sm font-bold">
                            기본 계좌
                          </span>
                        ) : null}
                      </div>
                      <h3
                        id={`${account.id}-name`}
                        className="mt-1 text-2xl font-bold"
                      >
                        {account.accountName}
                      </h3>
                      <p className="mt-2 text-lg">{account.maskedAccountNumber}</p>

                      {isEditing ? (
                        <div className="mt-5 rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-background)] p-4">
                          <label
                            htmlFor={`account-alias-${account.id}`}
                            className="font-bold"
                          >
                            계좌 이름
                          </label>
                          <input
                            ref={aliasInputRef}
                            id={`account-alias-${account.id}`}
                            value={aliasDraft}
                            maxLength={50}
                            aria-invalid={Boolean(aliasError) || undefined}
                            aria-describedby={`account-alias-help-${account.id}${
                              aliasError ? ` account-alias-error-${account.id}` : ""
                            }`}
                            onChange={(event) => {
                              setAliasDraft(event.target.value);
                              setAliasError("");
                            }}
                            className="mt-2 min-h-14 w-full rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
                          />
                          <p
                            id={`account-alias-help-${account.id}`}
                            className="mt-2 text-sm text-[var(--color-text-muted)]"
                          >
                            공백을 제외하고 1자 이상 50자 이하로 입력해 주세요.
                          </p>
                          {aliasError ? (
                            <p
                              id={`account-alias-error-${account.id}`}
                              className="mt-2 font-semibold text-[var(--color-danger)]"
                              role="alert"
                            >
                              {aliasError}
                            </p>
                          ) : null}
                          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                            <AccessibleButton
                              isLoading={updatingAccountId === account.id}
                              loadingLabel="계좌 이름을 바꾸고 있어요"
                              onClick={() => void saveAlias(account.id)}
                            >
                              이름 저장
                            </AccessibleButton>
                            <AccessibleButton
                              variant="secondary"
                              disabled={updatingAccountId !== null}
                              onClick={cancelAliasEdit}
                            >
                              취소
                            </AccessibleButton>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                          {account.id !== defaultAccountId ? (
                            <AccessibleButton
                              variant="secondary"
                              isLoading={updatingAccountId === account.id}
                              loadingLabel="기본 계좌로 바꾸고 있어요"
                              disabled={updatingAccountId !== null}
                              onClick={() => void changeDefaultAccount(account.id)}
                            >
                              기본 계좌로 설정
                            </AccessibleButton>
                          ) : null}
                          <AccessibleButton
                            id={`edit-alias-${account.id}`}
                            variant="secondary"
                            disabled={updatingAccountId !== null}
                            onClick={() =>
                              startAliasEdit(account.id, account.accountName)
                            }
                          >
                            계좌 이름 변경
                          </AccessibleButton>
                        </div>
                      )}
                    </article>
                  </li>
                );
              })}
            </ul>

            <nav className="mt-6 flex flex-wrap gap-3" aria-label="계좌 관련 기능">
              <Link
                href="/balance"
                className="inline-flex min-h-11 items-center rounded-lg border-2 border-transparent bg-[var(--color-primary)] px-5 py-2 font-semibold text-[var(--color-on-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
              >
                잔액 조회하기
              </Link>
              <Link
                href="/transactions"
                className="inline-flex min-h-11 items-center rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
              >
                최근 거래내역 보기
              </Link>
              <Link
                href="/transfer"
                className="inline-flex min-h-11 items-center rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
              >
                송금하기
              </Link>
            </nav>
          </section>
        ) : null}

        {status === "ready" ? (
          <p
            ref={updateResultRef}
            tabIndex={updateMessage ? -1 : undefined}
            className="mt-4 min-h-7 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
            aria-live="polite"
            aria-atomic="true"
          >
            {updateMessage}
          </p>
        ) : null}
      </div>
    </main>
  );
}

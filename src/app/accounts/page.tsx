"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { PageBackLink } from "@/components/common/PageBackLink";
import { AccountApiError } from "@/components/domain/accounts/AccountApiError";
import { verifyAccountDisconnection } from "@/services/accountReauthenticationService";
import {
  disconnectAccount,
  getConnectedAccounts,
  updateDefaultAccount,
} from "@/services/accountService";
import { toApiError, type ApiError } from "@/services/api";
import { logout } from "@/services/authService";
import { useAuthStore } from "@/store/useAuthStore";
import { useBankStore } from "@/store/useBankStore";
import type { AccountDisconnectionVerification } from "@/types";

type AccountListStatus = "loading" | "ready" | "error";
type ReauthenticationStatus = "idle" | "verifying" | "verified" | "error";

const currencyFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

export default function ConnectedAccountListPage() {
  const router = useRouter();
  const accounts = useBankStore((state) => state.accounts);
  const defaultAccountId = useBankStore((state) => state.defaultAccountId);
  const setAccounts = useBankStore((state) => state.setAccounts);
  const setDefaultAccount = useBankStore((state) => state.setDefaultAccount);
  const session = useAuthStore((state) => state.session);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [status, setStatus] = useState<AccountListStatus>("loading");
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [updatingAccountId, setUpdatingAccountId] = useState<string | null>(
    null,
  );
  const [updateMessage, setUpdateMessage] = useState("");
  const [pendingDisconnectAccountId, setPendingDisconnectAccountId] = useState<
    string | null
  >(null);
  const [disconnectingAccountId, setDisconnectingAccountId] = useState<
    string | null
  >(null);
  const [reauthenticationStatus, setReauthenticationStatus] =
    useState<ReauthenticationStatus>("idle");
  const [disconnectionVerification, setDisconnectionVerification] =
    useState<AccountDisconnectionVerification | null>(null);
  const disconnectHeadingRef = useRef<HTMLHeadingElement>(null);
  const disconnectResultRef = useRef<HTMLParagraphElement>(null);
  const verificationResultRef = useRef<HTMLHeadingElement>(null);

  const pendingDisconnectAccount =
    accounts.find((account) => account.id === pendingDisconnectAccountId) ?? null;
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (session) await logout(session.accessToken);
    } catch {
      // 서버 로그아웃이 실패해도 클라이언트 세션은 정리한다.
    } finally {
      clearSession();
      setIsLoggingOut(false);
      router.push("/login");
    }
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
    if (
      reauthenticationStatus === "verified" ||
      reauthenticationStatus === "error"
    ) {
      verificationResultRef.current?.focus();
    }
  }, [reauthenticationStatus]);

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
    if (updatingAccountId || disconnectingAccountId) return;

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

  const openDisconnectConfirmation = (accountId: string) => {
    setPendingDisconnectAccountId(accountId);
    setReauthenticationStatus("idle");
    setDisconnectionVerification(null);
    setUpdateMessage("");
    window.setTimeout(() => disconnectHeadingRef.current?.focus(), 0);
  };

  const cancelDisconnect = () => {
    const accountId = pendingDisconnectAccountId;
    setPendingDisconnectAccountId(null);
    setReauthenticationStatus("idle");
    setDisconnectionVerification(null);
    if (accountId) {
      window.setTimeout(
        () => document.getElementById(`disconnect-${accountId}`)?.focus(),
        0,
      );
    }
  };

  const reauthenticateForDisconnect = async () => {
    if (!pendingDisconnectAccount || reauthenticationStatus === "verifying") {
      return;
    }

    setReauthenticationStatus("verifying");
    setDisconnectionVerification(null);

    try {
      const verification = await verifyAccountDisconnection(
        pendingDisconnectAccount.id,
      );
      setDisconnectionVerification(verification);
      setReauthenticationStatus("verified");
    } catch {
      setReauthenticationStatus("error");
    }
  };

  const confirmDisconnect = async () => {
    if (
      !pendingDisconnectAccount ||
      disconnectingAccountId ||
      reauthenticationStatus !== "verified" ||
      disconnectionVerification?.accountId !== pendingDisconnectAccount.id
    ) {
      return;
    }

    const targetAccount = pendingDisconnectAccount;
    setDisconnectingAccountId(targetAccount.id);
    setUpdateMessage("");

    try {
      const disconnectedAccountId = await disconnectAccount(targetAccount.id);
      setAccounts(
        accounts.filter((account) => account.id !== disconnectedAccountId),
      );
      setPendingDisconnectAccountId(null);
      setReauthenticationStatus("idle");
      setDisconnectionVerification(null);
      setUpdateMessage(`${targetAccount.accountName} 연결을 해제했습니다.`);
      window.setTimeout(() => disconnectResultRef.current?.focus(), 0);
    } catch {
      setUpdateMessage(
        "계좌 연결을 해제하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
      window.setTimeout(() => disconnectHeadingRef.current?.focus(), 0);
    } finally {
      setDisconnectingAccountId(null);
    }
  };

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between gap-4">
        <PageBackLink href="/">처음 화면으로</PageBackLink>
        <AccessibleButton
          variant="secondary"
          className="mb-8 h-11 px-4 text-base"
          isLoading={isLoggingOut}
          loadingLabel="로그아웃하고 있어요"
          onClick={() => void handleLogout()}
        >
          로그아웃
        </AccessibleButton>
      </div>

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
                        disabled={
                          updatingAccountId !== null ||
                          disconnectingAccountId !== null ||
                          pendingDisconnectAccountId !== null
                        }
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
                    <AccessibleButton
                      id={`disconnect-${account.id}`}
                      className="mt-3 w-full border-[var(--color-danger)] sm:ml-3 sm:w-auto"
                      variant="secondary"
                      disabled={
                        updatingAccountId !== null ||
                        disconnectingAccountId !== null ||
                        pendingDisconnectAccountId !== null
                      }
                      onClick={() => openDisconnectConfirmation(account.id)}
                    >
                      {account.accountName} 연결 해제
                    </AccessibleButton>
                  </article>
                </li>
              ))}
            </ul>
            {pendingDisconnectAccount ? (
              <section
                className="mt-6 rounded-xl border-2 border-[var(--color-danger)] bg-[var(--color-surface)] p-6"
                aria-labelledby="disconnect-account-title"
              >
                <h2
                  id="disconnect-account-title"
                  ref={disconnectHeadingRef}
                  tabIndex={-1}
                  className="text-xl font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
                >
                  이 계좌의 연결을 해제할까요?
                </h2>
                <p className="mt-3 text-lg font-semibold">
                  {pendingDisconnectAccount.bankName} · {pendingDisconnectAccount.accountName}
                </p>
                <p className="mt-1 text-lg">
                  {pendingDisconnectAccount.maskedAccountNumber}
                </p>
                <p className="mt-3 leading-7 text-[var(--color-text-muted)]">
                  연결을 해제하면 MOVI에서 이 계좌의 잔액과 거래내역을 조회하거나
                  이체에 사용할 수 없습니다.
                </p>

                {reauthenticationStatus === "idle" ? (
                  <section className="mt-5 rounded-lg border-2 border-[var(--color-warning)] p-4">
                    <h3 className="text-lg font-bold">본인 확인이 필요합니다.</h3>
                    <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
                      계좌 연결 해제 전에 PIN 또는 생체인증으로 본인 확인을
                      진행합니다. 현재는 실제 인증 API를 연결하기 전 Mock
                      단계입니다.
                    </p>
                    <AccessibleButton
                      className="mt-4"
                      onClick={() => void reauthenticateForDisconnect()}
                    >
                      본인 확인 시작 · Mock
                    </AccessibleButton>
                  </section>
                ) : null}

                {reauthenticationStatus === "verifying" ? (
                  <section
                    className="mt-5 rounded-lg border-2 border-[var(--color-primary)] p-4"
                    aria-live="polite"
                    aria-busy="true"
                  >
                    <h3 className="text-lg font-bold">본인 확인 중입니다.</h3>
                    <p className="mt-2">잠시만 기다려 주세요.</p>
                  </section>
                ) : null}

                {reauthenticationStatus === "verified" ? (
                  <section className="mt-5 rounded-lg border-2 border-[var(--color-success)] p-4">
                    <h3
                      ref={verificationResultRef}
                      tabIndex={-1}
                      className="text-lg font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
                    >
                      Mock 본인 확인을 완료했습니다.
                    </h3>
                    <p className="mt-2 leading-7">
                      아래 최종 버튼을 눌러야 계좌 연결이 해제됩니다.
                    </p>
                  </section>
                ) : null}

                {reauthenticationStatus === "error" ? (
                  <section
                    className="mt-5 rounded-lg border-2 border-[var(--color-danger)] p-4"
                    role="alert"
                  >
                    <h3
                      ref={verificationResultRef}
                      tabIndex={-1}
                      className="text-lg font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
                    >
                      본인 확인을 완료하지 못했습니다.
                    </h3>
                    <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
                      계좌는 그대로 유지됩니다. 다시 시도해 주세요.
                    </p>
                    <AccessibleButton
                      className="mt-4"
                      variant="secondary"
                      onClick={() => void reauthenticateForDisconnect()}
                    >
                      본인 확인 다시 시도
                    </AccessibleButton>
                  </section>
                ) : null}

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  {reauthenticationStatus === "verified" ? (
                    <AccessibleButton
                      className="border-[var(--color-danger)]"
                      isLoading={
                        disconnectingAccountId === pendingDisconnectAccount.id
                      }
                      loadingLabel="계좌 연결을 해제하고 있어요"
                      onClick={() => void confirmDisconnect()}
                    >
                      본인 확인 후 연결 해제
                    </AccessibleButton>
                  ) : null}
                  <AccessibleButton
                    variant="secondary"
                    disabled={
                      disconnectingAccountId !== null ||
                      reauthenticationStatus === "verifying"
                    }
                    onClick={cancelDisconnect}
                  >
                    취소하고 계좌 유지
                  </AccessibleButton>
                </div>
              </section>
            ) : null}
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

        {status === "ready" ? (
          <p
            ref={disconnectResultRef}
            tabIndex={updateMessage ? -1 : undefined}
            className="mt-4 min-h-7 font-semibold"
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

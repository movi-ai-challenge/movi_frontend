"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { PageBackLink } from "@/components/common/PageBackLink";
import { TransferReviewVoiceGuide } from "@/components/domain/transfer/TransferReviewVoiceGuide";
import { VoiceTransferDecision } from "@/components/domain/transfer/VoiceTransferDecision";
import { getConnectedAccounts } from "@/services/accountService";
import { useBankStore } from "@/store/useBankStore";
import type { Account } from "@/types";

const currencyFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

export default function TransferReviewPage() {
  const router = useRouter();
  const transferDraft = useBankStore((state) => state.transferDraft);
  const clearTransferDraft = useBankStore((state) => state.clearTransferDraft);
  const [sourceAccount, setSourceAccount] = useState<Account | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isVoiceDecisionActive, setIsVoiceDecisionActive] = useState(false);

  useEffect(() => {
    let isActive = true;

    void getConnectedAccounts()
      .then((accounts) => {
        if (!isActive || !transferDraft) return;
        setSourceAccount(
          accounts.find(
            (account) => account.id === transferDraft.sourceAccountId,
          ) ??
            accounts[0] ??
            null,
        );
      })
      .catch(() => {
        if (isActive) setSourceAccount(null);
      });

    return () => {
      isActive = false;
    };
  }, [transferDraft]);

  if (!transferDraft) {
    return (
      <main className="mx-auto min-h-[70vh] w-full max-w-xl px-6 py-12">
        <h1 className="text-3xl font-bold">확인할 송금 정보가 없습니다.</h1>
        <p className="mt-4 leading-7 text-[var(--color-text-muted)]">
          받는 사람과 금액을 먼저 입력해 주세요.
        </p>
        <Link
          href="/transfer"
          className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-[var(--color-primary)] px-6 py-3 font-semibold text-[var(--color-on-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
        >
          송금 정보 입력하기
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-xl px-6 py-12">
      <PageBackLink href="/transfer">송금 정보 수정하기</PageBackLink>

      <p className="font-bold text-[var(--color-primary)]">최종 확인</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">
        이 내용이 맞는지 확인해 주세요
      </h1>
      <p className="mt-4 text-lg leading-8 text-[var(--color-text-muted)]">
        아직 이체되지 않았습니다. 받는 사람과 금액을 천천히 확인해 주세요.
      </p>

      <section
        className="mt-8 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6"
        aria-labelledby="transfer-review-title"
      >
        <h2 id="transfer-review-title" className="text-xl font-bold">
          송금 정보
        </h2>
        <dl className="mt-6 grid gap-6">
          <div>
            <dt className="font-semibold text-[var(--color-text-muted)]">
              받는 사람
            </dt>
            <dd className="mt-1 text-2xl font-bold">
              {transferDraft.recipientName}
            </dd>
            <dd className="mt-1">
              {transferDraft.recipientBankName &&
              transferDraft.recipientMaskedAccountNumber
                ? `${transferDraft.recipientBankName} · ${transferDraft.recipientMaskedAccountNumber}`
                : "직접 입력한 받는 사람"}
            </dd>
          </div>
          <div className="border-t-2 border-[var(--color-border)] pt-5">
            <dt className="font-semibold text-[var(--color-text-muted)]">
              보낼 금액
            </dt>
            <dd className="mt-1 text-4xl font-bold">
              {currencyFormatter.format(transferDraft.amount)}
            </dd>
          </div>
          <div className="border-t-2 border-[var(--color-border)] pt-5">
            <dt className="font-semibold text-[var(--color-text-muted)]">
              출금 계좌
            </dt>
            <dd className="mt-1 text-lg font-bold">
              {sourceAccount
                ? `${sourceAccount.accountName} · ${sourceAccount.bankName}`
                : "기본 계좌를 확인하고 있어요"}
            </dd>
            {sourceAccount ? (
              <dd className="mt-1 text-[var(--color-text-muted)]">
                {sourceAccount.maskedAccountNumber}
              </dd>
            ) : null}
          </div>
        </dl>
      </section>

      {sourceAccount ? (
        <TransferReviewVoiceGuide
          key={isVoiceDecisionActive ? "decision-active" : "decision-idle"}
          isVoiceDecisionActive={isVoiceDecisionActive}
          sourceAccount={sourceAccount}
          transferDraft={transferDraft}
        />
      ) : null}

      {!isConfirmed ? (
        <>
          <VoiceTransferDecision
            onActiveChange={setIsVoiceDecisionActive}
            onConfirm={() => {
              setIsVoiceDecisionActive(false);
              setIsConfirmed(true);
            }}
            onCancel={() => {
              setIsVoiceDecisionActive(false);
              clearTransferDraft();
              router.push("/transfer");
            }}
          />
          <AccessibleButton
            className="mt-6 w-full"
            onClick={() => {
              setIsVoiceDecisionActive(false);
              setIsConfirmed(true);
            }}
          >
            화면에서 이체 내용 확인 완료
          </AccessibleButton>
        </>
      ) : (
        <section
          className="mt-6 rounded-xl border-2 border-[var(--color-warning)] bg-[var(--color-surface)] p-5"
          aria-live="polite"
        >
          <h2 className="text-xl font-bold">송금 정보를 확인했습니다.</h2>
          <p className="mt-2 leading-7">
            아직 이체는 실행되지 않았습니다. 현재 백엔드에는 직접 입력한 송금을
            실행하는 공개 API가 없어 이 화면에서 실제 이체를 요청하지 않습니다.
          </p>
          <Link
            href="/accounts"
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg border-2 border-transparent bg-[var(--color-primary)] px-6 py-3 font-semibold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
          >
            실제 음성 송금으로 이동
          </Link>
        </section>
      )}
    </main>
  );
}

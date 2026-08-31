"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { Amount } from "@/components/common/Amount";
import { AppScreen } from "@/components/common/AppScreen";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { TransferReviewVoiceGuide } from "@/components/domain/transfer/TransferReviewVoiceGuide";
import { VoiceTransferDecision } from "@/components/domain/transfer/VoiceTransferDecision";
import { getConnectedAccounts } from "@/services/accountService";
import { useBankStore } from "@/store/useBankStore";
import type { Account } from "@/types";

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
          accounts.find((account) => account.id === transferDraft.sourceAccountId) ??
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
      <AppScreen
        className="justify-center gap-3"
        footer={
          <Link
            href="/transfer"
            className="flex h-14 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-[15px] font-bold text-[var(--color-on-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
          >
            송금 정보 입력하기
          </Link>
        }
      >
        <h1 className="text-2xl font-extrabold">확인할 송금 정보가 없습니다.</h1>
        <p className="leading-relaxed text-[var(--color-text-muted)]">
          받는 사람과 금액을 먼저 입력해 주세요.
        </p>
      </AppScreen>
    );
  }

  return (
    <AppScreen
      className="gap-4 pt-6"
      footer={
        isConfirmed ? (
          <Link
            href="/transfer/evaluate"
            className="flex h-14 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-[15px] font-bold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
          >
            거래 안전 확인 시작
          </Link>
        ) : (
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => {
                setIsVoiceDecisionActive(false);
                clearTransferDraft();
                router.push("/transfer");
              }}
              className="flex h-14 flex-1 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[15px] font-semibold text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
            >
              취소
            </button>
            <AccessibleButton
              className="flex-[2]"
              onClick={() => {
                setIsVoiceDecisionActive(false);
                setIsConfirmed(true);
              }}
            >
              확인했어요
            </AccessibleButton>
          </div>
        )
      }
    >
      <nav aria-label="이전 단계">
        <Link
          href="/transfer"
          aria-label="송금 정보 수정하기"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
        >
          <span aria-hidden="true">←</span>
        </Link>
      </nav>

      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-extrabold tracking-tight">이체 확인</h1>
        <p className="text-[15px] leading-relaxed text-[var(--color-text-muted)]">
          아직 이체되지 않았습니다. 받는 사람과 금액을 천천히 확인해 주세요.
        </p>
      </div>

      {/* 송금 정보 */}
      <SurfaceCard as="section" className="p-5" aria-labelledby="transfer-review-title">
        <h2 id="transfer-review-title" className="sr-only">
          송금 정보
        </h2>
        <dl className="flex flex-col">
          <ReviewRow
            label="받는 분"
            value={transferDraft.recipientName}
            sub={
              transferDraft.recipientBankName && transferDraft.recipientMaskedAccountNumber
                ? `${transferDraft.recipientBankName} · ${transferDraft.recipientMaskedAccountNumber}`
                : "직접 입력한 받는 사람"
            }
          />
          <ReviewRow
            label="이체 금액"
            value={
              <span className="text-[22px] font-black text-[var(--color-accent)]">
                <Amount value={transferDraft.amount} />
              </span>
            }
          />
          <ReviewRow
            label="출금 계좌"
            value={
              sourceAccount
                ? `${sourceAccount.accountName} · ${sourceAccount.bankName}`
                : "기본 계좌를 확인하고 있어요"
            }
            sub={sourceAccount ? sourceAccount.maskedAccountNumber : undefined}
            isLast
          />
        </dl>

        <p className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--color-surface-sunken)] px-3.5 py-2.5 text-[12px] text-[var(--color-text-muted)]">
          <span aria-hidden="true">🛡️</span>
          이상거래 위험도 평가 후 처리됩니다
        </p>
      </SurfaceCard>

      {sourceAccount ? (
        <TransferReviewVoiceGuide
          key={isVoiceDecisionActive ? "decision-active" : "decision-idle"}
          isVoiceDecisionActive={isVoiceDecisionActive}
          sourceAccount={sourceAccount}
          transferDraft={transferDraft}
        />
      ) : null}

      {!isConfirmed ? (
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
      ) : (
        <SurfaceCard
          as="section"
          className="border-[var(--color-success-border)] bg-[var(--color-success-surface)] p-5"
          aria-live="polite"
        >
          <h2 className="text-[15px] font-bold">송금 정보를 확인했습니다.</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
            아직 이체는 실행되지 않았습니다. 다음 단계에서 다시 확인합니다.
          </p>
        </SurfaceCard>
      )}
    </AppScreen>
  );
}

function ReviewRow({
  label,
  value,
  sub,
  isLast = false,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  isLast?: boolean;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-4 py-3.5 ${
        isLast ? "" : "border-b border-[var(--color-border)]"
      }`}
    >
      <dt className="shrink-0 text-[13px] text-[var(--color-text-muted)]">{label}</dt>
      <dd className="text-right">
        <span className="block text-[15px] font-semibold">{value}</span>
        {sub ? (
          <span className="mt-0.5 block text-[11px] text-[var(--color-text-muted)]">{sub}</span>
        ) : null}
      </dd>
    </div>
  );
}

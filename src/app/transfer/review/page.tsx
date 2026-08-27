"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { PageBackLink } from "@/components/common/PageBackLink";
import { TransferReviewVoiceGuide } from "@/components/domain/transfer/TransferReviewVoiceGuide";
import { toApiError } from "@/services/api";
import {
  clearTransferRecoveryKey,
  saveTransferRecoveryKey,
} from "@/services/transferRecoveryStorage";
import { executeDirectTransfer } from "@/services/transferService";
import { useBankStore } from "@/store/useBankStore";

const currencyFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function TransferReviewPage() {
  const router = useRouter();
  const review = useBankStore((state) => state.directTransferReview);
  const setDirectTransferResult = useBankStore((state) => state.setDirectTransferResult);
  const lockTransferRequest = useBankStore((state) => state.lockTransferRequest);
  const unlockTransferRequest = useBankStore((state) => state.unlockTransferRequest);
  const [isExecuting, setIsExecuting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);

  if (!review) {
    return (
      <main className="mx-auto min-h-[70vh] w-full max-w-xl px-6 py-12">
        <h1 className="text-3xl font-bold">확인할 송금 정보가 없습니다.</h1>
        <p className="mt-4 leading-7 text-[var(--color-text-muted)]">
          등록된 받는 사람과 금액을 먼저 선택해 주세요.
        </p>
        <Link href="/transfer" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-[var(--color-primary)] px-6 py-3 font-semibold text-[var(--color-on-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2">
          송금 정보 입력하기
        </Link>
      </main>
    );
  }

  const executeTransfer = async () => {
    if (!lockTransferRequest()) return;
    setIsExecuting(true);
    setErrorMessage("");
    try {
      saveTransferRecoveryKey(review.idempotencyKey);
      const result = await executeDirectTransfer(review);
      setDirectTransferResult(result);
      if (["COMPLETED", "BLOCKED", "FAILED", "CANCELED"].includes(result.status)) {
        clearTransferRecoveryKey();
      }
      router.replace("/transfer/result");
    } catch (error: unknown) {
      setErrorMessage(toApiError(error).message);
      setIsExecuting(false);
      unlockTransferRequest();
      window.setTimeout(() => errorRef.current?.focus(), 0);
    }
  };

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-xl px-6 py-12">
      <PageBackLink href="/transfer">송금 정보 수정하기</PageBackLink>
      <p className="font-bold text-[var(--color-primary)]">최종 확인</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">이 내용대로 송금할까요?</h1>
      <p className="mt-4 text-lg leading-8 text-[var(--color-text-muted)]">
        아직 이체되지 않았습니다. 아래 버튼을 누르면 실제 송금과 FDS 검사가 시작됩니다.
      </p>

      <section className="mt-8 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6" aria-labelledby="transfer-review-title">
        <h2 id="transfer-review-title" className="text-xl font-bold">서버가 확인한 송금 정보</h2>
        <dl className="mt-6 grid gap-6">
          <div>
            <dt className="font-semibold text-[var(--color-text-muted)]">받는 사람</dt>
            <dd className="mt-1 text-2xl font-bold">{review.recipient.nickname}</dd>
            <dd className="mt-1">예금주 {review.recipient.holderName} · {review.recipient.maskedAccountNumber}</dd>
          </div>
          <div className="border-t-2 border-[var(--color-border)] pt-5">
            <dt className="font-semibold text-[var(--color-text-muted)]">보낼 금액</dt>
            <dd className="mt-1 text-4xl font-bold">{currencyFormatter.format(review.amount)}</dd>
          </div>
          <div className="border-t-2 border-[var(--color-border)] pt-5">
            <dt className="font-semibold text-[var(--color-text-muted)]">출금 계좌</dt>
            <dd className="mt-1 text-lg font-bold">{review.fromAccount.alias || `${review.fromAccount.bankName} 계좌`}</dd>
            <dd className="mt-1 text-[var(--color-text-muted)]">{review.fromAccount.bankName}</dd>
          </div>
          <div className="border-t-2 border-[var(--color-border)] pt-5">
            <dt className="font-semibold text-[var(--color-text-muted)]">확인 유효 시간</dt>
            <dd className="mt-1">{dateTimeFormatter.format(new Date(review.expiresAt))}까지</dd>
          </div>
        </dl>
      </section>

      <TransferReviewVoiceGuide review={review} />

      {errorMessage ? (
        <div ref={errorRef} tabIndex={-1} role="alert" className="mt-6 rounded-xl border-2 border-[var(--color-danger)] bg-[var(--color-surface)] p-5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]">
          <h2 className="text-xl font-bold">송금 결과를 확인하지 못했습니다.</h2>
          <p className="mt-2 leading-7">{errorMessage}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
            중복 송금을 막기 위해 다시 시도해도 같은 요청 키를 사용합니다.
          </p>
        </div>
      ) : null}

      <AccessibleButton className="mt-6 w-full" disabled={isExecuting} onClick={() => void executeTransfer()}>
        {isExecuting ? "송금과 위험도를 확인하고 있어요" : "확인한 내용대로 실제 송금하기"}
      </AccessibleButton>
      <Link href="/transfer" className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-3 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2">
        취소하고 정보 수정하기
      </Link>
    </main>
  );
}

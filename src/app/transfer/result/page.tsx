"use client";

import Link from "next/link";
import { useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { toApiError } from "@/services/api";
import { clearTransferRecoveryKey } from "@/services/transferRecoveryStorage";
import { getTransferStatus } from "@/services/transferService";
import { useBankStore } from "@/store/useBankStore";
import type { TransferExecutionStatus, TransferFdsRiskLevel } from "@/types";

const currencyFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

const statusLabels: Record<TransferExecutionStatus, string> = {
  PENDING: "송금 접수",
  RISK_REVIEW: "위험도 확인 중",
  COMPLETED: "송금 완료",
  BLOCKED: "고위험 송금 차단",
  FAILED: "송금 실패",
  CANCELED: "송금 취소",
};

const riskLabels: Record<TransferFdsRiskLevel, string> = {
  LOW: "낮음",
  MEDIUM: "주의 필요",
  HIGH: "높음",
};

const terminalStatuses = new Set<TransferExecutionStatus>([
  "COMPLETED",
  "BLOCKED",
  "FAILED",
  "CANCELED",
]);

export default function TransferResultPage() {
  const result = useBankStore((state) => state.directTransferResult);
  const setDirectTransferResult = useBankStore((state) => state.setDirectTransferResult);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!result) {
    return (
      <main className="mx-auto min-h-[70vh] w-full max-w-xl px-6 py-12">
        <h1 className="text-3xl font-bold">표시할 송금 결과가 없습니다.</h1>
        <p className="mt-4 leading-7 text-[var(--color-text-muted)]">
          새로운 송금을 시작하거나 계좌 화면에서 상태를 확인해 주세요.
        </p>
        <Link href="/transfer" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-[var(--color-primary)] px-6 py-3 font-semibold text-[var(--color-on-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2">
          새 송금 시작하기
        </Link>
      </main>
    );
  }

  const isTerminal = terminalStatuses.has(result.status);
  const refreshStatus = async () => {
    setIsRefreshing(true);
    setErrorMessage("");
    try {
      const status = await getTransferStatus(result.idempotencyKey);
      setDirectTransferResult({
        transferId: status.transferId,
        idempotencyKey: result.idempotencyKey,
        status: status.status,
        riskLevel: status.riskLevel,
        amount: status.amount,
        recipientName: status.recipientName,
        completedAt: status.completedAt,
        voiceMessage: status.voiceMessage,
      });
      if (terminalStatuses.has(status.status)) clearTransferRecoveryKey();
    } catch (error: unknown) {
      setErrorMessage(toApiError(error).message);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-xl px-6 py-12">
      <p className="font-bold text-[var(--color-primary)]">송금 결과</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">{statusLabels[result.status]}</h1>
      <p className="mt-4 text-lg leading-8" aria-live="polite">{result.voiceMessage}</p>

      <section className="mt-8 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6" aria-labelledby="transfer-result-title">
        <h2 id="transfer-result-title" className="text-xl font-bold">처리 결과</h2>
        <dl className="mt-5 grid gap-5">
          <div>
            <dt className="font-semibold text-[var(--color-text-muted)]">받는 사람</dt>
            <dd className="mt-1 text-xl font-bold">{result.recipientName}</dd>
          </div>
          <div className="border-t-2 border-[var(--color-border)] pt-4">
            <dt className="font-semibold text-[var(--color-text-muted)]">금액</dt>
            <dd className="mt-1 text-3xl font-bold">{currencyFormatter.format(result.amount)}</dd>
          </div>
          <div className="border-t-2 border-[var(--color-border)] pt-4">
            <dt className="font-semibold text-[var(--color-text-muted)]">처리 상태</dt>
            <dd className="mt-1 font-bold">{statusLabels[result.status]}</dd>
          </div>
          <div className="border-t-2 border-[var(--color-border)] pt-4">
            <dt className="font-semibold text-[var(--color-text-muted)]">FDS 위험도</dt>
            <dd className="mt-1 font-bold">{result.riskLevel ? riskLabels[result.riskLevel] : "확인 중"}</dd>
          </div>
        </dl>
      </section>

      {result.status === "BLOCKED" || result.status === "FAILED" || result.status === "CANCELED" ? (
        <p className="mt-5 rounded-xl border-2 border-[var(--color-warning)] bg-[var(--color-surface)] p-5 font-semibold">
          이 송금으로 돈이 나가지 않았습니다.
        </p>
      ) : null}

      {!isTerminal ? (
        <AccessibleButton className="mt-6 w-full" variant="secondary" disabled={isRefreshing} onClick={() => void refreshStatus()}>
          {isRefreshing ? "송금 상태를 확인하고 있어요" : "현재 송금 상태 다시 확인"}
        </AccessibleButton>
      ) : null}
      {errorMessage ? <p className="mt-4 rounded-xl border-2 border-[var(--color-danger)] p-4 font-semibold" role="alert">{errorMessage}</p> : null}

      <Link href={result.status === "COMPLETED" ? "/transactions" : "/accounts"} className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--color-primary)] px-6 py-3 font-semibold text-[var(--color-on-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2">
        {result.status === "COMPLETED" ? "거래내역 확인하기" : "계좌로 돌아가기"}
      </Link>
    </main>
  );
}

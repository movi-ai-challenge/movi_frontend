"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { toApiError } from "@/services/api";
import {
  clearTransferRecoveryKey,
  readTransferRecoveryKey,
} from "@/services/transferRecoveryStorage";
import { getTransferStatus, recoverDirectTransfer } from "@/services/transferService";
import { getNotifications } from "@/services/notificationService";
import {
  findNotificationForTransfer,
  type NotificationData,
} from "@/services/notificationContract";
import { useBankStore } from "@/store/useBankStore";
import { speak } from "@/services/speech";
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

/**
 * 보호자 알림 상태를 사람이 읽을 말로 바꾼다.
 *
 * QUEUED 를 "대기"로만 적으면 사용자는 갔는지 안 갔는지 알 수 없다. 재시도가
 * 도는 중인지도 함께 알려 줘야 "실패했으니 직접 연락해야 하나"를 판단할 수 있다.
 */
function describeGuardianAlert(alert: NotificationData): string {
  if (alert.status === "SENT") return "전송 완료";
  if (alert.status === "QUEUED") return "전송 중";
  if (alert.retryCount > 0) return `전송 실패 · ${alert.retryCount}회 재시도함`;

  return "전송 실패";
}

/**
 * 거래 일시 표기.
 *
 * 초까지 보여 주지 않는다. 사용자가 확인하려는 것은 "언제 나갔는지"이지 정확한
 * 초가 아니다. 낭독기가 읽을 때도 짧을수록 알아듣기 쉽다.
 */
function formatTransactedAt(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(parsed);
}

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
  const [recoveryKey] = useState(() => result ? null : readTransferRecoveryKey());
  const [recoveryState, setRecoveryState] = useState<"checking" | "none" | "failed" | "done">(
    result ? "done" : recoveryKey ? "checking" : "none",
  );

  useEffect(() => {
    if (result) {
      return;
    }
    if (!recoveryKey) return;
    let isActive = true;
    recoverDirectTransfer(recoveryKey)
      .then((recovered) => {
        if (!isActive) return;
        setDirectTransferResult(recovered);
        if (terminalStatuses.has(recovered.status)) clearTransferRecoveryKey();
        setRecoveryState("done");
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setErrorMessage(
          `${toApiError(error).message} 송금 여부를 확인하지 못했어요. 다시 송금하지 마세요.`,
        );
        setRecoveryState("failed");
      });
    return () => {
      isActive = false;
    };
  }, [recoveryKey, result, setDirectTransferResult]);

  /*
   * 보호자 알림은 송금과 별도 트랜잭션에서 지연 발송된다. 이체 응답에 담아 오면
   * 그 시점 값이 최종이 아니라, "전송 완료"라고 띄운 뒤 실제로는 실패할 수 있다.
   * 그래서 결과 화면에서 따로 조회한다. 못 찾으면 아무것도 주장하지 않는다 --
   * 나가지 않은 알림을 전송됐다고 보여 주면 사용자가 잘못 안심한다.
   */
  const [guardianAlert, setGuardianAlert] = useState<NotificationData | null>(null);

  useEffect(() => {
    if (result?.voiceMessage) speak(result.voiceMessage);
  }, [result?.voiceMessage]);

  useEffect(() => {
    if (!result?.riskLevel || result.riskLevel === "LOW") return;
    let isActive = true;

    getNotifications()
      .then((notifications) => {
        if (!isActive) return;
        setGuardianAlert(
          findNotificationForTransfer(notifications, result.transferId),
        );
      })
      .catch(() => {
        // 조회 실패는 화면에 드러내지 않는다. 알림 확인은 곁가지이고,
        // 송금 결과를 읽는 것이 이 화면의 본래 일이다.
      });

    return () => {
      isActive = false;
    };
  }, [result?.riskLevel, result?.transferId]);

  if (!result && recoveryState === "checking") {
    return (
      <main className="mx-auto min-h-[70vh] w-full max-w-xl px-6 py-12">
        <h1 className="text-3xl font-bold">진행 중인 송금을 확인하고 있어요.</h1>
        <p className="mt-4 leading-7 text-[var(--color-text-muted)]" role="status">
          결과가 확인될 때까지 새 송금을 시작하지 마세요.
        </p>
      </main>
    );
  }

  if (!result && recoveryState === "failed") {
    return (
      <main className="mx-auto min-h-[70vh] w-full max-w-xl px-6 py-12">
        <h1 className="text-3xl font-bold">송금 결과를 확인하지 못했습니다.</h1>
        <p className="mt-4 rounded-xl border-2 border-[var(--color-warning)] p-5 font-semibold" role="alert">
          {errorMessage}
        </p>
        <Link href="/transactions" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-[var(--color-primary)] px-6 py-3 font-semibold text-[var(--color-on-primary)]">
          거래내역에서 확인하기
        </Link>
      </main>
    );
  }

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
  const isBlocked = result.status === "BLOCKED";
  const isCompleted = result.status === "COMPLETED";


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
        // 상태 재조회는 근거를 내려주지 않는다. 처음 받은 값을 유지해야
        // 새로고침했다고 "왜 막혔는지"가 사라지지 않는다.
        riskReasons: result.riskReasons,
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
      {/*
        성공과 차단을 색과 기호로도 구분한다. 제목 글자만 다르면 눈으로 훑을 때
        결과가 즉시 들어오지 않는다. 기호는 aria-hidden 으로 두어 낭독기가
        의미 없는 문자를 읽지 않게 하고, 뜻은 제목 문구가 담는다.
      */}
      <p className="font-bold text-[var(--color-accent)]">송금 결과</p>
      <div className="mt-2 flex items-center gap-3">
        <span
          aria-hidden="true"
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl ${
            isBlocked
              ? "bg-[var(--color-danger-surface)] text-[var(--color-danger)]"
              : isCompleted
                ? "bg-[var(--color-success-surface)] text-[var(--color-success)]"
                : "bg-[var(--color-surface)] text-[var(--color-text-muted)]"
          }`}
        >
          {isBlocked ? "!" : isCompleted ? "✓" : "…"}
        </span>
        <h1
          className={`text-4xl font-bold tracking-tight ${
            isBlocked
              ? "text-[var(--color-danger)]"
              : isCompleted
                ? "text-[var(--color-success)]"
                : ""
          }`}
        >
          {statusLabels[result.status]}
        </h1>
      </div>
      <p className="mt-4 text-lg leading-8" aria-live="polite">{result.voiceMessage}</p>
      <AccessibleButton className="mt-3" variant="secondary" onClick={() => speak(result.voiceMessage)}>
        결과 다시 듣기
      </AccessibleButton>

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
          {result.completedAt ? (
            <div className="border-t-2 border-[var(--color-border)] pt-4">
              <dt className="font-semibold text-[var(--color-text-muted)]">거래 일시</dt>
              <dd className="mt-1 font-bold">{formatTransactedAt(result.completedAt)}</dd>
            </div>
          ) : null}
          {guardianAlert ? (
            <div className="border-t-2 border-[var(--color-border)] pt-4">
              <dt className="font-semibold text-[var(--color-text-muted)]">보호자 알림</dt>
              <dd
                className={`mt-1 font-bold ${
                  guardianAlert.status === "SENT"
                    ? "text-[var(--color-success)]"
                    : guardianAlert.status === "FAILED"
                      ? "text-[var(--color-danger)]"
                      : ""
                }`}
              >
                {describeGuardianAlert(guardianAlert)}
                {guardianAlert.guardianName ? ` · ${guardianAlert.guardianName}` : ""}
              </dd>
            </div>
          ) : null}
          {result.riskReasons.length > 0 ? (
            <div className="border-t-2 border-[var(--color-border)] pt-4">
              <dt className="font-semibold text-[var(--color-text-muted)]">
                {isBlocked ? "차단 사유" : "확인된 사항"}
              </dt>
              <dd className="mt-1">
                <ul className="flex flex-col gap-1">
                  {result.riskReasons.map((reason) => (
                    <li key={reason} className="font-bold">
                      {reason}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      {result.status === "BLOCKED" || result.status === "CANCELED" ? (
        <p className="mt-5 rounded-xl border-2 border-[var(--color-warning)] bg-[var(--color-surface)] p-5 font-semibold">
          이 송금으로 돈이 나가지 않았습니다.
        </p>
      ) : null}
      {result.status === "FAILED" ? (
        <p className="mt-5 rounded-xl border-2 border-[var(--color-warning)] bg-[var(--color-surface)] p-5 font-semibold">
          은행이 송금을 거절해 돈이 나가지 않았습니다.
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

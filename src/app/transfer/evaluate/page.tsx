"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AppScreen } from "@/components/common/AppScreen";
import { AccessibleButton } from "@/components/common/AccessibleButton";
import { PageBackLink } from "@/components/common/PageBackLink";
import { requestFdsEvaluation } from "@/services/fdsService";
import {
  executeLowRiskTransfer,
  executeMediumRiskTransfer,
} from "@/services/transferService";
import { useBankStore } from "@/store/useBankStore";
import type { FdsEvaluationResult } from "@/types";

type EvaluationStatus =
  | "checking"
  | "complete"
  | "executing"
  | "error";

export default function TransferEvaluationPage() {
  const router = useRouter();
  const transferDraft = useBankStore((state) => state.transferDraft);
  const setTransferResult = useBankStore((state) => state.setTransferResult);
  const isTransferRequestLocked = useBankStore(
    (state) => state.isTransferRequestLocked,
  );
  const lockTransferRequest = useBankStore(
    (state) => state.lockTransferRequest,
  );
  const unlockTransferRequest = useBankStore(
    (state) => state.unlockTransferRequest,
  );
  const [status, setStatus] = useState<EvaluationStatus>("checking");
  const [evaluation, setEvaluation] = useState<FdsEvaluationResult | null>(null);
  const requestInProgressRef = useRef(false);
  const transferInProgressRef = useRef(false);

  const evaluateTransfer = async () => {
    if (requestInProgressRef.current) return;

    requestInProgressRef.current = true;
    setStatus("checking");
    try {
      const result = await requestFdsEvaluation();
      setEvaluation(result);
      setStatus("complete");
    } catch {
      setStatus("error");
    } finally {
      requestInProgressRef.current = false;
    }
  };

  useEffect(() => {
    if (!transferDraft) return;

    let isActive = true;
    requestInProgressRef.current = true;
    void requestFdsEvaluation()
      .then((result) => {
        if (isActive) {
          setEvaluation(result);
          setStatus("complete");
        }
      })
      .catch(() => {
        if (isActive) setStatus("error");
      })
      .finally(() => {
        requestInProgressRef.current = false;
      });

    return () => {
      isActive = false;
    };
  }, [transferDraft]);

  const executeTransfer = async () => {
    if (
      transferInProgressRef.current ||
      !transferDraft ||
      !lockTransferRequest()
    ) {
      return;
    }

    transferInProgressRef.current = true;
    setStatus("executing");
    try {
      await executeLowRiskTransfer();
      setTransferResult({
        status: "success",
        recipientName: transferDraft.recipientName,
        amount: transferDraft.amount,
        message: "요청한 이체가 정상적으로 완료됐습니다.",
        riskLevel: "low",
      });
      router.push("/transfer/result");
    } catch {
      setTransferResult({
        status: "failed",
        recipientName: transferDraft.recipientName,
        amount: transferDraft.amount,
        message: "이체를 완료하지 못했습니다. 계좌에서 돈이 빠져나가지 않았습니다.",
      });
      router.push("/transfer/result");
    } finally {
      transferInProgressRef.current = false;
    }
  };

  const executeMediumRiskMock = async () => {
    if (
      transferInProgressRef.current ||
      !transferDraft ||
      !lockTransferRequest()
    ) {
      return;
    }

    transferInProgressRef.current = true;
    setStatus("executing");
    try {
      await executeMediumRiskTransfer();
      setTransferResult({
        status: "success",
        recipientName: transferDraft.recipientName,
        amount: transferDraft.amount,
        message: "중간 위험 거래의 이체가 완료됐습니다.",
        riskLevel: "medium",
      });
      router.push("/transfer/evaluate/medium");
    } catch {
      setTransferResult({
        status: "failed",
        recipientName: transferDraft.recipientName,
        amount: transferDraft.amount,
        message:
          "이체를 완료하지 못했습니다. 계좌에서 돈이 빠져나가지 않았습니다.",
        riskLevel: "medium",
      });
      router.push("/transfer/result");
    } finally {
      transferInProgressRef.current = false;
    }
  };

  if (!transferDraft) {
    return (
      <AppScreen className="gap-5 pb-10 pt-6">
        <h1 className="text-2xl font-extrabold">확인할 거래가 없습니다.</h1>
        <p className="mt-4 leading-relaxed text-[var(--color-text-muted)]">
          송금 정보를 입력하고 내용을 먼저 확인해 주세요.
        </p>
        <Link
          href="/transfer"
          className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-[var(--color-primary)] px-6 py-3 font-semibold text-[var(--color-on-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
        >
          송금 정보 입력하기
        </Link>
      </AppScreen>
    );
  }

  return (
    <AppScreen className="gap-5 pb-10 pt-6">
      {status !== "executing" ? (
        <PageBackLink href="/transfer/review">송금 확인으로</PageBackLink>
      ) : null}
      <p className="font-bold text-[var(--color-accent)]">거래 안전 확인</p>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
        거래 위험을 확인하고 있습니다
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-[var(--color-text-muted)]">
        이 과정에서는 거래가 실행되지 않습니다. 창을 닫거나 버튼을 여러 번
        누르지 않아도 됩니다.
      </p>

      <div
        className="mt-8"
        aria-live="polite"
        aria-atomic="true"
        aria-busy={status === "checking" || status === "executing"}
      >
        {status === "checking" ? (
          <section className="rounded-xl border-2 border-[var(--color-accent)] bg-[var(--color-surface)] p-6">
            <h2 className="text-[15px] font-bold">안전 확인 요청을 처리 중입니다.</h2>
            <p className="mt-2 leading-relaxed text-[var(--color-text-muted)]">
              잠시만 기다려 주세요. 같은 요청은 중복으로 보내지 않습니다.
            </p>
          </section>
        ) : null}

        {status === "complete" && evaluation?.riskLevel === "low" ? (
          <section className="rounded-xl border-2 border-[var(--color-success)] bg-[var(--color-surface)] p-6">
            <p className="font-bold text-[var(--color-success)]">낮은 위험</p>
            <h2 className="mt-2 text-[15px] font-bold">바로 이체할 수 있습니다.</h2>
            <p className="mt-2 leading-relaxed">
              {evaluation.summary} 아직 이체되지 않았습니다.
            </p>
            <AccessibleButton
              className="mt-5 w-full"
              disabled={isTransferRequestLocked}
              isLoading={isTransferRequestLocked}
              loadingLabel="이체 요청을 처리하고 있어요"
              onClick={() => void executeTransfer()}
            >
              확인한 내용으로 이체 실행
            </AccessibleButton>
            <AccessibleButton
              className="mt-4 w-full"
              variant="secondary"
              disabled={isTransferRequestLocked}
              onClick={() => void executeMediumRiskMock()}
              data-secondary-content="true"
            >
              목업: 중위험 이체 완료 보기
            </AccessibleButton>
            <Link
              href="/transfer/evaluate/blocked"
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-3 font-semibold text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
              data-secondary-content="true"
            >
              목업: 고위험 차단 보기
            </Link>
          </section>
        ) : null}

        {status === "executing" ? (
          <section className="rounded-xl border-2 border-[var(--color-accent)] bg-[var(--color-surface)] p-6">
            <h2 className="text-[15px] font-bold">이체를 처리하고 있습니다.</h2>
            <p className="mt-2 leading-relaxed text-[var(--color-text-muted)]">
              버튼을 다시 누르지 않아도 됩니다. 중복 이체를 막고 있습니다.
            </p>
          </section>
        ) : null}

        {status === "error" ? (
          <section
            className="rounded-xl border-2 border-[var(--color-danger)] bg-[var(--color-surface)] p-6"
            role="alert"
          >
            <h2 className="text-[15px] font-bold">안전 확인 요청에 실패했습니다.</h2>
            <p className="mt-2 leading-relaxed text-[var(--color-text-muted)]">
              인터넷 연결을 확인한 후 다시 시도해 주세요. 이체는 실행되지
              않았습니다.
            </p>
            <AccessibleButton
              className="mt-5"
              onClick={() => void evaluateTransfer()}
            >
              다시 요청하기
            </AccessibleButton>
          </section>
        ) : null}

        {isTransferRequestLocked && status !== "executing" ? (
          <section
            className="rounded-xl border-2 border-[var(--color-warning)] bg-[var(--color-surface)] p-6"
            role="alert"
          >
            <h2 className="text-[15px] font-bold">이미 이체 요청을 처리 중입니다.</h2>
            <p className="mt-2 leading-relaxed">
              중복 이체를 막기 위해 새 요청을 받지 않았습니다. 잠시 후 결과
              화면을 확인해 주세요.
            </p>
            <AccessibleButton
              className="mt-5"
              variant="secondary"
              onClick={unlockTransferRequest}
            >
              Mock 요청 잠금 초기화
            </AccessibleButton>
          </section>
        ) : null}

      </div>
    </AppScreen>
  );
}

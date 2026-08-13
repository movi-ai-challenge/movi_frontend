"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { requestFdsEvaluation } from "@/services/fdsService";
import { executeLowRiskTransfer } from "@/services/transferService";
import { useBankStore } from "@/store/useBankStore";
import type { FdsEvaluationResult } from "@/types";

type EvaluationStatus =
  | "checking"
  | "complete"
  | "executing"
  | "success"
  | "error"
  | "transfer-error";

export default function TransferEvaluationPage() {
  const transferDraft = useBankStore((state) => state.transferDraft);
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
    if (transferInProgressRef.current) return;

    transferInProgressRef.current = true;
    setStatus("executing");
    try {
      await executeLowRiskTransfer();
      setStatus("success");
    } catch {
      setStatus("transfer-error");
    } finally {
      transferInProgressRef.current = false;
    }
  };

  if (!transferDraft) {
    return (
      <main className="mx-auto min-h-[70vh] w-full max-w-xl px-6 py-12">
        <h1 className="text-3xl font-bold">확인할 거래가 없습니다.</h1>
        <p className="mt-4 leading-7 text-[var(--color-text-muted)]">
          송금 정보를 입력하고 내용을 먼저 확인해 주세요.
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
      <p className="font-bold text-[var(--color-primary)]">거래 안전 확인</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">
        거래 위험을 확인하고 있습니다
      </h1>
      <p className="mt-4 text-lg leading-8 text-[var(--color-text-muted)]">
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
          <section className="rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-surface)] p-6">
            <h2 className="text-xl font-bold">안전 확인 요청을 처리 중입니다.</h2>
            <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
              잠시만 기다려 주세요. 같은 요청은 중복으로 보내지 않습니다.
            </p>
          </section>
        ) : null}

        {status === "complete" && evaluation?.riskLevel === "low" ? (
          <section className="rounded-xl border-2 border-[var(--color-success)] bg-[var(--color-surface)] p-6">
            <p className="font-bold text-[var(--color-success)]">낮은 위험</p>
            <h2 className="mt-2 text-xl font-bold">바로 이체할 수 있습니다.</h2>
            <p className="mt-2 leading-7">
              {evaluation.summary} 아직 이체되지 않았습니다.
            </p>
            <AccessibleButton
              className="mt-5 w-full"
              onClick={() => void executeTransfer()}
            >
              확인한 내용으로 이체 실행
            </AccessibleButton>
          </section>
        ) : null}

        {status === "executing" ? (
          <section className="rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-surface)] p-6">
            <h2 className="text-xl font-bold">이체를 처리하고 있습니다.</h2>
            <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
              버튼을 다시 누르지 않아도 됩니다. 중복 이체를 막고 있습니다.
            </p>
          </section>
        ) : null}

        {status === "success" ? (
          <section className="rounded-xl border-2 border-[var(--color-success)] bg-[var(--color-surface)] p-6">
            <h2 className="text-xl font-bold">이체가 완료됐습니다.</h2>
            <p className="mt-2 leading-7">
              {transferDraft.recipientName}님에게 {transferDraft.amount.toLocaleString("ko-KR")}원을 보냈습니다.
            </p>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              현재는 프론트엔드 시연용 Mock 결과입니다.
            </p>
            <Link
              href="/accounts"
              className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-[var(--color-primary)] px-6 py-3 font-semibold text-[var(--color-on-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
            >
              연결된 계좌로 이동
            </Link>
          </section>
        ) : null}

        {status === "error" ? (
          <section
            className="rounded-xl border-2 border-[var(--color-danger)] bg-[var(--color-surface)] p-6"
            role="alert"
          >
            <h2 className="text-xl font-bold">안전 확인 요청에 실패했습니다.</h2>
            <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
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

        {status === "transfer-error" ? (
          <section
            className="rounded-xl border-2 border-[var(--color-danger)] bg-[var(--color-surface)] p-6"
            role="alert"
          >
            <h2 className="text-xl font-bold">이체를 완료하지 못했습니다.</h2>
            <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
              계좌에서 돈이 빠져나가지 않았습니다. 거래내역을 확인한 후 다시
              시도해 주세요.
            </p>
            <AccessibleButton
              className="mt-5"
              onClick={() => void executeTransfer()}
            >
              이체 다시 시도
            </AccessibleButton>
          </section>
        ) : null}
      </div>
    </main>
  );
}

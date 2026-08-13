"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { PageBackLink } from "@/components/common/PageBackLink";
import { requestGuardianApproval } from "@/services/fdsService";
import { useBankStore } from "@/store/useBankStore";

type GuardianApprovalStatus = "sending" | "waiting" | "error";

export default function GuardianApprovalWaitPage() {
  const transferDraft = useBankStore((state) => state.transferDraft);
  const [status, setStatus] = useState<GuardianApprovalStatus>("sending");
  const requestInProgressRef = useRef(false);

  const sendApprovalRequest = async () => {
    if (requestInProgressRef.current) return;
    requestInProgressRef.current = true;
    setStatus("sending");

    try {
      await requestGuardianApproval();
      setStatus("waiting");
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
    void requestGuardianApproval()
      .then(() => {
        if (isActive) setStatus("waiting");
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

  if (!transferDraft) {
    return (
      <main className="mx-auto min-h-[70vh] w-full max-w-xl px-6 py-12">
        <h1 className="text-3xl font-bold">승인을 요청할 거래가 없습니다.</h1>
        <p className="mt-4 leading-7 text-[var(--color-text-muted)]">
          송금 정보를 입력하고 거래 안전 확인을 먼저 진행해 주세요.
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
      {status !== "sending" ? (
        <PageBackLink href="/transfer/review">송금 확인으로</PageBackLink>
      ) : null}

      <p className="font-bold text-[var(--color-warning)]">중간 위험</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">
        보호자 승인이 필요합니다
      </h1>
      <p className="mt-4 text-lg leading-8 text-[var(--color-text-muted)]">
        평소와 다른 거래로 확인되어 연결된 보호자에게 승인을 요청합니다.
        승인 전에는 이체되지 않습니다.
      </p>

      <section
        className="mt-8 rounded-xl border-2 border-[var(--color-warning)] bg-[var(--color-surface)] p-6"
        aria-live="polite"
        aria-atomic="true"
        aria-busy={status === "sending"}
      >
        {status === "sending" ? (
          <>
            <h2 className="text-xl font-bold">승인 요청을 보내고 있습니다.</h2>
            <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
              같은 요청은 중복으로 보내지 않습니다.
            </p>
          </>
        ) : null}

        {status === "waiting" ? (
          <>
            <h2 className="text-xl font-bold">보호자 승인을 기다리고 있습니다.</h2>
            <p className="mt-2 leading-7">
              {transferDraft.recipientName}님에게 보내는 {transferDraft.amount.toLocaleString("ko-KR")}원은 아직 이체되지 않았습니다.
            </p>
            <p className="mt-3 text-[var(--color-text-muted)]">
              이 화면은 프론트엔드 시연용 Mock 상태입니다.
            </p>
          </>
        ) : null}

        {status === "error" ? (
          <div role="alert">
            <h2 className="text-xl font-bold">승인 요청을 보내지 못했습니다.</h2>
            <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
              이체는 실행되지 않았습니다. 인터넷 연결을 확인하고 다시 시도해
              주세요.
            </p>
            <AccessibleButton
              className="mt-5"
              onClick={() => void sendApprovalRequest()}
            >
              승인 요청 다시 보내기
            </AccessibleButton>
          </div>
        ) : null}
      </section>
    </main>
  );
}

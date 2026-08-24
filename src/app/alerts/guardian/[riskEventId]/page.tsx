"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { getGuardianRiskAlertRecord } from "@/services/guardianRiskAlertService";
import type {
  GuardianRiskAlertDeliveryStatus,
  GuardianRiskAlertRecord,
} from "@/types";

type PageStatus = "loading" | "ready" | "error" | "not-found";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
  hour: "numeric",
  minute: "2-digit",
});

const statusContent: Readonly<
  Record<
    GuardianRiskAlertDeliveryStatus,
    { label: string; title: string; description: string; borderClassName: string }
  >
> = {
  pending: {
    label: "발송 대기",
    title: "백엔드에서 알림 발송을 준비하고 있습니다.",
    description:
      "검증된 위험 거래 이벤트의 알림 발송을 기다리고 있습니다. 이 화면은 발송을 시작하지 않습니다.",
    borderClassName: "border-[var(--color-warning)]",
  },
  sent: {
    label: "발송 완료",
    title: "보호자 알림 발송이 완료됐습니다.",
    description:
      "백엔드가 처리한 발송 완료 상태를 표시하고 있습니다.",
    borderClassName: "border-[var(--color-success)]",
  },
  failed: {
    label: "발송 실패",
    title: "보호자 알림 발송을 완료하지 못했습니다.",
    description:
      "이 화면에서는 알림을 다시 보내지 않습니다. 백엔드 재시도 정책과 운영 대응 절차를 확인해야 합니다.",
    borderClassName: "border-[var(--color-danger)]",
  },
  retrying: {
    label: "재시도 처리 중",
    title: "백엔드에서 알림 발송을 다시 시도하고 있습니다.",
    description:
      "재시도 요청과 중복 방지는 백엔드가 관리합니다. 잠시 후 상태를 다시 확인할 수 있습니다.",
    borderClassName: "border-[var(--color-warning)]",
  },
};

export default function GuardianRiskAlertPage() {
  const params = useParams<{ riskEventId: string }>();
  const [record, setRecord] = useState<GuardianRiskAlertRecord | null>(null);
  const [status, setStatus] = useState<PageStatus>("loading");
  const requestInProgressRef = useRef(false);
  const shouldFocusResultRef = useRef(false);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);

  const loadStatus = async (focusResult: boolean) => {
    if (requestInProgressRef.current) return;

    requestInProgressRef.current = true;
    shouldFocusResultRef.current = focusResult;
    setStatus("loading");

    try {
      const loadedRecord = await getGuardianRiskAlertRecord(params.riskEventId);
      setRecord(loadedRecord);
      setStatus(loadedRecord ? "ready" : "not-found");
    } catch {
      setRecord(null);
      setStatus("error");
    } finally {
      requestInProgressRef.current = false;
    }
  };

  useEffect(() => {
    if (status === "loading" || !shouldFocusResultRef.current) return;

    shouldFocusResultRef.current = false;
    resultHeadingRef.current?.focus();
  }, [status]);

  useEffect(() => {
    let isActive = true;
    requestInProgressRef.current = true;

    void getGuardianRiskAlertRecord(params.riskEventId)
      .then((loadedRecord) => {
        if (!isActive) return;
        setRecord(loadedRecord);
        setStatus(loadedRecord ? "ready" : "not-found");
      })
      .catch(() => {
        if (!isActive) return;
        setRecord(null);
        setStatus("error");
      })
      .finally(() => {
        requestInProgressRef.current = false;
      });

    return () => {
      isActive = false;
    };
  }, [params.riskEventId]);

  const content = record ? statusContent[record.status] : null;

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-xl px-6 py-12">
      <p
        className="font-bold text-[var(--color-primary)]"
        data-secondary-content="true"
      >
        위험 거래 보호자 알림
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">
        보호자 알림 상태를 확인합니다
      </h1>
      <p className="mt-4 text-lg leading-8 text-[var(--color-text-muted)]">
        보호자는 위험 거래 알림만 받습니다. 계좌나 거래내역을 조회하거나 이체를
        승인·거절할 수 없습니다.
      </p>

      <div
        className="mt-8"
        aria-live="polite"
        aria-atomic="true"
        aria-busy={status === "loading"}
      >
        {status === "loading" ? (
          <p className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-lg font-semibold">
            백엔드가 처리한 보호자 알림 상태를 불러오고 있어요.
          </p>
        ) : null}

        {status === "not-found" ? (
          <section className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <h2
              ref={resultHeadingRef}
              tabIndex={-1}
              className="text-xl font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
            >
              위험 거래 알림 기록을 찾지 못했습니다.
            </h2>
            <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
              잘못된 경로이거나 더 이상 확인할 수 없는 위험 이벤트입니다.
            </p>
          </section>
        ) : null}

        {status === "error" ? (
          <section
            className="rounded-xl border-2 border-[var(--color-danger)] bg-[var(--color-surface)] p-6"
            role="alert"
          >
            <h2
              ref={resultHeadingRef}
              tabIndex={-1}
              className="text-xl font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
            >
              보호자 알림 상태를 불러오지 못했습니다.
            </h2>
            <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
              네트워크 상태를 확인하고 다시 불러와 주세요. 다시 불러와도 알림을
              새로 발송하지 않습니다.
            </p>
            <AccessibleButton
              className="mt-5"
              onClick={() => void loadStatus(true)}
            >
              알림 상태 다시 불러오기
            </AccessibleButton>
          </section>
        ) : null}

        {status === "ready" && record && content ? (
          <section
            className={`rounded-xl border-2 bg-[var(--color-surface)] p-6 ${content.borderClassName}`}
          >
            <p className="font-bold">{content.label}</p>
            <h2
              ref={resultHeadingRef}
              tabIndex={-1}
              className="mt-2 text-xl font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
            >
              {content.title}
            </h2>
            <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
              {content.description}
            </p>
            <dl className="mt-5 grid gap-4 border-t-2 border-[var(--color-border)] pt-5">
              <div>
                <dt className="font-semibold text-[var(--color-text-muted)]">
                  감지 내용
                </dt>
                <dd className="mt-1 text-lg font-bold">{record.summary}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--color-text-muted)]">
                  감지 시각
                </dt>
                <dd className="mt-1 font-semibold">
                  {dateFormatter.format(new Date(record.detectedAt))}
                </dd>
              </div>
              {record.lastAttemptedAt ? (
                <div>
                  <dt className="font-semibold text-[var(--color-text-muted)]">
                    마지막 발송 처리 시각
                  </dt>
                  <dd className="mt-1 font-semibold">
                    {dateFormatter.format(new Date(record.lastAttemptedAt))}
                  </dd>
                </div>
              ) : null}
            </dl>
            <p className="mt-5 leading-7 text-[var(--color-text-muted)]">
              알림 채널과 보호자에게 표시할 최소 정보는 백엔드·기획 협의 후
              확정합니다. 이 화면에는 계좌번호, 잔액, 수취인, 금액을 표시하지
              않습니다.
            </p>
          </section>
        ) : null}
      </div>

      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2 font-semibold text-[var(--color-text)] hover:border-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
      >
        MOVI 처음 화면으로
      </Link>
    </main>
  );
}

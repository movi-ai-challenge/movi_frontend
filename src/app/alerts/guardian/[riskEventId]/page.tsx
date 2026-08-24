"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import {
  getGuardianRiskAlertTarget,
  sendGuardianRiskAlert,
} from "@/services/guardianRiskAlertService";
import type {
  GuardianRiskAlertDelivery,
  GuardianRiskAlertTarget,
} from "@/types";

type PageStatus = "loading" | "sending" | "sent" | "error" | "not-found";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
  hour: "numeric",
  minute: "2-digit",
});

export default function GuardianRiskAlertPage() {
  const params = useParams<{ riskEventId: string }>();
  const [target, setTarget] = useState<GuardianRiskAlertTarget | null>(null);
  const [delivery, setDelivery] =
    useState<GuardianRiskAlertDelivery | null>(null);
  const [status, setStatus] = useState<PageStatus>("loading");
  const sendInProgressRef = useRef(false);
  const sentHeadingRef = useRef<HTMLHeadingElement>(null);
  const errorHeadingRef = useRef<HTMLHeadingElement>(null);

  const sendAlert = async (
    alertTarget: GuardianRiskAlertTarget,
    focusResult: boolean,
  ) => {
    if (sendInProgressRef.current) return;

    sendInProgressRef.current = true;
    setStatus("sending");
    setDelivery(null);

    try {
      const sentDelivery = await sendGuardianRiskAlert(alertTarget);
      setDelivery(sentDelivery);
      setStatus("sent");
      if (focusResult) {
        window.setTimeout(() => sentHeadingRef.current?.focus(), 0);
      }
    } catch {
      setStatus("error");
      if (focusResult) {
        window.setTimeout(() => errorHeadingRef.current?.focus(), 0);
      }
    } finally {
      sendInProgressRef.current = false;
    }
  };

  useEffect(() => {
    let isActive = true;

    void (async () => {
      try {
        const loadedTarget = await getGuardianRiskAlertTarget(
          params.riskEventId,
        );
        if (!isActive) return;

        if (!loadedTarget) {
          setTarget(null);
          setStatus("not-found");
          return;
        }

        setTarget(loadedTarget);
        setStatus("sending");
        const sentDelivery = await sendGuardianRiskAlert(loadedTarget);
        if (!isActive) return;
        setDelivery(sentDelivery);
        setStatus("sent");
      } catch {
        if (isActive) setStatus("error");
      }
    })();

    return () => {
      isActive = false;
    };
  }, [params.riskEventId]);

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-xl px-6 py-12">
      <p
        className="font-bold text-[var(--color-primary)]"
        data-secondary-content="true"
      >
        위험 거래 보호자 알림
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">
        보호자에게 위험 거래를 알리고 있어요
      </h1>
      <p className="mt-4 text-lg leading-8 text-[var(--color-text-muted)]">
        보호자는 위험 거래 알림만 받습니다. 계좌나 거래내역을 조회하거나 이체를
        승인·거절할 수 없습니다.
      </p>

      <div
        className="mt-8"
        aria-live="polite"
        aria-atomic="true"
        aria-busy={status === "loading" || status === "sending"}
      >
        {status === "loading" ? (
          <p className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-lg font-semibold">
            위험 거래 정보를 확인하고 있어요.
          </p>
        ) : null}

        {status === "not-found" ? (
          <section className="rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <h2 className="text-xl font-bold">위험 거래 정보를 찾지 못했습니다.</h2>
            <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
              잘못된 경로이거나 더 이상 확인할 수 없는 위험 이벤트입니다.
            </p>
          </section>
        ) : null}

        {status === "sending" && target ? (
          <section className="rounded-xl border-2 border-[var(--color-warning)] bg-[var(--color-surface)] p-6">
            <h2 className="text-xl font-bold">보호자 알림을 보내고 있습니다.</h2>
            <p className="mt-2 leading-7">
              같은 위험 이벤트의 알림은 한 번만 요청합니다. 잠시만 기다려 주세요.
            </p>
          </section>
        ) : null}

        {status === "error" ? (
          <section
            className="rounded-xl border-2 border-[var(--color-danger)] bg-[var(--color-surface)] p-6"
            role="alert"
          >
            <h2
              ref={errorHeadingRef}
              tabIndex={-1}
              className="text-xl font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
            >
              보호자 알림을 보내지 못했습니다.
            </h2>
            <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
              네트워크 상태를 확인하고 다시 시도해 주세요. 보호자에게 금융 조회나
              승인 권한이 생기지는 않습니다.
            </p>
            {target ? (
              <AccessibleButton
                className="mt-5"
                onClick={() => void sendAlert(target, true)}
              >
                보호자 알림 다시 보내기
              </AccessibleButton>
            ) : null}
          </section>
        ) : null}

        {status === "sent" && target && delivery ? (
          <section className="rounded-xl border-2 border-[var(--color-success)] bg-[var(--color-surface)] p-6">
            <h2
              ref={sentHeadingRef}
              tabIndex={-1}
              className="text-xl font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
            >
              보호자 알림 발송을 완료했습니다.
            </h2>
            <dl className="mt-5 grid gap-4 border-t-2 border-[var(--color-border)] pt-5">
              <div>
                <dt className="font-semibold text-[var(--color-text-muted)]">
                  감지 내용
                </dt>
                <dd className="mt-1 text-lg font-bold">{target.summary}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--color-text-muted)]">
                  감지 시각
                </dt>
                <dd className="mt-1 font-semibold">
                  {dateFormatter.format(new Date(target.detectedAt))}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--color-text-muted)]">
                  알림 상태
                </dt>
                <dd className="mt-1 font-bold">발송 완료 · Mock</dd>
              </div>
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

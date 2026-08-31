"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AppScreen } from "@/components/common/AppScreen";
import { getNotifications } from "@/services/notificationService";
import type { FdsAlert, FdsAlertSeverity } from "@/types";

/**
 * 알림 (명세 10.1 이체 완료 / 10.3 긴급 위험 / 10.4 알림 클릭 이동)
 */
export default function NotificationsPage() {
  const [alerts, setAlerts] = useState<FdsAlert[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    getNotifications()
      .then((next) => {
        if (isActive) setAlerts(next);
      })
      .catch(() => {
        if (isActive) setLoadError("알림을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
      });

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <AppScreen className="gap-5 pb-10 pt-6">
      <header className="flex items-center gap-3">
        <Link
          href="/"
          aria-label="첫 화면으로"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
        >
          <span aria-hidden="true">←</span>
        </Link>
        <h1 className="text-xl font-extrabold">알림</h1>
      </header>

      {loadError ? (
        <p
          role="alert"
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 text-[15px] text-[var(--color-danger)]"
        >
          {loadError}
        </p>
      ) : alerts === null ? (
        <p role="status" className="text-[15px] text-[var(--color-text-muted)]">
          알림을 불러오는 중이에요.
        </p>
      ) : alerts.length === 0 ? (
        <p className="text-[15px] text-[var(--color-text-muted)]">받은 알림이 없어요.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {alerts.map((alert) => (
            <li key={alert.id}>
              <NotificationCard alert={alert} />
            </li>
          ))}
        </ul>
      )}
    </AppScreen>
  );
}

/**
 * 심각도별 표현.
 *
 * 색만으로 구분하지 않는다. 기호와 제목 문구가 항상 함께 간다.
 */
const SEVERITY_PRESET: Record<
  FdsAlertSeverity,
  { symbol: string; text: string; surface: string; border: string; label: string }
> = {
  critical: {
    symbol: "🚨",
    text: "text-[var(--color-danger)]",
    surface: "bg-[var(--color-danger-surface)]",
    border: "border-[var(--color-danger-border)]",
    label: "긴급",
  },
  warning: {
    symbol: "⏳",
    text: "text-[var(--color-warning)]",
    surface: "bg-[var(--color-warning-surface)]",
    border: "border-[var(--color-warning-border)]",
    label: "확인 필요",
  },
  info: {
    symbol: "✅",
    text: "text-[var(--color-success)]",
    surface: "bg-[var(--color-success-surface)]",
    border: "border-[var(--color-success-border)]",
    label: "완료",
  },
};

function NotificationCard({ alert }: { alert: FdsAlert }) {
  const preset = SEVERITY_PRESET[alert.severity];

  // 10.4 알림 클릭 이동 — 관련 거래가 있으면 상세로 보낸다.
  const href = alert.transactionId ? `/transactions/${alert.transactionId}` : "/transactions";

  return (
    <Link
      href={href}
      className={`flex gap-3 rounded-2xl border px-4 py-3.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 ${preset.surface} ${preset.border}`}
    >
      <span aria-hidden="true" className="text-2xl">
        {preset.symbol}
      </span>
      <span className="flex-1">
        <span className={`block text-[15px] font-bold ${preset.text}`}>
          {alert.title}
          <span className="sr-only"> · {preset.label}</span>
        </span>
        <span className="mt-1 block text-[13px] leading-relaxed text-[var(--color-text-muted)]">
          {alert.description}
        </span>
      </span>
      <time
        dateTime={alert.detectedAt}
        className="shrink-0 text-xs text-[var(--color-text-muted)]"
      >
        {formatAlertTime(alert.detectedAt)}
      </time>
    </Link>
  );
}

function formatAlertTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

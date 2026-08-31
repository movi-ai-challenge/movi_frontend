"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AccessibilitySettingsPanel } from "@/components/common/AccessibilitySettingsPanel";
import { AppScreen } from "@/components/common/AppScreen";
import { getConnectedAccounts } from "@/services/accountService";
import { useAuthStore } from "@/store/useAuthStore";
import { useBankStore } from "@/store/useBankStore";

/**
 * 설정 (명세 11.x 접근성, 1.3 연결 계좌 조회, 1.4 기본 계좌 설정)
 *
 * 인증 보호 대상이 아니다. 저시력 사용자가 로그인하기 전에 고대비와
 * 큰 글씨를 켤 수 있어야 한다. 계좌 항목은 세션이 있을 때만 보여준다.
 */
export default function SettingsPage() {
  const session = useAuthStore((state) => state.session);
  const accounts = useBankStore((state) => state.accounts);
  const setAccounts = useBankStore((state) => state.setAccounts);
  const defaultAccountId = useBankStore((state) => state.defaultAccountId);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let isActive = true;

    getConnectedAccounts()
      .then((connected) => {
        if (isActive) setAccounts(connected);
      })
      .catch(() => {
        if (isActive) setLoadError("계좌 정보를 불러오지 못했어요.");
      });

    return () => {
      isActive = false;
    };
  }, [session, setAccounts]);

  const defaultAccount =
    accounts.find((account) => account.id === defaultAccountId) ?? accounts[0] ?? null;

  return (
    <AppScreen className="gap-6 pb-10 pt-6">
      <header className="flex items-center gap-3">
        <Link
          href="/"
          aria-label="첫 화면으로"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
        >
          <span aria-hidden="true">←</span>
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight">설정</h1>
      </header>

      <AccessibilitySettingsPanel />

      {session ? (
        <section aria-labelledby="account-settings-title">
          <h2
            id="account-settings-title"
            className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]"
          >
            계좌 관리
          </h2>
          {loadError ? (
            <p
              role="alert"
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 text-[15px] text-[var(--color-danger)]"
            >
              {loadError}
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              <SettingLink href="/accounts" label="연결 계좌 조회" value={`${accounts.length}개`} />
              <SettingLink
                href="/accounts"
                label="기본 계좌 설정"
                value={defaultAccount ? defaultAccount.bankName : "미설정"}
                isLast
              />
            </div>
          )}
        </section>
      ) : null}
    </AppScreen>
  );
}

function SettingLink({
  href,
  label,
  value,
  isLast = false,
}: {
  href: string;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-14 items-center justify-between gap-4 px-4 py-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 ${
        isLast ? "" : "border-b border-[var(--color-border)]"
      }`}
    >
      <span className="text-[15px] text-[var(--color-text)]">{label}</span>
      <span className="text-[13px] text-[var(--color-text-muted)]">
        {value}
        <span aria-hidden="true" className="ml-2">
          ›
        </span>
      </span>
    </Link>
  );
}

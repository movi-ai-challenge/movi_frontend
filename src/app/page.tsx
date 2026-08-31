"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Amount } from "@/components/common/Amount";
import { AppScreen } from "@/components/common/AppScreen";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { VoiceWave } from "@/components/common/VoiceWave";
import { getConnectedAccounts } from "@/services/accountService";
import { useAuthStore } from "@/store/useAuthStore";
import { useBankStore } from "@/store/useBankStore";

/**
 * 첫 화면.
 *
 * 목업의 splash 와 home 은 같은 진입점의 로그인 전/후 상태다.
 * 라우트를 늘리지 않고 세션 유무로 나눈다.
 */
export default function HomePage() {
  const session = useAuthStore((state) => state.session);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  // 세션 복원 전에는 둘 중 어느 화면도 확정할 수 없다. 먼저 그렸다가
  // 바꾸면 낭독기가 사라질 화면을 읽고 화면이 깜빡인다.
  if (!hasHydrated) {
    return (
      <AppScreen className="items-center justify-center">
        <p role="status" className="text-[15px] text-[var(--color-text-muted)]">
          불러오는 중이에요.
        </p>
      </AppScreen>
    );
  }

  return session ? <SignedInHome displayName={session.displayName} /> : <SplashScreen />;
}

/* ============================================================
   로그인 전 — 목업 splash
   ============================================================ */

function SplashScreen() {
  return (
    <AppScreen
      className="items-center justify-center gap-6 text-center"
      footer={
        <>
          <Link
            href="/login"
            className="flex h-14 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-[17px] font-bold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            시작하기
          </Link>
          <p className="text-center text-xs text-[var(--color-text-muted)]">
            MOVI · 음성 중심 포용 금융
          </p>
        </>
      }
    >
      <span
        aria-hidden="true"
        className="flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-[var(--color-primary)] text-4xl"
      >
        🎙️
      </span>
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-black tracking-tight">MOVI</h1>
        <p className="text-[15px] text-[var(--color-text-muted)]">말 한마디로 완성되는 금융</p>
      </div>

      {/* 로그인 전에도 고대비·큰 글씨를 켤 수 있어야 한다. */}
      <Link
        href="/settings"
        className="inline-flex min-h-11 items-center rounded-lg px-3 text-[15px] font-semibold text-[var(--color-accent)] underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
      >
        화면 보기 설정
      </Link>
    </AppScreen>
  );
}

/* ============================================================
   로그인 후 — 목업 home
   ============================================================ */

// 목업 빠른 메뉴의 "보호자" 항목은 두지 않는다. 확정된 보호자 정책
// (docs/GUARDIAN_ALERT_POLICY.md)이 보호자용 금융 대시보드를 금지한다.
const QUICK_MENU = [
  { href: "/balance", label: "잔액", symbol: "💰" },
  { href: "/transfer", label: "이체", symbol: "📤" },
  { href: "/transactions", label: "내역", symbol: "📋" },
] as const;

function SignedInHome({ displayName }: { displayName: string }) {
  const router = useRouter();
  const accounts = useBankStore((state) => state.accounts);
  const setAccounts = useBankStore((state) => state.setAccounts);
  const defaultAccountId = useBankStore((state) => state.defaultAccountId);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    let isActive = true;

    getConnectedAccounts()
      .then((connected) => {
        if (isActive) setAccounts(connected);
      })
      .catch(() => {
        if (isActive) setLoadError("계좌 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
      });

    return () => {
      isActive = false;
    };
  }, [setAccounts]);

  // 음성 인식 상태 표시. 실제 STT 연결은 백엔드 계약이 정해지면 붙인다.
  // 인식이 끝나면 목업과 동일하게 잔액 화면으로 이동한다.
  const startListening = () => {
    if (isListening) return;
    setIsListening(true);
    window.setTimeout(() => {
      setIsListening(false);
      router.push("/balance");
    }, 1800);
  };

  const mainAccount =
    accounts.find((account) => account.id === defaultAccountId) ?? accounts[0] ?? null;

  return (
    <AppScreen className="gap-5 pb-8 pt-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--color-text-muted)]">안녕하세요</p>
          <p className="text-xl font-extrabold">{displayName}님</p>
        </div>
        <nav aria-label="바로가기" className="flex gap-2">
          <IconLink href="/settings" label="설정" symbol="⚙️" />
        </nav>
      </header>

      {/* 주계좌 */}
      {loadError ? (
        <SurfaceCard className="p-5">
          <p role="alert" className="text-[15px] text-[var(--color-danger)]">
            {loadError}
          </p>
        </SurfaceCard>
      ) : (
        <SurfaceCard accent className="p-5">
          {mainAccount ? (
            <>
              <p className="text-xs text-[var(--color-text-muted)]">
                {mainAccount.bankName} {mainAccount.maskedAccountNumber}
              </p>
              {/* balance 는 선택 필드다. 값이 없으면 금액을 지어내지 않고
                  잔액 조회로 안내한다. */}
              {typeof mainAccount.balance === "number" ? (
                <p className="mt-1 text-[28px] font-black">
                  <Amount value={mainAccount.balance} />
                </p>
              ) : (
                <p className="mt-1 text-[15px] text-[var(--color-text-muted)]">
                  잔액을 확인해 보세요.
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <QuickPill href="/balance">잔액조회</QuickPill>
                <QuickPill href="/transfer">이체</QuickPill>
                <QuickPill href="/transactions">내역</QuickPill>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-[15px] text-[var(--color-text-muted)]">
                아직 연결된 계좌가 없어요.
              </p>
              <QuickPill href="/accounts/connect">계좌 연결하기</QuickPill>
            </div>
          )}
        </SurfaceCard>
      )}

      {/* 음성 명령 */}
      <section
        aria-labelledby="voice-heading"
        className="flex flex-1 flex-col items-center justify-center gap-4"
      >
        <h2 id="voice-heading" role="status" className="text-[15px] text-[var(--color-text-muted)]">
          {isListening ? "듣고 있어요..." : "무엇을 도와드릴까요?"}
        </h2>

        <div className="relative flex items-center justify-center">
          {isListening ? (
            <>
              <span
                aria-hidden="true"
                className="movi-pulse-ring absolute h-[6.5rem] w-[6.5rem] rounded-full border-2 border-[var(--color-accent)]"
              />
              <span
                aria-hidden="true"
                className="movi-pulse-ring absolute h-32 w-32 rounded-full border-2 border-[var(--color-accent)]"
                style={{ animationDelay: "0.3s" }}
              />
            </>
          ) : null}
          <button
            type="button"
            aria-pressed={isListening}
            onClick={startListening}
            className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-primary)] text-3xl transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            <span aria-hidden="true">🎙️</span>
            <span className="sr-only">{isListening ? "음성 인식 중" : "음성으로 명령하기"}</span>
          </button>
        </div>

        <VoiceWave size={32} className={isListening ? "" : "invisible"} />
      </section>

      {/* 빠른 메뉴 */}
      <nav aria-label="주요 기능" className="grid grid-cols-3 gap-2">
        {QUICK_MENU.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
          >
            <span aria-hidden="true" className="text-xl">
              {item.symbol}
            </span>
            <span className="text-xs text-[var(--color-text)]">{item.label}</span>
          </Link>
        ))}
      </nav>
    </AppScreen>
  );
}

function IconLink({ href, label, symbol }: { href: string; label: string; symbol: string }) {
  return (
    <Link
      href={href}
      className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
    >
      <span aria-hidden="true">{symbol}</span>
      <span className="sr-only">{label}</span>
    </Link>
  );
}

function QuickPill({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center rounded-lg border border-[var(--color-border-strong)] px-4 text-[13px] font-semibold text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
    >
      {children}
    </Link>
  );
}

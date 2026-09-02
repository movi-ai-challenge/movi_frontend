"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Amount } from "@/components/common/Amount";
import { AppScreen } from "@/components/common/AppScreen";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { VoiceWave } from "@/components/common/VoiceWave";
import { getConnectedAccounts } from "@/services/accountService";
import {
  isVoiceStreamSupported,
  startVoiceStream,
  type VoiceStreamSession,
} from "@/services/voiceStreamService";
import {
  isVoiceCommandResponseData,
  mapVoiceCommandResponse,
} from "@/services/voiceContract";
import { startVoiceSession } from "@/services/voiceService";
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

/**
 * 명령 처리 결과를 화면·낭독용 한 문장으로 바꾼다.
 *
 * 상태 이름을 그대로 보여주면 화면을 보지 않는 사용자에게는 아무 뜻이 없다.
 * 다음에 무엇을 하면 되는지를 말해 준다.
 */
function describeCommandState(state: string | null | undefined): string {
  if (state === "CLARIFYING") return "조금 더 알려주세요.";
  if (state === "AWAITING_CONFIRMATION") return "내용을 확인하고 이체를 진행해 주세요.";
  if (state === "COMPLETED") return "요청을 처리했어요.";
  if (state === "CANCELED") return "취소했어요.";
  if (state === "EXPIRED") return "시간이 지나 다시 말씀해 주셔야 해요.";
  return "";
}

function SignedInHome({ displayName }: { displayName: string }) {
  const session = useAuthStore((state) => state.session);
  const accounts = useBankStore((state) => state.accounts);
  const setAccounts = useBankStore((state) => state.setAccounts);
  const defaultAccountId = useBankStore((state) => state.defaultAccountId);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [heardText, setHeardText] = useState("");
  const [commandText, setCommandText] = useState("");
  const [isActivated, setIsActivated] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [commandState, setCommandState] = useState<string | null>(null);
  const [commandGuide, setCommandGuide] = useState("");
  const sessionRef = useRef<VoiceStreamSession | null>(null);

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

  /*
   * 실시간 음성 인식.
   *
   * 말하는 도중에 인식 결과가 계속 올라와 화면에 그대로 붙는다. '모비야'를
   * 만나기 전 발화는 명령으로 치지 않으므로 activated 로 화면을 나눈다.
   */
  const stopStream = useCallback(() => {
    sessionRef.current?.stop();
    sessionRef.current = null;
    setIsListening(false);
  }, []);

  const startListening = async () => {
    if (isListening) {
      stopStream();
      return;
    }
    if (!isVoiceStreamSupported()) {
      setVoiceError("이 브라우저는 실시간 음성 인식을 지원하지 않아요.");
      return;
    }
    const accessToken = session?.backend?.accessToken;
    if (!accessToken) {
      setVoiceError("로그인이 필요해요.");
      return;
    }

    setVoiceError("");
    setHeardText("");
    setCommandText("");
    setCommandState(null);
    setCommandGuide("");
    setIsActivated(false);
    setIsListening(true);

    try {
      /*
       * 음성 세션을 먼저 연다. 세션 없이 연결하면 백엔드가 인식 결과만 흘려보내고
       * 명령으로 처리하지 않는다 -- 어느 대화에 속한 말인지 모르면 이전 발화의
       * 금액·수취인과 이어 붙일 수 없다.
       */
      const voiceSession = await startVoiceSession();

      sessionRef.current = await startVoiceStream(accessToken, {
        onResult: (result) => {
          setHeardText(result.fullText);
          setIsActivated(result.activated);
          setCommandText(result.command);
        },
        onCommand: (data) => {
          if (!isVoiceCommandResponseData(data)) return;
          const result = mapVoiceCommandResponse(data, null);
          setCommandState(result.state ?? null);
          setCommandGuide(describeCommandState(result.state));
          stopStream();
        },
        onCommandError: (error) => {
          setVoiceError(error.voiceMessage || "명령을 처리하지 못했어요.");
          stopStream();
        },
        onError: (error) => {
          setVoiceError(
            error.retryable
              ? "잘 못 알아들었어요. 다시 말씀해 주세요."
              : "음성 인식에 문제가 생겼어요.",
          );
        },
        onClose: () => {
          sessionRef.current = null;
          setIsListening(false);
        },
      }, voiceSession.voiceSessionId);
    } catch {
      setIsListening(false);
      setVoiceError("마이크를 사용할 수 없어요. 권한을 확인해 주세요.");
    }
  };

  // 화면을 벗어날 때 마이크와 연결을 반드시 놓는다. 남겨 두면 녹음이 계속된다.
  useEffect(() => stopStream, [stopStream]);

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
          {!isListening ? "무엇을 도와드릴까요?" : null}
          {isListening && !isActivated ? "듣고 있어요. \"모비야\"라고 불러 주세요" : null}
          {isListening && isActivated ? "말씀하세요" : null}
        </h2>

        {/*
          인식되는 말을 그대로 보여 준다. aria-live 는 polite 로 둔다 -- 글자가
          계속 고쳐지는데 assertive 로 두면 낭독기가 매번 말을 끊고 다시 읽는다.
        */}
        <div
          aria-live="polite"
          aria-atomic="true"
          className="min-h-24 w-full px-2 text-center"
        >
          {heardText ? (
            <p
              className={`text-xl font-bold leading-8 ${
                isActivated ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]"
              }`}
            >
              {heardText}
            </p>
          ) : null}
          {isActivated && commandText ? (
            <p className="mt-2 text-sm text-[var(--color-accent)]">
              명령: {commandText}
            </p>
          ) : null}
          {commandGuide ? (
            <p className="mt-3 text-lg font-bold text-[var(--color-accent)]">
              {commandGuide}
            </p>
          ) : null}
          {commandState === "AWAITING_CONFIRMATION" ? (
            <Link
              href="/transfer"
              className="mt-3 inline-block min-h-11 text-lg font-semibold text-[var(--color-accent)] underline"
            >
              이체 화면에서 확인하기
            </Link>
          ) : null}
        </div>

        <div className="relative flex items-center justify-center">
          {isListening ? (
            <>
              <span
                aria-hidden="true"
                className="movi-pulse-ring absolute h-44 w-44 rounded-full border-2 border-[var(--color-accent)]"
              />
              <span
                aria-hidden="true"
                className="movi-pulse-ring absolute h-52 w-52 rounded-full border-2 border-[var(--color-accent)]"
                style={{ animationDelay: "0.3s" }}
              />
            </>
          ) : null}
          <button
            type="button"
            aria-pressed={isListening}
            onClick={startListening}
            className="relative flex h-36 w-36 items-center justify-center rounded-full bg-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            {/*
              크기는 버튼이 아니라 이 span 에 준다. 이모지의 실제 그려지는 높이는
              글꼴마다 달라, 버튼 크기와 따로 조절할 수 있어야 비율을 맞추기 쉽다.
              leading-none 이 없으면 줄 높이만큼 아래로 밀려 원 중앙에서 벗어난다.
            */}
            <span aria-hidden="true" className="text-[4.5rem] leading-none">
              🎙️
            </span>
            <span className="sr-only">
              {isListening ? "듣는 중입니다. 누르면 멈춥니다" : "음성으로 명령하기"}
            </span>
          </button>
        </div>

        <VoiceWave size={32} className={isListening ? "" : "invisible"} />

        <div className="min-h-10" aria-live="assertive" aria-atomic="true">
          {voiceError ? (
            <p role="alert" className="text-[15px] font-semibold text-[var(--color-danger)]">
              {voiceError}
            </p>
          ) : null}
        </div>
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

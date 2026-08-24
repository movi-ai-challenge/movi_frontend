"use client";

import { useEffect, useMemo, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { useBankStore } from "@/store/useBankStore";
import type { Account } from "@/types";

interface BalanceVoiceGuideProps {
  account: Account;
}

type GuideStatus = "idle" | "speaking" | "error" | "unsupported";

const amountFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 0,
});

function createBalanceGuideText(account: Account): string {
  return `${account.bankName} ${account.accountName}, 계좌번호 ${account.maskedAccountNumber}의 현재 잔액은 ${amountFormatter.format(account.balance)}원입니다.`;
}

export function BalanceVoiceGuide({ account }: BalanceVoiceGuideProps) {
  const setVoiceState = useBankStore((state) => state.setVoiceState);
  const resetVoiceState = useBankStore((state) => state.resetVoiceState);
  const [status, setStatus] = useState<GuideStatus>("idle");
  const guideText = useMemo(() => createBalanceGuideText(account), [account]);

  useEffect(
    () => () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      resetVoiceState();
    },
    [resetVoiceState],
  );

  const playGuide = () => {
    if (
      !("speechSynthesis" in window) ||
      !("SpeechSynthesisUtterance" in window)
    ) {
      setStatus("unsupported");
      setVoiceState({
        status: "error",
        transcript: "",
        errorMessage: "이 브라우저에서는 음성 안내를 지원하지 않습니다.",
      });
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(guideText);
    utterance.lang = "ko-KR";
    utterance.rate = 0.9;
    utterance.onend = () => {
      setStatus("idle");
      resetVoiceState();
    };
    utterance.onerror = () => {
      setStatus("error");
      setVoiceState({
        status: "error",
        transcript: "",
        errorMessage: "잔액 음성 안내를 재생하지 못했습니다.",
      });
    };

    setStatus("speaking");
    setVoiceState({
      status: "speaking",
      transcript: guideText,
      errorMessage: null,
    });
    window.speechSynthesis.speak(utterance);
  };

  const stopGuide = () => {
    window.speechSynthesis.cancel();
    setStatus("idle");
    resetVoiceState();
  };

  return (
    <section
      className="mt-4 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-background)] p-5"
      aria-labelledby="balance-voice-guide-title"
    >
      <h3 id="balance-voice-guide-title" className="text-lg font-bold">
        잔액 음성 안내
      </h3>
      <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
        화면에 표시된 계좌와 현재 잔액을 다시 읽어드립니다.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {status === "speaking" ? (
          <AccessibleButton variant="secondary" onClick={stopGuide}>
            음성 안내 멈추기
          </AccessibleButton>
        ) : (
          <AccessibleButton onClick={playGuide}>
            잔액 다시 듣기
          </AccessibleButton>
        )}
      </div>
      <p className="mt-3 font-semibold" aria-live="polite" aria-atomic="true">
        {status === "speaking" ? "현재 잔액을 읽고 있습니다." : null}
        {status === "error"
          ? "음성 안내를 재생하지 못했습니다. 위의 잔액 정보를 확인해 주세요."
          : null}
        {status === "unsupported"
          ? "이 브라우저는 음성 안내를 지원하지 않습니다. 위의 잔액 정보를 확인해 주세요."
          : null}
      </p>
    </section>
  );
}

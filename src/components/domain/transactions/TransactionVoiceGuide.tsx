"use client";

import { useEffect, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { useBankStore } from "@/store/useBankStore";

interface TransactionVoiceGuideProps {
  guideText: string;
  title?: string;
}

type GuideStatus = "idle" | "speaking" | "error" | "unsupported";

export function TransactionVoiceGuide({
  guideText,
  title = "거래내역 음성 안내",
}: TransactionVoiceGuideProps) {
  const setVoiceState = useBankStore((state) => state.setVoiceState);
  const resetVoiceState = useBankStore((state) => state.resetVoiceState);
  const [status, setStatus] = useState<GuideStatus>("idle");

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
        errorMessage: "거래내역 음성 안내를 재생하지 못했습니다.",
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
      className="mt-4 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-5"
      aria-labelledby="transaction-voice-guide-title"
    >
      <h3 id="transaction-voice-guide-title" className="text-lg font-bold">
        {title}
      </h3>
      <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
        서버가 확인한 거래내역 안내를 다시 들을 수 있습니다.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {status === "speaking" ? (
          <AccessibleButton variant="secondary" onClick={stopGuide}>
            음성 안내 멈추기
          </AccessibleButton>
        ) : (
          <AccessibleButton onClick={playGuide}>
            거래내역 다시 듣기
          </AccessibleButton>
        )}
      </div>
      <p className="mt-3 font-semibold" aria-live="polite" aria-atomic="true">
        {status === "speaking" ? "거래내역을 읽고 있습니다." : null}
        {status === "error"
          ? "음성 안내를 재생하지 못했습니다. 화면의 거래 정보를 확인해 주세요."
          : null}
        {status === "unsupported"
          ? "이 브라우저는 음성 안내를 지원하지 않습니다. 화면의 거래 정보를 확인해 주세요."
          : null}
      </p>
    </section>
  );
}

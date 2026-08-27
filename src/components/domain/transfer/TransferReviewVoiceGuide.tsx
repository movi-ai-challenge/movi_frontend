"use client";

import { useEffect, useMemo, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { useBankStore } from "@/store/useBankStore";
import type { DirectTransferReview } from "@/types";

interface TransferReviewVoiceGuideProps {
  review: DirectTransferReview;
}

type GuideStatus = "idle" | "speaking" | "error" | "unsupported";

export function TransferReviewVoiceGuide({ review }: TransferReviewVoiceGuideProps) {
  const setVoiceState = useBankStore((state) => state.setVoiceState);
  const resetVoiceState = useBankStore((state) => state.resetVoiceState);
  const [status, setStatus] = useState<GuideStatus>("idle");
  const guideText = useMemo(
    () => `${review.voiceMessage} 아직 이체되지 않았습니다. 화면의 송금 정보를 직접 확인해 주세요.`,
    [review.voiceMessage],
  );

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

      const voiceState = useBankStore.getState().voice;
      if (
        voiceState.status === "speaking" &&
        voiceState.transcript === guideText
      ) {
        resetVoiceState();
      }
    };
  }, [guideText, resetVoiceState]);

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
      const voiceState = useBankStore.getState().voice;
      if (
        voiceState.status === "speaking" &&
        voiceState.transcript === guideText
      ) {
        resetVoiceState();
      }
    };
    utterance.onerror = () => {
      const voiceState = useBankStore.getState().voice;
      if (
        voiceState.status === "speaking" &&
        voiceState.transcript === guideText
      ) {
        setStatus("error");
        setVoiceState({
          status: "error",
          transcript: "",
          errorMessage: "송금 정보 음성 안내를 재생하지 못했습니다.",
        });
        return;
      }

      setStatus("idle");
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
      className="mt-6 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-5"
      aria-labelledby="transfer-review-voice-guide-title"
    >
      <h2 id="transfer-review-voice-guide-title" className="text-xl font-bold">
        송금 정보 음성 안내
      </h2>
      <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
        화면에 표시된 받는 사람, 금액, 출금 계좌를 다시 읽어드립니다. 음성
        안내만으로 이체가 실행되지는 않습니다.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {status === "speaking" ? (
          <AccessibleButton variant="secondary" onClick={stopGuide}>
            음성 안내 멈추기
          </AccessibleButton>
        ) : (
          <AccessibleButton
            onClick={playGuide}
          >
            송금 정보 다시 듣기
          </AccessibleButton>
        )}
      </div>
      <p className="mt-3 font-semibold" aria-live="polite" aria-atomic="true">
        {status === "speaking" ? "송금 정보를 읽고 있습니다." : null}
        {status === "error"
          ? "음성 안내를 재생하지 못했습니다. 위의 송금 정보를 확인해 주세요."
          : null}
        {status === "unsupported"
          ? "이 브라우저는 음성 안내를 지원하지 않습니다. 위의 송금 정보를 확인해 주세요."
          : null}
      </p>
    </section>
  );
}

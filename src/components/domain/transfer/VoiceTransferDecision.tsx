"use client";

import { useEffect, useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { useBankStore } from "@/store/useBankStore";

interface VoiceTransferDecisionProps {
  onActiveChange: (isActive: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

type DecisionState =
  | "idle"
  | "listening"
  | "processing"
  | "confirm-recognized"
  | "cancel-recognized";

export function VoiceTransferDecision({
  onActiveChange,
  onConfirm,
  onCancel,
}: VoiceTransferDecisionProps) {
  const setVoiceState = useBankStore((state) => state.setVoiceState);
  const resetVoiceState = useBankStore((state) => state.resetVoiceState);
  const [state, setState] = useState<DecisionState>("idle");
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      onActiveChange(false);
      resetVoiceState();
    },
    [onActiveChange, resetVoiceState],
  );

  const recognizeDecision = (decision: "confirm" | "cancel") => {
    const transcript = decision === "confirm" ? "확인" : "취소";
    setState("processing");
    setVoiceState({
      status: "processing",
      transcript,
      errorMessage: null,
    });

    timerRef.current = window.setTimeout(() => {
      setState(
        decision === "confirm" ? "confirm-recognized" : "cancel-recognized",
      );
      setVoiceState({ status: "idle", transcript, errorMessage: null });
    }, 600);
  };

  const resetDecision = () => {
    setState("idle");
    onActiveChange(false);
    resetVoiceState();
  };

  const startVoiceDecision = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    onActiveChange(true);
    setState("listening");
    setVoiceState({
      status: "listening",
      transcript: "",
      errorMessage: null,
    });
  };

  return (
    <section
      className="mt-6 rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-surface)] p-5"
      aria-labelledby="voice-transfer-decision-title"
    >
      <h2 id="voice-transfer-decision-title" className="text-xl font-bold">
        음성으로 확인 또는 취소
      </h2>
      <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
        “확인” 또는 “취소”라고 말할 수 있습니다. 확인이 인식되어도 바로
        이체되지 않습니다.
      </p>

      <div className="mt-4" aria-live="polite" aria-atomic="true">
        {state === "idle" ? (
          <AccessibleButton
            onClick={startVoiceDecision}
          >
            음성으로 답하기
          </AccessibleButton>
        ) : null}

        {state === "listening" ? (
          <div>
            <p className="text-lg font-bold">듣고 있어요.</p>
            <p className="mt-2">목업에서 인식할 발화를 선택해 주세요.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <AccessibleButton onClick={() => recognizeDecision("confirm")}>
                “확인” 발화 시연
              </AccessibleButton>
              <AccessibleButton
                variant="secondary"
                onClick={() => recognizeDecision("cancel")}
              >
                “취소” 발화 시연
              </AccessibleButton>
            </div>
          </div>
        ) : null}

        {state === "processing" ? (
          <p className="text-lg font-bold">말씀하신 답을 확인하고 있어요.</p>
        ) : null}

        {state === "confirm-recognized" ? (
          <div>
            <p className="text-lg font-bold">“확인”으로 인식했습니다.</p>
            <p className="mt-2">계속하려면 화면 버튼으로 한 번 더 확인해 주세요.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <AccessibleButton onClick={onConfirm}>
                화면에서 확인하고 계속
              </AccessibleButton>
              <AccessibleButton variant="secondary" onClick={resetDecision}>
                다시 말하기
              </AccessibleButton>
            </div>
          </div>
        ) : null}

        {state === "cancel-recognized" ? (
          <div>
            <p className="text-lg font-bold">“취소”로 인식했습니다.</p>
            <p className="mt-2">송금 입력을 취소하고 처음으로 돌아갈까요?</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <AccessibleButton onClick={onCancel}>송금 취소하기</AccessibleButton>
              <AccessibleButton variant="secondary" onClick={resetDecision}>
                계속 확인하기
              </AccessibleButton>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

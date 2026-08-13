"use client";

import { useEffect, useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { useBankStore } from "@/store/useBankStore";

interface VoiceTransactionQueryProps {
  onApplyRange: (startDate: string, endDate: string) => Promise<void>;
}

type QueryStatus = "idle" | "listening" | "processing" | "recognized";

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function VoiceTransactionQuery({
  onApplyRange,
}: VoiceTransactionQueryProps) {
  const setVoiceState = useBankStore((state) => state.setVoiceState);
  const resetVoiceState = useBankStore((state) => state.resetVoiceState);
  const [status, setStatus] = useState<QueryStatus>("idle");
  const processingTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (processingTimerRef.current) {
        window.clearTimeout(processingTimerRef.current);
      }
      resetVoiceState();
    },
    [resetVoiceState],
  );

  const startListening = () => {
    setStatus("listening");
    setVoiceState({
      status: "listening",
      transcript: "",
      errorMessage: null,
    });
  };

  const finishListening = () => {
    setStatus("processing");
    setVoiceState({
      status: "processing",
      transcript: "",
      errorMessage: null,
    });

    processingTimerRef.current = window.setTimeout(() => {
      const transcript = "최근 일주일 거래 보여줘";
      setStatus("recognized");
      setVoiceState({ status: "idle", transcript, errorMessage: null });
    }, 800);
  };

  const applyRecognizedRange = async () => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    await onApplyRange(toDateInputValue(start), toDateInputValue(end));
    setStatus("idle");
    resetVoiceState();
  };

  return (
    <section
      className="mb-8 rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-surface)] p-5"
      aria-labelledby="voice-transaction-title"
    >
      <h2 id="voice-transaction-title" className="text-xl font-bold">
        음성으로 거래 기간 찾기
      </h2>
      <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
        예: “최근 일주일 거래 보여줘”라고 말해 보세요. 음성을 사용하지
        않아도 아래 날짜 입력으로 같은 작업을 할 수 있습니다.
      </p>

      <div className="mt-5" aria-live="polite" aria-atomic="true">
        {status === "idle" ? (
          <AccessibleButton onClick={startListening}>
            음성 조회 시작
          </AccessibleButton>
        ) : null}

        {status === "listening" ? (
          <div>
            <p className="text-lg font-bold">듣고 있어요. 기간을 말해 주세요.</p>
            <AccessibleButton className="mt-4" onClick={finishListening}>
              말하기 완료
            </AccessibleButton>
          </div>
        ) : null}

        {status === "processing" ? (
          <p className="text-lg font-bold">말씀하신 내용을 확인하고 있어요.</p>
        ) : null}

        {status === "recognized" ? (
          <div>
            <p className="font-semibold">인식한 내용</p>
            <p className="mt-2 rounded-lg border-2 border-[var(--color-border)] p-4 text-lg font-bold">
              최근 일주일 거래 보여줘
            </p>
            <p className="mt-3 leading-7">
              최근 7일 거래내역을 조회할까요?
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <AccessibleButton onClick={() => void applyRecognizedRange()}>
                이 기간 조회하기
              </AccessibleButton>
              <AccessibleButton
                variant="secondary"
                onClick={() => {
                  setStatus("idle");
                  resetVoiceState();
                }}
              >
                다시 말하기
              </AccessibleButton>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

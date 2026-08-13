"use client";

import { useEffect, useMemo, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { useBankStore } from "@/store/useBankStore";
import type { Transaction, TransactionType } from "@/types";

interface TransactionVoiceGuideProps {
  transactions: Transaction[];
}

type GuideStatus = "idle" | "speaking" | "error" | "unsupported";

const typeLabels: Record<TransactionType, string> = {
  deposit: "입금",
  withdrawal: "출금",
  transfer: "이체",
  blocked: "차단",
};

const amountFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function createGuideText(transactions: Transaction[]) {
  const recentTransactions = transactions.slice(0, 3);
  const items = recentTransactions.map(
    (transaction, index) =>
      `${index + 1}번째, ${dateFormatter.format(new Date(transaction.occurredAt))}, ${transaction.description}, ${typeLabels[transaction.type]} ${amountFormatter.format(transaction.amount)}원`,
  );

  return `조회된 거래 ${transactions.length}건 중 최근 ${recentTransactions.length}건을 안내합니다. ${items.join(". ")}.`;
}

export function TransactionVoiceGuide({
  transactions,
}: TransactionVoiceGuideProps) {
  const setVoiceState = useBankStore((state) => state.setVoiceState);
  const resetVoiceState = useBankStore((state) => state.resetVoiceState);
  const [status, setStatus] = useState<GuideStatus>("idle");
  const guideText = useMemo(
    () => createGuideText(transactions),
    [transactions],
  );

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
        errorMessage: "음성 안내를 재생하지 못했습니다.",
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
        최근 거래 음성 안내
      </h3>
      <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
        최근 거래 최대 3건을 읽어드립니다. 아래 거래 목록에서도 같은 내용을
        확인할 수 있습니다.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {status === "speaking" ? (
          <AccessibleButton variant="secondary" onClick={stopGuide}>
            음성 안내 멈추기
          </AccessibleButton>
        ) : (
          <AccessibleButton onClick={playGuide}>
            최근 거래 듣기
          </AccessibleButton>
        )}
      </div>
      <p className="mt-3 font-semibold" aria-live="polite" aria-atomic="true">
        {status === "speaking" ? "최근 거래를 읽고 있습니다." : null}
        {status === "error" ? "음성 안내를 재생하지 못했습니다. 화면의 거래 목록을 확인해 주세요." : null}
        {status === "unsupported" ? "이 브라우저는 음성 안내를 지원하지 않습니다. 화면의 거래 목록을 확인해 주세요." : null}
      </p>
    </section>
  );
}

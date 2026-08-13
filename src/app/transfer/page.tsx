"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { PageBackLink } from "@/components/common/PageBackLink";
import { getRegisteredRecipients } from "@/services/recipientService";
import { useBankStore } from "@/store/useBankStore";
import type { RegisteredRecipient } from "@/types";

type VoiceStep = "idle" | "listening" | "processing" | "missing-amount";
type RecipientStatus = "loading" | "ready" | "error";

export default function TransferInputPage() {
  const router = useRouter();
  const defaultAccountId = useBankStore((state) => state.defaultAccountId);
  const setVoiceState = useBankStore((state) => state.setVoiceState);
  const resetVoiceState = useBankStore((state) => state.resetVoiceState);
  const setTransferDraft = useBankStore((state) => state.setTransferDraft);
  const [recipient, setRecipient] = useState("");
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(
    null,
  );
  const [amount, setAmount] = useState("");
  const [voiceStep, setVoiceStep] = useState<VoiceStep>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [registeredRecipients, setRegisteredRecipients] = useState<
    RegisteredRecipient[]
  >([]);
  const [recipientStatus, setRecipientStatus] =
    useState<RecipientStatus>("loading");
  const amountInputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const loadRecipients = async () => {
    setRecipientStatus("loading");
    try {
      setRegisteredRecipients(await getRegisteredRecipients());
      setRecipientStatus("ready");
    } catch {
      setRecipientStatus("error");
    }
  };

  useEffect(() => {
    let isActive = true;

    void getRegisteredRecipients()
      .then((recipients) => {
        if (!isActive) return;
        setRegisteredRecipients(recipients);
        setRecipientStatus("ready");
      })
      .catch(() => {
        if (isActive) setRecipientStatus("error");
      });

    return () => {
      isActive = false;
    };
  }, []);

  const finishVoiceInput = () => {
    setVoiceStep("processing");
    setVoiceState({
      status: "processing",
      transcript: "김모비에게 보내줘",
      errorMessage: null,
    });

    window.setTimeout(() => {
      setRecipient("김모비");
      setSelectedRecipientId("recipient-demo-1");
      setVoiceStep("missing-amount");
      setVoiceState({
        status: "idle",
        transcript: "김모비에게 보내줘",
        errorMessage: null,
      });
      window.setTimeout(() => amountInputRef.current?.focus(), 0);
    }, 700);
  };

  const submitTransferInput = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!recipient.trim() || !amount || Number(amount) <= 0) {
      setErrorMessage("받는 사람과 1원 이상의 금액을 모두 입력해 주세요.");
      window.setTimeout(() => errorRef.current?.focus(), 0);
      return;
    }

    setErrorMessage("");
    const savedRecipient = registeredRecipients.find(
      (item) => item.id === selectedRecipientId,
    );
    setTransferDraft({
      sourceAccountId: defaultAccountId,
      recipientId: savedRecipient?.id ?? null,
      recipientName: recipient.trim(),
      recipientBankName: savedRecipient?.bankName ?? null,
      recipientMaskedAccountNumber:
        savedRecipient?.maskedAccountNumber ?? null,
      amount: Number(amount),
    });
    router.push("/transfer/review");
  };

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-xl px-6 py-12">
      <PageBackLink href="/accounts">연결된 계좌로</PageBackLink>

      <p className="font-bold text-[var(--color-primary)]">송금</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">
        누구에게 얼마를 보낼까요?
      </h1>
      <p className="mt-4 text-lg leading-8 text-[var(--color-text-muted)]">
        말하거나 직접 입력할 수 있습니다. 이 화면에서는 송금 정보를 확인만
        하며, 바로 이체되지 않습니다.
      </p>

      <section
        className="mt-8 rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-surface)] p-5"
        aria-labelledby="transfer-voice-title"
      >
        <h2 id="transfer-voice-title" className="text-xl font-bold">
          음성으로 입력
        </h2>
        <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
          예: “김모비에게 5만원 보내줘”라고 말해 보세요.
        </p>
        <div className="mt-4" aria-live="polite" aria-atomic="true">
          {voiceStep === "idle" ? (
            <AccessibleButton
              onClick={() => {
                setVoiceStep("listening");
                setVoiceState({
                  status: "listening",
                  transcript: "",
                  errorMessage: null,
                });
              }}
            >
              음성 입력 시작
            </AccessibleButton>
          ) : null}
          {voiceStep === "listening" ? (
            <div>
              <p className="text-lg font-bold">듣고 있어요.</p>
              <AccessibleButton className="mt-4" onClick={finishVoiceInput}>
                말하기 완료
              </AccessibleButton>
            </div>
          ) : null}
          {voiceStep === "processing" ? (
            <p className="text-lg font-bold">말씀하신 내용을 확인하고 있어요.</p>
          ) : null}
          {voiceStep === "missing-amount" ? (
            <div>
              <p className="text-lg font-bold">김모비님을 받는 사람으로 확인했어요.</p>
              <p className="mt-2">얼마를 보낼까요? 아래 금액을 입력해 주세요.</p>
              <AccessibleButton
                className="mt-4"
                variant="secondary"
                onClick={() => {
                  setVoiceStep("idle");
                  resetVoiceState();
                }}
              >
                처음부터 다시 말하기
              </AccessibleButton>
            </div>
          ) : null}
        </div>
      </section>

      <section
        className="mt-8"
        aria-labelledby="registered-recipient-title"
        aria-live="polite"
        aria-busy={recipientStatus === "loading"}
      >
        <h2 id="registered-recipient-title" className="text-xl font-bold">
          등록된 받는 사람
        </h2>
        <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
          자주 보내는 사람을 선택하면 받는 사람 입력란에 바로 반영됩니다.
        </p>

        {recipientStatus === "loading" ? (
          <p className="mt-4 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-5 font-semibold">
            등록된 받는 사람을 불러오고 있어요.
          </p>
        ) : null}

        {recipientStatus === "error" ? (
          <div
            className="mt-4 rounded-xl border-2 border-[var(--color-danger)] bg-[var(--color-surface)] p-5"
            role="alert"
          >
            <p className="font-bold">등록된 받는 사람을 불러오지 못했습니다.</p>
            <AccessibleButton
              className="mt-4"
              variant="secondary"
              onClick={() => void loadRecipients()}
            >
              다시 불러오기
            </AccessibleButton>
          </div>
        ) : null}

        {recipientStatus === "ready" && registeredRecipients.length === 0 ? (
          <p className="mt-4 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-5 font-semibold">
            등록된 받는 사람이 없습니다. 아래에서 직접 입력해 주세요.
          </p>
        ) : null}

        {recipientStatus === "ready" && registeredRecipients.length > 0 ? (
          <ul className="mt-4 grid list-none gap-3 p-0">
            {registeredRecipients.map((savedRecipient) => (
              <li key={savedRecipient.id}>
                <button
                  type="button"
                  aria-pressed={selectedRecipientId === savedRecipient.id}
                  onClick={() => {
                    setRecipient(savedRecipient.name);
                    setSelectedRecipientId(savedRecipient.id);
                  }}
                  className="flex min-h-16 w-full items-center justify-between gap-4 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left hover:border-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 aria-pressed:border-[var(--color-primary)]"
                >
                  <span>
                    <span className="block text-lg font-bold">
                      {savedRecipient.name}
                    </span>
                    <span className="mt-1 block text-[var(--color-text-muted)]">
                      {savedRecipient.bankName} · {savedRecipient.maskedAccountNumber}
                    </span>
                  </span>
                  <span className="font-bold text-[var(--color-primary)]">
                    선택
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <form className="mt-8" onSubmit={submitTransferInput} noValidate>
        <div>
          <label htmlFor="transfer-recipient" className="text-lg font-bold">
            받는 사람
          </label>
          <input
            id="transfer-recipient"
            value={recipient}
            onChange={(event) => {
              setRecipient(event.target.value);
              setSelectedRecipientId(null);
            }}
            autoComplete="off"
            className="mt-2 min-h-14 w-full rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
          />
        </div>
        <div className="mt-5">
          <label htmlFor="transfer-amount" className="text-lg font-bold">
            보낼 금액
          </label>
          <div className="relative mt-2">
            <input
              ref={amountInputRef}
              id="transfer-amount"
              type="number"
              min="1"
              step="10000"
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-describedby="transfer-amount-help transfer-amount-unit"
              className="min-h-14 w-full rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 pr-12 text-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
            />
            <span
              id="transfer-amount-unit"
              className="pointer-events-none absolute right-4 top-4 font-bold"
            >
              원
            </span>
          </div>
          <p
            id="transfer-amount-help"
            className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]"
          >
            위아래 화살표는 1만 원씩 조절됩니다. 금액을 직접 입력할 수도
            있습니다.
          </p>
          <div
            className="mt-3 grid grid-cols-3 gap-2"
            role="group"
            aria-label="금액 빠르게 추가"
          >
            {[10_000, 50_000, 100_000].map((increment) => (
              <AccessibleButton
                key={increment}
                className="px-3"
                variant="secondary"
                onClick={() =>
                  setAmount(String((Number(amount) || 0) + increment))
                }
              >
                +{(increment / 10_000).toLocaleString("ko-KR")}만
              </AccessibleButton>
            ))}
          </div>
        </div>

        {errorMessage ? (
          <div
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="mt-5 rounded-lg border-2 border-[var(--color-danger)] p-4 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
          >
            {errorMessage}
          </div>
        ) : null}

        <AccessibleButton className="mt-6 w-full" type="submit">
          입력한 송금 정보 확인하기
        </AccessibleButton>
      </form>

    </main>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { PageBackLink } from "@/components/common/PageBackLink";
import { toApiError } from "@/services/api";
import { getRegisteredRecipients } from "@/services/recipientService";
import { reviewDirectTransfer } from "@/services/transferService";
import { useBankStore } from "@/store/useBankStore";
import type { RegisteredRecipient } from "@/types";

type RecipientStatus = "loading" | "ready" | "error";

export default function TransferInputPage() {
  const router = useRouter();
  const defaultAccountId = useBankStore((state) => state.defaultAccountId);
  const setDirectTransferReview = useBankStore((state) => state.setDirectTransferReview);
  const clearDirectTransferReview = useBankStore((state) => state.clearDirectTransferReview);
  const clearDirectTransferResult = useBankStore((state) => state.clearDirectTransferResult);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [registeredRecipients, setRegisteredRecipients] = useState<RegisteredRecipient[]>([]);
  const [recipientStatus, setRecipientStatus] = useState<RecipientStatus>("loading");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  const showError = (message: string) => {
    setErrorMessage(message);
    window.setTimeout(() => errorRef.current?.focus(), 0);
  };

  const loadRecipients = async () => {
    setRecipientStatus("loading");
    setErrorMessage("");
    try {
      setRegisteredRecipients(await getRegisteredRecipients());
      setRecipientStatus("ready");
    } catch (error: unknown) {
      setRecipientStatus("error");
      setErrorMessage(toApiError(error).message);
    }
  };

  useEffect(() => {
    clearDirectTransferReview();
    clearDirectTransferResult();
    let isActive = true;
    void getRegisteredRecipients()
      .then((recipients) => {
        if (!isActive) return;
        setRegisteredRecipients(recipients);
        setRecipientStatus("ready");
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setRecipientStatus("error");
        setErrorMessage(toApiError(error).message);
      });
    return () => {
      isActive = false;
    };
  }, [clearDirectTransferResult, clearDirectTransferReview]);

  const submitTransferInput = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!selectedRecipientId) {
      showError("등록된 받는 사람을 선택해 주세요.");
      return;
    }
    if (!Number.isSafeInteger(parsedAmount) || parsedAmount <= 0) {
      showError("1원 이상의 금액을 원 단위로 입력해 주세요.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const review = await reviewDirectTransfer({
        recipientId: selectedRecipientId,
        amount: parsedAmount,
        fromAccountId: defaultAccountId,
      });
      setDirectTransferReview(review);
      router.push("/transfer/review");
    } catch (error: unknown) {
      showError(toApiError(error).message);
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-xl px-6 py-12">
      <PageBackLink href="/accounts">연결된 계좌로</PageBackLink>
      <p className="font-bold text-[var(--color-primary)]">직접 송금</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">받는 사람과 금액을 선택해 주세요</h1>
      <p className="mt-4 text-lg leading-8 text-[var(--color-text-muted)]">
        안전을 위해 등록된 받는 사람에게만 보낼 수 있습니다. 다음 화면에서 내용을 다시 확인하기 전에는 이체되지 않습니다.
      </p>

      <form className="mt-8" onSubmit={submitTransferInput} noValidate>
        <section aria-labelledby="registered-recipient-title" aria-busy={recipientStatus === "loading"}>
          <h2 id="registered-recipient-title" className="text-xl font-bold">등록된 받는 사람</h2>
          {recipientStatus === "loading" ? (
            <p className="mt-4 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-5 font-semibold" aria-live="polite">
              등록된 받는 사람을 불러오고 있어요.
            </p>
          ) : null}
          {recipientStatus === "error" ? (
            <div className="mt-4 rounded-xl border-2 border-[var(--color-danger)] bg-[var(--color-surface)] p-5" role="alert">
              <p className="font-bold">등록된 받는 사람을 불러오지 못했습니다.</p>
              <p className="mt-2">{errorMessage}</p>
              <AccessibleButton className="mt-4" variant="secondary" onClick={() => void loadRecipients()}>
                다시 불러오기
              </AccessibleButton>
            </div>
          ) : null}
          {recipientStatus === "ready" && registeredRecipients.length === 0 ? (
            <p className="mt-4 rounded-xl border-2 border-[var(--color-warning)] bg-[var(--color-surface)] p-5 font-semibold">
              등록된 받는 사람이 없어 직접 송금을 진행할 수 없습니다.
            </p>
          ) : null}
          {recipientStatus === "ready" && registeredRecipients.length > 0 ? (
            <ul className="mt-4 grid list-none gap-3 p-0">
              {registeredRecipients.map((recipient) => (
                <li key={recipient.id}>
                  <button
                    type="button"
                    aria-pressed={selectedRecipientId === recipient.id}
                    onClick={() => {
                      setSelectedRecipientId(recipient.id);
                      setErrorMessage("");
                    }}
                    className="flex min-h-16 w-full items-center justify-between gap-4 rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left hover:border-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 aria-pressed:border-[var(--color-primary)]"
                  >
                    <span>
                      <span className="block text-lg font-bold">{recipient.nickname}</span>
                      <span className="mt-1 block text-[var(--color-text-muted)]">
                        예금주 {recipient.holderName} · 은행 코드 {recipient.bankCode} · {recipient.maskedAccountNumber}
                      </span>
                    </span>
                    <span className="font-bold text-[var(--color-primary)]">
                      {selectedRecipientId === recipient.id ? "선택됨" : "선택"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <div className="mt-8">
          <label htmlFor="transfer-amount" className="text-lg font-bold">보낼 금액</label>
          <div className="relative mt-2">
            <input
              id="transfer-amount"
              type="number"
              min="1"
              step="10000"
              inputMode="numeric"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setErrorMessage("");
              }}
              aria-describedby="transfer-amount-help transfer-amount-unit"
              className="min-h-14 w-full rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 pr-12 text-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
            />
            <span id="transfer-amount-unit" className="pointer-events-none absolute right-4 top-4 font-bold">원</span>
          </div>
          <p id="transfer-amount-help" className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
            위아래 화살표는 1만 원씩 조절됩니다. 금액을 직접 입력할 수도 있습니다.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="금액 빠르게 추가">
            {[10_000, 50_000, 100_000].map((increment) => (
              <AccessibleButton key={increment} className="px-3" variant="secondary" onClick={() => setAmount(String((Number(amount) || 0) + increment))}>
                +{(increment / 10_000).toLocaleString("ko-KR")}만
              </AccessibleButton>
            ))}
          </div>
        </div>

        {errorMessage && recipientStatus !== "error" ? (
          <div ref={errorRef} tabIndex={-1} role="alert" className="mt-5 rounded-lg border-2 border-[var(--color-danger)] p-4 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]">
            {errorMessage}
          </div>
        ) : null}
        <AccessibleButton
          className="mt-6 w-full"
          type="submit"
          disabled={isSubmitting || recipientStatus !== "ready" || registeredRecipients.length === 0}
        >
          {isSubmitting ? "송금 정보를 확인하고 있어요" : "송금 정보 검토하기"}
        </AccessibleButton>
      </form>
    </main>
  );
}

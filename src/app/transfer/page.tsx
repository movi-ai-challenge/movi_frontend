"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { PageBackLink } from "@/components/common/PageBackLink";
import { useBankStore } from "@/store/useBankStore";

export default function TransferInputPage() {
  const router = useRouter();
  const defaultAccountId = useBankStore((state) => state.defaultAccountId);
  const setTransferDraft = useBankStore((state) => state.setTransferDraft);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const recipientInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const submitTransferInput = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!recipient.trim()) {
      setErrorMessage("받는 사람을 입력해 주세요.");
      window.setTimeout(() => {
        errorRef.current?.focus();
        recipientInputRef.current?.focus();
      }, 0);
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setErrorMessage("1원 이상의 금액을 입력해 주세요.");
      window.setTimeout(() => {
        errorRef.current?.focus();
        amountInputRef.current?.focus();
      }, 0);
      return;
    }

    setErrorMessage("");
    setTransferDraft({
      sourceAccountId: defaultAccountId,
      recipientId: null,
      recipientName: recipient.trim(),
      recipientBankName: null,
      recipientMaskedAccountNumber: null,
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
        현재는 받는 사람과 금액을 입력하고 검토하는 것만 가능합니다. 입력한
        정보로 실제 이체를 요청하지 않습니다.
      </p>

      <section
        className="mt-8 rounded-xl border-2 border-[var(--color-warning)] bg-[var(--color-surface)] p-5"
        aria-labelledby="transfer-limit-title"
      >
        <h2 id="transfer-limit-title" className="text-xl font-bold">
          이 화면에서는 이체되지 않습니다
        </h2>
        <p className="mt-2 leading-7">
          직접 입력 송금 API와 등록 수취인 조회 API가 확정되지 않아 정보
          입력과 검토까지만 제공합니다. 수취인 확인, FDS 판정, 송금 성공이나
          보호자 알림 결과를 이 화면에서 만들지 않습니다.
        </p>
      </section>

      <form className="mt-8" onSubmit={submitTransferInput} noValidate>
        <div>
          <label htmlFor="transfer-recipient" className="text-lg font-bold">
            받는 사람
          </label>
          <input
            ref={recipientInputRef}
            id="transfer-recipient"
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            aria-describedby="transfer-recipient-help"
            autoComplete="off"
            className="mt-2 min-h-14 w-full rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
          />
          <p
            id="transfer-recipient-help"
            className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]"
          >
            입력한 이름은 서버에서 확인되지 않으며 검토 화면에만 표시됩니다.
          </p>
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

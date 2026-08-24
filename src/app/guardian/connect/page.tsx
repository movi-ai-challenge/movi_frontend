"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { PageBackLink } from "@/components/common/PageBackLink";
import { requestGuardianConnection } from "@/services/guardianService";
import type { GuardianConnectionRequest } from "@/types";

type RequestStatus = "idle" | "submitting" | "success" | "error";
type VoiceInputStatus = "idle" | "processing" | "complete";

function normalizePhoneNumber(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

function isValidPhoneNumber(value: string): boolean {
  return /^\d{10,11}$/.test(value);
}

export default function GuardianConnectionPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [voiceStatus, setVoiceStatus] = useState<VoiceInputStatus>("idle");
  const [request, setRequest] = useState<GuardianConnectionRequest | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const requestInProgressRef = useRef(false);
  const voiceTimerRef = useRef<number | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (voiceTimerRef.current) window.clearTimeout(voiceTimerRef.current);
    },
    [],
  );

  const demonstrateVoiceInput = () => {
    if (voiceStatus === "processing" || status === "submitting") return;

    setVoiceStatus("processing");
    voiceTimerRef.current = window.setTimeout(() => {
      setPhoneNumber("01012345678");
      setVoiceStatus("complete");
      window.setTimeout(() => phoneInputRef.current?.focus(), 0);
    }, 700);
  };

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (requestInProgressRef.current) return;

    if (!isValidPhoneNumber(phoneNumber)) {
      setErrorMessage("보호자 휴대전화 번호를 숫자 10~11자리로 입력해 주세요.");
      window.setTimeout(() => errorRef.current?.focus(), 0);
      return;
    }

    requestInProgressRef.current = true;
    setErrorMessage("");
    setStatus("submitting");

    try {
      const createdRequest = await requestGuardianConnection(phoneNumber);
      setRequest(createdRequest);
      setStatus("success");
    } catch {
      setErrorMessage(
        "보호자 연결 요청을 보내지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.",
      );
      setStatus("error");
      window.setTimeout(() => errorRef.current?.focus(), 0);
    } finally {
      requestInProgressRef.current = false;
    }
  };

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-xl px-6 py-12">
      <PageBackLink href="/accounts">연결된 계좌로</PageBackLink>

      <p
        className="font-bold text-[var(--color-primary)]"
        data-secondary-content="true"
      >
        보호자 연결
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">
        도움을 받을 보호자를 연결할게요
      </h1>
      <p className="mt-4 text-lg leading-8 text-[var(--color-text-muted)]">
        보호자 휴대전화 번호를 입력하면 연결 요청을 준비합니다. 연결이 완료되기
        전에는 보호자가 계좌를 보거나 거래를 승인할 수 없습니다.
      </p>

      <section
        className="mt-8 rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-surface)] p-5"
        aria-labelledby="guardian-voice-input-title"
      >
        <h2 id="guardian-voice-input-title" className="text-xl font-bold">
          음성으로 번호 입력
        </h2>
        <p className="mt-2 leading-7 text-[var(--color-text-muted)]">
          실제 음성 인식 연동 전 시연 기능입니다. 음성을 사용하지 않아도 아래
          입력란에서 같은 작업을 할 수 있습니다.
        </p>
        <div className="mt-4" aria-live="polite" aria-atomic="true">
          {voiceStatus === "idle" ? (
            <AccessibleButton
              disabled={status === "submitting" || status === "success"}
              onClick={demonstrateVoiceInput}
            >
              휴대전화 번호 음성 입력 시연
            </AccessibleButton>
          ) : null}
          {voiceStatus === "processing" ? (
            <p className="text-lg font-bold" aria-busy="true">
              말씀하신 번호를 확인하고 있어요.
            </p>
          ) : null}
          {voiceStatus === "complete" ? (
            <div>
              <p className="text-lg font-bold">
                시연 번호를 입력란에 반영했습니다.
              </p>
              <p className="mt-2">아래 번호를 확인하거나 수정해 주세요.</p>
              <AccessibleButton
                className="mt-4"
                variant="secondary"
                disabled={status === "submitting" || status === "success"}
                onClick={demonstrateVoiceInput}
              >
                다시 시연하기
              </AccessibleButton>
            </div>
          ) : null}
        </div>
      </section>

      <form className="mt-8" onSubmit={(event) => void submitRequest(event)} noValidate>
        <label htmlFor="guardian-phone-number" className="text-lg font-bold">
          보호자 휴대전화 번호
        </label>
        <input
          ref={phoneInputRef}
          id="guardian-phone-number"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={phoneNumber}
          disabled={status === "submitting" || status === "success"}
          aria-invalid={errorMessage ? "true" : undefined}
          aria-describedby={
            errorMessage
              ? "guardian-phone-help guardian-phone-error"
              : "guardian-phone-help"
          }
          onChange={(event) => {
            setPhoneNumber(normalizePhoneNumber(event.target.value));
            setErrorMessage("");
            if (status === "error") setStatus("idle");
          }}
          className="mt-2 min-h-14 w-full rounded-lg border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <p
          id="guardian-phone-help"
          className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]"
        >
          숫자만 10~11자리로 입력해 주세요. 실제 SMS는 발송되지 않습니다.
        </p>

        {errorMessage ? (
          <div
            id="guardian-phone-error"
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="mt-5 rounded-lg border-2 border-[var(--color-danger)] p-4 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
          >
            {errorMessage}
          </div>
        ) : null}

        <AccessibleButton
          className="mt-6 w-full"
          type="submit"
          isLoading={status === "submitting"}
          loadingLabel="보호자 연결을 요청하고 있어요"
          disabled={status === "success"}
        >
          보호자 연결 요청하기
        </AccessibleButton>
      </form>

      <div className="mt-6" aria-live="polite" aria-atomic="true">
        {status === "success" && request ? (
          <section className="rounded-xl border-2 border-[var(--color-success)] bg-[var(--color-surface)] p-5">
            <h2 className="text-xl font-bold">보호자 연결을 요청했습니다.</h2>
            <dl className="mt-4 grid gap-3">
              <div>
                <dt className="font-semibold text-[var(--color-text-muted)]">
                  요청한 번호
                </dt>
                <dd className="mt-1 text-lg font-bold">
                  {request.maskedPhoneNumber}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--color-text-muted)]">
                  연결 상태
                </dt>
                <dd className="mt-1 font-bold">보호자 확인 대기</dd>
              </div>
            </dl>
            <p className="mt-4 leading-7 text-[var(--color-text-muted)]">
              현재는 프론트엔드 Mock 요청입니다. 실제 SMS 링크와 본인 인증은
              백엔드 계약 확정 후 연결합니다.
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}

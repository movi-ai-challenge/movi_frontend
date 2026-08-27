"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { toApiError } from "@/services/api";
import {
  clearTransferRecoveryKey,
  readTransferRecoveryKey,
  saveTransferRecoveryKey,
} from "@/services/transferRecoveryStorage";
import { getTransferStatus } from "@/services/transferService";
import { selectVoiceErrorRecoveryAction } from "@/services/voiceErrorRecovery";
import {
  MAX_VOICE_AUDIO_BYTES,
  MAX_VOICE_DURATION_SECONDS,
  selectSupportedVoiceMimeType,
  sendVoiceCommand,
  startVoiceSession,
} from "@/services/voiceService";
import { useBankStore } from "@/store/useBankStore";
import type {
  TransferFdsRiskLevel,
  TransferStatusResult,
  VoiceCommandResult,
  VoiceSessionStart,
} from "@/types";

type PanelStatus =
  | "idle"
  | "starting"
  | "ready"
  | "recording"
  | "recorded"
  | "uploading"
  | "error"
  | "unsupported";

const currencyFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

function createIdempotencyKey(): string | null {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : null;
}

const riskLabels: Record<TransferFdsRiskLevel, string> = {
  LOW: "낮은 위험",
  MEDIUM: "중간 위험",
  HIGH: "높은 위험",
};

const transferStatusLabels: Record<TransferStatusResult["status"], string> = {
  PENDING: "처리 대기",
  RISK_REVIEW: "위험도 확인 중",
  COMPLETED: "이체 완료",
  BLOCKED: "고위험 차단",
  FAILED: "이체 실패",
  CANCELED: "이체 취소",
};

function isTerminalTransferStatus(result: TransferStatusResult): boolean {
  return !["PENDING", "RISK_REVIEW"].includes(result.status);
}

export function VoiceCommandPanel() {
  const setVoiceState = useBankStore((state) => state.setVoiceState);
  const resetVoiceState = useBankStore((state) => state.resetVoiceState);
  const [status, setStatus] = useState<PanelStatus>("idle");
  const [session, setSession] = useState<VoiceSessionStart | null>(null);
  const [command, setCommand] = useState<VoiceCommandResult | null>(null);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [guideText, setGuideText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [transferStatus, setTransferStatus] =
    useState<TransferStatusResult | null>(null);
  const [isRecoveringTransfer, setIsRecoveringTransfer] = useState(false);
  const [recoveryErrorMessage, setRecoveryErrorMessage] = useState("");
  const [voiceRetryLimitReached, setVoiceRetryLimitReached] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingFailedRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimerRef = useRef<number | null>(null);
  const counterTimerRef = useRef<number | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const recoverTransfer = useCallback(async (recoveryKey: string) => {
    setIdempotencyKey(recoveryKey);
    setIsRecoveringTransfer(true);
    setRecoveryErrorMessage("");
    try {
      const result = await getTransferStatus(recoveryKey);
      setTransferStatus(result);
      setGuideText(result.voiceMessage);
      setErrorMessage("");
      setStatus("ready");
      return result;
    } catch (error: unknown) {
      setRecoveryErrorMessage(toApiError(error).message);
      return null;
    } finally {
      setIsRecoveringTransfer(false);
    }
  }, []);

  const clearRecordingTimers = () => {
    if (stopTimerRef.current !== null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (counterTimerRef.current !== null) {
      window.clearInterval(counterTimerRef.current);
      counterTimerRef.current = null;
    }
  };

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(
    () => () => {
      clearRecordingTimers();
      const recorder = recorderRef.current;
      if (recorder?.state === "recording") {
        recorder.ondataavailable = null;
        recorder.onerror = null;
        recorder.onstop = null;
        recorder.stop();
      }
      releaseStream();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      resetVoiceState();
    },
    [resetVoiceState],
  );

  useEffect(() => {
    const recoveryKey = readTransferRecoveryKey();
    if (!recoveryKey) return;
    const recoveryTimer = window.setTimeout(() => {
      void recoverTransfer(recoveryKey);
    }, 0);
    return () => window.clearTimeout(recoveryTimer);
  }, [recoverTransfer]);

  const showError = (message: string) => {
    setErrorMessage(message);
    setStatus("error");
    setVoiceState({ status: "error", transcript: "", errorMessage: message });
    window.setTimeout(() => errorRef.current?.focus(), 0);
  };

  const beginSession = async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      !selectSupportedVoiceMimeType()
    ) {
      setStatus("unsupported");
      return;
    }

    setStatus("starting");
    setErrorMessage("");
    setVoiceRetryLimitReached(false);
    try {
      const started = await startVoiceSession();
      setSession(started);
      setCommand(null);
      setGuideText(started.voiceMessage);
      setStatus("ready");
    } catch (error: unknown) {
      showError(toApiError(error).message);
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  };

  const startRecording = async () => {
    const mimeType = selectSupportedVoiceMimeType();
    if (!session || !mimeType || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }

    setAudio(null);
    setErrorMessage("");
    setRecordingSeconds(0);
    recordingFailedRef.current = false;
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        recordingFailedRef.current = true;
        clearRecordingTimers();
        releaseStream();
        showError("음성을 녹음하지 못했습니다. 직접 입력 기능을 이용해 주세요.");
      };
      recorder.onstop = () => {
        clearRecordingTimers();
        releaseStream();
        if (recordingFailedRef.current) return;
        const recordedAudio = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType,
        });
        if (recordedAudio.size < 1) {
          showError("녹음된 음성이 없습니다. 다시 녹음해 주세요.");
          return;
        }
        if (recordedAudio.size > MAX_VOICE_AUDIO_BYTES) {
          showError("음성 파일이 5MB를 초과했습니다. 짧게 다시 녹음해 주세요.");
          return;
        }
        setAudio(recordedAudio);
        setStatus("recorded");
        setVoiceState({ status: "idle", transcript: "", errorMessage: null });
      };

      recorder.start(250);
      setStatus("recording");
      setVoiceState({ status: "listening", transcript: "", errorMessage: null });
      counterTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((seconds) => seconds + 1);
      }, 1_000);
      stopTimerRef.current = window.setTimeout(
        stopRecording,
        MAX_VOICE_DURATION_SECONDS * 1_000,
      );
    } catch (error: unknown) {
      releaseStream();
      const message =
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "마이크 권한이 허용되지 않았습니다. 직접 입력 기능을 이용해 주세요."
          : "마이크를 시작하지 못했습니다. 기기 설정을 확인해 주세요.";
      showError(message);
    }
  };

  const uploadRecording = async () => {
    if (!session || !audio) return;
    const awaitingConfirmation = command?.state === "AWAITING_CONFIRMATION";
    if (awaitingConfirmation && (!command.confirmationId || !idempotencyKey)) {
      showError(
        "안전한 확인 키를 만들 수 없습니다. 음성 송금을 진행하지 말고 직접 입력해 주세요.",
      );
      return;
    }

    if (awaitingConfirmation && idempotencyKey) {
      try {
        saveTransferRecoveryKey(idempotencyKey);
      } catch {
        showError(
          "송금 상태를 복구할 키를 안전하게 보관하지 못했습니다. 이체를 진행하지 않았습니다.",
        );
        return;
      }
    }

    setStatus("uploading");
    setErrorMessage("");
    setVoiceState({ status: "processing", transcript: "", errorMessage: null });
    try {
      const result = await sendVoiceCommand({
        voiceSessionId: session.voiceSessionId,
        audio,
        confirmationId: awaitingConfirmation
          ? command.confirmationId ?? undefined
          : undefined,
        idempotencyKey: awaitingConfirmation
          ? idempotencyKey ?? undefined
          : undefined,
      });
      setCommand(result);
      setGuideText(result.voiceMessage);
      setAudio(null);
      if (result.state === "AWAITING_CONFIRMATION") {
        setIdempotencyKey((current) => current ?? createIdempotencyKey());
      } else if (awaitingConfirmation && result.state === "CANCELED") {
        clearTransferRecoveryKey();
        setIdempotencyKey(null);
      } else if (!awaitingConfirmation && result.state !== "PROCESSING") {
        setIdempotencyKey(null);
      }
      setStatus("ready");
      resetVoiceState();

      if (
        awaitingConfirmation &&
        idempotencyKey &&
        result.state === "COMPLETED"
      ) {
        await recoverTransfer(idempotencyKey);
      }
    } catch (error: unknown) {
      const uploadError = toApiError(error);
      if (awaitingConfirmation && idempotencyKey) {
        const recovered = await recoverTransfer(idempotencyKey);
        if (recovered) {
          setAudio(null);
          resetVoiceState();
          return;
        }
        showError(
          `${uploadError.message} 송금 처리 여부를 확인하지 못했습니다. 같은 키로 상태를 다시 확인해 주세요.`,
        );
        return;
      }

      const recoveryAction = selectVoiceErrorRecoveryAction(uploadError.code);
      if (recoveryAction === "direct_input") {
        setAudio(null);
        setSession(null);
        setCommand(null);
        setVoiceRetryLimitReached(true);
        showError(uploadError.message);
        return;
      }

      if (recoveryAction === "restart_session") {
        setAudio(null);
        setSession(null);
        setCommand(null);
      }
      showError(uploadError.message);
    }
  };

  const playGuide = () => {
    if (
      !guideText ||
      !("speechSynthesis" in window) ||
      !("SpeechSynthesisUtterance" in window)
    ) {
      showError("이 브라우저에서는 음성 안내를 재생할 수 없습니다.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(guideText);
    utterance.lang = "ko-KR";
    utterance.rate = 0.9;
    utterance.onend = resetVoiceState;
    utterance.onerror = () =>
      showError("음성 안내를 재생하지 못했습니다. 화면 문구를 확인해 주세요.");
    setVoiceState({ status: "speaking", transcript: guideText, errorMessage: null });
    window.speechSynthesis.speak(utterance);
  };

  const sessionClosed =
    command?.state === "COMPLETED" ||
    command?.state === "CANCELED" ||
    transferStatus !== null;
  const awaitingConfirmation = command?.state === "AWAITING_CONFIRMATION";

  return (
    <section
      className="mt-8 rounded-2xl border-2 border-[var(--color-primary)] bg-[var(--color-surface)] p-6"
      aria-labelledby="voice-command-title"
    >
      <h2 id="voice-command-title" className="text-2xl font-bold">
        음성으로 금융 업무 시작
      </h2>
      <p className="mt-3 leading-7 text-[var(--color-text-muted)]">
        잔액조회, 거래내역 조회와 송금을 말로 요청할 수 있습니다. 녹음은
        전송 버튼을 누르기 전까지 서버로 보내지 않습니다.
      </p>

      <div className="mt-5" aria-live="polite" aria-atomic="true">
        {guideText ? (
          <div className="rounded-xl border-2 border-[var(--color-border)] p-4">
            <p className="font-semibold">서버 안내</p>
            <p className="mt-2 text-lg leading-8">{guideText}</p>
            <AccessibleButton
              className="mt-3"
              variant="secondary"
              onClick={playGuide}
            >
              안내 다시 듣기
            </AccessibleButton>
          </div>
        ) : null}

        {awaitingConfirmation && command.fromAccount && command.recipient ? (
          <section
            className="mt-5 rounded-xl border-2 border-[var(--color-warning)] p-5"
            aria-labelledby="voice-transfer-review-title"
          >
            <h3 id="voice-transfer-review-title" className="text-xl font-bold">
              송금 전 확인
            </h3>
            <dl className="mt-4 grid gap-3">
              <div>
                <dt className="font-semibold">출금 계좌</dt>
                <dd>
                  {command.fromAccount.alias || command.fromAccount.bankName}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">받는 사람</dt>
                <dd>{command.recipient.holderName}</dd>
              </div>
              <div>
                <dt className="font-semibold">보낼 금액</dt>
                <dd className="text-xl font-bold">
                  {currencyFormatter.format(command.amount ?? 0)}
                </dd>
              </div>
            </dl>
            <p className="mt-4 font-semibold">
              아직 이체되지 않았습니다. 내용을 직접 확인한 뒤 확인 또는 취소
              답변을 녹음하고, 녹음 전송 버튼을 눌러야 다음 단계로 진행됩니다.
            </p>
          </section>
        ) : null}

        {command?.balance ? (
          <p className="mt-5 text-2xl font-bold">
            현재 잔액 {currencyFormatter.format(command.balance.balanceAmount)}
          </p>
        ) : null}

        {command?.history ? (
          <p className="mt-5 text-lg font-semibold">
            {command.history.accountName} {command.history.periodPhrase} 거래{" "}
            {command.history.totalCount}건
          </p>
        ) : null}

        {transferStatus ? (
          <section
            className="mt-5 rounded-xl border-2 border-[var(--color-primary)] p-5"
            aria-labelledby="recovered-transfer-title"
          >
            <h3 id="recovered-transfer-title" className="text-xl font-bold">
              실제 송금 처리 결과
            </h3>
            <p className="mt-2 text-lg font-semibold">
              {transferStatus.voiceMessage}
            </p>
            <dl className="mt-4 grid gap-3">
              <div>
                <dt className="font-semibold">받는 사람</dt>
                <dd>{transferStatus.recipientName}</dd>
              </div>
              <div>
                <dt className="font-semibold">금액</dt>
                <dd>{currencyFormatter.format(transferStatus.amount)}</dd>
              </div>
              <div>
                <dt className="font-semibold">처리 상태</dt>
                <dd>{transferStatusLabels[transferStatus.status]}</dd>
              </div>
              <div>
                <dt className="font-semibold">FDS 판정</dt>
                <dd>
                  {transferStatus.riskLevel
                    ? riskLabels[transferStatus.riskLevel]
                    : "판정 진행 중"}
                </dd>
              </div>
            </dl>
            {transferStatus.riskLevel === "MEDIUM" ||
            transferStatus.riskLevel === "HIGH" ? (
              <p className="mt-4 font-semibold">
                보호자에게 알림을 요청했어요.
              </p>
            ) : null}
            {transferStatus.status === "PENDING" ||
            transferStatus.status === "RISK_REVIEW" ? (
              <p className="mt-4 font-semibold">
                아직 최종 결과가 아닙니다. 새 송금을 시작하지 말고 같은 키로
                상태를 확인해 주세요.
              </p>
            ) : null}
            {transferStatus.status === "BLOCKED" ||
            transferStatus.status === "FAILED" ||
            transferStatus.status === "CANCELED" ? (
              <p className="mt-4 font-semibold">
                이체가 완료되지 않았으며 계좌에서 돈이 빠져나가지 않았습니다.
              </p>
            ) : null}
            {!isTerminalTransferStatus(transferStatus) && idempotencyKey ? (
              <AccessibleButton
                className="mt-4"
                onClick={() => void recoverTransfer(idempotencyKey)}
                disabled={isRecoveringTransfer}
                isLoading={isRecoveringTransfer}
                loadingLabel="송금 상태를 확인하고 있어요"
              >
                같은 키로 상태 다시 확인
              </AccessibleButton>
            ) : (
              <AccessibleButton
                className="mt-4"
                variant="secondary"
                onClick={() => {
                  clearTransferRecoveryKey();
                  setIdempotencyKey(null);
                  setTransferStatus(null);
                  setCommand(null);
                  setSession(null);
                  setGuideText("");
                  setStatus("idle");
                  resetVoiceState();
                }}
              >
                결과 확인 완료
              </AccessibleButton>
            )}
          </section>
        ) : null}

        {!transferStatus && idempotencyKey && recoveryErrorMessage ? (
          <section
            className="mt-5 rounded-xl border-2 border-[var(--color-warning)] p-5"
            role="alert"
          >
            <h3 className="text-xl font-bold">송금 상태를 확인하지 못했습니다.</h3>
            <p className="mt-2">{recoveryErrorMessage}</p>
            <p className="mt-2 font-semibold">
              새 송금 키를 만들지 않고 저장된 같은 키로 다시 확인합니다.
            </p>
            <AccessibleButton
              className="mt-4"
              onClick={() => void recoverTransfer(idempotencyKey)}
              disabled={isRecoveringTransfer}
              isLoading={isRecoveringTransfer}
              loadingLabel="송금 상태를 확인하고 있어요"
            >
              같은 키로 송금 상태 확인
            </AccessibleButton>
          </section>
        ) : null}

        {status === "idle" && !idempotencyKey ? (
          <AccessibleButton className="mt-5" onClick={() => void beginSession()}>
            음성 세션 시작하기
          </AccessibleButton>
        ) : null}
        {status === "starting" ? (
          <p className="mt-5 font-semibold">음성 세션을 준비하고 있어요.</p>
        ) : null}
        {status === "ready" && session && !sessionClosed ? (
          <AccessibleButton className="mt-5" onClick={() => void startRecording()}>
            {awaitingConfirmation
              ? "확인 또는 취소 답변 녹음하기"
              : "말하기 시작"}
          </AccessibleButton>
        ) : null}
        {status === "recording" ? (
          <div className="mt-5">
            <p className="text-lg font-bold">
              녹음 중 {Math.min(recordingSeconds, MAX_VOICE_DURATION_SECONDS)}초 /{" "}
              {MAX_VOICE_DURATION_SECONDS}초
            </p>
            <AccessibleButton className="mt-3" onClick={stopRecording}>
              녹음 끝내기
            </AccessibleButton>
          </div>
        ) : null}
        {status === "recorded" && audio ? (
          <div className="mt-5 rounded-xl border-2 border-[var(--color-border)] p-4">
            <p className="font-semibold">
              녹음 완료 · {Math.ceil(audio.size / 1024)}KB
            </p>
            <p className="mt-2">
              내용을 확인했다면 전송하세요. 전송 전에는 금융 동작이 실행되지
              않습니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <AccessibleButton onClick={() => void uploadRecording()}>
                {awaitingConfirmation
                  ? "검토한 확인 답변 보내기"
                  : "녹음한 명령 보내기"}
              </AccessibleButton>
              <AccessibleButton
                variant="secondary"
                onClick={() => void startRecording()}
              >
                다시 녹음하기
              </AccessibleButton>
            </div>
          </div>
        ) : null}
        {status === "uploading" ? (
          <p className="mt-5 font-semibold">음성 명령을 안전하게 확인하고 있어요.</p>
        ) : null}

        {status === "error" ? (
          <div
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className="mt-5 rounded-xl border-2 border-[var(--color-danger)] p-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
          >
            <p className="font-semibold">{errorMessage}</p>
            {voiceRetryLimitReached ? null : audio && session ? (
              <AccessibleButton className="mt-3" onClick={() => void uploadRecording()}>
                같은 녹음 다시 보내기
              </AccessibleButton>
            ) : session ? (
              <AccessibleButton className="mt-3" onClick={() => void startRecording()}>
                다시 녹음하기
              </AccessibleButton>
            ) : (
              <AccessibleButton className="mt-3" onClick={() => void beginSession()}>
                다시 시도하기
              </AccessibleButton>
            )}
          </div>
        ) : null}

        {voiceRetryLimitReached ? (
          <section
            className="mt-5 rounded-xl border-2 border-[var(--color-warning)] p-5"
            aria-labelledby="voice-direct-input-title"
          >
            <h3 id="voice-direct-input-title" className="text-xl font-bold">
              음성 재시도 한도에 도달했습니다
            </h3>
            <p className="mt-2 leading-7">
              서버가 기존 음성 세션과 저장된 송금 정보를 폐기했습니다. 같은
              세션을 계속 사용하지 말고 아래 화면에서 직접 진행해 주세요.
            </p>
            <nav className="mt-4 flex flex-wrap gap-3" aria-label="직접 입력 업무 선택">
              <Link
                href="/balance"
                className="inline-flex min-h-11 items-center rounded-lg border-2 border-[var(--color-border)] px-4 py-2 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
              >
                잔액 직접 조회
              </Link>
              <Link
                href="/transactions"
                className="inline-flex min-h-11 items-center rounded-lg border-2 border-[var(--color-border)] px-4 py-2 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
              >
                거래내역 직접 조회
              </Link>
              <Link
                href="/transfer"
                className="inline-flex min-h-11 items-center rounded-lg border-2 border-[var(--color-border)] px-4 py-2 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
              >
                송금 정보 직접 입력
              </Link>
            </nav>
          </section>
        ) : null}

        {status === "unsupported" ? (
          <p className="mt-5 rounded-xl border-2 border-[var(--color-warning)] p-4 font-semibold">
            이 브라우저는 WebM/Opus, MP4/M4A 또는 WAV 녹음을 지원하지
            않습니다. 아래 화면 버튼과 입력란으로 같은 업무를 진행해 주세요.
          </p>
        ) : null}
      </div>

      <nav className="mt-6 flex flex-wrap gap-3" aria-label="음성 기능의 직접 조작 대안">
        <Link
          href="/balance"
          className="inline-flex min-h-11 items-center rounded-lg border-2 border-[var(--color-border)] px-4 py-2 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
        >
          잔액 직접 조회
        </Link>
        <Link
          href="/transactions"
          className="inline-flex min-h-11 items-center rounded-lg border-2 border-[var(--color-border)] px-4 py-2 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
        >
          거래내역 직접 조회
        </Link>
        <Link
          href="/transfer"
          className="inline-flex min-h-11 items-center rounded-lg border-2 border-[var(--color-border)] px-4 py-2 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-focus)]"
        >
          송금 정보 직접 입력
        </Link>
      </nav>
    </section>
  );
}

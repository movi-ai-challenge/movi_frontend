"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AccessibleButton } from "@/components/common/AccessibleButton";
import { toApiError } from "@/services/api";
import {
  clearTransferRecoveryKey,
  saveTransferRecoveryKey,
} from "@/services/transferRecoveryStorage";
import { getTransferStatus } from "@/services/transferService";
import {
  MAX_VOICE_AUDIO_BYTES,
  MAX_VOICE_DURATION_SECONDS,
  selectSupportedVoiceMimeType,
  sendVoiceCommand,
} from "@/services/voiceService";
import type { VoiceCommandResult } from "@/types";

/**
 * 확인 발화를 받아 이체를 마무리한다.
 *
 * <p>실시간 인식(WebSocket)은 확인을 다루지 않는다. 확인에는 confirmationId 와 멱등키가
 * 필요한데 그 교환은 REST 흐름이 담당하기 때문이다. 그래서 명령까지는 스트리밍으로 받고,
 * 확인 한 마디만 이 컴포넌트가 녹음해 업로드한다.
 *
 * <p>이 단계에서 실패하면 "돈이 나갔는지 모르는" 상태가 된다. 그래서 보내기 전에 멱등키를
 * 저장하고, 응답을 못 받으면 같은 키로 상태를 다시 조회한다. 키를 저장하지 못하면 아예
 * 보내지 않는다 — 확인할 방법이 없는 채로 이체를 띄우지 않기 위해서다.
 */

type Phase = "idle" | "recording" | "sending" | "recovering";

interface Props {
  voiceSessionId: number | string;
  confirmationId: string;
  /** 백엔드가 만든 확인 질문. 화면과 낭독이 같은 문장을 쓴다. */
  question: string;
  onSettled: (result: VoiceCommandResult) => void;
  onFailed: (message: string) => void;
}

function createIdempotencyKey(): string | null {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    return null;
  }
  return crypto.randomUUID();
}

export function VoiceConfirmation({
  voiceSessionId,
  confirmationId,
  question,
  onSettled,
  onFailed,
}: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimerRef = useRef<number | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);

  /*
   * 멱등키는 확인 한 건에 하나만 쓴다. 다시 녹음하더라도 같은 키로 보내야
   * 서버가 같은 이체로 알아본다 — 새로 만들면 두 번 나갈 수 있다.
   */
  if (idempotencyKeyRef.current === null) {
    idempotencyKeyRef.current = createIdempotencyKey();
  }

  const release = useCallback(() => {
    if (stopTimerRef.current !== null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  useEffect(() => release, [release]);

  const send = useCallback(
    async (audio: Blob) => {
      const idempotencyKey = idempotencyKeyRef.current;
      if (!idempotencyKey) {
        onFailed("안전한 확인 키를 만들 수 없어요. 이체 화면에서 확인해 주세요.");
        return;
      }
      try {
        saveTransferRecoveryKey(idempotencyKey);
      } catch {
        onFailed(
          "송금 상태를 확인할 키를 보관하지 못했어요. 이체를 진행하지 않았어요.",
        );
        return;
      }

      setPhase("sending");
      setMessage("확인하고 있어요.");
      try {
        const result = await sendVoiceCommand({
          voiceSessionId: String(voiceSessionId),
          audio,
          confirmationId,
          idempotencyKey,
        });
        if (result.state !== "AWAITING_CONFIRMATION") {
          clearTransferRecoveryKey();
        }
        onSettled(result);
        return;
      } catch (error: unknown) {
        /*
         * 응답을 못 받았다고 이체가 안 나간 것은 아니다. 같은 키로 상태를 물어
         * 실제로 어떻게 됐는지 확인한다. 여기서 "실패했어요" 라고 단정하면
         * 사용자가 다시 보내 두 번 나갈 수 있다.
         */
        setPhase("recovering");
        setMessage("송금 결과를 확인하고 있어요.");
        try {
          const recovered = await getTransferStatus(idempotencyKey);
          clearTransferRecoveryKey();
          onFailed(recovered.voiceMessage);
        } catch {
          onFailed(
            `${toApiError(error).message} 송금 여부를 확인하지 못했어요. `
              + "다시 보내지 마시고 이체 내역을 확인해 주세요.",
          );
        }
      }
    },
    [confirmationId, onFailed, onSettled, voiceSessionId],
  );

  const startRecording = async () => {
    if (phase !== "idle") return;
    const mimeType = selectSupportedVoiceMimeType();
    if (!mimeType || !navigator.mediaDevices?.getUserMedia) {
      onFailed("이 브라우저는 음성 확인을 지원하지 않아요. 이체 화면에서 확인해 주세요.");
      return;
    }

    chunksRef.current = [];
    setMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        release();
        setPhase("idle");
        onFailed("음성을 녹음하지 못했어요. 이체 화면에서 확인해 주세요.");
      };
      recorder.onstop = () => {
        release();
        const recorded = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType,
        });
        if (recorded.size < 1) {
          setPhase("idle");
          setMessage("소리가 담기지 않았어요. 다시 말씀해 주세요.");
          return;
        }
        if (recorded.size > MAX_VOICE_AUDIO_BYTES) {
          setPhase("idle");
          setMessage("녹음이 너무 길어요. 짧게 다시 말씀해 주세요.");
          return;
        }
        void send(recorded);
      };

      recorder.start();
      setPhase("recording");
      setMessage("듣고 있어요. \"네\" 또는 \"아니요\"라고 말씀해 주세요.");
      // 확인은 한 마디다. 말이 끝난 뒤 손을 대지 않아도 멈추게 둔다.
      stopTimerRef.current = window.setTimeout(() => {
        if (recorderRef.current?.state === "recording") {
          recorderRef.current.stop();
        }
      }, MAX_VOICE_DURATION_SECONDS * 1000);
    } catch {
      release();
      setPhase("idle");
      onFailed("마이크를 사용할 수 없어요. 이체 화면에서 확인해 주세요.");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  };

  const busy = phase === "sending" || phase === "recovering";

  return (
    <div className="mt-4 w-full">
      <p className="text-lg font-bold text-[var(--color-accent)]">{question}</p>

      {phase === "recording" ? (
        <AccessibleButton
          type="button"
          className="mt-3 w-full"
          onClick={stopRecording}
          aria-label="대답 끝내기"
        >
          대답 끝내기
        </AccessibleButton>
      ) : (
        <AccessibleButton
          type="button"
          className="mt-3 w-full"
          onClick={() => void startRecording()}
          disabled={busy}
          aria-label="음성으로 대답하기"
        >
          {busy ? "처리 중이에요" : "음성으로 대답하기"}
        </AccessibleButton>
      )}

      {message ? (
        <p aria-live="polite" className="mt-2 text-base text-[var(--color-muted)]">
          {message}
        </p>
      ) : null}
    </div>
  );
}

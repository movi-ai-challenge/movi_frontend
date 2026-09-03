"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { toApiError } from "@/services/api";
import {
  clearTransferRecoveryKey,
  saveTransferRecoveryKey,
} from "@/services/transferRecoveryStorage";
import { stopSpeaking } from "@/services/speech";
import { getTransferStatus } from "@/services/transferService";
import { canRetryConfirmation } from "@/services/voiceErrorRecovery";
import {
  MAX_VOICE_AUDIO_BYTES,
  MAX_VOICE_DURATION_SECONDS,
  selectSupportedVoiceMimeType,
  sendVoiceCommand,
} from "@/services/voiceService";
import type { VoiceCommandResult } from "@/types";

/**
 * 확인 발화를 녹음해 이체를 마무리한다.
 *
 * <p>확인은 실시간 스트리밍(WebSocket)으로 처리할 수 없다. 확인에는 confirmationId 와
 * 멱등키가 필요한데 스트림에는 그 값을 실어 보낼 자리가 없어, 스트림으로 "네"가
 * 들어가면 백엔드가 멱등키 누락으로 거절한다. 그래서 확인 한 마디만 REST 로 올린다.
 *
 * <p>화면이 아니라 훅으로 둔 이유는 <b>같은 녹음을 두 곳에서 시작</b>해야 하기
 * 때문이다. 확인 화면의 버튼과 홈 화면의 큰 마이크 버튼이 같은 동작을 해야 한다 --
 * 화면을 보지 않는 사용자는 늘 누르던 마이크를 누르지, 새로 생긴 버튼을 찾지 않는다.
 *
 * <p>이 단계에서 실패하면 "돈이 나갔는지 모르는" 상태가 된다. 그래서 보내기 전에
 * 멱등키를 저장하고, 응답을 못 받으면 같은 키로 상태를 다시 조회한다. 키를 저장하지
 * 못하면 아예 보내지 않는다 -- 확인할 방법이 없는 채로 이체를 띄우지 않기 위해서다.
 */

export type ConfirmationPhase = "idle" | "recording" | "sending" | "recovering";

export interface ConfirmationRecorder {
  phase: ConfirmationPhase;
  /** 진행 상황 안내. 화면에 그대로 띄운다. */
  message: string;
  isRecording: boolean;
  /** 전송·복구 중이라 새 녹음을 받을 수 없는 상태. */
  isBusy: boolean;
  /** 녹음 중이면 멈추고, 아니면 시작한다. 버튼 하나로 다루기 위한 것. */
  toggle: () => void;
}

interface Options {
  voiceSessionId: number | string | null;
  confirmationId: string | null;
  /** 확인이 끝나 이체 결과가 나왔을 때. */
  onSettled: (result: VoiceCommandResult) => void;
  /** 확인 흐름을 더 진행할 수 없을 때. 호출되면 확인 상태를 정리해야 한다. */
  onFailed: (message: string) => void;
  /** 다시 답하면 되는 실패. 확인 상태는 그대로 두고 안내만 한다. */
  onRetryable: (message: string) => void;
}

function createIdempotencyKey(): string | null {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    return null;
  }
  return crypto.randomUUID();
}

export function useConfirmationRecorder({
  voiceSessionId,
  confirmationId,
  onSettled,
  onFailed,
  onRetryable,
}: Options): ConfirmationRecorder {
  const [phase, setPhase] = useState<ConfirmationPhase>("idle");
  const [message, setMessage] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimerRef = useRef<number | null>(null);

  /*
   * 콜백은 화면에서 인라인으로 넘어와 렌더마다 새 참조가 된다. 그대로 의존성에 두면
   * 녹음 중에 콜백이 바뀌어 이벤트 핸들러가 옛 값을 붙든다. ref 로 최신 것만 본다.
   */
  const handlersRef = useRef({ onSettled, onFailed, onRetryable });
  useEffect(() => {
    handlersRef.current = { onSettled, onFailed, onRetryable };
  });

  /*
   * 멱등키는 확인 한 건에 하나만 쓴다. 다시 녹음하더라도 같은 키로 보내야 서버가
   * 같은 이체로 알아본다 -- 새로 만들면 두 번 나갈 수 있다. 확인 건이 바뀌면
   * (confirmationId 가 바뀌면) 그때 새로 만든다.
   */
  const keyStoreRef = useRef<{ owner: string; key: string } | null>(null);
  const resolveIdempotencyKey = useCallback((owner: string): string | null => {
    const stored = keyStoreRef.current;
    if (stored !== null && stored.owner === owner) return stored.key;
    const key = createIdempotencyKey();
    if (key === null) return null;
    keyStoreRef.current = { owner, key };
    return key;
  }, []);

  const release = useCallback(() => {
    if (stopTimerRef.current !== null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  // 화면을 벗어나면 마이크를 반드시 놓는다. 남겨 두면 녹음이 계속된다.
  useEffect(() => release, [release]);

  const send = useCallback(
    async (audio: Blob) => {
      if (voiceSessionId === null || confirmationId === null) {
        setPhase("idle");
        handlersRef.current.onFailed(
          "확인할 송금 정보를 찾지 못했어요. 이체 화면에서 확인해 주세요.",
        );
        return;
      }
      const idempotencyKey = resolveIdempotencyKey(confirmationId);
      if (!idempotencyKey) {
        setPhase("idle");
        handlersRef.current.onFailed(
          "안전한 확인 키를 만들 수 없어요. 이체 화면에서 확인해 주세요.",
        );
        return;
      }
      try {
        saveTransferRecoveryKey(idempotencyKey);
      } catch {
        setPhase("idle");
        handlersRef.current.onFailed(
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
        setPhase("idle");
        setMessage("");
        handlersRef.current.onSettled(result);
        return;
      } catch (error: unknown) {
        const apiError = toApiError(error);

        /*
         * 발화를 못 알아들은 것뿐이라면 이체는 아직 나가지 않았고 세션도 확인 대기
         * 그대로다. 확인 흐름을 접지 말고 한 번 더 답할 기회를 준다 -- 여기서 접으면
         * "네" 를 한 번 흘려들은 것만으로 송금을 처음부터 다시 말해야 한다.
         */
        if (canRetryConfirmation(apiError.code, apiError.status)) {
          setPhase("idle");
          setMessage("");
          handlersRef.current.onRetryable(apiError.message);
          return;
        }

        /*
         * 응답을 못 받았다고 이체가 안 나간 것은 아니다. 같은 키로 상태를 물어 실제로
         * 어떻게 됐는지 확인한다. 여기서 "실패했어요" 라고 단정하면 사용자가 다시 보내
         * 두 번 나갈 수 있다.
         */
        setPhase("recovering");
        setMessage("송금 결과를 확인하고 있어요.");
        try {
          const recovered = await getTransferStatus(idempotencyKey);
          clearTransferRecoveryKey();
          setPhase("idle");
          setMessage("");
          handlersRef.current.onFailed(recovered.voiceMessage);
        } catch {
          setPhase("idle");
          setMessage("");
          handlersRef.current.onFailed(
            `${apiError.message} 송금 여부를 확인하지 못했어요. `
              + "다시 보내지 마시고 이체 내역을 확인해 주세요.",
          );
        }
      }
    },
    [confirmationId, resolveIdempotencyKey, voiceSessionId],
  );

  const startRecording = useCallback(async () => {
    /*
     * 낭독을 먼저 끊는다. "김영희님께 5만원 보낼까요?" 를 읽는 도중에 녹음이 시작되면
     * 그 소리가 마이크로 들어가, 사용자가 "네" 라고 해도 확인 문장까지 함께 인식된다.
     */
    stopSpeaking();

    const mimeType = selectSupportedVoiceMimeType();
    if (!mimeType || !navigator.mediaDevices?.getUserMedia) {
      handlersRef.current.onFailed(
        "이 브라우저는 음성 확인을 지원하지 않아요. 이체 화면에서 확인해 주세요.",
      );
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
        handlersRef.current.onFailed(
          "음성을 녹음하지 못했어요. 이체 화면에서 확인해 주세요.",
        );
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
      handlersRef.current.onFailed(
        "마이크를 사용할 수 없어요. 이체 화면에서 확인해 주세요.",
      );
    }
  }, [release, send]);

  const toggle = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
      return;
    }
    if (phase !== "idle") return;
    void startRecording();
  }, [phase, startRecording]);

  return {
    phase,
    message,
    isRecording: phase === "recording",
    isBusy: phase === "sending" || phase === "recovering",
    toggle,
  };
}

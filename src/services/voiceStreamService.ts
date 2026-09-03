"use client";

import {
  isVoiceStreamCommand,
  isVoiceStreamCommandError,
  isVoiceStreamError,
  parseVoiceStreamMessage,
  toVoiceStreamUrl,
  type VoiceStreamCommandError,
  type VoiceStreamError,
  type VoiceStreamResult,
} from "@/services/voiceStreamContract";
import { VOICE_STREAM_FINALIZATION_DELAY_MS } from "@/services/voiceAudioContract";

/**
 * 실시간 음성 인식 세션.
 *
 * 마이크 → AudioWorklet(PCM 변환) → WebSocket → 백엔드 → AI → Google STT 로
 * 이어지고, 인식 결과가 같은 연결로 되돌아온다. 말이 끝나기를 기다리지 않는다.
 */

const WORKLET_URL = "/pcm-worklet.js";
const WORKLET_NAME = "pcm-worklet";

export interface VoiceStreamHandlers {
  onResult: (result: VoiceStreamResult) => void;
  /** 백엔드 검증까지 마친 명령 결과. 잔액·거래내역·확인 대기가 여기로 온다. */
  onCommand: (data: unknown, voiceMessage: string) => void;
  onCommandError: (error: VoiceStreamCommandError) => void;
  onError: (error: VoiceStreamError) => void;
  onClose: () => void;
}

export interface VoiceStreamSession {
  /** 더 보낼 오디오가 없음을 알리고 마지막 결과까지 받는다. */
  stop: () => void;
}

/** iOS 14 이전 Safari 는 접두사가 붙은 이름만 갖는다. */
function resolveAudioContext(): typeof AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  );
}

export function isVoiceStreamSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    resolveAudioContext() !== undefined &&
    typeof window.WebSocket !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

export async function startVoiceStream(
  accessToken: string,
  handlers: VoiceStreamHandlers,
  voiceSessionId?: number | string,
): Promise<VoiceStreamSession> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL이 설정되지 않아 음성 인식을 시작할 수 없습니다.");
  }

  const AudioContextClass = resolveAudioContext();
  if (!AudioContextClass) {
    throw new Error("이 브라우저는 오디오 처리를 지원하지 않습니다.");
  }

  /*
   * 오디오 컨텍스트를 마이크 요청보다 먼저 만들고 깨운다.
   *
   * iOS 는 새로 만든 컨텍스트를 suspended 로 두고, 사용자 제스처와 이어진
   * 흐름에서만 재개를 허용한다. getUserMedia 를 먼저 await 하면 그 사이 제스처
   * 문맥이 끊겨 재개가 거부된다. suspended 인 채로 두면 워클릿의 process 가
   * 돌지 않아 오디오가 한 조각도 나가지 않는다 -- 화면에는 "듣고 있어요"만
   * 뜨고 글자가 영영 붙지 않는다.
   */
  const context = new AudioContextClass();
  if (context.state === "suspended") {
    await context.resume();
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
    },
  });
  const socket = new WebSocket(
    toVoiceStreamUrl(apiBaseUrl, accessToken, voiceSessionId),
  );
  socket.binaryType = "arraybuffer";

  let closed = false;
  let stopRequested = false;
  let finalizationTimer: ReturnType<typeof setTimeout> | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let worklet: AudioWorkletNode | null = null;

  const stopAudioGraph = () => {
    if (worklet) {
      worklet.port.onmessage = null;
      worklet.disconnect();
      worklet = null;
    }
    if (source) {
      source.disconnect();
      source = null;
    }
  };

  const release = () => {
    if (closed) return;
    closed = true;
    if (finalizationTimer !== null) {
      clearTimeout(finalizationTimer);
      finalizationTimer = null;
    }
    stopAudioGraph();
    stream.getTracks().forEach((track) => track.stop());
    void context.close().catch(() => undefined);
  };

  socket.onmessage = (event) => {
    if (typeof event.data !== "string") return;
    const message = parseVoiceStreamMessage(event.data);
    if (!message) return;
    if (isVoiceStreamError(message)) {
      handlers.onError(message);
      return;
    }
    if (isVoiceStreamCommand(message)) {
      handlers.onCommand(message.data, message.voiceMessage);
      return;
    }
    if (isVoiceStreamCommandError(message)) {
      handlers.onCommandError(message);
      return;
    }
    handlers.onResult(message);
  };

  socket.onerror = () => {
    handlers.onError({
      type: "error",
      code: "CONNECTION_FAILED",
      message: "음성 서버와 연결하지 못했습니다.",
      retryable: true,
    });
  };

  socket.onclose = () => {
    release();
    handlers.onClose();
  };

  await context.audioWorklet.addModule(WORKLET_URL);

  // 마이크 권한을 받는 사이 다시 잠겼을 수 있다.
  if (context.state === "suspended") {
    await context.resume();
  }
  source = context.createMediaStreamSource(stream);
  worklet = new AudioWorkletNode(context, WORKLET_NAME);

  worklet.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
    // 연결이 아직 열리는 중이거나 이미 닫혔으면 버린다. 쌓아 두었다가
    // 한꺼번에 보내면 인식이 실제 발화보다 늦어져 실시간이 아니게 된다.
    if (socket.readyState !== WebSocket.OPEN) return;
    socket.send(event.data);
  };

  source.connect(worklet);
  /*
   * 워클릿을 출력에 잇지 않는다. 이으면 마이크 소리가 스피커로 되돌아
   * 하울링이 난다. process() 는 연결되지 않아도 계속 호출된다.
   */

  return {
    stop: () => {
      if (stopRequested || closed) return;
      stopRequested = true;

      /*
       * iPhone Safari에서 사용자가 말하자마자 버튼을 누르면 마지막 음절 뒤의
       * 오디오가 잘려 Google STT가 interim만 남기고 final 없이 끝날 수 있다.
       * 짧은 후행 오디오를 더 보낸 뒤 EOS를 보내 최종 확정 시간을 확보한다.
       */
      finalizationTimer = setTimeout(() => {
        finalizationTimer = null;
        if (socket.readyState === WebSocket.OPEN) {
          socket.send("EOS");
        }
        release();
      }, VOICE_STREAM_FINALIZATION_DELAY_MS);
    },
  };
}

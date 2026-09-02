"use client";

import {
  isVoiceStreamError,
  parseVoiceStreamMessage,
  toVoiceStreamUrl,
  type VoiceStreamError,
  type VoiceStreamResult,
} from "@/services/voiceStreamContract";

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
  onError: (error: VoiceStreamError) => void;
  onClose: () => void;
}

export interface VoiceStreamSession {
  /** 더 보낼 오디오가 없음을 알리고 마지막 결과까지 받는다. */
  stop: () => void;
}

export function isVoiceStreamSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.AudioContext !== "undefined" &&
    typeof window.WebSocket !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

export async function startVoiceStream(
  accessToken: string,
  handlers: VoiceStreamHandlers,
): Promise<VoiceStreamSession> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL이 설정되지 않아 음성 인식을 시작할 수 없습니다.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
    },
  });

  const context = new AudioContext();
  const socket = new WebSocket(toVoiceStreamUrl(apiBaseUrl, accessToken));
  socket.binaryType = "arraybuffer";

  let closed = false;

  const release = () => {
    if (closed) return;
    closed = true;
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
  const source = context.createMediaStreamSource(stream);
  const worklet = new AudioWorkletNode(context, WORKLET_NAME);

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
      if (socket.readyState === WebSocket.OPEN) {
        socket.send("EOS");
      }
      worklet.port.onmessage = null;
      source.disconnect();
      worklet.disconnect();
      release();
    },
  };
}

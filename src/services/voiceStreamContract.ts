/**
 * 실시간 음성 인식 서버 메시지 계약.
 *
 * 백엔드가 AI 의 결과를 그대로 흘려 주므로 형태는 AI 가 정한 것과 같다.
 * 서버가 보내는 값을 그대로 믿지 않고 여기서 한 번 걸러 화면으로 넘긴다.
 */

export interface VoiceStreamResult {
  /** interim: 확정 전 추정치. final: 확정된 문장. */
  type: "interim" | "final";
  /** 이번 조각에서 인식된 말. */
  text: string;
  /** '모비야'를 만났는지. 만나기 전 발화는 명령이 아니다. */
  activated: boolean;
  /** 호출어를 뗀 실제 명령. 활성화 전에는 빈 문자열이다. */
  command: string;
  /** 확정분 + 진행분. 화면에 그대로 보여줄 값이다. */
  fullText: string;
}

/** 백엔드가 기존 검증 흐름을 거쳐 돌려준 명령 처리 결과. */
export interface VoiceStreamCommand {
  type: "command";
  data: unknown;
  /** 낭독할 안내 문구. 백엔드가 만든 값이라 금액이 한국어로 바뀌어 온다. */
  voiceMessage: string;
}

/** 명령 처리 중 거부됐을 때. 인식 자체는 성공한 상태다. */
export interface VoiceStreamCommandError {
  type: "commandError";
  code: string;
  voiceMessage: string;
}

export interface VoiceStreamError {
  type: "error";
  code: string;
  message: string;
  retryable: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export type VoiceStreamMessage =
  | VoiceStreamResult
  | VoiceStreamCommand
  | VoiceStreamCommandError
  | VoiceStreamError;

export function parseVoiceStreamMessage(raw: string): VoiceStreamMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;

  if (parsed.type === "command") {
    return {
      type: "command",
      data: parsed.data,
      voiceMessage: readString(parsed.voiceMessage),
    };
  }

  if (parsed.type === "commandError") {
    return {
      type: "commandError",
      code: readString(parsed.code) || "UNKNOWN",
      voiceMessage: readString(parsed.voiceMessage),
    };
  }

  // 분석 결과는 백엔드가 처리해 command 로 돌려준다. 화면은 쓰지 않는다.
  if (parsed.type === "analysis") return null;

  if (parsed.type === "error") {
    return {
      type: "error",
      code: readString(parsed.code) || "UNKNOWN",
      message: readString(parsed.message),
      retryable: parsed.retryable === true,
    };
  }

  if (parsed.type !== "interim" && parsed.type !== "final") return null;

  return {
    type: parsed.type,
    text: readString(parsed.text),
    activated: parsed.activated === true,
    command: readString(parsed.command),
    fullText: readString(parsed.fullText),
  };
}

export function isVoiceStreamError(
  value: VoiceStreamMessage,
): value is VoiceStreamError {
  return value.type === "error";
}

export function isVoiceStreamCommand(
  value: VoiceStreamMessage,
): value is VoiceStreamCommand {
  return value.type === "command";
}

export function isVoiceStreamCommandError(
  value: VoiceStreamMessage,
): value is VoiceStreamCommandError {
  return value.type === "commandError";
}

/**
 * API 주소에서 WebSocket 주소를 만든다. https 는 wss 로 바꿔야 한다 --
 * https 페이지에서 ws:// 로 붙으면 브라우저가 혼합 콘텐츠로 차단한다.
 */
export function toVoiceStreamUrl(
  apiBaseUrl: string,
  accessToken: string,
  voiceSessionId?: number | string,
): string {
  const base = apiBaseUrl.replace(/\/$/, "").replace(/^http/, "ws");
  const session =
    voiceSessionId === undefined
      ? ""
      : `&voiceSessionId=${encodeURIComponent(String(voiceSessionId))}`;
  return `${base}/ws/v1/voice/stream?accessToken=${encodeURIComponent(accessToken)}${session}`;
}

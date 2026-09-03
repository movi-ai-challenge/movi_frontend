import { api, isMockMode } from "@/services/api";
import { ApiResponseContractError, parseApiResponse } from "@/services/apiResponse";
import { readDeviceUuid } from "@/services/deviceIdentity";
import {
  isVoiceCommandResponseData,
  isVoiceSessionStartData,
  mapVoiceCommandResponse,
  mapVoiceSessionStart,
} from "@/services/voiceContract";
import {
  getVoiceAudioFileExtension,
  isSupportedVoiceMimeType,
  MAX_VOICE_AUDIO_BYTES,
  MAX_VOICE_DURATION_SECONDS,
  selectSupportedVoiceMimeType,
  SUPPORTED_VOICE_MIME_TYPES,
} from "@/services/voiceAudioContract";
import type { VoiceCommandResult, VoiceSessionStart } from "@/types";

const VOICE_SESSIONS_PATH = "/api/voice/sessions";

/**
 * 음성 명령 업로드(/commands) 전용 타임아웃.
 *
 * <p>이 요청 하나가 백엔드 안에서 STT+GPT 분석, FDS 평가, 은행 실행을 순서대로
 * 거친다. 백엔드가 스스로에게 허용한 시간만 더해도 음성 분석 응답 대기 10초 +
 * FDS 평가 3초 = 13초다. 게다가 음성 분석 실측 소요는 15~20초로 그 예산조차
 * 넘긴다(movi_ai/src/voice_analysis/api.py 주석).
 *
 * <p>기본 타임아웃(10초)을 그대로 쓰면 성공할 요청도 클라이언트가 먼저 포기한다.
 * axios 가 끊어도 서버는 이미 시작한 처리를 멈추지 않고 끝까지 실행해 송금을
 * 완료하므로, 사용자는 "통신하지 못했다"는 오류를 보면서 실제로는 송금이
 * 성공하는 상황을 겪는다. 백엔드의 실제 예산보다 여유 있게 잡는다.
 */
const VOICE_COMMAND_TIMEOUT_MS = 30_000;
export {
  MAX_VOICE_AUDIO_BYTES,
  MAX_VOICE_DURATION_SECONDS,
  selectSupportedVoiceMimeType,
  SUPPORTED_VOICE_MIME_TYPES,
};

export interface VoiceCommandUpload {
  voiceSessionId: string;
  audio: Blob;
  confirmationId?: string;
  idempotencyKey?: string;
}

function assertValidAudio(audio: Blob): void {
  if (audio.size < 1 || audio.size > MAX_VOICE_AUDIO_BYTES) {
    throw new ApiResponseContractError(
      "음성 파일은 비어 있지 않아야 하며 최대 5MB까지 전송할 수 있습니다.",
    );
  }
  if (!isSupportedVoiceMimeType(audio.type)) {
    throw new ApiResponseContractError(
      "지원하지 않는 음성 형식입니다. WebM/Opus, MP4/M4A 또는 WAV로 녹음해 주세요.",
    );
  }
}

export async function startVoiceSession(): Promise<VoiceSessionStart> {
  if (isMockMode) {
    throw new ApiResponseContractError(
      "음성 분석은 실제 API 모드에서만 사용할 수 있습니다. 직접 입력 기능을 이용해 주세요.",
    );
  }

  const response = await api.post<unknown>(VOICE_SESSIONS_PATH, {
    deviceUuid: readDeviceUuid(),
  });
  const parsed = parseApiResponse(response.data, isVoiceSessionStartData);
  return mapVoiceSessionStart(parsed.data, parsed.voiceMessage);
}

export async function sendVoiceCommand(
  upload: VoiceCommandUpload,
): Promise<VoiceCommandResult> {
  assertValidAudio(upload.audio);
  if ((upload.confirmationId && !upload.idempotencyKey) ||
      (!upload.confirmationId && upload.idempotencyKey)) {
    throw new ApiResponseContractError(
      "확인 ID와 멱등성 키는 확인 발화에서 함께 전송해야 합니다.",
    );
  }
  if (isMockMode) {
    throw new ApiResponseContractError(
      "음성 분석은 실제 API 모드에서만 사용할 수 있습니다. 직접 입력 기능을 이용해 주세요.",
    );
  }

  const formData = new FormData();
  const extension = getVoiceAudioFileExtension(upload.audio.type);
  formData.append("audio", upload.audio, `voice-command.${extension}`);
  if (upload.confirmationId && upload.idempotencyKey) {
    formData.append("confirmationId", upload.confirmationId);
    formData.append("idempotencyKey", upload.idempotencyKey);
  }

  const response = await api.post<unknown>(
    `${VOICE_SESSIONS_PATH}/${encodeURIComponent(upload.voiceSessionId)}/commands`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: VOICE_COMMAND_TIMEOUT_MS,
    },
  );
  const parsed = parseApiResponse(response.data, isVoiceCommandResponseData);
  return mapVoiceCommandResponse(parsed.data, parsed.voiceMessage);
}

/**
 * 세션의 마지막 응답을 다시 가져온다.
 *
 * <p>스트리밍 응답은 마지막 한 프레임이 도착해야만 성공한다. 그 프레임을 놓치면 답이
 * 서버에 있어도 사용자는 알 방법이 없다. 연결이 끊겼을 때 이걸로 이어붙인다.
 *
 * @returns 남아 있는 답이 없으면 null. 실패는 예외로 올리지 않는다 -- 복구 시도일 뿐이라
 *          여기서 또 오류를 띄우면 원래 사정이 가려진다
 */
export async function getLastVoiceResult(
  voiceSessionId: number | string,
): Promise<{ result: VoiceCommandResult; voiceMessage: string } | null> {
  if (isMockMode) return null;

  try {
    const response = await api.get<unknown>(
      `${VOICE_SESSIONS_PATH}/${encodeURIComponent(voiceSessionId)}/result`,
    );
    const body = response.data as { data?: unknown; voiceMessage?: unknown };
    if (!isVoiceCommandResponseData(body?.data)) return null;

    const voiceMessage =
      typeof body.voiceMessage === "string" ? body.voiceMessage : "";
    if (!voiceMessage) return null;

    return {
      result: mapVoiceCommandResponse(body.data, voiceMessage),
      voiceMessage,
    };
  } catch {
    return null;
  }
}

/** 답이 아직 만들어지는 중일 수 있어 잠깐 간격을 두고 다시 묻는다. */
const RESULT_RETRY_DELAYS_MS = [0, 800, 1600, 2500];

/**
 * 마지막 답을 몇 번 더 물어본다.
 *
 * <p>연결이 끊긴 시점과 서버가 답을 저장하는 시점은 1초 안팎으로 어긋날 수 있다. 실제로
 * 끊긴 직후 곧바로 물었다가 404 를 받고, 그 1초 뒤에 답이 저장된 적이 있다. 한 번 묻고
 * 포기하면 다 만들어진 답을 눈앞에서 놓친다.
 */
export async function waitForLastVoiceResult(
  voiceSessionId: number | string,
): Promise<{ result: VoiceCommandResult; voiceMessage: string } | null> {
  for (const delay of RESULT_RETRY_DELAYS_MS) {
    if (delay > 0) {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, delay);
      });
    }
    const recovered = await getLastVoiceResult(voiceSessionId);
    if (recovered) return recovered;
  }
  return null;
}

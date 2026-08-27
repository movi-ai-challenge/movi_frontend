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
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  const parsed = parseApiResponse(response.data, isVoiceCommandResponseData);
  return mapVoiceCommandResponse(parsed.data, parsed.voiceMessage);
}

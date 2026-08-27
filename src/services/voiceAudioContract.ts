export const MAX_VOICE_AUDIO_BYTES = 5 * 1024 * 1024;
export const MAX_VOICE_DURATION_SECONDS = 15;

export const SUPPORTED_VOICE_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
] as const;

const SUPPORTED_BASE_MIME_TYPES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
]);

export function normalizeVoiceMimeType(mimeType: string): string {
  return mimeType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

export function isSupportedVoiceMimeType(mimeType: string): boolean {
  return SUPPORTED_BASE_MIME_TYPES.has(normalizeVoiceMimeType(mimeType));
}

export function selectSupportedVoiceMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return (
    SUPPORTED_VOICE_MIME_TYPES.find((mimeType) =>
      MediaRecorder.isTypeSupported(mimeType),
    ) ?? null
  );
}

export function getVoiceAudioFileExtension(mimeType: string): string {
  const normalized = normalizeVoiceMimeType(mimeType);
  if (normalized === "audio/mp4" || normalized === "audio/x-m4a") {
    return "m4a";
  }
  if (["audio/wav", "audio/x-wav", "audio/wave"].includes(normalized)) {
    return "wav";
  }
  return "webm";
}

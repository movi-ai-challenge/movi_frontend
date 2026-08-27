export type VoiceErrorRecoveryAction =
  | "direct_input"
  | "restart_session"
  | "retry_current_session";

export function selectVoiceErrorRecoveryAction(
  errorCode: string | null,
): VoiceErrorRecoveryAction {
  if (errorCode === "VOICE_4006") return "direct_input";
  if (errorCode === "VOICE_4005") return "restart_session";
  return "retry_current_session";
}

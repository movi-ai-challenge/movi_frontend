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

export function selectVoiceStreamErrorMessage(
  errorCode: string,
  retryable: boolean,
): string {
  if (errorCode === "NO_FINAL_RESULT") {
    return "말씀을 끝까지 확인하지 못했어요. 마이크를 눌러 다시 말씀해 주세요.";
  }
  if (retryable) {
    return "잘 못 알아들었어요. 다시 말씀해 주세요.";
  }
  return "음성 인식에 문제가 생겼어요.";
}

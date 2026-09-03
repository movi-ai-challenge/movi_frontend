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

/*
 * 확인 발화가 실패했을 때 같은 확인을 다시 시도해도 되는 오류들.
 *
 * 백엔드는 이체를 실행하기 전에 발화를 검증한다. 아래 코드로 거절당했다면 돈은
 * 아직 움직이지 않았고, 세션도 확인 대기 상태 그대로 롤백된다 -- 다시 말하면 된다.
 *
 * 이 판정이 없으면 "네" 를 한 번 흘려들은 것만으로 확인 흐름이 통째로 사라져,
 * 화면을 보지 않는 사용자는 송금을 처음부터 다시 말해야 한다.
 */
const RETRYABLE_CONFIRMATION_ERROR_CODES = new Set([
  "VOICE_4003",   // 의도를 파악하지 못함
  "VOICE_4004",   // 인식 신뢰도가 낮음
  "VOICE_4008",   // 녹음 파일의 재생 시간을 읽지 못함
  "VOICE_4009",   // 녹음이 15초를 넘음
  "VOICE_5000",   // STT 실패
]);

/**
 * 확인 발화 실패를 같은 확인 안에서 다시 시도해도 되는지 판단한다.
 *
 * <p>응답을 받지 못한 경우(status 가 없는 네트워크 오류)는 여기서 참을 돌려주지
 * 않는다. 요청이 서버에 닿아 이체가 나갔을 수도 있어, 다시 보내면 두 번 나갈 위험이
 * 있기 때문이다. 그 경우는 멱등키로 상태를 조회하는 복구 경로가 맡는다.
 */
export function canRetryConfirmation(
  errorCode: string | null,
  status: number | null,
): boolean {
  if (status === null) return false;
  if (errorCode === null) return false;
  return RETRYABLE_CONFIRMATION_ERROR_CODES.has(errorCode);
}

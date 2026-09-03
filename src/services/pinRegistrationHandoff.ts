/* 단위 테스트가 `node --test`로 이 모듈을 직접 불러오므로, 실행 시점에 남는 값 import는
   경로 별칭이 아니라 상대 경로로 쓴다(`authenticatedClientState.ts`와 같은 규칙). */
import { normalizeKoreanMobileNumber } from "./pinValidation.ts";

/**
 * 일반 회원가입에서 입력한 휴대전화 번호를 PIN 등록 화면으로 넘긴다.
 *
 * 가입과 PIN 등록은 서로 다른 화면이라 폼 상태가 끊긴다. 번호를 넘기지 않으면 방금
 * 적어 넣은 번호를 다음 화면에서 다시 묻게 되는데, 화면을 보지 않고 입력하는 사용자에게
 * 같은 입력을 두 번 요구하는 것은 그 자체로 이탈 지점이다.
 *
 * URL 쿼리가 아니라 `sessionStorage`를 쓴다. 전화번호는 개인정보라 주소창·브라우저
 * 기록·리퍼러에 남기지 않는다. PIN 등록 화면이 읽는 즉시 지운다.
 */
const PIN_REGISTRATION_PHONE_STORAGE_KEY = "movi.pin-registration.phone";

export function savePinRegistrationPhoneNumber(phoneNumber: string): void {
  const normalized = normalizeKoreanMobileNumber(phoneNumber);
  if (!normalized) return;

  try {
    window.sessionStorage.setItem(
      PIN_REGISTRATION_PHONE_STORAGE_KEY,
      normalized,
    );
  } catch {
    // 저장소를 쓸 수 없으면 PIN 등록 화면이 번호를 다시 묻는다. 흐름은 끊기지 않는다.
  }
}

/**
 * 넘겨받은 번호를 읽는다. 저장소 값은 사용자가 바꿀 수 있으므로 형식을 다시 확인하고,
 * 형식이 깨졌으면 채워 넣지 않는다 — 잘못된 번호가 그대로 등록되면 보호자 경고 문자가
 * 엉뚱한 곳으로 간다.
 */
export function readPinRegistrationPhoneNumber(): string | null {
  try {
    const stored = window.sessionStorage.getItem(
      PIN_REGISTRATION_PHONE_STORAGE_KEY,
    );
    if (!stored) return null;

    const normalized = normalizeKoreanMobileNumber(stored);
    if (!normalized) {
      window.sessionStorage.removeItem(PIN_REGISTRATION_PHONE_STORAGE_KEY);
      return null;
    }
    return normalized;
  } catch {
    return null;
  }
}

export function clearPinRegistrationPhoneNumber(): void {
  try {
    window.sessionStorage.removeItem(PIN_REGISTRATION_PHONE_STORAGE_KEY);
  } catch {
    // 저장소를 쓸 수 없어도 화면에 채워진 값은 그대로 쓴다.
  }
}

export { PIN_REGISTRATION_PHONE_STORAGE_KEY };

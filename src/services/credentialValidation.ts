/**
 * 일반 로그인 아이디·비밀번호 검증.
 *
 * 백엔드 `SignUpRequest`의 제약과 같은 규칙을 쓴다. 프론트에서 먼저 걸러야
 * 화면을 보지 않는 사용자가 서버 왕복을 기다린 뒤에야 형식 오류를 듣는 일이 없다.
 * 규칙이 갈라지면 프론트는 통과시키고 서버가 거절하는 상태가 되므로 함께 고쳐야 한다.
 */

export const LOGIN_ID_MIN_LENGTH = 4;
export const LOGIN_ID_MAX_LENGTH = 30;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;

const LOGIN_ID_PATTERN = /^[a-zA-Z0-9_]+$/;

/** 서버가 소문자로 정규화해 저장하므로 프론트도 같은 형태로 보낸다. */
export function normalizeLoginId(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidLoginId(value: string): boolean {
  const normalized = normalizeLoginId(value);
  if (normalized.length < LOGIN_ID_MIN_LENGTH) return false;
  if (normalized.length > LOGIN_ID_MAX_LENGTH) return false;

  return LOGIN_ID_PATTERN.test(normalized);
}

export function isValidPassword(value: string): boolean {
  if (value.length < PASSWORD_MIN_LENGTH) return false;

  return value.length <= PASSWORD_MAX_LENGTH;
}

export function isValidDisplayName(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;

  return trimmed.length <= 50;
}

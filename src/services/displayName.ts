/**
 * 첫 화면에서 사용자를 부를 이름을 정한다.
 *
 * 홈은 "OOO님"으로 사용자를 부르고 그 문장이 TTS로 읽힌다. 백엔드가 로그인 응답에
 * 실어 주는 실제 이름을 우선하고, 값이 없을 때만 로그인 수단으로 물러선다.
 */

export type BackendLoginMethod = "카카오" | "PIN" | "일반";

const fallbackDisplayNameByMethod: Record<BackendLoginMethod, string> = {
  카카오: "카카오로 로그인한 사용자",
  PIN: "PIN으로 로그인한 사용자",
  일반: "아이디로 로그인한 사용자",
};

export function resolveDisplayName(
  name: string | null | undefined,
  method: BackendLoginMethod,
): string {
  const trimmed = name?.trim();
  if (trimmed) return trimmed;

  return fallbackDisplayNameByMethod[method];
}

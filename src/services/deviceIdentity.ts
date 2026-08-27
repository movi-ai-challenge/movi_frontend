const DEVICE_UUID_STORAGE_KEY = "movi.device.uuid";

/**
 * 이 브라우저를 가리키는 기기 식별자.
 *
 * 백엔드 FDS는 "익숙한 기기에서 온 이체인가"를 위험 신호로 쓴다. 계좌를 털린 사람의
 * 이체는 대개 처음 보는 기기에서 나가기 때문이다. 이 값을 보내지 않으면 모든 송금이
 * 비신뢰 기기로 평가돼 소액·기존 수취인이어도 MEDIUM이 되고, 정상 송금에도 보호자
 * 알림이 나간다.
 *
 * `localStorage`에 두는 이유는 **로그아웃해도 남아야 하기 때문**이다. 기기는 계정이
 * 아니라 단말에 묶인 정보라, 로그아웃마다 지우면 로그인할 때마다 처음 보는 기기가 된다.
 * 인증 토큰 정리 로직에 이 키를 섞지 않는다.
 *
 * 이 값은 **식별자일 뿐 인증 수단이 아니다.** 소유권 판정은 언제나 Access Token으로
 * 한다. 저장소를 쓸 수 없으면 `null`을 돌려주고, 호출부는 기기 정보 없이 진행한다 —
 * 위험 쪽으로 기우는 안전한 실패다.
 */
export function readDeviceUuid(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(DEVICE_UUID_STORAGE_KEY);
    if (stored && isUuid(stored)) return stored;

    const created = window.crypto.randomUUID();
    window.localStorage.setItem(DEVICE_UUID_STORAGE_KEY, created);
    return created;
  } catch {
    return null;
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export { DEVICE_UUID_STORAGE_KEY };

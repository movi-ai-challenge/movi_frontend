import { api } from "@/services/api";
import type { AuthSession, MockAuthenticationMethod } from "@/types";

const MOCK_AUTHENTICATION_DELAY_MS = 700;
const MOCK_LOGOUT_DELAY_MS = 300;
const KAKAO_AUTHORIZE_PATH = "/api/v1/auth/kakao/authorize";
const LOGOUT_PATH = "/api/v1/auth/logout";

function waitForMockResponse(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

export async function authenticateWithMock(
  method: MockAuthenticationMethod,
): Promise<AuthSession> {
  await waitForMockResponse(MOCK_AUTHENTICATION_DELAY_MS);

  return {
    userId: "user-demo",
    displayName: "모비 사용자",
    method,
    authenticatedAt: new Date().toISOString(),
  };
}

/**
 * 카카오 로그인은 Mock이 아니라 항상 실제 백엔드로 요청한다.
 *
 * 백엔드가 카카오 인증 페이지로 302 리다이렉트하고, 인증이 끝나면
 * 토큰을 쿼리파라미터에 실어 프론트 콜백 화면으로 다시 돌려보낸다.
 * 전체 페이지 이동이라 fetch가 아닌 location 이동을 사용한다.
 */
export function getKakaoLoginUrl(): string {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL이 설정되지 않아 카카오 로그인을 시작할 수 없습니다.");
  }

  return `${apiBaseUrl.replace(/\/$/, "")}${KAKAO_AUTHORIZE_PATH}`;
}

export function startKakaoLogin(): void {
  window.location.href = getKakaoLoginUrl();
}

export function parseKakaoLoginResult(
  searchParams: URLSearchParams,
): AuthSession | null {
  const accessToken = searchParams.get("accessToken");
  const refreshToken = searchParams.get("refreshToken");
  const userId = searchParams.get("userId");
  if (!accessToken || !refreshToken || !userId) return null;

  return {
    userId,
    displayName: "카카오로 로그인한 사용자",
    method: "카카오",
    authenticatedAt: new Date().toISOString(),
    backend: {
      accessToken,
      refreshToken,
      tokenType: searchParams.get("tokenType") ?? "Bearer",
      accessTokenExpiresIn: Number(
        searchParams.get("accessTokenExpiresIn") ?? 0,
      ),
      isNewUser: searchParams.get("newUser") === "true",
    },
  };
}

export async function logoutMockSession(): Promise<void> {
  await waitForMockResponse(MOCK_LOGOUT_DELAY_MS);
}

/**
 * 실제 백엔드 세션(카카오 로그인)이면 로그아웃 API를 호출해 서버의 토큰을
 * 무효화하고, Mock 세션이면 Mock 지연만 준다. 전역 Mock 플래그가 아니라
 * 세션 종류로 분기해야 실제 로그인 세션이 서버에 남지 않는다.
 */
export async function logout(session: AuthSession | null): Promise<void> {
  if (!session?.backend) {
    await logoutMockSession();
    return;
  }

  await api.post(LOGOUT_PATH, null, {
    headers: { Authorization: `Bearer ${session.backend.accessToken}` },
  });
}

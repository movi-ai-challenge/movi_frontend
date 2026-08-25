import type { AuthSession, MockAuthenticationMethod } from "@/types";

const MOCK_AUTHENTICATION_DELAY_MS = 700;
const MOCK_LOGOUT_DELAY_MS = 300;

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

export async function logoutMockSession(): Promise<void> {
  await waitForMockResponse(MOCK_LOGOUT_DELAY_MS);
import { api, isMockMode } from "@/services/api";
import type { AuthSession } from "@/store/useAuthStore";

const KAKAO_AUTHORIZE_PATH = "/api/v1/auth/kakao/authorize";
const LOGOUT_PATH = "/api/v1/auth/logout";
const MOCK_LOGOUT_DELAY_MS = 400;

export function getKakaoLoginUrl(): string {
  return `${process.env.NEXT_PUBLIC_API_URL ?? ""}${KAKAO_AUTHORIZE_PATH}`;
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
    userId: Number(userId),
    isNewUser: searchParams.get("newUser") === "true",
    accessToken,
    refreshToken,
    tokenType: searchParams.get("tokenType") ?? "Bearer",
    accessTokenExpiresIn: Number(
      searchParams.get("accessTokenExpiresIn") ?? 0,
    ),
  };
}

export async function logout(accessToken: string): Promise<void> {
  if (isMockMode) {
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, MOCK_LOGOUT_DELAY_MS);
    });
    return;
  }

  await api.post(LOGOUT_PATH, null, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

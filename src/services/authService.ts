import { api } from "@/services/api";
import { isRecord, parseApiData } from "@/services/apiResponse";
import type {
  AuthSession,
  AuthTokenPair,
  MockAuthenticationMethod,
} from "@/types";

const MOCK_AUTHENTICATION_DELAY_MS = 700;
const MOCK_LOGOUT_DELAY_MS = 300;
const KAKAO_AUTHORIZE_PATH = "/api/v1/auth/kakao/authorize";
const KAKAO_TOKEN_PATH = "/api/v1/auth/kakao/token";
const LOGOUT_PATH = "/api/v1/auth/logout";

interface KakaoLoginExchangeResult {
  session: AuthSession;
  refreshToken: string;
}

interface KakaoLoginData extends AuthTokenPair {
  userId: number | string;
  newUser: boolean;
}

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
 * 짧은 수명의 일회성 교환 코드만 프론트 콜백 화면으로 전달한다.
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

function isKakaoLoginData(value: unknown): value is KakaoLoginData {
  if (!isRecord(value)) return false;

  return (
    (typeof value.userId === "number" || typeof value.userId === "string") &&
    typeof value.newUser === "boolean" &&
    typeof value.accessToken === "string" &&
    value.accessToken.length > 0 &&
    typeof value.refreshToken === "string" &&
    value.refreshToken.length > 0 &&
    typeof value.tokenType === "string" &&
    value.tokenType.length > 0 &&
    typeof value.accessTokenExpiresIn === "number" &&
    Number.isFinite(value.accessTokenExpiresIn) &&
    value.accessTokenExpiresIn > 0
  );
}

function toKakaoLoginExchangeResult(
  data: KakaoLoginData,
): KakaoLoginExchangeResult {
  return {
    session: {
      userId: String(data.userId),
      displayName: "카카오로 로그인한 사용자",
      method: "카카오",
      authenticatedAt: new Date().toISOString(),
      backend: {
        accessToken: data.accessToken,
        tokenType: data.tokenType,
        accessTokenExpiresIn: data.accessTokenExpiresIn,
        isNewUser: data.newUser,
      },
    },
    refreshToken: data.refreshToken,
  };
}

export async function exchangeKakaoLoginCode(
  code: string,
): Promise<KakaoLoginExchangeResult> {
  const response = await api.post<unknown>(KAKAO_TOKEN_PATH, { code });
  return toKakaoLoginExchangeResult(
    parseApiData(response.data, isKakaoLoginData),
  );
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

  await api.post(LOGOUT_PATH);
}

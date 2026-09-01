import axios from "axios";

import { api } from "@/services/api";
import {
  isRecord,
  parseApiData,
  parseApiResponse,
  readApiFailureResponse,
} from "@/services/apiResponse";
import { readDeviceUuid } from "@/services/deviceIdentity";
import type {
  AuthSession,
  AuthTokenPair,
  MockAuthenticationMethod,
} from "@/types";

const MOCK_AUTHENTICATION_DELAY_MS = 700;
const MOCK_LOGOUT_DELAY_MS = 300;
const KAKAO_AUTHORIZE_PATH = "/api/v1/auth/kakao/authorize";
const KAKAO_TOKEN_PATH = "/api/v1/auth/kakao/token";
const SIGN_UP_PATH = "/api/v1/auth/signup";
const PASSWORD_LOGIN_PATH = "/api/v1/auth/login";
const PIN_LOGIN_PATH = "/api/v1/auth/pin/login";
const PIN_REGISTER_PATH = "/api/v1/auth/pin/register";
const LOGOUT_PATH = "/api/v1/auth/logout";

interface KakaoLoginExchangeResult {
  session: AuthSession;
  refreshToken: string;
}

export type PinAuthenticationErrorKind =
  | "password_mismatch"
  | "password_locked"
  | "password_not_registered"
  | "login_id_already_registered"
  | "pin_mismatch"
  | "pin_locked"
  | "pin_not_registered"
  | "pin_already_registered"
  | "phone_already_registered"
  | "invalid_phone"
  | "authentication_expired"
  | "network"
  | "unknown";

export interface PinAuthenticationError {
  kind: PinAuthenticationErrorKind;
  message: string;
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

const displayNameByMethod: Record<"카카오" | "PIN" | "일반", string> = {
  카카오: "카카오로 로그인한 사용자",
  PIN: "PIN으로 로그인한 사용자",
  일반: "아이디로 로그인한 사용자",
};

function toKakaoLoginExchangeResult(
  data: KakaoLoginData,
  method: "카카오" | "PIN" | "일반" = "카카오",
): KakaoLoginExchangeResult {
  return {
    session: {
      userId: String(data.userId),
      displayName: displayNameByMethod[method],
      method,
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

export function toPinAuthenticationError(
  error: unknown,
): PinAuthenticationError {
  if (!axios.isAxiosError(error)) {
    return { kind: "unknown", message: "요청을 처리하지 못했습니다." };
  }

  if (!error.response) {
    return {
      kind: "network",
      message: "서버와 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.",
    };
  }

  const failure = readApiFailureResponse(error.response.data);
  const message = failure?.voiceMessage ?? failure?.message;
  const kindByCode: Record<string, PinAuthenticationErrorKind> = {
    AUTH_4020: "pin_mismatch",
    AUTH_4024: "password_mismatch",
    AUTH_4025: "password_locked",
    AUTH_4026: "password_not_registered",
    AUTH_4092: "login_id_already_registered",
    AUTH_4021: "pin_locked",
    AUTH_4022: "pin_not_registered",
    AUTH_4090: "pin_already_registered",
    AUTH_4091: "phone_already_registered",
    NOTI_4001: "invalid_phone",
    AUTH_4010: "authentication_expired",
    AUTH_4011: "authentication_expired",
    AUTH_4012: "authentication_expired",
  };

  return {
    kind: failure ? (kindByCode[failure.code] ?? "unknown") : "unknown",
    message: message ?? "요청을 처리하지 못했습니다. 다시 시도해 주세요.",
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

export async function loginWithPin(
  phoneNumber: string,
  pin: string,
): Promise<KakaoLoginExchangeResult> {
  const response = await api.post<unknown>(PIN_LOGIN_PATH, {
    phoneNumber,
    pin,
    deviceUuid: readDeviceUuid(),
  });
  const data = parseApiData(response.data, isKakaoLoginData);
  return toKakaoLoginExchangeResult(data, "PIN");
}

export interface SignUpInput {
  loginId: string;
  password: string;
  name: string;
  phoneNumber?: string;
}

/**
 * 일반 회원가입. 백엔드가 가입 직후 토큰을 함께 내려 주므로 별도 로그인 요청이 없다.
 * 화면을 보지 않는 사용자에게 입력 단계를 한 번 더 요구하지 않기 위한 계약이다.
 */
export async function signUp(
  input: SignUpInput,
): Promise<KakaoLoginExchangeResult> {
  const response = await api.post<unknown>(SIGN_UP_PATH, {
    loginId: input.loginId,
    password: input.password,
    name: input.name,
    phoneNumber: input.phoneNumber,
    deviceUuid: readDeviceUuid(),
  });
  return toKakaoLoginExchangeResult(
    parseApiData(response.data, isKakaoLoginData),
    "일반",
  );
}

export async function loginWithPassword(
  loginId: string,
  password: string,
): Promise<KakaoLoginExchangeResult> {
  const response = await api.post<unknown>(PASSWORD_LOGIN_PATH, {
    loginId,
    password,
    deviceUuid: readDeviceUuid(),
  });
  return toKakaoLoginExchangeResult(
    parseApiData(response.data, isKakaoLoginData),
    "일반",
  );
}

export async function registerPin(
  phoneNumber: string,
  pin: string,
): Promise<void> {
  const response = await api.post<unknown>(PIN_REGISTER_PATH, {
    phoneNumber,
    pin,
    deviceUuid: readDeviceUuid(),
  });
  parseApiResponse(response.data, (data): data is null => data === null);
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

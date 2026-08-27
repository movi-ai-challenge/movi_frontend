import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

import {
  ApiResponseContractError,
  isRecord,
  parseApiData,
} from "@/services/apiResponse";
import { useAuthStore } from "@/store/useAuthStore";
import { useBankStore } from "@/store/useBankStore";
import { clearTransferRecoveryKey } from "@/services/transferRecoveryStorage";
import type { AuthTokenPair } from "@/types";

const API_TIMEOUT_MS = 10_000;
const TOKEN_REFRESH_PATH = "/api/v1/auth/token/refresh";
const AUTHENTICATION_EXCLUDED_PATHS = new Set([
  "/api/v1/auth/kakao/token",
  "/api/v1/auth/pin/login",
  TOKEN_REFRESH_PATH,
]);

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  moviAuthRetry?: boolean;
}

const apiConfig = {
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: API_TIMEOUT_MS,
  headers: { "Content-Type": "application/json" },
};

export const isMockMode = process.env.NEXT_PUBLIC_USE_MOCK === "true";
export const api = axios.create(apiConfig);
const refreshApi = axios.create(apiConfig);

let refreshPromise: Promise<string> | null = null;

function isAuthTokenPair(value: unknown): value is AuthTokenPair {
  if (!isRecord(value)) return false;

  return (
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

function clearAuthenticatedClientState(): void {
  useAuthStore.getState().clearSession();
  useBankStore.getState().resetBankState();
  clearTransferRecoveryKey();
}

function isAuthenticationExcludedRequest(
  config: InternalAxiosRequestConfig,
): boolean {
  const requestPath = config.url?.split("?", 1)[0] ?? "";
  return AUTHENTICATION_EXCLUDED_PATHS.has(requestPath);
}

async function requestRefreshedAccessToken(): Promise<string> {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) {
    clearAuthenticatedClientState();
    throw new Error("저장된 Refresh token이 없습니다.");
  }

  try {
    const response = await refreshApi.post<unknown>(TOKEN_REFRESH_PATH, {
      refreshToken,
    });
    const tokens = parseApiData(response.data, isAuthTokenPair);
    useAuthStore.getState().applyRefreshedTokens(tokens);
    return tokens.accessToken;
  } catch (error) {
    clearAuthenticatedClientState();
    throw error;
  }
}

function getRefreshedAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = requestRefreshedAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function restoreAuthenticatedSession(): Promise<void> {
  const { isRestoringSession } = useAuthStore.getState();
  if (!isRestoringSession) return;

  await getRefreshedAccessToken();
}

api.interceptors.request.use((config) => {
  const backendSession = useAuthStore.getState().session?.backend;
  if (
    backendSession &&
    !isAuthenticationExcludedRequest(config) &&
    !config.headers.has("Authorization")
  ) {
    config.headers.set(
      "Authorization",
      `${backendSession.tokenType} ${backendSession.accessToken}`,
    );
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const requestConfig = error.config as RetriableRequestConfig | undefined;
    if (!requestConfig || isAuthenticationExcludedRequest(requestConfig)) {
      return Promise.reject(error);
    }

    if (requestConfig.moviAuthRetry) {
      clearAuthenticatedClientState();
      return Promise.reject(error);
    }

    if (!useAuthStore.getState().refreshToken) {
      clearAuthenticatedClientState();
      return Promise.reject(error);
    }

    requestConfig.moviAuthRetry = true;

    try {
      const accessToken = await getRefreshedAccessToken();
      const tokenType =
        useAuthStore.getState().session?.backend?.tokenType ?? "Bearer";
      requestConfig.headers.set(
        "Authorization",
        `${tokenType} ${accessToken}`,
      );
      return api(requestConfig);
    } catch (refreshError: unknown) {
      return Promise.reject(refreshError);
    }
  },
);

export type ApiErrorKind =
  | "authentication_expired"
  | "authorization_failed"
  | "network"
  | "unknown";

export interface ApiError {
  kind: ApiErrorKind;
  message: string;
  status: number | null;
}

function readApiErrorMessage(error: AxiosError): string | null {
  const value: unknown = error.response?.data;
  if (!isRecord(value)) return null;
  if (typeof value.voiceMessage === "string") return value.voiceMessage;
  return typeof value.message === "string" ? value.message : null;
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiResponseContractError) {
    return {
      kind: "unknown",
      message: error.voiceMessage ?? error.message,
      status: null,
    };
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? null;

    if (status === 401) {
      return {
        kind: "authentication_expired",
        message: "인증 시간이 만료되었습니다. 다시 로그인해 주세요.",
        status,
      };
    }

    if (status === 403) {
      return {
        kind: "authorization_failed",
        message:
          readApiErrorMessage(error) ?? "이 작업을 수행할 권한이 없습니다.",
        status,
      };
    }

    if (!error.response) {
      return {
        kind: "network",
        message: "서버와 연결할 수 없습니다.",
        status,
      };
    }

    return {
      kind: "unknown",
      message: readApiErrorMessage(error) ?? "요청을 처리하지 못했습니다.",
      status,
    };
  }

  return {
    kind: "unknown",
    message: "알 수 없는 오류가 발생했습니다.",
    status: null,
  };
}

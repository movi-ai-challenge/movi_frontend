import axios, { AxiosError } from "axios";

export const isMockMode = process.env.NEXT_PUBLIC_USE_MOCK === "true";
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10_000,
  headers: { "Content-Type": "application/json" },
});

export type ApiErrorKind =
  | "authentication_expired"
  | "authentication_failed"
  | "network"
  | "unknown";

export interface ApiError {
  kind: ApiErrorKind;
  message: string;
  status: number | null;
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    const status = error.response?.status ?? null;

    if (status === 401) {
      return {
        kind: "authentication_expired",
        message: "인증 시간이 만료되었습니다.",
        status,
      };
    }

    if (status === 403) {
      return {
        kind: "authentication_failed",
        message: "계좌 인증을 완료하지 못했습니다.",
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

    return { kind: "unknown", message: error.message, status };
  }

  return {
    kind: "unknown",
    message: "알 수 없는 오류가 발생했습니다.",
    status: null,
  };
}

import axios, { AxiosError } from "axios";

export const isMockMode = process.env.NEXT_PUBLIC_USE_MOCK === "true";
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10_000,
  headers: { "Content-Type": "application/json" },
});

export interface ApiError { message: string; status: number | null; }

export function toApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    return { message: error.message, status: error.response?.status ?? null };
  }
  return { message: "알 수 없는 오류가 발생했습니다.", status: null };
}

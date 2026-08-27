import { create } from "zustand";

import type { AuthSession } from "@/types";

const MOCK_SESSION_STORAGE_KEY = "movi.mock-auth-session";
const REFRESH_TOKEN_STORAGE_KEY = "movi.auth-refresh-token";

interface AuthStore {
  session: AuthSession | null;
  refreshToken: string | null;
  hasHydrated: boolean;
  hydrateSession: () => void;
  setSession: (session: AuthSession) => void;
  setBackendSession: (session: AuthSession, refreshToken: string) => void;
  clearSession: () => void;
}

function isAuthSession(value: unknown): value is AuthSession {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.userId === "string" &&
    typeof candidate.displayName === "string" &&
    (candidate.method === "PASS" ||
      candidate.method === "카카오" ||
      candidate.method === "PIN" ||
      candidate.method === "생체인증") &&
    typeof candidate.authenticatedAt === "string"
  );
}

function readStoredSession(): AuthSession | null {
  try {
    const storedSession = window.sessionStorage.getItem(
      MOCK_SESSION_STORAGE_KEY,
    );
    if (!storedSession) return null;

    const parsedSession: unknown = JSON.parse(storedSession);
    return isAuthSession(parsedSession) ? parsedSession : null;
  } catch {
    return null;
  }
}

function readRefreshToken(): string | null {
  try {
    return window.sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  refreshToken: null,
  hasHydrated: false,
  hydrateSession: () =>
    set({
      session: readStoredSession(),
      refreshToken: readRefreshToken(),
      hasHydrated: true,
    }),
  setSession: (session) => {
    try {
      window.sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      window.sessionStorage.setItem(
        MOCK_SESSION_STORAGE_KEY,
        JSON.stringify(session),
      );
    } catch {
      // 세션 저장소를 사용할 수 없어도 메모리의 세션은 유지한다.
    }
    set({ session, refreshToken: null, hasHydrated: true });
  },
  setBackendSession: (session, refreshToken) => {
    try {
      window.sessionStorage.removeItem(MOCK_SESSION_STORAGE_KEY);
      window.sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
    } catch {
      // 세션 저장소를 사용할 수 없어도 메모리의 Access token은 유지한다.
    }
    set({ session, refreshToken, hasHydrated: true });
  },
  clearSession: () => {
    try {
      window.sessionStorage.removeItem(MOCK_SESSION_STORAGE_KEY);
      window.sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    } catch {
      // 저장소를 사용할 수 없어도 메모리의 세션은 정리한다.
    }
    set({ session: null, refreshToken: null, hasHydrated: true });
  },
}));

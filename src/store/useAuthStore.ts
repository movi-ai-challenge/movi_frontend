import { create } from "zustand";

import type { AuthSession } from "@/types";

const MOCK_SESSION_STORAGE_KEY = "movi.mock-auth-session";

interface AuthStore {
  session: AuthSession | null;
  hasHydrated: boolean;
  hydrateSession: () => void;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
}

function isAuthSession(value: unknown): value is AuthSession {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Record<string, unknown>;
  return (
    candidate.userId === "user-demo" &&
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

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  hasHydrated: false,
  hydrateSession: () =>
    set({ session: readStoredSession(), hasHydrated: true }),
  setSession: (session) => {
    try {
      window.sessionStorage.setItem(
        MOCK_SESSION_STORAGE_KEY,
        JSON.stringify(session),
      );
    } catch {
      // Mock 세션은 메모리에서 계속 사용할 수 있다.
    }
    set({ session, hasHydrated: true });
  },
  clearSession: () => {
    try {
      window.sessionStorage.removeItem(MOCK_SESSION_STORAGE_KEY);
    } catch {
      // 저장소를 사용할 수 없어도 메모리의 세션은 정리한다.
    }
    set({ session: null, hasHydrated: true });
  },
}));

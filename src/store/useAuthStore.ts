import { create } from "zustand";

import type { AuthSession, AuthTokenPair } from "@/types";

const MOCK_SESSION_STORAGE_KEY = "movi.mock-auth-session";
const REFRESH_TOKEN_STORAGE_KEY = "movi.auth-refresh-token";
const BACKEND_SESSION_METADATA_STORAGE_KEY = "movi.auth-session-metadata";

interface BackendSessionMetadata {
  userId: string;
  displayName: string;
  method: "카카오" | "PIN" | "일반";
  authenticatedAt: string;
  isNewUser: boolean;
}

interface AuthStore {
  session: AuthSession | null;
  refreshToken: string | null;
  pendingBackendSession: BackendSessionMetadata | null;
  hasHydrated: boolean;
  isRestoringSession: boolean;
  hydrateSession: () => void;
  setSession: (session: AuthSession) => void;
  setBackendSession: (session: AuthSession, refreshToken: string) => void;
  applyRefreshedTokens: (tokens: AuthTokenPair) => void;
  completePinRegistration: () => void;
  clearSession: () => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMockAuthSession(value: unknown): value is AuthSession {
  if (!isRecord(value) || value.backend !== undefined) return false;

  return (
    typeof value.userId === "string" &&
    typeof value.displayName === "string" &&
    (value.method === "PASS" ||
      value.method === "카카오" ||
      value.method === "일반" ||
      value.method === "PIN" ||
      value.method === "생체인증") &&
    typeof value.authenticatedAt === "string"
  );
}

function isBackendSessionMetadata(
  value: unknown,
): value is BackendSessionMetadata {
  if (!isRecord(value)) return false;

  return (
    typeof value.userId === "string" &&
    typeof value.displayName === "string" &&
    (value.method === "카카오" ||
      value.method === "PIN" ||
      value.method === "일반") &&
    typeof value.authenticatedAt === "string" &&
    typeof value.isNewUser === "boolean"
  );
}

function readJsonStorageValue(key: string): unknown {
  try {
    const storedValue = window.sessionStorage.getItem(key);
    return storedValue ? (JSON.parse(storedValue) as unknown) : null;
  } catch {
    return null;
  }
}

function readMockSession(): AuthSession | null {
  const value = readJsonStorageValue(MOCK_SESSION_STORAGE_KEY);
  return isMockAuthSession(value) ? value : null;
}

function readRefreshToken(): string | null {
  try {
    const refreshToken = window.sessionStorage.getItem(
      REFRESH_TOKEN_STORAGE_KEY,
    );
    return refreshToken && refreshToken.trim().length > 0 ? refreshToken : null;
  } catch {
    return null;
  }
}

function readBackendSessionMetadata(): BackendSessionMetadata | null {
  const value = readJsonStorageValue(BACKEND_SESSION_METADATA_STORAGE_KEY);
  return isBackendSessionMetadata(value) ? value : null;
}

function toBackendSessionMetadata(
  session: AuthSession,
): BackendSessionMetadata | null {
  /*
   * 실제 백엔드 로그인 수단만 통과시킨다. Mock 수단(PASS·생체인증)이 여기로 오면
   * 저장하지 않는다. 새 로그인 수단을 추가할 때 이 목록을 빠뜨리면, 서버는 가입에
   * 성공했는데 화면에는 실패로 보인다 — setBackendSession 이 예외를 던지기 때문이다.
   */
  if (
    !session.backend ||
    (session.method !== "카카오" &&
      session.method !== "PIN" &&
      session.method !== "일반")
  ) {
    return null;
  }

  return {
    userId: session.userId,
    displayName: session.displayName,
    method: session.method,
    authenticatedAt: session.authenticatedAt,
    isNewUser: session.backend.isNewUser,
  };
}

function clearStoredSession(): void {
  try {
    window.sessionStorage.removeItem(MOCK_SESSION_STORAGE_KEY);
    window.sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    window.sessionStorage.removeItem(BACKEND_SESSION_METADATA_STORAGE_KEY);
  } catch {
    // 저장소를 사용할 수 없어도 메모리 상태는 정리한다.
  }
}

function storeBackendSession(
  metadata: BackendSessionMetadata,
  refreshToken: string,
): void {
  try {
    window.sessionStorage.removeItem(MOCK_SESSION_STORAGE_KEY);
    window.sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
    window.sessionStorage.setItem(
      BACKEND_SESSION_METADATA_STORAGE_KEY,
      JSON.stringify(metadata),
    );
  } catch {
    // 저장소를 사용할 수 없어도 현재 탭의 메모리 세션은 유지한다.
  }
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  refreshToken: null,
  pendingBackendSession: null,
  hasHydrated: false,
  isRestoringSession: false,

  hydrateSession: () => {
    const mockSession = readMockSession();
    if (mockSession) {
      set({
        session: mockSession,
        refreshToken: null,
        pendingBackendSession: null,
        hasHydrated: true,
        isRestoringSession: false,
      });
      return;
    }

    const refreshToken = readRefreshToken();
    const pendingBackendSession = readBackendSessionMetadata();
    const canRestore = Boolean(refreshToken && pendingBackendSession);

    if (!canRestore) clearStoredSession();

    set({
      session: null,
      refreshToken: canRestore ? refreshToken : null,
      pendingBackendSession: canRestore ? pendingBackendSession : null,
      hasHydrated: true,
      isRestoringSession: canRestore,
    });
  },

  setSession: (session) => {
    clearStoredSession();
    try {
      window.sessionStorage.setItem(
        MOCK_SESSION_STORAGE_KEY,
        JSON.stringify(session),
      );
    } catch {
      // 저장소를 사용할 수 없어도 메모리의 Mock 세션은 유지한다.
    }
    set({
      session,
      refreshToken: null,
      pendingBackendSession: null,
      hasHydrated: true,
      isRestoringSession: false,
    });
  },

  setBackendSession: (session, refreshToken) => {
    const metadata = toBackendSessionMetadata(session);
    if (!metadata) {
      throw new Error("실제 인증 세션 메타데이터가 올바르지 않습니다.");
    }

    storeBackendSession(metadata, refreshToken);
    set({
      session,
      refreshToken,
      pendingBackendSession: metadata,
      hasHydrated: true,
      isRestoringSession: false,
    });
  },

  applyRefreshedTokens: (tokens) =>
    set((state) => {
      const metadata = state.session
        ? toBackendSessionMetadata(state.session)
        : state.pendingBackendSession;

      if (!metadata) {
        clearStoredSession();
        return {
          session: null,
          refreshToken: null,
          pendingBackendSession: null,
          hasHydrated: true,
          isRestoringSession: false,
        };
      }

      const session: AuthSession = {
        userId: metadata.userId,
        displayName: metadata.displayName,
        method: metadata.method,
        authenticatedAt: metadata.authenticatedAt,
        backend: {
          accessToken: tokens.accessToken,
          tokenType: tokens.tokenType,
          accessTokenExpiresIn: tokens.accessTokenExpiresIn,
          isNewUser: metadata.isNewUser,
        },
      };

      storeBackendSession(metadata, tokens.refreshToken);
      return {
        session,
        refreshToken: tokens.refreshToken,
        pendingBackendSession: metadata,
        hasHydrated: true,
        isRestoringSession: false,
      };
    }),

  completePinRegistration: () =>
    set((state) => {
      if (!state.session?.backend || !state.refreshToken) return state;

      const session: AuthSession = {
        ...state.session,
        backend: {
          ...state.session.backend,
          isNewUser: false,
        },
      };
      const metadata = toBackendSessionMetadata(session);
      if (!metadata) return state;

      storeBackendSession(metadata, state.refreshToken);
      return {
        ...state,
        session,
        pendingBackendSession: metadata,
      };
    }),

  clearSession: () => {
    clearStoredSession();
    set({
      session: null,
      refreshToken: null,
      pendingBackendSession: null,
      hasHydrated: true,
      isRestoringSession: false,
    });
  },
}));

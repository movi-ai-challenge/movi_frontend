import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import { useAuthStore } from "../src/store/useAuthStore.ts";
import type { AuthSession } from "../src/types/index.ts";

const REFRESH_TOKEN_STORAGE_KEY = "movi.auth-refresh-token";
const BACKEND_SESSION_METADATA_STORAGE_KEY = "movi.auth-session-metadata";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const sessionStorage = new MemoryStorage();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { sessionStorage },
});

function backendSession(
  accessToken: string,
  isNewUser = false,
): AuthSession {
  return {
    userId: "7",
    displayName: "카카오 사용자",
    method: "카카오",
    authenticatedAt: "2026-08-27T00:00:00.000Z",
    backend: {
      accessToken,
      tokenType: "Bearer",
      accessTokenExpiresIn: 1800,
      isNewUser,
    },
  };
}

function resetMemoryState(): void {
  useAuthStore.setState({
    session: null,
    refreshToken: null,
    pendingBackendSession: null,
    hasHydrated: false,
    isRestoringSession: false,
  });
}

beforeEach(() => {
  sessionStorage.clear();
  resetMemoryState();
});

test("Access token은 sessionStorage에 저장하지 않는다", () => {
  useAuthStore
    .getState()
    .setBackendSession(backendSession("access-secret"), "refresh-secret");

  assert.equal(
    sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY),
    "refresh-secret",
  );
  assert.doesNotMatch(
    sessionStorage.getItem(BACKEND_SESSION_METADATA_STORAGE_KEY) ?? "",
    /access-secret|refresh-secret/,
  );
});

test("새로고침 시 메타데이터와 Refresh token으로 복구 대기 상태가 된다", () => {
  useAuthStore
    .getState()
    .setBackendSession(backendSession("old-access"), "old-refresh");
  resetMemoryState();

  useAuthStore.getState().hydrateSession();

  assert.equal(useAuthStore.getState().session, null);
  assert.equal(useAuthStore.getState().refreshToken, "old-refresh");
  assert.equal(useAuthStore.getState().isRestoringSession, true);
});

test("refresh 응답으로 세션을 복구하고 회전된 Refresh token을 저장한다", () => {
  useAuthStore
    .getState()
    .setBackendSession(backendSession("old-access"), "old-refresh");
  resetMemoryState();
  useAuthStore.getState().hydrateSession();

  useAuthStore.getState().applyRefreshedTokens({
    accessToken: "new-access",
    refreshToken: "new-refresh",
    tokenType: "Bearer",
    accessTokenExpiresIn: 1800,
  });

  assert.equal(
    useAuthStore.getState().session?.backend?.accessToken,
    "new-access",
  );
  assert.equal(useAuthStore.getState().isRestoringSession, false);
  assert.equal(
    sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY),
    "new-refresh",
  );
});

test("불완전한 영속 상태는 복구하지 않고 제거한다", () => {
  sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, "orphan-refresh");

  useAuthStore.getState().hydrateSession();

  assert.equal(useAuthStore.getState().refreshToken, null);
  assert.equal(useAuthStore.getState().isRestoringSession, false);
  assert.equal(sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY), null);
});

test("PIN 등록 완료 상태를 메모리와 복구 메타데이터에 함께 반영한다", () => {
  useAuthStore
    .getState()
    .setBackendSession(backendSession("access", true), "refresh");

  useAuthStore.getState().completePinRegistration();

  assert.equal(useAuthStore.getState().session?.backend?.isNewUser, false);
  assert.doesNotMatch(
    sessionStorage.getItem(BACKEND_SESSION_METADATA_STORAGE_KEY) ?? "",
    /"isNewUser":true/,
  );
});

test("일반 로그인 세션도 백엔드 세션으로 저장한다", () => {
  // 서버는 가입에 성공했는데 화면에는 실패로 보이던 결함을 막는다.
  // 저장 가능한 수단 목록에서 빠지면 setBackendSession 이 예외를 던진다.
  const session: AuthSession = {
    userId: "18",
    displayName: "아이디로 로그인한 사용자",
    method: "일반",
    authenticatedAt: "2026-09-01T00:00:00.000Z",
    backend: {
      accessToken: "access-secret",
      tokenType: "Bearer",
      accessTokenExpiresIn: 1800,
      isNewUser: true,
    },
  };

  assert.doesNotThrow(() => {
    useAuthStore.getState().setBackendSession(session, "refresh-secret");
  });

  const stored = JSON.parse(
    sessionStorage.getItem(BACKEND_SESSION_METADATA_STORAGE_KEY) ?? "null",
  );
  assert.equal(stored.method, "일반");
  assert.equal(stored.userId, "18");
  assert.equal(useAuthStore.getState().session?.method, "일반");
});

test("저장된 일반 로그인 메타데이터를 복원한다", () => {
  sessionStorage.setItem(
    BACKEND_SESSION_METADATA_STORAGE_KEY,
    JSON.stringify({
      userId: "18",
      displayName: "아이디로 로그인한 사용자",
      method: "일반",
      authenticatedAt: "2026-09-01T00:00:00.000Z",
      isNewUser: false,
    }),
  );
  sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, "refresh-secret");

  useAuthStore.getState().hydrateSession();

  assert.equal(
    useAuthStore.getState().pendingBackendSession?.method,
    "일반",
  );
});

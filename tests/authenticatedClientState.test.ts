import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import {
  clearAuthenticatedClientStateOnError,
  runWithAuthenticatedClientCleanup,
} from "../src/services/authenticatedClientState.ts";
import {
  readTransferRecoveryKey,
  saveTransferRecoveryKey,
} from "../src/services/transferRecoveryStorage.ts";
import { useAuthStore } from "../src/store/useAuthStore.ts";
import { useBankStore } from "../src/store/useBankStore.ts";
import type { Account, AuthSession, TransferDraft } from "../src/types/index.ts";

const MOCK_SESSION_STORAGE_KEY = "movi.mock-auth-session";
const REFRESH_TOKEN_STORAGE_KEY = "movi.auth-refresh-token";
const BACKEND_SESSION_METADATA_STORAGE_KEY = "movi.auth-session-metadata";
const TRANSFER_RECOVERY_STORAGE_KEY = "movi.transfer.recovery.v1";
const IDEMPOTENCY_KEY = "550e8400-e29b-41d4-a716-446655440000";

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

const account: Account = {
  id: "account-1",
  bankName: "모비은행",
  accountName: "생활비",
  accountAlias: "생활비",
  maskedAccountNumber: "123-****-7890",
  accountType: "DEPOSIT",
  isPrimary: true,
};

const transferDraft: TransferDraft = {
  sourceAccountId: account.id,
  recipientId: "recipient-1",
  recipientName: "김모비",
  recipientBankName: "함께은행",
  recipientMaskedAccountNumber: "456-****-1234",
  amount: 10_000,
};

function backendSession(): AuthSession {
  return {
    userId: "7",
    displayName: "카카오 사용자",
    method: "카카오",
    authenticatedAt: "2026-08-27T00:00:00.000Z",
    backend: {
      accessToken: "access-secret",
      tokenType: "Bearer",
      accessTokenExpiresIn: 1800,
      isNewUser: false,
    },
  };
}

function seedAuthenticatedClientState(): void {
  useAuthStore
    .getState()
    .setBackendSession(backendSession(), "refresh-secret");
  useBankStore.getState().setUser({ id: "7", name: "사용자" });
  useBankStore.getState().setAccounts([account]);
  useBankStore.getState().setVoiceState({
    status: "speaking",
    transcript: "송금 확인",
    errorMessage: null,
  });
  useBankStore.getState().setTransferDraft(transferDraft);
  saveTransferRecoveryKey(IDEMPOTENCY_KEY);
}

function assertAuthenticatedClientStateIsCleared(): void {
  const authState = useAuthStore.getState();
  assert.equal(authState.session, null);
  assert.equal(authState.refreshToken, null);
  assert.equal(authState.pendingBackendSession, null);
  assert.equal(authState.isRestoringSession, false);

  const bankState = useBankStore.getState();
  assert.equal(bankState.user, null);
  assert.deepEqual(bankState.accounts, []);
  assert.equal(bankState.selectedAccountId, null);
  assert.equal(bankState.defaultAccountId, null);
  assert.deepEqual(bankState.voice, {
    status: "idle",
    transcript: "",
    errorMessage: null,
  });
  assert.equal(bankState.transferDraft, null);

  assert.equal(readTransferRecoveryKey(), null);
  for (const key of [
    MOCK_SESSION_STORAGE_KEY,
    REFRESH_TOKEN_STORAGE_KEY,
    BACKEND_SESSION_METADATA_STORAGE_KEY,
    TRANSFER_RECOVERY_STORAGE_KEY,
  ]) {
    assert.equal(sessionStorage.getItem(key), null);
  }
}

beforeEach(() => {
  sessionStorage.clear();
  useAuthStore.getState().clearSession();
  useBankStore.getState().resetBankState();
});

test("로그아웃 성공 후 인증·금융·송금 복구 상태를 모두 정리한다", async () => {
  seedAuthenticatedClientState();

  await runWithAuthenticatedClientCleanup(async () => undefined);

  assertAuthenticatedClientStateIsCleared();
});

test("로그아웃 요청 실패 후에도 로컬 상태를 모두 정리한다", async () => {
  seedAuthenticatedClientState();
  const logoutError = new Error("logout failed");

  await assert.rejects(
    runWithAuthenticatedClientCleanup(async () => {
      throw logoutError;
    }),
    (error: unknown) => error === logoutError,
  );

  assertAuthenticatedClientStateIsCleared();
});

test("refresh 실패 시 인증·금융·송금 복구 상태를 모두 정리한다", async () => {
  seedAuthenticatedClientState();
  const refreshError = new Error("refresh failed");

  await assert.rejects(
    clearAuthenticatedClientStateOnError(async () => {
      throw refreshError;
    }),
    (error: unknown) => error === refreshError,
  );

  assertAuthenticatedClientStateIsCleared();
});

test("refresh 성공 시 현재 인증·금융·송금 복구 상태를 유지한다", async () => {
  seedAuthenticatedClientState();

  assert.equal(
    await clearAuthenticatedClientStateOnError(async () => "new-access-token"),
    "new-access-token",
  );

  assert.equal(useAuthStore.getState().refreshToken, "refresh-secret");
  assert.equal(useBankStore.getState().accounts.length, 1);
  assert.equal(readTransferRecoveryKey(), IDEMPOTENCY_KEY);
});

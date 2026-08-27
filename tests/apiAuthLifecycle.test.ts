import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import axios, {
  AxiosError,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

import { saveTransferRecoveryKey } from "../src/services/transferRecoveryStorage.ts";
import { useAuthStore } from "../src/store/useAuthStore.ts";
import { useBankStore } from "../src/store/useBankStore.ts";
import type { AuthSession } from "../src/types/index.ts";

const REFRESH_PATH = "/api/v1/auth/token/refresh";
const REFRESH_TOKEN_STORAGE_KEY = "movi.auth-refresh-token";
const TRANSFER_RECOVERY_STORAGE_KEY = "movi.transfer.recovery.v1";
const RECOVERY_KEY = "550e8400-e29b-41d4-a716-446655440000";

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

type RequestHandler = (
  config: InternalAxiosRequestConfig,
) => Promise<AxiosResponse>;

const sessionStorage = new MemoryStorage();
let requestHandler: RequestHandler = async (config) =>
  createResponse(config, 200, null);

const adapter: AxiosAdapter = async (config) => requestHandler(config);
axios.defaults.adapter = adapter;

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { sessionStorage },
});

const { api, clearAuthenticatedClientState } = await import(
  "../src/services/api.ts"
);

function createResponse(
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown,
): AxiosResponse {
  return {
    config,
    data,
    headers: {},
    status,
    statusText: String(status),
  };
}

function rejectWithStatus(
  config: InternalAxiosRequestConfig,
  status: number,
): Promise<never> {
  const response = createResponse(config, status, {
    code: status === 401 ? "AUTH_4010" : "ERROR",
    message: "request failed",
    voiceMessage: null,
    data: null,
  });
  return Promise.reject(
    new AxiosError(
      `Request failed with status code ${status}`,
      AxiosError.ERR_BAD_REQUEST,
      config,
      undefined,
      response,
    ),
  );
}

function backendSession(accessToken: string): AuthSession {
  return {
    userId: "7",
    displayName: "카카오 사용자",
    method: "카카오",
    authenticatedAt: "2026-08-27T00:00:00.000Z",
    backend: {
      accessToken,
      tokenType: "Bearer",
      accessTokenExpiresIn: 1800,
      isNewUser: false,
    },
  };
}

function seedAuthenticatedClientState(): void {
  useAuthStore
    .getState()
    .setBackendSession(backendSession("old-access"), "old-refresh");
  useBankStore.getState().setUser({ id: "7", name: "사용자" });
  useBankStore.getState().setAccounts([
    {
      id: "account-1",
      bankName: "모비은행",
      accountName: "생활비",
      accountAlias: null,
      maskedAccountNumber: "123-****-7890",
      accountType: "DEPOSIT",
      isPrimary: true,
    },
  ]);
  useBankStore.getState().setTransferDraft({
    sourceAccountId: "account-1",
    recipientId: "recipient-1",
    recipientName: "김모비",
    recipientBankName: "모비은행",
    recipientMaskedAccountNumber: "456-****-1234",
    amount: 50_000,
  });
  saveTransferRecoveryKey(RECOVERY_KEY);
}

beforeEach(() => {
  sessionStorage.clear();
  useAuthStore.getState().clearSession();
  useBankStore.getState().resetBankState();
  requestHandler = async (config) => createResponse(config, 200, null);
});

test("동시에 발생한 401 요청은 refresh 한 번을 공유하고 새 토큰으로 재시도한다", async () => {
  seedAuthenticatedClientState();
  let refreshCount = 0;
  const retriedAuthorizations: string[] = [];

  requestHandler = async (config) => {
    if (config.url === REFRESH_PATH) {
      refreshCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return createResponse(config, 200, {
        code: "SUCCESS",
        message: "success",
        voiceMessage: null,
        data: {
          accessToken: "new-access",
          refreshToken: "new-refresh",
          tokenType: "Bearer",
          accessTokenExpiresIn: 1800,
        },
      });
    }

    const authorization = config.headers.get("Authorization");
    if (authorization === "Bearer old-access") {
      return rejectWithStatus(config, 401);
    }

    retriedAuthorizations.push(String(authorization));
    return createResponse(config, 200, { ok: true });
  };

  const responses = await Promise.all([
    api.get("/api/accounts"),
    api.get("/api/transactions"),
  ]);

  assert.equal(refreshCount, 1);
  assert.equal(responses.length, 2);
  assert.deepEqual(retriedAuthorizations, [
    "Bearer new-access",
    "Bearer new-access",
  ]);
  assert.equal(
    useAuthStore.getState().session?.backend?.accessToken,
    "new-access",
  );
  assert.equal(
    sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY),
    "new-refresh",
  );
});

test("refresh 실패 시 인증·금융·송금 복구 상태를 모두 제거한다", async () => {
  seedAuthenticatedClientState();

  requestHandler = async (config) => {
    if (config.url === REFRESH_PATH) return rejectWithStatus(config, 401);
    return rejectWithStatus(config, 401);
  };

  await assert.rejects(() => api.get("/api/accounts"));

  assert.equal(useAuthStore.getState().session, null);
  assert.equal(useAuthStore.getState().refreshToken, null);
  assert.equal(useBankStore.getState().user, null);
  assert.deepEqual(useBankStore.getState().accounts, []);
  assert.equal(useBankStore.getState().transferDraft, null);
  assert.equal(sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY), null);
  assert.equal(sessionStorage.getItem(TRANSFER_RECOVERY_STORAGE_KEY), null);
});

test("로그아웃 공통 정리는 인증·금융·송금 복구 상태를 함께 제거한다", () => {
  seedAuthenticatedClientState();

  clearAuthenticatedClientState();

  assert.equal(useAuthStore.getState().session, null);
  assert.equal(useAuthStore.getState().refreshToken, null);
  assert.equal(useBankStore.getState().user, null);
  assert.deepEqual(useBankStore.getState().accounts, []);
  assert.equal(useBankStore.getState().transferDraft, null);
  assert.equal(sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY), null);
  assert.equal(sessionStorage.getItem(TRANSFER_RECOVERY_STORAGE_KEY), null);
});

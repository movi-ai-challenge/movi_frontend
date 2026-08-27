import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import {
  clearTransferRecoveryKey,
  isValidIdempotencyKey,
  readTransferRecoveryKey,
  saveTransferRecoveryKey,
} from "../src/services/transferRecoveryStorage.ts";

const TRANSFER_RECOVERY_STORAGE_KEY = "movi.transfer.recovery.v1";
const VALID_IDEMPOTENCY_KEY = "550e8400-e29b-41d4-a716-446655440000";

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

class InaccessibleStorage implements Storage {
  get length(): number {
    throw new Error("storage unavailable");
  }

  clear(): void {
    throw new Error("storage unavailable");
  }

  getItem(): string | null {
    throw new Error("storage unavailable");
  }

  key(): string | null {
    throw new Error("storage unavailable");
  }

  removeItem(): void {
    throw new Error("storage unavailable");
  }

  setItem(): void {
    throw new Error("storage unavailable");
  }
}

const memoryStorage = new MemoryStorage();

function setSessionStorage(sessionStorage: Storage): void {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { sessionStorage },
  });
}

beforeEach(() => {
  memoryStorage.clear();
  setSessionStorage(memoryStorage);
});

test("UUID 형식의 멱등성 키만 허용한다", () => {
  assert.equal(isValidIdempotencyKey(VALID_IDEMPOTENCY_KEY), true);
  assert.equal(isValidIdempotencyKey("not-a-uuid"), false);
  assert.equal(isValidIdempotencyKey("550e8400-e29b-01d4-a716-446655440000"), false);
  assert.equal(isValidIdempotencyKey(null), false);
});

test("유효한 키를 저장하고 같은 키로 복구한다", () => {
  saveTransferRecoveryKey(VALID_IDEMPOTENCY_KEY);

  assert.equal(readTransferRecoveryKey(), VALID_IDEMPOTENCY_KEY);
  assert.match(
    memoryStorage.getItem(TRANSFER_RECOVERY_STORAGE_KEY) ?? "",
    /"storedAt":"[^"]+"/,
  );
});

test("잘못된 키는 저장하지 않고 송금 진행을 막을 수 있도록 예외를 발생시킨다", () => {
  assert.throws(
    () => saveTransferRecoveryKey("invalid-idempotency-key"),
    /유효하지 않은 송금 멱등성 키/,
  );
  assert.equal(memoryStorage.getItem(TRANSFER_RECOVERY_STORAGE_KEY), null);
});

test("손상되거나 유효하지 않은 저장값은 복구하지 않고 제거한다", () => {
  const invalidValues = [
    "{broken-json",
    JSON.stringify({
      idempotencyKey: "invalid-idempotency-key",
      storedAt: "2026-08-27T00:00:00.000Z",
    }),
    JSON.stringify({
      idempotencyKey: VALID_IDEMPOTENCY_KEY,
      storedAt: "not-a-date",
    }),
  ];

  for (const value of invalidValues) {
    memoryStorage.setItem(TRANSFER_RECOVERY_STORAGE_KEY, value);

    assert.equal(readTransferRecoveryKey(), null);
    assert.equal(memoryStorage.getItem(TRANSFER_RECOVERY_STORAGE_KEY), null);
  }
});

test("저장소를 읽거나 지울 수 없어도 복구와 로그아웃 정리는 중단되지 않는다", () => {
  setSessionStorage(new InaccessibleStorage());

  assert.equal(readTransferRecoveryKey(), null);
  assert.doesNotThrow(() => clearTransferRecoveryKey());
});

test("복구 키를 저장할 수 없으면 예외를 전달해 송금을 fail-closed 처리한다", () => {
  setSessionStorage(new InaccessibleStorage());

  assert.throws(
    () => saveTransferRecoveryKey(VALID_IDEMPOTENCY_KEY),
    /storage unavailable/,
  );
});

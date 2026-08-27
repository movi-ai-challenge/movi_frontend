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

class UnavailableStorage implements Storage {
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

test("유효한 UUID 송금 복구 키를 저장하고 다시 읽는다", () => {
  saveTransferRecoveryKey(VALID_IDEMPOTENCY_KEY);

  assert.equal(readTransferRecoveryKey(), VALID_IDEMPOTENCY_KEY);
  assert.match(
    memoryStorage.getItem(TRANSFER_RECOVERY_STORAGE_KEY) ?? "",
    /"storedAt":"\d{4}-\d{2}-\d{2}T/,
  );
});

test("UUID가 아닌 송금 복구 키는 저장하지 않는다", () => {
  assert.equal(isValidIdempotencyKey("not-a-uuid"), false);
  assert.throws(
    () => saveTransferRecoveryKey("not-a-uuid"),
    /유효하지 않은 송금 멱등성 키/,
  );
  assert.equal(memoryStorage.getItem(TRANSFER_RECOVERY_STORAGE_KEY), null);
});

test("손상되거나 계약과 다른 저장값은 제거하고 복구하지 않는다", () => {
  for (const storedValue of [
    "{broken-json",
    JSON.stringify({
      idempotencyKey: "not-a-uuid",
      storedAt: "2026-08-27T00:00:00.000Z",
    }),
    JSON.stringify({
      idempotencyKey: VALID_IDEMPOTENCY_KEY,
      storedAt: "invalid-date",
    }),
  ]) {
    memoryStorage.setItem(TRANSFER_RECOVERY_STORAGE_KEY, storedValue);

    assert.equal(readTransferRecoveryKey(), null);
    assert.equal(memoryStorage.getItem(TRANSFER_RECOVERY_STORAGE_KEY), null);
  }
});

test("저장소 접근이 제한되면 복구와 정리는 안전하게 실패한다", () => {
  setSessionStorage(new UnavailableStorage());

  assert.equal(readTransferRecoveryKey(), null);
  assert.doesNotThrow(() => clearTransferRecoveryKey());
  assert.throws(
    () => saveTransferRecoveryKey(VALID_IDEMPOTENCY_KEY),
    /storage unavailable/,
  );
});

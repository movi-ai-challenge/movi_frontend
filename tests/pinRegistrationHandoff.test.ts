import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import {
  PIN_REGISTRATION_PHONE_STORAGE_KEY,
  clearPinRegistrationPhoneNumber,
  readPinRegistrationPhoneNumber,
  savePinRegistrationPhoneNumber,
} from "../src/services/pinRegistrationHandoff.ts";

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

let sessionStorageStub: Storage;

function setSessionStorage(storage: Storage): void {
  sessionStorageStub = storage;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { sessionStorage: storage },
  });
}

beforeEach(() => {
  setSessionStorage(new MemoryStorage());
});

test("가입 화면에서 넘긴 번호를 정규화해 저장하고 그대로 돌려준다", () => {
  savePinRegistrationPhoneNumber("010-1234-5678");

  assert.equal(
    sessionStorageStub.getItem(PIN_REGISTRATION_PHONE_STORAGE_KEY),
    "01012345678",
  );
  assert.equal(readPinRegistrationPhoneNumber(), "01012345678");
});

test("휴대전화 번호가 아니면 넘기지 않는다", () => {
  savePinRegistrationPhoneNumber("02-1234-5678");

  assert.equal(
    sessionStorageStub.getItem(PIN_REGISTRATION_PHONE_STORAGE_KEY),
    null,
  );
  assert.equal(readPinRegistrationPhoneNumber(), null);
});

test("넘겨받은 값이 깨져 있으면 채워 넣지 않고 지운다", () => {
  sessionStorageStub.setItem(PIN_REGISTRATION_PHONE_STORAGE_KEY, "잘못된값");

  assert.equal(readPinRegistrationPhoneNumber(), null);
  assert.equal(
    sessionStorageStub.getItem(PIN_REGISTRATION_PHONE_STORAGE_KEY),
    null,
  );
});

test("한 번 읽고 지우면 다음 방문에는 남지 않는다", () => {
  savePinRegistrationPhoneNumber("01012345678");
  clearPinRegistrationPhoneNumber();

  assert.equal(readPinRegistrationPhoneNumber(), null);
});

test("저장소를 쓸 수 없어도 예외 없이 비어 있는 것으로 다룬다", () => {
  setSessionStorage(new UnavailableStorage());

  assert.doesNotThrow(() => savePinRegistrationPhoneNumber("01012345678"));
  assert.doesNotThrow(() => clearPinRegistrationPhoneNumber());
  assert.equal(readPinRegistrationPhoneNumber(), null);
});

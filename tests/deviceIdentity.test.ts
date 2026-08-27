import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import {
  DEVICE_UUID_STORAGE_KEY,
  readDeviceUuid,
} from "../src/services/deviceIdentity.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

let localStorageStub: Storage;

function setLocalStorage(storage: Storage): void {
  localStorageStub = storage;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: storage,
      crypto: globalThis.crypto,
    },
  });
}

beforeEach(() => {
  setLocalStorage(new MemoryStorage());
});

test("처음 호출하면 UUID를 만들어 저장한다", () => {
  const uuid = readDeviceUuid();

  assert.match(uuid ?? "", UUID_PATTERN);
  assert.equal(localStorageStub.getItem(DEVICE_UUID_STORAGE_KEY), uuid);
});

test("다시 호출해도 같은 기기 식별자를 돌려준다", () => {
  const first = readDeviceUuid();
  const second = readDeviceUuid();

  assert.equal(first, second);
});

test("저장된 값이 UUID 형식이 아니면 새로 만든다", () => {
  localStorageStub.setItem(DEVICE_UUID_STORAGE_KEY, "not-a-uuid");

  const uuid = readDeviceUuid();

  assert.match(uuid ?? "", UUID_PATTERN);
  assert.notEqual(uuid, "not-a-uuid");
});

test("기기 식별자는 sessionStorage가 아니라 localStorage에 둔다", () => {
  // 로그아웃은 sessionStorage 만 비운다. 기기는 계정이 아니라 단말에 묶인 정보라,
  // 로그아웃마다 지우면 로그인할 때마다 처음 보는 기기가 되어 FDS 신뢰 기기 피처가
  // 영원히 false 가 된다.
  const uuid = readDeviceUuid();

  assert.equal(localStorageStub.getItem(DEVICE_UUID_STORAGE_KEY), uuid);
});

test("저장소를 쓸 수 없으면 기기 정보 없이 진행한다", () => {
  // 신뢰 정보가 없다는 것은 FDS 에서 위험 쪽으로 기울 뿐이고, 로그인이나 송금을
  // 막을 이유는 아니다.
  setLocalStorage(new UnavailableStorage());

  assert.doesNotThrow(() => readDeviceUuid());
  assert.equal(readDeviceUuid(), null);
});

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import {
  ACCESSIBILITY_PREFERENCES_STORAGE_KEY,
  useAccessibilityStore,
} from "../src/store/useAccessibilityStore.ts";

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
    value: { localStorage: storage },
  });
}

function resetMemoryState(): void {
  useAccessibilityStore.setState({
    highContrast: false,
    largeText: false,
    simpleMode: false,
  });
}

beforeEach(() => {
  setLocalStorage(new MemoryStorage());
  resetMemoryState();
});

test("보기 설정을 기기 localStorage에 함께 저장한다", () => {
  useAccessibilityStore.getState().setHighContrast(true);
  useAccessibilityStore.getState().setLargeText(true);
  useAccessibilityStore.getState().setSimpleMode(true);

  assert.deepEqual(
    JSON.parse(
      localStorageStub.getItem(ACCESSIBILITY_PREFERENCES_STORAGE_KEY) ?? "",
    ),
    {
      highContrast: true,
      largeText: true,
      simpleMode: true,
    },
  );
});

test("새로고침 후 저장된 보기 설정을 복원한다", () => {
  localStorageStub.setItem(
    ACCESSIBILITY_PREFERENCES_STORAGE_KEY,
    JSON.stringify({
      highContrast: true,
      largeText: false,
      simpleMode: true,
    }),
  );

  useAccessibilityStore.getState().hydrateAccessibilityPreferences();

  assert.equal(useAccessibilityStore.getState().highContrast, true);
  assert.equal(useAccessibilityStore.getState().largeText, false);
  assert.equal(useAccessibilityStore.getState().simpleMode, true);
});

test("손상되거나 계약과 다른 저장값은 제거하고 복원하지 않는다", () => {
  localStorageStub.setItem(
    ACCESSIBILITY_PREFERENCES_STORAGE_KEY,
    JSON.stringify({
      highContrast: true,
      largeText: true,
      simpleMode: true,
      token: "should-not-be-read",
    }),
  );

  useAccessibilityStore.getState().hydrateAccessibilityPreferences();

  assert.equal(useAccessibilityStore.getState().highContrast, false);
  assert.equal(
    localStorageStub.getItem(ACCESSIBILITY_PREFERENCES_STORAGE_KEY),
    null,
  );

  localStorageStub.setItem(ACCESSIBILITY_PREFERENCES_STORAGE_KEY, "{broken");

  useAccessibilityStore.getState().hydrateAccessibilityPreferences();

  assert.equal(
    localStorageStub.getItem(ACCESSIBILITY_PREFERENCES_STORAGE_KEY),
    null,
  );
});

test("초기화하면 메모리와 저장된 보기 설정을 함께 지운다", () => {
  useAccessibilityStore.getState().setHighContrast(true);

  useAccessibilityStore.getState().resetAccessibilityPreferences();

  assert.equal(useAccessibilityStore.getState().highContrast, false);
  assert.equal(useAccessibilityStore.getState().largeText, false);
  assert.equal(useAccessibilityStore.getState().simpleMode, false);
  assert.equal(
    localStorageStub.getItem(ACCESSIBILITY_PREFERENCES_STORAGE_KEY),
    null,
  );
});

test("저장소를 사용할 수 없어도 현재 탭 설정은 동작한다", () => {
  setLocalStorage(new UnavailableStorage());

  assert.doesNotThrow(() =>
    useAccessibilityStore.getState().setLargeText(true),
  );
  assert.equal(useAccessibilityStore.getState().largeText, true);
  assert.doesNotThrow(() =>
    useAccessibilityStore.getState().hydrateAccessibilityPreferences(),
  );
});

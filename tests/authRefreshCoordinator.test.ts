import assert from "node:assert/strict";
import test from "node:test";

import { createAuthRefreshCoordinator } from "../src/services/authRefreshCoordinator.ts";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolvePromise: ((value: T) => void) | null = null;
  let rejectPromise: ((reason: Error) => void) | null = null;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return {
    promise,
    resolve: (value) => resolvePromise?.(value),
    reject: (reason) => rejectPromise?.(reason),
  };
}

test("동시에 들어온 refresh 요청은 하나의 실행 결과를 공유한다", async () => {
  const deferred = createDeferred<string>();
  let refreshCallCount = 0;
  const refresh = createAuthRefreshCoordinator(() => {
    refreshCallCount += 1;
    return deferred.promise;
  });

  const first = refresh();
  const second = refresh();
  const third = refresh();
  await Promise.resolve();

  assert.equal(refreshCallCount, 1);
  assert.equal(first, second);
  assert.equal(second, third);

  deferred.resolve("shared-access-token");
  assert.deepEqual(await Promise.all([first, second, third]), [
    "shared-access-token",
    "shared-access-token",
    "shared-access-token",
  ]);
});

test("refresh 성공이 끝나면 다음 만료에서 새 요청을 실행한다", async () => {
  let refreshCallCount = 0;
  const refresh = createAuthRefreshCoordinator(async () => {
    refreshCallCount += 1;
    return `access-token-${refreshCallCount}`;
  });

  assert.equal(await refresh(), "access-token-1");
  assert.equal(await refresh(), "access-token-2");
  assert.equal(refreshCallCount, 2);
});

test("공유 refresh가 실패해도 잠금을 해제해 다음 요청을 허용한다", async () => {
  const deferred = createDeferred<string>();
  let refreshCallCount = 0;
  const refresh = createAuthRefreshCoordinator(() => {
    refreshCallCount += 1;
    if (refreshCallCount === 1) return deferred.promise;
    return Promise.resolve("recovered-access-token");
  });

  const first = refresh();
  const second = refresh();
  await Promise.resolve();
  deferred.reject(new Error("refresh rejected"));

  const failedResults = await Promise.allSettled([first, second]);
  assert.equal(refreshCallCount, 1);
  assert.deepEqual(
    failedResults.map((result) => result.status),
    ["rejected", "rejected"],
  );
  assert.equal(await refresh(), "recovered-access-token");
  assert.equal(refreshCallCount, 2);
});

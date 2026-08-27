import assert from "node:assert/strict";
import test from "node:test";

import { validateTransferDraftInput } from "../src/services/transferDraftValidation.ts";

test("받는 사람을 정리하고 양의 원 단위 금액을 검증한다", () => {
  assert.deepEqual(validateTransferDraftInput("  김영희  ", "50000"), {
    valid: true,
    recipientName: "김영희",
    amount: 50_000,
  });
});

test("빈 수취인과 소수·지수·안전 범위 밖 금액을 거부한다", () => {
  assert.equal(validateTransferDraftInput("  ", "50000").valid, false);
  assert.equal(validateTransferDraftInput("김영희", "1.5").valid, false);
  assert.equal(validateTransferDraftInput("김영희", "1e5").valid, false);
  assert.equal(
    validateTransferDraftInput("김영희", "9007199254740992").valid,
    false,
  );
});

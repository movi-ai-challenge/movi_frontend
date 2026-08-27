import assert from "node:assert/strict";
import test from "node:test";

import {
  isTransferStatusResponseData,
  mapTransferStatusResponse,
} from "../src/services/transferContract.ts";
import type { TransferStatusResponseData } from "../src/services/transferContract.ts";

const completed: TransferStatusResponseData = {
  transferId: 91,
  status: "COMPLETED",
  riskLevel: "MEDIUM",
  amount: 50_000,
  recipientName: "김영희",
  requestedAt: "2026-08-27T12:00:00",
  completedAt: "2026-08-27T12:00:02",
};

test("실제 송금 상태와 FDS 결과를 화면 모델로 매핑한다", () => {
  assert.equal(isTransferStatusResponseData(completed), true);
  if (!isTransferStatusResponseData(completed)) assert.fail("유효한 fixture");
  assert.deepEqual(
    mapTransferStatusResponse(completed, "김영희 님에게 5만원을 보냈습니다."),
    {
      ...completed,
      transferId: "91",
      voiceMessage: "김영희 님에게 5만원을 보냈습니다.",
    },
  );
});

test("고위험 완료와 저위험 차단처럼 모순된 FDS 결과를 거부한다", () => {
  assert.equal(
    isTransferStatusResponseData({ ...completed, riskLevel: "HIGH" }),
    false,
  );
  assert.equal(
    isTransferStatusResponseData({
      ...completed,
      status: "BLOCKED",
      riskLevel: "LOW",
    }),
    false,
  );
});

test("완료 시각이 없거나 음성 안내가 없는 완료 응답을 거부한다", () => {
  assert.equal(
    isTransferStatusResponseData({ ...completed, completedAt: null }),
    false,
  );
  assert.throws(() => mapTransferStatusResponse(completed, null));
});

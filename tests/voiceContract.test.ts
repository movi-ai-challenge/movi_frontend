import assert from "node:assert/strict";
import test from "node:test";

import {
  isVoiceCommandResponseData,
  isVoiceSessionStartData,
  mapVoiceCommandResponse,
  mapVoiceSessionStart,
} from "../src/services/voiceContract.ts";
import type {
  VoiceCommandResponseData,
  VoiceSessionStartData,
} from "../src/services/voiceContract.ts";

const session: VoiceSessionStartData = {
  voiceSessionId: 15,
  status: "ACTIVE",
  expiresAt: "2026-08-27T12:05:00",
};

const awaitingConfirmation: VoiceCommandResponseData = {
  voiceSessionId: 15,
  state: "AWAITING_CONFIRMATION",
  intent: "TRANSFER",
  missingSlots: [],
  confirmationId: "confirm-123",
  fromAccount: { accountId: 11, alias: "생활비", bankName: "모비은행" },
  recipient: { recipientId: 3, holderName: "김영희", bankCode: "090" },
  amount: 50_000,
  expiresAt: "2026-08-27T12:01:00",
  transferId: null,
  status: null,
  riskLevel: null,
  completedAt: null,
  history: null,
  balance: null,
};

test("음성 세션 시작 응답과 서버 음성 문구를 매핑한다", () => {
  assert.equal(isVoiceSessionStartData(session), true);
  if (!isVoiceSessionStartData(session)) assert.fail("유효한 세션 fixture");
  assert.deepEqual(mapVoiceSessionStart(session, "무엇을 도와드릴까요?"), {
    voiceSessionId: "15",
    state: "ACTIVE",
    expiresAt: "2026-08-27T12:05:00",
    voiceMessage: "무엇을 도와드릴까요?",
  });
});

test("송금 확인 대기 응답은 검토에 필요한 필드를 모두 요구한다", () => {
  assert.equal(isVoiceCommandResponseData(awaitingConfirmation), true);
  assert.equal(
    isVoiceCommandResponseData({
      ...awaitingConfirmation,
      confirmationId: null,
    }),
    false,
  );
  assert.equal(
    isVoiceCommandResponseData({ ...awaitingConfirmation, amount: null }),
    false,
  );
});

test("확인 대기 응답과 voiceMessage를 화면 모델로 매핑한다", () => {
  if (!isVoiceCommandResponseData(awaitingConfirmation)) {
    assert.fail("유효한 확인 대기 fixture");
  }
  const result = mapVoiceCommandResponse(
    awaitingConfirmation,
    "생활비에서 김영희 님에게 5만원을 보낼까요?",
  );
  assert.equal(result.voiceSessionId, "15");
  assert.equal(result.fromAccount?.accountId, "11");
  assert.equal(result.recipient?.recipientId, "3");
  assert.equal(result.state, "AWAITING_CONFIRMATION");
});

test("예약 intent와 음성 문구 없는 응답을 거부한다", () => {
  assert.equal(
    isVoiceCommandResponseData({ ...awaitingConfirmation, intent: "SETTING" }),
    false,
  );
  assert.throws(() => mapVoiceCommandResponse(awaitingConfirmation, null));
});

test("FDS 근거를 화면 모델로 옮긴다 - 낭독은 지나가지만 화면에는 남아야 한다", () => {
  if (!isVoiceCommandResponseData(awaitingConfirmation)) {
    assert.fail("유효한 확인 대기 fixture");
  }
  const result = mapVoiceCommandResponse(
    { ...awaitingConfirmation, riskReasons: ["처음 보내는 계좌예요", "다른 은행으로 보내요"] },
    "보낼까요?",
  );
  assert.deepEqual(result.riskReasons, ["처음 보내는 계좌예요", "다른 은행으로 보내요"]);
});

test("근거가 없는 응답도 빈 배열로 만든다 - 화면이 length 를 그대로 본다", () => {
  if (!isVoiceCommandResponseData(awaitingConfirmation)) {
    assert.fail("유효한 확인 대기 fixture");
  }
  assert.deepEqual(
    mapVoiceCommandResponse({ ...awaitingConfirmation, riskReasons: null }, "보낼까요?")
      .riskReasons,
    [],
  );
  // 필드 자체가 없는 옛 응답도 같은 결과여야 한다.
  const withoutReasons = { ...awaitingConfirmation };
  delete (withoutReasons as { riskReasons?: unknown }).riskReasons;
  assert.deepEqual(
    mapVoiceCommandResponse(withoutReasons, "보낼까요?").riskReasons,
    [],
  );
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  canRetryConfirmation,
  selectVoiceErrorRecoveryAction,
  selectVoiceStreamErrorMessage,
} from "../src/services/voiceErrorRecovery.ts";

test("서버 재질문 한도 초과 코드는 직접 입력으로 전환한다", () => {
  assert.equal(
    selectVoiceErrorRecoveryAction("VOICE_4006"),
    "direct_input",
  );
});

test("만료된 세션은 새 세션으로 시작하고 일반 오류는 현재 세션을 유지한다", () => {
  assert.equal(
    selectVoiceErrorRecoveryAction("VOICE_4005"),
    "restart_session",
  );
  assert.equal(
    selectVoiceErrorRecoveryAction("VOICE_5000"),
    "retry_current_session",
  );
  assert.equal(selectVoiceErrorRecoveryAction(null), "retry_current_session");
});

test("final 없는 종료는 사용자가 이해할 수 있는 재시도 안내를 한다", () => {
  assert.equal(
    selectVoiceStreamErrorMessage("NO_FINAL_RESULT", true),
    "말씀을 끝까지 확인하지 못했어요. 마이크를 눌러 다시 말씀해 주세요.",
  );
});

test("못 알아들은 확인 발화는 같은 확인 안에서 다시 시도한다", () => {
  // 백엔드가 이체를 실행하기 전에 거절한 경우다. 돈은 아직 움직이지 않았다.
  assert.equal(canRetryConfirmation("VOICE_4003", 400), true);
  assert.equal(canRetryConfirmation("VOICE_4004", 400), true);
  assert.equal(canRetryConfirmation("VOICE_5000", 502), true);
});

test("세션이 끝났거나 확인 정보가 어긋나면 다시 시도하지 않는다", () => {
  assert.equal(canRetryConfirmation("VOICE_4005", 400), false);
  assert.equal(canRetryConfirmation("VOICE_4007", 400), false);
  assert.equal(canRetryConfirmation("VOICE_4011", 400), false);
});

test("응답을 받지 못했으면 이체가 나갔을 수 있으므로 다시 보내지 않는다", () => {
  // status 가 없다는 것은 서버 응답을 못 봤다는 뜻이다. 멱등키 조회가 맡는다.
  assert.equal(canRetryConfirmation("VOICE_4003", null), false);
  assert.equal(canRetryConfirmation(null, null), false);
  assert.equal(canRetryConfirmation(null, 400), false);
});

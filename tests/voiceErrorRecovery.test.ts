import assert from "node:assert/strict";
import test from "node:test";

import { selectVoiceErrorRecoveryAction } from "../src/services/voiceErrorRecovery.ts";

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

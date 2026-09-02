import assert from "node:assert/strict";
import { test } from "node:test";

import {
  isVoiceStreamCommand,
  isVoiceStreamCommandError,
  isVoiceStreamError,
  parseVoiceStreamMessage,
  toVoiceStreamUrl,
} from "../src/services/voiceStreamContract.ts";

test("중간 결과를 읽는다", () => {
  const parsed = parseVoiceStreamMessage(
    JSON.stringify({
      type: "interim",
      text: "오만원",
      activated: true,
      command: "오만원",
      fullText: "모비야 오만원",
    }),
  );

  assert.equal(parsed?.type, "interim");
  assert.equal((parsed as { fullText: string }).fullText, "모비야 오만원");
});

test("호출어 전에는 명령이 비어 있다", () => {
  const parsed = parseVoiceStreamMessage(
    JSON.stringify({
      type: "interim",
      text: "오늘 날씨",
      activated: false,
      command: "",
      fullText: "오늘 날씨",
    }),
  );

  assert.equal((parsed as { activated: boolean }).activated, false);
  assert.equal((parsed as { command: string }).command, "");
});

test("오류 메시지를 구분한다", () => {
  const parsed = parseVoiceStreamMessage(
    JSON.stringify({
      type: "error",
      code: "STT_PROVIDER_ERROR",
      message: "boom",
      retryable: true,
    }),
  );

  assert.ok(parsed);
  assert.equal(isVoiceStreamError(parsed), true);
});

test("깨진 메시지는 버린다", () => {
  // 서버가 보낸 값을 그대로 믿고 화면에 넘기면 렌더링이 깨진다.
  assert.equal(parseVoiceStreamMessage("not json"), null);
  assert.equal(parseVoiceStreamMessage(JSON.stringify({ type: "surprise" })), null);
  assert.equal(parseVoiceStreamMessage(JSON.stringify(["array"])), null);
});

test("누락된 필드는 안전한 기본값으로 채운다", () => {
  const parsed = parseVoiceStreamMessage(JSON.stringify({ type: "final" }));

  assert.equal((parsed as { text: string }).text, "");
  assert.equal((parsed as { activated: boolean }).activated, false);
});

test("https 주소는 wss 로 바꾼다", () => {
  // https 페이지에서 ws:// 로 붙으면 브라우저가 혼합 콘텐츠로 차단한다.
  const url = toVoiceStreamUrl("https://moviback.duckdns.org", "tok en");

  assert.ok(url.startsWith("wss://moviback.duckdns.org/ws/v1/voice/stream"));
  assert.ok(url.includes("accessToken=tok%20en"));
});

test("끝의 슬래시를 중복시키지 않는다", () => {
  const url = toVoiceStreamUrl("https://moviback.duckdns.org/", "t");

  assert.ok(url.startsWith("wss://moviback.duckdns.org/ws/v1/voice/stream"));
});

test("명령 처리 결과를 구분한다", () => {
  const parsed = parseVoiceStreamMessage(
    JSON.stringify({ type: "command", data: { state: "AWAITING_CONFIRMATION" } }),
  );

  assert.ok(parsed);
  assert.equal(isVoiceStreamCommand(parsed), true);
});

test("명령 거부도 구분한다", () => {
  const parsed = parseVoiceStreamMessage(
    JSON.stringify({
      type: "commandError",
      code: "VOICE_4003",
      voiceMessage: "그 명령은 아직 못 알아들어요.",
    }),
  );

  assert.ok(parsed);
  assert.equal(isVoiceStreamCommandError(parsed), true);
});

test("분석 메시지는 화면이 쓰지 않는다", () => {
  // 백엔드가 받아 검증하고 command 로 돌려준다. 프론트가 직접 해석하면
  // 검증을 건너뛴 값이 화면에 뜬다.
  assert.equal(parseVoiceStreamMessage(JSON.stringify({ type: "analysis" })), null);
});

test("세션 번호를 주소에 싣는다", () => {
  const url = toVoiceStreamUrl("https://moviback.duckdns.org", "t", 42);

  assert.ok(url.includes("voiceSessionId=42"));
});

test("세션 번호가 없으면 붙이지 않는다", () => {
  const url = toVoiceStreamUrl("https://moviback.duckdns.org", "t");

  assert.equal(url.includes("voiceSessionId"), false);
});

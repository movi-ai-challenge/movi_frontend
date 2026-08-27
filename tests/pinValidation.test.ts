import assert from "node:assert/strict";
import test from "node:test";

import {
  isSixDigitPin,
  normalizeKoreanMobileNumber,
  sanitizePinInput,
} from "../src/services/pinValidation.ts";

test("국내 휴대전화 번호의 구분자와 국가번호를 정규화한다", () => {
  assert.equal(normalizeKoreanMobileNumber("010-1234-5678"), "01012345678");
  assert.equal(normalizeKoreanMobileNumber("+82 10 1234 5678"), "01012345678");
});

test("휴대전화가 아닌 번호는 거부한다", () => {
  assert.equal(normalizeKoreanMobileNumber("02-1234-5678"), null);
  assert.equal(normalizeKoreanMobileNumber("010-123"), null);
});

test("PIN 입력에서 숫자만 남기고 6자리로 제한한다", () => {
  assert.equal(sanitizePinInput("12a34-567"), "123456");
});

test("PIN은 정확히 숫자 6자리여야 한다", () => {
  assert.equal(isSixDigitPin("123456"), true);
  assert.equal(isSixDigitPin("12345"), false);
  assert.equal(isSixDigitPin("12345a"), false);
});

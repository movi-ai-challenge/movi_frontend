import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveDisplayName } from "../src/services/displayName.ts";

test("백엔드가 준 이름을 그대로 쓴다", () => {
  assert.equal(resolveDisplayName("문하늘", "카카오"), "문하늘");
  assert.equal(resolveDisplayName("주혁", "일반"), "주혁");
});

test("앞뒤 공백은 다듬는다", () => {
  assert.equal(resolveDisplayName("  주혁  ", "PIN"), "주혁");
});

test("이름이 없을 때만 수단별 문구로 물러선다", () => {
  // 첫 화면이 "OOO님"으로 부르고 그 문장이 TTS로 읽힌다.
  // 이름이 있는데도 수단 문구가 나오면 자기 이름이 아니라 어색해진다.
  assert.equal(resolveDisplayName(undefined, "카카오"), "카카오로 로그인한 사용자");
  assert.equal(resolveDisplayName(null, "일반"), "아이디로 로그인한 사용자");
  assert.equal(resolveDisplayName("", "PIN"), "PIN으로 로그인한 사용자");
  assert.equal(resolveDisplayName("   ", "일반"), "아이디로 로그인한 사용자");
});

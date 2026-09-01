import assert from "node:assert/strict";
import { test } from "node:test";

import {
  isValidDisplayName,
  isValidLoginId,
  isValidPassword,
  normalizeLoginId,
} from "../src/services/credentialValidation.ts";

test("아이디는 대소문자를 구분하지 않고 소문자로 정규화한다", () => {
  assert.equal(normalizeLoginId("  MoVi  "), "movi");
});

test("아이디는 영문·숫자·밑줄 4~30자만 허용한다", () => {
  assert.equal(isValidLoginId("movi"), true);
  assert.equal(isValidLoginId("movi_123"), true);
  assert.equal(isValidLoginId("mov"), false);
  assert.equal(isValidLoginId("a".repeat(31)), false);
  assert.equal(isValidLoginId("모비계정"), false);
  assert.equal(isValidLoginId("movi-123"), false);
  assert.equal(isValidLoginId("movi 123"), false);
});

test("비밀번호는 8~64자를 허용한다", () => {
  assert.equal(isValidPassword("password"), true);
  assert.equal(isValidPassword("pass123"), false);
  assert.equal(isValidPassword("a".repeat(64)), true);
  assert.equal(isValidPassword("a".repeat(65)), false);
});

test("이름은 공백만으로 채울 수 없다", () => {
  assert.equal(isValidDisplayName("문하늘"), true);
  assert.equal(isValidDisplayName("   "), false);
  assert.equal(isValidDisplayName("가".repeat(51)), false);
});

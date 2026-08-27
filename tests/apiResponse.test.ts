import assert from "node:assert/strict";
import test from "node:test";

import {
  ApiResponseContractError,
  isRecord,
  parseApiData,
} from "../src/services/apiResponse.ts";

interface Payload {
  value: string;
}

function isPayload(value: unknown): value is Payload {
  return isRecord(value) && typeof value.value === "string";
}

test("SUCCESS 응답의 검증된 data를 반환한다", () => {
  const data = parseApiData(
    {
      code: "SUCCESS",
      message: "ok",
      voiceMessage: null,
      data: { value: "verified" },
    },
    isPayload,
  );

  assert.deepEqual(data, { value: "verified" });
});

test("실패 code와 사용자 메시지를 계약 오류로 보존한다", () => {
  assert.throws(
    () =>
      parseApiData(
        {
          code: "AUTH_4015",
          message: "로그인 코드가 유효하지 않습니다.",
          voiceMessage: "다시 로그인해 주세요.",
          data: null,
        },
        isPayload,
      ),
    (error: unknown) =>
      error instanceof ApiResponseContractError &&
      error.code === "AUTH_4015" &&
      error.voiceMessage === "다시 로그인해 주세요.",
  );
});

test("SUCCESS라도 data 형식이 다르면 거부한다", () => {
  assert.throws(
    () =>
      parseApiData(
        {
          code: "SUCCESS",
          message: "ok",
          voiceMessage: null,
          data: { value: 123 },
        },
        isPayload,
      ),
    ApiResponseContractError,
  );
});

test("공통 envelope 필드가 누락되면 거부한다", () => {
  assert.throws(
    () =>
      parseApiData(
        {
          code: "SUCCESS",
          data: { value: "verified" },
        },
        isPayload,
      ),
    ApiResponseContractError,
  );
});

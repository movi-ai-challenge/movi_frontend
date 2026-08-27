import assert from "node:assert/strict";
import test from "node:test";

import {
  getSafeOpenBankingAuthorizationUrl,
  isConnectedAccountListSummary,
  parseOpenBankingCallbackResult,
} from "../src/services/openBankingContract.ts";

test("HTTPS 오픈뱅킹 인증 주소만 허용한다", () => {
  assert.equal(
    getSafeOpenBankingAuthorizationUrl(
      "https://testapi.openbanking.or.kr/oauth/2.0/authorize?state=opaque",
    ),
    "https://testapi.openbanking.or.kr/oauth/2.0/authorize?state=opaque",
  );
  assert.equal(
    getSafeOpenBankingAuthorizationUrl("javascript:alert(1)"),
    null,
  );
  assert.equal(getSafeOpenBankingAuthorizationUrl("http://example.com"), null);
});

test("callback 성공·오류·잘못된 형식을 구분한다", () => {
  assert.equal(parseOpenBankingCallbackResult("success", null), "success");
  assert.equal(parseOpenBankingCallbackResult("error", "denied"), "error");
  assert.equal(parseOpenBankingCallbackResult(null, null), "invalid");
});

test("계좌 목록 totalCount와 실제 배열 길이가 일치해야 한다", () => {
  assert.equal(
    isConnectedAccountListSummary({ totalCount: 2, accounts: [{}, {}] }),
    true,
  );
  assert.equal(
    isConnectedAccountListSummary({ totalCount: 2, accounts: [{}] }),
    false,
  );
});

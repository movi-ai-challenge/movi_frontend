import assert from "node:assert/strict";
import test from "node:test";

import {
  isAccountListResponseData,
  mapAccountListResponse,
  validateAccountAlias,
} from "../src/services/accountContract.ts";

const accountListResponse = {
  totalCount: 2,
  accounts: [
    {
      accountId: 11,
      bankName: "모비은행",
      accountNumMasked: "123-****-7890",
      accountAlias: "생활비",
      accountType: "DEPOSIT",
      primary: true,
    },
    {
      accountId: 12,
      bankName: "함께은행",
      accountNumMasked: "987-****-4321",
      accountAlias: null,
      accountType: "SAVING",
      primary: false,
    },
  ],
};

test("백엔드 계좌 목록 DTO를 화면 모델로 매핑한다", () => {
  if (!isAccountListResponseData(accountListResponse)) {
    assert.fail("유효한 계좌 목록 fixture가 계약 검증을 통과해야 합니다.");
  }
  assert.deepEqual(mapAccountListResponse(accountListResponse), [
    {
      id: "11",
      bankName: "모비은행",
      accountName: "생활비",
      accountAlias: "생활비",
      maskedAccountNumber: "123-****-7890",
      accountType: "DEPOSIT",
      isPrimary: true,
    },
    {
      id: "12",
      bankName: "함께은행",
      accountName: "함께은행 계좌",
      accountAlias: null,
      maskedAccountNumber: "987-****-4321",
      accountType: "SAVING",
      isPrimary: false,
    },
  ]);
});

test("마스킹되지 않은 계좌번호와 목록 개수 불일치를 거부한다", () => {
  assert.equal(
    isAccountListResponseData({
      totalCount: 1,
      accounts: [
        {
          ...accountListResponse.accounts[0],
          accountNumMasked: "1234567890",
        },
      ],
    }),
    false,
  );
  assert.equal(
    isAccountListResponseData({ ...accountListResponse, totalCount: 1 }),
    false,
  );
});

test("계좌 별칭은 trim 후 1자 이상 50자 이하만 허용한다", () => {
  assert.equal(validateAccountAlias("  생활비  "), "생활비");
  assert.equal(validateAccountAlias("   "), null);
  assert.equal(validateAccountAlias("가".repeat(51)), null);
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  isBalanceResponseData,
  mapBalanceResponse,
} from "../src/services/balanceContract.ts";
import type { Account } from "../src/types/index.ts";

const account: Account = {
  id: "11",
  bankName: "모비은행",
  accountName: "생활비",
  accountAlias: "생활비",
  maskedAccountNumber: "123-****-7890",
  accountType: "DEPOSIT",
  isPrimary: true,
};

const response = {
  accountId: 11,
  bankName: "모비은행",
  accountAlias: "생활비",
  balanceAmount: 530_000,
  availableAmount: 500_000,
  fetchedAt: "2026-08-27T10:20:30",
};

test("잔액 DTO를 선택한 마스킹 계좌 정보와 결합한다", () => {
  assert.equal(isBalanceResponseData(response), true);
  assert.deepEqual(mapBalanceResponse(response, account), {
    ...account,
    balance: 530_000,
    availableBalance: 500_000,
    currency: "KRW",
    fetchedAt: "2026-08-27T10:20:30",
  });
});

test("음수·가용 금액 초과·잘못된 조회 시각을 거부한다", () => {
  assert.equal(isBalanceResponseData({ ...response, balanceAmount: -1 }), false);
  assert.equal(
    isBalanceResponseData({ ...response, availableAmount: 530_001 }),
    false,
  );
  assert.equal(isBalanceResponseData({ ...response, fetchedAt: "invalid" }), false);
});

test("선택 계좌와 다른 잔액 응답을 거부한다", () => {
  assert.throws(() =>
    mapBalanceResponse({ ...response, accountId: 12 }, account),
  );
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  isTransactionPageResponseData,
  isTransactionResponseData,
  mapTransactionPage,
  mapTransactionResponse,
} from "../src/services/transactionContract.ts";
import type {
  TransactionPageResponseData,
  TransactionResponseData,
} from "../src/services/transactionContract.ts";

const transaction: TransactionResponseData = {
  transactionId: 101,
  accountId: 11,
  type: "OUT",
  amount: 50_000,
  balanceAfter: 950_000,
  counterpartyName: "김영희",
  category: "이체",
  transactedAt: "2026-08-24T12:30:00",
  memo: "생활비",
  source: "INTERNAL",
  riskLevel: null,
};

const page: TransactionPageResponseData = {
  content: [transaction],
  page: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
  hasNext: false,
};

test("거래 목록 DTO와 페이징 메타데이터를 검증하고 매핑한다", () => {
  assert.equal(isTransactionPageResponseData(page), true);
  if (!isTransactionPageResponseData(page)) assert.fail("유효한 fixture");

  assert.deepEqual(mapTransactionPage(page, "거래가 1건 있어요."), {
    transactions: [
      {
        id: "101",
        accountId: "11",
        type: "OUT",
        description: "김영희",
        amount: 50_000,
        balanceAfter: 950_000,
        counterpartyName: "김영희",
        category: "이체",
        occurredAt: "2026-08-24T12:30:00",
        memo: "생활비",
        source: "INTERNAL",
        riskLevel: null,
      },
    ],
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1,
    hasNext: false,
    voiceMessage: "거래가 1건 있어요.",
  });
});

test("계약에 없는 거래 유형과 잘못된 페이지 정보를 거부한다", () => {
  assert.equal(isTransactionResponseData({ ...transaction, type: "blocked" }), false);
  assert.equal(isTransactionPageResponseData({ ...page, hasNext: true }), false);
  assert.equal(isTransactionPageResponseData({ ...page, size: 101 }), false);
  assert.equal(
    isTransactionPageResponseData({ ...page, totalElements: 0, totalPages: 0 }),
    false,
  );
});

test("서버 음성 문구가 없는 목록 응답을 거부한다", () => {
  assert.throws(() => mapTransactionPage(page, null));
});

test("FDS 판정을 함께 읽는다", () => {
  const flagged = {
    transactionId: 4,
    accountId: 1961,
    type: "OUT" as const,
    amount: 990_000,
    balanceAfter: 490_000,
    counterpartyName: "김영희",
    category: null,
    transactedAt: "2026-09-02T14:45:21",
    memo: null,
    source: "INTERNAL" as const,
    riskLevel: "MEDIUM" as const,
  };

  assert.equal(mapTransactionResponse(flagged).riskLevel, "MEDIUM");
});

test("판정이 없는 거래는 null 로 둔다", () => {
  // 은행에서 내려받은 입출금은 우리 평가가 없다. 없는 것을 LOW 로 채우면
  // 평가받은 안전한 거래와 구분되지 않는다.
  const external = {
    transactionId: 9,
    accountId: 1961,
    type: "IN" as const,
    amount: 1_200_000,
    balanceAfter: 1_690_000,
    counterpartyName: "국민연금",
    category: null,
    transactedAt: "2026-09-02T09:00:00",
    memo: null,
    source: "OPENBANKING" as const,
  };

  assert.equal(mapTransactionResponse(external).riskLevel, null);
});

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import { useBankStore } from "../src/store/useBankStore.ts";
import type { Account } from "../src/types/index.ts";

const accounts: Account[] = [
  {
    id: "11",
    bankName: "모비은행",
    accountName: "생활비",
    maskedAccountNumber: "123-****-7890",
    accountType: "DEPOSIT",
    isPrimary: false,
  },
  {
    id: "12",
    bankName: "함께은행",
    accountName: "저축",
    maskedAccountNumber: "987-****-4321",
    accountType: "SAVING",
    isPrimary: true,
  },
];

beforeEach(() => {
  useBankStore.getState().resetBankState();
});

test("계좌 목록의 primary 값을 기본 계좌 ID로 사용한다", () => {
  useBankStore.getState().setAccounts(accounts);

  assert.equal(useBankStore.getState().defaultAccountId, "12");
});

test("기본 계좌 변경 시 목록의 primary 상태도 함께 갱신한다", () => {
  useBankStore.getState().setAccounts(accounts);
  useBankStore.getState().setDefaultAccount("11");

  assert.equal(useBankStore.getState().defaultAccountId, "11");
  assert.deepEqual(
    useBankStore.getState().accounts.map((account) => account.isPrimary),
    [true, false],
  );
});

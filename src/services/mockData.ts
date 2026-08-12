import type { Account, FdsAlert, Transaction, User } from "@/types";

export const mockUser: User = { id: "user-demo", name: "모비 사용자" };
export const mockAccounts: Account[] = [
  {
    id: "account-demo-1",
    bankName: "모비은행",
    accountName: "생활비 통장",
    maskedAccountNumber: "123-****-7890",
    balance: 2_450_000,
    currency: "KRW",
  },
  {
    id: "account-demo-2",
    bankName: "함께은행",
    accountName: "저축 통장",
    maskedAccountNumber: "987-****-4321",
    balance: 8_100_000,
    currency: "KRW",
  },
];
export const mockTransactions: Transaction[] = [
  {
    id: "transaction-demo-1",
    accountId: "account-demo-1",
    type: "deposit",
    description: "급여",
    amount: 3_000_000,
    balanceAfter: 3_250_000,
    occurredAt: "2026-08-12T09:00:00+09:00",
  },
  {
    id: "transaction-demo-2",
    accountId: "account-demo-1",
    type: "withdrawal",
    description: "생활비 결제",
    amount: 120_000,
    balanceAfter: 3_130_000,
    occurredAt: "2026-08-12T12:30:00+09:00",
  },
  {
    id: "transaction-demo-3",
    accountId: "account-demo-1",
    type: "transfer",
    description: "등록 수취인에게 이체",
    amount: 680_000,
    balanceAfter: 2_450_000,
    occurredAt: "2026-08-12T18:20:00+09:00",
  },
  {
    id: "transaction-demo-4",
    accountId: "account-demo-2",
    type: "deposit",
    description: "저축 입금",
    amount: 500_000,
    balanceAfter: 8_100_000,
    occurredAt: "2026-08-11T10:10:00+09:00",
  },
];
export const mockFdsAlerts: FdsAlert[] = [];

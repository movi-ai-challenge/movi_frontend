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
export const mockTransactions: Transaction[] = [];
export const mockFdsAlerts: FdsAlert[] = [];

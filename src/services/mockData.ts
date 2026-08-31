import type {
  Account,
  FdsAlert,
  RegisteredRecipient,
  Transaction,
  User,
} from "@/types";

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
  {
    id: "transaction-demo-5",
    accountId: "account-demo-1",
    type: "blocked",
    description: "위험 거래 차단",
    amount: 1_500_000,
    balanceAfter: 2_450_000,
    occurredAt: "2026-08-10T22:40:00+09:00",
  },
];
export const mockRegisteredRecipients: RegisteredRecipient[] = [
  {
    id: "recipient-demo-1",
    name: "김모비",
    bankName: "모비은행",
    maskedAccountNumber: "456-****-1234",
  },
  {
    id: "recipient-demo-2",
    name: "이하늘",
    bankName: "함께은행",
    maskedAccountNumber: "789-****-5678",
  },
];
export const mockFdsAlerts: FdsAlert[] = [
  {
    id: "alert-demo-1",
    accountId: "account-demo-1",
    transactionId: "transaction-demo-4",
    title: "긴급 위험 알림",
    description: "고위험 거래가 감지되어 이체를 차단했습니다.",
    severity: "critical",
    status: "unread",
    detectedAt: "2026-08-30T23:12:00+09:00",
  },
  {
    id: "alert-demo-2",
    accountId: "account-demo-1",
    transactionId: "transaction-demo-3",
    title: "이체 완료",
    description: "김영희님께 50,000원 이체가 완료되었습니다.",
    severity: "info",
    status: "resolved",
    detectedAt: "2026-08-30T14:23:00+09:00",
  },
  {
    id: "alert-demo-3",
    accountId: "account-demo-1",
    title: "보호자 알림 발송",
    description: "중위험 거래로 분류되어 연결된 보호자에게 알림을 보냈습니다.",
    severity: "warning",
    status: "reviewing",
    detectedAt: "2026-08-29T09:40:00+09:00",
  },
];

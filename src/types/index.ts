export interface User { id: string; name: string; }

export type MockAuthenticationMethod =
  | "PASS"
  | "카카오"
  | "일반"
  | "PIN"
  | "생체인증";

export interface KakaoBackendSession {
  accessToken: string;
  tokenType: string;
  accessTokenExpiresIn: number;
  isNewUser: boolean;
}

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  accessTokenExpiresIn: number;
}

export interface AuthSession {
  userId: string;
  displayName: string;
  method: MockAuthenticationMethod;
  authenticatedAt: string;
  /** 실제 백엔드로 로그인한 경우에만 채워진다. 로그아웃 API 호출에 필요하다. */
  backend?: KakaoBackendSession;
}

export interface Account {
  id: string;
  bankName: string;
  accountName: string;
  accountAlias: string | null;
  maskedAccountNumber: string;
  accountType: "DEPOSIT" | "SAVING";
  isPrimary: boolean;
  balance?: number;
  currency?: "KRW";
}

export interface AccountBalance extends Account {
  balance: number;
  availableBalance: number;
  currency: "KRW";
  fetchedAt: string;
}

export interface BalanceInquiryResult {
  account: AccountBalance;
  voiceMessage: string;
}

export interface AccountDisconnectionVerification {
  accountId: string;
  verifiedAt: string;
}

export interface RegisteredRecipient {
  id: string;
  nickname: string;
  holderName: string;
  bankCode: string;
  maskedAccountNumber: string;
  transferCount: number;
}

export interface TransferDraft {
  sourceAccountId: string | null;
  recipientId: string | null;
  recipientName: string;
  recipientBankName: string | null;
  recipientMaskedAccountNumber: string | null;
  amount: number;
}

export type TransactionType = "IN" | "OUT";
export type TransactionSource = "OPENBANKING" | "INTERNAL";
export interface Transaction {
  id: string;
  accountId: string;
  type: TransactionType;
  description: string;
  amount: number;
  balanceAfter: number | null;
  counterpartyName: string | null;
  category: string | null;
  occurredAt: string;
  memo: string | null;
  source: TransactionSource;
  /** FDS 판정. 이체를 거치지 않은 거래는 null 이다. */
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | null;
}

export interface TransactionPage {
  transactions: Transaction[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  voiceMessage: string;
}

export interface TransactionDetailResult {
  transaction: Transaction;
  voiceMessage: string;
}

export type VoiceStatus = "idle" | "listening" | "processing" | "speaking" | "error";
export interface VoiceState {
  status: VoiceStatus;
  transcript: string;
  errorMessage: string | null;
}

export type VoiceSessionState =
  | "ACTIVE"
  | "CLARIFYING"
  | "AWAITING_CONFIRMATION"
  | "PROCESSING"
  | "COMPLETED"
  | "CANCELED"
  | "EXPIRED";

export type VoiceIntent =
  | "BALANCE"
  | "TRANSFER"
  | "HISTORY"
  | "CONFIRM"
  | "CANCEL"
  | "UNKNOWN";

export interface VoiceSessionStart {
  voiceSessionId: string;
  state: VoiceSessionState;
  expiresAt: string;
  voiceMessage: string;
}

export interface VoiceCommandResult {
  voiceSessionId: string | null;
  state: VoiceSessionState;
  intent: VoiceIntent;
  missingSlots: Array<"RECIPIENT" | "AMOUNT">;
  confirmationId: string | null;
  fromAccount: {
    accountId: string;
    alias: string | null;
    bankName: string;
  } | null;
  recipient: {
    recipientId: string | null;
    holderName: string;
    bankCode: string | null;
  } | null;
  amount: number | null;
  expiresAt: string | null;
  transferId: string | null;
  status:
    | "PENDING"
    | "RISK_REVIEW"
    | "COMPLETED"
    | "BLOCKED"
    | "FAILED"
    | "CANCELED"
    | null;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | null;
  completedAt: string | null;
  history: {
    periodPhrase: string;
    accountName: string;
    totalCount: number;
    items: Array<{
      transactionId: string;
      type: TransactionType;
      amount: number;
      counterpartyName: string | null;
      transactedAt: string;
    }>;
  } | null;
  balance: {
    accountId: string;
    bankName: string;
    accountAlias: string | null;
    balanceAmount: number;
    availableAmount: number;
    fetchedAt: string;
  } | null;
  /** FDS 가 짚은 근거. 위험도가 LOW 여도 알려 줄 값어치가 있다. */
  riskReasons: string[];
  voiceMessage: string;
}

export type TransferExecutionStatus =
  | "PENDING"
  | "RISK_REVIEW"
  | "COMPLETED"
  | "BLOCKED"
  | "FAILED"
  | "CANCELED";

export type TransferFdsRiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface TransferStatusResult {
  transferId: string;
  status: TransferExecutionStatus;
  riskLevel: TransferFdsRiskLevel | null;
  amount: number;
  recipientName: string;
  requestedAt: string;
  completedAt: string | null;
  voiceMessage: string;
}

export interface DirectTransferReview {
  confirmationId: string;
  idempotencyKey: string;
  fromAccount: {
    accountId: string;
    alias: string | null;
    bankName: string;
  };
  recipient: {
    recipientId: string;
    nickname: string;
    holderName: string;
    maskedAccountNumber: string;
  };
  amount: number;
  expiresAt: string;
  voiceMessage: string;
}

export interface DirectTransferResult {
  transferId: string;
  idempotencyKey: string;
  status: TransferExecutionStatus;
  riskLevel: TransferFdsRiskLevel | null;
  amount: number;
  recipientName: string;
  completedAt: string | null;
  voiceMessage: string;
  /** FDS 가 짚은 근거. 백엔드가 만든 문구를 그대로 쓴다. */
  riskReasons: string[];
}

export interface AccessibilityPreferences {
  highContrast: boolean;
  largeText: boolean;
  simpleMode: boolean;
}

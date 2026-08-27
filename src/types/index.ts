export interface User { id: string; name: string; }

export type MockAuthenticationMethod = "PASS" | "카카오" | "PIN" | "생체인증";

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
  name: string;
  bankName: string;
  maskedAccountNumber: string;
}

export type GuardianRiskAlertDeliveryStatus =
  | "pending"
  | "sent"
  | "failed"
  | "retrying";

export interface GuardianRiskAlertRecord {
  riskEventId: string;
  summary: string;
  detectedAt: string;
  status: GuardianRiskAlertDeliveryStatus;
  lastAttemptedAt: string | null;
}

export interface TransferDraft {
  sourceAccountId: string | null;
  recipientId: string | null;
  recipientName: string;
  recipientBankName: string | null;
  recipientMaskedAccountNumber: string | null;
  amount: number;
}

export interface TransferResult {
  status: "success" | "failed";
  recipientName: string;
  amount: number;
  message: string;
  riskLevel?: FdsRiskLevel;
}

export type FdsRiskLevel = "low" | "medium" | "high";
export interface FdsEvaluationResult {
  riskLevel: FdsRiskLevel;
  summary: string;
}

export type TransactionType = "deposit" | "withdrawal" | "transfer" | "blocked";
export interface Transaction {
  id: string;
  accountId: string;
  type: TransactionType;
  description: string;
  amount: number;
  balanceAfter: number;
  occurredAt: string;
}

export type FdsAlertSeverity = "info" | "warning" | "critical";
export type FdsAlertStatus = "unread" | "reviewing" | "resolved";
export interface FdsAlert {
  id: string;
  accountId: string;
  transactionId?: string;
  title: string;
  description: string;
  severity: FdsAlertSeverity;
  status: FdsAlertStatus;
  detectedAt: string;
}

export type VoiceStatus = "idle" | "listening" | "processing" | "speaking" | "error";
export interface VoiceState {
  status: VoiceStatus;
  transcript: string;
  errorMessage: string | null;
}

export interface AccessibilityPreferences {
  highContrast: boolean;
  largeText: boolean;
  simpleMode: boolean;
}

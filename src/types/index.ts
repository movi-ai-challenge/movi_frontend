export interface User { id: string; name: string; }

export interface Account {
  id: string;
  bankName: string;
  accountName: string;
  maskedAccountNumber: string;
  balance: number;
  currency: "KRW";
}

export type TransactionType = "deposit" | "withdrawal" | "transfer";
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

import { ApiResponseContractError } from "./apiResponse.ts";
import type {
  VoiceCommandResult,
  VoiceIntent,
  VoiceSessionStart,
  VoiceSessionState,
} from "@/types";

export interface VoiceSessionStartData {
  voiceSessionId: number | string;
  status: VoiceSessionState;
  expiresAt: string;
}

interface VoiceHistoryData {
  periodPhrase: string;
  accountName: string;
  totalCount: number;
  items: Array<{
    transactionId: number | string;
    type: "IN" | "OUT";
    amount: number;
    counterpartyName: string | null;
    transactedAt: string;
  }>;
}

interface VoiceBalanceData {
  accountId: number | string;
  bankName: string;
  accountAlias: string | null;
  balanceAmount: number;
  availableAmount: number;
  fetchedAt: string;
}

export interface VoiceCommandResponseData {
  voiceSessionId: number | string | null;
  state: VoiceSessionState;
  intent: VoiceIntent;
  missingSlots: Array<"RECIPIENT" | "AMOUNT">;
  confirmationId: string | null;
  fromAccount: {
    accountId: number | string;
    alias: string | null;
    bankName: string;
  } | null;
  recipient: {
    recipientId: number | string | null;
    holderName: string;
    bankCode: string | null;
  } | null;
  amount: number | null;
  expiresAt: string | null;
  transferId: number | string | null;
  status: VoiceCommandResult["status"];
  riskLevel: VoiceCommandResult["riskLevel"];
  completedAt: string | null;
  history: VoiceHistoryData | null;
  balance: VoiceBalanceData | null;
}

const sessionStates = new Set<VoiceSessionState>([
  "ACTIVE",
  "CLARIFYING",
  "AWAITING_CONFIRMATION",
  "PROCESSING",
  "COMPLETED",
  "CANCELED",
  "EXPIRED",
]);
const intents = new Set<VoiceIntent>([
  "BALANCE",
  "TRANSFER",
  "HISTORY",
  "CONFIRM",
  "CANCEL",
  "UNKNOWN",
]);
const transferStatuses = new Set([
  "PENDING",
  "RISK_REVIEW",
  "COMPLETED",
  "BLOCKED",
  "FAILED",
  "CANCELED",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isId(value: unknown): value is number | string {
  return (
    (typeof value === "number" && Number.isSafeInteger(value) && value > 0) ||
    (typeof value === "string" && value.length > 0)
  );
}

function isNullableId(value: unknown): value is number | string | null {
  return value === null || isId(value);
}

function isDateTime(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isNullableDateTime(value: unknown): value is string | null {
  return value === null || isDateTime(value);
}

function isNonNegativeAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isFromAccount(value: unknown): boolean {
  return (
    value === null ||
    (isRecord(value) &&
      isId(value.accountId) &&
      isNullableString(value.alias) &&
      typeof value.bankName === "string" &&
      value.bankName.length > 0)
  );
}

function isRecipient(value: unknown): boolean {
  return (
    value === null ||
    (isRecord(value) &&
      isNullableId(value.recipientId) &&
      typeof value.holderName === "string" &&
      value.holderName.length > 0 &&
      isNullableString(value.bankCode))
  );
}

function isHistoryItem(value: unknown): boolean {
  return (
    isRecord(value) &&
    isId(value.transactionId) &&
    (value.type === "IN" || value.type === "OUT") &&
    isNonNegativeAmount(value.amount) &&
    isNullableString(value.counterpartyName) &&
    isDateTime(value.transactedAt)
  );
}

function isHistory(value: unknown): boolean {
  return (
    value === null ||
    (isRecord(value) &&
      typeof value.periodPhrase === "string" &&
      value.periodPhrase.length > 0 &&
      typeof value.accountName === "string" &&
      value.accountName.length > 0 &&
      isNonNegativeAmount(value.totalCount) &&
      Array.isArray(value.items) &&
      value.items.every(isHistoryItem) &&
      value.items.length <= value.totalCount)
  );
}

function isBalance(value: unknown): boolean {
  return (
    value === null ||
    (isRecord(value) &&
      isId(value.accountId) &&
      typeof value.bankName === "string" &&
      value.bankName.length > 0 &&
      isNullableString(value.accountAlias) &&
      isNonNegativeAmount(value.balanceAmount) &&
      isNonNegativeAmount(value.availableAmount) &&
      value.availableAmount <= value.balanceAmount &&
      isDateTime(value.fetchedAt))
  );
}

export function isVoiceSessionStartData(
  value: unknown,
): value is VoiceSessionStartData {
  return (
    isRecord(value) &&
    isId(value.voiceSessionId) &&
    value.status === "ACTIVE" &&
    isDateTime(value.expiresAt)
  );
}

function hasValidStatePayload(value: VoiceCommandResponseData): boolean {
  if (value.state === "CLARIFYING") {
    return value.intent === "TRANSFER" && value.missingSlots.length > 0;
  }
  if (value.state === "AWAITING_CONFIRMATION") {
    return (
      value.intent === "TRANSFER" &&
      Boolean(value.confirmationId) &&
      value.fromAccount !== null &&
      value.recipient !== null &&
      value.amount !== null &&
      value.expiresAt !== null
    );
  }
  if (value.state === "ACTIVE") {
    return value.intent === "BALANCE" || value.intent === "HISTORY";
  }
  if (value.state === "CANCELED") return value.intent === "CANCEL";
  if (value.state === "COMPLETED") {
    return value.intent === "CONFIRM" && value.status === "COMPLETED";
  }
  return false;
}

export function isVoiceCommandResponseData(
  value: unknown,
): value is VoiceCommandResponseData {
  if (
    !isRecord(value) ||
    !isNullableId(value.voiceSessionId) ||
    !sessionStates.has(value.state as VoiceSessionState) ||
    !intents.has(value.intent as VoiceIntent) ||
    !Array.isArray(value.missingSlots) ||
    !value.missingSlots.every(
      (slot) => slot === "RECIPIENT" || slot === "AMOUNT",
    ) ||
    !isNullableString(value.confirmationId) ||
    !isFromAccount(value.fromAccount) ||
    !isRecipient(value.recipient) ||
    !(value.amount === null || isNonNegativeAmount(value.amount)) ||
    !isNullableDateTime(value.expiresAt) ||
    !isNullableId(value.transferId) ||
    !(
      value.status === null ||
      transferStatuses.has(value.status as string)
    ) ||
    !(
      value.riskLevel === null ||
      value.riskLevel === "LOW" ||
      value.riskLevel === "MEDIUM" ||
      value.riskLevel === "HIGH"
    ) ||
    !isNullableDateTime(value.completedAt) ||
    !isHistory(value.history) ||
    !isBalance(value.balance)
  ) {
    return false;
  }

  return hasValidStatePayload(value as unknown as VoiceCommandResponseData);
}

function requireVoiceMessage(voiceMessage: string | null): string {
  if (!voiceMessage?.trim()) {
    throw new ApiResponseContractError(
      "음성 안내가 응답에 포함되지 않았습니다.",
    );
  }
  return voiceMessage;
}

export function mapVoiceSessionStart(
  data: VoiceSessionStartData,
  voiceMessage: string | null,
): VoiceSessionStart {
  return {
    voiceSessionId: String(data.voiceSessionId),
    state: data.status,
    expiresAt: data.expiresAt,
    voiceMessage: requireVoiceMessage(voiceMessage),
  };
}

function mapNullableId(value: number | string | null): string | null {
  return value === null ? null : String(value);
}

export function mapVoiceCommandResponse(
  data: VoiceCommandResponseData,
  voiceMessage: string | null,
): VoiceCommandResult {
  return {
    ...data,
    voiceSessionId: mapNullableId(data.voiceSessionId),
    fromAccount: data.fromAccount
      ? { ...data.fromAccount, accountId: String(data.fromAccount.accountId) }
      : null,
    recipient: data.recipient
      ? {
          ...data.recipient,
          recipientId: mapNullableId(data.recipient.recipientId),
        }
      : null,
    transferId: mapNullableId(data.transferId),
    history: data.history
      ? {
          ...data.history,
          items: data.history.items.map((item) => ({
            ...item,
            transactionId: String(item.transactionId),
            type: item.type,
          })),
        }
      : null,
    balance: data.balance
      ? { ...data.balance, accountId: String(data.balance.accountId) }
      : null,
    voiceMessage: requireVoiceMessage(voiceMessage),
  };
}

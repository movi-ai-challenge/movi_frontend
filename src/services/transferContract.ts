import { ApiResponseContractError, isRecord } from "./apiResponse.ts";
import type {
  DirectTransferResult,
  DirectTransferReview,
  RegisteredRecipient,
  TransferExecutionStatus,
  TransferFdsRiskLevel,
  TransferStatusResult,
} from "../types/index.ts";

export interface RecipientResponseData {
  recipientId: number | string;
  nickname: string;
  holderName: string;
  bankCode: string;
  maskedAccountNumber: string;
  transferCount: number;
}

export interface RecipientListResponseData {
  totalCount: number;
  recipients: RecipientResponseData[];
}

export interface TransferReviewResponseData {
  confirmationId: string;
  fromAccount: {
    accountId: number | string;
    alias: string | null;
    bankName: string;
  };
  recipient: {
    recipientId: number | string;
    nickname: string;
    holderName: string;
    maskedAccountNumber: string;
  };
  amount: number;
  expiresAt: string;
}

export interface TransferResultResponseData {
  transferId: number | string;
  status: TransferExecutionStatus;
  riskLevel: TransferFdsRiskLevel | null;
  amount: number;
  recipientName: string;
  completedAt: string | null;
  /**
   * FDS 가 짚은 근거를 사람이 읽을 말로 바꾼 것.
   *
   * 위험도만으로는 "왜 막혔는지" 알 수 없다. 화면을 보지 않는 사용자에게는
   * 백엔드가 만든 이 문구가 유일한 설명이라 프런트가 따로 짓지 않는다.
   */
  riskReasons: string[];
}

export interface TransferStatusResponseData {
  transferId: number | string;
  status: TransferExecutionStatus;
  riskLevel: TransferFdsRiskLevel | null;
  amount: number;
  recipientName: string;
  requestedAt: string;
  completedAt: string | null;
}

/**
 * 근거 목록 검증.
 *
 * 없거나 비어 있어도 정상이다 -- FDS 가 아무 신호도 잡지 않은 거래가 그렇다.
 * 값이 오면 문자열만 담겨 있어야 화면에 그대로 그릴 수 있다.
 */
function isStringList(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (!Array.isArray(value)) return false;

  return value.every((item) => typeof item === "string");
}

const transferStatuses = new Set<TransferExecutionStatus>([
  "PENDING",
  "RISK_REVIEW",
  "COMPLETED",
  "BLOCKED",
  "FAILED",
  "CANCELED",
]);

const riskLevels = new Set<TransferFdsRiskLevel>([
  "LOW",
  "MEDIUM",
  "HIGH",
]);

function isId(value: unknown): value is number | string {
  return (
    (typeof value === "number" && Number.isSafeInteger(value) && value > 0) ||
    (typeof value === "string" && value.trim().length > 0)
  );
}

function isDateTime(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isMaskedAccountNumber(value: unknown): value is string {
  return isNonBlankString(value) && value.includes("*");
}

function isRecipientResponseData(
  value: unknown,
): value is RecipientResponseData {
  return (
    isRecord(value) &&
    isId(value.recipientId) &&
    isNonBlankString(value.nickname) &&
    isNonBlankString(value.holderName) &&
    isNonBlankString(value.bankCode) &&
    isMaskedAccountNumber(value.maskedAccountNumber) &&
    typeof value.transferCount === "number" &&
    Number.isSafeInteger(value.transferCount) &&
    value.transferCount >= 0
  );
}

export function isRecipientListResponseData(
  value: unknown,
): value is RecipientListResponseData {
  return (
    isRecord(value) &&
    typeof value.totalCount === "number" &&
    Number.isSafeInteger(value.totalCount) &&
    value.totalCount >= 0 &&
    Array.isArray(value.recipients) &&
    value.recipients.every(isRecipientResponseData) &&
    value.recipients.length === value.totalCount
  );
}

export function mapRecipientListResponse(
  data: RecipientListResponseData,
): RegisteredRecipient[] {
  return data.recipients.map((recipient) => ({
    id: String(recipient.recipientId),
    nickname: recipient.nickname.trim(),
    holderName: recipient.holderName.trim(),
    bankCode: recipient.bankCode.trim(),
    maskedAccountNumber: recipient.maskedAccountNumber,
    transferCount: recipient.transferCount,
  }));
}

export function isTransferReviewResponseData(
  value: unknown,
): value is TransferReviewResponseData {
  return (
    isRecord(value) &&
    isNonBlankString(value.confirmationId) &&
    isRecord(value.fromAccount) &&
    isId(value.fromAccount.accountId) &&
    (value.fromAccount.alias === null ||
      typeof value.fromAccount.alias === "string") &&
    isNonBlankString(value.fromAccount.bankName) &&
    isRecord(value.recipient) &&
    isId(value.recipient.recipientId) &&
    isNonBlankString(value.recipient.nickname) &&
    isNonBlankString(value.recipient.holderName) &&
    isMaskedAccountNumber(value.recipient.maskedAccountNumber) &&
    typeof value.amount === "number" &&
    Number.isSafeInteger(value.amount) &&
    value.amount > 0 &&
    isDateTime(value.expiresAt)
  );
}

export function mapTransferReviewResponse(
  data: TransferReviewResponseData,
  voiceMessage: string | null,
  idempotencyKey: string,
): DirectTransferReview {
  if (!isNonBlankString(voiceMessage)) {
    throw new ApiResponseContractError(
      "송금 검토 음성 안내가 응답에 포함되지 않았습니다.",
    );
  }
  return {
    ...data,
    confirmationId: data.confirmationId.trim(),
    idempotencyKey,
    fromAccount: {
      ...data.fromAccount,
      accountId: String(data.fromAccount.accountId),
      alias: data.fromAccount.alias?.trim() || null,
    },
    recipient: {
      ...data.recipient,
      recipientId: String(data.recipient.recipientId),
    },
    voiceMessage: voiceMessage.trim(),
  };
}

function hasConsistentFdsResult(data: TransferStatusResponseData): boolean {
  if (data.status === "BLOCKED") return data.riskLevel === "HIGH";
  if (data.status === "COMPLETED") {
    return (
      (data.riskLevel === "LOW" || data.riskLevel === "MEDIUM") &&
      data.completedAt !== null
    );
  }
  return true;
}

function hasConsistentExecutionResult(
  data: TransferResultResponseData,
): boolean {
  if (data.status === "BLOCKED") return data.riskLevel === "HIGH";
  if (data.status === "COMPLETED") {
    return (
      (data.riskLevel === "LOW" || data.riskLevel === "MEDIUM") &&
      data.completedAt !== null
    );
  }
  return true;
}

export function isTransferResultResponseData(
  value: unknown,
): value is TransferResultResponseData {
  if (
    !isRecord(value) ||
    !isId(value.transferId) ||
    !transferStatuses.has(value.status as TransferExecutionStatus) ||
    !(
      value.riskLevel === null ||
      riskLevels.has(value.riskLevel as TransferFdsRiskLevel)
    ) ||
    typeof value.amount !== "number" ||
    !Number.isSafeInteger(value.amount) ||
    value.amount <= 0 ||
    !isNonBlankString(value.recipientName) ||
    !(value.completedAt === null || isDateTime(value.completedAt)) ||
    !isStringList(value.riskReasons)
  ) {
    return false;
  }
  return hasConsistentExecutionResult(
    value as unknown as TransferResultResponseData,
  );
}

export function mapTransferResultResponse(
  data: TransferResultResponseData,
  voiceMessage: string | null,
  idempotencyKey: string,
): DirectTransferResult {
  if (!isNonBlankString(voiceMessage)) {
    throw new ApiResponseContractError(
      "송금 결과 음성 안내가 응답에 포함되지 않았습니다.",
    );
  }
  return {
    ...data,
    transferId: String(data.transferId),
    idempotencyKey,
    recipientName: data.recipientName.trim(),
    voiceMessage: voiceMessage.trim(),
    riskReasons: data.riskReasons ?? [],
  };
}

export function isTransferStatusResponseData(
  value: unknown,
): value is TransferStatusResponseData {
  if (
    !isRecord(value) ||
    !isId(value.transferId) ||
    !transferStatuses.has(value.status as TransferExecutionStatus) ||
    !(
      value.riskLevel === null ||
      riskLevels.has(value.riskLevel as TransferFdsRiskLevel)
    ) ||
    typeof value.amount !== "number" ||
    !Number.isSafeInteger(value.amount) ||
    value.amount <= 0 ||
    typeof value.recipientName !== "string" ||
    value.recipientName.trim().length < 1 ||
    !isDateTime(value.requestedAt) ||
    !(value.completedAt === null || isDateTime(value.completedAt))
  ) {
    return false;
  }

  return hasConsistentFdsResult(value as unknown as TransferStatusResponseData);
}

export function mapTransferStatusResponse(
  data: TransferStatusResponseData,
  voiceMessage: string | null,
): TransferStatusResult {
  if (!voiceMessage?.trim()) {
    throw new ApiResponseContractError(
      "송금 상태 음성 안내가 응답에 포함되지 않았습니다.",
    );
  }

  return {
    ...data,
    transferId: String(data.transferId),
    voiceMessage,
  };
}

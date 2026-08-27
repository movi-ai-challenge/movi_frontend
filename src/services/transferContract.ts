import { ApiResponseContractError, isRecord } from "./apiResponse.ts";
import type {
  TransferExecutionStatus,
  TransferFdsRiskLevel,
  TransferStatusResult,
} from "../types/index.ts";

export interface TransferStatusResponseData {
  transferId: number | string;
  status: TransferExecutionStatus;
  riskLevel: TransferFdsRiskLevel | null;
  amount: number;
  recipientName: string;
  requestedAt: string;
  completedAt: string | null;
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

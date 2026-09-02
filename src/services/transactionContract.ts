import { ApiResponseContractError } from "./apiResponse.ts";
import type { Transaction, TransactionPage } from "@/types";

export interface TransactionResponseData {
  transactionId: number | string;
  accountId: number | string;
  type: "IN" | "OUT";
  amount: number;
  balanceAfter: number | null;
  counterpartyName: string | null;
  category: string | null;
  transactedAt: string;
  memo: string | null;
  source: "OPENBANKING" | "INTERNAL";
  /**
   * FDS 판정. 우리 서비스를 거치지 않은 거래(은행에서 내려받은 입출금)는 null 이다.
   */
  riskLevel?: "LOW" | "MEDIUM" | "HIGH" | null;
}

export interface TransactionPageResponseData {
  content: TransactionResponseData[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

export function isTransactionResponseData(
  value: unknown,
): value is TransactionResponseData {
  if (!isRecord(value)) return false;

  return (
    ((typeof value.transactionId === "number" && value.transactionId > 0) ||
      (typeof value.transactionId === "string" && value.transactionId.length > 0)) &&
    ((typeof value.accountId === "number" && value.accountId > 0) ||
      (typeof value.accountId === "string" && value.accountId.length > 0)) &&
    (value.type === "IN" || value.type === "OUT") &&
    isNonNegativeSafeInteger(value.amount) &&
    (value.balanceAfter === null || isNonNegativeSafeInteger(value.balanceAfter)) &&
    isNullableString(value.counterpartyName) &&
    isNullableString(value.category) &&
    typeof value.transactedAt === "string" &&
    !Number.isNaN(Date.parse(value.transactedAt)) &&
    isNullableString(value.memo) &&
    (value.source === "OPENBANKING" || value.source === "INTERNAL")
  );
}

export function isTransactionPageResponseData(
  value: unknown,
): value is TransactionPageResponseData {
  if (
    !isRecord(value) ||
    !Array.isArray(value.content) ||
    !value.content.every(isTransactionResponseData) ||
    typeof value.page !== "number" ||
    !Number.isInteger(value.page) ||
    value.page < 0 ||
    typeof value.size !== "number" ||
    !Number.isInteger(value.size) ||
    value.size < 1 ||
    value.size > 100 ||
    !isNonNegativeSafeInteger(value.totalElements) ||
    typeof value.totalPages !== "number" ||
    !Number.isInteger(value.totalPages) ||
    value.totalPages < 0 ||
    typeof value.hasNext !== "boolean"
  ) {
    return false;
  }

  const calculatedPages = Math.ceil(value.totalElements / value.size);
  return (
    value.content.length <= value.size &&
    value.content.length <= value.totalElements &&
    value.totalPages === calculatedPages &&
    value.hasNext === value.page + 1 < value.totalPages
  );
}

function toDescription(data: TransactionResponseData): string {
  return (
    data.counterpartyName?.trim() ||
    data.memo?.trim() ||
    data.category?.trim() ||
    (data.type === "IN" ? "입금" : "출금")
  );
}

export function mapTransactionResponse(
  data: TransactionResponseData,
): Transaction {
  return {
    id: String(data.transactionId),
    accountId: String(data.accountId),
    type: data.type,
    description: toDescription(data),
    amount: data.amount,
    balanceAfter: data.balanceAfter,
    counterpartyName: data.counterpartyName?.trim() || null,
    category: data.category?.trim() || null,
    occurredAt: data.transactedAt,
    memo: data.memo?.trim() || null,
    source: data.source,
    riskLevel: data.riskLevel ?? null,
  };
}

export function mapTransactionPage(
  data: TransactionPageResponseData,
  voiceMessage: string | null,
): TransactionPage {
  if (!voiceMessage?.trim()) {
    throw new ApiResponseContractError(
      "거래내역 음성 안내가 응답에 포함되지 않았습니다.",
    );
  }

  return {
    transactions: data.content.map(mapTransactionResponse),
    page: data.page,
    size: data.size,
    totalElements: data.totalElements,
    totalPages: data.totalPages,
    hasNext: data.hasNext,
    voiceMessage,
  };
}

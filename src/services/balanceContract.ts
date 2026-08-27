import { ApiResponseContractError } from "./apiResponse.ts";
import type { Account, AccountBalance } from "@/types";

export interface BalanceResponseData {
  accountId: number | string;
  bankName: string;
  accountAlias: string | null;
  balanceAmount: number;
  availableAmount: number;
  fetchedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
  );
}

export function isBalanceResponseData(
  value: unknown,
): value is BalanceResponseData {
  if (!isRecord(value)) return false;

  return (
    ((typeof value.accountId === "number" && value.accountId > 0) ||
      (typeof value.accountId === "string" && value.accountId.length > 0)) &&
    typeof value.bankName === "string" &&
    value.bankName.length > 0 &&
    (value.accountAlias === null || typeof value.accountAlias === "string") &&
    isNonNegativeSafeInteger(value.balanceAmount) &&
    isNonNegativeSafeInteger(value.availableAmount) &&
    value.availableAmount <= value.balanceAmount &&
    typeof value.fetchedAt === "string" &&
    value.fetchedAt.length > 0 &&
    !Number.isNaN(Date.parse(value.fetchedAt))
  );
}

export function mapBalanceResponse(
  data: BalanceResponseData,
  selectedAccount: Account,
): AccountBalance {
  const accountAlias = data.accountAlias?.trim() || null;

  if (
    String(data.accountId) !== selectedAccount.id ||
    data.bankName !== selectedAccount.bankName ||
    accountAlias !== selectedAccount.accountAlias
  ) {
    throw new ApiResponseContractError(
      "선택한 계좌와 잔액 응답의 계좌 정보가 일치하지 않습니다.",
    );
  }

  return {
    ...selectedAccount,
    accountName: accountAlias || `${data.bankName} 계좌`,
    accountAlias,
    balance: data.balanceAmount,
    availableBalance: data.availableAmount,
    currency: "KRW",
    fetchedAt: data.fetchedAt,
  };
}

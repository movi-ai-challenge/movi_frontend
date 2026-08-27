import type { Account } from "@/types";

interface AccountResponseData {
  accountId: number | string;
  bankName: string;
  accountNumMasked: string;
  accountAlias: string | null;
  accountType: "DEPOSIT" | "SAVING";
  primary: boolean;
}

export interface AccountListResponseData {
  totalCount: number;
  accounts: AccountResponseData[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isAccountResponseData(
  value: unknown,
): value is AccountResponseData {
  if (!isRecord(value)) return false;

  return (
    ((typeof value.accountId === "number" && value.accountId > 0) ||
      (typeof value.accountId === "string" && value.accountId.length > 0)) &&
    typeof value.bankName === "string" &&
    value.bankName.length > 0 &&
    typeof value.accountNumMasked === "string" &&
    value.accountNumMasked.length > 0 &&
    value.accountNumMasked.includes("*") &&
    (value.accountAlias === null || typeof value.accountAlias === "string") &&
    (value.accountType === "DEPOSIT" || value.accountType === "SAVING") &&
    typeof value.primary === "boolean"
  );
}

export function isAccountListResponseData(
  value: unknown,
): value is AccountListResponseData {
  return (
    isRecord(value) &&
    typeof value.totalCount === "number" &&
    Number.isInteger(value.totalCount) &&
    value.totalCount >= 0 &&
    Array.isArray(value.accounts) &&
    value.accounts.every(isAccountResponseData) &&
    value.accounts.length === value.totalCount
  );
}

export function mapAccountResponse(data: AccountResponseData): Account {
  const alias = data.accountAlias?.trim();
  return {
    id: String(data.accountId),
    bankName: data.bankName,
    accountName: alias || `${data.bankName} 계좌`,
    accountAlias: alias || null,
    maskedAccountNumber: data.accountNumMasked,
    accountType: data.accountType,
    isPrimary: data.primary,
  };
}

export function mapAccountListResponse(
  data: AccountListResponseData,
): Account[] {
  return data.accounts.map(mapAccountResponse);
}

export function validateAccountAlias(value: string): string | null {
  const alias = value.trim();
  return alias.length >= 1 && alias.length <= 50 ? alias : null;
}

export interface OpenBankingConnectStartData {
  authorizationUrl: string;
}

export interface ConnectedAccountListSummary {
  totalCount: number;
  accounts: unknown[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isOpenBankingConnectStartData(
  value: unknown,
): value is OpenBankingConnectStartData {
  return (
    isRecord(value) &&
    typeof value.authorizationUrl === "string" &&
    value.authorizationUrl.length > 0
  );
}

export function isConnectedAccountListSummary(
  value: unknown,
): value is ConnectedAccountListSummary {
  return (
    isRecord(value) &&
    typeof value.totalCount === "number" &&
    Number.isInteger(value.totalCount) &&
    value.totalCount >= 0 &&
    Array.isArray(value.accounts) &&
    value.accounts.length === value.totalCount
  );
}

export function getSafeOpenBankingAuthorizationUrl(
  value: string,
): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export type OpenBankingCallbackResult = "success" | "error" | "invalid";

export function parseOpenBankingCallbackResult(
  result: string | null,
  error: string | null,
): OpenBankingCallbackResult {
  if (result === "success" && !error) return "success";
  if (result === "error" || error) return "error";
  return "invalid";
}

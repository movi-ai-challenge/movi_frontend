import { mockAccounts } from "@/services/mockData";
import type { Account } from "@/types";

const MOCK_FETCH_DELAY_MS = 500;
const MOCK_UPDATE_DELAY_MS = 500;
const MOCK_DISCONNECT_DELAY_MS = 500;
const MOCK_DISCONNECTED_ACCOUNT_IDS_KEY =
  "movi.mock-disconnected-account-ids";

function readDisconnectedAccountIds(): Set<string> {
  try {
    const storedValue = window.sessionStorage.getItem(
      MOCK_DISCONNECTED_ACCOUNT_IDS_KEY,
    );
    if (!storedValue) return new Set<string>();

    const parsedValue: unknown = JSON.parse(storedValue);
    if (!Array.isArray(parsedValue)) return new Set<string>();

    const knownAccountIds = new Set(mockAccounts.map((account) => account.id));
    return new Set(
      parsedValue.filter(
        (accountId): accountId is string =>
          typeof accountId === "string" && knownAccountIds.has(accountId),
      ),
    );
  } catch {
    return new Set<string>();
  }
}

function storeDisconnectedAccountIds(accountIds: Set<string>): void {
  try {
    window.sessionStorage.setItem(
      MOCK_DISCONNECTED_ACCOUNT_IDS_KEY,
      JSON.stringify([...accountIds]),
    );
  } catch {
    // 저장소를 사용할 수 없어도 현재 화면의 Mock 해제 흐름은 계속한다.
  }
}

export async function getConnectedAccounts(): Promise<Account[]> {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, MOCK_FETCH_DELAY_MS);
  });

  const disconnectedAccountIds = readDisconnectedAccountIds();
  return mockAccounts.filter(
    (account) => !disconnectedAccountIds.has(account.id),
  );
}

export async function updateDefaultAccount(accountId: string): Promise<string> {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, MOCK_UPDATE_DELAY_MS);
  });

  return accountId;
}

export async function disconnectAccount(accountId: string): Promise<string> {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, MOCK_DISCONNECT_DELAY_MS);
  });

  const accountExists = mockAccounts.some((account) => account.id === accountId);
  if (!accountExists) {
    throw new Error("Mock account not found");
  }

  const disconnectedAccountIds = readDisconnectedAccountIds();
  disconnectedAccountIds.add(accountId);
  storeDisconnectedAccountIds(disconnectedAccountIds);

  return accountId;
}

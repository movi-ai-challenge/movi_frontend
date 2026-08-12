import { mockAccounts } from "@/services/mockData";
import type { Account } from "@/types";

const MOCK_FETCH_DELAY_MS = 500;
const MOCK_UPDATE_DELAY_MS = 500;

export async function getConnectedAccounts(): Promise<Account[]> {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, MOCK_FETCH_DELAY_MS);
  });

  return mockAccounts;
}

export async function updateDefaultAccount(accountId: string): Promise<string> {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, MOCK_UPDATE_DELAY_MS);
  });

  return accountId;
}

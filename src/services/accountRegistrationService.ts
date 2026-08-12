import { mockAccounts } from "@/services/mockData";
import type { Account } from "@/types";

const MOCK_REGISTRATION_DELAY_MS = 700;

export function getPendingConnectedAccount(): Account | null {
  return mockAccounts[0] ?? null;
}

export async function registerConnectedAccount(
  account: Account,
): Promise<Account> {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, MOCK_REGISTRATION_DELAY_MS);
  });

  return account;
}

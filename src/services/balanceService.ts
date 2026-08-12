import { getConnectedAccounts } from "@/services/accountService";
import type { Account } from "@/types";

const MOCK_BALANCE_DELAY_MS = 600;

export async function getAccountBalance(accountId: string): Promise<Account> {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, MOCK_BALANCE_DELAY_MS);
  });

  const accounts = await getConnectedAccounts();
  const account = accounts.find((item) => item.id === accountId);

  if (!account) {
    throw new Error("Account not found");
  }

  return account;
}

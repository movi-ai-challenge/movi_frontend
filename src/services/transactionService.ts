import { mockTransactions } from "@/services/mockData";
import type { Transaction } from "@/types";

const MOCK_TRANSACTION_DELAY_MS = 600;

export async function getRecentTransactions(
  accountId: string,
): Promise<Transaction[]> {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, MOCK_TRANSACTION_DELAY_MS);
  });

  return mockTransactions
    .filter((transaction) => transaction.accountId === accountId)
    .sort(
      (first, second) =>
        new Date(second.occurredAt).getTime() -
        new Date(first.occurredAt).getTime(),
    );
}

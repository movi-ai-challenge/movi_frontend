import { mockTransactions } from "@/services/mockData";
import type { Transaction } from "@/types";

const MOCK_TRANSACTION_DELAY_MS = 600;

export async function getRecentTransactions(
  accountId: string,
  dateRange?: { startDate: string; endDate: string },
): Promise<Transaction[]> {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, MOCK_TRANSACTION_DELAY_MS);
  });

  return mockTransactions
    .filter((transaction) => {
      if (transaction.accountId !== accountId) return false;
      if (!dateRange) return true;

      const transactionDate = transaction.occurredAt.slice(0, 10);
      return (
        transactionDate >= dateRange.startDate &&
        transactionDate <= dateRange.endDate
      );
    })
    .sort(
      (first, second) =>
        new Date(second.occurredAt).getTime() -
        new Date(first.occurredAt).getTime(),
    );
}

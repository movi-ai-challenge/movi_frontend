import { api, isMockMode } from "@/services/api";
import {
  ApiResponseContractError,
  parseApiResponse,
} from "@/services/apiResponse";
import { mockTransactions } from "@/services/mockData";
import {
  isTransactionPageResponseData,
  isTransactionResponseData,
  mapTransactionPage,
  mapTransactionResponse,
} from "@/services/transactionContract";
import type {
  TransactionDetailResult,
  TransactionPage,
  TransactionType,
} from "@/types";

const TRANSACTIONS_PATH = "/api/transactions";
const DEFAULT_PAGE_SIZE = 20;
const MOCK_TRANSACTION_DELAY_MS = 600;

export interface TransactionQuery {
  accountId: string;
  startDate?: string;
  endDate?: string;
  type?: TransactionType;
  page?: number;
  size?: number;
}

function waitForMockResponse(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, MOCK_TRANSACTION_DELAY_MS);
  });
}

export async function getRecentTransactions(
  query: TransactionQuery,
): Promise<TransactionPage> {
  const page = query.page ?? 0;
  const size = query.size ?? DEFAULT_PAGE_SIZE;
  if (
    !Number.isInteger(page) ||
    page < 0 ||
    !Number.isInteger(size) ||
    size < 1 ||
    size > 100 ||
    (query.startDate && query.endDate && query.startDate > query.endDate)
  ) {
    throw new ApiResponseContractError("거래내역 조회 조건이 올바르지 않습니다.");
  }

  if (isMockMode) {
    await waitForMockResponse();
    const filtered = mockTransactions
      .filter((transaction) => {
        if (transaction.accountId !== query.accountId) return false;
        if (query.type && transaction.type !== query.type) return false;
        const transactionDate = transaction.occurredAt.slice(0, 10);
        if (query.startDate && transactionDate < query.startDate) return false;
        if (query.endDate && transactionDate > query.endDate) return false;
        return true;
      })
      .sort(
        (first, second) =>
          new Date(second.occurredAt).getTime() -
          new Date(first.occurredAt).getTime(),
      );
    const start = page * size;
    const transactions = filtered.slice(start, start + size);
    const totalPages = Math.ceil(filtered.length / size);
    return {
      transactions,
      page,
      size,
      totalElements: filtered.length,
      totalPages,
      hasNext: page + 1 < totalPages,
      voiceMessage:
        filtered.length === 0
          ? "그 기간에는 거래 내역이 없어요."
          : `거래가 ${filtered.length}건 있어요.`,
    };
  }

  const response = await api.get<unknown>(TRANSACTIONS_PATH, {
    params: {
      accountId: query.accountId,
      startDate: query.startDate,
      endDate: query.endDate,
      type: query.type,
      page,
      size,
    },
  });
  const parsed = parseApiResponse(
    response.data,
    isTransactionPageResponseData,
  );
  const result = mapTransactionPage(parsed.data, parsed.voiceMessage);
  if (
    result.transactions.some(
      (transaction) => transaction.accountId !== query.accountId,
    )
  ) {
    throw new ApiResponseContractError(
      "요청한 계좌와 거래내역 응답의 계좌 정보가 일치하지 않습니다.",
    );
  }
  return result;
}

export async function getTransactionDetail(
  transactionId: string,
): Promise<TransactionDetailResult | null> {
  if (isMockMode) {
    await waitForMockResponse();
    const transaction = mockTransactions.find(
      (item) => item.id === transactionId,
    );
    if (!transaction) return null;
    return {
      transaction,
      voiceMessage: `${transaction.description} 거래는 ${transaction.amount.toLocaleString("ko-KR")}원입니다.`,
    };
  }

  if (!/^[1-9]\d*$/.test(transactionId)) return null;

  const response = await api.get<unknown>(
    `${TRANSACTIONS_PATH}/${encodeURIComponent(transactionId)}`,
  );
  const parsed = parseApiResponse(response.data, isTransactionResponseData);
  if (!parsed.voiceMessage?.trim()) {
    throw new ApiResponseContractError(
      "거래 상세 음성 안내가 응답에 포함되지 않았습니다.",
    );
  }
  return {
    transaction: mapTransactionResponse(parsed.data),
    voiceMessage: parsed.voiceMessage,
  };
}

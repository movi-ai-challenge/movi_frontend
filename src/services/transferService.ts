import { api, isMockMode } from "@/services/api";
import { ApiResponseContractError, parseApiResponse } from "@/services/apiResponse";
import {
  isTransferResultResponseData,
  isTransferReviewResponseData,
  isTransferStatusResponseData,
  mapTransferResultResponse,
  mapTransferReviewResponse,
  mapTransferStatusResponse,
} from "@/services/transferContract";
import { isValidIdempotencyKey } from "@/services/transferRecoveryStorage";
import { mockAccounts, mockRegisteredRecipients } from "@/services/mockData";
import type {
  DirectTransferResult,
  DirectTransferReview,
  TransferStatusResult,
} from "@/types";

const TRANSFERS_PATH = "/api/transfers";
const TRANSFER_REVIEW_PATH = `${TRANSFERS_PATH}/review`;
const TRANSFER_STATUS_PATH = "/api/transfers/status";
const MOCK_DELAY_MS = 500;

interface ReviewTransferInput {
  recipientId: string;
  amount: number;
  fromAccountId: string | null;
}

function parsePositiveBackendId(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new ApiResponseContractError("유효하지 않은 송금 대상 ID입니다.");
  }
  return parsed;
}

function createIdempotencyKey(): string {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    throw new ApiResponseContractError(
      "안전한 송금 요청 키를 만들 수 없는 브라우저입니다.",
    );
  }
  return crypto.randomUUID();
}

function waitForMockResponse(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, MOCK_DELAY_MS);
  });
}

export async function reviewDirectTransfer(
  input: ReviewTransferInput,
): Promise<DirectTransferReview> {
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    throw new ApiResponseContractError("송금 금액은 1원 이상이어야 합니다.");
  }
  const idempotencyKey = createIdempotencyKey();

  if (isMockMode) {
    await waitForMockResponse();
    const recipient = mockRegisteredRecipients.find(
      (item) => item.id === input.recipientId,
    );
    const account =
      mockAccounts.find((item) => item.id === input.fromAccountId) ??
      mockAccounts.find((item) => item.isPrimary) ??
      mockAccounts[0];
    if (!recipient || !account) {
      throw new ApiResponseContractError("Mock 송금 대상을 찾지 못했습니다.");
    }
    return mapTransferReviewResponse(
      {
        confirmationId: `mock-confirmation-${Date.now()}`,
        fromAccount: {
          accountId: account.id,
          alias: account.accountAlias,
          bankName: account.bankName,
        },
        recipient: {
          recipientId: recipient.id,
          nickname: recipient.nickname,
          holderName: recipient.holderName,
          maskedAccountNumber: recipient.maskedAccountNumber,
        },
        amount: input.amount,
        expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      },
      `${recipient.nickname} 님에게 ${input.amount.toLocaleString("ko-KR")}원을 보낼까요?`,
      idempotencyKey,
    );
  }

  const recipientId = parsePositiveBackendId(input.recipientId);
  const fromAccountId = parsePositiveBackendId(input.fromAccountId);
  const response = await api.post<unknown>(TRANSFER_REVIEW_PATH, {
    recipientId,
    amount: input.amount,
    fromAccountId,
  });
  const parsed = parseApiResponse(response.data, isTransferReviewResponseData);
  return mapTransferReviewResponse(
    parsed.data,
    parsed.voiceMessage,
    idempotencyKey,
  );
}

export async function executeDirectTransfer(
  review: DirectTransferReview,
): Promise<DirectTransferResult> {
  if (!review.confirmationId.trim()) {
    throw new ApiResponseContractError("유효하지 않은 송금 확인 ID입니다.");
  }
  if (!isValidIdempotencyKey(review.idempotencyKey)) {
    throw new ApiResponseContractError("유효하지 않은 송금 멱등성 키입니다.");
  }

  if (isMockMode) {
    await waitForMockResponse();
    return mapTransferResultResponse(
      {
        transferId: Date.now(),
        status: "COMPLETED",
        riskLevel: "LOW",
        amount: review.amount,
        recipientName: review.recipient.holderName,
        completedAt: new Date().toISOString(),
      },
      `${review.recipient.holderName} 님에게 송금을 완료했습니다.`,
      review.idempotencyKey,
    );
  }

  const response = await api.post<unknown>(TRANSFERS_PATH, {
    confirmationId: review.confirmationId,
    idempotencyKey: review.idempotencyKey,
  });
  const parsed = parseApiResponse(response.data, isTransferResultResponseData);
  return mapTransferResultResponse(
    parsed.data,
    parsed.voiceMessage,
    review.idempotencyKey,
  );
}

export async function getTransferStatus(
  idempotencyKey: string,
): Promise<TransferStatusResult> {
  if (!isValidIdempotencyKey(idempotencyKey)) {
    throw new ApiResponseContractError("유효하지 않은 송금 멱등성 키입니다.");
  }
  if (isMockMode) {
    throw new ApiResponseContractError(
      "실제 송금 상태는 실제 API 모드에서만 확인할 수 있습니다.",
    );
  }

  const response = await api.get<unknown>(TRANSFER_STATUS_PATH, {
    params: { idempotencyKey },
  });
  const parsed = parseApiResponse(response.data, isTransferStatusResponseData);
  return mapTransferStatusResponse(parsed.data, parsed.voiceMessage);
}

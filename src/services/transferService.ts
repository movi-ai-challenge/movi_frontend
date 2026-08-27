import { api, isMockMode } from "@/services/api";
import { ApiResponseContractError, parseApiResponse } from "@/services/apiResponse";
import {
  isTransferStatusResponseData,
  mapTransferStatusResponse,
} from "@/services/transferContract";
import { isValidIdempotencyKey } from "@/services/transferRecoveryStorage";
import type { TransferStatusResult } from "@/types";

const TRANSFER_STATUS_PATH = "/api/transfers/status";

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

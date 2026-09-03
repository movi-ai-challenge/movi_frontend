import { api, isMockMode } from "@/services/api";
import { parseApiData } from "@/services/apiResponse";
import { mockRegisteredRecipients } from "@/services/mockData";
import {
  isRecipientListResponseData,
  isRecipientResponseDataExported,
  mapRecipientListResponse,
  mapRecipientResponse,
} from "@/services/transferContract";
import type { RegisteredRecipient } from "@/types";

const RECIPIENTS_PATH = "/api/transfers/recipients";
const MOCK_RECIPIENT_DELAY_MS = 500;

export async function getRegisteredRecipients(): Promise<
  RegisteredRecipient[]
> {
  if (isMockMode) {
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, MOCK_RECIPIENT_DELAY_MS);
    });
    return mockRegisteredRecipients;
  }

  const response = await api.get<unknown>(RECIPIENTS_PATH);
  return mapRecipientListResponse(
    parseApiData(response.data, isRecipientListResponseData),
  );
}

export interface RecipientRegisterInput {
  name: string;
  accountNumber: string;
}

/**
 * 상대방 등록.
 *
 * <p>은행과 예금주는 보내지 않는다. 서버가 연결된 계좌에서 찾아 채운다 — 사람이 옮겨 적으면
 * 틀리고, 틀린 은행으로 저장되면 음성 송금이 엉뚱한 곳으로 간다.
 */
export async function registerRecipient(
  input: RecipientRegisterInput,
): Promise<RegisteredRecipient> {
  if (isMockMode) {
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, MOCK_RECIPIENT_DELAY_MS);
    });
    return {
      id: `recipient-mock-${Date.now()}`,
      nickname: input.name,
      holderName: input.name,
      bankCode: "090",
      maskedAccountNumber: `***-****-${input.accountNumber.slice(-4)}`,
      transferCount: 0,
    };
  }

  const response = await api.post<unknown>(RECIPIENTS_PATH, input);
  return mapRecipientResponse(
    parseApiData(response.data, isRecipientResponseDataExported),
  );
}

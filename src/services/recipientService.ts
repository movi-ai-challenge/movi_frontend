import { api, isMockMode } from "@/services/api";
import { parseApiData } from "@/services/apiResponse";
import { mockRegisteredRecipients } from "@/services/mockData";
import {
  isRecipientListResponseData,
  mapRecipientListResponse,
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

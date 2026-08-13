import { mockRegisteredRecipients } from "@/services/mockData";
import type { RegisteredRecipient } from "@/types";

const MOCK_RECIPIENT_DELAY_MS = 500;

export async function getRegisteredRecipients(): Promise<
  RegisteredRecipient[]
> {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, MOCK_RECIPIENT_DELAY_MS);
  });

  return mockRegisteredRecipients;
}

import type { AccountDisconnectionVerification } from "@/types";

const MOCK_REAUTHENTICATION_DELAY_MS = 700;

export async function verifyAccountDisconnection(
  accountId: string,
): Promise<AccountDisconnectionVerification> {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, MOCK_REAUTHENTICATION_DELAY_MS);
  });

  return {
    accountId,
    verifiedAt: new Date().toISOString(),
  };
}

import type { GuardianConnectionRequest } from "@/types";

const MOCK_GUARDIAN_CONNECTION_DELAY_MS = 800;

function maskPhoneNumber(phoneNumber: string): string {
  const digits = phoneNumber.replace(/\D/g, "");
  const prefixLength = 3;
  const suffixLength = 4;
  const prefix = digits.slice(0, prefixLength);
  const suffix = digits.slice(-suffixLength);

  return `${prefix}-${"*".repeat(digits.length - prefixLength - suffixLength)}-${suffix}`;
}

export async function requestGuardianConnection(
  phoneNumber: string,
): Promise<GuardianConnectionRequest> {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, MOCK_GUARDIAN_CONNECTION_DELAY_MS);
  });

  return {
    id: "guardian-request-demo-1",
    maskedPhoneNumber: maskPhoneNumber(phoneNumber),
    status: "pending",
    requestedAt: new Date().toISOString(),
  };
}

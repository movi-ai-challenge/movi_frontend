import type { GuardianConnectionInvitation } from "@/types";

const MOCK_INVITATION_DELAY_MS = 700;
const DEMO_INVITATION_ID = "guardian-request-demo-1";
const EXPIRED_INVITATION_ID = "guardian-request-expired-demo";

function waitForMockResponse(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, MOCK_INVITATION_DELAY_MS);
  });
}

function createMockInvitation(
  id: string,
  status: GuardianConnectionInvitation["status"],
): GuardianConnectionInvitation {
  const now = Date.now();

  return {
    id,
    requesterDisplayName: "모비 사용자",
    status,
    requestedAt: new Date(now - 60 * 60 * 1_000).toISOString(),
    expiresAt: new Date(now + 24 * 60 * 60 * 1_000).toISOString(),
  };
}

export async function getGuardianConnectionInvitation(
  requestId: string,
): Promise<GuardianConnectionInvitation | null> {
  await waitForMockResponse();

  if (requestId === DEMO_INVITATION_ID) {
    return createMockInvitation(requestId, "pending");
  }

  if (requestId === EXPIRED_INVITATION_ID) {
    return createMockInvitation(requestId, "expired");
  }

  return null;
}

export async function reviewGuardianConnectionInvitation(
  invitation: GuardianConnectionInvitation,
): Promise<GuardianConnectionInvitation> {
  await waitForMockResponse();

  return { ...invitation, status: "reviewed" };
}

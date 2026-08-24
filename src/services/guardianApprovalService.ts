import type { GuardianConnectionApprovalRequest } from "@/types";

const MOCK_APPROVAL_DELAY_MS = 700;
const DEMO_REQUEST_ID = "guardian-request-demo-1";
const EXPIRED_REQUEST_ID = "guardian-request-expired-demo";
const APPROVED_REQUEST_ID = "guardian-request-approved-demo";
const UNVERIFIED_REQUEST_ID = "guardian-request-unverified-demo";

function waitForMockResponse(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, MOCK_APPROVAL_DELAY_MS);
  });
}

function createMockApprovalRequest(
  id: string,
  options?: {
    status?: GuardianConnectionApprovalRequest["status"];
    identityVerified?: boolean;
  },
): GuardianConnectionApprovalRequest {
  const now = Date.now();

  return {
    id,
    requesterDisplayName: "모비 사용자",
    status: options?.status ?? "awaiting-approval",
    identityVerified: options?.identityVerified ?? true,
    reviewedAt: new Date(now - 10 * 60 * 1_000).toISOString(),
    expiresAt: new Date(now + 24 * 60 * 60 * 1_000).toISOString(),
  };
}

export async function getGuardianConnectionApprovalRequest(
  requestId: string,
): Promise<GuardianConnectionApprovalRequest | null> {
  await waitForMockResponse();

  if (requestId === DEMO_REQUEST_ID) {
    return createMockApprovalRequest(requestId);
  }

  if (requestId === EXPIRED_REQUEST_ID) {
    return createMockApprovalRequest(requestId, { status: "expired" });
  }

  if (requestId === APPROVED_REQUEST_ID) {
    return createMockApprovalRequest(requestId, { status: "approved" });
  }

  if (requestId === UNVERIFIED_REQUEST_ID) {
    return createMockApprovalRequest(requestId, { identityVerified: false });
  }

  return null;
}

export async function approveGuardianConnection(
  request: GuardianConnectionApprovalRequest,
): Promise<GuardianConnectionApprovalRequest> {
  await waitForMockResponse();

  if (!request.identityVerified || request.status !== "awaiting-approval") {
    throw new Error("Guardian request is not eligible for approval");
  }

  return { ...request, status: "approved" };
}

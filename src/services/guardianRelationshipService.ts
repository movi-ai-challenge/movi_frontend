import type { GuardianRelationshipSetup } from "@/types";

const MOCK_RELATIONSHIP_DELAY_MS = 700;
const DEMO_REQUEST_ID = "guardian-request-demo-1";
const UNAPPROVED_REQUEST_ID = "guardian-request-unapproved-demo";
const SAVED_REQUEST_ID = "guardian-request-relationship-saved-demo";
const EXPIRED_REQUEST_ID = "guardian-request-expired-demo";

function waitForMockResponse(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, MOCK_RELATIONSHIP_DELAY_MS);
  });
}

function createMockSetup(
  id: string,
  status: GuardianRelationshipSetup["status"],
  relationship: string | null = null,
): GuardianRelationshipSetup {
  return {
    id,
    requesterDisplayName: "모비 사용자",
    status,
    relationship,
  };
}

export async function getGuardianRelationshipSetup(
  requestId: string,
): Promise<GuardianRelationshipSetup | null> {
  await waitForMockResponse();

  if (requestId === DEMO_REQUEST_ID) {
    return createMockSetup(requestId, "awaiting-relationship");
  }

  if (requestId === UNAPPROVED_REQUEST_ID) {
    return createMockSetup(requestId, "awaiting-approval");
  }

  if (requestId === SAVED_REQUEST_ID) {
    return createMockSetup(requestId, "relationship-saved", "부모");
  }

  if (requestId === EXPIRED_REQUEST_ID) {
    return createMockSetup(requestId, "expired");
  }

  return null;
}

export async function saveGuardianRelationship(
  setup: GuardianRelationshipSetup,
  relationship: string,
): Promise<GuardianRelationshipSetup> {
  await waitForMockResponse();

  if (setup.status !== "awaiting-relationship" || !relationship.trim()) {
    throw new Error("Guardian relationship cannot be saved");
  }

  return {
    ...setup,
    status: "relationship-saved",
    relationship: relationship.trim(),
  };
}

import type {
  GuardianRiskAlertDeliveryStatus,
  GuardianRiskAlertRecord,
} from "@/types";

const MOCK_STATUS_DELAY_MS = 700;
const LOAD_ERROR_EVENT_ID = "risk-event-load-error-demo";

const mockEventStatuses: Readonly<
  Record<string, GuardianRiskAlertDeliveryStatus>
> = {
  "risk-event-demo-1": "sent",
  "risk-event-sent-demo": "sent",
  "risk-event-pending-demo": "pending",
  "risk-event-failed-demo": "failed",
  "risk-event-retry-demo": "retrying",
  "risk-event-retrying-demo": "retrying",
};

function waitForMockResponse(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, MOCK_STATUS_DELAY_MS);
  });
}

function createMockRecord(
  riskEventId: string,
  status: GuardianRiskAlertDeliveryStatus,
): GuardianRiskAlertRecord {
  const now = Date.now();

  return {
    riskEventId,
    summary: "평소와 다른 거래 패턴이 감지되었습니다.",
    detectedAt: new Date(now - 5 * 60 * 1_000).toISOString(),
    status,
    lastAttemptedAt:
      status === "pending" ? null : new Date(now - 2 * 60 * 1_000).toISOString(),
  };
}

export async function getGuardianRiskAlertRecord(
  riskEventId: string,
): Promise<GuardianRiskAlertRecord | null> {
  await waitForMockResponse();

  if (riskEventId === LOAD_ERROR_EVENT_ID) {
    throw new Error("Mock guardian alert status load failure");
  }

  const status = mockEventStatuses[riskEventId];
  return status ? createMockRecord(riskEventId, status) : null;
}

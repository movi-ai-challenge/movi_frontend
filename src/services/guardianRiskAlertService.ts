import type {
  GuardianRiskAlertDelivery,
  GuardianRiskAlertTarget,
} from "@/types";

const MOCK_ALERT_DELAY_MS = 800;
const DEMO_RISK_EVENT_ID = "risk-event-demo-1";
const RETRY_RISK_EVENT_ID = "risk-event-retry-demo";

const deliveryRequests = new Map<
  string,
  Promise<GuardianRiskAlertDelivery>
>();
const failedOnceRiskEvents = new Set<string>();

function waitForMockResponse(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, MOCK_ALERT_DELAY_MS);
  });
}

function createMockTarget(id: string): GuardianRiskAlertTarget {
  return {
    id,
    summary: "평소와 다른 거래 패턴이 감지되었습니다.",
    detectedAt: new Date().toISOString(),
  };
}

export async function getGuardianRiskAlertTarget(
  riskEventId: string,
): Promise<GuardianRiskAlertTarget | null> {
  await waitForMockResponse();

  if (
    riskEventId === DEMO_RISK_EVENT_ID ||
    riskEventId === RETRY_RISK_EVENT_ID
  ) {
    return createMockTarget(riskEventId);
  }

  return null;
}

export function sendGuardianRiskAlert(
  target: GuardianRiskAlertTarget,
): Promise<GuardianRiskAlertDelivery> {
  const existingRequest = deliveryRequests.get(target.id);
  if (existingRequest) return existingRequest;

  const request = (async () => {
    await waitForMockResponse();

    if (
      target.id === RETRY_RISK_EVENT_ID &&
      !failedOnceRiskEvents.has(target.id)
    ) {
      failedOnceRiskEvents.add(target.id);
      throw new Error("Mock guardian alert delivery failure");
    }

    return {
      id: `guardian-alert-${target.id}`,
      riskEventId: target.id,
      status: "sent" as const,
      sentAt: new Date().toISOString(),
    };
  })();

  deliveryRequests.set(target.id, request);
  void request.catch(() => {
    deliveryRequests.delete(target.id);
  });
  return request;
}

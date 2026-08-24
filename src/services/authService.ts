import type { AuthSession, MockAuthenticationMethod } from "@/types";

const MOCK_AUTHENTICATION_DELAY_MS = 700;
const MOCK_LOGOUT_DELAY_MS = 300;

function waitForMockResponse(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

export async function authenticateWithMock(
  method: MockAuthenticationMethod,
): Promise<AuthSession> {
  await waitForMockResponse(MOCK_AUTHENTICATION_DELAY_MS);

  return {
    userId: "user-demo",
    displayName: "모비 사용자",
    method,
    authenticatedAt: new Date().toISOString(),
  };
}

export async function logoutMockSession(): Promise<void> {
  await waitForMockResponse(MOCK_LOGOUT_DELAY_MS);
}

const MOCK_TRANSFER_DELAY_MS = 1_000;

export async function executeLowRiskTransfer(): Promise<void> {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, MOCK_TRANSFER_DELAY_MS);
  });
}

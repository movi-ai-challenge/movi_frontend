const MOCK_FDS_DELAY_MS = 1_000;

export async function requestFdsEvaluation(): Promise<void> {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, MOCK_FDS_DELAY_MS);
  });
}

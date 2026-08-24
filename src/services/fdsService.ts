import type { FdsEvaluationResult } from "@/types";

const MOCK_FDS_DELAY_MS = 1_000;

export async function requestFdsEvaluation(): Promise<FdsEvaluationResult> {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, MOCK_FDS_DELAY_MS);
  });

  return {
    riskLevel: "low",
    summary: "평소 거래와 비슷해 낮은 위험으로 확인했습니다.",
  };
}

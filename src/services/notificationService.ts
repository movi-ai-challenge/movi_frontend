import { mockFdsAlerts } from "@/services/mockData";
import type { FdsAlert } from "@/types";

const MOCK_FETCH_DELAY_MS = 400;

/**
 * 알림 목록 조회 (명세 10.1 이체 완료 / 10.3 긴급 위험 / 10.4 알림 클릭 이동)
 *
 * 최근 발생 순으로 정렬해 돌려준다.
 */
export async function getNotifications(): Promise<FdsAlert[]> {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, MOCK_FETCH_DELAY_MS);
  });

  return [...mockFdsAlerts].sort(
    (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime(),
  );
}

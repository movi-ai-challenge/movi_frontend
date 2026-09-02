import { api, isMockMode } from "@/services/api";
import { ApiResponseContractError, parseApiData } from "@/services/apiResponse";
import {
  isNotificationList,
  type NotificationData,
} from "@/services/notificationContract";

const NOTIFICATIONS_PATH = "/api/v1/notifications";

interface NotificationPageData {
  content: NotificationData[];
}

function isNotificationPageData(value: unknown): value is NotificationPageData {
  if (typeof value !== "object" || value === null) return false;

  return isNotificationList((value as { content?: unknown }).content);
}

/**
 * 내 보호자 알림 발송 기록.
 *
 * 위험 이체 때 보호자에게 문자가 실제로 나갔는지 확인하는 데 쓴다. 알림은 송금과
 * 별도 트랜잭션에서 지연 발송되므로 이체 직후에는 아직 없을 수 있다.
 */
export async function getNotifications(): Promise<NotificationData[]> {
  if (isMockMode) {
    throw new ApiResponseContractError(
      "보호자 알림 기록은 실제 API 모드에서만 확인할 수 있습니다.",
    );
  }

  const response = await api.get<unknown>(NOTIFICATIONS_PATH, {
    params: { page: 0, size: 20 },
  });
  return parseApiData(response.data, isNotificationPageData).content;
}

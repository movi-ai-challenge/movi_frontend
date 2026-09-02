/**
 * 보호자 알림 발송 기록 계약.
 *
 * 이체가 위험하다고 판정되면 보호자에게 문자가 나간다. 사용자는 "정말 갔는지"를
 * 알고 싶어 하고, 그 답을 사람에게 물어보지 않고 화면에서 확인할 수 있어야 한다.
 */

export type NotificationStatus = "QUEUED" | "SENT" | "FAILED";

export interface NotificationData {
  notificationId: number | string;
  /** 어느 이체 때문에 나간 알림인지. 이체 결과 화면이 이 값으로 자기 건을 찾는다. */
  transferId: number | string | null;
  guardianName: string | null;
  maskedGuardianPhone: string | null;
  status: NotificationStatus;
  sentAt: string | null;
  retryCount: number;
  nextRetryAt: string | null;
}

const statuses = new Set<NotificationStatus>(["QUEUED", "SENT", "FAILED"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isId(value: unknown): boolean {
  return typeof value === "number" || typeof value === "string";
}

export function isNotificationData(value: unknown): value is NotificationData {
  if (!isRecord(value)) return false;

  return (
    isId(value.notificationId) &&
    (value.transferId === null || value.transferId === undefined || isId(value.transferId)) &&
    statuses.has(value.status as NotificationStatus) &&
    typeof value.retryCount === "number" &&
    Number.isFinite(value.retryCount)
  );
}

export function isNotificationList(value: unknown): value is NotificationData[] {
  return Array.isArray(value) && value.every(isNotificationData);
}

/**
 * 이 이체 때문에 나간 알림을 찾는다.
 *
 * 알림은 송금과 별도 트랜잭션에서 지연 발송되므로, 결과 화면을 여는 시점에는
 * 아직 없을 수 있다. 없으면 null 이고 화면은 아무것도 주장하지 않는다 --
 * 나가지 않은 알림을 "전송 완료"로 보여 주면 사용자가 잘못 안심한다.
 */
export function findNotificationForTransfer(
  notifications: readonly NotificationData[],
  transferId: string,
): NotificationData | null {
  return (
    notifications.find(
      (notification) =>
        notification.transferId !== null &&
        notification.transferId !== undefined &&
        String(notification.transferId) === transferId,
    ) ?? null
  );
}

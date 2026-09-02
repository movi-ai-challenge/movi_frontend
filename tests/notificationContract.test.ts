import assert from "node:assert/strict";
import { test } from "node:test";

import {
  findNotificationForTransfer,
  isNotificationData,
  isNotificationList,
  type NotificationData,
} from "../src/services/notificationContract.ts";

const sent: NotificationData = {
  notificationId: 1,
  transferId: 4,
  guardianName: "김보호",
  maskedGuardianPhone: "010-****-7491",
  status: "SENT",
  sentAt: "2026-09-02T13:53:52",
  retryCount: 0,
  nextRetryAt: null,
};

test("발송 기록을 읽는다", () => {
  assert.equal(isNotificationData(sent), true);
  assert.equal(isNotificationList([sent]), true);
});

test("미가입 보호자 건은 수신자가 비어 있어도 읽는다", () => {
  // 초대 수락 전에는 notification.user 가 null 이다. 그 건이 빠지면
  // 정작 확인해야 할 시연 구간 알림이 안 보인다.
  assert.equal(isNotificationData({ ...sent, guardianName: null }), true);
});

test("이체 번호로 자기 알림을 찾는다", () => {
  const found = findNotificationForTransfer([sent], "4");

  assert.equal(found?.notificationId, 1);
});

test("다른 이체의 알림은 가져오지 않는다", () => {
  // 남의 이체 알림을 이 화면 결과로 보여 주면 사용자가 잘못 안심한다.
  assert.equal(findNotificationForTransfer([sent], "99"), null);
});

test("아직 알림이 없으면 없다고 답한다", () => {
  // 알림은 지연 발송이라 결과 화면을 여는 시점에 없을 수 있다.
  assert.equal(findNotificationForTransfer([], "4"), null);
});

test("이체 번호가 없는 알림은 건너뛴다", () => {
  const orphan = { ...sent, transferId: null };

  assert.equal(findNotificationForTransfer([orphan], "4"), null);
});

test("모르는 상태값은 거부한다", () => {
  assert.equal(isNotificationData({ ...sent, status: "UNKNOWN" }), false);
});

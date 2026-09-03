import assert from "node:assert/strict";
import test from "node:test";

import {
  isRecipientListResponseData,
  isTransferResultResponseData,
  isTransferReviewResponseData,
  isTransferStatusResponseData,
  mapRecipientListResponse,
  mapRecipientResponse,
  mapTransferResultResponse,
  mapTransferReviewResponse,
  mapTransferStatusResponse,
  validateRecipientAccountNumber,
  validateRecipientName,
} from "../src/services/transferContract.ts";
import type { TransferStatusResponseData } from "../src/services/transferContract.ts";

const completed: TransferStatusResponseData = {
  transferId: 91,
  status: "COMPLETED",
  riskLevel: "MEDIUM",
  amount: 50_000,
  recipientName: "김영희",
  requestedAt: "2026-08-27T12:00:00",
  completedAt: "2026-08-27T12:00:02",
};

const recipientList = {
  totalCount: 1,
  recipients: [
    {
      recipientId: 3,
      nickname: "엄마",
      holderName: "김영희",
      bankCode: "090",
      maskedAccountNumber: "***-***-1234",
      transferCount: 2,
    },
  ],
};

const review = {
  confirmationId: "confirmation-123",
  fromAccount: { accountId: 11, alias: "생활비", bankName: "모비은행" },
  recipient: {
    recipientId: 3,
    nickname: "엄마",
    holderName: "김영희",
    maskedAccountNumber: "***-***-1234",
  },
  amount: 50_000,
  expiresAt: "2026-08-27T12:05:00",
};

const idempotencyKey = "c14c5b4d-a394-4d67-8788-bc716e5a60b6";

test("등록 수취인 목록을 검증하고 마스킹 정보만 화면 모델로 매핑한다", () => {
  assert.equal(isRecipientListResponseData(recipientList), true);
  if (!isRecipientListResponseData(recipientList)) assert.fail("유효한 fixture");
  assert.deepEqual(mapRecipientListResponse(recipientList), [
    {
      id: "3",
      nickname: "엄마",
      holderName: "김영희",
      bankCode: "090",
      maskedAccountNumber: "***-***-1234",
      transferCount: 2,
    },
  ]);
  assert.equal(
    isRecipientListResponseData({ ...recipientList, totalCount: 2 }),
    false,
  );
});

test("서버 송금 검토와 프런트 멱등성 키를 한 검토 모델로 보존한다", () => {
  assert.equal(isTransferReviewResponseData(review), true);
  if (!isTransferReviewResponseData(review)) assert.fail("유효한 fixture");
  const mapped = mapTransferReviewResponse(
    review,
    "생활비에서 엄마 님에게 5만원을 보낼까요?",
    idempotencyKey,
  );
  assert.equal(mapped.fromAccount.accountId, "11");
  assert.equal(mapped.recipient.recipientId, "3");
  assert.equal(mapped.idempotencyKey, idempotencyKey);
  assert.throws(() => mapTransferReviewResponse(review, null, idempotencyKey));
});

test("직접 송금 실행 결과의 상태와 FDS 위험도를 그대로 매핑한다", () => {
  const result = {
    transferId: 91,
    status: "COMPLETED" as const,
    riskLevel: "LOW" as const,
    amount: 50_000,
    recipientName: "김영희",
    completedAt: "2026-08-27T12:00:02",
    riskReasons: ["처음 보내는 계좌예요"],
  };
  assert.equal(isTransferResultResponseData(result), true);
  if (!isTransferResultResponseData(result)) assert.fail("유효한 fixture");
  assert.deepEqual(
    mapTransferResultResponse(result, "김영희 님에게 송금을 완료했습니다.", idempotencyKey),
    {
      ...result,
      transferId: "91",
      idempotencyKey,
      voiceMessage: "김영희 님에게 송금을 완료했습니다.",
    },
  );
  assert.equal(
    isTransferResultResponseData({ ...result, riskLevel: "HIGH" }),
    false,
  );
});

test("실제 송금 상태와 FDS 결과를 화면 모델로 매핑한다", () => {
  assert.equal(isTransferStatusResponseData(completed), true);
  if (!isTransferStatusResponseData(completed)) assert.fail("유효한 fixture");
  assert.deepEqual(
    mapTransferStatusResponse(completed, "김영희 님에게 5만원을 보냈습니다."),
    {
      ...completed,
      transferId: "91",
      voiceMessage: "김영희 님에게 5만원을 보냈습니다.",
    },
  );
});

test("고위험 완료와 저위험 차단처럼 모순된 FDS 결과를 거부한다", () => {
  assert.equal(
    isTransferStatusResponseData({ ...completed, riskLevel: "HIGH" }),
    false,
  );
  assert.equal(
    isTransferStatusResponseData({
      ...completed,
      status: "BLOCKED",
      riskLevel: "LOW",
    }),
    false,
  );
});

test("완료 시각이 없거나 음성 안내가 없는 완료 응답을 거부한다", () => {
  assert.equal(
    isTransferStatusResponseData({ ...completed, completedAt: null }),
    false,
  );
  assert.throws(() => mapTransferStatusResponse(completed, null));
});

test("위험 근거가 없어도 결과를 받는다", () => {
  // FDS 가 아무 신호도 잡지 않은 거래가 있다. 근거가 비어 있다고 결과를
  // 버리면 정상 송금이 화면에 뜨지 않는다.
  const result = {
    transferId: 92,
    status: "COMPLETED" as const,
    riskLevel: "LOW" as const,
    amount: 10_000,
    recipientName: "김영희",
    completedAt: "2026-08-27T12:00:02",
  };

  assert.equal(isTransferResultResponseData(result), true);
  if (!isTransferResultResponseData(result)) assert.fail("유효한 fixture");
  assert.deepEqual(
    mapTransferResultResponse(result, "보냈어요.", idempotencyKey).riskReasons,
    [],
  );
});

test("근거에 문자열이 아닌 값이 섞이면 거부한다", () => {
  // 화면이 그대로 그리는 값이라 형태가 어긋나면 렌더링이 깨진다.
  const result = {
    transferId: 93,
    status: "COMPLETED" as const,
    riskLevel: "LOW" as const,
    amount: 10_000,
    recipientName: "김영희",
    completedAt: "2026-08-27T12:00:02",
    riskReasons: ["정상", 42],
  };

  assert.equal(isTransferResultResponseData(result), false);
});

test("상대방 이름은 앞뒤 공백만 털어내고 그대로 쓴다", () => {
  // 음성으로 부를 말이라 사용자가 적은 형태를 바꾸지 않는다.
  assert.equal(validateRecipientName("  엄마 "), "엄마");
  assert.equal(validateRecipientName("김 민수"), "김 민수");
});

test("빈 이름과 50자를 넘는 이름은 거부한다", () => {
  assert.equal(validateRecipientName("   "), null);
  assert.equal(validateRecipientName("가".repeat(51)), null);
  assert.equal(validateRecipientName("가".repeat(50)), "가".repeat(50));
});

test("계좌번호에서 하이픈과 공백을 지운다", () => {
  // 사람이 읽으려고 넣은 구분자다. 서버는 숫자만 본다.
  assert.equal(validateRecipientAccountNumber("123456-78-901234"), "12345678901234");
  assert.equal(validateRecipientAccountNumber(" 123 456 789 "), "123456789");
});

test("여섯 자리보다 짧은 계좌번호는 서버로 보내지 않는다", () => {
  // 앞자리가 짧으면 어느 계좌인지 특정할 수 없어 서버가 어차피 거절한다.
  assert.equal(validateRecipientAccountNumber("12345"), null);
  assert.equal(validateRecipientAccountNumber("123456"), "123456");
  assert.equal(validateRecipientAccountNumber("숫자없음"), null);
});

test("등록 응답 한 건을 화면이 쓰는 형태로 바꾼다", () => {
  const saved = mapRecipientResponse({
    recipientId: 77,
    nickname: " 엄마 ",
    holderName: " 김영희 ",
    bankCode: " 004 ",
    maskedAccountNumber: "123-****-5678",
    transferCount: 0,
  });

  assert.deepEqual(saved, {
    id: "77",
    nickname: "엄마",
    holderName: "김영희",
    bankCode: "004",
    maskedAccountNumber: "123-****-5678",
    transferCount: 0,
  });
});

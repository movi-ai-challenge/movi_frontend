import { api, isMockMode } from "@/services/api";
import { parseApiData } from "@/services/apiResponse";
import { mockRegisteredRecipients } from "@/services/mockData";
import {
  isRecipientListResponseData,
  isRecipientResponseDataExported,
  mapRecipientListResponse,
  mapRecipientResponse,
} from "@/services/transferContract";
import type { RegisteredRecipient } from "@/types";

const RECIPIENTS_PATH = "/api/transfers/recipients";
const BANKS_PATH = "/api/transfers/banks";
const MOCK_RECIPIENT_DELAY_MS = 500;

export async function getRegisteredRecipients(): Promise<
  RegisteredRecipient[]
> {
  if (isMockMode) {
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, MOCK_RECIPIENT_DELAY_MS);
    });
    return mockRegisteredRecipients;
  }

  const response = await api.get<unknown>(RECIPIENTS_PATH);
  return mapRecipientListResponse(
    parseApiData(response.data, isRecipientListResponseData),
  );
}

export interface Bank {
  code: string;
  name: string;
}

/**
 * 고를 수 있는 은행 목록.
 *
 * 화면이 목록을 따로 적어 두면 백엔드에서 코드를 고쳤을 때 옛 코드를 그대로 보내게 된다.
 * 계좌번호 앞자리로 은행을 추정하지 않기로 한 이상, 선택지는 백엔드가 준다.
 */
export async function getBanks(): Promise<Bank[]> {
  if (isMockMode) {
    return MOCK_BANKS;
  }

  const response = await api.get<unknown>(BANKS_PATH);
  return parseApiData(response.data, isBankListResponseData).banks;
}

export interface RecipientRegisterInput {
  name: string;
  bankCode: string;
  accountNumber: string;
}

/**
 * 상대방 등록.
 *
 * 은행은 사용자가 고른 코드를 그대로 보낸다. 계좌번호 앞자리로 추정하면 앞자리가 같은 다른
 * 은행 계좌가 걸린다.
 *
 * 예금주는 보내지 않는다. 서버가 예금주조회로 확인한 이름만 쓴다 — 사람이 옮겨 적은 이름이
 * 확인 복창에서 읽히면, 사용자는 맞는 사람에게 보내는 것으로 듣는다.
 */
export async function registerRecipient(
  input: RecipientRegisterInput,
): Promise<RegisteredRecipient> {
  if (isMockMode) {
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, MOCK_RECIPIENT_DELAY_MS);
    });
    return {
      id: `recipient-mock-${Date.now()}`,
      nickname: input.name,
      // 목 모드에도 예금주는 사용자가 적은 이름이 아니다. 서버가 확인해 채우는 값이다.
      holderName: "홍길동",
      bankCode: input.bankCode,
      maskedAccountNumber: `***-****-${input.accountNumber.slice(-4)}`,
      transferCount: 0,
    };
  }

  const response = await api.post<unknown>(RECIPIENTS_PATH, input);
  return mapRecipientResponse(
    parseApiData(response.data, isRecipientResponseDataExported),
  );
}

const MOCK_BANKS: Bank[] = [
  { code: "004", name: "국민은행" },
  { code: "011", name: "농협은행" },
  { code: "088", name: "신한은행" },
  { code: "020", name: "우리은행" },
  { code: "081", name: "하나은행" },
  { code: "090", name: "카카오뱅크" },
];

interface BankListResponseData {
  totalCount: number;
  banks: Bank[];
}

function isBankListResponseData(value: unknown): value is BankListResponseData {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const data = value as Record<string, unknown>;
  return (
    typeof data.totalCount === "number" &&
    Array.isArray(data.banks) &&
    data.banks.every(
      (bank) =>
        typeof bank === "object" &&
        bank !== null &&
        typeof (bank as Record<string, unknown>).code === "string" &&
        typeof (bank as Record<string, unknown>).name === "string",
    )
  );
}

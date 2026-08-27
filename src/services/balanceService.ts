import {
  isBalanceResponseData,
  mapBalanceResponse,
} from "@/services/balanceContract";
import { api, isMockMode } from "@/services/api";
import {
  ApiResponseContractError,
  parseApiResponse,
} from "@/services/apiResponse";
import type { Account, BalanceInquiryResult } from "@/types";

const BALANCE_PATH = "/api/accounts/balance";
const MOCK_BALANCE_DELAY_MS = 600;

export async function getAccountBalance(
  account: Account,
): Promise<BalanceInquiryResult> {
  if (isMockMode) {
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, MOCK_BALANCE_DELAY_MS);
    });

    if (typeof account.balance !== "number" || account.currency !== "KRW") {
      throw new Error("Mock account balance not found");
    }

    return {
      account: {
        ...account,
        balance: account.balance,
        availableBalance: account.balance,
        currency: "KRW",
        fetchedAt: new Date().toISOString(),
      },
      voiceMessage: `${account.accountName}에 ${account.balance.toLocaleString("ko-KR")}원 있어요.`,
    };
  }

  if (!account.isPrimary && !account.accountAlias) {
    throw new ApiResponseContractError(
      "기본 계좌가 아닌 계좌를 조회하려면 먼저 계좌 별칭을 설정해 주세요.",
    );
  }

  const response = await api.get<unknown>(BALANCE_PATH, {
    params: account.isPrimary
      ? undefined
      : { accountAlias: account.accountAlias },
  });
  const parsed = parseApiResponse(response.data, isBalanceResponseData);
  if (!parsed.voiceMessage?.trim()) {
    throw new ApiResponseContractError(
      "잔액 음성 안내가 응답에 포함되지 않았습니다.",
    );
  }

  return {
    account: mapBalanceResponse(parsed.data, account),
    voiceMessage: parsed.voiceMessage,
  };
}

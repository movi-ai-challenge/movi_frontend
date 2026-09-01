import {
  isAccountListResponseData,
  isAccountResponseData,
  mapAccountListResponse,
  mapAccountResponse,
} from "@/services/accountContract";
import { api, isMockMode } from "@/services/api";
import { parseApiData } from "@/services/apiResponse";
import { mockAccounts } from "@/services/mockData";
import type { Account } from "@/types";

const ACCOUNTS_PATH = "/api/accounts";
const MOCK_DELAY_MS = 500;

function waitForMockResponse(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, MOCK_DELAY_MS);
  });
}

export async function getConnectedAccounts(): Promise<Account[]> {
  if (isMockMode) {
    await waitForMockResponse();
    return mockAccounts;
  }

  const response = await api.get<unknown>(ACCOUNTS_PATH);
  return mapAccountListResponse(
    parseApiData(response.data, isAccountListResponseData),
  );
}

export async function updateDefaultAccount(accountId: string): Promise<string> {
  if (isMockMode) {
    await waitForMockResponse();
    return accountId;
  }

  const response = await api.patch<unknown>(
    `${ACCOUNTS_PATH}/${encodeURIComponent(accountId)}/primary`,
  );
  return mapAccountResponse(
    parseApiData(response.data, isAccountResponseData),
  ).id;
}

export async function updateAccountAlias(
  accountId: string,
  alias: string,
): Promise<Account> {
  if (isMockMode) {
    await waitForMockResponse();
    const account = mockAccounts.find((item) => item.id === accountId);
    if (!account) throw new Error("Mock account not found");
    return { ...account, accountName: alias, accountAlias: alias };
  }

  const response = await api.patch<unknown>(
    `${ACCOUNTS_PATH}/${encodeURIComponent(accountId)}/alias`,
    { alias },
  );
  return mapAccountResponse(
    parseApiData(response.data, isAccountResponseData),
  );
}

/**
 * 계좌 연결을 해제한다 (명세서 1.5).
 *
 * 서버는 계좌를 지우지 않고 비활성으로 내린 뒤 **남은 계좌 목록**을 돌려준다.
 * 목록을 다시 조회하지 않아도 되고, 기본 계좌가 바뀐 결과까지 한 번에 받는다.
 * 기본 계좌를 해제하면 서버가 남은 계좌 중 하나를 기본으로 올린다.
 *
 * 보내는 중인 이체가 걸린 계좌는 `ACCOUNT_4005`로 거절된다.
 */
export async function disconnectAccount(accountId: string): Promise<Account[]> {
  if (isMockMode) {
    await waitForMockResponse();
    return mockAccounts.filter((account) => account.id !== accountId);
  }

  const response = await api.delete<unknown>(
    `${ACCOUNTS_PATH}/${encodeURIComponent(accountId)}`,
  );
  return mapAccountListResponse(
    parseApiData(response.data, isAccountListResponseData),
  );
}

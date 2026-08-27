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

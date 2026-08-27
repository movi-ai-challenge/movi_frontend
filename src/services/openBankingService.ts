import { api } from "@/services/api";
import { ApiResponseContractError, parseApiData } from "@/services/apiResponse";
import {
  getSafeOpenBankingAuthorizationUrl,
  isConnectedAccountListSummary,
  isOpenBankingConnectStartData,
} from "@/services/openBankingContract";

const OPEN_BANKING_CONNECT_PATH = "/api/openbanking/connect";
const ACCOUNTS_PATH = "/api/accounts";

export async function startOpenBankingConnection(): Promise<string> {
  const response = await api.post<unknown>(OPEN_BANKING_CONNECT_PATH);
  const data = parseApiData(
    response.data,
    isOpenBankingConnectStartData,
  );
  const authorizationUrl = getSafeOpenBankingAuthorizationUrl(
    data.authorizationUrl,
  );

  if (!authorizationUrl) {
    throw new ApiResponseContractError(
      "오픈뱅킹 인증 주소 형식이 올바르지 않습니다.",
    );
  }
  return authorizationUrl;
}

export async function getConnectedAccountCount(): Promise<number> {
  const response = await api.get<unknown>(ACCOUNTS_PATH);
  return parseApiData(
    response.data,
    isConnectedAccountListSummary,
  ).totalCount;
}

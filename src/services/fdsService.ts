import { ApiResponseContractError } from "@/services/apiResponse";

export async function requestFdsEvaluation(): Promise<never> {
  throw new ApiResponseContractError(
    "FDS 판정은 프런트엔드에서 만들지 않습니다. 실제 음성 송금 흐름을 이용해 주세요.",
  );
}

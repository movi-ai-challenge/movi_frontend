export interface ApiResponse<T> {
  code: string;
  message: string;
  voiceMessage: string | null;
  data: T;
}

export class ApiResponseContractError extends Error {
  readonly code: string | null;
  readonly voiceMessage: string | null;

  constructor(
    message: string,
    code: string | null = null,
    voiceMessage: string | null = null,
  ) {
    super(message);
    this.name = "ApiResponseContractError";
    this.code = code;
    this.voiceMessage = voiceMessage;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseApiResponse<T>(
  value: unknown,
  isData: (data: unknown) => data is T,
): ApiResponse<T> {
  if (
    !isRecord(value) ||
    typeof value.code !== "string" ||
    typeof value.message !== "string" ||
    (value.voiceMessage !== null && typeof value.voiceMessage !== "string")
  ) {
    throw new ApiResponseContractError("API 응답 형식이 올바르지 않습니다.");
  }

  if (value.code !== "SUCCESS") {
    throw new ApiResponseContractError(
      value.message,
      value.code,
      value.voiceMessage,
    );
  }

  if (!isData(value.data)) {
    throw new ApiResponseContractError(
      "API 응답 데이터 형식이 올바르지 않습니다.",
      value.code,
      value.voiceMessage,
    );
  }

  return {
    code: value.code,
    message: value.message,
    voiceMessage: value.voiceMessage,
    data: value.data,
  };
}

export function parseApiData<T>(
  value: unknown,
  isData: (data: unknown) => data is T,
): T {
  return parseApiResponse(value, isData).data;
}
